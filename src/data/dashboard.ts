export type DemoRole = 'admin' | 'viewer'
export type DemoUserStatus = 'active' | 'invited' | 'disabled'

export type DemoUser = {
  id: string
  name: string
  email: string
  role: DemoRole
  status: DemoUserStatus
  joinedAt: string
}

export type DemoUserInput = Pick<DemoUser, 'name' | 'email' | 'role' | 'status'>

export type WorkspaceSettings = {
  workspaceName: string
  contactEmail: string
  emailNotifications: boolean
  weeklyDigest: boolean
}

export type DashboardSettings = WorkspaceSettings
export type DashboardSnapshot = {
  users: Array<DemoUser>
  settings: WorkspaceSettings
}

export const DEMO_STORAGE_KEY = 'tanstack-dashboard-demo:v1'
export const DEMO_STORAGE_VERSION = 1
export const PAGE_SIZE = 8
export const MAX_DEMO_USERS = 500

export const roleLabels: Record<DemoRole, string> = {
  admin: '管理员',
  viewer: '只读成员',
}

export const statusLabels: Record<DemoUserStatus, string> = {
  active: '正常',
  invited: '待邀请',
  disabled: '已停用',
}

export const defaultSettings: WorkspaceSettings = {
  workspaceName: 'Acme 工作空间',
  contactEmail: 'admin@example.com',
  emailNotifications: true,
  weeklyDigest: true,
}

export const seedUsers: Array<DemoUser> = [
  {
    id: 'usr_001',
    name: '林晓',
    email: 'lin.xiao@example.com',
    role: 'admin',
    status: 'active',
    joinedAt: '2026-09-28',
  },
  {
    id: 'usr_002',
    name: '陈晨',
    email: 'chen.chen@example.com',
    role: 'viewer',
    status: 'active',
    joinedAt: '2026-09-26',
  },
  {
    id: 'usr_003',
    name: '王悦',
    email: 'wang.yue@example.com',
    role: 'viewer',
    status: 'invited',
    joinedAt: '2026-09-25',
  },
  {
    id: 'usr_004',
    name: '周宇',
    email: 'zhou.yu@example.com',
    role: 'admin',
    status: 'active',
    joinedAt: '2026-09-23',
  },
  {
    id: 'usr_005',
    name: '刘宁',
    email: 'liu.ning@example.com',
    role: 'viewer',
    status: 'active',
    joinedAt: '2026-09-21',
  },
  {
    id: 'usr_006',
    name: '赵可',
    email: 'zhao.ke@example.com',
    role: 'viewer',
    status: 'disabled',
    joinedAt: '2026-09-18',
  },
  {
    id: 'usr_007',
    name: '许安',
    email: 'xu.an@example.com',
    role: 'viewer',
    status: 'active',
    joinedAt: '2026-09-15',
  },
  {
    id: 'usr_008',
    name: '沈佳',
    email: 'shen.jia@example.com',
    role: 'viewer',
    status: 'invited',
    joinedAt: '2026-09-12',
  },
  {
    id: 'usr_009',
    name: '张凡',
    email: 'zhang.fan@example.com',
    role: 'admin',
    status: 'active',
    joinedAt: '2026-09-09',
  },
  {
    id: 'usr_010',
    name: '李沐',
    email: 'li.mu@example.com',
    role: 'viewer',
    status: 'active',
    joinedAt: '2026-09-05',
  },
  {
    id: 'usr_011',
    name: '黄蕾',
    email: 'huang.lei@example.com',
    role: 'viewer',
    status: 'disabled',
    joinedAt: '2026-08-30',
  },
  {
    id: 'usr_012',
    name: '吴泽',
    email: 'wu.ze@example.com',
    role: 'viewer',
    status: 'active',
    joinedAt: '2026-08-24',
  },
  {
    id: 'usr_013',
    name: '郑妍',
    email: 'zheng.yan@example.com',
    role: 'viewer',
    status: 'invited',
    joinedAt: '2026-08-18',
  },
  {
    id: 'usr_014',
    name: '何川',
    email: 'he.chuan@example.com',
    role: 'viewer',
    status: 'active',
    joinedAt: '2026-08-10',
  },
  {
    id: 'usr_015',
    name: '孙禾',
    email: 'sun.he@example.com',
    role: 'viewer',
    status: 'active',
    joinedAt: '2026-08-02',
  },
  {
    id: 'usr_016',
    name: '徐青',
    email: 'xu.qing@example.com',
    role: 'viewer',
    status: 'disabled',
    joinedAt: '2026-07-26',
  },
]

