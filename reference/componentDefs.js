/**
 * componentDefs.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Master block schema for the ArduPilot Visual Configurator.
 *
 * STRUCTURE
 *   Each entry defines one draggable/configurable block.
 *   Fields:
 *     id          – unique string key
 *     label       – display name in palette + canvas chip
 *     category    – palette grouping
 *     icon        – emoji icon for palette + canvas
 *     vehicles    – ['copter','plane','vtol'] — which firmware variants expose this block
 *     virtual     – true = no canvas placement (config panel only, e.g. Frame, EKF)
 *     multi       – true = multiple instances allowed (e.g. 4 motors, 2 GPS)
 *     maxInstances – integer limit (default unlimited for multi:true)
 *     connections – array of Cube Orange connection types this block can use
 *     inspector   – ordered array of inspector field groups
 *       Each group: { label, fields: [ FieldDef ] }
 *       FieldDef:
 *         key        – local field key in component instance state
 *         label      – human label
 *         type       – 'pinSelect'|'select'|'multiselect'|'number'|'toggle'|'text'|'bitmask'|'info'
 *         options    – array of { value, label } for select/multiselect
 *         min/max    – for number type
 *         unit       – display unit string
 *         required   – blocks export until filled
 *         default    – default value
 *         dependsOn  – { field, value } — only show if sibling field equals value
 *         vehicle    – only show for this vehicle (overrides block-level)
 *         note       – inline help text
 *
 * CONVENTIONS
 *   Pin numbers follow Cube Orange AUX GPIO numbering:
 *     AUX1=54, AUX2=55, AUX3=56, AUX4=57, AUX5=58, AUX6=59
 *   MAIN OUT pin selectors are resolved by the paramExporter to SERVOn_ index.
 *   'n' in param names (e.g. SERVOn_FUNCTION) is a placeholder resolved at
 *   export time from the assigned output pin number.
 */

// ─── Shared option sets ──────────────────────────────────────────────────────

const ORIENTATION_OPTIONS = [
  { value: 0,   label: 'None (default)' },
  { value: 1,   label: 'Yaw 45°' },
  { value: 2,   label: 'Yaw 90°' },
  { value: 3,   label: 'Yaw 135°' },
  { value: 4,   label: 'Yaw 180°' },
  { value: 5,   label: 'Yaw 225°' },
  { value: 6,   label: 'Yaw 270°' },
  { value: 7,   label: 'Yaw 315°' },
  { value: 8,   label: 'Roll 180°' },
  { value: 9,   label: 'Roll 180°, Yaw 45°' },
  { value: 10,  label: 'Roll 180°, Yaw 90°' },
  { value: 11,  label: 'Roll 180°, Yaw 135°' },
  { value: 12,  label: 'Pitch 180°' },
  { value: 13,  label: 'Roll 180°, Yaw 225°' },
  { value: 14,  label: 'Roll 180°, Yaw 270°' },
  { value: 15,  label: 'Roll 180°, Yaw 315°' },
  { value: 16,  label: 'Roll 90°' },
  { value: 17,  label: 'Roll 90°, Yaw 45°' },
  { value: 18,  label: 'Roll 90°, Yaw 90°' },
  { value: 19,  label: 'Roll 90°, Yaw 135°' },
  { value: 20,  label: 'Roll 270°' },
  { value: 21,  label: 'Roll 270°, Yaw 45°' },
  { value: 22,  label: 'Roll 270°, Yaw 90°' },
  { value: 23,  label: 'Roll 270°, Yaw 135°' },
  { value: 24,  label: 'Pitch 90°' },
  { value: 25,  label: 'Pitch 270°' },
  { value: 26,  label: 'Pitch 180°, Yaw 90°' },
  { value: 27,  label: 'Pitch 180°, Yaw 270°' },
  { value: 28,  label: 'Roll 90°, Pitch 90°' },
  { value: 29,  label: 'Roll 180°, Pitch 90°' },
  { value: 30,  label: 'Roll 270°, Pitch 90°' },
  { value: 31,  label: 'Roll 90°, Pitch 180°' },
  { value: 32,  label: 'Roll 270°, Pitch 180°' },
  { value: 33,  label: 'Roll 90°, Pitch 270°' },
  { value: 34,  label: 'Roll 180°, Pitch 270°' },
  { value: 35,  label: 'Roll 270°, Pitch 270°' },
  { value: 36,  label: 'Roll 90°, Pitch 180°, Yaw 90°' },
  { value: 37,  label: 'Roll 90°, Yaw 270°' },
  { value: 38,  label: 'Roll 90°, Pitch 68°, Yaw 293°' },
  { value: 39,  label: 'Pitch 315°' },
  { value: 40,  label: 'Roll 90°, Pitch 315°' },
];

const SERIAL_BAUD_OPTIONS = [
  { value: 1,    label: '1200' },
  { value: 2,    label: '2400' },
  { value: 4,    label: '4800' },
  { value: 9,    label: '9600' },
  { value: 19,   label: '19200' },
  { value: 38,   label: '38400' },
  { value: 57,   label: '57600' },
  { value: 111,  label: '111100' },
  { value: 115,  label: '115200' },
  { value: 230,  label: '230400' },
  { value: 256,  label: '256000' },
  { value: 460,  label: '460800' },
  { value: 500,  label: '500000' },
  { value: 921,  label: '921600' },
  { value: 1500, label: '1500000' },
];

const UART_PORT_OPTIONS = [
  { value: 'SERIAL0', label: 'USB (SERIAL0)' },
  { value: 'SERIAL1', label: 'TELEM1 (SERIAL1)' },
  { value: 'SERIAL2', label: 'TELEM2 (SERIAL2)' },
  { value: 'SERIAL3', label: 'GPS1 (SERIAL3)' },
  { value: 'SERIAL4', label: 'GPS2 / SERIAL4' },
  { value: 'SERIAL5', label: 'SERIAL5' },
  { value: 'SERIAL6', label: 'SERIAL6 (if available)' },
];

const CAN_BUS_OPTIONS = [
  { value: 1, label: 'CAN1' },
  { value: 2, label: 'CAN2' },
];

const FAILSAFE_ACTION_COPTER = [
  { value: 0, label: 'None / disabled' },
  { value: 1, label: 'Land' },
  { value: 2, label: 'RTL' },
  { value: 3, label: 'SmartRTL' },
  { value: 4, label: 'SmartRTL or Land' },
  { value: 5, label: 'Terminate' },
];

const FAILSAFE_ACTION_PLANE = [
  { value: 0, label: 'None / disabled' },
  { value: 1, label: 'RTL' },
  { value: 2, label: 'Loiter' },
  { value: 3, label: 'FBWA' },
  { value: 6, label: 'Auto (continue mission)' },
  { value: 7, label: 'Circle and land' },
];

// ─── Block definitions ───────────────────────────────────────────────────────

