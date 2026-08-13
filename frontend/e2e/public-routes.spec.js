import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const routes = [
  { path: '/', landmark: 'main' },
  { path: '/login', landmark: 'form' },
  { path: '/register', landmark: 'form' },
  { path: '/showcase', landmark: 'main' },
]

for (const route of routes) {
  test(`${route.path} renders without horizontal overflow`, async ({ page }) => {
    await page.goto(route.path)
    await expect(page.locator(route.landmark).first()).toBeVisible()
    const overflows = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
    expect(overflows).toBe(false)
  })
}

test('login validation remains on the login route and exposes errors', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /^sign in/i }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByText('Enter a valid email address.')).toBeVisible()
  await expect(page.getByText('Enter your password.')).toBeVisible()
})

test('critical public routes have no serious or critical axe violations', async ({ page }) => {
  for (const route of routes) {
    await page.goto(route.path)
    const results = await new AxeBuilder({ page })
      .disableRules(['color-contrast'])
      .analyze()
    const blocking = results.violations.filter((item) => ['serious', 'critical'].includes(item.impact))
    expect(blocking, `${route.path}: ${blocking.map((item) => item.id).join(', ')}`).toEqual([])
  }
})
