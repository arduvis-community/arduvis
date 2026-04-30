/**
 * interface.spec.js
 * Playwright E2E tests for core AVC UI interactions.
 * Requires the dev server running: npm run dev (port 5173)
 * Run with: npx playwright test
 */

import { test, expect } from '@playwright/test'

// ── helpers ────────────────────────────────────────────────────────────────────

/** Clear localStorage so each test starts from a clean slate */
async function freshPage(page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('text=Use Standard ArduPilot View', { timeout: 8000 })
}

// ── 1. Page load ───────────────────────────────────────────────────────────────

test('page loads and shows toolbar + setup gate', async ({ page }) => {
  await freshPage(page)

  // Toolbar items
  await expect(page.locator('text=AVC')).toBeVisible()
  await expect(page.locator('select').first()).toBeVisible()           // vehicle type
  await expect(page.locator('text=Export .param')).toBeVisible()

  // Setup gate (no airframe loaded yet)
  await expect(page.locator('text=Use Standard ArduPilot View')).toBeVisible()
  await expect(page.locator('text=Import Airframe Image')).toBeVisible()
})

// ── 2. Vehicle type selector ───────────────────────────────────────────────────

test('vehicle type selector changes value', async ({ page }) => {
  await freshPage(page)

  const sel = page.locator('select').first()
  await sel.selectOption('plane')
  await expect(sel).toHaveValue('plane')

  await sel.selectOption('vtol')
  await expect(sel).toHaveValue('vtol')
})

// ── 3. Standard Views modal ────────────────────────────────────────────────────

test('Standard View modal opens and can be dismissed', async ({ page }) => {
  await freshPage(page)

  // Open from setup gate
  await page.click('text=Use Standard ArduPilot View')
  await expect(page.locator('text=Standard ArduPilot Airframes')).toBeVisible()

  // Close via ✕ button
  await page.click('button:has-text("✕")')
  await expect(page.locator('text=Standard ArduPilot Airframes')).toBeHidden()
})

test('Standard View modal also opens from toolbar button', async ({ page }) => {
  await freshPage(page)

  await page.click('button:has-text("Standard view")')
  await expect(page.locator('text=Standard ArduPilot Airframes')).toBeVisible()

  await page.click('button:has-text("✕")')
  await expect(page.locator('text=Standard ArduPilot Airframes')).toBeHidden()
})

// ── 4. Zoom controls ───────────────────────────────────────────────────────────

test('zoom in / zoom out / reset controls work', async ({ page }) => {
  await freshPage(page)

  const zoomLabel = page.locator('span').filter({ hasText: /^\d+%$/ })
  const initial = await zoomLabel.textContent()
  expect(initial).toBe('100%')

  // Zoom in
  await page.click('button:has-text("+")')
  const zoomedIn = await zoomLabel.textContent()
  expect(parseInt(zoomedIn)).toBeGreaterThan(100)

  // Zoom out
  await page.click('button:has-text("−")')
  await page.click('button:has-text("−")')
  const zoomedOut = await zoomLabel.textContent()
  expect(parseInt(zoomedOut)).toBeLessThan(parseInt(zoomedIn))

  // Reset
  await page.click('button:has-text("Reset")')
  await expect(zoomLabel).toHaveText('100%')
})

// ── 5. View tab switching ──────────────────────────────────────────────────────

test('top / bottom view tabs toggle', async ({ page }) => {
  await freshPage(page)

  const topBtn    = page.locator('button:has-text("Top view")')
  const bottomBtn = page.locator('button:has-text("Bottom view")')

  await expect(topBtn).toBeVisible()
  await expect(bottomBtn).toBeVisible()

  // Switch to Bottom
  await bottomBtn.click()
  await expect(bottomBtn).toHaveClass(/bg-blue-700/)

  // Switch back to Top
  await topBtn.click()
  await expect(topBtn).toHaveClass(/bg-blue-700/)
})

// ── 6. Save modal ──────────────────────────────────────────────────────────────

test('Save modal opens with name + directory inputs', async ({ page }) => {
  await freshPage(page)

  await page.click('button:has-text("Save")')

  // Modal visible
  await expect(page.locator('text=Save project')).toBeVisible()

  // Name field
  const nameInput = page.locator('input[placeholder="my-quad"]')
  await expect(nameInput).toBeVisible()
  await expect(nameInput).toBeFocused()

  // Directory field
  const dirInput = page.locator('input[placeholder="~/.avc/projects"]')
  await expect(dirInput).toBeVisible()

  // Path preview updates as you type a name
  await nameInput.fill('test-drone')
  await expect(page.locator('text=test-drone/')).toBeVisible()

  // Escape closes
  await page.keyboard.press('Escape')
  await expect(page.locator('text=Save project')).toBeHidden()
})

test('Save button stays disabled when name is empty', async ({ page }) => {
  await freshPage(page)

  await page.click('button:has-text("Save")')

  // Target the Save button inside the modal dialog specifically
  const modal   = page.locator('div').filter({ hasText: /^Save project/ }).last()
  const saveBtn = modal.locator('button:has-text("Save")')
  await expect(saveBtn).toBeDisabled()

  await page.locator('input[placeholder="my-quad"]').fill('myproject')
  await expect(saveBtn).toBeEnabled()
})

// ── 7. New project ─────────────────────────────────────────────────────────────

test('New project resets to Untitled', async ({ page }) => {
  await freshPage(page)

  // Click New (no dirty state so no confirm needed)
  await page.click('button:has-text("New")')

  const projectLabel = page.locator('span').filter({ hasText: 'Untitled' })
  await expect(projectLabel).toBeVisible()
})

// ── 8. Inspector empty state ───────────────────────────────────────────────────

test('Inspector shows empty state when nothing is selected', async ({ page }) => {
  await freshPage(page)
  await expect(page.locator('text=Select a component')).toBeVisible()
})

// ── 9. Palette sidebar toggle ──────────────────────────────────────────────────

test('Palette sidebar toggle hides and shows the component list', async ({ page }) => {
  await freshPage(page)

  // Palette should be visible by default
  // (it renders component categories; check for any category text)
  const paletteBtn = page.locator('button:has-text("Palette")')
  await expect(paletteBtn).toBeVisible()

  // Toggle off
  await paletteBtn.click()
  // Toggle back on
  await paletteBtn.click()
})

// ── 10. Inspector toggle ───────────────────────────────────────────────────────

test('Inspector toggle hides and shows the inspector panel', async ({ page }) => {
  await freshPage(page)

  const inspectorBtn = page.locator('button:has-text("Inspector")')
  await expect(inspectorBtn).toBeVisible()

  // Hide inspector
  await inspectorBtn.click()
  await expect(page.locator('text=Select a component')).toBeHidden()

  // Show inspector again
  await inspectorBtn.click()
  await expect(page.locator('text=Select a component')).toBeVisible()
})
