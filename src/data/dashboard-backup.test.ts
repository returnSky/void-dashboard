import { describe, expect, it } from 'vitest'
import { MAX_BACKUP_BYTES, parseDashboardBackup } from './dashboard-backup'
import { createDefaultSnapshot, serializeDashboardSnapshot } from './dashboard'

describe('工作区数据备份校验', () => {
  it('接受导出的完整备份以及带 UTF-8 BOM 的 JSON', () => {
    const snapshot = createDefaultSnapshot()
    const raw = serializeDashboardSnapshot(snapshot)
    expect(parseDashboardBackup(raw)).toEqual({ success: true, data: snapshot })
    expect(parseDashboardBackup(`\uFEFF${raw}`)).toEqual({
      success: true,
      data: snapshot,
    })
  })

  it('拒绝过大文件，并按 UTF-8 字节计算中文大小', () => {
    expect(parseDashboardBackup(' '.repeat(MAX_BACKUP_BYTES + 1))).toEqual({
      success: false,
      error: '备份文件不能超过 1 MB。',
    })
    expect(
      parseDashboardBackup('中'.repeat(Math.ceil(MAX_BACKUP_BYTES / 3))),
    ).toEqual({
      success: false,
      error: '备份文件不能超过 1 MB。',
    })
  })

  it.each([
    '{broken',
    'null',
    JSON.stringify({ version: 99, ...createDefaultSnapshot() }),
    JSON.stringify({ version: 1, ...createDefaultSnapshot(), settings: {} }),
    JSON.stringify({ version: 1, ...createDefaultSnapshot(), users: [null] }),
  ])('拒绝无效结构或不支持的版本：%s', (raw) => {
    expect(parseDashboardBackup(raw).success).toBe(false)
  })
})
