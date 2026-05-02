// Wire routing utilities — connection derivation, path computation, parallel line math.
// Used by WireLayer.jsx. No React dependencies.

// ── Wire protocol metadata ─────────────────────────────────────────────────

export const WIRE_COUNT = {
  pwm: 3, serial: 3,
  dronecan: 4, i2c: 4, smbus: 4,
  analog: 2,
  motor: 1,   // single thick line
  power: 1,   // single thick line
}

export const WIRE_COLOR = {
  dronecan: 'rgba(96,165,250,0.75)',   // blue
  pwm:      'rgba(251,191,36,0.75)',   // amber
  serial:   'rgba(74,222,128,0.75)',   // green
  i2c:      'rgba(167,139,250,0.75)',  // purple
  analog:   'rgba(148,163,184,0.75)', // gray
  smbus:    'rgba(167,139,250,0.75)', // purple
  motor:    'rgba(239,68,68,0.75)',    // red — 3-phase power
  power:    'rgba(239,68,68,0.75)',    // red — DC power bus (2-strand)
}

// ── Geometry constants (mirrors CanvasArea.jsx locals — keep in sync) ──────

const BLOCK_W = 160
const BLOCK_H = 32
const TOPO_W  = 200   // AutopilotChip CHIP_W
const TOPO_H  = 96    // AutopilotChip CHIP_H
const LEAF_H  = 26    // AssignedLeafChip height

// CAN port circle offset from AutopilotChip top-left (matches CanPort x = CHIP_W + 8)
const CAN1_DX = TOPO_W + 8   // 208
const CAN1_DY = 37
const CAN2_DX = TOPO_W + 8   // 208
const CAN2_DY = 69

// AssignedLeafChip x-offset from FC chip origin (matches CanvasArea lx = fc.x + TOPO_W + 40)
const TOPO_LEAF_DX = TOPO_W + 40   // 240

// ── Connection derivation ──────────────────────────────────────────────────

/**
 * Derive all wire connections from the current component list.
 * Returns Connection[] where each entry describes one wire to draw.
 *
 * Connection shape:
 *   key       — `${compId}:${fcId}` — stable lookup key for wireWaypoints
 *   protocol  — connection_type string
 *   wireCount — number of parallel strands
 *   color     — rgba stroke color
 *   srcPoint  — {x, y} world-space wire origin
 *   dstPoint  — {x, y} world-space wire terminus
 */
