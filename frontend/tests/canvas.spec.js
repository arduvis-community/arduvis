/**
 * canvas.spec.js — focused tests for chip click/drag behaviour
 * Injects components directly via window.__avcStore__ (exposed in dev mode)
 * so tests don't depend on localStorage seeding / Zustand rehydration timing.
 */
import { test, expect } from '@playwright/test'

// ── helpers ────────────────────────────────────────────────────────────────────

async function freshPage(page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  // Wait until the store is exposed and hydrated
  await page.waitForFunction(() => !!window.__avcStore__, { timeout: 8000 })
  await page.waitForTimeout(300)
}

/** Add chips to the canvas by calling the store directly */
async function addChips(page, chips) {
  await page.evaluate((chips) => {
    const store = window.__avcStore__
    if (!store) throw new Error('__avcStore__ not exposed')
    // Reset to clean state first
    store.getState().newProject()
    chips.forEach(({ defId, label, icon, x, y }) => {
      store.getState().addComponent(defId, label, icon, false, x, y)
    })
  }, chips)
  // Give React a tick to re-render
  await page.waitForTimeout(200)
}

/** Get the canvas bounding box (first visible canvas element) */
async function getCanvasBox(page) {
  // Konva creates a display canvas and a hit canvas per layer.
  // The display canvas comes first and is visible.
  const canvases = await page.locator('canvas').all()
  for (const c of canvases) {
    const box = await c.boundingBox()
    if (box && box.width > 200) return box
  }
  throw new Error('No canvas found')
}

// ── 1. Canvas renders ──────────────────────────────────────────────────────────

test('Konva canvas element is present and sized', async ({ page }) => {
  await freshPage(page)
  const box = await getCanvasBox(page)
  console.log(`Canvas: ${box.width}×${box.height} at (${box.x},${box.y})`)
  expect(box.width).toBeGreaterThan(400)
  expect(box.height).toBeGreaterThan(300)
})

// ── 2. Single chip click selects it ───────────────────────────────────────────

test('clicking a chip selects it', async ({ page }) => {
  await freshPage(page)
  await addChips(page, [
    { defId: 'esc_motor', label: 'ESC 1', icon: '⚡', x: 100, y: 100 },
  ])

  const box = await getCanvasBox(page)
  console.log(`Canvas at (${box.x},${box.y})`)

  // Screenshot to confirm chip is rendered
  await page.screenshot({ path: 'test-results/chip-rendered.png' })

  // Chip centre in canvas pixels: x=100+80=180, y=100+16=116
  await page.mouse.click(box.x + 180, box.y + 116)
  await page.waitForTimeout(200)

  await page.screenshot({ path: 'test-results/chip-after-click.png' })

  const empty = await page.locator('text=Select a component').isVisible()
  console.log(`Inspector empty after click: ${empty}`)
  expect(empty).toBe(false)  // chip should be selected
})

// ── 3. All chips independently clickable ──────────────────────────────────────

test('all four chips are independently clickable', async ({ page }) => {
  await freshPage(page)
  await addChips(page, [
    { defId: 'esc_motor',       label: 'ESC 1',   icon: '⚡', x: 50,  y: 50  },
    { defId: 'esc_motor',       label: 'ESC 2',   icon: '⚡', x: 300, y: 50  },
    { defId: 'battery_monitor', label: 'Battery', icon: '🔋', x: 50,  y: 150 },
    { defId: 'telemetry',       label: 'Radio',   icon: '📡', x: 300, y: 150 },
  ])

  const box = await getCanvasBox(page)
  const results = []

  const positions = [
    { label: 'ESC 1',   cx: 50  + 80, cy: 50  + 16 },
    { label: 'ESC 2',   cx: 300 + 80, cy: 50  + 16 },
    { label: 'Battery', cx: 50  + 80, cy: 150 + 16 },
    { label: 'Radio',   cx: 300 + 80, cy: 150 + 16 },
  ]

  for (const { label, cx, cy } of positions) {
    await page.mouse.click(box.x + cx, box.y + cy)
    await page.waitForTimeout(150)
    const empty = await page.locator('text=Select a component').isVisible()
    results.push({ label, selected: !empty })
    console.log(`${label}: selected=${!empty}`)
    // Deselect by clicking empty area before next chip
    await page.mouse.click(box.x + 700, box.y + 450)
    await page.waitForTimeout(100)
  }

  expect(results.every(r => r.selected)).toBe(true)
})

// ── 4. Drag moves only the dragged chip ───────────────────────────────────────

test('dragging one chip does not move others', async ({ page }) => {
  await freshPage(page)
  await addChips(page, [
    { defId: 'esc_motor', label: 'ESC 1', icon: '⚡', x: 100, y: 100 },
    { defId: 'esc_motor', label: 'ESC 2', icon: '⚡', x: 400, y: 100 },
  ])

  const box = await getCanvasBox(page)

  const before = await page.evaluate(() =>
    window.__avcStore__.getState().components.map(c => ({ id: c.id, x: c.x, y: c.y }))
  )
  console.log('Before:', JSON.stringify(before))

  // Drag chip 1 centre (180, 116) 100px right
  await page.mouse.move(box.x + 180, box.y + 116)
  await page.mouse.down()
  await page.mouse.move(box.x + 230, box.y + 116, { steps: 5 })
  await page.mouse.move(box.x + 280, box.y + 116, { steps: 5 })
  await page.mouse.up()
  await page.waitForTimeout(300)

  const after = await page.evaluate(() =>
    window.__avcStore__.getState().components.map(c => ({ id: c.id, x: c.x, y: c.y }))
  )
  console.log('After:', JSON.stringify(after))

  const c1b = before[0], c1a = after[0]
  const c2b = before[1], c2a = after[1]

  console.log(`ESC 1: ${c1b.x} → ${c1a.x}`)
  console.log(`ESC 2: ${c2b.x} → ${c2a.x}`)

  expect(Math.abs(c1a.x - c1b.x)).toBeGreaterThan(10)   // chip 1 moved
  expect(Math.abs(c2a.x - c2b.x)).toBeLessThan(5)        // chip 2 stayed
})

// ── 5. Panning empty canvas does not move chips ───────────────────────────────

test('panning empty canvas area does not change chip positions', async ({ page }) => {
  await freshPage(page)
  await addChips(page, [
    { defId: 'esc_motor', label: 'ESC 1', icon: '⚡', x: 100, y: 100 },
  ])

  const box = await getCanvasBox(page)

  const before = await page.evaluate(() =>
    window.__avcStore__.getState().components[0]
  )
  console.log(`Chip before pan: x=${before?.x} y=${before?.y}`)

  // Drag on empty area (far from chip at 100,100)
  await page.mouse.move(box.x + 600, box.y + 400)
  await page.mouse.down()
  await page.mouse.move(box.x + 700, box.y + 400, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(300)

  const after = await page.evaluate(() =>
    window.__avcStore__.getState().components[0]
  )
  console.log(`Chip after pan:  x=${after?.x} y=${after?.y}`)

  // Pan moves panX/panY, chip position stays unchanged
  expect(Math.abs(after.x - before.x)).toBeLessThan(5)
  expect(Math.abs(after.y - before.y)).toBeLessThan(5)

  const panX = await page.evaluate(() => window.__avcStore__.getState().panX)
  console.log(`panX after pan: ${panX}`)
  expect(Math.abs(panX)).toBeGreaterThan(5)  // stage did pan
})
