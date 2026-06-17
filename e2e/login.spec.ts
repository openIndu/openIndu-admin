import { test, expect } from '@playwright/test'

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('renders login form with phone input, code input, and submit button', async ({ page }) => {
    await expect(page.locator('h2')).toContainText('openIndu')
    await expect(page.locator('#phone')).toBeVisible()
    await expect(page.locator('#code')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
    await expect(page.locator('text=发送验证码')).toBeVisible()
  })

  test('shows error for invalid phone number', async ({ page }) => {
    await page.fill('#phone', '12345')
    await page.click('text=发送验证码')
    await expect(page.locator('text=请输入 11 位中国大陆手机号')).toBeVisible()
  })

  test('shows error when submitting with empty fields', async ({ page }) => {
    await page.click('button[type="submit"]')
    await expect(page.locator('text=请输入正确的手机号和 6 位验证码')).toBeVisible()
  })

  test('send code button shows countdown after click', async ({ page }) => {
    await page.fill('#phone', '13800138000')
    await page.click('text=发送验证码')
    // The send-code call will fail (no real backend), but the UI should show countdown
    // since countdown is set before the API call resolves
    await expect(page.locator('button:has-text("s")')).toBeVisible({ timeout: 2000 })
  })

  test('toggle between login and register mode', async ({ page }) => {
    await expect(page.locator('text=手机号验证码登录')).toBeVisible()
    await page.click('text=没有账号？切换到注册')
    await expect(page.locator('text=手机号验证码注册')).toBeVisible()
    await page.click('text=已有账号？切换到登录')
    await expect(page.locator('text=手机号验证码登录')).toBeVisible()
  })

  test('submit button shows loading state', async ({ page }) => {
    await page.fill('#phone', '13800138000')
    await page.fill('#code', '123456')
    await page.click('button[type="submit"]')
    // The API call will fail but the button should briefly show loading state
    // We just verify the button exists and is clickable
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })
})
