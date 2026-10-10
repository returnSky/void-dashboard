import { getAppConfig } from '../config/env'
import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  MoreHorizontal,
  TrendingUp,
  UserCheck,
  Users,
} from 'lucide-react'
import { useDashboard } from '../components/DashboardProvider'
import Select from '../components/Select'
import { Route as dashboardRoute } from './_dashboard'
import {
  MetricSparkline,
  RevenueChart,
  UserStatusChart,
} from '../components/DashboardCharts'

export const Route = createFileRoute('/_dashboard/')({
  head: () => ({ meta: [{ title: `工作台概览 · ${getAppConfig().name}` }] }),
  component: Overview,
})

const periods = {
  '7': {
    label: '最近 7 天',
    dates: ['09/24', '09/25', '09/26', '09/27', '09/28', '09/29', '09/30'],
    revenue: [3200, 4100, 3700, 5100, 4400, 5800, 6300],
    previous: 27300,
  },
  '30': {
    label: '最近 30 天',
    dates: [
      '09/01',
      '09/04',
      '09/07',
      '09/10',
      '09/13',
      '09/16',
      '09/19',
      '09/22',
      '09/25',
      '09/28',
      '09/30',
    ],
    revenue: [
      6500, 9200, 8100, 12300, 10400, 14200, 11300, 13800, 12400, 15600, 14600,
    ],
    previous: 113829,
  },
  '90': {
    label: '最近 90 天',
    dates: [
      '07/02',
      '07/11',
      '07/20',
      '07/29',
      '08/07',
      '08/16',
      '08/25',
      '09/03',
      '09/12',
      '09/21',
      '09/30',
    ],
    revenue: [
      23200, 27600, 26400, 31200, 28500, 34800, 32100, 38200, 35800, 42100,
      46900,
    ],
    previous: 303194,
  },
} as const

type Period = keyof typeof periods
const number = new Intl.NumberFormat('zh-CN')
const statusLabels = {
  active: '正常',
  invited: '待邀请',
  disabled: '已停用',
} as const

