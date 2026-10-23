import { describe, expect, it } from 'vitest'
import { auditActionLabel, auditActionLabels, auditActionOptions } from '@/app/pages/stats/auditActions'

// Every action code the backend writes today: the semantic rows of the membership use cases, and one
// "<api module>.<endpoint function>" per admin write endpoint (AdminAuditMiddleware).
const BACKEND_ACTIONS = [
  'role_change',
  'blacklist',
  'unblacklist',
  'force_logout',
  'delete',
  'member_approve',
  'member_reject',
  'software.review_software_submission',
  'software.add_version',
  'software.delete_version',
  'software.update_software',
  'software.bulk_publish_software',
  'software.bulk_delete_software',
  'software.toggle_publish',
  'software.toggle_version_publish',
  'software.delete_software',
  'documents.review_document_submission',
  'documents.bulk_publish_documents',
  'documents.update_document',
  'documents.toggle_publish',
  'documents.delete_document',
  'tags.create_tag',
  'tags.update_tag',
  'tags.delete_tag',
  'portal.create_solution',
  'portal.update_solution',
  'portal.delete_solution',
]

describe('audit action labels', () => {
  it('labels every action the backend writes, and nothing else', () => {
    expect(Object.keys(auditActionLabels).sort()).toEqual([...BACKEND_ACTIONS].sort())
  })

  it('shows a known action by its label', () => {
    expect(auditActionLabel('role_change')).toBe('修改角色')
    expect(auditActionLabel('member_approve')).toBe('通过会员申请')
    expect(auditActionLabel('software.toggle_publish')).toBe('软件 · 切换发布状态')
  })

  it('keeps software and documents apart where the endpoint names collide', () => {
    expect(auditActionLabel('software.toggle_publish')).not.toBe(auditActionLabel('documents.toggle_publish'))
  })

  it('shows an unknown action as it is, so a new backend action never disappears', () => {
    expect(auditActionLabel('brand_mapping.future_action')).toBe('brand_mapping.future_action')
    expect(auditActionLabel('-')).toBe('-')
  })

  it('has a distinct, non-empty label for every action', () => {
    const labels = Object.values(auditActionLabels)
    expect(labels.every((label) => label.trim().length > 0)).toBe(true)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('offers "all" first and then one filter option per action', () => {
    expect(auditActionOptions[0]).toEqual({ value: '', label: '全部操作' })
    expect(auditActionOptions.slice(1).map((option) => option.value)).toEqual(Object.keys(auditActionLabels))
    expect(auditActionOptions.slice(1).every((option) => option.label === auditActionLabel(option.value))).toBe(true)
  })
})
