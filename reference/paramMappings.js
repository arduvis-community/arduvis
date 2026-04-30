/**
 * paramMappings.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Translates a configured component instance into ArduPilot parameter
 * name/value pairs ready for .param file export or MAVLink upload.
 *
 * ARCHITECTURE
 *   Each mapper function receives:
 *     component  — a component instance from the Zustand store:
 *                  { id, defId, label, fields: { key: value }, outputPin?, instance? }
 *     allComponents — full array of placed components (for cross-component logic)
 *     vehicleType   — 'copter' | 'plane' | 'vtol'
 *
 *   Each mapper returns an array of:
 *     { param, value, comment, group, rebootRequired }
 *
 * PARAM NAME CONVENTIONS
 *   'n'        → resolved output pin number (1–14, where 1–8 = MAIN, 9–14 = AUX1–6)
 *   'instance' → resolved from component.fields.instance (1–based)
 *   Bitmask fields accumulate across all instances of that component type.
 *
 * SERIAL PORT MAPPING
 *   'SERIAL0' → SERIALn index 0  (protocol param: SERIAL0_PROTOCOL etc.)
 *   'SERIAL1' → 1, 'SERIAL2' → 2, 'SERIAL3' → 3, 'SERIAL4' → 4, 'SERIAL5' → 5
 */

// ─── Utility helpers ──────────────────────────────────────────────────────────

/** Convert 'SERIALn' string to integer index */
const serialIdx = (port) => parseInt(port.replace('SERIAL', ''), 10);

/** Resolve SERVOn_ param name from pin selector value */
const servoParam = (pin, suffix) => `SERVO${pin}_${suffix}`;

/** Motor number → SERVOn_FUNCTION value */
const motorFunction = (motorNum) => 32 + motorNum;

/** Battery instance prefix: 1→'BATT', 2→'BATT2', 3→'BATT3', 4→'BATT4' */
const battPrefix = (instance) => instance === 1 ? 'BATT' : `BATT${instance}`;

/** GPS/sensor instance prefix */
const gpsPrefix  = (instance) => instance === 1 ? 'GPS'  : `GPS${instance}`;
const arspPrefix = (instance) => instance === 1 ? 'ARSPD' : `ARSPD${instance}`;
const rngPrefix  = (instance) => `RNGFND${instance}`;
const rpmPrefix  = (instance) => `RPM${instance}`;
const relayPin   = (instance) => `RELAY_PIN${instance === 1 ? '' : instance}`;

/** Hardware presets for battery monitors */
const BATT_PRESETS = {
  cube_brick:      { volt_mult: 10.1, amp_pervlt: 17.0, volt_pin: 14, curr_pin: 15 },
  cube_brick_mini: { volt_mult: 10.1, amp_pervlt: 17.0, volt_pin: 14, curr_pin: 15 },
  mauch_hs_050:    { volt_mult: 10.5, amp_pervlt: 15.15, volt_pin: 14, curr_pin: 15 },
  mauch_hs_100:    { volt_mult: 10.5, amp_pervlt: 30.3,  volt_pin: 14, curr_pin: 15 },
  mauch_hs_200:    { volt_mult: 10.5, amp_pervlt: 60.6,  volt_pin: 14, curr_pin: 15 },
  holybro_pm06:    { volt_mult: 10.1, amp_pervlt: 17.0,  volt_pin: 14, curr_pin: 15 },
  zubax_gnss:      { volt_mult: 1,    amp_pervlt: 1,      volt_pin: -1, curr_pin: -1 },
};

/** Build a single param entry */
const p = (param, value, comment = '', group = '', rebootRequired = false) =>
  ({ param, value, comment, group, rebootRequired });

// ─── BLHeli bitmask accumulator ───────────────────────────────────────────────
// BLHeli params are global bitmasks, not per-ESC.
// We collect all ESC instances, then emit one set of params.

function buildBlheliBitmasks(allComponents) {
  let blheliMask = 0;
  let bdMask     = 0;
  let poles      = 14;
  let trate      = 10;

  for (const c of allComponents) {
    if (!['esc_motor_copter', 'esc_plane'].includes(c.defId)) continue;
    const f = c.fields || {};
    if (!f.blheli_enabled) continue;
    const pin = parseInt(c.outputPin, 10);
    if (pin >= 1 && pin <= 14) {
      blheliMask |= (1 << (pin - 1));
      if (f.blheli_bidi) bdMask |= (1 << (pin - 1));
    }
    if (f.blheli_poles) poles = f.blheli_poles;
    if (f.blheli_trate) trate = f.blheli_trate;
  }

  const results = [];
  if (blheliMask > 0) {
    results.push(p('SERVO_BLH_MASK',  blheliMask, 'BLHeli32 passthrough output bitmask', 'ESC Telemetry'));
    results.push(p('SERVO_BLH_POLES', poles,       'Motor pole count for RPM calculation', 'ESC Telemetry'));
    results.push(p('SERVO_BLH_TRATE', trate,       'BLHeli32 telemetry rate (Hz)',          'ESC Telemetry'));
    if (bdMask > 0) {
      results.push(p('SERVO_BLH_BDMASK', bdMask, 'Bidirectional DSHOT output bitmask', 'ESC Telemetry'));
    }
  }
  return results;
}

// ─── Component mappers ────────────────────────────────────────────────────────

