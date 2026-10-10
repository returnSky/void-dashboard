import { useId } from 'react'
import { useHydrated } from '@tanstack/react-router'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PieSectorShapeProps, TooltipContentProps } from 'recharts'

type RevenueDatum = { date: string; revenue: number }
type UserStatus = 'active' | 'invited' | 'disabled'
type UserStatusDatum = { status: UserStatus; name: string; value: number }

const currency = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 0,
})
const number = new Intl.NumberFormat('zh-CN')
const shortNumber = new Intl.NumberFormat('zh-CN', {
  maximumFractionDigits: 1,
})
const statusColors: Record<UserStatus, string> = {
  active: 'var(--lagoon-deep)',
  invited: 'var(--warning)',
  disabled: 'var(--sea-ink-soft)',
}

function RevenueTooltip({ active, payload, label }: TooltipContentProps) {
  const value = payload[0]?.value
  if (!active || typeof value !== 'number') return null

  return (
    <div className="chart-tooltip" data-chart-tooltip="revenue" role="status">
      <p className="mb-2 text-[11px] muted">{label}</p>
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full bg-[var(--lagoon-deep)]"
          aria-hidden="true"
        />
        <span className="text-xs muted">收入</span>
        <strong className="ml-3 text-sm font-semibold tabular-nums">
          {currency.format(value)}
        </strong>
      </div>
    </div>
  )
}

function UserStatusTooltip({
  active,
  payload,
  total,
}: TooltipContentProps & { total: number }) {
  if (!active || payload.length === 0 || total === 0) return null
  const entry = payload[0]
  const value = entry.value
  if (typeof value !== 'number') return null

  return (
    <div
      className="chart-tooltip"
      data-chart-tooltip="user-status"
      role="status"
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: entry.color }}
          aria-hidden="true"
        />
        <span className="text-xs muted">{entry.name}</span>
        <strong className="ml-3 text-sm font-semibold tabular-nums">
          {number.format(value)} 人
        </strong>
      </div>
      <p className="mt-2 text-[11px] muted">
        占全部用户 {shortNumber.format((value / total) * 100)}%
      </p>
    </div>
  )
}

function formatRevenueTick(value: number) {
  return value >= 10000
    ? `¥${shortNumber.format(value / 10000)}万`
    : `¥${shortNumber.format(value)}`
}

export function RevenueChart({
  data,
  label,
}: {
  data: Array<RevenueDatum>
  label: string
}) {
  const hydrated = useHydrated()
  const gradientId = `revenue-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const title = `${label}收入趋势`
  const description = `使用左右方向键浏览数据。${data
    .map((item) => `${item.date}，收入${currency.format(item.revenue)}`)
    .join('；')}`

  return (
    <div className="mt-2 h-[260px] w-full min-w-0" data-chart="revenue">
      <p className="sr-only">{`${title}。${description}`}</p>
      {hydrated ? (
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 640, height: 260 }}
        >
          <AreaChart
            data={data}
            margin={{ top: 16, right: 12, bottom: 4, left: 0 }}
            accessibilityLayer
            tabIndex={0}
            title={title}
            desc={description}
            aria-label={title}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--lagoon)"
                  stopOpacity={0.22}
                />
                <stop
                  offset="100%"
                  stopColor="var(--lagoon)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--chart-grid)"
              strokeDasharray="4 4"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--sea-ink-soft)', fontSize: 10 }}
              tickMargin={12}
              minTickGap={28}
              interval="preserveStartEnd"
              height={32}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--sea-ink-soft)', fontSize: 10 }}
              tickFormatter={formatRevenueTick}
              tickMargin={8}
              tickCount={4}
              width={58}
              domain={[0, 'auto']}
            />
            <Tooltip
              content={RevenueTooltip}
              cursor={{
                stroke: 'var(--lagoon)',
                strokeDasharray: '3 3',
                strokeWidth: 1,
              }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="收入"
              stroke="var(--lagoon-deep)"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={{
                r: 3,
                fill: 'var(--surface)',
                stroke: 'var(--lagoon-deep)',
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 5,
                fill: 'var(--lagoon-deep)',
                stroke: 'var(--surface)',
                strokeWidth: 2,
              }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div
          className="flex h-full items-center justify-center text-xs muted"
          data-chart-placeholder="revenue"
          role="status"
        >
          正在加载图表…
        </div>
      )}
    </div>
  )
}

export function UserStatusChart({ data }: { data: Array<UserStatusDatum> }) {
  const hydrated = useHydrated()
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const counts: Record<UserStatus, number> = {
    active: 0,
    invited: 0,
    disabled: 0,
  }
  for (const item of data) counts[item.status] += item.value
  const active = counts.active
  const rate = total ? Math.round((active / total) * 100) : 0
  const chartData = data.map((item) => ({
    ...item,
    fill: statusColors[item.status],
  }))
  const description = total
    ? `用户状态分布：${data
        .map((item) => `${item.name}${number.format(item.value)}人`)
        .join('，')}。使用左右方向键浏览各状态。`
    : '暂无用户，添加用户后将在这里显示状态分布。'

  return (
    <div
      className="relative mx-auto my-6 h-44 w-44"
      data-chart="user-status"
      data-active={active}
      data-invited={counts.invited}
      data-disabled={counts.disabled}
    >
      <p className="sr-only">{description}</p>
      {total === 0 ? (
        <div
          className="absolute inset-2 rounded-full border-[14px] border-[var(--chip-bg)]"
          aria-hidden="true"
        />
      ) : hydrated ? (
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 176, height: 176 }}
        >
          <PieChart
            accessibilityLayer
            tabIndex={0}
            title="用户状态分布"
            desc={description}
            aria-label="用户状态分布"
          >
            <Pie
              rootTabIndex={-1}
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={78}
              startAngle={90}
              endAngle={-270}
              paddingAngle={total > 1 ? 3 : 0}
              stroke="var(--surface)"
              strokeWidth={2}
              shape={(props: PieSectorShapeProps) => (
                <Sector
                  {...props}
                  data-status={chartData[props.index]?.status}
                  data-count={props.value}
                />
              )}
              isAnimationActive={false}
            />
            <Tooltip
              content={(props) => (
                <UserStatusTooltip {...props} total={total} />
              )}
              wrapperStyle={{ zIndex: 1 }}
              isAnimationActive={false}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div
          className="absolute inset-2 rounded-full border-[14px] border-[var(--chip-bg)]"
          data-chart-placeholder="user-status"
          aria-hidden="true"
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        aria-hidden="true"
      >
        <span className="text-[27px] font-semibold tracking-tight tabular-nums">
          {total ? `${rate}%` : '0'}
        </span>
        <span className="mt-1 text-[10px] muted">
          {total ? '用户活跃占比' : '暂无用户'}
        </span>
      </div>
    </div>
  )
}

export function MetricSparkline({ data }: { data: Array<number> }) {
  const hydrated = useHydrated()
  const chartData = data.map((value, index) => ({ index, value }))

  return (
    <div className="metric-spark" data-chart="sparkline" aria-hidden="true">
      {hydrated && (
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 84, height: 30 }}
        >
          <LineChart
            data={chartData}
            margin={{ top: 2, right: 1, bottom: 2, left: 1 }}
            accessibilityLayer={false}
            tabIndex={-1}
          >
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--lagoon)"
              strokeWidth={1.8}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
