// Audit-log action codes and the labels the admin UI shows for them.
//
// The backend writes two families: the semantic rows of the membership use cases (role_change,
// member_approve, ...) and one row per successful admin write request, named
// "<api module>.<endpoint function>" by AdminAuditMiddleware. A code that is not listed here is
// shown as it is, so a new backend action never disappears from the page.
import type { SelectOption } from '@/app/components/ui/select'

export const auditActionLabels: Record<string, string> = {
  role_change: '修改角色',
  blacklist: '拉黑用户',
  unblacklist: '解除拉黑',
  force_logout: '强制登出',
  delete: '删除用户',
  member_approve: '通过会员申请',
  member_reject: '驳回会员申请',
  'software.review_software_submission': '软件 · 审核投稿',
  'software.add_version': '软件 · 新增版本',
  'software.delete_version': '软件 · 删除版本',
  'software.update_software': '软件 · 编辑',
  'software.bulk_publish_software': '软件 · 批量发布/下架',
  'software.bulk_delete_software': '软件 · 批量删除版本',
  'software.toggle_publish': '软件 · 切换发布状态',
  'software.toggle_version_publish': '软件 · 切换版本发布状态',
  'software.delete_software': '软件 · 删除',
  'documents.review_document_submission': '文档 · 审核投稿',
  'documents.bulk_publish_documents': '文档 · 批量发布/下架',
  'documents.update_document': '文档 · 编辑',
  'documents.toggle_publish': '文档 · 切换发布状态',
  'documents.delete_document': '文档 · 删除',
  'tags.create_tag': '标签 · 新增',
  'tags.update_tag': '标签 · 编辑',
  'tags.delete_tag': '标签 · 删除',
  'portal.create_solution': '解决方案 · 新增',
  'portal.update_solution': '解决方案 · 编辑',
  'portal.delete_solution': '解决方案 · 删除',
}

export function auditActionLabel(action: string): string {
  return auditActionLabels[action] ?? action
}

export const auditActionOptions: SelectOption[] = [
  { value: '', label: '全部操作' },
  ...Object.entries(auditActionLabels).map(([value, label]) => ({ value, label })),
]