function Overview() {
  const { users, hydrated } = useDashboard()
  const { user } = dashboardRoute.useRouteContext()
  const [period, setPeriod] = useState<Period>('30')
  const data = periods[period]
  const total = data.revenue.reduce((sum, value) => sum + value, 0)
  const growth = ((total / data.previous - 1) * 100).toFixed(1)
  const active = users.filter((item) => item.status === 'active').length
  const invited = users.filter((item) => item.status === 'invited').length
  const rate = users.length ? Math.round((active / users.length) * 100) : 0
  const latest = [...users]
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))
    .slice(0, 4)
  const revenueData = data.dates.map((date, index) => ({
    date,
    revenue: data.revenue[index],
  }))
  const statusData = (['active', 'invited', 'disabled'] as const).map(
    (status) => ({
      status,
      name: statusLabels[status],
      value: users.filter((item) => item.status === status).length,
    }),
  )

  function downloadReport() {
    const csv =
      '\ufeff日期,演示收入(CNY)\r\n' +
      data.dates
        .map((date, index) => `2026/${date},${data.revenue[index]}`)
        .join('\r\n')
    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `void-revenue-${period}days.csv`
    anchor.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-6 rise-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--palm)]" />
            <p className="text-[10px] font-semibold tracking-widest muted">
              WORKSPACE OVERVIEW
            </p>
          </div>
          <h1 className="page-heading">
            欢迎回来，{user.name}
            <span className="ml-2 text-xl font-normal">☀</span>
          </h1>
          <p className="mt-2 text-xs muted">
            每个关键指标，每一次团队进展，都在这里。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={period}
            onChange={setPeriod}
            label="报表时间范围"
            icon={<CalendarDays size={15} aria-hidden="true" />}
            options={Object.entries(periods).map(([value, entry]) => ({
              value: value as Period,
              label: entry.label,
            }))}
          />
          <button
            type="button"
            className="button button-primary"
            onClick={downloadReport}
          >
            <ArrowDownToLine size={15} aria-hidden="true" />
            导出报表
          </button>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: '营业收入',
            value: `¥${number.format(total)}`,
            icon: CircleDollarSign,
            detail: `+${growth}%`,
            foot: '较上一周期 · 演示数据',
            spark: [...data.revenue],
          },
          {
            title: '工作区用户',
            value: number.format(users.length),
            icon: Users,
            detail: '全部用户',
            foot: '与用户管理实时同步',
            spark: [4, 4, 10, 10, 16, 16, 24, 24],
          },
          {
            title: '活跃用户',
            value: number.format(active),
            icon: UserCheck,
            detail: `${rate}% 占比`,
            foot: '当前状态为正常的用户',
            spark: [8, 5, 14, 12, 18, 15, 23, 22],
          },
          {
            title: '等待邀请',
            value: number.format(invited),
            icon: Clock3,
            detail: invited ? '待处理' : '已完成',
            foot: '可在用户管理中激活',
            spark: [21, 18, 23, 13, 15, 7, 11, 6],
          },
        ].map(({ title, value, icon: Icon, detail, foot, spark }) => (
          <article className="panel metric-card" key={title}>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium muted">{title}</h2>
              <Icon size={17} className="muted" aria-hidden="true" />
            </div>
            <p className="metric-value mb-4 mt-4">{value}</p>
            <div className="flex items-center gap-1.5">
              <span className="metric-delta">
                {title === '营业收入' && (
                  <TrendingUp size={11} aria-hidden="true" />
                )}
                {detail}
              </span>
            </div>
            <p className="mt-2 text-[10px] muted">{foot}</p>
            <MetricSparkline data={spark} />
          </article>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="panel min-w-0 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="chart-heading">收入趋势</h2>
              <p className="mt-1.5 text-[11px] muted">
                {data.label}的收入表现{' '}
                <span className="mx-1.5 opacity-40">·</span> 截至 2026/09/30
                的演示数据
              </p>
            </div>
            <span className="status-badge status-active">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              演示报表
            </span>
          </div>
          <div className="mt-5 flex items-baseline gap-3">
            <p className="text-[26px] font-semibold tracking-tight">
              ¥{number.format(total)}
            </p>
            <span className="text-[11px] text-[var(--palm)]">↑ {growth}%</span>
          </div>
          <RevenueChart data={revenueData} label={data.label} />
          <details className="mt-2 text-[11px] muted">
            <summary className="inline-flex cursor-pointer items-center gap-1">
              查看图表数据 <ChevronRight size={12} aria-hidden="true" />
            </summary>
            <div className="table-scroll mt-3">
              <table>
                <caption className="sr-only">演示收入明细</caption>
                <thead>
                  <tr>
                    <th scope="col">日期</th>
                    <th scope="col">收入（元）</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dates.map((date, index) => (
                    <tr key={date}>
                      <td>2026/{date}</td>
                      <td>{number.format(data.revenue[index])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
        <section className="panel p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="chart-heading">用户状态分布</h2>
            <MoreHorizontal size={18} className="muted" aria-hidden="true" />
          </div>
          <p className="mt-1.5 text-[11px] muted">工作区成员的当前状态</p>
          <UserStatusChart data={statusData} />
          <div className="space-y-3">
            {(['active', 'invited', 'disabled'] as const).map((status) => (
              <div key={status} className="flex items-center gap-2 text-xs">
                <span
                  className={`h-2 w-2 rounded-full ${status === 'active' ? 'bg-[var(--lagoon-deep)]' : status === 'invited' ? 'bg-[var(--warning)]' : 'bg-[var(--sea-ink-soft)]'}`}
                />
                <span className="muted">{statusLabels[status]}</span>
                <strong className="ml-auto font-medium">
                  {users.filter((item) => item.status === status).length}
                </strong>
              </div>
            ))}
          </div>
          <Link
            to="/users"
            search={{
              q: '',
              status: 'all',
              role: 'all',
              sort: 'joined-desc',
              page: 1,
            }}
            className="mt-5 flex items-center justify-center gap-2 border-t border-[var(--line)] pt-4 text-xs font-medium"
          >
            查看全部用户 <ArrowRight size={13} aria-hidden="true" />
          </Link>
        </section>
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="panel min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-3 p-5">
            <div>
              <h2 className="chart-heading">最近加入</h2>
              <p className="mt-1 text-[11px] muted">新成员，让工作区更有活力</p>
            </div>
            <Link
              to="/users"
              search={{
                q: '',
                status: 'all',
                role: 'all',
                sort: 'joined-desc',
                page: 1,
              }}
              className="flex items-center gap-1 text-xs font-medium"
            >
              管理用户 <ArrowUpRight size={13} aria-hidden="true" />
            </Link>
          </div>
          <div className="table-scroll">
            <table>
              <caption className="sr-only">最近加入的四名用户</caption>
              <thead>
                <tr>
                  <th scope="col">用户</th>
                  <th scope="col">角色</th>
                  <th scope="col">状态</th>
                  <th scope="col">加入日期</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="avatar">{item.name.slice(0, 1)}</span>
                        <div>
                          <strong className="block text-xs font-medium">
                            {item.name}
                          </strong>
                          <span className="mt-1 block text-[10px] muted">
                            {item.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{item.role === 'admin' ? '管理员' : '只读成员'}</td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>
                        <span className="h-1 w-1 rounded-full bg-current" />
                        {statusLabels[item.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap muted">
                      {item.joinedAt.slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!hydrated && (
            <p role="status" className="px-5 py-2 text-xs muted">
              正在同步浏览器演示数据…
            </p>
          )}
        </section>
        <section className="panel p-5 sm:p-6">
          <h2 className="chart-heading">快速开始</h2>
          <p className="mt-1.5 text-[11px] muted">你的后台模板已准备就绪</p>
          <div className="mt-5 space-y-5">
            {[
              {
                title: '完成工作区配置',
                desc: '品牌名称与通知偏好',
                to: '/settings',
                icon: Check,
              },
              {
                title: '维护团队成员',
                desc: '新增、编辑与角色管理',
                to: '/users',
                icon: Users,
              },
              {
                title: '接入你的业务',
                desc: '认证、API 与数据持久化',
                to: '/about',
                icon: ArrowRight,
              },
            ].map(({ title, desc, to, icon: Icon }) => (
              <Link
                key={title}
                to={to as '/settings' | '/users' | '/about'}
                className="flex items-center gap-3 text-[var(--sea-ink)]"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--palm)]">
                  <Icon size={14} aria-hidden="true" />
                </span>
                <span>
                  <strong className="block text-xs font-medium">{title}</strong>
                  <span className="mt-1 block text-[10px] muted">{desc}</span>
                </span>
                <ChevronRight
                  className="ml-auto muted"
                  size={14}
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
          <p className="mt-6 border-t border-[var(--line)] pt-4 text-[10px] leading-5 muted">
            收入为固定演示数据；用户指标随列表操作同步更新。
          </p>
        </section>
      </div>
    </div>
  )
}
