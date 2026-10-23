import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useToast } from './ToastProvider'
import { getAppConfig } from '../config/env'
import { parseDashboardBackup } from '../data/dashboard-backup'
import {
  DEMO_STORAGE_KEY,
  MAX_DEMO_USERS,
  createDefaultSnapshot,
  parseDashboardSnapshot,
  serializeDashboardSnapshot,
  validateSettings,
  validateUserInput,
} from '../data/dashboard'
import type {
  DashboardSnapshot,
  DemoRole,
  DemoUser,
  DemoUserInput,
  DemoUserStatus,
  WorkspaceSettings,
} from '../data/dashboard'

export type {
  DemoUser,
  DemoUserInput,
  WorkspaceSettings,
  DashboardSettings,
} from '../data/dashboard'

export type MutationResult = {
  success: boolean
  error?: string
  persisted?: boolean
}

type DashboardContextValue = {
  users: Array<DemoUser>
  settings: WorkspaceSettings
  hydrated: boolean
  hasUnsavedSettings: boolean
  setHasUnsavedSettings: (value: boolean) => void
  addUser: (input: DemoUserInput) => MutationResult
  updateUser: (id: string, input: DemoUserInput) => MutationResult
  updateUserStatus: (id: string, status: DemoUserStatus) => MutationResult
  updateSettings: (input: Partial<WorkspaceSettings>) => MutationResult
  restoreDemo: (raw: string) => MutationResult
  resetDemo: () => MutationResult
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({
  children,
  role = 'viewer',
}: {
  children: ReactNode
  role?: DemoRole
}) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(
    createDefaultSnapshot,
  )
  const [hydrated, setHydrated] = useState(false)
  const [hasUnsavedSettings, setHasUnsavedSettings] = useState(false)
  const current = useRef(snapshot)
  const didRead = useRef(false)
  const ready = useRef(false)
  const { toast } = useToast()
  const storageKey = `${DEMO_STORAGE_KEY}:${getAppConfig().environment}`

  useEffect(() => {
    if (didRead.current) return
    didRead.current = true
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw !== null) {
        const restored = parseDashboardSnapshot(raw)
        if (restored) {
          current.current = restored
          setSnapshot(restored)
        } else {
          toast('本地演示数据格式或版本无效，已加载默认数据。', 'info')
        }
      }
    } catch {
      toast('无法读取浏览器存储，已加载默认演示数据。', 'error')
    }
    ready.current = true
    setHydrated(true)
  }, [toast, storageKey])

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== storageKey && event.key !== null) return
      try {
        if (event.storageArea !== window.localStorage) return
      } catch {
        return
      }
      const restored =
        event.newValue === null
          ? createDefaultSnapshot()
          : parseDashboardSnapshot(event.newValue)
      if (!restored) {
        toast('其他标签页的演示数据无效，已保留当前数据。', 'error')
        return
      }
      current.current = restored
      setSnapshot(restored)
      toast('演示成员和工作空间设置已与其他标签页同步。', 'info')
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [toast, storageKey])

  function commit(next: DashboardSnapshot, message: string): MutationResult {
    current.current = next
    setSnapshot(next)
    try {
      window.localStorage.setItem(storageKey, serializeDashboardSnapshot(next))
      toast(message, 'success')
      return { success: true, persisted: true }
    } catch {
      toast(
        '更改已在当前页面生效，但浏览器存储不可用，刷新后可能丢失。',
        'error',
      )
      return { success: true, persisted: false }
    }
  }

  function checkReady(): MutationResult | null {
    if (role !== 'admin') {
      const error = '当前账户只有查看权限，成员和设置修改需要管理员权限。'
      toast(error, 'error')
      return { success: false, error }
    }
    return ready.current
      ? null
      : { success: false, error: '演示数据正在恢复，请稍后重试。' }
  }

  function addUser(input: DemoUserInput): MutationResult {
    const waiting = checkReady()
    if (waiting) return waiting
    const checked = validateUserInput(input, current.current.users)
    if (!checked.success) return checked
    if (current.current.users.length >= MAX_DEMO_USERS) {
      return {
        success: false,
        error: `演示数据最多支持 ${MAX_DEMO_USERS} 位成员。`,
      }
    }
    const user: DemoUser = {
      id: `usr_${Array.from(window.crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')}`,
      ...checked.data,
      joinedAt: new Date().toISOString().slice(0, 10),
    }
    return commit(
      { ...current.current, users: [user, ...current.current.users] },
      `已添加成员 ${user.name}。`,
    )
  }

  function updateUser(id: string, input: DemoUserInput): MutationResult {
    const waiting = checkReady()
    if (waiting) return waiting
    if (!current.current.users.some((user) => user.id === id)) {
      return { success: false, error: '成员不存在，请刷新列表后重试。' }
    }
    const checked = validateUserInput(input, current.current.users, id)
    if (!checked.success) return checked
    const users = current.current.users.map((user) =>
      user.id === id ? { ...user, ...checked.data } : user,
    )
    return commit(
      { ...current.current, users },
      `已更新成员 ${checked.data.name}。`,
    )
  }

  function updateUserStatus(
    id: string,
    status: DemoUserStatus,
  ): MutationResult {
    const waiting = checkReady()
    if (waiting) return waiting
    const member = current.current.users.find((user) => user.id === id)
    if (!member) {
      return { success: false, error: '成员不存在，请刷新列表后重试。' }
    }
    const checked = validateUserInput(
      { ...member, status },
      current.current.users,
      id,
    )
    if (!checked.success) return checked
    const users = current.current.users.map((user) =>
      user.id === id ? { ...user, status: checked.data.status } : user,
    )
    return commit(
      { ...current.current, users },
      `已更新成员 ${member.name} 的状态。`,
    )
  }

  function updateSettings(input: Partial<WorkspaceSettings>): MutationResult {
    const waiting = checkReady()
    if (waiting) return waiting
    const checked = validateSettings({ ...current.current.settings, ...input })
    if (!checked.success) return checked
    return commit(
      { ...current.current, settings: checked.data },
      '工作空间设置已保存。',
    )
  }

  function restoreDemo(raw: string): MutationResult {
    const denied = checkReady()
    if (denied) return denied
    const checked = parseDashboardBackup(raw)
    if (!checked.success) return checked
    return commit(checked.data, '已从备份恢复成员和工作区设置。')
  }

  function resetDemo(): MutationResult {
    const denied = checkReady()
    if (denied) {
      if (role === 'admin') toast(denied.error ?? '请稍后重试。', 'info')
      return denied
    }
    return commit(createDefaultSnapshot(), '演示成员和工作空间设置已恢复默认。')
  }

  return (
    <DashboardContext.Provider
      value={{
        users: snapshot.users,
        settings: snapshot.settings,
        hydrated,
        hasUnsavedSettings,
        setHasUnsavedSettings,
        addUser,
        updateUser,
        updateUserStatus,
        updateSettings,
        restoreDemo,
        resetDemo,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard(): DashboardContextValue {
  const context = useContext(DashboardContext)
  if (!context)
    throw new Error('useDashboard 必须在 DashboardProvider 内使用。')
  return context
}
