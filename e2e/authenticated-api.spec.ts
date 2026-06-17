import { test, expect } from '@playwright/test'

test.describe('Authenticated API regression', () => {
  test('can login through admin proxy and request users API with returned token', async ({ page }) => {
    await page.goto('/login')

    const response = await page.evaluate(async () => {
      const login = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: '13800000000', code: '888888' }),
      })
      const loginBody = await login.json()
      const token = loginBody.data?.tokens?.access_token ?? loginBody.data?.access_token
      const users = await fetch('/api/v1/users?page=1&size=1', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return {
        loginStatus: login.status,
        tokenPresent: Boolean(token),
        usersStatus: users.status,
        usersBody: await users.json(),
      }
    })

    expect(response.loginStatus).toBe(200)
    expect(response.tokenPresent).toBe(true)
    expect(response.usersStatus).toBe(200)
    expect(response.usersBody.data.total).toBeGreaterThanOrEqual(1)
  })
})
