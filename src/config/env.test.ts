import { describe, expect, it } from 'vitest'
import { environmentForMode, parseAppConfig } from './env'

const defaults = {
  VITE_APP_ENV: 'DEV',
  VITE_APP_NAME: 'Void',
  VITE_API_BASE_URL: '',
}

describe('public environment configuration', () => {
  it.each([
    ['development', 'DEV'],
    ['uat', 'UAT'],
    ['production', 'PROD'],
  ])('maps Vite mode %s to %s', (mode, environment) => {
    expect(environmentForMode(mode)).toBe(environment)
  })

  it('rejects unknown modes instead of falling back to development', () => {
    expect(() => environmentForMode('staging')).toThrow('Vite mode')
  })

  it.each(['DEV', 'UAT', 'PROD'])(
    'accepts the %s application environment',
    (environment) => {
      expect(
        parseAppConfig({ ...defaults, VITE_APP_ENV: environment }).environment,
      ).toBe(environment)
    },
  )

  it.each([undefined, '', 'development', 'dev', 'TEST'])(
    'rejects invalid application environment %s',
    (environment) => {
      expect(() =>
        parseAppConfig({ ...defaults, VITE_APP_ENV: environment }),
      ).toThrow('VITE_APP_ENV')
    },
  )

  it('defaults an unset API URL and app name without exposing private fields', () => {
    const config = parseAppConfig({
      VITE_APP_ENV: 'DEV',
      SESSION_SECRET: 'private-value',
      DEMO_AUTH_ENABLED: 'true',
    })
    expect(config).toEqual({
      environment: 'DEV',
      name: 'Void',
      apiBaseUrl: '',
      apiConfigured: false,
    })
  })

  it.each([
    ['https://api.example.com/v1/', 'https://api.example.com/v1'],
    ['http://localhost:8080/api', 'http://localhost:8080/api'],
    ['/api/v1/', '/api/v1'],
    ['/', '/'],
  ])('accepts valid API base %s', (value, expected) => {
    const config = parseAppConfig({ ...defaults, VITE_API_BASE_URL: value })
    expect(config.apiBaseUrl).toBe(expected)
    expect(config.apiConfigured).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'ftp://api.example.com',
    '//api.example.com',
    '/\\api.example.com',
    'https://name:password@api.example.com',
    'https://api.example.com?token=private',
    '/api#fragment',
    'api/v1',
    42,
  ])('rejects invalid or credential-bearing API base %s', (value) => {
    expect(() =>
      parseAppConfig({ ...defaults, VITE_API_BASE_URL: value }),
    ).toThrow('VITE_API_BASE_URL')
  })

  it.each(['', ' '.repeat(3), 'a'.repeat(61), 42])(
    'rejects invalid app name',
    (name) => {
      expect(() =>
        parseAppConfig({ ...defaults, VITE_APP_NAME: name }),
      ).toThrow('VITE_APP_NAME')
    },
  )
})
