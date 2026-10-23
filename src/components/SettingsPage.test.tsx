// @vitest-environment jsdom
import {
  Link,
  Outlet,
  RouterProvider,
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Route } from '../routes/_dashboard.settings'
import { DashboardProvider } from './DashboardProvider'
import { ToastProvider } from './ToastProvider'
import {
  DEMO_STORAGE_KEY,
  createDefaultSnapshot,
  parseDashboardSnapshot,
  serializeDashboardSnapshot,
} from '../data/dashboard'
import type { DashboardSnapshot, DemoRole } from '../data/dashboard'

const storageKey = `${DEMO_STORAGE_KEY}:DEV`
const histories: Array<ReturnType<typeof createBrowserHistory>> = []

async function mount(role: DemoRole = 'admin') {
  vi.spyOn(Route, 'useRouteContext').mockReturnValue({
    user: {
      id: 'test-user',
      name: '测试账号',
      email: 'admin@example.com',
      role,
    },
  })
  const root = createRootRoute({
    component: () => (
      <ToastProvider>
        <DashboardProvider role={role}>
          <Link to="/about">离开设置</Link>
          <Outlet />
        </DashboardProvider>
      </ToastProvider>
    ),
  })
  const settingsRoute = createRoute({
    getParentRoute: () => root,
    path: '/settings',
    component: Route.options.component,
  })
  const aboutRoute = createRoute({
    getParentRoute: () => root,
    path: '/about',
    component: () => <h1>其他页面</h1>,
  })
  const history = createBrowserHistory()
  histories.push(history)
  const router = createRouter({
    routeTree: root.addChildren([settingsRoute, aboutRoute]),
    history,
  })
  render(<RouterProvider router={router} />)
  const name = await screen.findByRole<HTMLInputElement>('textbox', {
    name: '工作区名称',
  })
  await waitFor(() =>
    expect(name.closest('form')?.getAttribute('aria-busy')).toBe('false'),
  )
  expect(name.closest('fieldset')?.disabled).toBe(role !== 'admin')
  return { name, router }
}

function receiveSnapshot(snapshot: DashboardSnapshot) {
  const raw = serializeDashboardSnapshot(snapshot)
  act(() => {
    window.localStorage.setItem(storageKey, raw)
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: storageKey,
        newValue: raw,
        storageArea: window.localStorage,
      }),
    )
  })
}

function wouldBlockUnload() {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event.defaultPrevented
}

function savedSnapshot() {
  return parseDashboardSnapshot(window.localStorage.getItem(storageKey) ?? '')
}

beforeEach(() => {
  vi.stubEnv('VITE_APP_ENV', 'DEV')
  vi.stubGlobal('scrollTo', vi.fn())
  window.localStorage.clear()
  window.history.replaceState(null, '', '/settings')
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = false
      },
    },
  })
})

afterEach(() => {
  cleanup()
  for (const history of histories.splice(0)) history.destroy()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  window.localStorage.clear()
})

