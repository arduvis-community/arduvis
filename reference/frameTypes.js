/**
 * frameTypes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Frame class / type definitions for all three vehicle types.
 * Used by:
 *   - FrameConfig panel (selector + motor diagram)
 *   - paramExporter (FRAME_CLASS, FRAME_TYPE, Q_FRAME_CLASS, Q_FRAME_TYPE)
 *   - Validation engine (motor count check)
 *
 * Motor positions are normalised to a unit circle (cx, cy) where:
 *   [0, 0] = centre of airframe
 *   Positive X = right (starboard)
 *   Positive Y = forward (nose)
 *   Values in range [-1, +1]
 *
 * Motor entries:
 *   { num, cx, cy, spin }
 *   num  = ArduPilot motor number (matches SERVOn_FUNCTION = 32 + num)
 *   cx   = canvas X position (−1 to +1)
 *   cy   = canvas Y position (−1 to +1)
 *   spin = 'cw' | 'ccw'
 */

// ─── ArduCopter frame types ───────────────────────────────────────────────────

export const COPTER_FRAMES = [

  // ── Quadcopter ──────────────────────────────────────────────────────────
  {
    id: 'quad_x',
    label: 'Quad X',
    frameClass: 1,
    frameType: 1,
    motorCount: 4,
    description: 'Standard quad, X configuration. Most common for racing and freestyle.',
    motors: [
      { num: 1, cx:  0.7, cy:  0.7, spin: 'ccw' },  // front-right
      { num: 2, cx: -0.7, cy:  0.7, spin: 'cw'  },  // front-left
      { num: 3, cx: -0.7, cy: -0.7, spin: 'ccw' },  // rear-left
      { num: 4, cx:  0.7, cy: -0.7, spin: 'cw'  },  // rear-right
    ],
  },
  {
    id: 'quad_plus',
    label: 'Quad +',
    frameClass: 1,
    frameType: 0,
    motorCount: 4,
    description: 'Quad, plus (+) configuration. Nose motor forward.',
    motors: [
      { num: 1, cx:  0,    cy:  1.0, spin: 'ccw' },  // front
      { num: 2, cx: -1.0,  cy:  0,   spin: 'cw'  },  // left
      { num: 3, cx:  0,    cy: -1.0, spin: 'ccw' },  // rear
      { num: 4, cx:  1.0,  cy:  0,   spin: 'cw'  },  // right
    ],
  },
  {
    id: 'quad_v',
    label: 'Quad V',
    frameClass: 1,
    frameType: 2,
    motorCount: 4,
    description: 'Quad, V configuration. Motors angled for efficiency.',
    motors: [
      { num: 1, cx:  0.95, cy:  0.31, spin: 'ccw' },
      { num: 2, cx: -0.95, cy:  0.31, spin: 'cw'  },
      { num: 3, cx: -0.59, cy: -0.81, spin: 'ccw' },
      { num: 4, cx:  0.59, cy: -0.81, spin: 'cw'  },
    ],
  },
  {
    id: 'quad_h',
    label: 'Quad H',
    frameClass: 1,
    frameType: 3,
    motorCount: 4,
    description: 'Quad, H configuration. Rectangular frame.',
    motors: [
      { num: 1, cx:  0.7, cy:  0.4, spin: 'ccw' },
      { num: 2, cx: -0.7, cy:  0.4, spin: 'cw'  },
      { num: 3, cx: -0.7, cy: -0.4, spin: 'ccw' },
      { num: 4, cx:  0.7, cy: -0.4, spin: 'cw'  },
    ],
  },
  {
    id: 'quad_vtail',
    label: 'Quad V-Tail',
    frameClass: 1,
    frameType: 4,
    motorCount: 4,
    description: 'Quad with V-tail configuration.',
    motors: [
      { num: 1, cx:  0.7,  cy:  0.7,  spin: 'ccw' },
      { num: 2, cx: -0.7,  cy:  0.7,  spin: 'cw'  },
      { num: 3, cx: -0.45, cy: -0.75, spin: 'ccw' },
      { num: 4, cx:  0.45, cy: -0.75, spin: 'cw'  },
    ],
  },
  {
    id: 'quad_bfx',
    label: 'BetaFlight X',
    frameClass: 1,
    frameType: 12,
    motorCount: 4,
    description: 'BetaFlight X motor numbering. Motor 1=rear-right, 2=front-right, 3=rear-left, 4=front-left.',
    motors: [
      { num: 1, cx:  0.7, cy: -0.7, spin: 'ccw' },  // rear-right
      { num: 2, cx:  0.7, cy:  0.7, spin: 'cw'  },  // front-right
      { num: 3, cx: -0.7, cy: -0.7, spin: 'cw'  },  // rear-left
      { num: 4, cx: -0.7, cy:  0.7, spin: 'ccw' },  // front-left
    ],
  },

  // ── Hexacopter ──────────────────────────────────────────────────────────
  {
    id: 'hex_x',
    label: 'Hex X',
    frameClass: 2,
    frameType: 1,
    motorCount: 6,
    description: 'Hexacopter, X configuration. Nose between two front motors.',
    motors: [
      { num: 1, cx:  0.5,  cy:  0.87, spin: 'ccw' },  // front-right
      { num: 2, cx: -0.5,  cy:  0.87, spin: 'cw'  },  // front-left
      { num: 3, cx: -1.0,  cy:  0,    spin: 'ccw' },  // left
      { num: 4, cx: -0.5,  cy: -0.87, spin: 'cw'  },  // rear-left
      { num: 5, cx:  0.5,  cy: -0.87, spin: 'ccw' },  // rear-right
      { num: 6, cx:  1.0,  cy:  0,    spin: 'cw'  },  // right
    ],
  },
  {
    id: 'hex_plus',
    label: 'Hex +',
    frameClass: 2,
    frameType: 0,
    motorCount: 6,
    description: 'Hexacopter, plus configuration. Nose motor forward.',
    motors: [
      { num: 1, cx:  0,    cy:  1.0,  spin: 'ccw' },  // front
      { num: 2, cx: -0.87, cy:  0.5,  spin: 'cw'  },  // front-left
      { num: 3, cx: -0.87, cy: -0.5,  spin: 'ccw' },  // rear-left
      { num: 4, cx:  0,    cy: -1.0,  spin: 'cw'  },  // rear
      { num: 5, cx:  0.87, cy: -0.5,  spin: 'ccw' },  // rear-right
      { num: 6, cx:  0.87, cy:  0.5,  spin: 'cw'  },  // front-right
    ],
  },

  // ── Octocopter ──────────────────────────────────────────────────────────
  {
    id: 'octo_x',
    label: 'Octo X',
    frameClass: 3,
    frameType: 1,
    motorCount: 8,
    description: 'Octocopter, X configuration. 8 individual arms.',
    motors: [
      { num: 1, cx:  0.38,  cy:  0.92, spin: 'ccw' },
      { num: 2, cx: -0.38,  cy:  0.92, spin: 'cw'  },
      { num: 3, cx: -0.92,  cy:  0.38, spin: 'ccw' },
      { num: 4, cx: -0.92,  cy: -0.38, spin: 'cw'  },
      { num: 5, cx: -0.38,  cy: -0.92, spin: 'ccw' },
      { num: 6, cx:  0.38,  cy: -0.92, spin: 'cw'  },
      { num: 7, cx:  0.92,  cy: -0.38, spin: 'ccw' },
      { num: 8, cx:  0.92,  cy:  0.38, spin: 'cw'  },
    ],
  },
  {
    id: 'octo_coax',
    label: 'Octo Coaxial',
    frameClass: 4,
    frameType: 1,
    motorCount: 8,
    description: 'Octocopter coaxial — 4 arms, 2 motors per arm (stacked). Motors 1–4 top, 5–8 bottom.',
    motors: [
      { num: 1, cx:  0.7,  cy:  0.7,  spin: 'ccw', layer: 'top' },
      { num: 2, cx: -0.7,  cy:  0.7,  spin: 'cw',  layer: 'top' },
      { num: 3, cx: -0.7,  cy: -0.7,  spin: 'ccw', layer: 'top' },
      { num: 4, cx:  0.7,  cy: -0.7,  spin: 'cw',  layer: 'top' },
      { num: 5, cx:  0.7,  cy:  0.7,  spin: 'cw',  layer: 'bot' },
      { num: 6, cx: -0.7,  cy:  0.7,  spin: 'ccw', layer: 'bot' },
      { num: 7, cx: -0.7,  cy: -0.7,  spin: 'cw',  layer: 'bot' },
      { num: 8, cx:  0.7,  cy: -0.7,  spin: 'ccw', layer: 'bot' },
    ],
  },

  // ── Y6 ─────────────────────────────────────────────────────────────────
  {
    id: 'y6b',
    label: 'Y6B',
    frameClass: 5,
    frameType: 10,
    motorCount: 6,
    description: 'Y6, rear-facing dominant motor (B variant). Common for heavy-lift Y frames.',
    motors: [
      { num: 1, cx:  0,    cy: -1.0, spin: 'ccw', layer: 'top' },
      { num: 2, cx:  0,    cy: -1.0, spin: 'cw',  layer: 'bot' },
      { num: 3, cx:  0.87, cy:  0.5, spin: 'cw',  layer: 'top' },
      { num: 4, cx:  0.87, cy:  0.5, spin: 'ccw', layer: 'bot' },
      { num: 5, cx: -0.87, cy:  0.5, spin: 'ccw', layer: 'top' },
      { num: 6, cx: -0.87, cy:  0.5, spin: 'cw',  layer: 'bot' },
    ],
  },

  // ── Tricopter ──────────────────────────────────────────────────────────
  {
    id: 'tri',
    label: 'Tricopter',
    frameClass: 7,
    frameType: 0,
    motorCount: 3,
    description: 'Tricopter, Y configuration with rear yaw servo.',
    motors: [
      { num: 1, cx:  0,    cy:  1.0, spin: 'ccw' },  // front
      { num: 2, cx: -0.87, cy: -0.5, spin: 'cw'  },  // rear-left
      { num: 3, cx:  0.87, cy: -0.5, spin: 'ccw' },  // rear-right
    ],
    extraServos: [
      { function: 39, label: 'Yaw servo (rear)', note: 'SERVOn_FUNCTION=39, typically MAIN OUT 4 or AUX1' },
    ],
  },

  // ── DodecaHex ──────────────────────────────────────────────────────────
  {
    id: 'dodeca_hex',
    label: 'DodecaHex',
    frameClass: 12,
    frameType: 1,
    motorCount: 12,
    description: '12-motor hexacopter coaxial variant.',
    motors: Array.from({ length: 12 }, (_, i) => {
      const arm = i % 6;
      const layer = i < 6 ? 'top' : 'bot';
      const angle = (arm * 60) * (Math.PI / 180);
      return {
        num: i + 1,
        cx: Math.sin(angle),
        cy: Math.cos(angle),
        spin: (i % 2 === 0) ? 'ccw' : 'cw',
        layer,
      };
    }),
  },
];

