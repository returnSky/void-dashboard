import { createServerFn } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import {
  authenticateDemoUser,
  clearDemoSession,
  getDemoAuthConfigurationError,
  getDemoUser,
  hasDemoSessionCookie,
  isDemoAuthEnabled,
  useDemoSession,
} from './session.server'

export type DemoSessionUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'viewer'
}

export type DashboardDestination = '/' | '/users' | '/settings' | '/about'

export function getSafeRedirect(value: unknown): DashboardDestination {
  return value === '/users' || value === '/settings' || value === '/about'
    ? value
    : '/'
}

type LoginResult =
  { success: true; error?: never } | { error: string; success?: never }

export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DemoSessionUser | null> => {
    setResponseHeader('Cache-Control', 'private, no-store')
    if (
      !isDemoAuthEnabled() ||
      getDemoAuthConfigurationError() ||
      !hasDemoSessionCookie()
    )
      return null

    const session = await useDemoSession()
    return getDemoUser(session.data.userId)
  },
)

export const loginFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    if (
      !input ||
      typeof input !== 'object' ||
      !('email' in input) ||
      !('password' in input) ||
      typeof input.email !== 'string' ||
      typeof input.password !== 'string'
    ) {
      return { error: '请输入邮箱和密码。' } as const
    }

    const email = input.email.trim().toLowerCase()
    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      input.password.length < 1 ||
      input.password.length > 128
    ) {
      return { error: '请输入有效邮箱和 1 至 128 位密码。' } as const
    }

    return { email, password: input.password }
  })
  .handler(async ({ data }): Promise<LoginResult> => {
    setResponseHeader('Cache-Control', 'private, no-store')
    if (data.error) return { error: data.error }

    if (!isDemoAuthEnabled()) {
      return {
        error:
          '演示登录当前未启用。请在服务器环境中设置 DEMO_AUTH_ENABLED=true；生产项目请接入正式认证服务。',
      }
    }

    const configurationError = getDemoAuthConfigurationError()
    if (configurationError) return { error: configurationError }

    const user = authenticateDemoUser(data.email, data.password)
    if (!user) return { error: '邮箱或密码错误，请使用下方的演示账号重试。' }

    const session = await useDemoSession()
    await session.update({ userId: user.id })
    return { success: true }
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(async () => {
  setResponseHeader('Cache-Control', 'private, no-store')
  await clearDemoSession()
  return { success: true }
})

export const getDemoAuthStatusFn = createServerFn({ method: 'GET' }).handler(
  () => {
    setResponseHeader('Cache-Control', 'private, no-store')
    return { enabled: isDemoAuthEnabled() }
  },
)
