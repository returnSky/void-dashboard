import { useState } from 'react'
import type { FormEvent } from 'react'
import {
  createFileRoute,
  redirect,
  useHydrated,
  useRouter,
} from '@tanstack/react-router'
import type { SearchSchemaInput } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
import BrandMark from '../components/BrandMark'
import { getAppConfig } from '../config/env'
import { getDemoAuthStatusFn, getSafeRedirect, loginFn } from '../server/auth'

export const Route = createFileRoute('/login')({
  validateSearch: (search: { redirect?: unknown } & SearchSchemaInput) => ({
    redirect: getSafeRedirect(search.redirect),
  }),
  beforeLoad: ({ context, search }) => {
    if (context.user) {
      throw redirect({ to: search.redirect, replace: true })
    }
  },
  loader: () => getDemoAuthStatusFn(),
  head: () => ({ meta: [{ title: `登录 · ${getAppConfig().name}` }] }),
  component: LoginPage,
})

const demoAccounts = [
  { name: '管理员', email: 'admin@example.com', password: 'Admin123!' },
  { name: '只读访客', email: 'viewer@example.com', password: 'Viewer123!' },
]

function LoginPage() {
  const router = useRouter()
  const appConfig = getAppConfig()
  const login = useServerFn(loginFn)
  const hydrated = useHydrated()
  const { redirect: destination } = Route.useSearch()
  const { enabled: demoEnabled } = Route.useLoaderData()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hydrated || pending || !demoEnabled) return
    setError('')
    setPending(true)
    try {
      const result = await login({ data: { email, password } })
      if (result.error) {
        setError(result.error)
        return
      }
      await router.invalidate()
      await router.navigate({ to: destination, replace: true })
    } catch {
      setError('登录服务暂时无法连接，请稍后重试。')
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col p-5 sm:p-8">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
        <span className="flex items-center gap-3 text-lg font-bold tracking-tight">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--on-primary)]">
            <BrandMark size={32} />
          </span>
          {appConfig.name}
        </span>
        <div className="flex items-center gap-3">
          <span
            className={`environment-badge env-${appConfig.environment.toLowerCase()}`}
            title={`当前构建环境：${appConfig.environment}`}
          >
            {appConfig.environment}
          </span>
          <ThemeToggle />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
        <section className="max-w-xl">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--lagoon-deep)]">
            <ShieldCheck size={14} aria-hidden="true" />
            通用管理后台 · 演示模板
          </span>
          <h1 className="m-0 text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            从清晰的工作台，
            <br />
            开始构建你的业务。
          </h1>
          <p className="muted mt-5 text-base leading-8">
            指标概览、用户管理、角色权限与工作区设置，已整合进一个轻量、可扩展的管理后台。
          </p>
          <ul className="mt-8 list-none space-y-4 p-0 text-sm">
            {[
              '响应式导航与明暗主题，适配不同屏幕',
              '可搜索、筛选与编辑的用户管理示例',
              '管理员与只读访客，两种角色体验',
            ].map((item) => (
              <li className="flex items-center gap-3" key={item}>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--chip-bg)] text-[var(--lagoon-deep)]">
                  <Check size={14} aria-hidden="true" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="muted mt-10 text-xs leading-6">
            所有业务数据均为演示数据。请勿在演示表单中输入真实客户信息。
          </p>
        </section>

        <section className="panel p-6 sm:p-8" aria-labelledby="login-title">
          <div className="mb-7">
            <p className="mb-2 text-xs font-semibold tracking-widest text-[var(--lagoon-deep)]">
              WELCOME BACK
            </p>
            <h2
              className="m-0 text-2xl font-bold tracking-tight"
              id="login-title"
            >
              {demoEnabled ? '登录演示工作区' : '登录工作区'}
            </h2>
            <p className="muted mt-2 text-sm leading-6">
              选择一个演示角色，体验完整的后台操作流程。
            </p>
          </div>

          <form method="post" onSubmit={handleSubmit}>
            {!demoEnabled && (
              <p
                className="mb-5 rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-3 text-sm leading-6"
                role="status"
              >
                演示登录未启用。服务器需显式设置
                DEMO_AUTH_ENABLED=true；正式项目请接入实际身份认证服务。
              </p>
            )}
            <fieldset
              className="m-0 min-w-0 space-y-5 border-0 p-0"
              disabled={!hydrated || pending || !demoEnabled}
            >
              <div>
                <label className="field-label" htmlFor="login-email">
                  邮箱
                </label>
                <input
                  className="input mt-2 w-full"
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="admin@example.com"
                  maxLength={254}
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-describedby={error ? 'login-error' : undefined}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="login-password">
                  密码
                </label>
                <div className="relative mt-2">
                  <input
                    className="input w-full pr-12"
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="输入演示密码"
                    maxLength={128}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    aria-describedby={error ? 'login-error' : undefined}
                  />
                  <button
                    type="button"
                    className="muted absolute top-1/2 right-3 -translate-y-1/2 rounded p-1"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? '隐藏密码' : '显示密码'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              {error && (
                <p
                  className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300"
                  id="login-error"
                  role="alert"
                >
                  {error}
                </p>
              )}
              <button
                className="button button-primary w-full justify-center"
                type="submit"
                aria-busy={pending}
              >
                {pending ? (
                  <LoaderCircle
                    size={17}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight size={17} aria-hidden="true" />
                )}
                {pending ? '正在登录…' : '进入工作台'}
              </button>
              {demoEnabled && (
                <div className="border-t border-[var(--line)] pt-5">
                  <p className="field-label mb-3 text-xs">快捷填充演示账号</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {demoAccounts.map((account) => (
                      <button
                        key={account.email}
                        type="button"
                        className="rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-3 text-left transition hover:border-[var(--lagoon-deep)]"
                        onClick={() => {
                          setEmail(account.email)
                          setPassword(account.password)
                          setError('')
                        }}
                      >
                        <span className="block text-sm font-semibold">
                          {account.name}
                        </span>
                        <span className="muted mt-1 block text-xs">
                          {account.email}
                        </span>
                        <span className="muted mt-1 block text-xs">
                          密码：{account.password}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </fieldset>
            <noscript>
              <p className="muted mt-3 text-sm">
                登录演示需要启用 JavaScript。
              </p>
            </noscript>
          </form>
          <p className="muted mt-5 mb-0 text-xs leading-6">
            此登录仅用于公开演示。生产环境默认关闭演示账号；正式上线时请接入实际身份认证服务。
          </p>
        </section>
      </div>
      <p className="muted m-0 text-center text-xs">
        {appConfig.name} · 基于 TanStack Start 构建
      </p>
    </main>
  )
}