// ─── ArduPlane servo functions ────────────────────────────────────────────────
// These define which SERVO outputs are needed for each aircraft type.
// Used by the Frame panel to suggest servo assignments.

export const PLANE_CONFIGS = [
  {
    id: 'standard',
    label: 'Standard (aileron + elevator + rudder)',
    description: '3-axis fixed wing. Aileron(s), elevator, rudder, throttle.',
    requiredFunctions: [
      { function: 4,  label: 'Aileron (right)',  note: 'Add second output for left aileron if separate servos' },
      { function: 19, label: 'Elevator' },
      { function: 21, label: 'Rudder' },
      { function: 70, label: 'Throttle' },
    ],
    optionalFunctions: [
      { function: 24, label: 'Flap' },
      { function: 25, label: 'Flap Auto' },
    ],
  },
  {
    id: 'flying_wing',
    label: 'Flying wing (elevon)',
    description: 'No separate aileron/elevator — both handled by elevons.',
    requiredFunctions: [
      { function: 77, label: 'Left elevon (SERVO_FUNCTION 77)' },
      { function: 78, label: 'Right elevon (SERVO_FUNCTION 78)' },
      { function: 70, label: 'Throttle' },
    ],
    optionalFunctions: [],
    note: 'Set ELEVON_OUTPUT=1 in Frame (Plane) config.',
  },
  {
    id: 'vtail',
    label: 'V-tail',
    description: 'V-tail aircraft — rudder/elevator combined into two servo outputs.',
    requiredFunctions: [
      { function: 4,  label: 'Aileron' },
      { function: 19, label: 'V-tail left (elevator/rudder mix)' },
      { function: 21, label: 'V-tail right (elevator/rudder mix)' },
      { function: 70, label: 'Throttle' },
    ],
    optionalFunctions: [],
    note: 'Set ELEVON_OUTPUT=3 in Frame (Plane) config.',
  },
  {
    id: 'twin',
    label: 'Twin motor',
    description: 'Twin-engine aircraft with independent throttle control.',
    requiredFunctions: [
      { function: 4,  label: 'Aileron' },
      { function: 19, label: 'Elevator' },
      { function: 21, label: 'Rudder' },
      { function: 73, label: 'Throttle Left' },
      { function: 74, label: 'Throttle Right' },
    ],
    optionalFunctions: [
      { function: 24, label: 'Flap' },
    ],
  },
];

