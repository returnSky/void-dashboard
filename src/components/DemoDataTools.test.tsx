// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import DemoDataTools from './DemoDataTools'
import {
  createDefaultSnapshot,
  serializeDashboardSnapshot,
} from '../data/dashboard'
import { MAX_BACKUP_BYTES } from '../data/dashboard-backup'

const mocks = vi.hoisted(() => ({ useDashboard: vi.fn(), toast: vi.fn() }))
vi.mock('./DashboardProvider', () => ({ useDashboard: mocks.useDashboard }))
vi.mock('./ToastProvider', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('./Dialog', () => ({
  default: ({
    open,
    title,
    children,
  }: {
    open: boolean
    title: string
    children: ReactNode
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null,
}))

const restoreDemo = vi.fn()
const resetDemo = vi.fn()

function chooseFile(raw: string, name = 'workspace.json') {
  const file = new File([raw], name, { type: 'application/json' })
  Object.defineProperty(file, 'text', { value: () => Promise.resolve(raw) })
  fireEvent.change(screen.getByLabelText('选择 JSON 备份文件'), {
    target: { files: [file] },
  })
}

beforeEach(() => {
  vi.stubEnv('VITE_APP_ENV', 'DEV')
  restoreDemo.mockReset().mockReturnValue({ success: true, persisted: true })
  resetDemo.mockReset().mockReturnValue({ success: true, persisted: true })
  mocks.toast.mockReset()
  mocks.useDashboard.mockReturnValue({
    ...createDefaultSnapshot(),
    hydrated: true,
    restoreDemo,
    resetDemo,
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('数据备份与恢复交互', () => {
  it('校验并预览备份，取消不写入，明确确认后才恢复', async () => {
    render(<DemoDataTools canEdit />)
    const snapshot = createDefaultSnapshot()
    snapshot.settings.workspaceName = '备份工作区'
    snapshot.users = snapshot.users.slice(0, 2)
    const raw = serializeDashboardSnapshot(snapshot)
    chooseFile(raw)
    await screen.findByRole('dialog', { name: '确认从备份恢复' })
    expect(screen.getByText('备份工作区')).toBeTruthy()
    expect(screen.getByText('16 → 2')).toBeTruthy()
    expect(restoreDemo).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(restoreDemo).not.toHaveBeenCalled()
    chooseFile(raw)
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: '确认恢复' }))
    expect(restoreDemo).toHaveBeenCalledExactlyOnceWith(raw)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('无效和过大的备份显示错误且不触发恢复', async () => {
    render(<DemoDataTools canEdit />)
    chooseFile('{broken')
    expect((await screen.findByRole('alert')).textContent).toContain(
      '备份格式或版本无效',
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    const file = new File([new Uint8Array(MAX_BACKUP_BYTES + 1)], 'large.json')
    fireEvent.change(screen.getByLabelText('选择 JSON 备份文件'), {
      target: { files: [file] },
    })
    expect(screen.getByRole('alert').textContent).toBe(
      '备份文件不能超过 1 MB。',
    )
    expect(restoreDemo).not.toHaveBeenCalled()
  })

  it('文件读取失败后可重新选择文件', async () => {
    render(<DemoDataTools canEdit />)
    const file = new File(['{}'], 'unreadable.json')
    Object.defineProperty(file, 'text', {
      value: () => Promise.reject(new Error('read failed')),
    })
    fireEvent.change(screen.getByLabelText('选择 JSON 备份文件'), {
      target: { files: [file] },
    })
    expect((await screen.findByRole('alert')).textContent).toBe(
      '无法读取备份文件，请重新选择。',
    )
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: '从备份恢复' })
          .hasAttribute('disabled'),
      ).toBe(false),
    )
    chooseFile(serializeDashboardSnapshot(createDefaultSnapshot()))
    await screen.findByRole('dialog')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('恢复失败保持预览和错误提示，允许重试', async () => {
    restoreDemo.mockReturnValueOnce({ success: false, error: '当前不可恢复' })
    render(<DemoDataTools canEdit />)
    chooseFile(serializeDashboardSnapshot(createDefaultSnapshot()))
    await screen.findByRole('dialog')
    fireEvent.click(screen.getByRole('button', { name: '确认恢复' }))
    expect(screen.getByRole('alert').textContent).toBe('当前不可恢复')
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '确认恢复' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('重置必须经过确认，取消保持数据', () => {
    render(<DemoDataTools canEdit />)
    fireEvent.click(screen.getByRole('button', { name: '恢复默认演示数据' }))
    expect(resetDemo).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '取消' }))
    expect(resetDemo).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '恢复默认演示数据' }))
    fireEvent.click(screen.getByRole('button', { name: '确认重置' }))
    expect(resetDemo).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('有未保存设置时禁止恢复和重置，仍可导出已保存数据', () => {
    render(<DemoDataTools canEdit hasUnsavedChanges />)
    expect(
      screen
        .getByRole('button', { name: '从备份恢复' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: '恢复默认演示数据' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: '导出 JSON 备份' })
        .hasAttribute('disabled'),
    ).toBe(false)
  })

  it('只读账号只有备份导出入口', () => {
    render(<DemoDataTools canEdit={false} />)
    expect(screen.getByRole('button', { name: '导出 JSON 备份' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '从备份恢复' })).toBeNull()
    expect(
      screen.queryByRole('button', { name: '恢复默认演示数据' }),
    ).toBeNull()
  })

  it('导出完整 JSON 快照且文件名包含环境', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:backup')
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL: vi.fn() })
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    render(<DemoDataTools canEdit />)
    fireEvent.click(screen.getByRole('button', { name: '导出 JSON 备份' }))
    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob = createObjectURL.mock.calls[0][0] as Blob
    expect(blob.type).toBe('application/json;charset=utf-8')
    const anchor = anchorClick.mock.instances[0] as HTMLAnchorElement
    expect(anchor.download).toMatch(/^void-backup-dev-\d{4}-\d{2}-\d{2}\.json$/)
    expect(mocks.toast).toHaveBeenCalledWith(
      '已导出当前保存的成员和工作区设置。',
      'success',
    )
  })
})
