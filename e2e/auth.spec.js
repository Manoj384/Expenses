import { test, expect } from '@playwright/test'

test.describe('Authentication & Access Control UI', () => {
  test('should render login page with all inputs and elements', async ({ page }) => {
    await page.goto('/login')

    await expect(page).toHaveTitle(/Finance Tracker|Login/i)
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')
    const submitBtn = page.locator('button[type="submit"]')

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitBtn).toBeVisible()
  })

  test('should display validation error on empty login submission', async ({ page }) => {
    await page.goto('/login')
    const submitBtn = page.locator('button[type="submit"]')
    await submitBtn.click()

    const errorAlert = page.locator('[role="alert"]')
    await expect(errorAlert).toBeVisible()
  })

  test('should navigate cleanly to signup page', async ({ page }) => {
    await page.goto('/login')
    const signupLink = page.locator('a[href*="/signup"]')
    if (await signupLink.isVisible()) {
      await signupLink.click()
      await expect(page).toHaveURL(/.*signup/)
      await expect(page.locator('input[type="email"]')).toBeVisible()
    }
  })
})