// ─── QuadPlane motor configs ──────────────────────────────────────────────────
// Motor positions for VTOL lift motors.
// Uses same position format as COPTER_FRAMES.

export const VTOL_MOTOR_FRAMES = [
  {
    id: 'vtol_quad_x',
    label: 'VTOL Quad X',
    qFrameClass: 1,
    qFrameType: 1,
    motorCount: 4,
    description: 'QuadPlane with 4 VTOL lift motors in X config, plus forward fixed-wing motor.',
    motors: [
      { num: 5, cx:  0.7, cy:  0.7, spin: 'ccw', note: 'Q_FRAME_CLASS=1: maps to SERVO5–SERVO8' },
      { num: 6, cx: -0.7, cy:  0.7, spin: 'cw'  },
      { num: 7, cx: -0.7, cy: -0.7, spin: 'ccw' },
      { num: 8, cx:  0.7, cy: -0.7, spin: 'cw'  },
    ],
    note: 'Forward cruise motor(s) assigned as Plane throttle on separate output.',
  },
  {
    id: 'vtol_quad_plus',
    label: 'VTOL Quad +',
    qFrameClass: 1,
    qFrameType: 0,
    motorCount: 4,
    motors: [
      { num: 5, cx:  0,    cy:  1.0, spin: 'ccw' },
      { num: 6, cx: -1.0,  cy:  0,   spin: 'cw'  },
      { num: 7, cx:  0,    cy: -1.0, spin: 'ccw' },
      { num: 8, cx:  1.0,  cy:  0,   spin: 'cw'  },
    ],
  },
  {
    id: 'vtol_hex_x',
    label: 'VTOL Hex X',
    qFrameClass: 2,
    qFrameType: 1,
    motorCount: 6,
    motors: [
      { num: 5,  cx:  0.5,  cy:  0.87, spin: 'ccw' },
      { num: 6,  cx: -0.5,  cy:  0.87, spin: 'cw'  },
      { num: 7,  cx: -1.0,  cy:  0,    spin: 'ccw' },
      { num: 8,  cx: -0.5,  cy: -0.87, spin: 'cw'  },
      { num: 9,  cx:  0.5,  cy: -0.87, spin: 'ccw' },
      { num: 10, cx:  1.0,  cy:  0,    spin: 'cw'  },
    ],
  },
  {
    id: 'vtol_tilt_bicopter',
    label: 'Tiltrotor (Bicopter)',
    qFrameClass: 1,
    qFrameType: 1,
    motorCount: 2,
    tiltEnabled: true,
    description: 'Two tilting front motors. Requires Q_TILT_ENABLE=1.',
    motors: [
      { num: 5, cx:  0.6, cy:  0.5, spin: 'ccw', tilt: true },
      { num: 6, cx: -0.6, cy:  0.5, spin: 'cw',  tilt: true },
    ],
    extraServos: [
      { function: 41, label: 'Tilt front motors (Q_TILT_MASK=3)' },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Get the Copter frame definition for a given FRAME_CLASS + FRAME_TYPE combo.
 */
export function getCopterFrame(frameClass, frameType) {
  return COPTER_FRAMES.find(
    f => f.frameClass === frameClass && f.frameType === frameType
  ) || null;
}

/**
 * Get all Copter frames for a given motor count.
 */
export function getCopterFramesByMotorCount(count) {
  return COPTER_FRAMES.filter(f => f.motorCount === count);
}

/**
 * Get the VTOL motor frame matching Q_FRAME_CLASS + Q_FRAME_TYPE.
 */
export function getVtolFrame(qFrameClass, qFrameType) {
  return VTOL_MOTOR_FRAMES.find(
    f => f.qFrameClass === qFrameClass && f.qFrameType === qFrameType
  ) || null;
}

/**
 * All unique frame classes for the Copter selector.
 */
export const COPTER_FRAME_CLASS_OPTIONS = [
  { value: 1,  label: 'Quad (4 motors)',         icon: '🚁' },
  { value: 2,  label: 'Hex (6 motors)',           icon: '🚁' },
  { value: 3,  label: 'Octo (8 motors)',          icon: '🚁' },
  { value: 4,  label: 'Octo Coax (8 motors)',     icon: '🚁' },
  { value: 5,  label: 'Y6 (6 motors, coaxial)',   icon: '🚁' },
  { value: 7,  label: 'Tri (3 motors)',           icon: '🚁' },
  { value: 12, label: 'DodecaHex (12 motors)',    icon: '🚁' },
];