export function buildConnections(components, canvasMode) {
  // Build FC lookup map
  const fcMap = {}
  for (const c of components) {
    if (c.defId === 'autopilot_cube') fcMap[c.id] = c
  }

  const connections = []

  // ── DroneCAN connections (fc_assignment field) ───────────────────────────
  // fc_assignment may be a single FC id (legacy) or an array of FC ids.

  // Pre-compute per-FC assigned DroneCAN groups
  const dronecanGroups = {}   // fcId → [comp, ...]
  for (const c of components) {
    if (c.noCanvas) continue
    if (c.defId === 'autopilot_cube') continue
    if (c.fields?.connection_type !== 'dronecan') continue
    const raw = c.fields?.fc_assignment
    const fcIds = Array.isArray(raw) ? raw : (raw ? [raw] : [])
    for (const fcId of fcIds) {
      if (!fcMap[fcId]) continue
      if (!dronecanGroups[fcId]) dronecanGroups[fcId] = []
      if (!dronecanGroups[fcId].includes(c)) dronecanGroups[fcId].push(c)
    }
  }

  for (const [fcId, group] of Object.entries(dronecanGroups)) {
    const fc = fcMap[fcId]
    group.forEach((comp, idx) => {
      // Primary bus: can_bus field (default 1). dual_bus means redundant on both — use CAN1 as primary.
      const primaryBus = comp.fields?.dual_bus ? 1 : (comp.fields?.can_bus ?? 1)
      const canDX = primaryBus === 2 ? CAN2_DX : CAN1_DX
      const canDY = primaryBus === 2 ? CAN2_DY : CAN1_DY
      const protocol = 'dronecan'

      let srcPoint, dstPoint

      if (canvasMode === 'topology') {
        srcPoint = { x: fc.x + canDX, y: fc.y + canDY }
        dstPoint = { x: fc.x + TOPO_LEAF_DX, y: fc.y + idx * 34 + LEAF_H / 2 }
      } else {
        // Standard mode: wire from component edge to FC right center.
        const compCenterY = comp.y + BLOCK_H / 2
        const fcCenterY   = fc.y  + BLOCK_H / 2
        if (comp.x + BLOCK_W <= fc.x) {
          srcPoint = { x: comp.x + BLOCK_W, y: compCenterY }
        } else {
          srcPoint = { x: comp.x, y: compCenterY }
        }
        dstPoint = { x: fc.x + BLOCK_W, y: fcCenterY }
      }

      connections.push({
        key:       `${comp.id}:${fcId}`,
        protocol,
        wireCount: WIRE_COUNT[protocol] ?? 2,
        color:     WIRE_COLOR[protocol],
        srcPoint,
        dstPoint,
      })
    })
  }

  // ── Motor→ESC connections ─────────────────────────────────────────────────
  // Motors connect to an ESC, not directly to the FC.

  if (canvasMode === 'standard') {
    const escMap = {}
    for (const c of components) {
      if (c.defId === 'esc') escMap[c.id] = c
    }

    for (const c of components) {
      if (c.defId !== 'motor') continue
      if (!c.fields?.esc_assignment) continue
      const esc = escMap[c.fields.esc_assignment]
      if (!esc || esc.noCanvas) continue

      const compCenterY = c.y + BLOCK_H / 2
      const escCenterY  = esc.y + BLOCK_H / 2

      let srcPoint, dstPoint
      if (c.x + BLOCK_W <= esc.x) {
        srcPoint = { x: c.x + BLOCK_W, y: compCenterY }
        dstPoint = { x: esc.x,         y: escCenterY  }
      } else {
        srcPoint = { x: c.x,           y: compCenterY }
        dstPoint = { x: esc.x + BLOCK_W, y: escCenterY }
      }

      connections.push({
        key:       `${c.id}:${esc.id}`,
        protocol:  'motor',
        wireCount: 3,
        color:     WIRE_COLOR.motor,
        srcPoint,
        dstPoint,
      })
    }
  }

  // ── Power bus helper — defined at function scope so PDB→FC section can use it too ──
  const powerNodeMap = {}
  for (const c of components) {
    if (['battery', 'pdb', 'esc', 'autopilot_cube', 'battery_monitor'].includes(c.defId)) powerNodeMap[c.id] = c
  }

  const addPowerWire = (src, dst, keySuffix = 'pwr') => {
    if (!src || !dst || src.noCanvas || dst.noCanvas) return
    const srcCX = src.x + BLOCK_W / 2
    const dstCX = dst.x + BLOCK_W / 2
    let srcPoint, dstPoint
    // Prefer top/bottom attachment so power wires route vertically,
    // staying out of the horizontal signal-wire lanes.
    if (src.y + BLOCK_H + 8 <= dst.y) {
      srcPoint = { x: srcCX, y: src.y + BLOCK_H }
      dstPoint = { x: dstCX, y: dst.y }
    } else if (dst.y + BLOCK_H + 8 <= src.y) {
      srcPoint = { x: srcCX, y: src.y }
      dstPoint = { x: dstCX, y: dst.y + BLOCK_H }
    } else {
      const srcCY = src.y + BLOCK_H / 2
      const dstCY = dst.y + BLOCK_H / 2
      if (src.x + BLOCK_W <= dst.x) {
        srcPoint = { x: src.x + BLOCK_W, y: srcCY }
        dstPoint = { x: dst.x,           y: dstCY }
      } else {
        srcPoint = { x: src.x,           y: srcCY }
        dstPoint = { x: dst.x + BLOCK_W, y: dstCY }
      }
    }
    connections.push({
      key:       `${src.id}:${dst.id}:${keySuffix}`,
      protocol:  'power',
      wireCount: 1,
      color:     WIRE_COLOR.power,
      srcPoint,
      dstPoint,
    })
  }

  // ── Power bus connections (battery/PDB) ──────────────────────────────────
  // Draws thick red wires for: ESC←power_source, PDB←battery_assignment
  // Standard mode only.

  if (canvasMode === 'standard') {
    for (const c of components) {
      // ESC → power source (battery or PDB)
      if (c.defId === 'esc' && c.fields?.power_source) {
        addPowerWire(c, powerNodeMap[c.fields.power_source])
      }
      // PDB → battery
      if (c.defId === 'pdb' && c.fields?.battery_assignment) {
        addPowerWire(c, powerNodeMap[c.fields.battery_assignment])
      }
      // Battery monitor → battery (sense wire — gray, 2-strand)
      if (c.defId === 'battery_monitor' && c.fields?.battery_source) {
        const bat = powerNodeMap[c.fields.battery_source]
        if (bat && !bat.noCanvas) {
          const srcCY = c.y   + BLOCK_H / 2
          const batCY = bat.y + BLOCK_H / 2
          let srcPoint, dstPoint
          if (c.x + BLOCK_W <= bat.x) {
            srcPoint = { x: c.x + BLOCK_W, y: srcCY }
            dstPoint = { x: bat.x,         y: batCY }
          } else {
            srcPoint = { x: c.x,           y: srcCY }
            dstPoint = { x: bat.x + BLOCK_W, y: batCY }
          }
          connections.push({
            key:       `${c.id}:${bat.id}:sense`,
            protocol:  'analog',
            wireCount: WIRE_COUNT.analog,
            color:     WIRE_COLOR.analog,
            srcPoint,
            dstPoint,
          })
        }
      }
    }
  }

  // ── Non-DroneCAN connections (output_fc field) ───────────────────────────
  // Only shown in standard mode — these components are hidden in topology mode.

  if (canvasMode === 'standard') {
    // Group per FC so we can fan Y offsets
    const outputGroups = {}   // fcId → [comp, ...]
    const soloFcId = Object.keys(fcMap).length === 1 ? Object.keys(fcMap)[0] : null
    for (const c of components) {
      if (c.noCanvas) continue
      if (c.defId === 'autopilot_cube') continue
      if (c.defId === 'pdb') continue                          // PDB uses fc_power_rails (below)
      if (c.defId === 'motor') continue                        // motors connect to ESCs, not FC
      if (c.fields?.connection_type === 'dronecan') continue   // handled above
      // Use explicit output_fc, or auto-wire to the only FC when there is exactly one
      const fcId = c.fields?.output_fc || soloFcId
      if (!fcId || !fcMap[fcId]) continue
      if (!outputGroups[fcId]) outputGroups[fcId] = []
      outputGroups[fcId].push(c)
    }

    for (const [fcId, group] of Object.entries(outputGroups)) {
      const fc = fcMap[fcId]
      const total = group.length
      // FC right edge is the destination cluster point
      const fcRightX = fc.x + BLOCK_W
      const fcCenterY = fc.y + BLOCK_H / 2

      group.forEach((comp, idx) => {
        const protocol = comp.defId === 'pdb' ? 'power' : (comp.fields?.connection_type || 'pwm')
        // Fan wires vertically on the FC right edge
        const yOffset = (idx - (total - 1) / 2) * 7
        const dstPoint = { x: fcRightX, y: fcCenterY + yOffset }

        // Attach from the component edge closest to the FC
        const compRightX = comp.x + BLOCK_W
        const compCenterY = comp.y + BLOCK_H / 2
        let srcPoint
        if (comp.x > fcRightX) {
          // Component is to the right of FC — attach from left edge
          srcPoint = { x: comp.x, y: compCenterY }
        } else {
          // Component is left of (or overlapping) FC — attach from right edge
          srcPoint = { x: compRightX, y: compCenterY }
        }

        connections.push({
          key:       `${comp.id}:${fcId}`,
          protocol,
          wireCount: WIRE_COUNT[protocol] ?? 2,
          color:     WIRE_COLOR[protocol] ?? WIRE_COLOR.pwm,
          srcPoint,
          dstPoint,
        })
      })
    }

    // ── PDB→FC power rail (BEC) — fc_power_rails array ─────────────────────
    for (const c of components) {
      if (c.defId !== 'pdb' || c.noCanvas) continue
      const raw   = c.fields?.fc_power_rails
      const fcIds = Array.isArray(raw) ? raw : (raw ? [raw] : [])
      for (const fcId of fcIds) {
        const fc = fcMap[fcId]
        if (!fc) continue
        addPowerWire(c, fc, `${fcId}:bec`)
      }
    }

  }

  return connections
}

