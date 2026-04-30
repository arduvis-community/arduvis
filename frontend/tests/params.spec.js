/**
 * params.spec.js — Playwright tests for .param file export and import.
 *
 * Export tests:
 *   Inject known component configurations via window.__avcStore__, trigger
 *   export, intercept the download, and assert the expected parameter lines
 *   appear in the file content.
 *
 * Import tests:
 *   Upload a minimal .param file, verify the modal opens and lists the
 *   expected parameters.
 *
 * Requires: dev server running on localhost:5173
 *           backend running on localhost:8374
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import fs   from 'fs'
import os   from 'os'

// ── helpers ────────────────────────────────────────────────────────────────────

async function freshPage(page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForFunction(() => !!window.__avcStore__, { timeout: 8000 })
  await page.waitForTimeout(300)
}

/** Inject a fresh project with given components (fields pre-populated). */
async function setupProject(page, vehicleType, components) {
  await page.evaluate(({ vehicleType, components }) => {
    const store = window.__avcStore__
    store.getState().newProject()
    store.getState().setVehicleType(vehicleType)
    // Inject each component and its fields directly
    const state = store.getState()
    components.forEach(({ defId, label, icon, x, y, fields }) => {
      const id = state.addComponent(defId, label, icon || '◆', false, x || 0, y || 0)
      Object.entries(fields || {}).forEach(([key, val]) => {
        store.getState().updateComponentField(id, key, val)
      })
    })
  }, { vehicleType, components })
  await page.waitForTimeout(200)
}

/**
 * Trigger the Export .param button and capture the downloaded file content.
 * Returns the raw text of the .param file.
 */
async function exportParam(page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Export .param")'),
  ])
  const tmpPath = path.join(os.tmpdir(), `avc-test-${Date.now()}.param`)
  await download.saveAs(tmpPath)
  const content = fs.readFileSync(tmpPath, 'utf8')
  fs.unlinkSync(tmpPath)
  return content
}

/** Parse exported content into a flat param → value map. */
function parseExport(content) {
  const params = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [name, val] = trimmed.split(',')
    if (name && val !== undefined) {
      params[name.trim()] = parseFloat(val.trim())
    }
  }
  return params
}

// ── 1. Export: frame (copter) params ──────────────────────────────────────────

test('export copter frame params: FRAME_CLASS and FRAME_TYPE', async ({ page }) => {
  await freshPage(page)
  await setupProject(page, 'copter', [
    {
      defId: 'frame_copter', label: 'Frame', x: 0, y: 0,
      fields: { frame_class: 2, frame_type: 1 },
    },
  ])

  const content = await exportParam(page)
  console.log('Exported param file (frame):\n', content)

  const params = parseExport(content)
  expect(params['FRAME_CLASS']).toBe(2)
  expect(params['FRAME_TYPE']).toBe(1)
})

// ── 2. Export: motor params ────────────────────────────────────────────────────

test('export copter motor params: MOT_SPIN_ARM and MOT_PWM_TYPE', async ({ page }) => {
  await freshPage(page)
  await setupProject(page, 'copter', [
    {
      defId: 'frame_copter', label: 'Frame', x: 0, y: 0,
      fields: { mot_spin_arm: 0.12, mot_spin_min: 0.15 },
    },
    {
      defId: 'esc_motor_copter', label: 'ESC 1', x: 100, y: 100,
      fields: { mot_pwm_type: 6, output_pin: 1, motor_num: 1 },
    },
  ])

  const content = await exportParam(page)
  const params  = parseExport(content)

  expect(params['MOT_SPIN_ARM']).toBeCloseTo(0.12, 4)
  expect(params['MOT_SPIN_MIN']).toBeCloseTo(0.15, 4)
  expect(params['MOT_PWM_TYPE']).toBe(6)
  expect(params['SERVO1_FUNCTION']).toBe(33)   // Motor 1 → function 33
})

// ── 3. Export: battery monitor params ─────────────────────────────────────────

test('export battery monitor params: BATT_MONITOR and BATT_VOLT_PIN', async ({ page }) => {
  await freshPage(page)
  await setupProject(page, 'copter', [
    {
      defId: 'battery_monitor', label: 'Battery', x: 0, y: 0,
      fields: {
        instance: 1,
        batt_monitor: 4,
        volt_pin: 14,
        curr_pin: 15,
        volt_mult: 10.1,
        amp_pervlt: 17.0,
        batt_capacity: 5000,
      },
    },
  ])

  const content = await exportParam(page)
  const params  = parseExport(content)

  expect(params['BATT_MONITOR']).toBe(4)
  expect(params['BATT_VOLT_PIN']).toBe(14)
  expect(params['BATT_CURR_PIN']).toBe(15)
  expect(params['BATT_VOLT_MULT']).toBeCloseTo(10.1, 2)
  expect(params['BATT_AMP_PERVLT']).toBeCloseTo(17.0, 2)
  expect(params['BATT_CAPACITY']).toBe(5000)
})

