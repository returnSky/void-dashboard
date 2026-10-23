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
import DashboardLayout from './DashboardLayout'

const mocks = vi.hoisted(() => ({
  dirty: true,
  logout: vi.fn(),
  navigate: vi.fn(),
  invalidate: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('../server/auth', () => ({ logoutFn: mocks.logout }))
vi.mock('../routes/_dashboard', () => ({
  Route: {
    useRouteContext: () => ({ user: { name: '管理员', role: 'admin' } }),
  },
}))
vi.mock('./DashboardProvider', () => ({
  useDashboard: () => ({
    settings: { workspaceName: '测试工作区' },
    hasUnsavedSettings: mocks.dirty,
  }),
}))
vi.mock('./ToastProvider', () => ({ useToast: () => ({ toast: mocks.toast }) }))
vi.mock('./ThemeToggle', () => ({ default: () => null }))
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
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    className,
    onClick,
  }: {
    to: string
    children: ReactNode
    className?: string
    onClick?: () => void
  }) => (
    <a href={to} className={className} onClick={onClick}>
      {children}
    </a>
  ),
  useNavigate: () => mocks.navigate,
  useRouter: () => ({ invalidate: mocks.invalidate }),
  useRouterState: ({
    select,
  }: {
    select: (state: {
      location: { pathname: string }
      isLoading: boolean
    }) => unknown
  }) => select({ location: { pathname: '/settings' }, isLoading: false }),
}))

beforeEach(() => {
  vi.stubEnv('VITE_APP_ENV', 'DEV')
  mocks.dirty = true
  mocks.logout.mockReset().mockResolvedValue({ success: true })
  mocks.navigate.mockReset().mockResolvedValue(undefined)
  mocks.invalidate.mockReset().mockResolvedValue(undefined)
  mocks.toast.mockReset()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

function clickLogout() {
  fireEvent.click(screen.getAllByRole('button', { name: '退出登录' })[0])
}

describe('退出前保护未保存设置', () => {
  it('取消退出不清除会话，确认后才清除并导航，跳过重复离开拦截', async () => {
    render(<DashboardLayout>设置草稿</DashboardLayout>)
    clickLogout()
    expect(
      screen.getByRole('dialog', { name: '放弃修改并退出登录？' }),
    ).toBeTruthy()
    expect(mocks.logout).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '继续编辑' }))
    expect(
      screen.queryByRole('dialog', { name: '放弃修改并退出登录？' }),
    ).toBeNull()
    expect(mocks.logout).not.toHaveBeenCalled()
    expect(mocks.navigate).not.toHaveBeenCalled()
    clickLogout()
    fireEvent.click(screen.getByRole('button', { name: '放弃修改并退出' }))
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledOnce())
    expect(mocks.logout).toHaveBeenCalledOnce()
    expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith({
      to: '/login',
      search: { redirect: '/' },
      replace: true,
      ignoreBlocker: true,
    })
    expect(mocks.logout.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.navigate.mock.invocationCallOrder[0],
    )
  })

  it('没有未保存修改时直接退出', async () => {
    mocks.dirty = false
    render(<DashboardLayout>已保存设置</DashboardLayout>)
    clickLogout()
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledOnce())
    expect(mocks.logout).toHaveBeenCalledOnce()
    expect(
      screen.queryByRole('dialog', { name: '放弃修改并退出登录？' }),
    ).toBeNull()
  })

  it('退出请求失败时保留当前页并允许重试', async () => {
    mocks.dirty = false
    mocks.logout.mockRejectedValueOnce(new Error('network unavailable'))
    render(<DashboardLayout>当前页面</DashboardLayout>)
    clickLogout()
    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith('退出失败，请重试。', 'error'),
    )
    expect(mocks.navigate).not.toHaveBeenCalled()
    clickLogout()
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledOnce())
  })
})