// ── Wire path computation ──────────────────────────────────────────────────

/**
 * Build the centerline path for a wire.
 * No waypoints → auto-route as H-V-H (3 orthogonal segments via midpoint X).
 * With waypoints → straight segments: src → wp[0] → … → wp[n] → dst.
 */
export function buildWirePath(srcPoint, dstPoint, waypoints) {
  if (!waypoints || waypoints.length === 0) {
    const midX = (srcPoint.x + dstPoint.x) / 2
    return [
      srcPoint,
      { x: midX, y: srcPoint.y },
      { x: midX, y: dstPoint.y },
      dstPoint,
    ]
  }
  return [srcPoint, ...waypoints, dstPoint]
}

// ── Parallel line math ─────────────────────────────────────────────────────

function unitPerp(ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 0.001) return { px: 0, py: 1 }
  return { px: -dy / len, py: dx / len }
}

/**
 * Given a wire centerline and wire count, return wireCount flat Konva `points`
 * arrays, each offset perpendicularly at evenly-spaced intervals.
 * Corners are handled with miter bisectors so parallel lines don't break apart.
 *
 * @param {Array<{x,y}>} pathPoints  ordered centerline vertices
 * @param {number}       wireCount   2 | 3 | 4
 * @param {number}       [gap=2.5]   px between adjacent lines
 * @returns {number[][]}             wireCount flat [x0,y0,x1,y1,...] arrays
 */