// ── 4. Export: second battery instance uses BATT2_ prefix ─────────────────────

test('export second battery uses BATT2_ prefix', async ({ page }) => {
  await freshPage(page)
  await setupProject(page, 'copter', [
    {
      defId: 'battery_monitor', label: 'Battery 2', x: 0, y: 0,
      fields: { instance: 2, batt_monitor: 4, volt_pin: 13, volt_mult: 10.1 },
    },
  ])

  const content = await exportParam(page)
  const params  = parseExport(content)

  expect(params['BATT2_MONITOR']).toBe(4)
  expect(params['BATT2_VOLT_PIN']).toBe(13)
  expect(params['BATT_MONITOR']).toBeUndefined()   // no BATT1 params
})

// ── 5. Export: telemetry serial port ──────────────────────────────────────────

test('export telemetry params: SERIALx_PROTOCOL and BAUD', async ({ page }) => {
  await freshPage(page)
  await setupProject(page, 'copter', [
    {
      defId: 'telemetry', label: 'Telem', x: 0, y: 0,
      fields: { serial_port: 'SERIAL1', protocol: 2, baud: 57 },
    },
  ])

  const content = await exportParam(page)
  const params  = parseExport(content)

  expect(params['SERIAL1_PROTOCOL']).toBe(2)
  expect(params['SERIAL1_BAUD']).toBe(57)
})

// ── 6. Export: GPS sets SERIALx_PROTOCOL = 5 ──────────────────────────────────

test('export GPS component sets GPS_TYPE and SERIAL3_PROTOCOL=5', async ({ page }) => {
  await freshPage(page)
  await setupProject(page, 'copter', [
    {
      defId: 'gps', label: 'GPS', x: 0, y: 0,
      fields: { instance: 1, gps_type: 1, serial_port: 'SERIAL3', serial_baud: 115 },
    },
  ])

  const content = await exportParam(page)
  const params  = parseExport(content)

  expect(params['GPS_TYPE']).toBe(1)
  expect(params['SERIAL3_PROTOCOL']).toBe(5)
  expect(params['SERIAL3_BAUD']).toBe(115)
})

// ── 7. Export: flight modes ────────────────────────────────────────────────────

test('export flight modes map to FLTMODE1..6', async ({ page }) => {
  await freshPage(page)
  await setupProject(page, 'copter', [
    {
      defId: 'flight_modes', label: 'Modes', x: 0, y: 0,
      fields: { fltmode1: 0, fltmode2: 5, fltmode3: 6 },
    },
  ])

  const content = await exportParam(page)
  const params  = parseExport(content)

  expect(params['FLTMODE1']).toBe(0)
  expect(params['FLTMODE2']).toBe(5)
  expect(params['FLTMODE3']).toBe(6)
})

// ── 8. Export: header contains vehicle type and parameter count ────────────────

test('exported file header contains vehicle type and param count', async ({ page }) => {
  await freshPage(page)
  await setupProject(page, 'plane', [
    {
      defId: 'frame_plane', label: 'Frame', x: 0, y: 0,
      fields: { airspeed_min: 12, airspeed_max: 30, thr_min: 0 },
    },
  ])

  const content = await exportParam(page)
  expect(content).toContain('# Firmware  : plane')
  expect(content).toMatch(/# Parameters: \d+/)
  expect(content).toContain('ARSPD_FBW_MIN,12')
  expect(content).toContain('ARSPD_FBW_MAX,30')
})

// ── 9. Import: modal shows components and raw params ─────────────────────────

test('import .param file opens preview modal with components', async ({ page }) => {
  await freshPage(page)

  const paramContent = [
    '# Test copter param file',
    'FRAME_CLASS,2',
    'FRAME_TYPE,1',
    'BATT_MONITOR,4',
    'BATT_VOLT_PIN,14',
    'BATT_VOLT_MULT,10.1',
    'SERIAL1_PROTOCOL,2',
    'SERIAL1_BAUD,57',
    'FLTMODE1,0',
    'FLTMODE2,5',
  ].join('\n')

  const tmpPath = path.join(os.tmpdir(), `avc-import-test-${Date.now()}.param`)
  fs.writeFileSync(tmpPath, paramContent)

  try {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('button:has-text("Import .param")'),
    ])
    await fileChooser.setFiles(tmpPath)

    // Modal should appear — use the Apply button as the sentinel
    const applyBtn = page.locator('button:has-text("Apply to canvas")')
    await expect(applyBtn).toBeVisible({ timeout: 5000 })

    // Should show inferred component count and vehicle type
    await expect(page.locator('text=Components to create')).toBeVisible()
    await expect(page.locator('span.text-gray-300:has-text("copter")')).toBeVisible()

    // Components pane should list known components (check count badge in header)
    await expect(page.locator('text=Battery 1')).toBeVisible()
    // Header shows "N components" — confirm at least one component was found
    await expect(page.locator('span.text-blue-300').filter({ hasText: 'components' })).toBeVisible()

    // Raw params pane should show parameter names
    await expect(page.locator('text=FRAME_CLASS')).toBeVisible()
    await expect(page.locator('text=BATT_MONITOR')).toBeVisible()

    // Cancel closes modal
    await page.click('button:has-text("Cancel")')
    await expect(applyBtn).toBeHidden()
  } finally {
    fs.unlinkSync(tmpPath)
  }
})

