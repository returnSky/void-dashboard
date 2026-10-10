export type AppEnvironment = 'DEV' | 'UAT' | 'PROD'

export type AppConfig = {
  environment: AppEnvironment
  name: string
  apiBaseUrl: string
  apiConfigured: boolean
}

export function environmentForMode(mode: string): AppEnvironment {
  switch (mode) {
    case 'development':
      return 'DEV'
    case 'uat':
      return 'UAT'
    case 'production':
      return 'PROD'
    default:
      throw new Error(
        '不支持的 Vite mode；请使用 development、uat 或 production。',
      )
  }
}

export function parseAppEnvironment(value: unknown): AppEnvironment {
  if (value === 'DEV' || value === 'UAT' || value === 'PROD') return value
  throw new Error('VITE_APP_ENV 必须为 DEV、UAT 或 PROD。')
}

function parseApiBaseUrl(value: unknown): string {
  if (value === undefined || value === '') return ''
  if (typeof value !== 'string') {
    throw new Error('VITE_API_BASE_URL 必须为字符串。')
  }
  const normalized = value.trim()
  if (!normalized) return ''
  const invalid = () => {
    throw new Error(
      'VITE_API_BASE_URL 必须为 HTTP(S) URL 或同源绝对路径，且不包含账号、查询参数或片段。',
    )
  }
  if (normalized.includes('\\') || /[\s?#]/.test(normalized)) return invalid()
  if (normalized.startsWith('/')) {
    if (normalized.startsWith('//')) return invalid()
    return normalized === '/' ? '/' : normalized.replace(/\/+$/, '')
  }
  let url: URL
  try {
    url = new URL(normalized)
  } catch {
    return invalid()
  }
  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    return invalid()
  return url.toString().replace(/\/+$/, '')
}

// Only these public fields are returned. Server secrets never enter this object.
export function parseAppConfig(input: Record<string, unknown>): AppConfig {
  const environment = parseAppEnvironment(input.VITE_APP_ENV)
  const name = input.VITE_APP_NAME === undefined ? 'Void' : input.VITE_APP_NAME
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 60) {
    throw new Error('VITE_APP_NAME 需要为 1 至 60 字符的应用名称。')
  }
  const apiBaseUrl = parseApiBaseUrl(input.VITE_API_BASE_URL)
  return {
    environment,
    name: name.trim(),
    apiBaseUrl,
    apiConfigured: Boolean(apiBaseUrl),
  }
}

export function getAppConfig(): AppConfig {
  return parseAppConfig(import.meta.env)
}