export function buildParallelLines(pathPoints, wireCount, gap = 2.5) {
  const n = pathPoints.length
  if (n < 2) return []

  // Compute effective per-vertex perpendicular vectors (with miter scaling at corners)
  const perps = []
  for (let j = 0; j < n; j++) {
    if (j === 0) {
      perps.push(unitPerp(pathPoints[0].x, pathPoints[0].y, pathPoints[1].x, pathPoints[1].y))
    } else if (j === n - 1) {
      perps.push(unitPerp(pathPoints[n-2].x, pathPoints[n-2].y, pathPoints[n-1].x, pathPoints[n-1].y))
    } else {
      const pIn  = unitPerp(pathPoints[j-1].x, pathPoints[j-1].y, pathPoints[j].x, pathPoints[j].y)
      const pOut = unitPerp(pathPoints[j].x, pathPoints[j].y, pathPoints[j+1].x, pathPoints[j+1].y)
      const bx = pIn.px + pOut.px
      const by = pIn.py + pOut.py
      const bLen = Math.sqrt(bx * bx + by * by)
      if (bLen < 0.001) {
        // 180° hairpin — bisector degenerate, just use incoming perp
        perps.push(pIn)
      } else {
        const bNx = bx / bLen
        const bNy = by / bLen
        const cosHalf = pIn.px * bNx + pIn.py * bNy
        const scale = Math.min(Math.abs(cosHalf) < 0.001 ? 4 : 1 / cosHalf, 4)
        perps.push({ px: bNx * scale, py: bNy * scale })
      }
    }
  }

  // Compute centered offsets for each wire strand
  const offsets = []
  for (let i = 0; i < wireCount; i++) {
    offsets.push((i - (wireCount - 1) / 2) * gap)
  }

  // Build one flat points array per wire strand
  const result = []
  for (let i = 0; i < wireCount; i++) {
    const pts = []
    for (let j = 0; j < n; j++) {
      pts.push(pathPoints[j].x + perps[j].px * offsets[i])
      pts.push(pathPoints[j].y + perps[j].py * offsets[i])
    }
    result.push(pts)
  }
  return result
}

// ── Waypoint insertion ─────────────────────────────────────────────────────

function ptSegDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq < 0.001) return Math.hypot(px - ax, py - ay)
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * Insert a new waypoint at clickWorld into the waypoints array.
 * Finds the nearest segment of the full pathPoints (including src and dst)
 * and inserts between the correct pair of existing waypoints.
 *
 * @param {Array<{x,y}>} waypoints   current waypoints (may be empty)
 * @param {{x,y}}        clickWorld  world-space click position
 * @param {Array<{x,y}>} pathPoints  full path (src + waypoints + dst)
 * @returns {Array<{x,y}>}           new waypoints array with insertion
 */
export function insertWaypoint(waypoints, clickWorld, pathPoints) {
  const n = pathPoints.length
  let bestDist = Infinity
  let bestSeg = 0
  for (let i = 0; i < n - 1; i++) {
    const d = ptSegDist(
      clickWorld.x, clickWorld.y,
      pathPoints[i].x, pathPoints[i].y,
      pathPoints[i+1].x, pathPoints[i+1].y,
    )
    if (d < bestDist) { bestDist = d; bestSeg = i }
  }
  // pathPoints[0] = src, pathPoints[1..n-2] = waypoints, pathPoints[n-1] = dst
  // bestSeg is the index of the pathPoints segment start.
  // The waypoint index to insert after = bestSeg - 1 (accounting for src at index 0).
  const insertAfter = bestSeg   // insert after waypoints[insertAfter - 1], i.e. at position bestSeg in waypoints
  const next = [...waypoints]
  next.splice(insertAfter, 0, { x: clickWorld.x, y: clickWorld.y })
  return next
}