// ── 10. Import: applying creates components in the store ──────────────────────

test('applying import creates components in the canvas store', async ({ page }) => {
  await freshPage(page)

  const paramContent = [
    'FRAME_CLASS,2',
    'FRAME_TYPE,1',
    'BATT_MONITOR,4',
    'BATT_VOLT_PIN,14',
    'BATT_VOLT_MULT,10.1',
    'BATT_CAPACITY,5000',
    'SERIAL1_PROTOCOL,2',
    'SERIAL1_BAUD,57',
  ].join('\n')

  const tmpPath = path.join(os.tmpdir(), `avc-import-apply-${Date.now()}.param`)
  fs.writeFileSync(tmpPath, paramContent)

  try {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('button:has-text("Import .param")'),
    ])
    await fileChooser.setFiles(tmpPath)
    const applyBtn2 = page.locator('button:has-text("Apply to canvas")')
    await expect(applyBtn2).toBeVisible({ timeout: 5000 })

    // Apply
    await applyBtn2.click()
    await page.waitForTimeout(300)

    // Modal should close
    await expect(applyBtn2).toBeHidden()

    // Store should have components with correct field values
    const components = await page.evaluate(() =>
      window.__avcStore__.getState().components
    )
    console.log('Imported components:', JSON.stringify(components.map(c => ({ defId: c.defId, fields: c.fields }))))

    const frame = components.find(c => c.defId === 'frame_copter')
    expect(frame).toBeTruthy()
    expect(frame.fields.frame_class).toBe(2)
    expect(frame.fields.frame_type).toBe(1)

    const batt = components.find(c => c.defId === 'battery_monitor')
    expect(batt).toBeTruthy()
    expect(batt.fields.batt_monitor).toBe(4)
    expect(batt.fields.volt_pin).toBe(14)
    expect(batt.fields.volt_mult).toBeCloseTo(10.1, 2)
    expect(batt.fields.batt_capacity).toBe(5000)

    const telem = components.find(c => c.defId === 'telemetry')
    expect(telem).toBeTruthy()
    expect(telem.fields.serial_port).toBe('SERIAL1')
    expect(telem.fields.protocol).toBe(2)

    // Vehicle type should be set to copter
    const vehicleType = await page.evaluate(() =>
      window.__avcStore__.getState().vehicleType
    )
    expect(vehicleType).toBe('copter')
  } finally {
    fs.unlinkSync(tmpPath)
  }
})

// ── 11. Import: backdrop closes modal ─────────────────────────────────────────

test('import modal closes when clicking backdrop', async ({ page }) => {
  await freshPage(page)

  const paramContent = 'FRAME_CLASS,1\nFRAME_TYPE,1\n'
  const tmpPath = path.join(os.tmpdir(), `avc-import-backdrop-${Date.now()}.param`)
  fs.writeFileSync(tmpPath, paramContent)

  try {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('button:has-text("Import .param")'),
    ])
    await fileChooser.setFiles(tmpPath)
    const applyBtn3 = page.locator('button:has-text("Apply to canvas")')
    await expect(applyBtn3).toBeVisible({ timeout: 5000 })

    await page.mouse.click(10, 10)
    await expect(applyBtn3).toBeHidden()
  } finally {
    fs.unlinkSync(tmpPath)
  }
})