export function createDefaultSnapshot(): DashboardSnapshot {
  return {
    users: seedUsers.map((user) => ({ ...user })),
    settings: { ...defaultSettings },
  }
}

export type ValidationResult<T> =
  { success: true; data: T } | { success: false; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isRole(value: unknown): value is DemoRole {
  return value === 'admin' || value === 'viewer'
}

function isStatus(value: unknown): value is DemoUserStatus {
  return value === 'active' || value === 'invited' || value === 'disabled'
}

function isEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function validateUserInput(
  input: DemoUserInput,
  users: ReadonlyArray<DemoUser>,
  excludeId?: string,
): ValidationResult<DemoUserInput> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()

  if (!name || name.length > 80) {
    return { success: false, error: '请输入 1–80 个字符的姓名。' }
  }
  if (!isEmail(email)) {
    return {
      success: false,
      error: '请输入有效的邮箱地址（最多 254 个字符）。',
    }
  }
  if (!isRole(input.role) || !isStatus(input.status)) {
    return { success: false, error: '请选择有效的角色和状态。' }
  }
  if (
    users.some(
      (user) => user.id !== excludeId && user.email.toLowerCase() === email,
    )
  ) {
    return { success: false, error: '该邮箱已存在，请使用其他邮箱。' }
  }

  return {
    success: true,
    data: { name, email, role: input.role, status: input.status },
  }
}

export function validateSettings(
  input: WorkspaceSettings,
): ValidationResult<WorkspaceSettings> {
  const workspaceName = input.workspaceName.trim()
  const contactEmail = input.contactEmail.trim().toLowerCase()
  if (!workspaceName || workspaceName.length > 60) {
    return { success: false, error: '工作空间名称需为 1–60 个字符。' }
  }
  if (!isEmail(contactEmail)) {
    return { success: false, error: '请输入有效的联系邮箱。' }
  }
  if (
    typeof input.emailNotifications !== 'boolean' ||
    typeof input.weeklyDigest !== 'boolean'
  ) {
    return { success: false, error: '通知设置无效，请重新选择。' }
  }
  return {
    success: true,
    data: {
      workspaceName,
      contactEmail,
      emailNotifications: input.emailNotifications,
      weeklyDigest: input.weeklyDigest,
    },
  }
}

function hasValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return (
    Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value
  )
}

export function parseDashboardSnapshot(raw: string): DashboardSnapshot | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (
    !isRecord(value) ||
    value.version !== DEMO_STORAGE_VERSION ||
    !Array.isArray(value.users) ||
    value.users.length > MAX_DEMO_USERS ||
    !isRecord(value.settings)
  ) {
    return null
  }

  const users: Array<DemoUser> = []
  const ids = new Set<string>()
  for (const candidate of value.users) {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,64}$/.test(candidate.id) ||
      ids.has(candidate.id) ||
      typeof candidate.name !== 'string' ||
      typeof candidate.email !== 'string' ||
      !isRole(candidate.role) ||
      !isStatus(candidate.status) ||
      !hasValidDate(candidate.joinedAt)
    ) {
      return null
    }
    const input = validateUserInput(
      {
        name: candidate.name,
        email: candidate.email,
        role: candidate.role,
        status: candidate.status,
      },
      users,
    )
    if (!input.success) return null
    ids.add(candidate.id)
    users.push({
      id: candidate.id,
      ...input.data,
      joinedAt: candidate.joinedAt,
    })
  }

  const settings = value.settings
  if (
    typeof settings.workspaceName !== 'string' ||
    typeof settings.contactEmail !== 'string' ||
    typeof settings.emailNotifications !== 'boolean' ||
    typeof settings.weeklyDigest !== 'boolean'
  ) {
    return null
  }
  const checkedSettings = validateSettings({
    workspaceName: settings.workspaceName,
    contactEmail: settings.contactEmail,
    emailNotifications: settings.emailNotifications,
    weeklyDigest: settings.weeklyDigest,
  })
  return checkedSettings.success
    ? { users, settings: checkedSettings.data }
    : null
}

