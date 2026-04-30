// AVC — ArduPilot Visual Configurator
// Copyright (C) 2026 Patternlynx Limited
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

/**
 * Built-in ArduPilot airframe SVG views.
 * Each entry: { id, label, icon, vehicles, top, bottom? }
 */

export function svgToUrl(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

// ── Shared colours ─────────────────────────────────────────────────────────
const ARM   = '#4b5563'
const BODY  = '#374151'
const MTR   = '#1f2937'
const MTR_S = '#6b7280'
const PROP  = '#374151'
const FWD   = '#3b82f6'
const TXT   = '#9ca3af'
const BG    = '#111827'
const SERVO = '#7c3aed'
const COAX  = '#065f46'

export function svgWrap(content, w = 800, h = 600) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  ${content}
</svg>`
}

export function motor(cx, cy, r = 28) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${MTR}" stroke="${MTR_S}" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy}" r="${r + 46}" fill="none" stroke="${PROP}" stroke-width="1.5" stroke-dasharray="6 4"/>`
}

export function coaxMotor(cx, cy, r = 28) {
  // Two concentric prop circles for coaxial motors
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${COAX}" stroke="${MTR_S}" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy}" r="${r + 30}" fill="none" stroke="${PROP}" stroke-width="1.5" stroke-dasharray="6 4"/>
  <circle cx="${cx}" cy="${cy}" r="${r + 52}" fill="none" stroke="${PROP}" stroke-width="1" stroke-dasharray="4 6" opacity="0.5"/>`
}

export function motorLabel(cx, cy, label) {
  return `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-family="monospace" font-size="13" fill="${TXT}">${label}</text>`
}

export function arm(x1, y1, x2, y2, w = 10) {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ARM}" stroke-width="${w}" stroke-linecap="round"/>`
}

export function fwdArrow(cx, cy) {
  return `<polygon points="${cx},${cy - 38} ${cx + 10},${cy - 18} ${cx},${cy - 25} ${cx - 10},${cy - 18}" fill="${FWD}"/>`
}

export function caption(text) {
  return `<text x="400" y="575" text-anchor="middle" font-family="system-ui" font-size="13" fill="${TXT}">${text}</text>`
}


// ── Quad X ─────────────────────────────────────────────────────────────────
const QX = { cx: 400, cy: 300 }
const quadXMotors = [
  { x: 220, y: 140, label: 'M1' },
  { x: 580, y: 140, label: 'M2' },
  { x: 580, y: 460, label: 'M3' },
  { x: 220, y: 460, label: 'M4' },
]
const QUAD_X_TOP = svgWrap(`
  ${quadXMotors.map(m => arm(QX.cx, QX.cy, m.x, m.y)).join('\n')}
  <polygon points="${QX.cx-22},${QX.cy-22} ${QX.cx+22},${QX.cy-22} ${QX.cx+22},${QX.cy+22} ${QX.cx-22},${QX.cy+22}" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${quadXMotors.map(m => motor(m.x, m.y)).join('\n')}
  ${quadXMotors.map(m => motorLabel(m.x, m.y, m.label)).join('\n')}
  ${fwdArrow(QX.cx, QX.cy)}
  ${caption('Quad X — Top view')}
`)
const QUAD_X_BOT = svgWrap(`
  ${quadXMotors.map(m => arm(QX.cx, QX.cy, m.x, m.y)).join('\n')}
  <polygon points="${QX.cx-22},${QX.cy-22} ${QX.cx+22},${QX.cy-22} ${QX.cx+22},${QX.cy+22} ${QX.cx-22},${QX.cy+22}" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${quadXMotors.map(m => motor(m.x, m.y)).join('\n')}
  ${quadXMotors.map((m, i) => motorLabel(m.x, m.y, ['M2','M1','M4','M3'][i])).join('\n')}
  ${fwdArrow(QX.cx, QX.cy)}
  ${caption('Quad X — Bottom view')}
`)

// ── Quad Plus ──────────────────────────────────────────────────────────────
const QUAD_PLUS_TOP = svgWrap(`
  ${arm(400, 300, 400, 115)} ${arm(400, 300, 615, 300)}
  ${arm(400, 300, 400, 485)} ${arm(400, 300, 185, 300)}
  <circle cx="400" cy="300" r="22" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${motor(400, 115)} ${motorLabel(400, 115, 'M1')}
  ${motor(615, 300)} ${motorLabel(615, 300, 'M2')}
  ${motor(400, 485)} ${motorLabel(400, 485, 'M3')}
  ${motor(185, 300)} ${motorLabel(185, 300, 'M4')}
  ${fwdArrow(400, 300)}
  ${caption('Quad + — Top view')}
`)

