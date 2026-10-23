// @vitest-environment jsdom
import { useState } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardProvider, useDashboard } from './DashboardProvider'
import type { MutationResult } from './DashboardProvider'
import { ToastProvider } from './ToastProvider'
import {
  DEMO_STORAGE_KEY,
  createDefaultSnapshot,
  parseDashboardSnapshot,
  serializeDashboardSnapshot,
} from '../data/dashboard'
import type { DemoRole, DemoUser } from '../data/dashboard'

const testStorageKey = `${DEMO_STORAGE_KEY}:DEV`

function Probe() {
  const {
    users,
    settings,
    hydrated,
    addUser,
    updateUser,
    updateUserStatus,
    updateSettings,
    restoreDemo,
    resetDemo,
  } = useDashboard()
  const [result, setResult] = useState<MutationResult | null>(null)
  const [backup, setBackup] = useState('')
  const [pendingUser, setPendingUser] = useState<DemoUser | null>(null)
  return (
    <div>
      <output aria-label="数据恢复状态">
        {hydrated ? '已恢复' : '恢复中'}
      </output>
      <output aria-label="成员数量">{users.length}</output>
      <output aria-label="成员姓名">
        {users.map((user) => user.name).join(',')}
      </output>
      <output aria-label="工作空间名称">{settings.workspaceName}</output>
      <output aria-label="操作结果">
        {result ? JSON.stringify(result) : ''}
      </output>
      <output aria-label="成员详情">{JSON.stringify(users)}</output>
      <textarea
        aria-label="备份内容"
        value={backup}
        onChange={(event) => setBackup(event.currentTarget.value)}
      />
      <button type="button" onClick={() => setResult(restoreDemo(backup))}>
        恢复备份
      </button>
      <button type="button" onClick={() => setPendingUser(users[0])}>
        准备停用成员
      </button>
      <button
        type="button"
        onClick={() =>
          setResult(
            updateUserStatus(pendingUser?.id ?? users[0].id, 'disabled'),
          )
        }
      >
        停用成员
      </button>
      <button
        type="button"
        onClick={() =>
          setResult(
            addUser({
              name: '新增成员',
              email: 'new.member@example.com',
              role: 'viewer',
              status: 'active',
            }),
          )
        }
      >
        新增成员
      </button>
      <button
        type="button"
        onClick={() =>
          setResult(
            updateUser(users[0].id, { ...users[0], name: '已编辑成员' }),
          )
        }
      >
        编辑成员
      </button>
      <button
        type="button"
        onClick={() =>
          setResult(updateSettings({ workspaceName: '更新后的工作空间' }))
        }
      >
        修改设置
      </button>
      <button type="button" onClick={() => setResult(resetDemo())}>
        恢复默认
      </button>
    </div>
  )
}

function mount(role: DemoRole) {
  return render(
    <ToastProvider>
      <DashboardProvider role={role}>
        <Probe />
      </DashboardProvider>
    </ToastProvider>,
  )
}

async function waitForHydration() {
  await waitFor(() =>
    expect(screen.getByLabelText('数据恢复状态').textContent).toBe('已恢复'),
  )
}

function savedSnapshot() {
  const snapshot = createDefaultSnapshot()
  snapshot.users = [{ ...snapshot.users[0], name: '已保存成员' }]
  snapshot.settings.workspaceName = '已保存工作空间'
  return snapshot
}

beforeEach(() => {
  vi.stubEnv('VITE_APP_ENV', 'DEV')
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  window.localStorage.clear()
})

