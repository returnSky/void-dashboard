import {
  clearSession,
  getCookie,
  useSession,
} from '@tanstack/react-start/server'
import { getAppConfig } from '../config/env'
import type { DemoSessionUser } from './auth'

const SESSION_MAX_AGE = 8 * 60 * 60
const DEVELOPMENT_SECRET =
  'dashboard-development-only-session-secret-change-in-production'

// Public demo credentials only. Replace this adapter with your real identity provider.
const DEMO_ACCOUNTS = [
  {
    id: 'demo-admin',
    name: '管理员',
    email: 'admin@example.com',
    role: 'admin' as const,
    password: 'Admin123!',
  },
  {
    id: 'demo-viewer',
    name: '只读访客',
    email: 'viewer@example.com',
    role: 'viewer' as const,
    password: 'Viewer123!',
  },
]

function getSessionName() {
  return `void-session-${getAppConfig().environment.toLowerCase()}`
}

function canUseDevelopmentSecret() {
  return (
    getAppConfig().environment === 'DEV' &&
    !import.meta.env.PROD &&
    process.env.NODE_ENV !== 'production'
  )
}

export function isDemoAuthEnabled() {
  const explicit = process.env.DEMO_AUTH_ENABLED
  if (explicit !== undefined) return explicit === 'true'
  return getAppConfig().environment === 'DEV'
}

export function getDemoAuthConfigurationError(): string | null {
  const secret = process.env.SESSION_SECRET
  if (!canUseDevelopmentSecret() && (!secret || secret.length < 32)) {
    return '演示认证配置不完整：UAT、PROD 和构建产物运行时需要配置至少 32 字符的 SESSION_SECRET。'
  }
  if (secret && secret.length < 32) {
    return 'SESSION_SECRET 至少需要 32 个字符，请检查服务器环境配置。'
  }
  return null
}

function getSessionConfig() {
  return {
    name: getSessionName(),
    password: process.env.SESSION_SECRET || DEVELOPMENT_SECRET,
    maxAge: SESSION_MAX_AGE,
    sessionHeader: false as const,
    cookie: {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: !canUseDevelopmentSecret(),
      path: '/',
      maxAge: SESSION_MAX_AGE,
    },
  }
}

export function useDemoSession() {
  const configurationError = getDemoAuthConfigurationError()
  if (configurationError) throw new Error(configurationError)
  return useSession<{ userId: string }>(getSessionConfig())
}

export function hasDemoSessionCookie() {
  return Boolean(getCookie(getSessionName()))
}

export function clearDemoSession() {
  return clearSession({
    name: getSessionName(),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: !canUseDevelopmentSecret(),
      path: '/',
    },
  })
}

function publicUser(account: (typeof DEMO_ACCOUNTS)[number]): DemoSessionUser {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
  }
}

export function getDemoUser(id: unknown): DemoSessionUser | null {
  const account = DEMO_ACCOUNTS.find((candidate) => candidate.id === id)
  return account ? publicUser(account) : null
}

export function authenticateDemoUser(email: string, password: string) {
  const account = DEMO_ACCOUNTS.find(
    (candidate) => candidate.email === email && candidate.password === password,
  )
  return account ? publicUser(account) : null
}