// ── Hexa X ─────────────────────────────────────────────────────────────────
const hexR = 195
const hexXMotors = Array.from({ length: 6 }, (_, i) => {
  const a = (i * 60 - 90) * Math.PI / 180
  return { x: Math.round(400 + hexR * Math.cos(a)), y: Math.round(300 + hexR * Math.sin(a)), label: `M${i+1}` }
})
const HEX_X_TOP = svgWrap(`
  ${hexXMotors.map(m => arm(400, 300, m.x, m.y, 9)).join('\n')}
  <circle cx="400" cy="300" r="24" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${hexXMotors.map(m => motor(m.x, m.y, 25)).join('\n')}
  ${hexXMotors.map(m => motorLabel(m.x, m.y, m.label)).join('\n')}
  ${fwdArrow(400, 300)}
  ${caption('Hex X — Top view')}
`)

// ── Hexa Plus ──────────────────────────────────────────────────────────────
const hexPlusMotors = Array.from({ length: 6 }, (_, i) => {
  const a = (i * 60 - 60) * Math.PI / 180   // starts pointing forward
  return { x: Math.round(400 + hexR * Math.cos(a)), y: Math.round(300 + hexR * Math.sin(a)), label: `M${i+1}` }
})
const HEX_PLUS_TOP = svgWrap(`
  ${hexPlusMotors.map(m => arm(400, 300, m.x, m.y, 9)).join('\n')}
  <circle cx="400" cy="300" r="24" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${hexPlusMotors.map(m => motor(m.x, m.y, 25)).join('\n')}
  ${hexPlusMotors.map(m => motorLabel(m.x, m.y, m.label)).join('\n')}
  ${fwdArrow(400, 300)}
  ${caption('Hex + — Top view')}
`)

// ── Octa X ─────────────────────────────────────────────────────────────────
const octR = 185
const octXMotors = Array.from({ length: 8 }, (_, i) => {
  const a = (i * 45 - 90 + 22.5) * Math.PI / 180
  return { x: Math.round(400 + octR * Math.cos(a)), y: Math.round(300 + octR * Math.sin(a)), label: `M${i+1}` }
})
const OCTA_X_TOP = svgWrap(`
  ${octXMotors.map(m => arm(400, 300, m.x, m.y, 8)).join('\n')}
  <circle cx="400" cy="300" r="26" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${octXMotors.map(m => motor(m.x, m.y, 22)).join('\n')}
  ${octXMotors.map(m => motorLabel(m.x, m.y, m.label)).join('\n')}
  ${fwdArrow(400, 300)}
  ${caption('Octa X — Top view')}
`)

// ── Octa Plus ──────────────────────────────────────────────────────────────
const octPlusMotors = Array.from({ length: 8 }, (_, i) => {
  const a = (i * 45 - 90) * Math.PI / 180
  return { x: Math.round(400 + octR * Math.cos(a)), y: Math.round(300 + octR * Math.sin(a)), label: `M${i+1}` }
})
const OCTA_PLUS_TOP = svgWrap(`
  ${octPlusMotors.map(m => arm(400, 300, m.x, m.y, 8)).join('\n')}
  <circle cx="400" cy="300" r="26" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${octPlusMotors.map(m => motor(m.x, m.y, 22)).join('\n')}
  ${octPlusMotors.map(m => motorLabel(m.x, m.y, m.label)).join('\n')}
  ${fwdArrow(400, 300)}
  ${caption('Octa + — Top view')}
`)

// ── X8 Coaxial ─────────────────────────────────────────────────────────────
const X8_TOP = svgWrap(`
  ${quadXMotors.map(m => arm(QX.cx, QX.cy, m.x, m.y)).join('\n')}
  <polygon points="${QX.cx-22},${QX.cy-22} ${QX.cx+22},${QX.cy-22} ${QX.cx+22},${QX.cy+22} ${QX.cx-22},${QX.cy+22}" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${quadXMotors.map(m => coaxMotor(m.x, m.y)).join('\n')}
  ${quadXMotors.map((m, i) => motorLabel(m.x, m.y - 10, `M${i*2+1}`)).join('\n')}
  ${quadXMotors.map((m, i) => `<text x="${m.x}" y="${m.y+18}" text-anchor="middle" font-family="monospace" font-size="11" fill="#6ee7b7">M${i*2+2}</text>`).join('\n')}
  ${fwdArrow(QX.cx, QX.cy)}
  <text x="640" y="100" font-family="system-ui" font-size="10" fill="#6ee7b7">lower motor</text>
  ${caption('X8 Coaxial — Top view (upper/lower)')}
`)

