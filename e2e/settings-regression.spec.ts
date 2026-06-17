import { test, expect } from '@playwright/test'

test.describe('Settings regression', () => {
  test('renders settings when config API returns an items wrapper', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('openindu_admin_access_token', 'access-token')
      localStorage.setItem('openindu_admin_refresh_token', 'refresh-token')
    })

    await page.route('**/api/v1/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 200, data: { id: 1, phone: '13800000000', role: 'admin' } }),
      })
    })
    await page.route('**/api/v1/config', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 200,
            data: { items: [{ config_key: 'embedding_model', config_value: 'BAAI/bge-m3' }] },
          }),
        })
        return
      }
      await route.continue()
    })

    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    await page.goto('/settings')

    await expect(page.getByRole('heading', { name: '系统配置' })).toBeVisible()
    await expect(page.locator('input').first()).toHaveValue('BAAI/bge-m3')
    expect(pageErrors).toEqual([])
  })
})
