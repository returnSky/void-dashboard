import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
  useRouter,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ArrowLeft, CircleAlert, Layers3, LoaderCircle } from 'lucide-react'
import type { ErrorComponentProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { ToastProvider } from '../components/ToastProvider'
import { getCurrentUserFn } from '../server/auth'
import appCss from '../styles.css?url'
import { getAppConfig } from '../config/env'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

export const Route = createRootRoute({
  beforeLoad: async () => ({ user: await getCurrentUserFn() }),
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: `${getAppConfig().name} · 管理工作台` },
      {
        name: 'description',
        content:
          '基于 TanStack Start 的通用管理后台模板，包含数据概览、用户管理与工作区设置。',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', type: 'image/svg+xml', href: '/void.svg' },
      { rel: 'alternate icon', href: '/favicon.ico' },
      { rel: 'apple-touch-icon', href: '/logo192.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
  }),
  pendingComponent: PageLoading,
  errorComponent: PageError,
  notFoundComponent: PageNotFound,
  shellComponent: RootDocument,
})

export function PageLoading() {
  return (
    <div className="fallback-page" role="status">
      <LoaderCircle
        className="animate-spin text-[var(--lagoon-deep)]"
        size={30}
        aria-hidden="true"
      />
      <p className="mt-4 muted">正在加载工作区…</p>
    </div>
  )
}

function PageError({ reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <main className="fallback-page">
      <CircleAlert
        size={36}
        className="text-[var(--danger)]"
        aria-hidden="true"
      />
      <h1 className="mt-5 text-2xl font-semibold">页面暂时无法加载</h1>
      <p className="mt-2 muted">
        请重试，或返回工作台。若问题持续，请检查服务配置。
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          className="button button-primary"
          onClick={() => {
            void router.invalidate()
            reset()
          }}
        >
          重新尝试
        </button>
        <Link to="/" className="button button-secondary">
          返回工作台
        </Link>
      </div>
    </main>
  )
}

function PageNotFound() {
  return (
    <main className="fallback-page">
      <Layers3
        size={32}
        className="text-[var(--lagoon-deep)]"
        aria-hidden="true"
      />
      <p className="mt-6 font-mono text-7xl font-semibold tracking-tight">
        404
      </p>
      <h1 className="mt-4 text-xl font-semibold">这个页面还未加入工作区</h1>
      <p className="mt-2 muted">请检查地址，或从工作台继续。</p>
      <Link to="/" className="button button-primary mt-6">
        <ArrowLeft size={16} aria-hidden="true" />
        返回工作台
      </Link>
    </main>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        <ToastProvider>{children}</ToastProvider>
        {import.meta.env.DEV && getAppConfig().environment === 'DEV' && (
          <TanStackDevtools
            config={{ position: 'bottom-right' }}
            plugins={[
              {
                name: 'TanStack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  )
}
