import { test, expect } from '@playwright/test'
import { injectMockAuthSession } from './testHelpers.js'

test.describe('Transactions Flow & Visual Validation', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAuthSession(page)
  })

  test('should load transactions page cleanly', async ({ page }) => {
    await page.goto('/transactions')
    await expect(page).toHaveURL('/transactions')
    await expect(page.locator('header h1')).toContainText(/Transactions/i)
  })

  test('should open Add Transaction modal when clicking Add Transaction button', async ({ page }) => {
    await page.goto('/transactions')
    const addBtn = page.getByRole('button', { name: /Add Transaction/i }).first()
    await expect(addBtn).toBeVisible()
    await addBtn.click()

    // Modal should become visible with dialog title
    const modalHeading = page.getByRole('heading', { name: 'Add Transaction' })
    await expect(modalHeading).toBeVisible()
    await expect(page.locator('label[for="amount"]')).toBeVisible()
  })
})
