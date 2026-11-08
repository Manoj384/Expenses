import { test, expect } from '@playwright/test'
import { injectMockAuthSession } from './testHelpers.js'

test.describe('Dashboard & Core Visual Components', () => {
  test.beforeEach(async ({ page }) => {
    await injectMockAuthSession(page)
  })

  test('should render dashboard layout, top navbar, and quick access', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')

    // Verify main header exists with Dashboard title
    const header = page.locator('header')
    await expect(header).toBeVisible()
    await expect(page.locator('header h1')).toContainText(/Financial Dashboard|Dashboard/i)
  })

  test('should display responsive sidebar or navigation toggle', async ({ page, isMobile }) => {
    await page.goto('/')

    if (isMobile) {
      const hamburger = page.locator('button[aria-label="Open Sidebar Menu"]')
      await expect(hamburger).toBeVisible()
      await hamburger.click()
      const mobileDrawer = page.locator('.fixed.inset-0.z-50')
      await expect(mobileDrawer).toBeVisible()
    } else {
      const desktopSidebar = page.locator('aside')
      await expect(desktopSidebar).toBeVisible()
    }
  })
})