export function serializeDashboardSnapshot(
  snapshot: DashboardSnapshot,
): string {
  return JSON.stringify({
    version: DEMO_STORAGE_VERSION,
    users: snapshot.users.map(
      ({ id, name, email, role, status, joinedAt }) => ({
        id,
        name,
        email,
        role,
        status,
        joinedAt,
      }),
    ),
    settings: {
      workspaceName: snapshot.settings.workspaceName,
      contactEmail: snapshot.settings.contactEmail,
      emailNotifications: snapshot.settings.emailNotifications,
      weeklyDigest: snapshot.settings.weeklyDigest,
    },
  })
}

export type UserSort = 'joined-desc' | 'joined-asc' | 'name-asc'
export type UsersSearch = {
  q: string
  status: DemoUserStatus | 'all'
  role: DemoRole | 'all'
  sort: UserSort
  page: number
}

export function parseUsersSearch(search: Record<string, unknown>): UsersSearch {
  const rawPage =
    typeof search.page === 'number' || typeof search.page === 'string'
      ? Number(search.page)
      : 1
  return {
    q: typeof search.q === 'string' ? search.q.slice(0, 120) : '',
    status: isStatus(search.status) ? search.status : 'all',
    role: isRole(search.role) ? search.role : 'all',
    sort:
      search.sort === 'joined-asc' || search.sort === 'name-asc'
        ? search.sort
        : 'joined-desc',
    page:
      Number.isSafeInteger(rawPage) && rawPage > 0
        ? Math.min(rawPage, 1000000)
        : 1,
  }
}

export function filterAndSortUsers(
  users: ReadonlyArray<DemoUser>,
  search: UsersSearch,
): Array<DemoUser> {
  const query = search.q.trim().toLowerCase()
  return users
    .filter(
      (user) =>
        (!query ||
          `${user.name} ${user.email}`.toLowerCase().includes(query)) &&
        (search.status === 'all' || user.status === search.status) &&
        (search.role === 'all' || user.role === search.role),
    )
    .sort((a, b) => {
      let order = 0
      if (search.sort === 'name-asc') {
        // Fixed locale avoids differing server/client default collation.
        order = a.name.localeCompare(b.name, 'zh-CN')
      } else {
        order =
          a.joinedAt.localeCompare(b.joinedAt, 'en') *
          (search.sort === 'joined-desc' ? -1 : 1)
      }
      return order || a.id.localeCompare(b.id, 'en')
    })
}

function csvCell(value: string): string {
  // Excel may ignore leading spaces/control characters before a formula marker.
  const firstSignificantCharacter = Array.from(value).find(
    (character) => character.charCodeAt(0) > 32,
  )
  const startsFormula =
    firstSignificantCharacter !== undefined &&
    ['=', '+', '-', '@'].includes(firstSignificantCharacter)
  const safe = startsFormula || /^[\t\r\n]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function toUsersCsv(users: ReadonlyArray<DemoUser>): string {
  const rows = [
    ['姓名', '邮箱', '角色', '状态', '加入日期'],
    ...users.map((user) => [
      user.name,
      user.email,
      roleLabels[user.role],
      statusLabels[user.status],
      user.joinedAt,
    ]),
  ]
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`
}