export const COMPONENT_DEFS = [

  // ══════════════════════════════════════════════════════════════════════════
  // VEHICLE SETUP — virtual blocks (no canvas placement)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'frame_copter',
    label: 'Frame (Copter)',
    category: 'Vehicle Setup',
    icon: '🚁',
    vehicles: ['copter'],
    virtual: true,
    connections: [],
    inspector: [
      {
        label: 'Frame layout',
        fields: [
          {
            key: 'frame_class', label: 'Frame class', type: 'select', required: true, default: 1,
            note: 'Sets FRAME_CLASS. Determines motor mixing geometry.',
            options: [
              { value: 1,  label: 'Quad (4 motors)' },
              { value: 2,  label: 'Hex (6 motors)' },
              { value: 3,  label: 'Octo (8 motors)' },
              { value: 4,  label: 'Octo Coax (8 motors)' },
              { value: 5,  label: 'Y6 (6 motors, coaxial Y)' },
              { value: 7,  label: 'Tri (3 motors)' },
              { value: 10, label: 'Single / Conventional Heli' },
              { value: 11, label: 'Compound Heli' },
              { value: 12, label: 'Dodeca-Hex (12 motors)' },
            ],
          },
          {
            key: 'frame_type', label: 'Frame orientation', type: 'select', required: true, default: 1,
            note: 'Sets FRAME_TYPE. Controls which direction motors point.',
            options: [
              { value: 0,  label: 'Plus (+)' },
              { value: 1,  label: 'X' },
              { value: 2,  label: 'V' },
              { value: 3,  label: 'H' },
              { value: 4,  label: 'V-Tail' },
              { value: 5,  label: 'A-Tail' },
              { value: 10, label: 'Y6B' },
              { value: 11, label: 'Y6F (front motors spin CCW)' },
              { value: 12, label: 'BetaFlight X' },
              { value: 13, label: 'CW X' },
              { value: 14, label: 'I (dead-cat)' },
            ],
          },
        ],
      },
      {
        label: 'Motor behaviour',
        fields: [
          { key: 'mot_spin_arm',    label: 'Spin on arm (fraction)',       type: 'number', min: 0, max: 0.3,  default: 0.1,   unit: '0–0.3' },
          { key: 'mot_spin_min',    label: 'Min spin (thrust threshold)',  type: 'number', min: 0, max: 0.3,  default: 0.15,  unit: '0–0.3' },
          { key: 'mot_spin_max',    label: 'Max spin (fraction)',          type: 'number', min: 0.9, max: 1.0, default: 0.95, unit: '0.9–1.0' },
          { key: 'mot_thst_expo',   label: 'Thrust curve expo',            type: 'number', min: 0, max: 1.0,  default: 0.65,  unit: '0=linear' },
          { key: 'mot_thst_hover',  label: 'Hover throttle estimate',     type: 'number', min: 0.2, max: 0.8, default: 0.35, unit: 'fraction' },
          { key: 'mot_yaw_headroom',label: 'Yaw headroom (PWM)',          type: 'number', min: 0, max: 500,   default: 200,   unit: 'us' },
        ],
      },
    ],
  },

  {
    id: 'frame_plane',
    label: 'Frame (Plane)',
    category: 'Vehicle Setup',
    icon: '✈',
    vehicles: ['plane'],
    virtual: true,
    connections: [],
    inspector: [
      {
        label: 'Airspeed envelope',
        fields: [
          { key: 'airspeed_min',     label: 'Minimum airspeed',   type: 'number', min: 0, max: 100, required: true, default: 12, unit: 'm/s' },
          { key: 'airspeed_cruise',  label: 'Cruise airspeed',    type: 'number', min: 0, max: 100, required: true, default: 18, unit: 'm/s' },
          { key: 'airspeed_max',     label: 'Maximum airspeed',   type: 'number', min: 0, max: 200, required: true, default: 30, unit: 'm/s' },
          { key: 'stall_prevention', label: 'Stall prevention',   type: 'toggle', default: true },
        ],
      },
      {
        label: 'Pitch limits',
        fields: [
          { key: 'ptch_lim_max', label: 'Max pitch up',   type: 'number', min: 0,   max: 90,  required: true, default: 20,  unit: '°' },
          { key: 'ptch_lim_min', label: 'Max pitch down', type: 'number', min: -90, max: 0,   required: true, default: -20, unit: '°' },
        ],
      },
      {
        label: 'Roll limits',
        fields: [
          { key: 'roll_limit_deg', label: 'Max bank angle', type: 'number', min: 0, max: 90, default: 45, unit: '°' },
        ],
      },
      {
        label: 'Throttle',
        fields: [
          { key: 'thr_min',       label: 'Minimum throttle', type: 'number', min: 0,   max: 100, default: 0,   unit: '%' },
          { key: 'thr_max',       label: 'Maximum throttle', type: 'number', min: 0,   max: 100, default: 100, unit: '%' },
          { key: 'thr_slewrate',  label: 'Throttle slew rate', type: 'number', min: 0, max: 500, default: 0,   unit: '%/s, 0=disabled' },
          { key: 'thr_cruise',    label: 'Cruise throttle',  type: 'number', min: 0,   max: 100, default: 45,  unit: '%' },
        ],
      },
      {
        label: 'Mixing',
        fields: [
          { key: 'kff_rddrmix', label: 'Rudder mix factor', type: 'number', min: 0, max: 1, default: 0.5, unit: '0–1' },
          {
            key: 'elevon_output', label: 'Elevon / V-tail mixing', type: 'select', default: 0,
            note: 'Use for flying wings and V-tail aircraft.',
            options: [
              { value: 0, label: 'None (standard)' },
              { value: 1, label: 'Elevon (CH1=right, CH2=left)' },
              { value: 2, label: 'Elevon (CH1=left, CH2=right)' },
              { value: 3, label: 'V-tail' },
              { value: 4, label: 'Inverted V-tail' },
            ],
          },
        ],
      },
    ],
  },

  {
    id: 'frame_vtol',
    label: 'Frame (QuadPlane / VTOL)',
    category: 'Vehicle Setup',
    icon: '🔄',
    vehicles: ['vtol'],
    virtual: true,
    connections: [],
    inspector: [
      {
        label: 'QuadPlane enable',
        fields: [
          {
            key: 'q_enable', label: 'Enable QuadPlane', type: 'toggle', required: true, default: true,
            note: 'Sets Q_ENABLE=1. Firmware reboot required before Q_ params appear.',
          },
        ],
      },
      {
        label: 'VTOL frame layout',
        fields: [
          {
            key: 'q_frame_class', label: 'VTOL motor frame class', type: 'select', required: true, default: 1,
            options: [
              { value: 1, label: 'Quad' },
              { value: 2, label: 'Hex' },
              { value: 3, label: 'Octo' },
              { value: 5, label: 'Y6' },
              { value: 7, label: 'Tri' },
            ],
          },
          {
            key: 'q_frame_type', label: 'VTOL frame orientation', type: 'select', required: true, default: 1,
            options: [
              { value: 0, label: 'Plus (+)' },
              { value: 1, label: 'X' },
              { value: 2, label: 'V' },
              { value: 3, label: 'H' },
            ],
          },
        ],
      },
      {
        label: 'Tiltrotor',
        fields: [
          {
            key: 'q_tilt_enable', label: 'Tiltrotor type', type: 'select', default: 0,
            options: [
              { value: 0, label: 'Disabled (fixed VTOL motors)' },
              { value: 1, label: 'Bicopter' },
              { value: 2, label: 'Tricopter' },
              { value: 3, label: 'TriY6' },
            ],
          },
          { key: 'q_tilt_mask',     label: 'Tilt motor bitmask',       type: 'bitmask', dependsOn: { field: 'q_tilt_enable', value: '!0' } },
          { key: 'q_tilt_rate_up',  label: 'Tilt rate up',             type: 'number', min: 0, max: 500, default: 40,  unit: '°/s', dependsOn: { field: 'q_tilt_enable', value: '!0' } },
          { key: 'q_tilt_rate_dn',  label: 'Tilt rate down',           type: 'number', min: 0, max: 500, default: 40,  unit: '°/s', dependsOn: { field: 'q_tilt_enable', value: '!0' } },
          { key: 'q_tilt_yaw_angle',label: 'Tilt yaw angle (max)',     type: 'number', min: 0, max: 45,  default: 0,   unit: '°',   dependsOn: { field: 'q_tilt_enable', value: '!0' } },
        ],
      },
      {
        label: 'Transition',
        fields: [
          { key: 'q_transition_ms',  label: 'Transition time',          type: 'number', min: 0, max: 30000, default: 5000, unit: 'ms' },
          { key: 'q_vfwd_gain',      label: 'Forward velocity gain',    type: 'number', min: 0, max: 5,     default: 0.5,  unit: '' },
          { key: 'q_wvane_enable',   label: 'Weathervane (VTOL hover)', type: 'toggle', default: false },
        ],
      },
      {
        label: 'VTOL motor behaviour',
        fields: [
          { key: 'q_mot_spin_arm',  label: 'VTOL spin on arm', type: 'number', min: 0, max: 0.3, default: 0.1, unit: 'fraction' },
          { key: 'q_m_spin_min',    label: 'VTOL min spin',    type: 'number', min: 0, max: 0.3, default: 0.15, unit: 'fraction' },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PROPULSION — physical blocks
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'esc_motor_copter',
    label: 'ESC / Motor',
    category: 'Propulsion',
    icon: '⚡',
    vehicles: ['copter', 'vtol'],
    multi: true,
    maxInstances: 12,
    connections: ['MAIN OUT 1–8', 'AUX OUT 1–6'],
    inspector: [
      {
        label: 'Output assignment',
        fields: [
          {
            key: 'output_pin', label: 'Cube output pin', type: 'pinSelect', required: true,
            note: 'MAIN OUT 1–4 are DSHOT-capable (TIM1). MAIN OUT 5–8 on TIM4. AUX pins via IOMCU — DSHOT not supported on AUX.',
          },
          {
            key: 'motor_num', label: 'Motor number', type: 'select', required: true,
            note: 'Sets SERVOn_FUNCTION. Must match the motor position in your frame layout.',
            options: Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Motor ${i + 1}` })),
          },
        ],
      },
      {
        label: 'ESC protocol',
        fields: [
          {
            key: 'mot_pwm_type', label: 'ESC protocol', type: 'select', required: true, default: 5,
            note: 'Sets MOT_PWM_TYPE — applies to ALL motor outputs simultaneously. DSHOT requires timer-capable pins.',
            options: [
              { value: 0, label: 'PWM (standard 1000–2000µs)' },
              { value: 1, label: 'OneShot' },
              { value: 2, label: 'OneShot125' },
              { value: 3, label: 'Brushed' },
              { value: 4, label: 'DSHOT 150' },
              { value: 5, label: 'DSHOT 300' },
              { value: 6, label: 'DSHOT 600' },
              { value: 7, label: 'DSHOT 1200' },
              { value: 8, label: 'PWM Range' },
            ],
          },
          { key: 'mot_pwm_min', label: 'PWM minimum', type: 'number', min: 800, max: 1200, default: 1000, unit: 'µs', dependsOn: { field: 'mot_pwm_type', value: 0 } },
          { key: 'mot_pwm_max', label: 'PWM maximum', type: 'number', min: 1800, max: 2200, default: 2000, unit: 'µs', dependsOn: { field: 'mot_pwm_type', value: 0 } },
        ],
      },
      {
        label: 'BLHeli / ESC telemetry',
        fields: [
          {
            key: 'blheli_enabled', label: 'BLHeli32 passthrough', type: 'toggle', default: false,
            note: 'Enables SERVO_BLH_MASK bit for this output. Requires BLHeli32 or BLHeli-S ESC with telemetry signal wired to FC.',
          },
          { key: 'blheli_telem',   label: 'ESC telemetry (DSHOT)', type: 'toggle', default: false, dependsOn: { field: 'blheli_enabled', value: true } },
          { key: 'blheli_bidi',    label: 'Bidirectional DSHOT',   type: 'toggle', default: false, dependsOn: { field: 'blheli_enabled', value: true },
            note: 'Sets SERVO_BLH_BDMASK bit. Used by harmonic notch filter for RPM-based tracking.' },
          { key: 'blheli_poles',   label: 'Motor pole count',      type: 'number', min: 2, max: 42, default: 14, unit: 'poles',
            note: 'Used to convert ERPM to RPM for harmonic notch filter. Most 5" motors = 12, larger = 14.' },
          { key: 'blheli_trate',   label: 'Telemetry rate',        type: 'number', min: 0, max: 500, default: 10, unit: 'Hz', dependsOn: { field: 'blheli_telem', value: true } },
        ],
      },
      {
        label: 'Motor direction',
        fields: [
          {
            key: 'rotation',  label: 'Rotation', type: 'select', required: true, default: 'cw',
            options: [
              { value: 'cw',  label: 'Clockwise (CW)' },
              { value: 'ccw', label: 'Counter-clockwise (CCW)' },
            ],
          },
          { key: 'reversed', label: 'Reverse output (3D/reverse)', type: 'toggle', default: false,
            note: 'Sets SERVOn_REVERSED. Use for 3D ESCs or reversed motor wiring correction.' },
        ],
      },
    ],
  },

  {
    id: 'esc_plane',
    label: 'ESC / Throttle (Plane)',
    category: 'Propulsion',
    icon: '⚡',
    vehicles: ['plane'],
    multi: true,
    maxInstances: 4,
    connections: ['MAIN OUT 1–8', 'AUX OUT 1–6'],
    inspector: [
      {
        label: 'Output assignment',
        fields: [
          { key: 'output_pin',   label: 'Cube output pin',    type: 'pinSelect', required: true },
          {
            key: 'servo_function', label: 'Throttle function', type: 'select', required: true, default: 70,
            options: [
              { value: 70, label: '70 — Throttle (main)' },
              { value: 73, label: '73 — Throttle Left (twin)' },
              { value: 74, label: '74 — Throttle Right (twin)' },
            ],
          },
        ],
      },
      {
        label: 'PWM range',
        fields: [
          { key: 'servo_min',  label: 'Minimum PWM', type: 'number', min: 800,  max: 1200, default: 1000, unit: 'µs' },
          { key: 'servo_max',  label: 'Maximum PWM', type: 'number', min: 1800, max: 2200, default: 2000, unit: 'µs' },
          { key: 'servo_trim', label: 'Trim PWM',    type: 'number', min: 800,  max: 2200, default: 1000, unit: 'µs' },
          { key: 'reversed',   label: 'Reversed',    type: 'toggle', default: false },
        ],
      },
      {
        label: 'BLHeli / ESC telemetry',
        fields: [
          { key: 'blheli_enabled', label: 'BLHeli32 passthrough',  type: 'toggle', default: false },
          { key: 'blheli_telem',   label: 'ESC telemetry (DSHOT)', type: 'toggle', default: false, dependsOn: { field: 'blheli_enabled', value: true } },
          { key: 'blheli_poles',   label: 'Motor pole count',      type: 'number', min: 2, max: 42, default: 14, unit: 'poles' },
        ],
      },
    ],
  },

  {
    id: 'servo_surface',
    label: 'Servo (Control Surface)',
    category: 'Propulsion',
    icon: '↔',
    vehicles: ['plane', 'vtol'],
    multi: true,
    maxInstances: 16,
    connections: ['MAIN OUT 1–8', 'AUX OUT 1–6'],
    inspector: [
      {
        label: 'Output assignment',
        fields: [
          { key: 'output_pin', label: 'Cube output pin', type: 'pinSelect', required: true },
          {
            key: 'servo_function', label: 'Surface function', type: 'select', required: true,
            note: 'Sets SERVOn_FUNCTION. ArduPilot handles all mixing internally.',
            options: [
              { value: 4,   label: '4 — Aileron' },
              { value: 19,  label: '19 — Elevator' },
              { value: 21,  label: '21 — Rudder' },
              { value: 24,  label: '24 — Flap (manual)' },
              { value: 25,  label: '25 — Flap Auto' },
              { value: 26,  label: '26 — Flaperon (left)' },
              { value: 27,  label: '27 — Flaperon (right)' },
              { value: 29,  label: '29 — Landing Gear' },
              { value: 30,  label: '30 — Chute Deploy' },
              { value: 31,  label: '31 — Motor Tilt' },
              { value: 33,  label: '33 — VTOL Motor 1' },
              { value: 34,  label: '34 — VTOL Motor 2' },
              { value: 35,  label: '35 — VTOL Motor 3' },
              { value: 36,  label: '36 — VTOL Motor 4' },
              { value: 41,  label: '41 — Tilt Motor Front' },
              { value: 45,  label: '45 — Tilt Motor Rear' },
              { value: 46,  label: '46 — Tilt Motor Front Left' },
              { value: 47,  label: '47 — Tilt Motor Front Right' },
              { value: 51,  label: '51 — RC pass-through (ch 1)' },
              { value: 52,  label: '52 — RC pass-through (ch 2)' },
              { value: 53,  label: '53 — RC pass-through (ch 3)' },
              { value: 54,  label: '54 — RC pass-through (ch 4)' },
              { value: 55,  label: '55 — RC pass-through (ch 5)' },
              { value: 56,  label: '56 — RC pass-through (ch 6)' },
              { value: 58,  label: '58 — RC pass-through (ch 8)' },
              { value: 77,  label: '77 — Throttle Left (twin)' },
              { value: 78,  label: '78 — Throttle Right (twin)' },
              { value: 120, label: '120 — NeoPixel LED (1)' },
              { value: 121, label: '121 — NeoPixel LED (2)' },
              { value: 122, label: '122 — NeoPixel LED (3)' },
              { value: 123, label: '123 — NeoPixel LED (4)' },
              { value: 132, label: '132 — ProfiLED (1)' },
            ],
          },
        ],
      },
      {
        label: 'Travel limits',
        fields: [
          { key: 'servo_min',  label: 'Minimum PWM', type: 'number', min: 800,  max: 1500, default: 1000, unit: 'µs', required: true },
          { key: 'servo_max',  label: 'Maximum PWM', type: 'number', min: 1500, max: 2200, default: 2000, unit: 'µs', required: true },
          { key: 'servo_trim', label: 'Trim / neutral', type: 'number', min: 800, max: 2200, default: 1500, unit: 'µs', required: true },
          { key: 'reversed',   label: 'Reversed',    type: 'toggle', default: false },
          { key: 'servo_rate', label: 'Update rate',  type: 'number', min: 0, max: 400, default: 50, unit: 'Hz, 0=auto' },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SENSORS
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'gps',
    label: 'GPS / Compass',
    category: 'Sensors',
    icon: '📡',
    vehicles: ['copter', 'plane', 'vtol'],
    multi: true,
    maxInstances: 2,
    connections: ['GPS1 (SERIAL3)', 'GPS2 (SERIAL4)', 'CAN1', 'CAN2', 'I2C1', 'I2C2'],
    inspector: [
      {
        label: 'GPS type',
        fields: [
          {
            key: 'gps_type', label: 'GPS type', type: 'select', required: true, default: 1,
            options: [
              { value: 0,  label: '0 — None / disabled' },
              { value: 1,  label: '1 — u-blox (auto)' },
              { value: 2,  label: '2 — MTK' },
              { value: 3,  label: '3 — MTK19' },
              { value: 4,  label: '4 — NMEA' },
              { value: 5,  label: '5 — NMEA (strict)' },
              { value: 6,  label: '6 — SiRF' },
              { value: 7,  label: '7 — HIL' },
              { value: 8,  label: '8 — SwiftNav' },
              { value: 9,  label: '9 — DroneCAN (CAN bus)' },
              { value: 10, label: '10 — SBF (Septentrio)' },
              { value: 11, label: '11 — GSOF' },
              { value: 16, label: '16 — u-blox Moving Baseline (Base)' },
              { value: 17, label: '17 — u-blox Moving Baseline (Rover)' },
              { value: 19, label: '19 — MSP' },
              { value: 21, label: '21 — UBLOX-RTK-Rover' },
              { value: 22, label: '22 — UBLOX-RTK-Base' },
            ],
          },
          {
            key: 'instance', label: 'GPS instance', type: 'select', required: true, default: 1,
            options: [
              { value: 1, label: 'GPS 1 (primary)' },
              { value: 2, label: 'GPS 2 (secondary)' },
            ],
          },
        ],
      },
      {
        label: 'Connection',
        fields: [
          {
            key: 'serial_port', label: 'Serial port', type: 'select', required: true, default: 'SERIAL3',
            options: UART_PORT_OPTIONS.filter(o => ['SERIAL3','SERIAL4','SERIAL5','SERIAL6'].includes(o.value)),
            dependsOn: { field: 'gps_type', value: '!9' },
          },
          {
            key: 'serial_baud', label: 'Baud rate', type: 'select', default: 115,
            options: SERIAL_BAUD_OPTIONS,
            dependsOn: { field: 'gps_type', value: '!9' },
          },
          {
            key: 'can_bus',  label: 'CAN bus', type: 'select', default: 1,
            options: CAN_BUS_OPTIONS,
            dependsOn: { field: 'gps_type', value: 9 },
          },
          { key: 'gps_auto_config', label: 'Auto-configure GPS', type: 'toggle', default: true,
            note: 'Recommended for u-blox. Sets GPS_AUTO_CONFIG.' },
        ],
      },
      {
        label: 'u-blox configuration',
        fields: [
          {
            key: 'gps_navfilter', label: 'Navigation filter', type: 'select', default: 8,
            note: 'Airborne <4g is recommended for flying vehicles.',
            options: [
              { value: 0, label: '0 — Portable' },
              { value: 2, label: '2 — Stationary' },
              { value: 3, label: '3 — Pedestrian' },
              { value: 4, label: '4 — Automotive' },
              { value: 5, label: '5 — Sea' },
              { value: 6, label: '6 — Airborne <1g' },
              { value: 7, label: '7 — Airborne <2g' },
              { value: 8, label: '8 — Airborne <4g (recommended)' },
            ],
          },
          { key: 'gps_gnss_mode', label: 'GNSS systems (bitmask)', type: 'bitmask',
            note: 'Bit 0=GPS, 1=SBAS, 2=Galileo, 3=BeiDou, 5=GLONASS. 0=default (all available).',
            default: 0 },
        ],
      },
      {
        label: 'Compass',
        fields: [
          { key: 'compass_use',     label: 'Enable compass',           type: 'toggle', default: true },
          { key: 'compass_external',label: 'External compass',         type: 'toggle', default: true,
            note: 'Set false if using internal Cube compass only (not recommended).' },
          { key: 'compass_orient',  label: 'Compass orientation',      type: 'select', default: 0, options: ORIENTATION_OPTIONS },
          { key: 'compass_motor',   label: 'Motor compensation',       type: 'select', default: 0,
            options: [
              { value: 0, label: 'Disabled' },
              { value: 1, label: 'Throttle-based' },
              { value: 2, label: 'Current-based (requires battery monitor)' },
            ],
          },
        ],
      },
      {
        label: 'GPS for Yaw (dual GPS, RTK moving baseline)',
        fields: [
          { key: 'gps_yaw_enable',   label: 'Enable GPS yaw',        type: 'toggle', default: false,
            note: 'Requires second GPS set to Moving Baseline Rover. Uses GPS_TYPE2.' },
          { key: 'gps_mb_ant_x',     label: 'Baseline X offset',     type: 'number', min: -5, max: 5, default: 0, unit: 'm', dependsOn: { field: 'gps_yaw_enable', value: true } },
          { key: 'gps_mb_ant_y',     label: 'Baseline Y offset',     type: 'number', min: -5, max: 5, default: 0, unit: 'm', dependsOn: { field: 'gps_yaw_enable', value: true } },
          { key: 'gps_mb_ant_z',     label: 'Baseline Z offset',     type: 'number', min: -5, max: 5, default: 0, unit: 'm', dependsOn: { field: 'gps_yaw_enable', value: true } },
          { key: 'gps_yaw_offset',   label: 'Yaw offset from nose',  type: 'number', min: -180, max: 180, default: 0, unit: '°', dependsOn: { field: 'gps_yaw_enable', value: true } },
        ],
      },
    ],
  },

  {
    id: 'airspeed',
    label: 'Airspeed Sensor',
    category: 'Sensors',
    icon: '💨',
    vehicles: ['plane', 'vtol'],
    multi: true,
    maxInstances: 6,   // ARSPD_ through ARSPD6_ in live docs
    connections: ['I2C1', 'I2C2', 'ADC', 'CAN1'],
    inspector: [
      {
        label: 'Sensor type',
        fields: [
          {
            key: 'arspd_type', label: 'Sensor type', type: 'select', required: true, default: 1,
            options: [
              { value: 0,  label: '0 — None' },
              { value: 1,  label: '1 — I2C MS4525 (Pixhawk airspeed)' },
              { value: 2,  label: '2 — Analog (ADC pin)' },
              { value: 3,  label: '3 — I2C MS5525' },
              { value: 4,  label: '4 — I2C MS5525 (alternate address)' },
              { value: 5,  label: '5 — I2C DLVR-L10D' },
              { value: 6,  label: '6 — Analog (generic)' },
              { value: 7,  label: '7 — I2C-USD' },
              { value: 10, label: '10 — UAVCAN / DroneCAN' },
              { value: 11, label: '11 — NMEA water speed' },
              { value: 12, label: '12 — DLVR-I2C (alternate)' },
            ],
          },
          {
            key: 'arspd_use', label: 'Use for flight control', type: 'select', required: true, default: 1,
            options: [
              { value: 0, label: '0 — Never use' },
              { value: 1, label: '1 — Use when available' },
              { value: 2, label: '2 — Use + groundspeed sanity check' },
            ],
          },
          { key: 'instance', label: 'Sensor instance', type: 'select', default: 1,
            options: [1,2,3,4,5,6].map(n => ({ value: n, label: `Airspeed ${n}${n===1?' (primary)':''}` })) },
        ],
      },
      {
        label: 'Connection',
        fields: [
          {
            key: 'arspd_bus', label: 'I2C bus', type: 'select', default: 1,
            options: [{ value: 0, label: 'I2C bus 0' }, { value: 1, label: 'I2C bus 1' }, { value: 2, label: 'I2C bus 2 (external)' }],
            dependsOn: { field: 'arspd_type', value: [1, 3, 4, 5, 7, 12] },
          },
          {
            key: 'arspd_pin', label: 'ADC pin', type: 'select', default: 15,
            note: 'Only for analog sensor type. Cube Orange: ADC1=15, ADC2=13.',
            options: [{ value: 13, label: 'Pin 13 — ADC2' }, { value: 15, label: 'Pin 15 — ADC1' }],
            dependsOn: { field: 'arspd_type', value: [2, 6] },
          },
          {
            key: 'arspd_tube_order', label: 'Pitot tube order', type: 'select', default: 2,
            note: 'Sets ARSPD_TUBE_ORDER. Which tube is connected to which port on the sensor.',
            options: [
              { value: 0, label: '0 — MEAS port = dynamic (standard)' },
              { value: 1, label: '1 — MEAS port = static (reversed)' },
              { value: 2, label: '2 — Auto-detect' },
            ],
          },
        ],
      },
      {
        label: 'Calibration',
        fields: [
          { key: 'arspd_ratio',    label: 'Calibration ratio',      type: 'number', min: 1,   max: 4,   default: 1.9936, unit: '' },
          { key: 'arspd_offset',   label: 'Zero-wind offset',       type: 'number', min: -10,  max: 10,  default: 0,      unit: 'Pa' },
          { key: 'arspd_psi_range',label: 'PSI range of device',    type: 'number', min: 0,   max: 10,  default: 1,      unit: 'PSI',
            note: 'Sets ARSPD_PSI_RANGE. Sensor full-scale pressure range.' },
          { key: 'arspd_skip_cal', label: 'Skip boot calibration',  type: 'toggle', default: false,
            note: 'Set if sensor cannot be shielded from wind at boot.' },
          { key: 'arspd_autocal',  label: 'Auto-calibrate ratio',   type: 'toggle', default: false,
            note: 'Sets ARSPD_AUTOCAL. Continuously adjusts ratio to match GPS groundspeed.' },
        ],
      },
      {
        label: 'Global airspeed settings',
        fields: [
          {
            key: 'arspd_primary', label: 'Primary airspeed sensor', type: 'select', default: 0,
            note: 'Sets ARSPD_PRIMARY. Which instance is used for flight control.',
            options: [0,1,2,3,4,5].map(n => ({ value: n, label: `Sensor ${n+1}` })),
          },
          { key: 'arspd_wind_max',  label: 'Max wind vs groundspeed diff', type: 'number', min: 0, max: 100, default: 0, unit: 'm/s, 0=disabled',
            note: 'Sets ARSPD_WIND_MAX. Disables airspeed if wind estimation exceeds this.' },
          { key: 'arspd_wind_warn', label: 'Wind warning threshold',       type: 'number', min: 0, max: 100, default: 0, unit: 'm/s, 0=disabled' },
          { key: 'arspd_options',   label: 'Airspeed options (bitmask)',    type: 'bitmask', default: 0,
            note: 'Bit 0=disable use if unhealthy. Bit 1=autoselect. Bit 2=disable EKF airspeed fusion.' },
          { key: 'arspd_stall',     label: 'Stall airspeed',               type: 'number', min: 0, max: 50, default: 0, unit: 'm/s',
            note: 'Sets AIRSPEED_STALL. Used for stall prevention logic.' },
        ],
      },
    ],
  },

  {
    id: 'rangefinder',
    label: 'Rangefinder / Lidar',
    category: 'Sensors',
    icon: '📏',
    vehicles: ['copter', 'plane', 'vtol'],
    multi: true,
    maxInstances: 10,
    connections: ['UART (SERIAL4/5)', 'I2C1', 'I2C2', 'ADC', 'CAN1'],
    inspector: [
      {
        label: 'Sensor type',
        fields: [
          { key: 'instance', label: 'Sensor index', type: 'select', required: true, default: 1,
            options: Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `Rangefinder ${i + 1}` })) },
          {
            key: 'rngfnd_type', label: 'Sensor type', type: 'select', required: true, default: 0,
            options: [
              { value: 0,  label: '0 — None' },
              { value: 1,  label: '1 — Analog (ADC)' },
              { value: 2,  label: '2 — MaxSonar-I2C' },
              { value: 3,  label: '3 — MaxSonar-Analog' },
              { value: 4,  label: '4 — PulsedLight-I2C' },
              { value: 5,  label: '5 — PWM' },
              { value: 7,  label: '7 — LightWare SF10/11 I2C' },
              { value: 8,  label: '8 — LightWare Serial' },
              { value: 9,  label: '9 — HCSR04' },
              { value: 10, label: '10 — MAVLink' },
              { value: 14, label: '14 — Benewake TF02' },
              { value: 15, label: '15 — Benewake TF-Mini (UART)' },
              { value: 16, label: '16 — LightWare LW20 Serial' },
              { value: 17, label: '17 — DroneCAN' },
              { value: 18, label: '18 — NMEA' },
              { value: 19, label: '19 — UAVCAN/DroneCAN' },
              { value: 20, label: '20 — Benewake TF-Mini-Plus (I2C)' },
              { value: 21, label: '21 — Benewake TF-Mini-Plus (UART)' },
              { value: 22, label: '22 — Terraformer Micro' },
              { value: 24, label: '24 — TeraRanger EVO (UART)' },
              { value: 25, label: '25 — TeraRanger EVO (I2C)' },
              { value: 100,label: '100 — SITL (simulation only)' },
            ],
          },
          {
            key: 'rngfnd_orient', label: 'Orientation', type: 'select', required: true, default: 25,
            note: '25=Down is standard for terrain following / landing. 0=Forward for collision avoidance.',
            options: [
              { value: 0,  label: '0 — Forward' },
              { value: 1,  label: '1 — Forward-Right' },
              { value: 2,  label: '2 — Right' },
              { value: 3,  label: '3 — Back-Right' },
              { value: 4,  label: '4 — Back' },
              { value: 5,  label: '5 — Back-Left' },
              { value: 6,  label: '6 — Left' },
              { value: 7,  label: '7 — Forward-Left' },
              { value: 24, label: '24 — Up' },
              { value: 25, label: '25 — Down (altimeter / landing)' },
            ],
          },
        ],
      },
      {
        label: 'Connection',
        fields: [
          {
            key: 'serial_port', label: 'Serial port', type: 'select', default: 'SERIAL4',
            options: UART_PORT_OPTIONS,
            dependsOn: { field: 'rngfnd_type', value: [8, 10, 15, 16, 21, 24] },
          },
          { key: 'i2c_addr', label: 'I2C address (hex)', type: 'text', default: '0x62',
            dependsOn: { field: 'rngfnd_type', value: [2, 4, 7, 20, 25] } },
          { key: 'adc_pin', label: 'ADC pin', type: 'select', default: 15,
            options: [{ value: 13, label: 'Pin 13 — ADC2' }, { value: 15, label: 'Pin 15 — ADC1' }],
            dependsOn: { field: 'rngfnd_type', value: [1, 3] } },
        ],
      },
      {
        label: 'Range limits',
        fields: [
          { key: 'rngfnd_min', label: 'Minimum range', type: 'number', min: 0, max: 100,   default: 20,  unit: 'cm', required: true },
          { key: 'rngfnd_max', label: 'Maximum range', type: 'number', min: 10, max: 30000, default: 700, unit: 'cm', required: true },
          { key: 'rngfnd_gndclear', label: 'Ground clearance', type: 'number', min: 0, max: 500, default: 10, unit: 'cm',
            note: 'Distance from sensor to ground when landed.' },
        ],
      },
    ],
  },

  {
    id: 'optical_flow',
    label: 'Optical Flow',
    category: 'Sensors',
    icon: '👁',
    vehicles: ['copter', 'vtol'],
    multi: false,
    connections: ['UART (SERIAL4/5)', 'SPI', 'I2C1'],
    inspector: [
      {
        label: 'Sensor',
        fields: [
          {
            key: 'flow_type', label: 'Sensor type', type: 'select', required: true, default: 0,
            options: [
              { value: 0, label: '0 — None' },
              { value: 1, label: '1 — PX4FLOW I2C' },
              { value: 2, label: '2 — Pixart PAW3902' },
              { value: 3, label: '3 — Bebop' },
              { value: 4, label: '4 — CXOF' },
              { value: 5, label: '5 — MAVLink' },
              { value: 6, label: '6 — DroneCAN' },
              { value: 7, label: '7 — MSP' },
              { value: 8, label: '8 — UPFLOW' },
            ],
          },
          { key: 'flow_orient_yaw', label: 'Yaw rotation', type: 'number', min: -18000, max: 18000, default: 0, unit: 'centidegrees' },
        ],
      },
      {
        label: 'Position offset from IMU',
        fields: [
          { key: 'flow_pos_x', label: 'X offset', type: 'number', min: -5, max: 5, default: 0, unit: 'm' },
          { key: 'flow_pos_y', label: 'Y offset', type: 'number', min: -5, max: 5, default: 0, unit: 'm' },
          { key: 'flow_pos_z', label: 'Z offset', type: 'number', min: -5, max: 5, default: 0, unit: 'm' },
        ],
      },
    ],
  },

  {
    id: 'rpm_sensor',
    label: 'RPM Sensor',
    category: 'Sensors',
    icon: '🔄',
    vehicles: ['copter', 'plane', 'vtol'],
    multi: true,
    maxInstances: 2,
    connections: ['GPIO', 'AUX OUT 1–6'],
    inspector: [
      {
        label: 'Sensor',
        fields: [
          { key: 'instance', label: 'Instance', type: 'select', default: 1,
            options: [{ value: 1, label: 'RPM 1' }, { value: 2, label: 'RPM 2' }] },
          {
            key: 'rpm_type', label: 'Sensor type', type: 'select', required: true, default: 0,
            options: [
              { value: 0, label: '0 — Disabled' },
              { value: 1, label: '1 — PWM input' },
              { value: 2, label: '2 — UAVCAN / DroneCAN' },
              { value: 3, label: '3 — EFI (engine)' },
              { value: 5, label: '5 — ESC telemetry (BLHeli32)' },
            ],
          },
          { key: 'rpm_pin',     label: 'GPIO pin', type: 'number', min: 50, max: 60, default: 54,
            note: 'AUX1=54, AUX2=55, AUX3=56, AUX4=57, AUX5=58, AUX6=59',
            dependsOn: { field: 'rpm_type', value: 1 } },
          { key: 'rpm_scaling', label: 'Pulses per rev to RPM', type: 'number', min: 0.001, max: 1000, default: 1, unit: '' },
          { key: 'rpm_min',     label: 'Minimum valid RPM',    type: 'number', min: 0, max: 100000, default: 0 },
          { key: 'rpm_max',     label: 'Maximum valid RPM',    type: 'number', min: 0, max: 100000, default: 100000 },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // POWER
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'battery_monitor',
    label: 'Battery Monitor',
    category: 'Power',
    icon: '🔋',
    vehicles: ['copter', 'plane', 'vtol'],
    multi: true,
    maxInstances: 4,
    connections: ['ADC', 'I2C1', 'I2C2', 'SMBUS', 'CAN1'],
    inspector: [
      {
        label: 'Monitor type',
        fields: [
          { key: 'instance', label: 'Monitor instance', type: 'select', required: true, default: 1,
            options: [
              { value: 1, label: 'Battery 1 (BATT_)' },
              { value: 2, label: 'Battery 2 (BATT2_)' },
              { value: 3, label: 'Battery 3 (BATT3_)' },
              { value: 4, label: 'Battery 4 (BATT4_)' },
            ] },
          {
            key: 'batt_monitor', label: 'Monitor type', type: 'select', required: true, default: 4,
            options: [
              { value: 0,  label: '0 — Disabled' },
              { value: 3,  label: '3 — Analog voltage only' },
              { value: 4,  label: '4 — Analog voltage + current (Power Brick / Mauch)' },
              { value: 5,  label: '5 — Solo battery' },
              { value: 7,  label: '7 — SMBus-Maxell (smart battery)' },
              { value: 8,  label: '8 — DroneCAN BatteryInfo' },
              { value: 9,  label: '9 — BLHeli ESC current' },
              { value: 10, label: '10 — Sum of following monitors' },
              { value: 11, label: '11 — Fuel flow' },
              { value: 12, label: '12 — Fuel level PWM' },
              { value: 13, label: '13 — SMBUS-SUI3' },
              { value: 14, label: '14 — SMBUS-SUI6' },
              { value: 15, label: '15 — NeoDesign' },
              { value: 16, label: '16 — SMBus-Rotoye' },
              { value: 17, label: '17 — Maxell' },
              { value: 18, label: '18 — MPPT solar charger' },
              { value: 19, label: '19 — INA2XX I2C' },
              { value: 20, label: '20 — LTC2946 I2C' },
              { value: 21, label: '21 — Torqeedo motor' },
            ],
          },
          {
            key: 'preset', label: 'Hardware preset', type: 'select', default: 'custom',
            note: 'Selecting a preset fills voltage multiplier and current calibration automatically.',
            options: [
              { value: 'custom',        label: 'Custom / manual' },
              { value: 'cube_brick',    label: 'Cube Power Brick (original)' },
              { value: 'cube_brick_mini', label: 'Cube Power Brick Mini' },
              { value: 'mauch_hs_050', label: 'Mauch HS-050-HV' },
              { value: 'mauch_hs_100', label: 'Mauch HS-100-HV' },
              { value: 'mauch_hs_200', label: 'Mauch HS-200-HV' },
              { value: 'holybro_pm06', label: 'Holybro PM06 V2' },
              { value: 'zubax_gnss',   label: 'Zubax GNSS (DroneCAN)' },
            ],
          },
        ],
      },
      {
        label: 'ADC pins',
        fields: [
          {
            key: 'volt_pin', label: 'Voltage sense pin', type: 'select', required: true, default: 14,
            note: 'Cube Orange: Pin 14 = POWER_ADC1 (Power Brick connector), Pin 13 = ADC2.',
            options: [
              { value: 13, label: 'Pin 13 — ADC2 / POWER2' },
              { value: 14, label: 'Pin 14 — ADC1 / POWER1' },
              { value: -1, label: 'None / DroneCAN' },
            ],
          },
          {
            key: 'curr_pin', label: 'Current sense pin', type: 'select', default: 15,
            options: [
              { value: 15, label: 'Pin 15 — CURR1' },
              { value: 4,  label: 'Pin 4 — CURR2' },
              { value: -1, label: 'None / voltage-only monitor' },
            ],
          },
        ],
      },
      {
        label: 'Calibration',
        fields: [
          { key: 'volt_mult',    label: 'Voltage multiplier',    type: 'number', min: 0, max: 50,   default: 10.1, unit: 'V/V', required: true,
            note: 'Power Brick = 10.1. Mauch = see Mauch calibration sheet.' },
          { key: 'amp_pervlt',   label: 'Amps per volt',         type: 'number', min: 0, max: 1000, default: 17.0, unit: 'A/V',
            note: 'Power Brick original = 17.0. Mauch 50A = 50/3.3.' },
          { key: 'amp_offset',   label: 'Current offset',        type: 'number', min: -5, max: 5,   default: 0,   unit: 'V' },
          { key: 'batt_capacity',label: 'Battery capacity',      type: 'number', min: 0, max: 100000, default: 5000, unit: 'mAh' },
        ],
      },
      {
        label: 'Failsafe thresholds',
        fields: [
          { key: 'low_volt',  label: 'Low voltage warning',    type: 'number', min: 0, max: 60, default: 0, unit: 'V, 0=disabled' },
          { key: 'crt_volt',  label: 'Critical voltage',       type: 'number', min: 0, max: 60, default: 0, unit: 'V, 0=disabled' },
          { key: 'low_mah',   label: 'Low mAh remaining',      type: 'number', min: 0, max: 100000, default: 0, unit: 'mAh, 0=disabled' },
          {
            key: 'fs_low_act', label: 'Low battery action', type: 'select', default: 0,
            options: FAILSAFE_ACTION_COPTER,
            vehicle: 'copter',
          },
          {
            key: 'fs_crt_act', label: 'Critical battery action', type: 'select', default: 1,
            options: FAILSAFE_ACTION_COPTER,
            vehicle: 'copter',
          },
          {
            key: 'fs_low_act', label: 'Low battery action', type: 'select', default: 0,
            options: FAILSAFE_ACTION_PLANE,
            vehicle: 'plane',
          },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // RC / GCS
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'rc_input',
    label: 'RC Input',
    category: 'RC / GCS',
    icon: '📶',
    vehicles: ['copter', 'plane', 'vtol'],
    multi: false,
    connections: ['RCIN port', 'SERIAL1', 'SERIAL2', 'SERIAL4', 'SERIAL5'],
    inspector: [
      {
        label: 'Protocol',
        fields: [
          {
            key: 'rc_protocols', label: 'RC protocol(s)', type: 'multiselect', required: true,
            note: 'Sets RC_PROTOCOLS bitmask. SBUS connects to the dedicated RCIN port. CRSF/ELRS/FPort require a UART.',
            options: [
              { value: 1,    label: 'All (auto-detect)' },
              { value: 2,    label: 'PPM' },
              { value: 4,    label: 'IBUS' },
              { value: 8,    label: 'SBUS (most receivers)' },
              { value: 16,   label: 'SBUS (non-inverted)' },
              { value: 32,   label: 'DSM (Spektrum)' },
              { value: 64,   label: 'SUMD (Graupner)' },
              { value: 128,  label: 'SRXL' },
              { value: 256,  label: 'SRXL2' },
              { value: 512,  label: 'CRSF / TBS / ExpressLRS' },
              { value: 1024, label: 'ST24 (Yuneec)' },
              { value: 2048, label: 'FPort (FrSky)' },
              { value: 4096, label: 'FPort2 (FrSky)' },
              { value: 8192, label: 'DSM-SBus' },
            ],
          },
          {
            key: 'rc_uart', label: 'UART port (CRSF/FPort/SRXL2)', type: 'select', default: 'SERIAL2',
            note: 'Only required for non-SBUS protocols using a UART. Sets SERIALn_PROTOCOL=23 or 28.',
            options: UART_PORT_OPTIONS,
          },
        ],
      },
      {
        label: 'RSSI',
        fields: [
          {
            key: 'rssi_type', label: 'RSSI source', type: 'select', default: 0,
            options: [
              { value: 0, label: '0 — Disabled' },
              { value: 1, label: '1 — Analog pin' },
              { value: 2, label: '2 — RC channel (dedicated)' },
              { value: 3, label: '3 — Receiver protocol (CRSF/SBUS)' },
              { value: 4, label: '4 — PWM input pin' },
            ],
          },
        ],
      },
      {
        label: 'Update rate',
        fields: [
          { key: 'rc_speed', label: 'RC/servo output rate', type: 'number', min: 25, max: 400, default: 400, unit: 'Hz',
            note: 'Set 400 Hz for DSHOT. Leave at 50 Hz for standard analog servos.' },
        ],
      },
    ],
  },

  {
    id: 'telemetry',
    label: 'Telemetry Radio',
    category: 'RC / GCS',
    icon: '📻',
    vehicles: ['copter', 'plane', 'vtol'],
    multi: true,
    maxInstances: 2,
    connections: ['TELEM1 (SERIAL1)', 'TELEM2 (SERIAL2)'],
    inspector: [
      {
        label: 'Connection',
        fields: [
          {
            key: 'serial_port', label: 'Serial port', type: 'select', required: true, default: 'SERIAL1',
            options: UART_PORT_OPTIONS,
          },
          {
            key: 'protocol', label: 'MAVLink version', type: 'select', required: true, default: 2,
            options: [
              { value: 1, label: 'MAVLink 1' },
              { value: 2, label: 'MAVLink 2 (recommended)' },
            ],
          },
          { key: 'baud', label: 'Baud rate', type: 'select', required: true, default: 57,
            options: SERIAL_BAUD_OPTIONS },
        ],
      },
      {
        label: 'MAVLink',
        fields: [
          { key: 'sysid_thismav', label: 'System ID', type: 'number', min: 1, max: 255, default: 1 },
          { key: 'stream_rate',   label: 'Stream rate', type: 'number', min: 0, max: 50, default: 4, unit: 'Hz' },
        ],
      },
    ],
  },

  {
    id: 'companion',
    label: 'Companion Computer',
    category: 'RC / GCS',
    icon: '💻',
    vehicles: ['copter', 'plane', 'vtol'],
    multi: false,
    connections: ['TELEM2 (SERIAL2)', 'SERIAL4', 'SERIAL5'],
    inspector: [
      {
        label: 'Connection',
        fields: [
          { key: 'serial_port', label: 'Serial port', type: 'select', required: true, default: 'SERIAL2', options: UART_PORT_OPTIONS },
          { key: 'protocol', label: 'Protocol', type: 'select', required: true, default: 2,
            options: [{ value: 2, label: 'MAVLink 2 (MAVROS / pymavlink)' }, { value: 1, label: 'MAVLink 1' }] },
          { key: 'baud', label: 'Baud rate', type: 'select', required: true, default: 921, options: SERIAL_BAUD_OPTIONS },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PERIPHERALS
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'can_bus',
    label: 'CAN / DroneCAN',
    category: 'Peripherals',
    icon: '🔗',
    vehicles: ['copter', 'plane', 'vtol'],
    virtual: true,
    connections: ['CAN1', 'CAN2'],
    inspector: [
      {
        label: 'CAN bus configuration',
        fields: [
          {
            key: 'can_p1_driver', label: 'CAN1 driver', type: 'select', required: true, default: 1,
            note: 'Reboot required after enabling. Sets CAN_P1_DRIVER.',
            options: [
              { value: 0, label: '0 — None (disabled)' },
              { value: 1, label: '1 — DroneCAN (UAVCAN v0)' },
              { value: 4, label: '4 — PiccoloCAN (Velocity ESC)' },
              { value: 6, label: '6 — EFI-NWPMU' },
              { value: 8, label: '8 — Scripting' },
            ],
          },
          {
            key: 'can_p2_driver', label: 'CAN2 driver', type: 'select', default: 0,
            options: [
              { value: 0, label: '0 — None (disabled)' },
              { value: 1, label: '1 — DroneCAN' },
              { value: 4, label: '4 — PiccoloCAN' },
            ],
          },
          { key: 'can_p1_bitrate', label: 'CAN1 bitrate', type: 'select', default: 1000000,
            options: [
              { value: 1000000, label: '1 Mbit/s (DroneCAN default)' },
              { value: 500000,  label: '500 kbit/s' },
              { value: 250000,  label: '250 kbit/s' },
            ] },
          { key: 'can_d1_uc_node', label: 'This node ID (autopilot)', type: 'number', min: 1, max: 127, default: 10 },
        ],
      },
      {
        label: 'DroneCAN ESC outputs',
        fields: [
          { key: 'can_d1_uc_esc_bm', label: 'ESC output bitmask', type: 'bitmask',
            note: 'Bit n enables DroneCAN ESC command for motor n+1. Must also set SERVOn_FUNCTION.' },
        ],
      },
      {
        label: 'DroneCAN GPS / peripherals',
        fields: [
          { key: 'can_d1_uc_option', label: 'DroneCAN options bitmask', type: 'bitmask',
            note: 'Bit 0 = Enable forward MAVLink over CAN. Bit 1 = Enable CAN safety state.' },
          { key: 'can_d1_uc_pool', label: 'Memory pool size', type: 'number', min: 4096, max: 65536, default: 4096, unit: 'bytes' },
        ],
      },
    ],
  },

  {
    id: 'led_notify',
    label: 'LED / Buzzer',
    category: 'Peripherals',
    icon: '💡',
    vehicles: ['copter', 'plane', 'vtol'],
    multi: false,
    connections: ['AUX OUT 1–6', 'GPIO', 'CAN1'],
    inspector: [
      {
        label: 'LED type',
        fields: [
          { key: 'ntf_led_types', label: 'LED type (bitmask)', type: 'bitmask',
            note: 'Bit 0=External/ProfiLED, Bit 1=NeoPixel, Bit 5=ProfiLED, Bit 7=DroneCAN.',
            default: 2 },
          {
            key: 'output_pin', label: 'Output pin (NeoPixel/ProfiLED)', type: 'pinSelect',
            note: 'Assign AUX pin and set SERVOn_FUNCTION=120 (NeoPixel1) or 132 (ProfiLED1).',
          },
          { key: 'ntf_led_bright', label: 'Brightness', type: 'select', default: 2,
            options: [
              { value: 0, label: '0 — Low' },
              { value: 1, label: '1 — Medium' },
              { value: 2, label: '2 — High' },
              { value: 3, label: '3 — Maximum' },
            ] },
        ],
      },
      {
        label: 'Buzzer',
        fields: [
          { key: 'ntf_buzz_types', label: 'Buzzer type (bitmask)', type: 'bitmask',
            note: 'Bit 0=Pixhawk built-in, Bit 1=DroneCAN buzzer.', default: 1 },
          { key: 'ntf_buzz_volume', label: 'Volume', type: 'number', min: 0, max: 100, default: 100, unit: '%' },
        ],
      },
    ],
  },

  {
    id: 'camera_trigger',
    label: 'Camera Trigger',
    category: 'Peripherals',
    icon: '📷',
    vehicles: ['copter', 'plane', 'vtol'],
    multi: false,
    connections: ['AUX OUT 1–6', 'GPIO'],
    inspector: [
      {
        label: 'Trigger type',
        fields: [
          {
            key: 'cam_trigg_type', label: 'Trigger type', type: 'select', required: true, default: 0,
            options: [
              { value: 0, label: '0 — Servo pulse' },
              { value: 1, label: '1 — GPIO relay' },
              { value: 2, label: '2 — GoPro (Solo specific)' },
              { value: 3, label: '3 — Mount trigger' },
            ],
          },
          { key: 'output_pin',    label: 'Output pin',          type: 'pinSelect', required: true },
          { key: 'cam_duration',  label: 'Shutter duration',    type: 'number', min: 1, max: 50, default: 10, unit: '×100ms' },
          { key: 'cam_servo_on',  label: 'PWM when triggered',  type: 'number', min: 1000, max: 2000, default: 1800, unit: 'µs', dependsOn: { field: 'cam_trigg_type', value: 0 } },
          { key: 'cam_servo_off', label: 'PWM when idle',       type: 'number', min: 1000, max: 2000, default: 1200, unit: 'µs', dependsOn: { field: 'cam_trigg_type', value: 0 } },
          { key: 'cam_relay_on',  label: 'Relay on = high',     type: 'toggle', default: true, dependsOn: { field: 'cam_trigg_type', value: 1 } },
        ],
      },
      {
        label: 'Shutter feedback',
        fields: [
          { key: 'cam_feedback_pin', label: 'Feedback GPIO pin',  type: 'number', min: 50, max: 60, default: -1, unit: '-1=disabled' },
          { key: 'cam_feedback_pol', label: 'Feedback polarity',  type: 'select', default: 0,
            options: [{ value: 0, label: 'Active low' }, { value: 1, label: 'Active high' }] },
        ],
      },
      {
        label: 'Gimbal / mount',
        fields: [
          {
            key: 'mnt_type', label: 'Mount type', type: 'select', default: 0,
            options: [
              { value: 0, label: '0 — None' },
              { value: 1, label: '1 — Servo' },
              { value: 2, label: '2 — 3DR Solo gimbal' },
              { value: 4, label: '4 — Brushless direct (PWM)' },
              { value: 5, label: '5 — DroneCAN' },
              { value: 6, label: '6 — SToRM32 MAVLink' },
              { value: 7, label: '7 — SToRM32 serial' },
            ],
          },
        ],
      },
    ],
  },

  {
    id: 'parachute',
    label: 'Parachute',
    category: 'Peripherals',
    icon: '🪂',
    vehicles: ['copter', 'vtol'],
    multi: false,
    connections: ['AUX OUT 1–6', 'GPIO'],
    inspector: [
      {
        label: 'Release mechanism',
        fields: [
          { key: 'chute_enabled', label: 'Enable parachute', type: 'toggle', required: true, default: false },
          {
            key: 'chute_type', label: 'Release type', type: 'select', required: true, default: 0,
            options: [{ value: 0, label: '0 — Relay / GPIO' }, { value: 1, label: '1 — Servo' }],
          },
          { key: 'output_pin',      label: 'Output pin',           type: 'pinSelect', required: true },
          { key: 'chute_servo_on',  label: 'Servo PWM (deployed)', type: 'number', min: 1000, max: 2000, default: 1800, unit: 'µs', dependsOn: { field: 'chute_type', value: 1 } },
          { key: 'chute_servo_off', label: 'Servo PWM (stowed)',   type: 'number', min: 1000, max: 2000, default: 1200, unit: 'µs', dependsOn: { field: 'chute_type', value: 1 } },
        ],
      },
      {
        label: 'Deployment conditions',
        fields: [
          { key: 'chute_alt_min',   label: 'Minimum altitude',   type: 'number', min: 0,   max: 1000, default: 10,  unit: 'm, 0=no limit' },
          { key: 'chute_delay_ms',  label: 'Delay after crash',  type: 'number', min: 0,   max: 5000, default: 1000, unit: 'ms' },
          { key: 'chute_crt_sink',  label: 'Critical sink rate', type: 'number', min: 0,   max: 30,   default: 10,  unit: 'm/s' },
        ],
      },
    ],
  },

  {
    id: 'landing_gear',
    label: 'Landing Gear',
    category: 'Peripherals',
    icon: '⬇',
    vehicles: ['copter', 'plane', 'vtol'],
    multi: false,
    connections: ['AUX OUT 1–6', 'MAIN OUT 1–8'],
    inspector: [
      {
        label: 'Servo assignment',
        fields: [
          { key: 'lgr_enable',   label: 'Enable retractable gear', type: 'toggle', required: true, default: false },
          { key: 'output_pin',   label: 'Output pin',              type: 'pinSelect', required: true },
          { key: 'lgr_servo_rtract', label: 'Retracted PWM',  type: 'number', min: 1000, max: 2000, default: 1800, unit: 'µs' },
          { key: 'lgr_servo_deploy', label: 'Deployed PWM',   type: 'number', min: 1000, max: 2000, default: 1200, unit: 'µs' },
        ],
      },
      {
        label: 'Auto control',
        fields: [
          { key: 'lgr_deploy_alt',  label: 'Auto-deploy below', type: 'number', min: 0, max: 100, default: 10,  unit: 'm AGL, 0=disabled' },
          { key: 'lgr_retract_alt', label: 'Auto-retract above', type: 'number', min: 0, max: 100, default: 15, unit: 'm AGL, 0=disabled' },
        ],
      },
    ],
  },

  {
    id: 'relay_gpio',
    label: 'Relay / GPIO',
    category: 'Peripherals',
    icon: '⚙',
    vehicles: ['copter', 'plane', 'vtol'],
    multi: true,
    maxInstances: 6,
    connections: ['AUX OUT 1–6', 'GPIO'],
    inspector: [
      {
        label: 'Relay',
        fields: [
          { key: 'instance', label: 'Relay instance', type: 'select', required: true, default: 1,
            options: Array.from({ length: 6 }, (_, i) => ({ value: i + 1, label: `Relay ${i + 1}` })) },
          {
            key: 'relay_pin', label: 'GPIO pin', type: 'select', required: true, default: 54,
            note: 'Cube Orange AUX GPIO: AUX1=54, AUX2=55, AUX3=56, AUX4=57, AUX5=58, AUX6=59',
            options: [
              { value: 54, label: 'AUX1 (pin 54)' },
              { value: 55, label: 'AUX2 (pin 55)' },
              { value: 56, label: 'AUX3 (pin 56)' },
              { value: 57, label: 'AUX4 (pin 57)' },
              { value: 58, label: 'AUX5 (pin 58)' },
              { value: 59, label: 'AUX6 (pin 59)' },
              { value: -1, label: 'Disabled' },
            ],
          },
          {
            key: 'relay_default', label: 'Default state at boot', type: 'select', default: 0,
            options: [
              { value: 0, label: '0 — Off' },
              { value: 1, label: '1 — On' },
              { value: 2, label: '2 — No change' },
            ],
          },
        ],
      },
    ],
  },

  {
    id: 'adsb',
    label: 'ADS-B Transponder',
    category: 'Peripherals',
    icon: '🛰',
    vehicles: ['copter', 'plane', 'vtol'],
    multi: false,
    connections: ['SERIAL4', 'SERIAL5', 'CAN1'],
    inspector: [
      {
        label: 'Device',
        fields: [
          {
            key: 'adsb_type', label: 'ADS-B device type', type: 'select', required: true, default: 0,
            options: [
              { value: 0, label: '0 — Disabled' },
              { value: 1, label: '1 — uAvionix MAVLink (Ping2020 / skyBeacon)' },
              { value: 2, label: '2 — Sagetech' },
              { value: 3, label: '3 — uAvionix UCP' },
              { value: 4, label: '4 — Sagetech MXS' },
            ],
          },
          { key: 'serial_port', label: 'Serial port', type: 'select', required: true, default: 'SERIAL4', options: UART_PORT_OPTIONS },
          { key: 'adsb_squawk',  label: 'Squawk code', type: 'number', min: 0, max: 7777, default: 1200, note: 'Octal 1200 = VFR, no ATC comm' },
          { key: 'adsb_emit_type', label: 'Emitter category', type: 'number', min: 0, max: 20, default: 14, note: '14 = UAV / drone' },
        ],
      },
      {
        label: 'Awareness',
        fields: [
          { key: 'adsb_list_max',    label: 'Max tracked vehicles', type: 'number', min: 1,    max: 100, default: 25 },
          { key: 'adsb_list_radius', label: 'Track radius',         type: 'number', min: 1000, max: 100000, default: 10000, unit: 'm' },
        ],
      },
    ],
  },

  {
    id: 'osd',
    label: 'OSD',
    category: 'Peripherals',
    icon: '🖥',
    vehicles: ['copter', 'plane', 'vtol'],
    multi: false,
    connections: ['UART (SERIAL4/5)', '— (internal MSP)'],
    inspector: [
      {
        label: 'OSD type',
        fields: [
          {
            key: 'osd_type', label: 'OSD type', type: 'select', required: true, default: 0,
            options: [
              { value: 0, label: '0 — None' },
              { value: 1, label: '1 — MAX7456 (internal, not on Cube)' },
              { value: 2, label: '2 — SITL (simulation)' },
              { value: 3, label: '3 — MSP (iNav-style, via UART)' },
              { value: 4, label: '4 — TX-only (no feedback)' },
              { value: 5, label: '5 — HD DisplayPort (Walksnail / DJI)' },
            ],
          },
          { key: 'serial_port', label: 'UART port', type: 'select', default: 'SERIAL4', options: UART_PORT_OPTIONS,
            dependsOn: { field: 'osd_type', value: [3, 4, 5] } },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VEHICLE SETUP — additional virtual blocks
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'board_orientation',
    label: 'Board Orientation',
    category: 'Vehicle Setup',
    icon: '🔲',
    vehicles: ['copter', 'plane', 'vtol'],
    virtual: true,
    connections: [],
    inspector: [
      {
        label: 'IMU orientation',
        fields: [
          { key: 'ahrs_orientation', label: 'Board rotation', type: 'select', required: true, default: 0,
            note: 'Sets AHRS_ORIENTATION. Use if Cube is not mounted arrow-forward/level.',
            options: ORIENTATION_OPTIONS },
          { key: 'ahrs_trim_x', label: 'Roll trim',  type: 'number', min: -0.3, max: 0.3, default: 0, unit: 'rad' },
          { key: 'ahrs_trim_y', label: 'Pitch trim', type: 'number', min: -0.3, max: 0.3, default: 0, unit: 'rad' },
        ],
      },
      {
        label: 'EKF',
        fields: [
          { key: 'ahrs_ekf_type', label: 'EKF version', type: 'select', default: 3,
            note: 'EKF3 is default and recommended for Cube Orange (3 IMUs).',
            options: [
              { value: 2, label: 'EKF2' },
              { value: 3, label: 'EKF3 (recommended)' },
            ] },
          { key: 'ek3_imu_mask', label: 'IMU lane mask (EKF3)', type: 'bitmask', default: 7,
            note: '7 = all three Cube Orange IMUs active.' },
        ],
      },
      {
        label: 'Fast sampling',
        fields: [
          { key: 'ins_fast_sample', label: 'Fast sampling mask', type: 'bitmask', default: 1,
            note: 'Cube Orange supports 8 kHz sampling. Bit 0=IMU1, bit 1=IMU2, bit 2=IMU3.' },
          { key: 'ins_gyro_filter', label: 'Gyro low-pass filter', type: 'number', min: 0, max: 256, default: 20, unit: 'Hz' },
        ],
      },
    ],
  },

  {
    id: 'harmonic_notch',
    label: 'Harmonic Notch Filter',
    category: 'Vehicle Setup',
    icon: '〰',
    vehicles: ['copter', 'vtol'],
    virtual: true,
    connections: [],
    inspector: [
      {
        label: 'Enable',
        fields: [
          { key: 'hntch_enable', label: 'Enable notch filter', type: 'toggle', required: true, default: false,
            note: 'Sets INS_HNTCH_ENABLE. Essential for DSHOT builds to suppress motor noise.' },
        ],
      },
      {
        label: 'Filter parameters',
        fields: [
          {
            key: 'hntch_mode', label: 'Frequency tracking mode', type: 'select', required: true, default: 1,
            options: [
              { value: 0, label: '0 — Fixed frequency' },
              { value: 1, label: '1 — Throttle-based (most common)' },
              { value: 2, label: '2 — RPM sensor' },
              { value: 3, label: '3 — ESC telemetry RPM (BLHeli32)' },
            ],
          },
          { key: 'hntch_freq', label: 'Centre frequency',    type: 'number', min: 10, max: 495, default: 80, unit: 'Hz', required: true,
            note: 'Set to motor noise frequency at hover. Use FFT analysis to determine.' },
          { key: 'hntch_bw',   label: 'Bandwidth',           type: 'number', min: 5,  max: 100, default: 40, unit: 'Hz' },
          { key: 'hntch_att',  label: 'Attenuation',         type: 'number', min: 5,  max: 60,  default: 40, unit: 'dB' },
          { key: 'hntch_ref',  label: 'Reference value',     type: 'number', min: 0,  max: 1,   default: 0.35,
            note: 'For MODE=1: hover throttle fraction (0.35 typical). For MODE=2/3: motor RPM at hover.' },
          { key: 'hntch_hmncs', label: 'Harmonic bitmask', type: 'bitmask', default: 3,
            note: 'Bit 0=fundamental, Bit 1=2nd harmonic, Bit 2=3rd. Default: fundamental + 2nd (value=3).' },
          { key: 'hntch_opts', label: 'Options bitmask', type: 'bitmask', default: 0,
            note: 'Bit 0=double notch, Bit 1=dynamic harmonics (EKF3+BLHeli32 RPM).' },
        ],
      },
    ],
  },

  {
    id: 'failsafe',
    label: 'Failsafe Configuration',
    category: 'Vehicle Setup',
    icon: '🛡',
    vehicles: ['copter', 'plane', 'vtol'],
    virtual: true,
    connections: [],
    inspector: [
      {
        label: 'RC / throttle failsafe',
        fields: [
          // ── Copter uses FS_THR_ENABLE ──────────────────────────────────
          {
            key: 'fs_thr_enable', label: 'Throttle failsafe action', type: 'select', required: true, default: 1,
            options: FAILSAFE_ACTION_COPTER,
            vehicle: 'copter',
          },
          { key: 'fs_thr_value', label: 'Throttle failsafe PWM', type: 'number', min: 900, max: 1100, default: 975, unit: 'µs',
            note: 'Signal below this = failsafe. Set 10–50µs below minimum RC throttle.',
            vehicle: 'copter' },
          // ── Plane uses THR_FAILSAFE + short/long action ────────────────
          {
            key: 'thr_failsafe', label: 'Throttle failsafe enable', type: 'select', required: true, default: 1,
            vehicle: 'plane',
            options: [
              { value: 0, label: '0 — Disabled' },
              { value: 1, label: '1 — Enabled' },
            ],
          },
          { key: 'thr_fs_value', label: 'Throttle failsafe PWM', type: 'number', min: 900, max: 1100, default: 950, unit: 'µs',
            vehicle: 'plane', note: 'Signal below this = failsafe.' },
          {
            key: 'fs_short_actn', label: 'Short failsafe action', type: 'select', default: 0,
            vehicle: 'plane',
            options: [
              { value: 0, label: '0 — FBWA' },
              { value: 1, label: '1 — RTL' },
              { value: 2, label: '2 — Glide' },
              { value: 3, label: '3 — Deploy parachute' },
            ],
          },
          {
            key: 'fs_long_actn', label: 'Long failsafe action', type: 'select', default: 1,
            vehicle: 'plane',
            options: [
              { value: 0, label: '0 — Continue' },
              { value: 1, label: '1 — RTL' },
              { value: 2, label: '2 — Glide' },
              { value: 3, label: '3 — Deploy parachute' },
              { value: 4, label: '4 — Auto (continue mission)' },
            ],
          },
          { key: 'fs_long_timeout', label: 'Long failsafe timeout', type: 'number', min: 1, max: 300, default: 20, unit: 's',
            vehicle: 'plane' },
          // ── VTOL same as Plane ─────────────────────────────────────────
          {
            key: 'thr_failsafe', label: 'Throttle failsafe enable', type: 'select', required: true, default: 1,
            vehicle: 'vtol',
            options: [{ value: 0, label: '0 — Disabled' }, { value: 1, label: '1 — Enabled' }],
          },
          { key: 'thr_fs_value', label: 'Throttle failsafe PWM', type: 'number', min: 900, max: 1100, default: 950, unit: 'µs',
            vehicle: 'vtol' },
          {
            key: 'fs_short_actn', label: 'Short failsafe action', type: 'select', default: 0,
            vehicle: 'vtol',
            options: [
              { value: 0, label: '0 — FBWA' },
              { value: 1, label: '1 — RTL' },
              { value: 2, label: '2 — Glide' },
            ],
          },
          {
            key: 'fs_long_actn', label: 'Long failsafe action', type: 'select', default: 1,
            vehicle: 'vtol',
            options: [
              { value: 0, label: '0 — Continue' },
              { value: 1, label: '1 — RTL' },
              { value: 2, label: '2 — Glide' },
              { value: 4, label: '4 — Auto' },
            ],
          },
          { key: 'fs_long_timeout', label: 'Long failsafe timeout', type: 'number', min: 1, max: 300, default: 20, unit: 's',
            vehicle: 'vtol' },
        ],
      },
      {
        label: 'GCS / telemetry failsafe',
        fields: [
          { key: 'fs_gcs_enable', label: 'GCS heartbeat failsafe', type: 'select', default: 0,
            options: FAILSAFE_ACTION_COPTER, vehicle: 'copter' },
          // Plane: FS_GCS_ENABL (note different param name)
          {
            key: 'fs_gcs_enabl', label: 'GCS heartbeat failsafe', type: 'select', default: 0,
            vehicle: 'plane',
            options: [
              { value: 0, label: '0 — Disabled' },
              { value: 1, label: '1 — Enabled (long failsafe action)' },
              { value: 2, label: '2 — Enabled (short + long action)' },
            ],
          },
          {
            key: 'fs_gcs_enabl', label: 'GCS heartbeat failsafe', type: 'select', default: 0,
            vehicle: 'vtol',
            options: [
              { value: 0, label: '0 — Disabled' },
              { value: 1, label: '1 — Enabled' },
              { value: 2, label: '2 — Enabled (short + long)' },
            ],
          },
          { key: 'fs_gcs_timeout', label: 'GCS timeout', type: 'number', min: 1, max: 120, default: 5, unit: 's' },
        ],
      },
      {
        label: 'EKF failsafe',
        fields: [
          { key: 'fs_ekf_action', label: 'EKF failsafe action', type: 'select', default: 1,
            vehicle: 'copter',
            options: [
              { value: 1, label: '1 — Land' },
              { value: 2, label: '2 — AltHold then Land' },
              { value: 3, label: '3 — Land (in any mode)' },
            ] },
          { key: 'fs_ekf_thresh', label: 'EKF variance threshold', type: 'number', min: 0.1, max: 10, default: 0.8, unit: '' },
        ],
      },
      {
        label: 'Return-to-launch',
        fields: [
          { key: 'rtl_alt', label: 'RTL altitude', type: 'number', min: -1, max: 15000, default: 1500, unit: 'cm, -1=current alt',
            vehicle: 'copter' },
          { key: 'rtl_loiter_time', label: 'RTL loiter time', type: 'number', min: 0, max: 60000, default: 5000, unit: 'ms',
            vehicle: 'copter' },
          { key: 'rtl_altitude', label: 'RTL altitude', type: 'number', min: 0, max: 10000, default: 100, unit: 'm',
            vehicle: 'plane', note: 'Sets RTL_ALTITUDE. Minimum altitude for RTL in Plane.' },
          { key: 'rtl_altitude', label: 'RTL altitude', type: 'number', min: 0, max: 10000, default: 100, unit: 'm',
            vehicle: 'vtol' },
          { key: 'rtl_climb_min', label: 'RTL minimum climb', type: 'number', min: 0, max: 1000, default: 10, unit: 'm',
            vehicle: 'plane', note: 'Sets RTL_CLIMB_MIN. Minimum climb before RTL turns toward home.' },
          { key: 'rtl_autoland', label: 'RTL auto land', type: 'select', default: 0,
            vehicle: 'plane',
            options: [
              { value: 0, label: '0 — Disabled (loiter at RTL alt)' },
              { value: 1, label: '1 — Loiter then land if home reached' },
              { value: 2, label: '2 — Land immediately' },
            ] },
        ],
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // NEW BLOCKS — gaps identified from live parameter list
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'arming',
    label: 'Arming',
    category: 'Vehicle Setup',
    icon: '🔒',
    vehicles: ['copter', 'plane', 'vtol'],
    virtual: true,
    connections: [],
    inspector: [
      {
        label: 'Arming requirements',
        fields: [
          {
            key: 'arming_require', label: 'Require arming', type: 'select', required: true, default: 1,
            note: 'Sets ARMING_REQUIRE. Whether motors require arming before they can run.',
            options: [
              { value: 0, label: '0 — Disabled (always armed)' },
              { value: 1, label: '1 — Arm required, throttle must be low' },
              { value: 2, label: '2 — Arm required (any throttle)' },
            ],
          },
          {
            key: 'arming_rudder', label: 'Arm/disarm with rudder', type: 'select', default: 2,
            options: [
              { value: 0, label: '0 — Disabled' },
              { value: 1, label: '1 — Arm only' },
              { value: 2, label: '2 — Arm and disarm' },
            ],
          },
          { key: 'arming_accthresh', label: 'Accelerometer error threshold', type: 'number',
            min: 0.25, max: 50, default: 5, unit: 'm/s²',
            note: 'Maximum difference between IMUs before arming is blocked.' },
          { key: 'arming_magthresh', label: 'Compass error threshold', type: 'number',
            min: 0, max: 1000, default: 0, unit: 'mGauss, 0=disabled' },
        ],
      },
      {
        label: 'Arming options',
        fields: [
          { key: 'arming_options', label: 'Arming options (bitmask)', type: 'bitmask', default: 0,
            note: 'Bit 0=disable prearm display. Bit 2=require mission before arm. Bit 3=require rangefinder healthy.' },
          { key: 'arming_skipchk', label: 'Skip arming checks (bitmask)', type: 'bitmask', default: 0,
            note: 'Bitmask of checks to bypass. Use with caution — 0=run all checks (recommended).' },
          { key: 'arming_mis_items', label: 'Required mission items', type: 'bitmask', default: 0,
            vehicle: 'plane',
            note: 'Mission items required before arming in AUTO mode. Bit 0=takeoff, bit 1=land.' },
        ],
      },
      {
        label: 'Disarm',
        fields: [
          { key: 'disarm_delay', label: 'Auto-disarm delay', type: 'number', min: 0, max: 127, default: 10, unit: 's, 0=disabled',
            vehicle: 'copter',
            note: 'Sets DISARM_DELAY. Seconds on ground before auto-disarm.' },
        ],
      },
    ],
  },

  {
    id: 'flight_modes',
    label: 'Flight Modes',
    category: 'Vehicle Setup',
    icon: '🕹',
    vehicles: ['copter', 'plane', 'vtol'],
    virtual: true,
    connections: [],
    inspector: [
      {
        label: 'Mode channel',
        fields: [
          { key: 'fltmode_ch', label: 'Flight mode RC channel', type: 'number', min: 1, max: 16, default: 5,
            note: 'Sets FLTMODE_CH. RC channel used to select flight modes (Copter default 5, Plane default 8).' },
          { key: 'initial_mode', label: 'Initial mode at boot', type: 'number', min: 0, max: 30, default: 0,
            note: 'Sets INITIAL_MODE. Mode entered at boot before RC link established.' },
        ],
      },
      {
        label: 'Flight modes (Copter)',
        fields: [
          // Copter flight modes
          ...[1,2,3,4,5,6].map(n => ({
            key: `fltmode${n}`,
            label: `Mode ${n}`,
            type: 'select',
            default: n === 1 ? 0 : n === 6 ? 6 : 0,
            vehicle: 'copter',
            options: [
              { value: 0,  label: '0 — Stabilize' },
              { value: 1,  label: '1 — Acro' },
              { value: 2,  label: '2 — AltHold' },
              { value: 3,  label: '3 — Auto' },
              { value: 4,  label: '4 — Guided' },
              { value: 5,  label: '5 — Loiter' },
              { value: 6,  label: '6 — RTL' },
              { value: 7,  label: '7 — Circle' },
              { value: 9,  label: '9 — Land' },
              { value: 11, label: '11 — Drift' },
              { value: 13, label: '13 — Sport' },
              { value: 14, label: '14 — Flip' },
              { value: 15, label: '15 — AutoTune' },
              { value: 16, label: '16 — PosHold' },
              { value: 17, label: '17 — Brake' },
              { value: 18, label: '18 — Throw' },
              { value: 19, label: '19 — Avoid ADSB' },
              { value: 20, label: '20 — Guided NoGPS' },
              { value: 21, label: '21 — Smart RTL' },
              { value: 22, label: '22 — FlowHold' },
              { value: 23, label: '23 — Follow' },
              { value: 24, label: '24 — ZigZag' },
              { value: 25, label: '25 — SystemID' },
              { value: 26, label: '26 — Heli_Autorotate' },
            ],
          })),
        ],
      },
      {
        label: 'Flight modes (Plane)',
        fields: [
          ...[1,2,3,4,5,6].map(n => ({
            key: `fltmode${n}`,
            label: `Mode ${n}`,
            type: 'select',
            default: n === 1 ? 2 : n === 6 ? 11 : 2,
            vehicle: 'plane',
            options: [
              { value: 0,  label: '0 — Manual' },
              { value: 1,  label: '1 — Circle' },
              { value: 2,  label: '2 — Stabilize' },
              { value: 3,  label: '3 — Training' },
              { value: 4,  label: '4 — ACRO' },
              { value: 5,  label: '5 — FBW-A' },
              { value: 6,  label: '6 — FBW-B' },
              { value: 7,  label: '7 — Cruise' },
              { value: 8,  label: '8 — AutoTune' },
              { value: 10, label: '10 — Auto' },
              { value: 11, label: '11 — RTL' },
              { value: 12, label: '12 — Loiter' },
              { value: 13, label: '13 — TAKEOFF' },
              { value: 14, label: '14 — AVOID_ADSB' },
              { value: 15, label: '15 — Guided' },
              { value: 17, label: '17 — QSTABILIZE' },
              { value: 18, label: '18 — QHOVER' },
              { value: 19, label: '19 — QLOITER' },
              { value: 20, label: '20 — QLAND' },
              { value: 21, label: '21 — QRTL' },
              { value: 22, label: '22 — QAUTOTUNE' },
              { value: 23, label: '23 — QACRO' },
            ],
          })),
        ],
      },
    ],
  },

  {
    id: 'advanced_failsafe',
    label: 'Advanced Failsafe (AFS)',
    category: 'Vehicle Setup',
    icon: '🛡',
    vehicles: ['copter', 'plane', 'vtol'],
    virtual: true,
    connections: ['GPIO'],
    inspector: [
      {
        label: 'Enable',
        fields: [
          { key: 'afs_enable', label: 'Enable Advanced Failsafe', type: 'toggle', required: true, default: false,
            note: 'Sets AFS_ENABLE. For professional/commercial use. Provides terminate actions, heartbeat monitoring, and geofence enforcement independent of the main GCS failsafe.' },
        ],
      },
      {
        label: 'Termination',
        fields: [
          {
            key: 'afs_term_action', label: 'Terminate action', type: 'select', default: 0,
            options: [
              { value: 0,   label: '0 — Disabled' },
              { value: 42,  label: '42 — Disarm immediately' },
            ],
          },
          { key: 'afs_term_pin', label: 'Terminate GPIO pin', type: 'number', min: -1, max: 70, default: -1, unit: '-1=disabled',
            note: 'GPIO pin driven high on termination. AUX1=54 … AUX6=59.' },
          { key: 'afs_man_pin',  label: 'Manual mode pin',    type: 'number', min: -1, max: 70, default: -1, unit: '-1=disabled' },
          { key: 'afs_hb_pin',   label: 'Heartbeat output pin', type: 'number', min: -1, max: 70, default: -1, unit: '-1=disabled' },
        ],
      },
      {
        label: 'Altitude & range limits',
        fields: [
          { key: 'afs_amsl_limit', label: 'AMSL altitude limit', type: 'number', min: 0, max: 10000, default: 0, unit: 'm, 0=disabled' },
          { key: 'afs_amsl_err_gps', label: 'GPS AMSL error margin', type: 'number', min: 0, max: 100, default: 100, unit: 'm' },
          { key: 'afs_max_range',   label: 'Max range from home',  type: 'number', min: 0, max: 10000, default: 0, unit: 'm, 0=disabled' },
          { key: 'afs_qnh_pressure', label: 'QNH pressure',        type: 'number', min: 0, max: 1200, default: 0, unit: 'hPa, 0=use baro' },
        ],
      },
      {
        label: 'Loss event limits',
        fields: [
          { key: 'afs_max_gps_loss', label: 'Max GPS loss events', type: 'number', min: 0, max: 100, default: 0, unit: '0=disabled' },
          { key: 'afs_max_com_loss', label: 'Max comms loss events', type: 'number', min: 0, max: 100, default: 0, unit: '0=disabled' },
          { key: 'afs_rc_fail_time', label: 'RC fail time',         type: 'number', min: 0, max: 120, default: 1.5, unit: 's' },
          { key: 'afs_gcs_timeout', label: 'GCS timeout',           type: 'number', min: 0, max: 120, default: 10, unit: 's' },
          { key: 'afs_options',      label: 'AFS options bitmask',  type: 'bitmask', default: 0 },
        ],
      },
    ],
  },

  {
    id: 'takeoff_landing',
    label: 'Takeoff & Landing (Plane)',
    category: 'Vehicle Setup',
    icon: '🛫',
    vehicles: ['plane', 'vtol'],
    virtual: true,
    connections: [],
    inspector: [
      {
        label: 'Takeoff throttle',
        fields: [
          { key: 'tkoff_thr_minspd',  label: 'Min airspeed for throttle',  type: 'number', min: 0, max: 30,   default: 0,  unit: 'm/s, 0=disabled',
            note: 'Sets TKOFF_THR_MINSPD. Throttle not applied until this airspeed is reached (for catapult/hand launch).' },
          { key: 'tkoff_thr_minacc',  label: 'Min acceleration for throttle', type: 'number', min: 0, max: 30, default: 0, unit: 'm/s², 0=disabled',
            note: 'Sets TKOFF_THR_MINACC. Throttle not applied until this acceleration detected (throw launch detection).' },
          { key: 'tkoff_thr_delay',   label: 'Throttle delay after detection', type: 'number', min: 0, max: 10, default: 0, unit: '0.1s units' },
          { key: 'tkoff_thr_max',     label: 'Max takeoff throttle',   type: 'number', min: 0, max: 100, default: 100, unit: '%' },
          { key: 'tkoff_thr_min',     label: 'Min takeoff throttle',   type: 'number', min: 0, max: 100, default: 0,   unit: '%' },
          { key: 'tkoff_thr_idle',    label: 'Idle throttle pre-takeoff', type: 'number', min: 0, max: 100, default: 0, unit: '%' },
          { key: 'tkoff_thr_slew',    label: 'Throttle slew at takeoff', type: 'number', min: 0, max: 127, default: 0, unit: '%/s, 0=no limit' },
          { key: 'tkoff_thr_max_t',   label: 'Max throttle time',      type: 'number', min: 0, max: 60, default: 0, unit: 's, 0=no limit' },
        ],
      },
      {
        label: 'Tail-dragger takeoff',
        fields: [
          { key: 'tkoff_tdrag_elev',  label: 'Tail-dragger elevator', type: 'number', min: -100, max: 100, default: 0, unit: '%',
            note: 'Sets TKOFF_TDRAG_ELEV. Elevator percentage during ground roll to hold tail down.' },
          { key: 'tkoff_tdrag_spd1',  label: 'Tail-dragger speed threshold', type: 'number', min: 0, max: 50, default: 0, unit: 'm/s' },
          { key: 'tkoff_rotate_spd',  label: 'Rotation speed',  type: 'number', min: 0, max: 50, default: 0, unit: 'm/s' },
          { key: 'tkoff_accel_cnt',   label: 'Acceleration count', type: 'number', min: 1, max: 10, default: 1 },
        ],
      },
      {
        label: 'Takeoff options',
        fields: [
          { key: 'tkoff_options',     label: 'Takeoff options bitmask', type: 'bitmask', default: 0,
            note: 'Bit 0=hold heading to wind, Bit 1=no fly-by-wire throttle check.' },
          { key: 'tkoff_flap_pcnt',   label: 'Takeoff flap percentage', type: 'number', min: 0, max: 100, default: 0, unit: '%' },
          { key: 'tkoff_plim_sec',    label: 'Pitch limit reduction time', type: 'number', min: 0, max: 10, default: 2, unit: 's' },
          { key: 'tkoff_timeout',     label: 'Takeoff timeout',  type: 'number', min: 0, max: 360, default: 0, unit: 's, 0=disabled' },
        ],
      },
      {
        label: 'Landing',
        fields: [
          { key: 'rngfnd_landing',    label: 'Use rangefinder for landing', type: 'toggle', default: false,
            note: 'Sets RNGFND_LANDING. Use downward-facing rangefinder to flare at correct height.' },
          { key: 'rngfnd_lnd_ornt',   label: 'Rangefinder landing orientation', type: 'number', min: 0, max: 40, default: 25,
            note: 'Orientation of landing rangefinder (25=down).' },
          { key: 'rngfnd_lnd_dist',   label: 'Rangefinder engagement distance', type: 'number', min: 0, max: 200, default: 70, unit: 'm' },
          { key: 'rtl_autoland',      label: 'RTL auto land', type: 'select', default: 0,
            options: [
              { value: 0, label: '0 — Loiter (no auto land)' },
              { value: 1, label: '1 — Loiter then land' },
              { value: 2, label: '2 — Land immediately' },
            ] },
          { key: 'crash_detect',      label: 'Crash detection', type: 'select', default: 0,
            options: [
              { value: 0, label: '0 — Disabled' },
              { value: 1, label: '1 — Enabled (log only)' },
              { value: 2, label: '2 — Enabled (disable motor)' },
            ] },
          { key: 'crash_acc_thresh',  label: 'Crash decel threshold', type: 'number', min: 0, max: 100, default: 25, unit: 'm/s²' },
        ],
      },
    ],
  },

  {
    id: 'terrain',
    label: 'Terrain Following',
    category: 'Vehicle Setup',
    icon: '🏔',
    vehicles: ['plane', 'vtol'],
    virtual: true,
    connections: [],
    inspector: [
      {
        label: 'Terrain following',
        fields: [
          {
            key: 'terrain_follow', label: 'Terrain following mode', type: 'select', default: 0,
            note: 'Sets TERRAIN_FOLLOW. Requires SD card with terrain data or GCS uplink.',
            options: [
              { value: 0, label: '0 — Disabled' },
              { value: 1, label: '1 — Use terrain in AUTO missions' },
              { value: 3, label: '3 — Use terrain in all modes' },
            ],
          },
          { key: 'terrain_lookahd', label: 'Lookahead distance', type: 'number', min: 0, max: 10000, default: 2000, unit: 'm' },
        ],
      },
    ],
  },

  {
    id: 'pilot_control',
    label: 'Pilot Control (Copter)',
    category: 'Vehicle Setup',
    icon: '🎮',
    vehicles: ['copter'],
    virtual: true,
    connections: [],
    inspector: [
      {
        label: 'Vertical speed & acceleration',
        fields: [
          { key: 'pilot_spd_up',   label: 'Max climb speed',    type: 'number', min: 10, max: 1000, default: 250, unit: 'cm/s' },
          { key: 'pilot_spd_dn',   label: 'Max descent speed',  type: 'number', min: 0,  max: 1000, default: 150, unit: 'cm/s, 0=use climb' },
          { key: 'pilot_acc_z',    label: 'Vertical acceleration', type: 'number', min: 50, max: 500, default: 250, unit: 'cm/s²' },
          { key: 'pilot_tko_alt_m', label: 'Takeoff altitude', type: 'number', min: 0.1, max: 10, default: 1, unit: 'm' },
        ],
      },
      {
        label: 'Throttle behaviour',
        fields: [
          { key: 'pilot_thr_filt',  label: 'Throttle filter cutoff', type: 'number', min: 0, max: 10, default: 0, unit: 'Hz, 0=disabled' },
          { key: 'pilot_thr_bhv',   label: 'Throttle stick behaviour', type: 'bitmask', default: 0,
            note: 'Bit 0=allow arming from throttle-in-middle. Bit 2=disallow neutral throttle in manual.' },
          { key: 'thr_dz',          label: 'Throttle deadzone', type: 'number', min: 0, max: 300, default: 100, unit: 'PWM units' },
        ],
      },
      {
        label: 'Yaw control',
        fields: [
          { key: 'pilot_y_rate',    label: 'Pilot yaw rate',    type: 'number', min: 0, max: 400, default: 200, unit: '°/s' },
          { key: 'pilot_y_expo',    label: 'Pilot yaw expo',    type: 'number', min: 0, max: 1, default: 0, unit: '0=linear' },
          { key: 'pilot_y_rate_tc', label: 'Yaw rate time constant', type: 'number', min: 0, max: 1, default: 0.15, unit: 's' },
        ],
      },
    ],
  },
];

// ─── Exports ─────────────────────────────────────────────────────────────────

/** Map of id → definition for O(1) lookup */
export const COMPONENT_DEFS_MAP = Object.fromEntries(
  COMPONENT_DEFS.map(d => [d.id, d])
);

/** All unique categories in palette order */
export const CATEGORIES = [
  'Vehicle Setup',   // Frame, Arming, Flight Modes, Failsafe, AFS, Board Orientation, Notch Filter, Takeoff/Landing, Terrain, Pilot Control
  'Propulsion',
  'Sensors',
  'Power',
  'RC / GCS',
  'Peripherals',
];

/** Filter block list by vehicle type */
export function defsForVehicle(vehicleType) {
  return COMPONENT_DEFS.filter(d => d.vehicles.includes(vehicleType));
}