describe('设置草稿保护', () => {
  it('恢复已保存设置，干净草稿继续同步其他标签页的更新', async () => {
    const snapshot = createDefaultSnapshot()
    snapshot.settings.workspaceName = '已保存工作区'
    window.localStorage.setItem(
      storageKey,
      serializeDashboardSnapshot(snapshot),
    )
    const { name } = await mount()
    await waitFor(() => expect(name.value).toBe('已保存工作区'))

    snapshot.settings.workspaceName = '其他标签页的工作区'
    receiveSnapshot(snapshot)
    expect(name.value).toBe('其他标签页的工作区')
    expect(screen.queryByText('其他标签页已更新工作区设置')).toBeNull()
    expect(wouldBlockUnload()).toBe(false)
  })

  it('跨标签更新保留脏草稿，普通提交不能覆盖，加载最新设置解除冲突', async () => {
    const { name } = await mount()
    fireEvent.change(name, { target: { value: '本页草稿' } })
    expect(wouldBlockUnload()).toBe(true)
    const remote = createDefaultSnapshot()
    remote.settings.workspaceName = '最新工作区'
    remote.settings.contactEmail = 'remote@example.com'
    receiveSnapshot(remote)

    expect(name.value).toBe('本页草稿')
    expect(screen.getByText('其他标签页已更新工作区设置')).toBeTruthy()
    const save = screen.getByRole<HTMLButtonElement>('button', {
      name: '保存设置',
    })
    expect(save.disabled).toBe(true)
    fireEvent.submit(save.closest('form')!)
    expect(savedSnapshot()?.settings).toEqual(remote.settings)
    expect(
      screen.getByText(
        '设置已在其他标签页更新，请先加载最新设置或明确选择覆盖。',
      ),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '加载最新设置' }))
    expect(name.value).toBe('最新工作区')
    expect(
      screen.getByRole<HTMLInputElement>('textbox', { name: '联系邮箱' }).value,
    ).toBe('remote@example.com')
    expect(screen.queryByText('其他标签页已更新工作区设置')).toBeNull()
    expect(wouldBlockUnload()).toBe(false)
  })

  it('明确选择覆盖后保存本页全部设置，并清除脏状态和冲突', async () => {
    const { name } = await mount()
    const defaults = createDefaultSnapshot()
    fireEvent.change(name, { target: { value: '明确覆盖后的名称' } })
    const remote = createDefaultSnapshot()
    remote.settings.workspaceName = '其他标签页'
    remote.settings.contactEmail = 'remote@example.com'
    receiveSnapshot(remote)

    fireEvent.click(
      screen.getByRole('button', { name: '以我的修改覆盖最新设置' }),
    )
    expect(savedSnapshot()?.settings).toEqual({
      ...defaults.settings,
      workspaceName: '明确覆盖后的名称',
    })
    expect(screen.queryByText('其他标签页已更新工作区设置')).toBeNull()
    expect(wouldBlockUnload()).toBe(false)
  })

  it('手动撤回本页修改后同步最新设置，修改为远端内容也解除冲突', async () => {
    const { name } = await mount()
    const baseline = name.value
    fireEvent.change(name, { target: { value: '本页草稿' } })
    const remote = createDefaultSnapshot()
    remote.settings.workspaceName = '最新设置'
    receiveSnapshot(remote)

    fireEvent.change(name, { target: { value: baseline } })
    expect(name.value).toBe('最新设置')
    expect(screen.queryByText('其他标签页已更新工作区设置')).toBeNull()
    expect(wouldBlockUnload()).toBe(false)

    fireEvent.change(name, { target: { value: '另一次草稿' } })
    remote.settings.workspaceName = '再次更新'
    receiveSnapshot(remote)
    fireEvent.change(name, { target: { value: '再次更新' } })
    expect(screen.queryByText('其他标签页已更新工作区设置')).toBeNull()
    expect(wouldBlockUnload()).toBe(false)
  })

  it('脏草稿阻止 SPA 离开，继续编辑保留内容，明确放弃后允许导航', async () => {
    const { name, router } = await mount()
    fireEvent.change(name, { target: { value: '不要丢失的草稿' } })
    fireEvent.click(screen.getByRole('link', { name: '离开设置' }))
    await screen.findByRole('dialog', { name: '离开前放弃修改？' })
    expect(router.state.location.pathname).toBe('/settings')

    fireEvent.click(screen.getByRole('button', { name: '继续编辑' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(name.value).toBe('不要丢失的草稿')
    expect(wouldBlockUnload()).toBe(true)

    fireEvent.click(screen.getByRole('link', { name: '离开设置' }))
    await screen.findByRole('dialog', { name: '离开前放弃修改？' })
    fireEvent.click(screen.getByRole('button', { name: '放弃修改并离开' }))
    await screen.findByRole('heading', { name: '其他页面' })
    expect(router.state.location.pathname).toBe('/about')
    expect(wouldBlockUnload()).toBe(false)
  })

  it('成功保存和取消修改均解除离开保护，失败保存保留草稿', async () => {
    const { name } = await mount()
    fireEvent.change(name, { target: { value: '   ' } })
    fireEvent.submit(
      screen.getByRole('button', { name: '保存设置' }).closest('form')!,
    )
    expect(name.value).toBe('   ')
    expect(wouldBlockUnload()).toBe(true)

    fireEvent.change(name, { target: { value: '  已保存的新名称  ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存设置' }))
    expect(name.value).toBe('已保存的新名称')
    expect(wouldBlockUnload()).toBe(false)

    fireEvent.change(name, { target: { value: '随后取消的修改' } })
    fireEvent.click(screen.getByRole('button', { name: '取消修改' }))
    expect(name.value).toBe('已保存的新名称')
    expect(wouldBlockUnload()).toBe(false)
  })

  it('只读成员自动同步设置且可直接离开，不启用草稿保护', async () => {
    const { name } = await mount('viewer')
    const remote = createDefaultSnapshot()
    remote.settings.workspaceName = '新的只读内容'
    receiveSnapshot(remote)
    expect(name.value).toBe('新的只读内容')
    expect(wouldBlockUnload()).toBe(false)
    fireEvent.click(screen.getByRole('link', { name: '离开设置' }))
    await screen.findByRole('heading', { name: '其他页面' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