const MAPPERS = {

  // ── Frame (Copter) ──────────────────────────────────────────────────────
  frame_copter(c) {
    const f = c.fields || {};
    return [
      p('FRAME_CLASS',       f.frame_class    ?? 1,    'Multirotor frame class',          'Frame', true),
      p('FRAME_TYPE',        f.frame_type     ?? 1,    'Frame orientation',               'Frame', true),
      p('MOT_SPIN_ARM',      f.mot_spin_arm   ?? 0.1,  'Motor spin on arm',               'Motors'),
      p('MOT_SPIN_MIN',      f.mot_spin_min   ?? 0.15, 'Motor minimum spin for thrust',   'Motors'),
      p('MOT_SPIN_MAX',      f.mot_spin_max   ?? 0.95, 'Motor maximum spin',              'Motors'),
      p('MOT_THST_EXPO',     f.mot_thst_expo  ?? 0.65, 'Motor thrust curve expo',         'Motors'),
      p('MOT_THST_HOVER',    f.mot_thst_hover ?? 0.35, 'Estimated hover throttle',        'Motors'),
      p('MOT_YAW_HEADROOM',  f.mot_yaw_headroom ?? 200,'Yaw control headroom (PWM)',      'Motors'),
    ];
  },

  // ── Frame (Plane) ──────────────────────────────────────────────────────
  frame_plane(c) {
    const f = c.fields || {};
    return [
      p('PTCH_LIM_MAX_DEG', f.ptch_lim_max  ?? 20,   'Maximum pitch up (deg)',          'Frame'),
      p('PTCH_LIM_MIN_DEG', f.ptch_lim_min  ?? -20,  'Maximum pitch down (deg)',        'Frame'),
      p('ROLL_LIMIT_DEG',   f.roll_limit_deg ?? 45,  'Maximum bank angle (deg)',        'Frame'),
      p('STALL_PREVENTION', f.stall_prevention ? 1 : 0, 'Stall prevention enabled',    'Frame'),
      p('AIRSPEED_MIN',     f.airspeed_min   ?? 12,   'Minimum airspeed (m/s)',         'Airspeed'),
      p('AIRSPEED_CRUISE',  f.airspeed_cruise ?? 18,  'Cruise airspeed (m/s)',          'Airspeed'),
      p('AIRSPEED_MAX',     f.airspeed_max   ?? 30,   'Maximum airspeed (m/s)',         'Airspeed'),
      p('THR_MIN',          f.thr_min ?? 0,           'Minimum throttle (%)',           'Throttle'),
      p('THR_MAX',          f.thr_max ?? 100,         'Maximum throttle (%)',           'Throttle'),
      p('THR_SLEWRATE',     f.thr_slewrate ?? 0,      'Throttle slew rate (%/s)',       'Throttle'),
      p('TRIM_THROTTLE',    f.thr_cruise ?? 45,       'Cruise throttle (%)',            'Throttle'),
      p('KFF_RDDRMIX',      f.kff_rddrmix ?? 0.5,    'Rudder-aileron mix',             'Mixing'),
    ];
  },

  // ── Frame (VTOL / QuadPlane) ────────────────────────────────────────────
  frame_vtol(c) {
    const f = c.fields || {};
    const out = [
      p('Q_ENABLE',         1,                         'QuadPlane enabled',              'VTOL Frame', true),
      p('Q_FRAME_CLASS',    f.q_frame_class ?? 1,      'VTOL motor frame class',         'VTOL Frame', true),
      p('Q_FRAME_TYPE',     f.q_frame_type  ?? 1,      'VTOL frame orientation',         'VTOL Frame', true),
      p('Q_TRANSITION_MS',  f.q_transition_ms ?? 5000, 'Transition duration (ms)',       'VTOL Transition'),
      p('Q_VFWD_GAIN',      f.q_vfwd_gain ?? 0.5,      'Forward velocity gain in VTOL',  'VTOL Transition'),
      p('Q_WVANE_ENABLE',   f.q_wvane_enable ? 1 : 0,  'Weathervane in hover',          'VTOL Transition'),
      p('Q_MOT_SPIN_ARM',   f.q_mot_spin_arm ?? 0.1,   'VTOL motor spin on arm',        'VTOL Motors'),
      p('Q_M_SPIN_MIN',     f.q_m_spin_min  ?? 0.15,   'VTOL motor min spin',           'VTOL Motors'),
    ];
    if (f.q_tilt_enable && f.q_tilt_enable !== 0) {
      out.push(p('Q_TILT_ENABLE',     f.q_tilt_enable,        'Tiltrotor type',              'Tiltrotor', true));
      out.push(p('Q_TILT_MASK',       f.q_tilt_mask ?? 3,     'Tilt motor bitmask',          'Tiltrotor'));
      out.push(p('Q_TILT_RATE_UP',    f.q_tilt_rate_up ?? 40, 'Tilt rate up (deg/s)',        'Tiltrotor'));
      out.push(p('Q_TILT_RATE_DN',    f.q_tilt_rate_dn ?? 40, 'Tilt rate down (deg/s)',      'Tiltrotor'));
      out.push(p('Q_TILT_YAW_ANGLE', f.q_tilt_yaw_angle ?? 0,'Max tilt yaw angle (deg)',    'Tiltrotor'));
    }
    return out;
  },

  // ── ESC + Motor (Copter / VTOL) ─────────────────────────────────────────
  esc_motor_copter(c, allComponents) {
    const f   = c.fields || {};
    const pin = parseInt(c.outputPin, 10);
    const out = [];

    // SERVOn_FUNCTION — motor assignment
    if (pin && f.motor_num) {
      out.push(p(servoParam(pin, 'FUNCTION'), motorFunction(f.motor_num),
        `Motor ${f.motor_num} output`, 'Motors'));
    }

    // Protocol — emit once per build (deduplicated in paramExporter)
    if (f.mot_pwm_type !== undefined) {
      out.push(p('MOT_PWM_TYPE', f.mot_pwm_type, 'ESC protocol (global — applies to all motors)', 'Motors'));
    }
    if (f.mot_pwm_type === 0) {
      out.push(p('MOT_PWM_MIN', f.mot_pwm_min ?? 1000, 'Motor PWM minimum (µs)', 'Motors'));
      out.push(p('MOT_PWM_MAX', f.mot_pwm_max ?? 2000, 'Motor PWM maximum (µs)', 'Motors'));
    }

    // Reversal
    if (f.reversed) {
      out.push(p(servoParam(pin, 'REVERSED'), 1, `Motor ${f.motor_num} reversed`, 'Motors'));
    }

    // BLHeli — accumulated separately, but we register intent here
    // (paramExporter will call buildBlheliBitmasks once across all components)

    return out;
  },

  // ── ESC / Throttle (Plane) ──────────────────────────────────────────────
  esc_plane(c) {
    const f   = c.fields || {};
    const pin = parseInt(c.outputPin, 10);
    if (!pin) return [];
    return [
      p(servoParam(pin, 'FUNCTION'), f.servo_function ?? 70, 'Throttle output function', 'Throttle'),
      p(servoParam(pin, 'MIN'),      f.servo_min ?? 1000, 'Throttle PWM minimum (µs)',   'Throttle'),
      p(servoParam(pin, 'MAX'),      f.servo_max ?? 2000, 'Throttle PWM maximum (µs)',   'Throttle'),
      p(servoParam(pin, 'TRIM'),     f.servo_trim ?? 1000,'Throttle trim (µs)',           'Throttle'),
      ...(f.reversed ? [p(servoParam(pin, 'REVERSED'), 1, 'Throttle reversed', 'Throttle')] : []),
    ];
  },

  // ── Servo (Control Surface) ─────────────────────────────────────────────
  servo_surface(c) {
    const f   = c.fields || {};
    const pin = parseInt(c.outputPin, 10);
    if (!pin) return [];
    const fnLabel = `SERVOn_FUNCTION=${f.servo_function} (${c.label})`;
    return [
      p(servoParam(pin, 'FUNCTION'), f.servo_function ?? 4,    fnLabel,                   'Servos'),
      p(servoParam(pin, 'MIN'),      f.servo_min  ?? 1000,     `${c.label} min PWM (µs)`, 'Servos'),
      p(servoParam(pin, 'MAX'),      f.servo_max  ?? 2000,     `${c.label} max PWM (µs)`, 'Servos'),
      p(servoParam(pin, 'TRIM'),     f.servo_trim ?? 1500,     `${c.label} trim (µs)`,    'Servos'),
      ...(f.reversed   ? [p(servoParam(pin, 'REVERSED'), 1,             `${c.label} reversed`,          'Servos')] : []),
      ...(f.servo_rate ? [p(servoParam(pin, 'RATE'),     f.servo_rate,  `${c.label} update rate (Hz)`,  'Servos')] : []),
    ];
  },

  // ── GPS / Compass ───────────────────────────────────────────────────────
  gps(c) {
    const f    = c.fields || {};
    const inst = f.instance ?? 1;
    const pre  = gpsPrefix(inst);
    const si   = serialIdx(f.serial_port ?? 'SERIAL3');
    const out  = [
      p(`${pre}_TYPE`,    f.gps_type ?? 1, `GPS ${inst} type`,     'GPS'),
      p(`${pre}_GNSS_MODE`, f.gps_gnss_mode ?? 0, 'GNSS constellation mask', 'GPS'),
    ];

    // Serial connection (non-CAN)
    if (f.gps_type !== 9) {
      out.push(p(`SERIAL${si}_PROTOCOL`, 5,                          `GPS ${inst} UART protocol`, 'GPS'));
      out.push(p(`SERIAL${si}_BAUD`,     f.serial_baud ?? 115,       `GPS ${inst} baud`,          'GPS'));
      out.push(p(`${pre}_AUTO_CONFIG`,   f.gps_auto_config ? 1 : 0,  'Auto-configure GPS',        'GPS'));
      if (f.gps_type === 1 || f.gps_type <= 2) {
        out.push(p(`${pre}_NAVFILTER`, f.gps_navfilter ?? 8, 'u-blox nav filter (8=airborne<4g)', 'GPS'));
      }
    }

    // Compass
    const compIdx = inst;  // Compass 1 = GPS 1 etc.
    out.push(p(`COMPASS_USE${compIdx === 1 ? '' : compIdx}`,     f.compass_use     ? 1 : 0,  `Compass ${compIdx} enable`,      'Compass'));
    out.push(p(`COMPASS_EXTERN${compIdx === 1 ? '' : compIdx}`,  f.compass_external ? 1 : 0, `Compass ${compIdx} external`,    'Compass'));
    out.push(p(`COMPASS_ORIENT${compIdx === 1 ? '' : compIdx}`,  f.compass_orient ?? 0,      `Compass ${compIdx} orientation`, 'Compass'));
    if (f.compass_motor !== undefined && f.compass_motor !== 0) {
      out.push(p(`COMPASS_MOTCT`, f.compass_motor, 'Compass motor compensation type', 'Compass'));
    }

    // GPS for Yaw (moving baseline)
    if (f.gps_yaw_enable) {
      out.push(p('GPS_MB_ANT_X', f.gps_mb_ant_x ?? 0, 'GPS baseline X (m)', 'GPS Yaw'));
      out.push(p('GPS_MB_ANT_Y', f.gps_mb_ant_y ?? 0, 'GPS baseline Y (m)', 'GPS Yaw'));
      out.push(p('GPS_MB_ANT_Z', f.gps_mb_ant_z ?? 0, 'GPS baseline Z (m)', 'GPS Yaw'));
      out.push(p('GPS_YAW_OFFSET', f.gps_yaw_offset ?? 0, 'GPS yaw offset from nose (deg)', 'GPS Yaw'));
    }

    return out;
  },

  // ── Airspeed ────────────────────────────────────────────────────────────
  airspeed(c, allComponents, vehicleType) {
    const f    = c.fields || {};
    const inst = f.instance ?? 1;
    // Instance 1 = ARSPD_, instances 2-6 = ARSPD2_ through ARSPD6_
    const pre  = inst === 1 ? 'ARSPD' : `ARSPD${inst}`;
    const out  = [
      p(`${pre}_TYPE`,      f.arspd_type      ?? 1,       'Airspeed sensor type',     'Airspeed'),
      p(`${pre}_USE`,       f.arspd_use       ?? 1,       'Use for flight control',   'Airspeed'),
      p(`${pre}_RATIO`,     f.arspd_ratio     ?? 1.9936,  'Pitot calibration ratio',  'Airspeed'),
      p(`${pre}_OFFSET`,    f.arspd_offset    ?? 0,       'Zero-wind offset (Pa)',    'Airspeed'),
      p(`${pre}_PSI_RANGE`, f.arspd_psi_range ?? 1,       'Sensor PSI range',         'Airspeed'),
    ];
    if ([2, 6].includes(f.arspd_type))
      out.push(p(`${pre}_PIN`,      f.arspd_pin ?? 15, 'Analog ADC pin',       'Airspeed'));
    if ([1, 3, 4, 5, 7, 12].includes(f.arspd_type))
      out.push(p(`${pre}_BUS`,      f.arspd_bus ?? 1,  'I2C bus number',       'Airspeed'));
    if (f.arspd_tube_order !== undefined)
      out.push(p(`${pre}_TUBE_ORDR`, f.arspd_tube_order, 'Pitot tube order',   'Airspeed'));
    if (f.arspd_skip_cal)
      out.push(p(`${pre}_SKIP_CAL`, 1, 'Skip boot calibration',                'Airspeed'));
    if (f.arspd_autocal)
      out.push(p(`${pre}_AUTOCAL`,  1, 'Auto-calibrate ratio',                 'Airspeed'));
    // Global settings — emit only from primary instance
    if (inst === 1) {
      if (f.arspd_primary  !== undefined)
        out.push(p('ARSPD_PRIMARY',  f.arspd_primary,  'Primary sensor index',              'Airspeed'));
      if (f.arspd_wind_max !== undefined && f.arspd_wind_max > 0)
        out.push(p('ARSPD_WIND_MAX', f.arspd_wind_max, 'Max wind vs groundspeed (m/s)',     'Airspeed'));
      if (f.arspd_options  !== undefined)
        out.push(p('ARSPD_OPTIONS',  f.arspd_options,  'Airspeed options bitmask',          'Airspeed'));
      if (f.arspd_stall    !== undefined && f.arspd_stall > 0)
        out.push(p('AIRSPEED_STALL', f.arspd_stall,    'Stall airspeed (m/s)',              'Airspeed'));
    }
    return out;
  },

  // ── Rangefinder ─────────────────────────────────────────────────────────
  rangefinder(c) {
    const f    = c.fields || {};
    const inst = f.instance ?? 1;
    const pre  = rngPrefix(inst);
    const out  = [
      p(`${pre}_TYPE`,     f.rngfnd_type   ?? 0,   'Rangefinder type',         'Rangefinder'),
      p(`${pre}_ORIENT`,   f.rngfnd_orient ?? 25,  'Orientation (25=Down)',    'Rangefinder'),
      p(`${pre}_MIN_CM`,   f.rngfnd_min    ?? 20,  'Min range (cm)',           'Rangefinder'),
      p(`${pre}_MAX_CM`,   f.rngfnd_max    ?? 700, 'Max range (cm)',           'Rangefinder'),
      p(`${pre}_GNDCLEAR`, f.rngfnd_gndclear ?? 10,'Ground clearance (cm)',   'Rangefinder'),
    ];
    if (f.rngfnd_type === 1 || f.rngfnd_type === 3) {
      out.push(p(`${pre}_PIN`, f.adc_pin ?? 15, 'ADC pin', 'Rangefinder'));
    }
    if ([2, 4, 7, 20, 25].includes(f.rngfnd_type)) {
      const addr = parseInt(f.i2c_addr, 16) || 0x62;
      out.push(p(`${pre}_ADDR`, addr, 'I2C address', 'Rangefinder'));
    }
    if ([8, 10, 15, 16, 21, 24].includes(f.rngfnd_type)) {
      const si = serialIdx(f.serial_port ?? 'SERIAL4');
      out.push(p(`SERIAL${si}_PROTOCOL`, 9,  'Rangefinder serial protocol', 'Rangefinder'));
      out.push(p(`${pre}_SERIAL`, si,        'Rangefinder serial port index', 'Rangefinder'));
    }
    return out;
  },

  // ── Optical Flow ────────────────────────────────────────────────────────
  optical_flow(c) {
    const f = c.fields || {};
    return [
      p('FLOW_TYPE',       f.flow_type       ?? 0, 'Optical flow sensor type',     'Optical Flow'),
      p('FLOW_ORIENT_YAW', f.flow_orient_yaw ?? 0, 'Flow sensor yaw (centideg)',  'Optical Flow'),
      p('FLOW_POS_X',      f.flow_pos_x      ?? 0, 'Flow sensor X offset (m)',    'Optical Flow'),
      p('FLOW_POS_Y',      f.flow_pos_y      ?? 0, 'Flow sensor Y offset (m)',    'Optical Flow'),
      p('FLOW_POS_Z',      f.flow_pos_z      ?? 0, 'Flow sensor Z offset (m)',    'Optical Flow'),
    ];
  },

  // ── RPM Sensor ──────────────────────────────────────────────────────────
  rpm_sensor(c) {
    const f    = c.fields || {};
    const inst = f.instance ?? 1;
    const pre  = rpmPrefix(inst);
    const out  = [
      p(`${pre}_TYPE`,    f.rpm_type    ?? 0, 'RPM sensor type',            'RPM'),
      p(`${pre}_SCALING`, f.rpm_scaling ?? 1, 'Pulses/rev to RPM factor',   'RPM'),
      p(`${pre}_MIN`,     f.rpm_min ?? 0,     'Minimum valid RPM',          'RPM'),
      p(`${pre}_MAX`,     f.rpm_max ?? 100000,'Maximum valid RPM',          'RPM'),
    ];
    if (f.rpm_type === 1) {
      out.push(p(`${pre}_PIN`, f.rpm_pin ?? 54, 'GPIO pin for RPM signal', 'RPM'));
    }
    return out;
  },

  // ── Battery Monitor ─────────────────────────────────────────────────────
  battery_monitor(c) {
    const f    = c.fields || {};
    const inst = f.instance ?? 1;
    const pre  = battPrefix(inst);

    // Apply hardware preset
    const preset = BATT_PRESETS[f.preset] || {};
    const volt_mult  = f.volt_mult  ?? preset.volt_mult  ?? 10.1;
    const amp_pervlt = f.amp_pervlt ?? preset.amp_pervlt ?? 17.0;
    const volt_pin   = f.volt_pin   ?? preset.volt_pin   ?? 14;
    const curr_pin   = f.curr_pin   ?? preset.curr_pin   ?? 15;

    const out = [
      p(`${pre}_MONITOR`,  f.batt_monitor ?? 4, 'Battery monitor type',         'Battery'),
      p(`${pre}_VOLT_PIN`, volt_pin,              'Voltage sense ADC pin',        'Battery'),
      p(`${pre}_CURR_PIN`, curr_pin,              'Current sense ADC pin',        'Battery'),
      p(`${pre}_VOLT_MULT`, volt_mult,            'Voltage multiplier (V/V)',     'Battery'),
      p(`${pre}_AMP_PERVLT`, amp_pervlt,          'Amps per volt (A/V)',          'Battery'),
      p(`${pre}_AMP_OFFSET`, f.amp_offset ?? 0,  'Current sensor offset (V)',    'Battery'),
      p(`${pre}_CAPACITY`,  f.batt_capacity ?? 5000, 'Battery capacity (mAh)',   'Battery'),
    ];

    if (f.low_volt  > 0) out.push(p(`${pre}_LOW_VOLT`,  f.low_volt,  'Low voltage warning (V)',      'Battery'));
    if (f.crt_volt  > 0) out.push(p(`${pre}_CRT_VOLT`,  f.crt_volt,  'Critical voltage (V)',         'Battery'));
    if (f.low_mah   > 0) out.push(p(`${pre}_LOW_MAH`,   f.low_mah,   'Low mAh warning',              'Battery'));
    if (f.fs_low_act !== undefined) out.push(p(`${pre}_FS_LOW_ACT`, f.fs_low_act, 'Low battery failsafe action', 'Battery'));
    if (f.fs_crt_act !== undefined) out.push(p(`${pre}_FS_CRT_ACT`, f.fs_crt_act,'Critical battery action',     'Battery'));

    return out;
  },

  // ── RC Input ────────────────────────────────────────────────────────────
  rc_input(c) {
    const f  = c.fields || {};
    const si = f.rc_uart ? serialIdx(f.rc_uart) : null;
    const protocols = Array.isArray(f.rc_protocols)
      ? f.rc_protocols.reduce((a, v) => a | v, 0)
      : (f.rc_protocols ?? 1);
    const out = [
      p('RC_PROTOCOLS', protocols, 'RC protocol bitmask', 'RC Input'),
      p('RC_SPEED',     f.rc_speed ?? 400, 'RC/servo update rate (Hz)', 'RC Input'),
    ];
    if (f.rssi_type) {
      out.push(p('RSSI_TYPE', f.rssi_type, 'RSSI source', 'RC Input'));
    }
    // UART-based protocols (CRSF, FPort, SRXL2)
    const uartProtos = [512, 2048, 4096, 256];
    const needsUart  = Array.isArray(f.rc_protocols)
      ? f.rc_protocols.some(v => uartProtos.includes(v))
      : false;
    if (needsUart && si !== null) {
      const proto = f.rc_protocols.includes(512) ? 23 : 23;  // 23=RCInput, 28=CRSF
      out.push(p(`SERIAL${si}_PROTOCOL`, proto, 'RC protocol on UART', 'RC Input'));
    }
    return out;
  },

  // ── Telemetry Radio ─────────────────────────────────────────────────────
  telemetry(c) {
    const f  = c.fields || {};
    const si = serialIdx(f.serial_port ?? 'SERIAL1');
    return [
      p(`SERIAL${si}_PROTOCOL`, f.protocol ?? 2,  'MAVLink protocol version',   'Telemetry'),
      p(`SERIAL${si}_BAUD`,     f.baud ?? 57,      'Telemetry baud rate',        'Telemetry'),
      p('SYSID_THISMAV',        f.sysid_thismav ?? 1, 'MAVLink system ID',       'Telemetry'),
    ];
  },

  // ── Companion Computer ──────────────────────────────────────────────────
  companion(c) {
    const f  = c.fields || {};
    const si = serialIdx(f.serial_port ?? 'SERIAL2');
    return [
      p(`SERIAL${si}_PROTOCOL`, f.protocol ?? 2,  'MAVLink 2 for companion',    'Companion'),
      p(`SERIAL${si}_BAUD`,     f.baud ?? 921,     'Companion baud rate',        'Companion'),
    ];
  },

  // ── CAN / DroneCAN ──────────────────────────────────────────────────────
  can_bus(c) {
    const f = c.fields || {};
    const out = [];

    if (f.can_p1_driver !== undefined && f.can_p1_driver !== 0) {
      out.push(p('CAN_P1_DRIVER',   f.can_p1_driver  ?? 1,       'CAN1 driver type',           'CAN', true));
      out.push(p('CAN_P1_BITRATE',  f.can_p1_bitrate ?? 1000000, 'CAN1 bitrate',               'CAN'));
      out.push(p('CAN_D1_PROTOCOL', 1,                            'CAN1 protocol (DroneCAN)',   'CAN'));
      out.push(p('CAN_D1_UC_NODE',  f.can_d1_uc_node ?? 10,      'Autopilot DroneCAN node ID', 'CAN'));
      out.push(p('CAN_D1_UC_POOL',  f.can_d1_uc_pool ?? 4096,    'DroneCAN memory pool (bytes)','CAN'));
      if (f.can_d1_uc_esc_bm) {
        out.push(p('CAN_D1_UC_ESC_BM', f.can_d1_uc_esc_bm, 'DroneCAN ESC output bitmask', 'CAN'));
      }
      if (f.can_d1_uc_option) {
        out.push(p('CAN_D1_UC_OPTION', f.can_d1_uc_option, 'DroneCAN options bitmask', 'CAN'));
      }
    }

    if (f.can_p2_driver !== undefined && f.can_p2_driver !== 0) {
      out.push(p('CAN_P2_DRIVER',   f.can_p2_driver ?? 1, 'CAN2 driver type', 'CAN', true));
      out.push(p('CAN_D2_PROTOCOL', 1,                     'CAN2 protocol',   'CAN'));
    }

    return out;
  },

  // ── LED / Buzzer ────────────────────────────────────────────────────────
  led_notify(c) {
    const f   = c.fields || {};
    const pin = parseInt(c.outputPin, 10);
    const out = [
      p('NTF_LED_TYPES',   f.ntf_led_types   ?? 2,   'LED type bitmask',  'Notify'),
      p('NTF_LED_BRIGHT',  f.ntf_led_bright  ?? 2,   'LED brightness',    'Notify'),
      p('NTF_BUZZ_TYPES',  f.ntf_buzz_types  ?? 1,   'Buzzer type bitmask','Notify'),
      p('NTF_BUZZ_VOLUME', f.ntf_buzz_volume ?? 100, 'Buzzer volume (%)', 'Notify'),
    ];
    if (pin) {
      out.push(p(servoParam(pin, 'FUNCTION'), 120, 'NeoPixel LED output (SERVOn_FUNCTION=120)', 'Notify'));
    }
    return out;
  },

  // ── Camera Trigger ──────────────────────────────────────────────────────
  camera_trigger(c) {
    const f   = c.fields || {};
    const pin = parseInt(c.outputPin, 10);
    const out = [
      p('CAM_TRIGG_TYPE',   f.cam_trigg_type ?? 0,  'Camera trigger type',          'Camera'),
      p('CAM_DURATION',     f.cam_duration   ?? 10,  'Shutter duration (×100ms)',    'Camera'),
    ];
    if (f.cam_trigg_type === 0 && pin) {
      out.push(p(servoParam(pin, 'FUNCTION'), 10, 'Camera shutter servo output', 'Camera'));
      out.push(p('CAM_SERVO_ON',  f.cam_servo_on  ?? 1800, 'Shutter servo ON PWM',  'Camera'));
      out.push(p('CAM_SERVO_OFF', f.cam_servo_off ?? 1200, 'Shutter servo OFF PWM', 'Camera'));
    }
    if (f.cam_trigg_type === 1) {
      out.push(p('CAM_RELAY_ON', f.cam_relay_on ? 1 : 0, 'Relay state when triggered', 'Camera'));
    }
    if (f.cam_feedback_pin && f.cam_feedback_pin !== -1) {
      out.push(p('CAM_FEEDBACK_PIN', f.cam_feedback_pin, 'Shutter feedback GPIO pin', 'Camera'));
      out.push(p('CAM_FEEDBACK_POL', f.cam_feedback_pol ?? 0, 'Feedback polarity',    'Camera'));
    }
    if (f.mnt_type !== undefined && f.mnt_type !== 0) {
      out.push(p('MNT_TYPE', f.mnt_type, 'Gimbal/mount type', 'Camera'));
    }
    return out;
  },

  // ── Parachute ───────────────────────────────────────────────────────────
  parachute(c) {
    const f   = c.fields || {};
    const pin = parseInt(c.outputPin, 10);
    const out = [
      p('CHUTE_ENABLED',  f.chute_enabled ? 1 : 0, 'Parachute enable',       'Parachute'),
      p('CHUTE_TYPE',     f.chute_type ?? 0,        'Release type (0=relay)', 'Parachute'),
      p('CHUTE_ALT_MIN',  f.chute_alt_min  ?? 10,   'Min altitude for deploy (m)', 'Parachute'),
      p('CHUTE_DELAY_MS', f.chute_delay_ms ?? 1000, 'Deploy delay after crash (ms)','Parachute'),
      p('CHUTE_CRT_SINK', f.chute_crt_sink ?? 10,   'Critical sink rate (m/s)',    'Parachute'),
    ];
    if (f.chute_type === 1 && pin) {
      out.push(p(servoParam(pin, 'FUNCTION'), 27, 'Parachute servo output (SERVOn_FUNCTION=27)', 'Parachute'));
      out.push(p('CHUTE_SERVO_ON',  f.chute_servo_on  ?? 1800, 'Parachute deploy PWM', 'Parachute'));
      out.push(p('CHUTE_SERVO_OFF', f.chute_servo_off ?? 1200, 'Parachute stowed PWM', 'Parachute'));
    }
    return out;
  },

  // ── Landing Gear ────────────────────────────────────────────────────────
  landing_gear(c) {
    const f   = c.fields || {};
    const pin = parseInt(c.outputPin, 10);
    const out = [
      p('LGR_ENABLE',       f.lgr_enable ? 1 : 0, 'Landing gear control enable', 'Landing Gear'),
      p('LGR_SERVO_RTRACT', f.lgr_servo_rtract ?? 1800, 'Retracted PWM',          'Landing Gear'),
      p('LGR_SERVO_DEPLOY', f.lgr_servo_deploy ?? 1200, 'Deployed PWM',           'Landing Gear'),
      p('LGR_DEPLOY_ALT',   f.lgr_deploy_alt  ?? 10,   'Auto-deploy altitude (m)','Landing Gear'),
      p('LGR_RETRACT_ALT',  f.lgr_retract_alt ?? 15,   'Auto-retract altitude (m)','Landing Gear'),
    ];
    if (pin) {
      out.push(p(servoParam(pin, 'FUNCTION'), 29, 'Landing gear servo output (SERVOn_FUNCTION=29)', 'Landing Gear'));
    }
    return out;
  },

  // ── Relay / GPIO ────────────────────────────────────────────────────────
  relay_gpio(c) {
    const f    = c.fields || {};
    const inst = f.instance ?? 1;
    return [
      p(relayPin(inst),          f.relay_pin     ?? -1, `Relay ${inst} GPIO pin`,    'GPIO'),
      p(`RELAY_DEFAULT${inst === 1 ? '' : inst}`, f.relay_default ?? 0, `Relay ${inst} boot state`, 'GPIO'),
    ];
  },

  // ── ADS-B ───────────────────────────────────────────────────────────────
  adsb(c) {
    const f  = c.fields || {};
    const si = serialIdx(f.serial_port ?? 'SERIAL4');
    const out = [
      p('ADSB_TYPE',        f.adsb_type ?? 0,  'ADS-B device type',            'ADS-B'),
      p('ADSB_LIST_MAX',    f.adsb_list_max    ?? 25, 'Max tracked vehicles',  'ADS-B'),
      p('ADSB_LIST_RADIUS', f.adsb_list_radius ?? 10000, 'Track radius (m)',   'ADS-B'),
      p('ADSB_SQUAWK',      f.adsb_squawk      ?? 1200, 'Squawk code',         'ADS-B'),
      p('ADSB_EMIT_TYPE',   f.adsb_emit_type   ?? 14, 'Emitter category (14=UAV)', 'ADS-B'),
    ];
    if (f.adsb_type && f.adsb_type !== 0) {
      out.push(p(`SERIAL${si}_PROTOCOL`, 35, 'ADS-B serial protocol (35=ADSB)', 'ADS-B'));
    }
    return out;
  },

  // ── OSD ─────────────────────────────────────────────────────────────────
  osd(c) {
    const f  = c.fields || {};
    const si = serialIdx(f.serial_port ?? 'SERIAL4');
    const out = [
      p('OSD_TYPE', f.osd_type ?? 0, 'OSD type', 'OSD'),
    ];
    if ([3, 4, 5].includes(f.osd_type)) {
      out.push(p(`SERIAL${si}_PROTOCOL`, 42, 'DisplayPort / MSP OSD protocol', 'OSD'));
    }
    return out;
  },

  // ── Board Orientation ───────────────────────────────────────────────────
  board_orientation(c) {
    const f = c.fields || {};
    return [
      p('AHRS_ORIENTATION', f.ahrs_orientation ?? 0,  'Board orientation',               'IMU', true),
      p('AHRS_TRIM_X',      f.ahrs_trim_x     ?? 0,  'Roll trim (rad)',                  'IMU'),
      p('AHRS_TRIM_Y',      f.ahrs_trim_y     ?? 0,  'Pitch trim (rad)',                 'IMU'),
      p('AHRS_EKF_TYPE',    f.ahrs_ekf_type   ?? 3,  'EKF version (3=EKF3)',             'IMU', true),
      p('EK3_ENABLE',       1,                        'EKF3 enabled',                     'IMU', true),
      p('EK3_IMU_MASK',     f.ek3_imu_mask    ?? 7,  'EKF3 IMU lane bitmask',            'IMU'),
      p('INS_FAST_SAMPLE',  f.ins_fast_sample ?? 1,  'Fast IMU sampling bitmask',        'IMU'),
      p('INS_GYRO_FILTER',  f.ins_gyro_filter ?? 20, 'Gyro low-pass filter cutoff (Hz)', 'IMU'),
    ];
  },

  // ── Harmonic Notch ──────────────────────────────────────────────────────
  harmonic_notch(c) {
    const f = c.fields || {};
    if (!f.hntch_enable) return [];
    return [
      p('INS_HNTCH_ENABLE', 1,                      'Harmonic notch filter enabled',    'Notch Filter'),
      p('INS_HNTCH_MODE',   f.hntch_mode  ?? 1,     'Notch tracking mode',              'Notch Filter'),
      p('INS_HNTCH_FREQ',   f.hntch_freq  ?? 80,    'Notch centre frequency (Hz)',      'Notch Filter'),
      p('INS_HNTCH_BW',     f.hntch_bw    ?? 40,    'Notch bandwidth (Hz)',             'Notch Filter'),
      p('INS_HNTCH_ATT',    f.hntch_att   ?? 40,    'Notch attenuation (dB)',           'Notch Filter'),
      p('INS_HNTCH_REF',    f.hntch_ref   ?? 0.35,  'Reference value (hover throttle)', 'Notch Filter'),
      p('INS_HNTCH_HMNCS',  f.hntch_hmncs ?? 3,    'Harmonic bitmask',                 'Notch Filter'),
      p('INS_HNTCH_OPTS',   f.hntch_opts  ?? 0,    'Notch options bitmask',            'Notch Filter'),
    ];
  },

  // ── Failsafe ────────────────────────────────────────────────────────────
  failsafe(c, allComponents, vehicleType) {
    const f = c.fields || {};
    const out = [];
    if (vehicleType === 'copter') {
      out.push(p('FS_THR_ENABLE',  f.fs_thr_enable  ?? 1,   'RC throttle failsafe action',     'Failsafe'));
      out.push(p('FS_THR_VALUE',   f.fs_thr_value   ?? 975, 'Throttle failsafe PWM threshold', 'Failsafe'));
      out.push(p('FS_GCS_ENABLE',  f.fs_gcs_enable  ?? 0,   'GCS heartbeat failsafe',          'Failsafe'));
      out.push(p('FS_GCS_TIMEOUT', f.fs_gcs_timeout ?? 5,   'GCS failsafe timeout (s)',         'Failsafe'));
      out.push(p('FS_EKF_ACTION',  f.fs_ekf_action  ?? 1,   'EKF failsafe action',             'Failsafe'));
      out.push(p('FS_EKF_THRESH',  f.fs_ekf_thresh  ?? 0.8, 'EKF variance threshold',          'Failsafe'));
      if (f.rtl_alt !== undefined)
        out.push(p('RTL_ALT', f.rtl_alt ?? 1500, 'RTL altitude (cm)', 'Failsafe'));
      if (f.rtl_loiter_time !== undefined)
        out.push(p('RTL_LOIT_TIME', f.rtl_loiter_time ?? 5000, 'RTL loiter time (ms)', 'Failsafe'));
    } else {
      // Plane / VTOL — different param names from Copter
      out.push(p('THR_FAILSAFE',    f.thr_failsafe    ?? 1,  'Throttle failsafe enable',        'Failsafe'));
      out.push(p('THR_FS_VALUE',    f.thr_fs_value    ?? 950,'Throttle failsafe PWM threshold', 'Failsafe'));
      out.push(p('FS_SHORT_ACTN',   f.fs_short_actn   ?? 0,  'Short failsafe action',           'Failsafe'));
      out.push(p('FS_LONG_ACTN',    f.fs_long_actn    ?? 1,  'Long failsafe action',            'Failsafe'));
      out.push(p('FS_LONG_TIMEOUT', f.fs_long_timeout ?? 20, 'Long failsafe timeout (s)',        'Failsafe'));
      out.push(p('FS_GCS_ENABL',    f.fs_gcs_enabl    ?? 0,  'GCS heartbeat failsafe',          'Failsafe'));
      out.push(p('FS_GCS_TIMEOUT',  f.fs_gcs_timeout  ?? 5,  'GCS failsafe timeout (s)',         'Failsafe'));
      if (f.rtl_altitude !== undefined)
        out.push(p('RTL_ALTITUDE', f.rtl_altitude ?? 100, 'RTL altitude (m)', 'Failsafe'));
      if (f.rtl_climb_min !== undefined)
        out.push(p('RTL_CLIMB_MIN', f.rtl_climb_min ?? 10, 'RTL minimum climb (m)', 'Failsafe'));
      if (f.rtl_autoland !== undefined)
        out.push(p('RTL_AUTOLAND', f.rtl_autoland ?? 0, 'RTL auto land mode', 'Failsafe'));
    }
    return out;
  },

  // ── Arming ──────────────────────────────────────────────────────────────
  arming(c) {
    const f = c.fields || {};
    const out = [
      p('ARMING_REQUIRE',   f.arming_require   ?? 1, 'Motor arming requirement',           'Arming'),
      p('ARMING_RUDDER',    f.arming_rudder    ?? 2, 'Arm/disarm with rudder',             'Arming'),
      p('ARMING_ACCTHRESH', f.arming_accthresh ?? 5, 'Accelerometer error threshold (m/s²)','Arming'),
      p('ARMING_OPTIONS',   f.arming_options   ?? 0, 'Arming options bitmask',             'Arming'),
      p('ARMING_SKIPCHK',   f.arming_skipchk   ?? 0, 'Skip arming checks bitmask',         'Arming'),
    ];
    if (f.arming_magthresh !== undefined && f.arming_magthresh > 0)
      out.push(p('ARMING_MAGTHRESH', f.arming_magthresh, 'Compass error threshold (mGauss)', 'Arming'));
    if (f.arming_mis_items !== undefined && f.arming_mis_items > 0)
      out.push(p('ARMING_MIS_ITEMS', f.arming_mis_items, 'Required mission items bitmask', 'Arming'));
    if (f.disarm_delay !== undefined)
      out.push(p('DISARM_DELAY', f.disarm_delay ?? 10, 'Auto-disarm delay (s)', 'Arming'));
    return out;
  },

  // ── Flight modes ─────────────────────────────────────────────────────────
  flight_modes(c) {
    const f = c.fields || {};
    const out = [
      p('FLTMODE_CH',   f.fltmode_ch   ?? 5, 'Flight mode RC channel', 'Flight Modes'),
      p('INITIAL_MODE', f.initial_mode ?? 0,  'Initial mode at boot',   'Flight Modes'),
    ];
    for (let n = 1; n <= 6; n++) {
      const val = f[`fltmode${n}`];
      if (val !== undefined)
        out.push(p(`FLTMODE${n}`, val, `Flight mode ${n}`, 'Flight Modes'));
    }
    return out;
  },

  // ── Advanced Failsafe (AFS) ───────────────────────────────────────────────
  advanced_failsafe(c) {
    const f = c.fields || {};
    if (!f.afs_enable) return [];
    const out = [
      p('AFS_ENABLE',       1,                       'Advanced failsafe enabled',          'AFS'),
      p('AFS_TERM_ACTION',  f.afs_term_action ?? 0,  'Terminate action',                  'AFS'),
      p('AFS_TERM_PIN',     f.afs_term_pin    ?? -1, 'Terminate GPIO pin',                'AFS'),
      p('AFS_MAN_PIN',      f.afs_man_pin     ?? -1, 'Manual mode GPIO pin',              'AFS'),
      p('AFS_HB_PIN',       f.afs_hb_pin      ?? -1, 'Heartbeat output GPIO pin',         'AFS'),
      p('AFS_AMSL_LIMIT',   f.afs_amsl_limit  ?? 0,  'AMSL altitude limit (m)',           'AFS'),
      p('AFS_MAX_RANGE',    f.afs_max_range   ?? 0,  'Max range from home (m)',           'AFS'),
      p('AFS_MAX_GPS_LOSS', f.afs_max_gps_loss ?? 0, 'Max GPS loss events',               'AFS'),
      p('AFS_MAX_COM_LOSS', f.afs_max_com_loss ?? 0, 'Max comms loss events',             'AFS'),
      p('AFS_RC_FAIL_TIME', f.afs_rc_fail_time ?? 1.5, 'RC fail time (s)',               'AFS'),
      p('AFS_GCS_TIMEOUT',  f.afs_gcs_timeout  ?? 10,  'AFS GCS timeout (s)',            'AFS'),
      p('AFS_OPTIONS',      f.afs_options      ?? 0,    'AFS options bitmask',            'AFS'),
    ];
    if (f.afs_amsl_err_gps !== undefined)
      out.push(p('AFS_AMSL_ERR_GPS', f.afs_amsl_err_gps, 'GPS AMSL error margin (m)', 'AFS'));
    if (f.afs_qnh_pressure !== undefined && f.afs_qnh_pressure > 0)
      out.push(p('AFS_QNH_PRESSURE', f.afs_qnh_pressure, 'QNH pressure (hPa)', 'AFS'));
    return out;
  },

  // ── Takeoff & Landing (Plane) ─────────────────────────────────────────────
  takeoff_landing(c) {
    const f = c.fields || {};
    const out = [];
    if (f.tkoff_thr_minspd  !== undefined) out.push(p('TKOFF_THR_MINSPD',  f.tkoff_thr_minspd,  'Min airspeed before throttle (m/s)',    'Takeoff'));
    if (f.tkoff_thr_minacc  !== undefined) out.push(p('TKOFF_THR_MINACC',  f.tkoff_thr_minacc,  'Min acceleration for throttle (m/s²)',  'Takeoff'));
    if (f.tkoff_thr_delay   !== undefined) out.push(p('TKOFF_THR_DELAY',   f.tkoff_thr_delay,   'Throttle delay after launch detect',    'Takeoff'));
    if (f.tkoff_thr_max     !== undefined) out.push(p('TKOFF_THR_MAX',     f.tkoff_thr_max,     'Max takeoff throttle (%)',              'Takeoff'));
    if (f.tkoff_thr_min     !== undefined) out.push(p('TKOFF_THR_MIN',     f.tkoff_thr_min,     'Min takeoff throttle (%)',              'Takeoff'));
    if (f.tkoff_thr_idle    !== undefined) out.push(p('TKOFF_THR_IDLE',    f.tkoff_thr_idle,    'Idle throttle pre-takeoff (%)',         'Takeoff'));
    if (f.tkoff_thr_slew    !== undefined) out.push(p('TKOFF_THR_SLEW',    f.tkoff_thr_slew,    'Throttle slew at takeoff (%/s)',        'Takeoff'));
    if (f.tkoff_thr_max_t   !== undefined) out.push(p('TKOFF_THR_MAX_T',   f.tkoff_thr_max_t,   'Max full throttle time (s)',            'Takeoff'));
    if (f.tkoff_tdrag_elev  !== undefined) out.push(p('TKOFF_TDRAG_ELEV',  f.tkoff_tdrag_elev,  'Tail-dragger elevator hold (%)',        'Takeoff'));
    if (f.tkoff_tdrag_spd1  !== undefined) out.push(p('TKOFF_TDRAG_SPD1',  f.tkoff_tdrag_spd1,  'Tail-dragger speed threshold (m/s)',    'Takeoff'));
    if (f.tkoff_rotate_spd  !== undefined) out.push(p('TKOFF_ROTATE_SPD',  f.tkoff_rotate_spd,  'Rotation speed (m/s)',                  'Takeoff'));
    if (f.tkoff_accel_cnt   !== undefined) out.push(p('TKOFF_ACCEL_CNT',   f.tkoff_accel_cnt,   'Acceleration count for detection',     'Takeoff'));
    if (f.tkoff_options     !== undefined) out.push(p('TKOFF_OPTIONS',     f.tkoff_options,     'Takeoff options bitmask',               'Takeoff'));
    if (f.tkoff_flap_pcnt   !== undefined) out.push(p('TKOFF_FLAP_PCNT',   f.tkoff_flap_pcnt,   'Takeoff flap percentage',              'Takeoff'));
    if (f.tkoff_plim_sec    !== undefined) out.push(p('TKOFF_PLIM_SEC',    f.tkoff_plim_sec,    'Pitch limit reduction time (s)',        'Takeoff'));
    if (f.tkoff_timeout     !== undefined) out.push(p('TKOFF_TIMEOUT',     f.tkoff_timeout,     'Takeoff timeout (s)',                   'Takeoff'));
    if (f.rngfnd_landing)                  out.push(p('RNGFND_LANDING',    1,                   'Use rangefinder for landing flare',     'Landing'));
    if (f.rngfnd_lnd_ornt   !== undefined) out.push(p('RNGFND_LND_ORNT',   f.rngfnd_lnd_ornt,   'Landing rangefinder orientation',       'Landing'));
    if (f.rngfnd_lnd_dist   !== undefined) out.push(p('RNGFND_LND_DIST',   f.rngfnd_lnd_dist,   'Rangefinder engagement distance (m)',   'Landing'));
    if (f.crash_detect       !== undefined) out.push(p('CRASH_DETECT',      f.crash_detect,      'Crash detection mode',                  'Landing'));
    if (f.crash_acc_thresh   !== undefined) out.push(p('CRASH_ACC_THRESH',  f.crash_acc_thresh,  'Crash decel threshold (m/s²)',          'Landing'));
    return out;
  },

  // ── Terrain following ────────────────────────────────────────────────────
  terrain(c) {
    const f = c.fields || {};
    return [
      p('TERRAIN_FOLLOW',  f.terrain_follow  ?? 0,    'Terrain following mode', 'Terrain'),
      p('TERRAIN_LOOKAHD', f.terrain_lookahd ?? 2000, 'Terrain lookahead (m)',  'Terrain'),
    ];
  },

  // ── Pilot control (Copter) ────────────────────────────────────────────────
  pilot_control(c) {
    const f = c.fields || {};
    return [
      p('PILOT_SPD_UP',    f.pilot_spd_up    ?? 250,  'Max climb speed (cm/s)',       'Pilot'),
      p('PILOT_SPD_DN',    f.pilot_spd_dn    ?? 150,  'Max descent speed (cm/s)',     'Pilot'),
      p('PILOT_ACC_Z',     f.pilot_acc_z     ?? 250,  'Vertical acceleration (cm/s²)','Pilot'),
      p('PILOT_TKO_ALT_M', f.pilot_tko_alt_m ?? 1,   'Takeoff altitude (m)',         'Pilot'),
      p('PILOT_THR_FILT',  f.pilot_thr_filt  ?? 0,   'Throttle filter cutoff (Hz)',  'Pilot'),
      p('PILOT_THR_BHV',   f.pilot_thr_bhv   ?? 0,   'Throttle stick behaviour',     'Pilot'),
      p('THR_DZ',          f.thr_dz          ?? 100,  'Throttle deadzone (PWM)',      'Pilot'),
      p('PILOT_Y_RATE',    f.pilot_y_rate    ?? 200,  'Pilot yaw rate (°/s)',         'Pilot'),
      p('PILOT_Y_EXPO',    f.pilot_y_expo    ?? 0,    'Pilot yaw expo',               'Pilot'),
      p('PILOT_Y_RATE_TC', f.pilot_y_rate_tc ?? 0.15, 'Yaw rate time constant (s)',  'Pilot'),
    ];
  },
};