// ── Y6 Coaxial ─────────────────────────────────────────────────────────────
const y6Arms = [
  { x: 400, y: 130 },
  { x: 590, y: 445 },
  { x: 210, y: 445 },
]
const Y6_TOP = svgWrap(`
  ${y6Arms.map(m => arm(400, 310, m.x, m.y, 9)).join('\n')}
  <circle cx="400" cy="310" r="22" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${y6Arms.map(m => coaxMotor(m.x, m.y)).join('\n')}
  ${y6Arms.map((m, i) => motorLabel(m.x, m.y - 10, `M${i*2+1}`)).join('\n')}
  ${y6Arms.map((m, i) => `<text x="${m.x}" y="${m.y+18}" text-anchor="middle" font-family="monospace" font-size="11" fill="#6ee7b7">M${i*2+2}</text>`).join('\n')}
  ${fwdArrow(400, 310)}
  ${caption('Y6 Coaxial — Top view (upper/lower)')}
`)

// ── Tricopter ───────────────────────────────────────────────────────────────
const TRIC_TOP = svgWrap(`
  ${arm(400, 310, 400, 130)}
  ${arm(400, 310, 210, 440)}
  ${arm(400, 310, 590, 440)}
  <circle cx="400" cy="310" r="22" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${motor(400, 130)} ${motorLabel(400, 130, 'M1')}
  ${motor(210, 440)} ${motorLabel(210, 440, 'M2')}
  ${motor(590, 440)} ${motorLabel(590, 440, 'M3')}
  ${fwdArrow(400, 310)}
  ${caption('Tricopter — Top view')}
`)

// ── Bicopter ────────────────────────────────────────────────────────────────
const BICO_TOP = svgWrap(`
  ${arm(400, 300, 175, 300, 12)}
  ${arm(400, 300, 625, 300, 12)}
  <circle cx="400" cy="300" r="22" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${motor(175, 300, 32)} ${motorLabel(175, 300, 'M1')}
  ${motor(625, 300, 32)} ${motorLabel(625, 300, 'M2')}
  ${fwdArrow(400, 300)}
  ${caption('Bicopter — Top view')}
`)

// ── Fixed Wing ─────────────────────────────────────────────────────────────
const FIXED_WING_TOP = svgWrap(`
  <rect x="385" y="110" width="30" height="380" rx="12" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <path d="M400,260 L110,330 L110,355 L400,300 L690,355 L690,330 Z" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <path d="M400,440 L270,470 L270,485 L400,460 L530,485 L530,470 Z" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <rect x="394" y="430" width="12" height="55" rx="4" fill="${ARM}"/>
  ${fwdArrow(400, 220)}
  ${caption('Fixed Wing — Top view')}
`)

// ── Flying Wing ─────────────────────────────────────────────────────────────
const FLYING_WING_TOP = svgWrap(`
  <path d="M400,180 L90,420 L130,440 L400,270 L670,440 L710,420 Z" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <rect x="385" y="170" width="30" height="90" rx="8" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${motor(400, 185, 22)}
  <text x="400" y="172" text-anchor="middle" font-family="monospace" font-size="12" fill="${TXT}">M1</text>
  ${fwdArrow(400, 240)}
  ${caption('Flying Wing — Top view')}
`)

// ── Pusher Twin ─────────────────────────────────────────────────────────────
const TWIN_PUSHER_TOP = svgWrap(`
  <rect x="385" y="110" width="30" height="370" rx="12" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <path d="M400,250 L100,320 L100,345 L400,290 L700,345 L700,320 Z" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <path d="M400,430 L275,458 L275,472 L400,450 L525,472 L525,458 Z" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <rect x="394" y="422" width="12" height="52" rx="4" fill="${ARM}"/>
  ${motor(230, 320, 22)} <text x="230" y="290" text-anchor="middle" font-family="monospace" font-size="12" fill="${TXT}">M1</text>
  ${motor(570, 320, 22)} <text x="570" y="290" text-anchor="middle" font-family="monospace" font-size="12" fill="${TXT}">M2</text>
  ${fwdArrow(400, 210)}
  ${caption('Twin Pusher — Top view')}
`)

