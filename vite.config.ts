import { defineConfig, loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { environmentForMode, parseAppConfig } from './src/config/env.ts'

export default defineConfig(({ command, mode, isPreview }) => {
  const testing = mode === 'test'
  const effectiveMode = testing ? 'development' : mode
  const expectedEnvironment = environmentForMode(effectiveMode)
  const loaded = loadEnv(effectiveMode, process.cwd(), '')
  const publicConfig = parseAppConfig(loaded)
  if (publicConfig.environment !== expectedEnvironment) {
    throw new Error(
      'VITE_APP_ENV 与 Vite mode 不一致，请检查该模式的环境文件和本地覆盖。',
    )
  }

  // Read private values for local server execution only; never use define or envPrefix
  // to include server secrets in the browser or in build artifacts.
  if (command === 'serve' && !testing) {
    for (const key of ['SESSION_SECRET', 'DEMO_AUTH_ENABLED']) {
      if (process.env[key] === undefined && Object.hasOwn(loaded, key)) {
        process.env[key] = loaded[key]
      }
    }
  }

  return {
    mode: effectiveMode,
    resolve: { tsconfigPaths: true },
    build: { outDir: `dist/${expectedEnvironment.toLowerCase()}` },
    server: {
      watch: { ignored: ['**/.verification/**', '**/.browser-verify/**'] },
    },
    plugins: [
      ...(command === 'serve' &&
      !isPreview &&
      !testing &&
      expectedEnvironment === 'DEV'
        ? [devtools()]
        : []),
      tailwindcss(),
      ...(!testing ? [tanstackStart()] : []),
      viteReact(),
    ],
  }
})
