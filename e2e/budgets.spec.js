import { test, expect } from '@playwright/test'
import { injectMockAuthSession } from './testHelpers.js'

test.describe('Budgets & 50/30/20 Velocity UI', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAuthSession(page)
  })

  test('should render budgets page and smart 50/30/20 card', async ({ page }) => {
    await page.goto('/budgets')
    await expect(page).toHaveURL('/budgets')
    await expect(page.locator('header h1')).toContainText(/Smart Budget|Budget/i)

    // Check for Burn-Rate Velocity and 50/30/20 Framework
    const velocityHeading = page.getByText(/Live Burn-Rate Velocity/i)
    await expect(velocityHeading).toBeVisible()

    const safeToSpend = page.getByText(/Safe-to-Spend Allowance/i)
    await expect(safeToSpend).toBeVisible()

    const frameworkHeading = page.getByText(/50\s*\/\s*30\s*\/\s*20/i).first()
    await expect(frameworkHeading).toBeVisible()
  })
})