// ── VTOL Fixed Wing (no motors) ─────────────────────────────────────────────
const VTOL_FIXED_WING_TOP = svgWrap(`
  <rect x="385" y="110" width="30" height="380" rx="12" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <path d="M400,260 L110,330 L110,355 L400,300 L690,355 L690,330 Z" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <path d="M400,440 L270,470 L270,485 L400,460 L530,485 L530,470 Z" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <rect x="394" y="430" width="12" height="55" rx="4" fill="${ARM}"/>
  ${fwdArrow(400, 220)}
  ${caption('Fixed Wing VTOL — Top view')}
`)

// ── VTOL QuadPlane ──────────────────────────────────────────────────────────
const VTOL_TOP = svgWrap(`
  <rect x="385" y="110" width="30" height="360" rx="12" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <path d="M400,240 L90,305 L90,325 L400,280 L710,325 L710,305 Z" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <path d="M400,430 L285,455 L285,468 L400,448 L515,468 L515,455 Z" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${arm(400, 270, 155, 270, 8)} ${arm(400, 270, 645, 270, 8)}
  ${arm(400, 270, 155, 390, 8)} ${arm(400, 270, 645, 390, 8)}
  ${motor(155, 270, 24)} ${motorLabel(155, 270, 'M1')}
  ${motor(645, 270, 24)} ${motorLabel(645, 270, 'M2')}
  ${motor(155, 390, 24)} ${motorLabel(155, 390, 'M3')}
  ${motor(645, 390, 24)} ${motorLabel(645, 390, 'M4')}
  ${motor(400, 462, 18)} <text x="400" y="488" text-anchor="middle" font-family="monospace" font-size="12" fill="${TXT}">M5 (pusher)</text>
  ${fwdArrow(400, 180)}
  ${caption('VTOL QuadPlane — Top view')}
`)

// ── VTOL Tilt-Rotor ──────────────────────────────────────────────────────────
const VTOL_TILT_TOP = svgWrap(`
  <rect x="385" y="110" width="30" height="360" rx="12" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <path d="M400,245 L95,310 L95,330 L400,285 L705,330 L705,310 Z" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <path d="M400,432 L285,458 L285,470 L400,450 L515,470 L515,458 Z" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${motor(120, 318, 26)} ${motorLabel(120, 318, 'M1')}
  ${motor(680, 318, 26)} ${motorLabel(680, 318, 'M2')}
  ${motor(400, 445, 20)} <text x="400" y="472" text-anchor="middle" font-family="monospace" font-size="12" fill="${TXT}">M3 (rear)</text>
  ${fwdArrow(400, 185)}
  ${caption('VTOL Tilt-Rotor — Top view')}
`)

// ── VTOL Tailsitter ──────────────────────────────────────────────────────────
const VTOL_TAILSITTER_TOP = svgWrap(`
  <rect x="385" y="140" width="30" height="340" rx="12" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <path d="M400,280 L130,360 L130,380 L400,320 L670,380 L670,360 Z" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  <path d="M400,438 L300,470 L300,482 L400,456 L500,482 L500,470 Z" fill="${BODY}" stroke="${ARM}" stroke-width="1.5"/>
  ${motor(175, 368, 26)} ${motorLabel(175, 368, 'M1')}
  ${motor(625, 368, 26)} ${motorLabel(625, 368, 'M2')}
  <text x="400" y="530" text-anchor="middle" font-family="system-ui" font-size="10" fill="${TXT}">Hovers tail-down — motors can face up or down</text>
  ${fwdArrow(400, 210)}
  ${caption('VTOL Tailsitter — Top view')}
`)

