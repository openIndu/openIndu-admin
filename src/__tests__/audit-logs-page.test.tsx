import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuditLogs } from '@/app/pages/stats/AuditLogs'
import { auditActionLabels } from '@/app/pages/stats/auditActions'

vi.mock('@/api', () => ({
  adminApi: {
    auditLogs: vi.fn().mockResolvedValue({
      total: 3,
      items: [
        {
          id: 3,
          admin_username: '138****0000',
          target_user: '-',
          action: 'software.toggle_publish',
          detail: "{'method': 'PATCH', 'path': '/api/v1/software/9/publish', 'status': 200, 'is_published': True}",
          created_at: '2026-10-23T08:00:00Z',
        },
        {
          id: 2,
          admin_username: '138****0000',
          target_user: '139****1111',
          action: 'role_change',
          detail: "{'old_role': 'user', 'new_role': 'member'}",
          created_at: '2026-10-23T07:00:00Z',
        },
        {
          id: 1,
          admin_username: '138****0000',
          target_user: '-',
          action: 'brand_mapping.future_action',
          detail: '-',
          created_at: '2026-10-23T06:00:00Z',
        },
      ],
    }),
  },
}))

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <AuditLogs />
    </QueryClientProvider>,
  )
}

describe('AuditLogs page', () => {
  // The filter <select> carries the same labels as <option>s, so the table cells are found by their
  // title (the raw action code) instead of by text.
  it('shows known actions by label with the raw code as tooltip, and unknown ones as they are', async () => {
    renderPage()
    expect((await screen.findByTitle('software.toggle_publish')).textContent).toBe('软件 · 切换发布状态')
    expect(screen.getByTitle('role_change').textContent).toBe('修改角色')
    expect(screen.getByTitle('brand_mapping.future_action').textContent).toBe('brand_mapping.future_action')
  })

  it('offers every known action in the filter', async () => {
    renderPage()
    await screen.findByTitle('software.toggle_publish')
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(Array.from(select.options).map((option) => option.value)).toEqual(['', ...Object.keys(auditActionLabels)])
  })
})
