import { getAppConfig } from '../config/env'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { SearchSchemaInput } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Users,
  UserCheck,
  UserX,
} from 'lucide-react'
import { Route as dashboardRoute } from './_dashboard'
import { useDashboard } from '../components/DashboardProvider'
import { useToast } from '../components/ToastProvider'
import Dialog from '../components/Dialog'
import Select from '../components/Select'
import {
  PAGE_SIZE,
  filterAndSortUsers,
  parseUsersSearch,
  roleLabels,
  statusLabels,
  toUsersCsv,
} from '../data/dashboard'
import type { DemoUser, DemoUserInput, UsersSearch } from '../data/dashboard'

export const Route = createFileRoute('/_dashboard/users')({
  validateSearch: (search: Record<string, unknown> & SearchSchemaInput) =>
    parseUsersSearch(search),
  head: () => ({ meta: [{ title: `用户管理 · ${getAppConfig().name}` }] }),
  component: UsersPage,
})

const emptyInput: DemoUserInput = {
  name: '',
  email: '',
  role: 'viewer',
  status: 'invited',
}

function UsersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const { user } = dashboardRoute.useRouteContext()
  const { users, hydrated, addUser, updateUser, updateUserStatus } =
    useDashboard()
  const { toast } = useToast()
  const isAdmin = user.role === 'admin'
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<DemoUser | null>(null)
  const [form, setForm] = useState<DemoUserInput>({ ...emptyInput })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [confirmUser, setConfirmUser] = useState<DemoUser | null>(null)
  const filtered = useMemo(
    () => filterAndSortUsers(users, search),
    [users, search],
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(search.page, pageCount)
  const pageUsers = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = Boolean(
    search.q || search.role !== 'all' || search.status !== 'all',
  )

  useEffect(() => {
    if (hydrated && search.page !== page) {
      void navigate({
        search: (previous) => ({ ...previous, page }),
        replace: true,
      })
    }
  }, [hydrated, navigate, page, search.page])

  function changeSearch(patch: Partial<UsersSearch>) {
    void navigate({
      search: (previous) => ({ ...previous, ...patch, page: 1 }),
      replace: true,
    })
  }

  function openEditor(member?: DemoUser) {
    if (!isAdmin || !hydrated) return
    submitting.current = false
    setBusy(false)
    setEditingUser(member ?? null)
    setForm(
      member
        ? {
            name: member.name,
            email: member.email,
            role: member.role,
            status: member.status,
          }
        : { ...emptyInput },
    )
    setError('')
    setDialogOpen(true)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || !isAdmin || !hydrated) return
    submitting.current = true
    setBusy(true)
    setError('')
    const result = editingUser
      ? updateUser(editingUser.id, form)
      : addUser(form)
    setBusy(false)
    if (!result.success) {
      setError(result.error ?? '保存失败，请重试。')
      submitting.current = false
      return
    }
    setDialogOpen(false)
    if (!editingUser)
      changeSearch({ q: '', role: 'all', status: 'all', sort: 'joined-desc' })
  }

  function changeStatus(member: DemoUser) {
    if (!isAdmin || !hydrated) return
    const result = updateUserStatus(
      member.id,
      member.status === 'disabled' ? 'active' : 'disabled',
    )
    if (!result.success) toast(result.error ?? '状态更新失败。', 'error')
    setConfirmUser(null)
  }

  function exportCsv() {
    if (!hydrated || !filtered.length) return
    const url = URL.createObjectURL(
      new Blob([toUsersCsv(filtered)], { type: 'text/csv;charset=utf-8;' }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'dashboard-users.csv'
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast(`已导出符合当前筛选条件的 ${filtered.length} 位成员。`, 'success')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="island-kicker mb-2">Workspace / Users</p>
          <h1 className="page-heading">用户管理</h1>
          <p className="muted mt-2 text-sm">
            查看团队成员、分配角色，管理成员的访问状态。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="button button-secondary"
            onClick={exportCsv}
            disabled={!hydrated || !filtered.length}
          >
            <Download size={16} aria-hidden="true" />
            导出 CSV
          </button>
          {isAdmin ? (
            <button
              type="button"
              className="button button-primary"
              onClick={() => openEditor()}
              disabled={!hydrated}
            >
              <Plus size={16} aria-hidden="true" />
              添加成员
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <CountCard label="全部成员" value={users.length} icon="all" />
        <CountCard
          label="正常成员"
          value={users.filter((member) => member.status === 'active').length}
          icon="active"
        />
        <CountCard
          label="管理员"
          value={users.filter((member) => member.role === 'admin').length}
          icon="admin"
        />
      </div>

      {!isAdmin ? (
        <div className="panel flex items-start gap-3 p-4 text-sm">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0 text-[var(--lagoon-deep)]"
            aria-hidden="true"
          />
          <p className="m-0">
            当前账户拥有查看权限，可以搜索和导出成员列表。编辑成员需要管理员权限。
          </p>
        </div>
      ) : null}

      <section className="panel overflow-hidden" aria-label="成员列表">
        <div className="flex flex-wrap items-end gap-3 border-b border-[var(--line)] p-4 sm:p-5">
          <label className="min-w-48 flex-1">
            <span className="field-label">搜索成员</span>
            <span className="relative block">
              <Search
                size={17}
                className="muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                aria-hidden="true"
              />
              <input
                type="search"
                className="input !pl-10"
                value={search.q}
                maxLength={120}
                placeholder="搜索姓名或邮箱"
                onChange={(event) =>
                  changeSearch({ q: event.currentTarget.value })
                }
              />
            </span>
          </label>
          <div className="w-32">
            <label className="field-label" htmlFor="users-status">
              成员状态
            </label>
            <Select<UsersSearch['status']>
              id="users-status"
              variant="field"
              label="成员状态"
              value={search.status}
              onChange={(value) => changeSearch({ status: value })}
              options={[
                { value: 'all', label: '全部状态' },
                { value: 'active', label: '正常' },
                { value: 'invited', label: '待邀请' },
                { value: 'disabled', label: '已停用' },
              ]}
            />
          </div>
          <div className="w-32">
            <label className="field-label" htmlFor="users-role">
              成员角色
            </label>
            <Select<UsersSearch['role']>
              id="users-role"
              variant="field"
              label="成员角色"
              value={search.role}
              onChange={(value) => changeSearch({ role: value })}
              options={[
                { value: 'all', label: '全部角色' },
                { value: 'admin', label: '管理员' },
                { value: 'viewer', label: '只读成员' },
              ]}
            />
          </div>
          <div className="w-40">
            <label className="field-label" htmlFor="users-sort">
              排序方式
            </label>
            <Select<UsersSearch['sort']>
              id="users-sort"
              variant="field"
              label="排序方式"
              value={search.sort}
              onChange={(value) => changeSearch({ sort: value })}
              options={[
                { value: 'joined-desc', label: '最新加入' },
                { value: 'joined-asc', label: '最早加入' },
                { value: 'name-asc', label: '按姓名排序' },
              ]}
            />
          </div>
          {hasFilters ? (
            <button
              type="button"
              className="button button-secondary"
              onClick={() =>
                changeSearch({ q: '', role: 'all', status: 'all' })
              }
            >
              清除筛选
            </button>
          ) : null}
        </div>

        {!hydrated ? (
          <div className="muted p-5 text-sm" role="status">
            正在恢复本地演示数据…
          </div>
        ) : null}

        <div className="overflow-x-auto" aria-busy={!hydrated}>
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <caption className="sr-only">
              团队成员：姓名、邮箱、角色、状态及加入日期。当前共有{' '}
              {filtered.length} 个结果。
            </caption>
            <thead className="muted bg-[var(--chip-bg)] text-xs">
              <tr>
                <th
                  scope="col"
                  className="px-5 py-3 font-semibold"
                  aria-sort={search.sort === 'name-asc' ? 'ascending' : 'none'}
                >
                  成员
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  角色
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  状态
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 font-semibold"
                  aria-sort={
                    search.sort === 'joined-desc'
                      ? 'descending'
                      : search.sort === 'joined-asc'
                        ? 'ascending'
                        : 'none'
                  }
                >
                  加入日期
                </th>
                {isAdmin ? (
                  <th
                    scope="col"
                    className="px-5 py-3 text-right font-semibold"
                  >
                    操作
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {pageUsers.map((member) => (
                <tr
                  key={member.id}
                  className="border-t border-[var(--line)] transition-colors hover:bg-[var(--chip-bg)]"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--chip-bg)] font-bold text-[var(--lagoon-deep)]"
                        aria-hidden="true"
                      >
                        {member.name.slice(0, 1)}
                      </span>
                      <div>
                        <p className="m-0 font-semibold">{member.name}</p>
                        <p className="muted m-0 mt-1 text-xs">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5">
                      {member.role === 'admin' ? (
                        <ShieldCheck size={14} aria-hidden="true" />
                      ) : null}
                      {roleLabels[member.role]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="status-badge" data-status={member.status}>
                      {statusLabels[member.status]}
                    </span>
                  </td>
                  <td className="muted px-5 py-4 tabular-nums">
                    {member.joinedAt}
                  </td>
                  {isAdmin ? (
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="button button-secondary !p-2"
                          onClick={() => openEditor(member)}
                          disabled={!hydrated}
                          aria-label={`编辑 ${member.name}`}
                          title="编辑成员"
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="button button-secondary !p-2"
                          onClick={() =>
                            member.status === 'disabled'
                              ? changeStatus(member)
                              : setConfirmUser(member)
                          }
                          disabled={!hydrated}
                          aria-label={`${member.status === 'disabled' ? '启用' : '停用'} ${member.name}`}
                          title={
                            member.status === 'disabled'
                              ? '启用成员'
                              : '停用成员'
                          }
                        >
                          {member.status === 'disabled' ? (
                            <UserCheck size={16} aria-hidden="true" />
                          ) : (
                            <UserX size={16} aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
              {!pageUsers.length ? (
                <tr>
                  <td
                    colSpan={isAdmin ? 5 : 4}
                    className="px-5 py-14 text-center"
                  >
                    <Users
                      size={28}
                      className="muted mx-auto mb-3"
                      aria-hidden="true"
                    />
                    <p className="m-0 font-semibold">没有找到成员</p>
                    <p className="muted mb-0 mt-2 text-sm">
                      尝试调整搜索词或筛选条件。
                    </p>
                    {hasFilters ? (
                      <button
                        type="button"
                        className="button button-secondary mt-4"
                        onClick={() =>
                          changeSearch({ q: '', role: 'all', status: 'all' })
                        }
                      >
                        清除筛选
                      </button>
                    ) : null}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-4">
          <p className="muted m-0 text-xs" aria-live="polite">
            {filtered.length
              ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} 条，共 ${filtered.length} 位成员`
              : '共 0 位成员'}
          </p>
          <div className="flex items-center gap-3" aria-label="成员分页">
            <button
              type="button"
              className="button button-secondary !p-2"
              disabled={page <= 1}
              onClick={() =>
                void navigate({
                  search: (previous) => ({ ...previous, page: page - 1 }),
                })
              }
              aria-label="上一页"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className="muted text-xs tabular-nums">
              第 {page} / {pageCount} 页
            </span>
            <button
              type="button"
              className="button button-secondary !p-2"
              disabled={page >= pageCount}
              onClick={() =>
                void navigate({
                  search: (previous) => ({ ...previous, page: page + 1 }),
                })
              }
              aria-label="下一页"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </section>
      <p className="muted text-xs leading-6">
        成员变更仅保存到当前浏览器的演示数据中，不会发送邀请邮件；成员角色展示与登录演示账户分别管理。
      </p>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editingUser ? '编辑成员' : '添加成员'}
        description="维护演示成员资料，邮箱地址须保持唯一。"
      >
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="field-label">姓名</span>
            <input
              className="input"
              name="name"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.currentTarget.value })
              }
              autoComplete="name"
              required
              maxLength={80}
              aria-describedby={error ? 'member-form-error' : undefined}
              data-dialog-autofocus
            />
          </label>
          <label className="block">
            <span className="field-label">邮箱</span>
            <input
              className="input"
              type="email"
              name="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.currentTarget.value })
              }
              autoComplete="email"
              required
              maxLength={254}
              aria-describedby={error ? 'member-form-error' : undefined}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="block">
              <label className="field-label" htmlFor="member-role">
                角色
              </label>
              <Select<DemoUserInput['role']>
                id="member-role"
                name="role"
                disabled={busy}
                variant="field"
                label="角色"
                value={form.role}
                onChange={(value) => setForm({ ...form, role: value })}
                options={[
                  { value: 'viewer', label: '只读成员' },
                  { value: 'admin', label: '管理员' },
                ]}
              />
            </div>
            <div className="block">
              <label className="field-label" htmlFor="member-status">
                状态
              </label>
              <Select<DemoUserInput['status']>
                id="member-status"
                name="status"
                disabled={busy}
                variant="field"
                label="状态"
                value={form.status}
                onChange={(value) => setForm({ ...form, status: value })}
                options={[
                  { value: 'invited', label: '待邀请' },
                  { value: 'active', label: '正常' },
                  { value: 'disabled', label: '已停用' },
                ]}
              />
            </div>
          </div>
          {error ? (
            <p
              id="member-form-error"
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setDialogOpen(false)}
            >
              取消
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={busy || !hydrated}
            >
              {busy ? '正在保存…' : editingUser ? '保存修改' : '添加成员'}
            </button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={confirmUser !== null}
        onClose={() => setConfirmUser(null)}
        title="停用成员"
        description={
          confirmUser
            ? `确定要停用 ${confirmUser.name} 吗？你可以稍后重新启用。`
            : undefined
        }
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setConfirmUser(null)}
          >
            取消
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={() => {
              if (confirmUser) changeStatus(confirmUser)
            }}
            disabled={!hydrated}
          >
            确认停用
          </button>
        </div>
      </Dialog>
    </div>
  )
}

function CountCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: 'all' | 'active' | 'admin'
}) {
  const Icon =
    icon === 'all' ? Users : icon === 'active' ? UserCheck : ShieldCheck
  return (
    <div className="panel flex items-center gap-3 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--lagoon-deep)]">
        <Icon size={19} aria-hidden="true" />
      </span>
      <div>
        <p className="muted m-0 text-xs">{label}</p>
        <p className="m-0 mt-1 text-2xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  )
}
