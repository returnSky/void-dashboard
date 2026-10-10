import { describe, expect, it } from 'vitest'
import {
  DEMO_STORAGE_VERSION,
  createDefaultSnapshot,
  filterAndSortUsers,
  parseDashboardSnapshot,
  parseUsersSearch,
  seedUsers,
  serializeDashboardSnapshot,
  toUsersCsv,
  validateSettings,
  validateUserInput,
} from './dashboard'
import type { DemoUserInput } from './dashboard'

const input: DemoUserInput = {
  name: '新成员',
  email: 'new@example.com',
  role: 'viewer',
  status: 'invited',
}

function storedValue() {
  return { version: DEMO_STORAGE_VERSION, ...createDefaultSnapshot() }
}

describe('成员资料验证', () => {
  it('规范化姓名和邮箱，并拒绝大小写不同的重复邮箱', () => {
    expect(
      validateUserInput(
        { ...input, name: ' 新成员 ', email: ' NEW@EXAMPLE.COM ' },
        seedUsers,
      ),
    ).toEqual({ success: true, data: input })
    const result = validateUserInput(
      { ...input, email: seedUsers[0].email.toUpperCase() },
      seedUsers,
    )
    expect(result).toEqual({
      success: false,
      error: '该邮箱已存在，请使用其他邮箱。',
    })
  })

  it('允许编辑成员保留原邮箱，但不能使用其他成员邮箱', () => {
    const first = seedUsers[0]
    expect(validateUserInput(first, seedUsers, first.id).success).toBe(true)
    expect(
      validateUserInput(
        { ...first, email: seedUsers[1].email },
        seedUsers,
        first.id,
      ).success,
    ).toBe(false)
  })

  it.each([
    { ...input, name: '   ' },
    { ...input, name: 'a'.repeat(81) },
    { ...input, email: 'invalid' },
    { ...input, email: 'hello world@example.com' },
  ])('拒绝不完整或格式错误的资料 %j', (candidate) => {
    expect(validateUserInput(candidate, seedUsers).success).toBe(false)
  })
})

describe('带版本的演示数据存储', () => {
  it('保存后完整恢复合法快照，且默认数据副本之间独立', () => {
    const snapshot = createDefaultSnapshot()
    expect(
      parseDashboardSnapshot(serializeDashboardSnapshot(snapshot)),
    ).toEqual(snapshot)
    snapshot.users[0].name = 'changed'
    snapshot.settings.workspaceName = 'changed'
    expect(createDefaultSnapshot().users[0].name).not.toBe('changed')
    expect(createDefaultSnapshot().settings.workspaceName).not.toBe('changed')
  })

  it('丢弃额外字段，序列化不会保留密码或凭证', () => {
    const snapshot = createDefaultSnapshot()
    const contaminated = {
      ...snapshot,
      password: 'never-store',
      users: snapshot.users.map((user) => ({
        ...user,
        password: 'never-store',
      })),
      settings: { ...snapshot.settings, token: 'never-store' },
    }
    const raw = serializeDashboardSnapshot(contaminated)
    expect(raw).not.toContain('never-store')
    expect(
      parseDashboardSnapshot(
        JSON.stringify({ version: DEMO_STORAGE_VERSION, ...contaminated }),
      ),
    ).toEqual(snapshot)
  })

  it('拒绝损坏 JSON、未知版本和错误结构', () => {
    expect(parseDashboardSnapshot('{broken')).toBeNull()
    expect(parseDashboardSnapshot('null')).toBeNull()
    expect(
      parseDashboardSnapshot(
        JSON.stringify({ ...storedValue(), version: 999 }),
      ),
    ).toBeNull()
    expect(
      parseDashboardSnapshot(JSON.stringify({ ...storedValue(), users: {} })),
    ).toBeNull()
    expect(
      parseDashboardSnapshot(
        JSON.stringify({ ...storedValue(), settings: { workspaceName: 'a' } }),
      ),
    ).toBeNull()
  })

  it('拒绝重复 ID、邮箱、未知角色/状态和不存在的日期', () => {
    const value = storedValue()
    const first = value.users[0]
    const badUsers = [
      [first, { ...value.users[1], id: first.id }],
      [first, { ...value.users[1], email: first.email.toUpperCase() }],
      [{ ...first, role: 'owner' }],
      [{ ...first, status: 'unknown' }],
      [{ ...first, joinedAt: '2026-02-30' }],
    ]
    for (const users of badUsers) {
      expect(
        parseDashboardSnapshot(JSON.stringify({ ...value, users })),
      ).toBeNull()
    }
  })

  it('保留合法的空成员列表，而不是覆盖为 seed 数据', () => {
    const snapshot = { ...createDefaultSnapshot(), users: [] }
    expect(
      parseDashboardSnapshot(serializeDashboardSnapshot(snapshot)),
    ).toEqual(snapshot)
  })
})

