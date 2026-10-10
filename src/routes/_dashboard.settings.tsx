import { getAppConfig } from '../config/env'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Bell,
  Building2,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useDashboard } from '../components/DashboardProvider'
import ThemeToggle from '../components/ThemeToggle'

export const Route = createFileRoute('/_dashboard/settings')({
  head: () => ({ meta: [{ title: `工作区设置 · ${getAppConfig().name}` }] }),
  component: SettingsPage,
})

function SettingsPage() {
  const { user } = Route.useRouteContext()
  const { settings, updateSettings, hydrated } = useDashboard()
  const [draft, setDraft] = useState(settings)
  const [error, setError] = useState('')
  const canEdit = user.role === 'admin'

  useEffect(() => {
    if (hydrated) setDraft(settings)
  }, [settings, hydrated])

  const hasChanges =
    draft.workspaceName !== settings.workspaceName ||
    draft.contactEmail !== settings.contactEmail ||
    draft.emailNotifications !== settings.emailNotifications ||
    draft.weeklyDigest !== settings.weeklyDigest

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hydrated || !canEdit) return
    setError('')
    const result = updateSettings(draft)
    if (result.error) setError(result.error)
  }

  return (
    <div className="space-y-7">
      <div>
        <div>
          <p className="muted mb-2 text-xs font-semibold tracking-widest">
            WORKSPACE
          </p>
          <h1 className="page-heading">工作区设置</h1>
          <p className="muted mt-2 text-sm font-normal">
            管理工作区信息、通知偏好与外观。
          </p>
        </div>
      </div>

      {!canEdit && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-4 text-sm">
          <ShieldCheck
            className="mt-0.5 shrink-0 text-[var(--lagoon-deep)]"
            size={18}
            aria-hidden="true"
          />
          <p className="m-0 leading-6">
            当前使用只读访客账号。工作区设置由管理员维护，你可以查看设置并切换当前设备的外观。
          </p>
        </div>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <form
          method="post"
          onSubmit={handleSubmit}
          className="space-y-6"
          aria-busy={!hydrated}
        >
          <fieldset
            disabled={!hydrated || !canEdit}
            className="m-0 min-w-0 space-y-6 border-0 p-0"
          >
            <section
              className="panel p-5 sm:p-6"
              aria-labelledby="workspace-title"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--lagoon-deep)]">
                  <Building2 size={19} aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="workspace-title"
                    className="m-0 text-base font-semibold"
                  >
                    工作区信息
                  </h2>
                  <p className="muted mt-1 mb-0 text-sm">
                    为工作台设置名称和联系邮箱。
                  </p>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="field-label" htmlFor="workspace-name">
                    工作区名称
                  </label>
                  <input
                    id="workspace-name"
                    name="workspaceName"
                    className="input mt-2 w-full"
                    placeholder="例如：Acme 工作区"
                    autoComplete="organization"
                    required
                    maxLength={60}
                    value={draft.workspaceName}
                    onChange={(event) =>
                      setDraft({ ...draft, workspaceName: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="contact-email">
                    联系邮箱
                  </label>
                  <input
                    id="contact-email"
                    name="contactEmail"
                    type="email"
                    className="input mt-2 w-full"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={draft.contactEmail}
                    onChange={(event) =>
                      setDraft({ ...draft, contactEmail: event.target.value })
                    }
                    aria-describedby="contact-email-hint"
                  />
                  <p
                    id="contact-email-hint"
                    className="muted mt-2 mb-0 text-xs"
                  >
                    这是演示工作区的联系人字段，修改后不会影响登录账号。
                  </p>
                </div>
              </div>
            </section>

            <section
              className="panel p-5 sm:p-6"
              aria-labelledby="notification-title"
            >
              <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--lagoon-deep)]">
                  <Bell size={19} aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="notification-title"
                    className="m-0 text-base font-semibold"
                  >
                    通知偏好
                  </h2>
                  <p className="muted mt-1 mb-0 text-sm">
                    保存演示偏好，当前不会实际发送邮件。
                  </p>
                </div>
              </div>
              <div className="divide-y divide-[var(--line)]">
                <label className="flex cursor-pointer items-center justify-between gap-5 py-4 pt-0">
                  <span>
                    <span className="block text-sm font-medium">邮件通知</span>
                    <span className="muted mt-1 block text-sm">
                      接收用户管理和工作区动态。
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    name="emailNotifications"
                    className="h-5 w-5 shrink-0 accent-[var(--lagoon-deep)]"
                    checked={draft.emailNotifications}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        emailNotifications: event.target.checked,
                      })
                    }
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-5 py-4 pb-0">
                  <span>
                    <span className="block text-sm font-medium">每周摘要</span>
                    <span className="muted mt-1 block text-sm">
                      汇总一周内的关键指标和活动。
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    name="weeklyDigest"
                    className="h-5 w-5 shrink-0 accent-[var(--lagoon-deep)]"
                    checked={draft.weeklyDigest}
                    onChange={(event) =>
                      setDraft({ ...draft, weeklyDigest: event.target.checked })
                    }
                  />
                </label>
              </div>
            </section>
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300"
              >
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="muted m-0 text-xs">
                {!hydrated
                  ? '正在读取已保存设置…'
                  : hasChanges
                    ? '有尚未保存的修改'
                    : '设置仅保存在当前浏览器'}
              </p>
              <div className="flex gap-3">
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={!hasChanges}
                  onClick={() => {
                    setDraft(settings)
                    setError('')
                  }}
                >
                  取消修改
                </button>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={!hasChanges}
                >
                  <Save size={16} aria-hidden="true" />
                  保存设置
                </button>
              </div>
            </div>
          </fieldset>
        </form>

        <aside className="space-y-6">
          <section className="panel p-5 sm:p-6" aria-labelledby="profile-title">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--lagoon-deep)]">
                <UserRound size={19} aria-hidden="true" />
              </span>
              <h2 id="profile-title" className="m-0 text-base font-semibold">
                当前账号
              </h2>
            </div>
            <p className="m-0 text-lg font-semibold">{user.name}</p>
            <p className="muted mt-2 flex items-center gap-2 text-sm">
              <Mail size={14} aria-hidden="true" />
              {user.email}
            </p>
            <span className="mt-2 inline-flex rounded-full border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-1 text-xs font-medium">
              {canEdit ? '管理员 · 可编辑' : '只读访客 · 仅查看'}
            </span>
            <p className="muted mt-5 mb-0 text-xs leading-6">
              这是预设演示身份。用户列表中的新增与修改不会创建登录账号。
            </p>
          </section>
          <section
            className="panel p-5 sm:p-6"
            aria-labelledby="appearance-title"
          >
            <h2 id="appearance-title" className="m-0 text-base font-semibold">
              界面外观
            </h2>
            <p className="muted mt-2 mb-5 text-sm leading-6">
              点击下方图标选择浅色、深色或跟随系统。顶部主题按钮也可随时切换，偏好保存在当前设备。
            </p>
            <ThemeToggle align="start" />
          </section>
        </aside>
      </div>
    </div>
  )
}