describe('DashboardProvider 的权限与存储边界', () => {
  it('查看者无法通过 Provider 新增、编辑、保存设置或恢复默认', async () => {
    const raw = serializeDashboardSnapshot(savedSnapshot())
    window.localStorage.setItem(testStorageKey, raw)
    mount('viewer')
    await waitForHydration()
    fireEvent.change(screen.getByLabelText('备份内容'), {
      target: { value: serializeDashboardSnapshot(createDefaultSnapshot()) },
    })

    for (const label of [
      '新增成员',
      '编辑成员',
      '停用成员',
      '修改设置',
      '恢复备份',
    ]) {
      fireEvent.click(screen.getByRole('button', { name: label }))
      const result = JSON.parse(
        screen.getByLabelText('操作结果').textContent,
      ) as MutationResult
      expect(result.success).toBe(false)
      expect(result.error).toContain('管理员权限')
    }
    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }))
    expect(screen.getByLabelText('成员数量').textContent).toBe('1')
    expect(screen.getByLabelText('成员姓名').textContent).toBe('已保存成员')
    expect(screen.getByLabelText('工作空间名称').textContent).toBe(
      '已保存工作空间',
    )
    expect(window.localStorage.getItem(testStorageKey)).toBe(raw)
    expect(
      screen.getAllByText(
        '当前账户只有查看权限，成员和设置修改需要管理员权限。',
      ).length,
    ).toBeGreaterThan(0)
  })

  it('停用确认使用最新成员记录，保留其他标签页修改后的资料', async () => {
    const initial = savedSnapshot()
    window.localStorage.setItem(
      testStorageKey,
      serializeDashboardSnapshot(initial),
    )
    mount('admin')
    await waitForHydration()
    fireEvent.click(screen.getByRole('button', { name: '准备停用成员' }))

    const latest = savedSnapshot()
    latest.users[0] = {
      ...latest.users[0],
      name: '其他标签页的新姓名',
      email: 'changed@example.com',
      role: 'viewer',
    }
    const remoteRaw = serializeDashboardSnapshot(latest)
    window.localStorage.setItem(testStorageKey, remoteRaw)
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: testStorageKey,
          newValue: remoteRaw,
          storageArea: window.localStorage,
        }),
      )
    })

    fireEvent.click(screen.getByRole('button', { name: '停用成员' }))
    const expected = { ...latest.users[0], status: 'disabled' }
    expect(JSON.parse(screen.getByLabelText('成员详情').textContent)).toEqual([
      expected,
    ])
    expect(
      parseDashboardSnapshot(window.localStorage.getItem(testStorageKey) ?? '')
        ?.users,
    ).toEqual([expected])
  })

  it('确认停用前成员已被其他标签页移除时，不重新创建旧成员', async () => {
    window.localStorage.setItem(
      testStorageKey,
      serializeDashboardSnapshot(savedSnapshot()),
    )
    mount('admin')
    await waitForHydration()
    fireEvent.click(screen.getByRole('button', { name: '准备停用成员' }))
    const latest = savedSnapshot()
    latest.users = []
    const remoteRaw = serializeDashboardSnapshot(latest)
    window.localStorage.setItem(testStorageKey, remoteRaw)
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: testStorageKey,
          newValue: remoteRaw,
          storageArea: window.localStorage,
        }),
      )
    })
    fireEvent.click(screen.getByRole('button', { name: '停用成员' }))
    expect(JSON.parse(screen.getByLabelText('操作结果').textContent)).toEqual({
      success: false,
      error: '成员不存在，请刷新列表后重试。',
    })
    expect(screen.getByLabelText('成员数量').textContent).toBe('0')
    expect(window.localStorage.getItem(testStorageKey)).toBe(remoteRaw)
  })

  it('管理员恢复有效备份后更新成员、设置和本地快照', async () => {
    mount('admin')
    await waitForHydration()
    const restored = savedSnapshot()
    fireEvent.change(screen.getByLabelText('备份内容'), {
      target: { value: `\uFEFF${serializeDashboardSnapshot(restored)}` },
    })
    fireEvent.click(screen.getByRole('button', { name: '恢复备份' }))
    expect(JSON.parse(screen.getByLabelText('成员详情').textContent)).toEqual(
      restored.users,
    )
    expect(screen.getByLabelText('工作空间名称').textContent).toBe(
      restored.settings.workspaceName,
    )
    expect(
      parseDashboardSnapshot(window.localStorage.getItem(testStorageKey) ?? ''),
    ).toEqual(restored)
    expect(JSON.parse(screen.getByLabelText('操作结果').textContent)).toEqual({
      success: true,
      persisted: true,
    })
  })

  it('无效备份不会改变已有成员、设置或本地快照', async () => {
    const snapshot = savedSnapshot()
    const raw = serializeDashboardSnapshot(snapshot)
    window.localStorage.setItem(testStorageKey, raw)
    mount('admin')
    await waitForHydration()
    for (const invalid of [
      '{broken',
      raw.replace('"version":1', '"version":999'),
    ]) {
      fireEvent.change(screen.getByLabelText('备份内容'), {
        target: { value: invalid },
      })
      fireEvent.click(screen.getByRole('button', { name: '恢复备份' }))
      expect(
        JSON.parse(screen.getByLabelText('操作结果').textContent).success,
      ).toBe(false)
      expect(JSON.parse(screen.getByLabelText('成员详情').textContent)).toEqual(
        snapshot.users,
      )
      expect(screen.getByLabelText('工作空间名称').textContent).toBe(
        snapshot.settings.workspaceName,
      )
      expect(window.localStorage.getItem(testStorageKey)).toBe(raw)
    }
  })

  it('恢复有效快照后，管理员的修改同时作用于页面和本地快照', async () => {
    window.localStorage.setItem(
      testStorageKey,
      serializeDashboardSnapshot(savedSnapshot()),
    )
    mount('admin')
    await waitForHydration()
    expect(screen.getByLabelText('成员姓名').textContent).toBe('已保存成员')
    expect(screen.getByLabelText('工作空间名称').textContent).toBe(
      '已保存工作空间',
    )

    fireEvent.click(screen.getByRole('button', { name: '编辑成员' }))
    fireEvent.click(screen.getByRole('button', { name: '修改设置' }))
    expect(screen.getByLabelText('成员姓名').textContent).toBe('已编辑成员')
    expect(screen.getByLabelText('工作空间名称').textContent).toBe(
      '更新后的工作空间',
    )
    const restored = parseDashboardSnapshot(
      window.localStorage.getItem(testStorageKey) ?? '',
    )
    expect(restored?.users[0].name).toBe('已编辑成员')
    expect(restored?.settings.workspaceName).toBe('更新后的工作空间')
    expect(JSON.parse(screen.getByLabelText('操作结果').textContent)).toEqual({
      success: true,
      persisted: true,
    })
  })

  it('浏览器拒绝写入时，修改仍在当前页面生效并明确反馈无法持久化', async () => {
    mount('admin')
    await waitForHydration()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })

    fireEvent.click(screen.getByRole('button', { name: '修改设置' }))
    expect(screen.getByLabelText('工作空间名称').textContent).toBe(
      '更新后的工作空间',
    )
    expect(JSON.parse(screen.getByLabelText('操作结果').textContent)).toEqual({
      success: true,
      persisted: false,
    })
    expect(window.localStorage.getItem(testStorageKey)).toBeNull()
    expect(
      screen.getByText(
        '更改已在当前页面生效，但浏览器存储不可用，刷新后可能丢失。',
      ),
    ).toBeTruthy()
  })

  it('损坏的本地数据恢复为默认种子并给出可见反馈', async () => {
    window.localStorage.setItem(testStorageKey, '{broken')
    mount('admin')
    await waitForHydration()
    const defaults = createDefaultSnapshot()
    expect(screen.getByLabelText('成员数量').textContent).toBe(
      String(defaults.users.length),
    )
    expect(screen.getByLabelText('工作空间名称').textContent).toBe(
      defaults.settings.workspaceName,
    )
    expect(
      screen.getByText('本地演示数据格式或版本无效，已加载默认数据。'),
    ).toBeTruthy()
  })

  it('同步其他标签页的合法数据，忽略损坏数据并在存储清除后恢复默认', async () => {
    mount('admin')
    await waitForHydration()
    const snapshot = savedSnapshot()
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: `${DEMO_STORAGE_KEY}:UAT`,
          newValue: serializeDashboardSnapshot(snapshot),
          storageArea: window.localStorage,
        }),
      )
    })
    expect(screen.getByLabelText('成员数量').textContent).toBe(
      String(createDefaultSnapshot().users.length),
    )
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: testStorageKey,
          newValue: serializeDashboardSnapshot(snapshot),
          storageArea: window.localStorage,
        }),
      )
    })
    expect(screen.getByLabelText('成员姓名').textContent).toBe('已保存成员')
    expect(screen.getByLabelText('工作空间名称').textContent).toBe(
      '已保存工作空间',
    )

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: testStorageKey,
          newValue: '{broken',
          storageArea: window.localStorage,
        }),
      )
    })
    expect(screen.getByLabelText('成员姓名').textContent).toBe('已保存成员')

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: testStorageKey,
          newValue: null,
          storageArea: window.localStorage,
        }),
      )
    })
    expect(screen.getByLabelText('成员数量').textContent).toBe(
      String(createDefaultSnapshot().users.length),
    )
  })
})
