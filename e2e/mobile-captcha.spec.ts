import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 320, height: 640 }, hasTouch: true })

test('admin phone captcha supports a 320px screen', async ({ page }) => {
  const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9lS9sAAAAASUVORK5CYII='
  await page.route('**/auth/slider-captcha', (route) => route.fulfill({
    json: { data: { challenge_id: 1, background: pixel, piece: pixel, piece_y: 40, expires_in: 120 } },
  }))
  let verifiedX = -1
  await page.route('**/auth/slider-captcha/verify', async (route) => {
    verifiedX = route.request().postDataJSON().x
    await route.fulfill({ json: { data: { ticket: 'test-ticket', expires_in: 60 } } })
  })
  await page.route('**/auth/send-code', (route) => route.fulfill({ json: { data: { success: true } } }))

  await page.goto('/login')
  await page.locator('#phone').fill('13800138000')
  await page.getByRole('button', { name: '发送验证码' }).click()
  const slider = page.getByRole('slider', { name: '安全验证' })
  await expect(slider).toBeVisible()
  const box = await slider.boundingBox()
  expect(box).not.toBeNull()
  const trackWidth = await slider.locator('..').evaluate((element) => element.clientWidth)
  expect(trackWidth).toBeLessThan(320)
  const startX = box!.x + box!.width / 2
  const y = box!.y + box!.height / 2
  await page.mouse.move(startX, y)
  await page.mouse.down()
  await page.mouse.move(startX + 100, y, { steps: 8 })
  await page.mouse.up()
  await expect.poll(() => verifiedX).toBeGreaterThan(100)
  await expect.poll(() => verifiedX).toBeLessThan(150)
})