// ── Exports ─────────────────────────────────────────────────────────────────
// frameClass / frameType map to FRAME_CLASS / FRAME_TYPE ArduPilot params.
// qFrameClass / qFrameType map to Q_FRAME_CLASS / Q_FRAME_TYPE for VTOL.
// Selecting a view auto-populates these fields in the frame_copter / frame_vtol component.
export const STANDARD_VIEWS = [
  // ── Copter ───────────────────────────────────────────────────────────────
  {
    id: 'quad_x',
    label: 'Quad X',
    icon: '✛',
    vehicles: ['copter'],
    motorCount: 4,
    frameClass: 1, frameType: 1,
    top: svgToUrl(QUAD_X_TOP),
    bottom: svgToUrl(QUAD_X_BOT),
  },
  {
    id: 'quad_plus',
    label: 'Quad +',
    icon: '➕',
    vehicles: ['copter'],
    motorCount: 4,
    frameClass: 1, frameType: 0,
    top: svgToUrl(QUAD_PLUS_TOP),
    bottom: null,
  },
  {
    id: 'hex_x',
    label: 'Hex X',
    icon: '⬡',
    vehicles: ['copter'],
    motorCount: 6,
    frameClass: 2, frameType: 1,
    top: svgToUrl(HEX_X_TOP),
    bottom: null,
  },
  {
    id: 'hex_plus',
    label: 'Hex +',
    icon: '⬡',
    vehicles: ['copter'],
    motorCount: 6,
    frameClass: 2, frameType: 0,
    top: svgToUrl(HEX_PLUS_TOP),
    bottom: null,
  },
  {
    id: 'octa_x',
    label: 'Octa X',
    icon: '✦',
    vehicles: ['copter'],
    motorCount: 8,
    frameClass: 3, frameType: 1,
    top: svgToUrl(OCTA_X_TOP),
    bottom: null,
  },
  {
    id: 'octa_plus',
    label: 'Octa +',
    icon: '✦',
    vehicles: ['copter'],
    motorCount: 8,
    frameClass: 3, frameType: 0,
    top: svgToUrl(OCTA_PLUS_TOP),
    bottom: null,
  },
  {
    id: 'x8',
    label: 'X8 Coaxial',
    icon: '⊗',
    vehicles: ['copter'],
    motorCount: 8,
    frameClass: 4, frameType: 1,
    top: svgToUrl(X8_TOP),
    bottom: null,
  },
  {
    id: 'y6',
    label: 'Y6 Coaxial',
    icon: '⑂',
    vehicles: ['copter'],
    motorCount: 6,
    frameClass: 5, frameType: 10,
    top: svgToUrl(Y6_TOP),
    bottom: null,
  },
  {
    id: 'tricopter',
    label: 'Tricopter',
    icon: '△',
    vehicles: ['copter'],
    motorCount: 3,
    frameClass: 7, frameType: 0,
    top: svgToUrl(TRIC_TOP),
    bottom: null,
  },
  {
    id: 'bicopter',
    label: 'Bicopter',
    icon: '⟺',
    vehicles: ['copter'],
    motorCount: 2,
    top: svgToUrl(BICO_TOP),
    bottom: null,
  },
  // ── Plane ────────────────────────────────────────────────────────────────
  {
    id: 'fixed_wing',
    label: 'Fixed Wing',
    icon: '✈',
    vehicles: ['plane'],
    motorCount: 1,
    top: svgToUrl(FIXED_WING_TOP),
    bottom: null,
  },
  {
    id: 'flying_wing',
    label: 'Flying Wing',
    icon: '🔺',
    vehicles: ['plane'],
    motorCount: 1,
    top: svgToUrl(FLYING_WING_TOP),
    bottom: null,
  },
  {
    id: 'twin_pusher',
    label: 'Twin Pusher',
    icon: '✈',
    vehicles: ['plane'],
    motorCount: 2,
    top: svgToUrl(TWIN_PUSHER_TOP),
    bottom: null,
  },
  // ── VTOL ────────────────────────────────────────────────────────────────
  {
    id: 'vtol_quadplane',
    label: 'QuadPlane',
    icon: '🔄',
    vehicles: ['vtol'],
    motorCount: 5,
    qFrameClass: 1, qFrameType: 1,
    top: svgToUrl(VTOL_TOP),
    bottom: null,
  },
  {
    id: 'vtol_tiltrotor',
    label: 'Tilt-Rotor',
    icon: '🔄',
    vehicles: ['vtol'],
    motorCount: 3,
    qFrameClass: 7, qFrameType: 0,
    top: svgToUrl(VTOL_TILT_TOP),
    bottom: null,
  },
  {
    id: 'vtol_tailsitter',
    label: 'Tailsitter',
    icon: '🔄',
    vehicles: ['vtol'],
    motorCount: 2,
    qFrameClass: 1, qFrameType: 1,
    top: svgToUrl(VTOL_TAILSITTER_TOP),
    bottom: null,
  },
  {
    id: 'vtol_fixed_wing',
    label: 'Fixed Wing',
    icon: '✈',
    vehicles: ['vtol'],
    motorCount: 0,
    top: svgToUrl(VTOL_FIXED_WING_TOP),
    bottom: null,
  },
]
