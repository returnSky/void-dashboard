import { useEffect, useRef, useState } from 'react'
import { DatabaseBackup, Download, RotateCcw, Upload } from 'lucide-react'
import { useDashboard } from './DashboardProvider'
import { useToast } from './ToastProvider'
import Dialog from './Dialog'
import { serializeDashboardSnapshot } from '../data/dashboard'
import {
  MAX_BACKUP_BYTES,
  parseDashboardBackup,
} from '../data/dashboard-backup'
import { getAppConfig } from '../config/env'
import type { DashboardSnapshot } from '../data/dashboard'

type PendingBackup = {
  name: string
  raw: string
  snapshot: DashboardSnapshot
}

export default function DemoDataTools({
  canEdit,
  hasUnsavedChanges = false,
}: {
  canEdit: boolean
  hasUnsavedChanges?: boolean
}) {
  const { users, settings, hydrated, restoreDemo, resetDemo } = useDashboard()
  const { toast } = useToast()
  const [reading, setReading] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState<PendingBackup | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const readVersion = useRef(0)
  const canReplace = canEdit && hydrated && !hasUnsavedChanges && !reading

  useEffect(
    () => () => {
      readVersion.current += 1
    },
    [],
  )

  function downloadBackup() {
    if (!hydrated) return
    const url = URL.createObjectURL(
      new Blob([serializeDashboardSnapshot({ users, settings })], {
        type: 'application/json;charset=utf-8',
      }),
    )
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `void-backup-${getAppConfig().environment.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast('已导出当前保存的成员和工作区设置。', 'success')
  }

  async function readBackup(file: File | undefined) {
    if (!file || !canReplace) return
    const version = ++readVersion.current
    setError('')
    setPending(null)
    if (file.size > MAX_BACKUP_BYTES) {
      setError('备份文件不能超过 1 MB。')
      return
    }
    setReading(true)
    try {
      const raw = await file.text()
      if (version !== readVersion.current) return
      const checked = parseDashboardBackup(raw)
      if (!checked.success) {
        setError(checked.error)
        return
      }
      setPending({
        name: file.name,
        raw,
        snapshot: checked.data,
      })
    } catch {
      if (version === readVersion.current)
        setError('无法读取备份文件，请重新选择。')
    } finally {
      if (version === readVersion.current) setReading(false)
    }
  }

  function restore() {
    if (!pending || !canReplace) return
    const result = restoreDemo(pending.raw)
    if (!result.success) {
      setError(result.error ?? '恢复失败，请重新选择备份。')
      return
    }
    setPending(null)
    setError('')
  }

  function reset() {
    if (!canReplace) return
    const result = resetDemo()
    if (!result.success) {
      setError(result.error ?? '重置失败，请重试。')
      return
    }
    setConfirmReset(false)
    setError('')
  }

  return (
    <section className="panel p-5 sm:p-6" aria-labelledby="demo-data-title">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--chip-bg)] text-[var(--lagoon-deep)]">
          <DatabaseBackup size={19} aria-hidden="true" />
        </span>
        <h2 id="demo-data-title" className="m-0 text-base font-semibold">
          数据备份与恢复
        </h2>
      </div>
      <p className="muted text-sm leading-6">
        成员和工作区设置保存在此浏览器中。导出 JSON
        备份，可在其他浏览器中恢复。备份包含成员姓名和邮箱，请妥善保管。
      </p>
      <p className="muted text-xs leading-6">
        备份包含已保存的数据。登录账号、会话和设备主题不在备份内。
      </p>
      <button
        className="button button-secondary mt-2 w-full justify-center"
        type="button"
        disabled={!hydrated}
        onClick={downloadBackup}
      >
        <Download size={16} aria-hidden="true" />
        导出 JSON 备份
      </button>
      {canEdit && (
        <div className="mt-4 space-y-3 border-t border-[var(--line)] pt-4">
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            tabIndex={-1}
            aria-label="选择 JSON 备份文件"
            disabled={!canReplace}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0]
              event.currentTarget.value = ''
              void readBackup(file)
            }}
          />
          <button
            className="button button-secondary w-full justify-center"
            type="button"
            disabled={!canReplace}
            aria-busy={reading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={16} aria-hidden="true" />
            {reading ? '正在校验备份…' : '从备份恢复'}
          </button>
          <button
            className="button button-secondary w-full justify-center text-[var(--danger)]"
            type="button"
            disabled={!canReplace}
            onClick={() => {
              setError('')
              setConfirmReset(true)
            }}
          >
            <RotateCcw size={16} aria-hidden="true" />
            恢复默认演示数据
          </button>
          <p className="muted m-0 text-xs leading-6">
            {hasUnsavedChanges
              ? '请先保存或取消设置修改，再恢复或重置数据。'
              : '恢复与重置会替换当前全部成员和工作区设置，确认前可取消。'}
          </p>
        </div>
      )}
      {error && (
        <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
      <Dialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title="确认从备份恢复"
        description="恢复将替换当前浏览器中的全部成员和已保存设置，建议先导出当前数据。"
      >
        {pending && (
          <div className="space-y-4">
            <p className="muted break-all text-sm">文件：{pending.name}</p>
            <dl className="space-y-3 rounded-xl bg-[var(--chip-bg)] p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt>成员数量</dt>
                <dd className="m-0">
                  {users.length} → {pending.snapshot.users.length}
                </dd>
              </div>
              <div>
                <dt className="muted">恢复后的工作区</dt>
                <dd className="m-0 mt-1 break-words font-semibold">
                  {pending.snapshot.settings.workspaceName}
                </dd>
              </div>
            </dl>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="button button-secondary"
                data-dialog-autofocus
                onClick={() => setPending(null)}
              >
                取消
              </button>
              <button
                type="button"
                className="button button-primary"
                disabled={!canReplace}
                onClick={restore}
              >
                确认恢复
              </button>
            </div>
          </div>
        )}
      </Dialog>
      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="恢复默认演示数据？"
        description="你添加或修改的成员和工作区设置将被默认示例替换。建议先导出备份，登录账号和主题不受影响。"
      >
        <div className="flex justify-end gap-3">
          <button
            type="button"
            className="button button-secondary"
            data-dialog-autofocus
            onClick={() => setConfirmReset(false)}
          >
            取消
          </button>
          <button
            type="button"
            className="button button-primary"
            disabled={!canReplace}
            onClick={reset}
          >
            确认重置
          </button>
        </div>
      </Dialog>
    </section>
  )
}
