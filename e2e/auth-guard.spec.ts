import { test, expect } from '@playwright/test'

test.describe('Auth Guard', () => {
  test('unauthenticated user is redirected to /login from root', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected to /login from dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected to /login from content pages', async ({ page }) => {
    await page.goto('/content/hero')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected to /login from users page', async ({ page }) => {
    await page.goto('/users')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected to /login from documents page', async ({ page }) => {
    await page.goto('/documents')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected to /login from software page', async ({ page }) => {
    await page.goto('/software')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected to /login from settings page', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page is accessible without authentication', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL('/login')
    await expect(page.locator('#phone')).toBeVisible()
  })

  test('nonexistent routes redirect to login when unauthenticated', async ({ page }) => {
    await page.goto('/nonexistent-page')
    await expect(page).toHaveURL(/\/login/)
  })
})