// ─── Main export function ─────────────────────────────────────────────────────

/**
 * Convert all configured components into a flat array of param entries.
 *
 * Handles:
 *   - Deduplication of global params (MOT_PWM_TYPE, SYSID_THISMAV, etc.)
 *   - BLHeli bitmask accumulation across all ESC instances
 *   - Ordering: vehicle setup → propulsion → sensors → power → RC/GCS → peripherals
 */
export function buildParamList(components, vehicleType) {
  const seen   = new Map();   // param → first value seen (for dedup)
  const result = [];

  const GROUP_ORDER = [
    'Frame', 'VTOL Frame', 'VTOL Transition', 'VTOL Motors',
    'Arming', 'Flight Modes', 'Pilot',
    'Motors', 'Throttle', 'Servos', 'Mixing',
    'Takeoff', 'Landing', 'Terrain',
    'GPS', 'GPS Yaw', 'Compass', 'Airspeed', 'Rangefinder', 'Optical Flow', 'RPM',
    'Battery', 'Power',
    'RC Input', 'Telemetry', 'Companion',
    'CAN', 'ESC Telemetry', 'Notify', 'GPIO', 'Camera', 'Parachute',
    'Landing Gear', 'ADS-B', 'OSD',
    'IMU', 'Notch Filter', 'Failsafe', 'AFS',
  ];

  const grouped = {};
  GROUP_ORDER.forEach(g => { grouped[g] = []; });

  // Emit BLHeli global bitmasks first
  const blheliParams = buildBlheliBitmasks(components);
  blheliParams.forEach(entry => {
    if (!seen.has(entry.param)) {
      seen.set(entry.param, entry.value);
      grouped['ESC Telemetry'] = grouped['ESC Telemetry'] || [];
      grouped['ESC Telemetry'].push(entry);
    }
  });

  // Map each component
  for (const component of components) {
    const mapper = MAPPERS[component.defId];
    if (!mapper) continue;

    const entries = mapper(component, components, vehicleType);
    for (const entry of entries) {
      if (seen.has(entry.param)) {
        // For global params, first value wins; warn if conflict
        if (seen.get(entry.param) !== entry.value) {
          entry._conflict = true;
        }
        continue;
      }
      seen.set(entry.param, entry.value);
      const grp = entry.group || 'Other';
      grouped[grp] = grouped[grp] || [];
      grouped[grp].push(entry);
    }
  }

  return { grouped, flat: Object.values(grouped).flat() };
}

/**
 * Params that require a reboot to take effect.
 * Flagged in the export UI.
 */
export function getRebootRequired(paramList) {
  return paramList.filter(p => p.rebootRequired);
}
