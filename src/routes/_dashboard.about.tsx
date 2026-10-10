import { getAppConfig } from '../config/env'
import { createFileRoute } from '@tanstack/react-router'
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Database,
  Layers3,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

export const Route = createFileRoute('/_dashboard/about')({
  head: () => ({ meta: [{ title: `模板指南 · ${getAppConfig().name}` }] }),
  component: TemplateGuide,
})

function TemplateGuide() {
  const appConfig = getAppConfig()
  return (
    <div className="space-y-6 rise-in">
      <div>
        <p className="mb-2 text-[10px] font-semibold tracking-widest muted">
          BUILD YOUR NEXT WORKSPACE
        </p>
        <h1 className="page-heading">从一个完整的起点开始</h1>
        <p className="mt-2 text-xs leading-6 muted">
          {appConfig.name}{' '}
          是一个可扩展的通用管理后台模板。先跑通体验，再连接你的业务。
        </p>
      </div>
      <section className="panel relative overflow-hidden p-6 sm:p-8">
        <div className="flex items-center gap-2 text-[var(--palm)]">
          <Layers3 size={22} aria-hidden="true" />
          <span className="text-sm font-semibold">
            TanStack Start + React + Tailwind CSS
          </span>
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-tight">
          界面、路由、状态，已经连起来了。
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 muted">
          使用文件路由组织页面，以共享布局承载导航。图表和表格基于原生 SVG 与
          HTML，保留清晰的扩展入口，方便迁移到真实数据源。
        </p>
        <span className="status-badge status-active mt-5">
          模板 v0.1 · 演示模式
        </span>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Sparkles,
            title: '可交互的业务范例',
            desc: '筛选、排序、分页、用户维护、CSV 导出与设置保存，帮助你快速搭建同类页面。',
          },
          {
            icon: ShieldCheck,
            title: '两种演示角色',
            desc: '管理员可以维护数据，只读成员可浏览和导出。登录态来自服务端 Cookie Session。',
          },
          {
            icon: Database,
            title: '方便替换的数据入口',
            desc: '当前用户与设置保存在浏览器。将 Provider 方法替换为后端调用，即可开始接入业务。',
          },
        ].map(({ icon: Icon, title, desc }) => (
          <article key={title} className="panel p-6">
            <Icon
              className="mb-4 text-[var(--palm)]"
              size={21}
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="mt-2 text-xs leading-6 muted">{desc}</p>
          </article>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="panel p-6">
          <h2 className="chart-heading">已具备的基础能力</h2>
          <ul className="mt-5 space-y-3">
            {[
              '桌面侧栏、移动导航、搜索与面包屑',
              '数据概览、周期切换和可访问图表',
              '带 URL 状态的用户列表与表单校验',
              '浅色、深色和跟随系统主题',
              '加载、空状态、操作通知、错误与 404',
              'SSR 登录态、页面保护和演示角色',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs">
                <CheckCircle2
                  size={15}
                  className="text-[var(--palm)]"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>
        <section className="panel p-6">
          <h2 className="chart-heading">接入真实业务的下一步</h2>
          <ol className="mt-5 space-y-4">
            {[
              {
                title: '替换演示认证',
                desc: '连接身份服务，补齐密码重置、邀请与会话撤销。',
              },
              {
                title: '接入数据库或 API',
                desc: '在服务端验证角色与权限，添加服务端分页和审计日志。',
              },
              {
                title: '准备生产环境',
                desc: '配置 Session 密钥、部署适配器、错误监控与 CI。',
              },
            ].map(({ title, desc }, index) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--chip-bg)] text-[10px] muted">
                  0{index + 1}
                </span>
                <span>
                  <strong className="text-xs font-medium">{title}</strong>
                  <p className="mt-1 text-xs leading-5 muted">{desc}</p>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <section className="panel flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <BookOpen size={21} className="muted" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold">
              更多扩展细节，见项目 README
            </h2>
            <p className="mt-1 text-xs muted">
              演示账户、文件结构、环境变量和 API 替换位置都有说明。
            </p>
          </div>
        </div>
        <a
          href="https://tanstack.com/start/latest/docs/framework/react/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="button button-secondary"
        >
          TanStack 官方文档 <ArrowUpRight size={15} aria-hidden="true" />
        </a>
      </section>
    </div>
  )
}
