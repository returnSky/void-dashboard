import { parseDashboardSnapshot } from './dashboard'
import type { DashboardSnapshot, ValidationResult } from './dashboard'

export const MAX_BACKUP_BYTES = 1024 * 1024

export function parseDashboardBackup(
  raw: string,
): ValidationResult<DashboardSnapshot> {
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES) {
    return { success: false, error: '备份文件不能超过 1 MB。' }
  }
  const snapshot = parseDashboardSnapshot(raw.replace(/^\uFEFF/, ''))
  return snapshot
    ? { success: true, data: snapshot }
    : {
        success: false,
        error: '备份格式或版本无效，请选择从此工作台导出的 JSON 备份。',
      }
}
