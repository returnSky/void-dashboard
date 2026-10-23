import { useEffect, useRef, useState } from 'react'
import {
  Link,
  useNavigate,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Route as dashboardRoute } from '../routes/_dashboard'
import { logoutFn } from '../server/auth'
import { useDashboard } from './DashboardProvider'
import { useToast } from './ToastProvider'
import ThemeToggle from './ThemeToggle'
import BrandMark from './BrandMark'
import Dialog from './Dialog'
import { getAppConfig } from '../config/env'

const navigation = [
  { to: '/', label: '工作台概览', icon: LayoutDashboard, section: '工作空间' },
  { to: '/users', label: '用户管理', icon: Users, section: '工作空间' },
  { to: '/settings', label: '工作区设置', icon: Settings2, section: '管理' },
  { to: '/about', label: '模板指南', icon: BookOpen, section: '管理' },
] as const

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = dashboardRoute.useRouteContext()
  const appConfig = getAppConfig()
  const { settings, hasUnsavedSettings } = useDashboard()
  const { toast } = useToast()
  const router = useRouter()
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const loading = useRouterState({ select: (state) => state.isLoading })
  const [compact, setCompact] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [unread, setUnread] = useState(true)
  const mobileDialog = useRef<HTMLDialogElement>(null)
  const page = navigation.find((item) => item.to === pathname) ?? navigation[0]

  useEffect(() => {
    const dialog = mobileDialog.current
    if (mobileOpen && dialog && !dialog.open) dialog.showModal()
    if (!mobileOpen && dialog?.open) dialog.close()
  }, [mobileOpen])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  async function signOut() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logoutFn()
      await navigate({
        to: '/login',
        search: { redirect: '/' },
        replace: true,
        ignoreBlocker: true,
      })
      await router.invalidate()
    } catch {
      toast('退出失败，请重试。', 'error')
    } finally {
      setLoggingOut(false)
    }
  }

  function requestSignOut() {
    if (loggingOut) return
    if (hasUnsavedSettings) setConfirmLogout(true)
    else void signOut()
  }

  function Sidebar({ collapsed = false }: { collapsed?: boolean }) {
    return (
      <div className="flex h-full flex-col">
        <Link
          to="/"
          className="brand"
          title={collapsed ? `${appConfig.name} 工作台` : undefined}
          onClick={() => setMobileOpen(false)}
        >
          <span className="brand-mark">
            <BrandMark />
          </span>
          <span className={collapsed ? 'sr-only' : ''}>
            {appConfig.name}
            <span className="brand-caption">ADMIN WORKSPACE</span>
          </span>
        </Link>
        {!collapsed && (
          <div className="workspace-chip">
            <span className="workspace-dot" />
            <span className="truncate">{settings.workspaceName}</span>
            <span className="ml-auto text-[10px] tracking-wider muted">
              DEMO
            </span>
          </div>
        )}
        <nav aria-label="后台导航" className="flex-1 px-3 py-5">
          {navigation.map(({ to, label, icon: Icon, section }, index) => (
            <div key={to}>
              {(index === 0 || section !== navigation[index - 1].section) && (
                <p className={collapsed ? 'sr-only' : 'nav-section'}>
                  {section}
                </p>
              )}
              <Link
                to={to}
                activeOptions={{ exact: true, includeSearch: false }}
                className="sidebar-link"
                activeProps={{ className: 'sidebar-link active' }}
                title={collapsed ? label : undefined}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={19} aria-hidden="true" />
                <span className={collapsed ? 'sr-only' : 'flex-1'}>
                  {label}
                </span>
                {!collapsed && to === '/' && (
                  <span className="nav-active-dot" />
                )}
              </Link>
            </div>
          ))}
        </nav>
        {!collapsed && (
          <div className="sidebar-note">
            <ShieldCheck size={20} aria-hidden="true" />
            <p className="font-semibold">从模板开始，专注业务</p>
            <p className="text-xs leading-5 muted">
              演示数据仅保存在此浏览器中，刷新后仍可继续体验。
            </p>
            <Link
              to="/about"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold"
            >
              查看接入指南 <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        )}
        <div className="sidebar-account">
          <span className="avatar">{user.name.slice(0, 1)}</span>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm">{user.name}</strong>
              <span className="block text-xs muted">
                {user.role === 'admin' ? '管理员' : '只读成员'}
              </span>
            </span>
          )}
          {!collapsed && (
            <button
              type="button"
              className="icon-button"
              title="退出登录"
              aria-label="退出登录"
              disabled={loggingOut}
              onClick={requestSignOut}
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`dashboard-shell${compact ? ' is-compact' : ''}`}>
      <a href="#main-content" className="skip-link">
        跳到主要内容
      </a>
      <aside className="desktop-sidebar">
        <Sidebar collapsed={compact} />
      </aside>
      <dialog
        ref={mobileDialog}
        className="mobile-navigation"
        aria-label="后台导航"
        onCancel={() => setMobileOpen(false)}
        onClose={() => setMobileOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMobileOpen(false)
        }}
      >
        <button
          type="button"
          className="icon-button absolute right-3 top-5 z-10"
          aria-label="关闭导航"
          onClick={() => setMobileOpen(false)}
        >
          <X size={20} aria-hidden="true" />
        </button>
        <Sidebar />
      </dialog>
      <div className="dashboard-content">
        <header className="dashboard-header">
          <button
            type="button"
            className="icon-button hidden lg:inline-flex"
            aria-label={compact ? '展开侧栏' : '收起侧栏'}
            aria-expanded={!compact}
            onClick={() => setCompact((value) => !value)}
          >
            {compact ? <ChevronRight size={19} /> : <ChevronLeft size={19} />}
          </button>
          <button
            type="button"
            className="icon-button lg:hidden"
            aria-label="打开导航"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={21} aria-hidden="true" />
          </button>
          <nav
            aria-label="面包屑"
            className="hidden items-center gap-2 text-sm sm:flex"
          >
            <span className="muted">工作空间</span>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="font-medium">{page.label}</span>
          </nav>
          <span
            className={`environment-badge env-${appConfig.environment.toLowerCase()}`}
            title={`当前构建环境：${appConfig.environment}`}
          >
            {appConfig.environment}
          </span>
          <form
            className="header-search ml-auto"
            onSubmit={(event) => {
              event.preventDefault()
              void navigate({
                to: '/users',
                search: {
                  q: search.trim(),
                  status: 'all',
                  role: 'all',
                  sort: 'joined-desc',
                  page: 1,
                },
              })
            }}
            role="search"
          >
            <Search size={16} aria-hidden="true" className="muted" />
            <input
              aria-label="搜索用户"
              placeholder="搜索用户…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <kbd className="hidden sm:inline">↵</kbd>
          </form>
          <ThemeToggle />
          <details className="notification-menu">
            <summary
              className="icon-button relative"
              aria-label={unread ? '通知：有未读消息' : '通知'}
            >
              <Bell size={19} aria-hidden="true" />
              {unread && <span className="notification-dot" />}
            </summary>
            <div className="notification-panel panel">
              <div className="flex items-center justify-between gap-3">
                <strong className="text-sm">工作区通知</strong>
                <button
                  type="button"
                  className="text-xs font-semibold text-[var(--lagoon-deep)]"
                  onClick={() => setUnread(false)}
                  disabled={!unread}
                >
                  {unread ? '全部标为已读' : '已全部阅读'}
                </button>
              </div>
              <p className="mt-4 text-sm">欢迎使用 {appConfig.name} 工作台</p>
              <p className="mt-1 text-xs leading-5 muted">
                这是模板演示通知。真实通知可在此接入消息服务。
              </p>
              <Link
                to="/users"
                className="mt-4 block border-t border-[var(--line)] pt-3 text-xs font-semibold"
              >
                查看待邀请的用户 →
              </Link>
            </div>
          </details>
          <span
            className="avatar hidden sm:inline-flex"
            title={`${user.name} · ${user.role === 'admin' ? '管理员' : '只读成员'}`}
          >
            {user.name.slice(0, 1)}
          </span>
          {compact && (
            <button
              type="button"
              className="icon-button"
              aria-label="退出登录"
              disabled={loggingOut}
              onClick={requestSignOut}
            >
              <LogOut size={17} aria-hidden="true" />
            </button>
          )}
        </header>
        {loading && (
          <div
            className="route-progress"
            role="status"
            aria-label="页面加载中"
          />
        )}
        <main id="main-content" className="dashboard-main" tabIndex={-1}>
          {children}
        </main>
        <footer className="dashboard-footer">
          <span>
            {appConfig.name} Dashboard{' '}
            <span className="mx-2 opacity-40">/</span> 让管理更有条理
          </span>
          <Link to="/about">
            模板 v0.1 <ArrowUpRight size={12} aria-hidden="true" />
          </Link>
        </footer>
      </div>
      <Dialog
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="放弃修改并退出登录？"
        description="工作区设置还有未保存的修改。退出将放弃本页草稿，已保存的数据不受影响。"
      >
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            className="button button-secondary"
            data-dialog-autofocus
            onClick={() => setConfirmLogout(false)}
          >
            继续编辑
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={loggingOut}
            onClick={() => {
              setConfirmLogout(false)
              void signOut()
            }}
          >
            放弃修改并退出
          </button>
        </div>
      </Dialog>
    </div>
  )
}