describe('工作空间设置', () => {
  it('规范化有效输入，并拒绝非法邮箱、空名称和超长名称', () => {
    const settings = createDefaultSnapshot().settings
    expect(
      validateSettings({
        ...settings,
        workspaceName: '  示例  ',
        contactEmail: ' TEAM@EXAMPLE.COM ',
      }),
    ).toEqual({
      success: true,
      data: {
        ...settings,
        workspaceName: '示例',
        contactEmail: 'team@example.com',
      },
    })
    expect(validateSettings({ ...settings, workspaceName: ' ' }).success).toBe(
      false,
    )
    expect(
      validateSettings({ ...settings, workspaceName: 'x'.repeat(61) }).success,
    ).toBe(false)
    expect(
      validateSettings({ ...settings, contactEmail: 'invalid' }).success,
    ).toBe(false)
  })
})

describe('可刷新恢复的列表搜索参数', () => {
  it('非法或无限大页码回退，筛选与排序只接受白名单', () => {
    expect(
      parseUsersSearch({
        q: ['invalid'],
        page: Infinity,
        role: 'owner',
        status: 'broken',
        sort: 'random',
      }),
    ).toEqual({
      q: '',
      page: 1,
      role: 'all',
      status: 'all',
      sort: 'joined-desc',
    })
    expect(
      parseUsersSearch({
        page: '2',
        q: '林',
        status: 'active',
        role: 'admin',
        sort: 'name-asc',
      }),
    ).toEqual({
      page: 2,
      q: '林',
      status: 'active',
      role: 'admin',
      sort: 'name-asc',
    })
    expect(parseUsersSearch({ page: -2 }).page).toBe(1)
    expect(parseUsersSearch({ page: 1.5 }).page).toBe(1)
    expect(parseUsersSearch({ page: 1000001 }).page).toBe(1000000)
  })

  it('联合搜索、角色、状态筛选，排序不会改写原数据', () => {
    const original = seedUsers.map((user) => ({ ...user }))
    const filters = parseUsersSearch({
      q: ' LIN.XIAO ',
      role: 'admin',
      status: 'active',
    })
    expect(
      filterAndSortUsers(seedUsers, filters).map((user) => user.id),
    ).toEqual(['usr_001'])
    expect(
      filterAndSortUsers(
        seedUsers,
        parseUsersSearch({ role: 'admin', status: 'invited' }),
      ),
    ).toEqual([])
    const oldest = filterAndSortUsers(
      seedUsers,
      parseUsersSearch({ sort: 'joined-asc' }),
    )
    expect(oldest[0].id).toBe('usr_016')
    expect(seedUsers).toEqual(original)
  })

  it('相同日期按 ID 排序，结果稳定', () => {
    const a = { ...seedUsers[0], id: 'b', joinedAt: '2026-01-01' }
    const b = { ...seedUsers[1], id: 'a', joinedAt: '2026-01-01' }
    expect(
      filterAndSortUsers([a, b], parseUsersSearch({})).map((user) => user.id),
    ).toEqual(['a', 'b'])
  })
})

describe('成员 CSV 导出', () => {
  it('带 UTF-8 BOM，正确转义引号、逗号，并阻止公式注入', () => {
    const user = {
      ...seedUsers[0],
      name: '   =SUM(1+1)',
      email: 'comma,"quote"@example.com',
    }
    const csv = toUsersCsv([user])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"\'   =SUM(1+1)"')
    expect(csv).toContain('"comma,""quote""@example.com"')
    for (const marker of [
      '=cmd',
      '+cmd',
      '-cmd',
      '@cmd',
      '\t=cmd',
      '\r=cmd',
      '\n=cmd',
    ]) {
      expect(toUsersCsv([{ ...user, name: marker }])).toContain(`"'${marker}"`)
    }
  })

  it('只导出传入的已筛选成员，即使结果为空仍包含表头', () => {
    const csv = toUsersCsv([seedUsers[0]])
    expect(csv).toContain(seedUsers[0].email)
    expect(csv).not.toContain(seedUsers[1].email)
    expect(toUsersCsv([])).toBe('\uFEFF"姓名","邮箱","角色","状态","加入日期"')
  })
})
