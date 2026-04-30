# AVC — ArduPilot Visual Configurator
# Copyright (C) 2026 Patternlynx Limited
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see <https://www.gnu.org/licenses/>.

"""
data/param_mappings.py
────────────────────────────────────────────────────────────────────────────────
Translates configured component instances into ArduPilot parameter name/value
pairs for .param file export.
"""

from typing import Any

# ── Battery monitor hardware presets ─────────────────────────────────────────
BATT_PRESETS: dict[str, dict[str, float | int]] = {
    "custom":          {},
    "cube_brick":      {"volt_mult": 10.1,  "amp_pervlt": 17.0,  "volt_pin": 14, "curr_pin": 15},
    "cube_brick_mini": {"volt_mult": 10.1,  "amp_pervlt": 17.0,  "volt_pin": 14, "curr_pin": 15},
    "mauch_hs_050":    {"volt_mult": 10.0,  "amp_pervlt": 40.0,  "volt_pin": 14, "curr_pin": 15},
    "mauch_hs_100":    {"volt_mult": 10.0,  "amp_pervlt": 80.0,  "volt_pin": 14, "curr_pin": 15},
    "mauch_hs_200":    {"volt_mult": 10.0,  "amp_pervlt": 162.0, "volt_pin": 14, "curr_pin": 15},
    "holybro_pm06":    {"volt_mult": 18.18, "amp_pervlt": 36.36, "volt_pin": 14, "curr_pin": 15},
}


_PIN_LABEL_MAP: dict[str, int] = {
    **{f"M{i}": i     for i in range(1, 9)},
    **{f"A{i}": i + 8 for i in range(1, 7)},
}

def _pin_to_servo(pin: Any) -> int | None:
    """Convert an output_pin value to a SERVO channel number.

    Accepts both string labels ("M1"–"M8", "A1"–"A6") and integers 1–14.
    """
    if isinstance(pin, str):
        return _PIN_LABEL_MAP.get(pin)
    try:
        n = int(pin)
        return n if 1 <= n <= 14 else None
    except (TypeError, ValueError):
        return None


def _comp_pin(comp: dict) -> Any:
    """Return the output pin for a component, checking outputPin before fields.output_pin."""
    return comp.get("outputPin") or comp.get("fields", {}).get("output_pin")


def _bool_int(v: Any) -> int:
    if isinstance(v, bool):
        return 1 if v else 0
    return int(v)


def build_param_list(
    components: list[dict[str, Any]],
    vehicle_type: str,
) -> dict:
    """
    Translate a list of configured component instances into ArduPilot
    parameter name/value pairs.

    Returns:
        {
            "grouped": { "Frame": [...], "Motors": [...], ... },
            "flat":    [ { "param": "FRAME_CLASS", "value": 1 }, ... ]
        }
    """
    grouped: dict[str, list] = {}
    flat: list[dict] = []

    # Multi-component accumulators
    blheli_mask      = 0
    blheli_telem_mask = 0
    blheli_bidi_mask  = 0
    blheli_poles: int | None = None
    mot_pwm_type_added = False

    def add(group: str, param: str, value: Any) -> None:
        entry = {"param": param, "value": value, "group": group}
        grouped.setdefault(group, []).append(entry)
        flat.append(entry)

    def has(fields: dict, key: str) -> bool:
        return key in fields and fields[key] is not None

    def get(fields: dict, key: str, default: Any = None) -> Any:
        return fields.get(key, default)

    # Pre-pass: collect motor output pins and motor_num→servo_n map for ESC BLHeli masking.
    # Also collect all servo ports claimed by physical chips so servo_outputs can skip them.
    motor_servo_pins: list[int] = []
    motor_num_to_servo: dict[int, int] = {}
    claimed_servo_ports: set[int] = set()
    for _c in components:
        _did = _c.get("defId", "")
        _pin = _comp_pin(_c)
        _flds = _c.get("fields", {})
        _conn = _flds.get("connection_type", "pwm")
        _role = _flds.get("esc_role", "motor")
        if _pin is not None:
            _sn = _pin_to_servo(_pin)
            if _sn and (
                _did == "motor"
                or (_did == "servo" and _conn != "dronecan")
                or (_did == "esc" and _conn != "dronecan" and _role == "throttle")
            ):
                claimed_servo_ports.add(_sn)
        if _did == "motor":
            _mnum = _c.get("fields", {}).get("motor_num")
            if _pin is not None:
                _sn = _pin_to_servo(_pin)
                if _sn:
                    motor_servo_pins.append(_sn)
                    if _mnum is not None:
                        motor_num_to_servo[int(_mnum)] = _sn

    for comp in components:
        defId  = comp.get("defId", "")
        fields: dict = comp.get("fields", {}) or {}

        # ── Frame (Copter) ────────────────────────────────────────────────────
        if defId == "frame_copter":
            if has(fields, "frame_class"):
                add("Frame", "FRAME_CLASS", fields["frame_class"])
            if has(fields, "frame_type"):
                add("Frame", "FRAME_TYPE", fields["frame_type"])
            for key, param in [
                ("mot_spin_arm",   "MOT_SPIN_ARM"),
                ("mot_spin_min",   "MOT_SPIN_MIN"),
                ("mot_spin_max",   "MOT_SPIN_MAX"),
                ("mot_thst_expo",  "MOT_THST_EXPO"),
                ("mot_thst_hover", "MOT_THST_HOVER"),
            ]:
                if has(fields, key):
                    add("Motors", param, fields[key])

        # ── Frame (Plane) ─────────────────────────────────────────────────────
        elif defId == "frame_plane":
            if has(fields, "airspeed_min"):
                add("Frame", "ARSPD_FBW_MIN", fields["airspeed_min"])
            if has(fields, "airspeed_max"):
                add("Frame", "ARSPD_FBW_MAX", fields["airspeed_max"])
            if has(fields, "airspeed_cruise"):
                # ArduPilot stores cruise airspeed in cm/s
                add("Frame", "TRIM_ARSPD_CM", int(fields["airspeed_cruise"] * 100))
            if has(fields, "stall_prevention"):
                add("Frame", "STALL_PREVENTION", _bool_int(fields["stall_prevention"]))
            if has(fields, "thr_min"):
                add("Frame", "THR_MIN", fields["thr_min"])
            if has(fields, "thr_max"):
                add("Frame", "THR_MAX", fields["thr_max"])
            if has(fields, "thr_cruise"):
                add("Frame", "TRIM_THROTTLE", fields["thr_cruise"])
            for key, param in [
                ("tecs_clmb_max",    "TECS_CLMB_MAX"),
                ("tecs_sink_min",    "TECS_SINK_MIN"),
                ("tecs_sink_max",    "TECS_SINK_MAX"),
                ("tecs_time_const",  "TECS_TIME_CONST"),
                ("tecs_thrdamp",     "TECS_THR_DAMP"),
                ("tecs_ptchff",      "TECS_PTCH_FF"),
                ("tecs_pitch_max",   "TECS_PITCH_MAX"),
                ("tecs_pitch_min",   "TECS_PITCH_MIN"),
                ("tecs_land_arspd",  "TECS_LAND_ARSPD"),
                ("tecs_land_spdwgt", "TECS_LAND_SPDWGT"),
                ("tecs_spdweight",   "TECS_SPDWEIGHT"),
                ("tecs_integ_gain",  "TECS_INTEG_GAIN"),
            ]:
                if has(fields, key):
                    add("Frame", param, fields[key])

        # ── Frame (VTOL) ──────────────────────────────────────────────────────
        elif defId == "frame_vtol":
            if has(fields, "q_enable"):
                add("Frame", "Q_ENABLE", _bool_int(fields["q_enable"]))
            if has(fields, "q_frame_class"):
                add("Frame", "Q_FRAME_CLASS", fields["q_frame_class"])
            if has(fields, "q_frame_type"):
                add("Frame", "Q_FRAME_TYPE", fields["q_frame_type"])
            if has(fields, "q_tilt_enable"):
                add("Frame", "Q_TILT_ENABLE", _bool_int(fields["q_tilt_enable"]))
            for key, param in [
                ("q_tilt_type",    "Q_TILT_TYPE"),
                ("q_tilt_mask",    "Q_TILT_MASK"),
                ("q_tilt_rate_up",  "Q_TILT_RATE_UP"),
                ("q_tilt_rate_dn",  "Q_TILT_RATE_DN"),
                ("q_tilt_max",      "Q_TILT_MAX"),
                ("q_tilt_yaw_angle","Q_TILT_YAW_ANGLE"),
                ("q_tilt_fix_angle","Q_TILT_FIX_ANGLE"),
                ("q_trans_decel",  "Q_TRANS_DECEL"),
                ("q_trans_timeout","Q_TRANSITION_MS"),
                ("q_vfwd_gain",    "Q_VFWD_GAIN"),
                ("q_assist_speed", "Q_ASSIST_SPEED"),
                ("q_assist_alt",   "Q_ASSIST_ALT"),
                ("q_loit_speed",   "Q_LOIT_SPEED"),
                ("q_loit_accel",   "Q_LOIT_ACC_MAX"),
                ("q_loit_ang_max", "Q_LOIT_ANG_MAX"),
                ("q_loit_brkaccel","Q_LOIT_BRK_ACCEL"),
                ("q_rtl_mode",     "Q_RTL_MODE"),
                ("q_wp_speed",     "Q_WP_SPEED"),
                ("q_wp_accel",     "Q_WP_ACCEL"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Frame", param, _bool_int(v) if isinstance(v, bool) else v)
            if has(fields, "q_guided_mode"):
                add("Frame", "Q_GUIDED_MODE", _bool_int(fields["q_guided_mode"]))

        # ── Board Orientation ─────────────────────────────────────────────────
        elif defId == "board_orientation":
            if has(fields, "ahrs_orientation"):
                add("IMU", "AHRS_ORIENTATION", fields["ahrs_orientation"])
            for key, param in [
                ("ins_pos_x", "INS_POS_X"),
                ("ins_pos_y", "INS_POS_Y"),
                ("ins_pos_z", "INS_POS_Z"),
            ]:
                if has(fields, key):
                    add("IMU", param, fields[key])

        # ── Harmonic Notch Filter ─────────────────────────────────────────────
        elif defId == "harmonic_notch":
            for key, param in [
                ("ins_hntch_enable", "INS_HNTCH_ENABLE"),
                ("ins_hntch_mode",   "INS_HNTCH_MODE"),
                ("ins_hntch_freq",   "INS_HNTCH_FREQ"),
                ("ins_hntch_bw",     "INS_HNTCH_BW"),
                ("ins_hntch_attn",   "INS_HNTCH_ATTN"),
                ("ins_hntch_hmncs",  "INS_HNTCH_HMNCS"),
                ("ins_hntch_ref",    "INS_HNTCH_REF"),
                ("ins_hntch_fm_rat", "INS_HNTCH_FM_RAT"),
                ("ins_hntch_opts",   "INS_HNTCH_OPTS"),
                # Second notch filter
                ("ins_hntc2_enable", "INS_HNTC2_ENABLE"),
                ("ins_hntc2_mode",   "INS_HNTC2_MODE"),
                ("ins_hntc2_freq",   "INS_HNTC2_FREQ"),
                ("ins_hntc2_bw",     "INS_HNTC2_BW"),
                ("ins_hntc2_attn",   "INS_HNTC2_ATTN"),
                ("ins_hntc2_hmncs",  "INS_HNTC2_HMNCS"),
                ("ins_hntc2_ref",    "INS_HNTC2_REF"),
                ("ins_hntc2_fm_rat", "INS_HNTC2_FM_RAT"),
                ("ins_hntc2_opts",   "INS_HNTC2_OPTS"),
            ]:
                if has(fields, key):
                    add("IMU", param, _bool_int(fields[key]) if isinstance(fields[key], bool) else fields[key])

        # ── Failsafe ──────────────────────────────────────────────────────────
        elif defId == "failsafe":
            for key, param in [
                ("fs_thr_enable", "FS_THR_ENABLE"),
                ("fs_thr_value",  "FS_THR_VALUE"),
                ("fs_gcs_enable", "FS_GCS_ENABLE"),
                ("fs_ekf_action", "FS_EKF_ACTION"),
                ("fs_crash_check","FS_CRASH_CHECK"),
                ("fs_options",    "FS_OPTIONS"),
            ]:
                if has(fields, key):
                    add("Failsafe", param, fields[key])
            if has(fields, "fs_ekf_thresh"):
                add("Failsafe", "FS_EKF_THRESH", fields["fs_ekf_thresh"])
            if has(fields, "fs_vibe_enable"):
                add("Failsafe", "FS_VIBE_ENABLE", _bool_int(fields["fs_vibe_enable"]))
            for key, param in [
                ("fs_gcs_timeout",   "FS_GCS_TIMEOUT"),
                ("fs_long_timeout",  "FS_LONG_TIMEOUT"),
                ("fs_short_timeout", "FS_SHORT_TIMEOUT"),
            ]:
                if has(fields, key):
                    add("Failsafe", param, fields[key])

        # ── Arming ────────────────────────────────────────────────────────────
        elif defId == "arming":
            for key, param in [
                ("arming_check",     "ARMING_CHECK"),
                ("arming_accthresh", "ARMING_ACCTHRESH"),
                ("arming_magthresh", "ARMING_MAGTHRESH"),
                ("arming_require",   "ARMING_REQUIRE"),
                ("arming_rudder",    "ARMING_RUDDER"),
                ("arming_options",   "ARMING_OPTIONS"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Arming", param, _bool_int(v) if isinstance(v, bool) else v)

        # ── Flight Controller (Board) ─────────────────────────────────────────
        elif defId == "brd_config":
            for key, param in [
                ("brd_type",         "BRD_TYPE"),
                ("brd_options",      "BRD_OPTIONS"),
                ("brd_boot_delay",   "BRD_BOOT_DELAY"),
                ("brd_serial_num",   "BRD_SERIAL_NUM"),
                ("brd_safety_deflt", "BRD_SAFETY_DEFLT"),
                ("brd_safetyoption", "BRD_SAFETYOPTION"),
                ("brd_safety_mask",  "BRD_SAFETY_MASK"),
                ("brd_heat_targ",    "BRD_HEAT_TARG"),
                ("brd_heat_p",       "BRD_HEAT_P"),
                ("brd_heat_i",       "BRD_HEAT_I"),
                ("brd_heat_imax",    "BRD_HEAT_IMAX"),
                ("brd_ser1_rtscts",  "BRD_SER1_RTSCTS"),
                ("brd_ser2_rtscts",  "BRD_SER2_RTSCTS"),
                ("brd_vbus_min",     "BRD_VBUS_MIN"),
                ("brd_pwm_volt_sel", "BRD_PWM_VOLT_SEL"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Board", param, _bool_int(v) if isinstance(v, bool) else v)
            for key, param in [("brd_io_enable", "BRD_IO_ENABLE"), ("brd_io_dshot", "BRD_IO_DSHOT"), ("brd_sbus_out", "BRD_SBUS_OUT")]:
                if has(fields, key):
                    add("Board", param, _bool_int(fields[key]))

        # ── Flight Modes ──────────────────────────────────────────────────────
        elif defId == "flight_modes":
            for n in range(1, 7):
                key = f"fltmode{n}"
                if has(fields, key):
                    add("Flight Modes", f"FLTMODE{n}", fields[key])

        # ── Pilot Control ─────────────────────────────────────────────────────
        elif defId == "pilot_control":
            for key, param in [
                ("pilot_speed_up",  "PILOT_SPEED_UP"),
                ("pilot_speed_dn",  "PILOT_SPEED_DN"),
                ("pilot_accel_z",   "PILOT_ACCEL_Z"),
                ("angle_max",       "ANGLE_MAX"),
                ("pilot_tkoff_alt", "PILOT_TKOFF_ALT"),
                ("pilot_y_rate",    "PILOT_Y_RATE"),
                ("pilot_y_expo",    "PILOT_Y_EXPO"),
                ("loiter_speed",    "LOITER_SPEED"),
            ]:
                if has(fields, key):
                    add("Pilot Control", param, fields[key])

        # ── Servo Outputs ─────────────────────────────────────────────────────
        elif defId == "servo_outputs":
            for key, value in fields.items():
                if key.startswith("servo") and key.endswith("_function") and value is not None:
                    try:
                        sn = int(key[5:key.index("_function")])
                        if sn in claimed_servo_ports:
                            continue   # physical chip owns this port
                    except (ValueError, AttributeError):
                        pass
                    add("Servo Outputs", key.upper(), value)

        # ── RC Mapping ────────────────────────────────────────────────────────
        elif defId == "rc_mapping":
            for key, param in [
                ("rcmap_roll",     "RCMAP_ROLL"),
                ("rcmap_pitch",    "RCMAP_PITCH"),
                ("rcmap_throttle", "RCMAP_THROTTLE"),
                ("rcmap_yaw",      "RCMAP_YAW"),
                ("rc_options",     "RC_OPTIONS"),
                ("rc_protocols",   "RC_PROTOCOLS"),
                ("rc_fs_timeout",  "RC_FS_TIMEOUT"),
                ("rc_feel_rp",     "RC_FEEL_RP"),
            ]:
                if has(fields, key):
                    add("RC", param, fields[key])
            # Per-channel calibration, options, reversed
            for n in range(1, 17):
                for key, suffix in [(f"rc{n}_min",      "MIN"),
                                    (f"rc{n}_trim",     "TRIM"),
                                    (f"rc{n}_max",      "MAX"),
                                    (f"rc{n}_dz",       "DZ"),
                                    (f"rc{n}_option",   "OPTION"),
                                    (f"rc{n}_reversed", "REVERSED")]:
                    if has(fields, key):
                        v = fields[key]
                        add("RC", f"RC{n}_{suffix.upper()}", _bool_int(v) if isinstance(v, bool) else v)

        # ── EKF Config ───────────────────────────────────────────────────────
        elif defId == "ekf_config":
            if has(fields, "ekf_type"):
                add("EKF", "AHRS_EKF_TYPE", fields["ekf_type"])
            for key, param in [
                ("ek3_enable",     "EK3_ENABLE"),
                ("ek3_src1_posxy", "EK3_SRC1_POSXY"),
                ("ek3_src1_velxy", "EK3_SRC1_VELXY"),
                ("ek3_src1_posz",  "EK3_SRC1_POSZ"),
                ("ek3_src1_velz",  "EK3_SRC1_VELZ"),
                ("ek3_src1_yaw",   "EK3_SRC1_YAW"),
                ("ek3_src2_posxy", "EK3_SRC2_POSXY"),
                ("ek3_src2_velxy", "EK3_SRC2_VELXY"),
                ("ek3_src2_posz",  "EK3_SRC2_POSZ"),
                ("ek3_src2_velz",  "EK3_SRC2_VELZ"),
                ("ek3_src2_yaw",   "EK3_SRC2_YAW"),
                ("ek3_src3_posxy", "EK3_SRC3_POSXY"),
                ("ek3_src3_velxy", "EK3_SRC3_VELXY"),
                ("ek3_src3_posz",  "EK3_SRC3_POSZ"),
                ("ek3_src3_velz",  "EK3_SRC3_VELZ"),
                ("ek3_src3_yaw",   "EK3_SRC3_YAW"),
                ("ek3_gps_type",   "EK3_GPS_TYPE"),
                ("ek3_alt_m_nsq",  "EK3_ALT_M_NSQ"),
                ("ek3_affinity",    "EK3_AFFINITY"),
                ("ek3_primary",     "EK3_PRIMARY"),
                ("ek3_gyro_pnoise", "EK3_GYRO_PNOISE"),
                ("ek3_acc_pnoise",  "EK3_ACC_PNOISE"),
                ("ek3_wind_pnoise", "EK3_WIND_PNOISE"),
                ("ek3_gps_verr",    "EK3_GPS_V_NOISE"),
                ("ek3_gps_perr",    "EK3_GPS_P_NSE"),
                ("ek3_baro_alt_noise","EK3_BARO_M_NSE"),
                ("ek3_mag_noise",   "EK3_MAG_M_NSE"),
                ("ek3_rng_m_nse",   "EK3_RNG_M_NSE"),
                ("ek3_flow_m_nse",  "EK3_FLOW_M_NSE"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("EKF", param, _bool_int(v) if isinstance(v, bool) else v)

        # ── Geofence ─────────────────────────────────────────────────────────
        elif defId == "geofence":
            for key, param in [
                ("fence_enable",  "FENCE_ENABLE"),
                ("fence_type",    "FENCE_TYPE"),
                ("fence_action",  "FENCE_ACTION"),
                ("fence_alt_max", "FENCE_ALT_MAX"),
                ("fence_alt_min", "FENCE_ALT_MIN"),
                ("fence_radius",  "FENCE_RADIUS"),
                ("fence_margin",  "FENCE_MARGIN"),
                ("fence_ret_alt", "FENCE_RET_ALT"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Geofence", param, _bool_int(v) if isinstance(v, bool) else v)

        # ── Data Logging ──────────────────────────────────────────────────────
        elif defId == "logging_config":
            for key, param in [
                ("log_bitmask",      "LOG_BITMASK"),
                ("log_disarmed",     "LOG_DISARMED"),
                ("log_replay",       "LOG_REPLAY"),
                ("log_file_bufsize", "LOG_FILE_BUFSIZE"),
                ("log_file_dsrmrot", "LOG_FILE_DSRMROT"),
                ("log_max_files",    "LOG_MAX_FILES"),
                ("sr0_raw_sens",     "SR0_RAW_SENS"),
                ("sr0_ext_stat",     "SR0_EXT_STAT"),
                ("sr0_position",     "SR0_POSITION"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Logging", param, _bool_int(v) if isinstance(v, bool) else v)

        # ── Advanced Failsafe ─────────────────────────────────────────────────
        elif defId == "advanced_failsafe":
            for key, param in [
                ("afs_enable",       "AFS_ENABLE"),
                ("afs_term_action",  "AFS_TERM_ACTION"),
                ("afs_max_com_loss", "AFS_MAX_COM_LOSS"),
                ("afs_max_gps_loss", "AFS_MAX_GPS_LOSS"),
                ("afs_wp_comms",     "AFS_WP_COMMS"),
                ("afs_wp_gps_loss",  "AFS_WP_GPS_LOSS"),
                ("afs_geofence",     "AFS_GEOFENCE"),
                ("afs_qnh_pressure", "AFS_QNH_PRESSURE"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Advanced Failsafe", param, _bool_int(v) if isinstance(v, bool) else v)

        # ── Takeoff & Landing ─────────────────────────────────────────────────
        elif defId == "takeoff_landing":
            for key, param in [
                ("tkoff_rotate_spd",  "TKOFF_ROTATE_SPD"),
                ("tkoff_gnd_pitch",   "TKOFF_GND_PITCH"),
                ("tkoff_thr_delay",   "TKOFF_THR_DELAY"),
                ("tkoff_thr_minacc",  "TKOFF_THR_MINACC"),
                ("tkoff_tdrag_elev",  "TKOFF_TDRAG_ELEV"),
                ("tkoff_tdrag_spd1",  "TKOFF_TDRAG_SPD1"),
                ("land_pitch_cd",     "LAND_PITCH_CD"),
                ("land_flap_percent", "LAND_FLAP_PERCENT"),
                ("land_abort_thr",    "LAND_ABORT_THR"),
                ("land_slope_rcalc",  "LAND_SLOPE_RCALC"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Takeoff/Landing", param, _bool_int(v) if isinstance(v, bool) else v)

        # ── Terrain Following ─────────────────────────────────────────────────
        elif defId == "terrain":
            for key, param in [
                ("terrain_enable",  "TERRAIN_ENABLE"),
                ("terrain_spacing", "TERRAIN_SPACING"),
                ("terrain_margin",  "TERRAIN_MARGIN"),
                ("terrain_ofs_max", "TERRAIN_OFS_MAX"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Terrain", param, _bool_int(v) if isinstance(v, bool) else v)

        # ── Crash Detection ───────────────────────────────────────────────────
        elif defId == "crash_detection":
            for key, param in [
                ("fs_crash_check",   "FS_CRASH_CHECK"),
                ("crash_detect",     "CRASH_DETECT"),
                ("crash_acc_thresh", "CRASH_ACC_THRESH"),
                ("gnd_effect_comp",  "GND_EFFECT_COMP"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Crash Detection", param, _bool_int(v) if isinstance(v, bool) else v)

        # ── Lua Scripting ─────────────────────────────────────────────────────
        elif defId == "lua_scripting":
            for key, param in [
                ("scr_enable",      "SCR_ENABLE"),
                ("scr_heap_size",   "SCR_HEAP_SIZE"),
                ("scr_debug_level", "SCR_DEBUG_LEVEL"),
                ("scr_vm_i_count",  "SCR_VM_I_COUNT"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Lua Scripting", param, _bool_int(v) if isinstance(v, bool) else v)

        # ── Flight Options (Plane) ────────────────────────────────────────────
        elif defId == "flight_options_plane":
            for key, param in [
                ("flight_options",    "FLIGHT_OPTIONS"),
                ("stab_pitch_down",   "STAB_PITCH_DOWN"),
                ("tecs_use_airspeed", "TECS_USE_AIRSPEED"),
                ("tecs_spdweight",    "TECS_SPDWEIGHT"),
                ("use_rev_thrust",    "USE_REV_THRUST"),
                ("thr_reverse",       "THR_REVERSE"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Flight Options", param, _bool_int(v) if isinstance(v, bool) else v)

        # ── ESC (all roles / connections) ─────────────────────────────────────
        elif defId == "esc":
            conn = fields.get("connection_type", "pwm")
            role = fields.get("esc_role", "motor")
            if conn == "pwm" and role == "motor":
                if has(fields, "mot_pwm_type") and not mot_pwm_type_added:
                    add("Motors", "MOT_PWM_TYPE", fields["mot_pwm_type"])
                    mot_pwm_type_added = True
                if has(fields, "mot_pwm_min"):
                    add("Motors", "MOT_PWM_MIN", fields["mot_pwm_min"])
                if has(fields, "mot_pwm_max"):
                    add("Motors", "MOT_PWM_MAX", fields["mot_pwm_max"])
                cm = int(fields.get("connected_motors") or 0)
                if cm and motor_num_to_servo:
                    pins_for_esc = [sn for mnum, sn in motor_num_to_servo.items()
                                    if (cm >> (mnum - 1)) & 1]
                else:
                    pins_for_esc = motor_servo_pins
                for sn in pins_for_esc:
                    bit = 1 << (sn - 1)
                    if has(fields, "blheli_enabled") and fields["blheli_enabled"]:
                        blheli_mask |= bit
                    if has(fields, "blheli_telem") and fields["blheli_telem"]:
                        blheli_telem_mask |= bit
                    if has(fields, "blheli_bidi") and fields["blheli_bidi"]:
                        blheli_bidi_mask |= bit
                if has(fields, "blheli_poles") and blheli_poles is None:
                    blheli_poles = fields["blheli_poles"]
            elif conn == "pwm" and role == "throttle":
                pin = _comp_pin(comp)
                if pin is not None:
                    servo_n = _pin_to_servo(pin)
                    if servo_n:
                        servo_fn = get(fields, "servo_function", 70)
                        add("Servo Outputs", f"SERVO{servo_n}_FUNCTION", servo_fn)
                        for key, suffix in [("servo_min", "MIN"), ("servo_max", "MAX"), ("servo_trim", "TRIM")]:
                            if has(fields, key):
                                add("Servo Outputs", f"SERVO{servo_n}_{suffix}", fields[key])
                        if has(fields, "reversed") and fields["reversed"]:
                            add("Servo Outputs", f"SERVO{servo_n}_REVERSED", 1)
            # conn == "dronecan": handled by topology solver

        # ── Motor (Copter / VTOL) ─────────────────────────────────────────────
        elif defId == "motor":
            pin = _comp_pin(comp)
            motor_num = get(fields, "motor_num")
            if pin is not None and motor_num is not None:
                servo_n = _pin_to_servo(pin)
                if servo_n:
                    add("Servo Outputs", f"SERVO{servo_n}_FUNCTION", 32 + int(motor_num))
                    if has(fields, "reversed") and fields["reversed"]:
                        add("Servo Outputs", f"SERVO{servo_n}_REVERSED", 1)

        # ── Servo ─────────────────────────────────────────────────────────────
        elif defId == "servo":
            conn = fields.get("connection_type", "pwm")
            if conn == "pwm":
                pin = _comp_pin(comp)
                servo_fn = get(fields, "servo_function")
                if pin is not None and servo_fn is not None:
                    servo_n = _pin_to_servo(pin)
                    if servo_n:
                        add("Servo Outputs", f"SERVO{servo_n}_FUNCTION", servo_fn)
                        for key, suffix in [("servo_min", "MIN"), ("servo_max", "MAX"), ("servo_trim", "TRIM")]:
                            if has(fields, key):
                                add("Servo Outputs", f"SERVO{servo_n}_{suffix}", fields[key])
                        if has(fields, "reversed") and fields["reversed"]:
                            add("Servo Outputs", f"SERVO{servo_n}_REVERSED", 1)
                        if has(fields, "servo_rate"):
                            add("Servo Outputs", f"SERVO{servo_n}_RATE", fields["servo_rate"])
            # conn == "dronecan": handled by topology solver

        # ── GPS / Compass ─────────────────────────────────────────────────────
        elif defId == "gps":
            instance = int(get(fields, "instance", 1))
            suffix   = "" if instance == 1 else str(instance)
            if has(fields, "gps_type"):
                add("GPS", f"GPS_TYPE{suffix}", fields["gps_type"])
            serial_port = get(fields, "serial_port")
            gps_type = get(fields, "gps_type", 1)
            if serial_port and gps_type != 9:   # 9 = DroneCAN (no serial)
                add("GPS", f"{serial_port}_PROTOCOL", 5)
                if has(fields, "serial_baud"):
                    add("GPS", f"{serial_port}_BAUD", fields["serial_baud"])
            if has(fields, "gps_auto_config"):
                add("GPS", "GPS_AUTO_CONFIG", _bool_int(fields["gps_auto_config"]))
            if has(fields, "compass_use"):
                add("Compass", f"COMPASS_USE{suffix}", _bool_int(fields["compass_use"]))
            if has(fields, "compass_external"):
                add("Compass", f"COMPASS_EXTERNAL{suffix}", _bool_int(fields["compass_external"]))
            if has(fields, "compass_orient"):
                add("Compass", f"COMPASS_ORIENT{suffix}", fields["compass_orient"])
            if has(fields, "gps_yaw_enable") and fields["gps_yaw_enable"]:
                if has(fields, "gps_mb_ant_x"):
                    add("GPS", f"GPS_MB_ANT{suffix}_X", fields["gps_mb_ant_x"])
                if has(fields, "gps_mb_ant_y"):
                    add("GPS", f"GPS_MB_ANT{suffix}_Y", fields["gps_mb_ant_y"])
                if has(fields, "gps_yaw_offset"):
                    add("GPS", "GPS_YAW_OFFSET", fields["gps_yaw_offset"])
            for key, param in [
                ("gps_blend_mask",  "GPS_BLEND_MASK"),
                ("gps_blend_tc",    "GPS_BLEND_TC"),
                ("gps_delay_ms",    "GPS_DELAY_MS"),
                ("gps_hdop_good",   "GPS_HDOP_GOOD"),
                ("gps_drv_options", "GPS_DRV_OPTIONS"),
            ]:
                if has(fields, key):
                    add("GPS", param, fields[key])

        # ── Airspeed Sensor ───────────────────────────────────────────────────
        elif defId == "airspeed":
            instance = int(get(fields, "instance", 1))
            prefix   = "ARSPD" if instance == 1 else f"ARSPD{instance}"
            for key, param in [
                ("arspd_type",     f"{prefix}_TYPE"),
                ("arspd_use",      f"{prefix}_USE"),
                ("arspd_bus",      f"{prefix}_BUS"),
                ("arspd_pin",      f"{prefix}_PIN"),
                ("arspd_ratio",    f"{prefix}_RATIO"),
                ("arspd_skip_cal", f"{prefix}_SKIP_CAL"),
                ("arspd_autocal",  f"{prefix}_AUTOCAL"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Airspeed", param, _bool_int(v) if isinstance(v, bool) else v)

        # ── Rangefinder / Lidar ───────────────────────────────────────────────
        elif defId == "rangefinder":
            instance = int(get(fields, "instance", 1))
            pfx = f"RNGFND{instance}"
            for key, param in [
                ("rngfnd_type",    f"{pfx}_TYPE"),
                ("rngfnd_orient",  f"{pfx}_ORIENT"),
                ("rngfnd_min",     f"{pfx}_MIN_CM"),
                ("rngfnd_max",     f"{pfx}_MAX_CM"),
                ("rngfnd_gndclear",f"{pfx}_GNDCLEAR"),
            ]:
                if has(fields, key):
                    add("Sensors", param, fields[key])
            serial_port = get(fields, "serial_port")
            if serial_port:
                add("Sensors", f"{serial_port}_PROTOCOL", 9)   # 9 = Lidar360/Rangefinder serial

        # ── Optical Flow ──────────────────────────────────────────────────────
        elif defId == "optical_flow":
            for key, param in [
                ("flow_type",       "FLOW_TYPE"),
                ("flow_orient_yaw", "FLOW_ORIENT_YAW"),
                ("flow_pos_x",      "FLOW_POS_X"),
                ("flow_pos_y",      "FLOW_POS_Y"),
                ("flow_pos_z",      "FLOW_POS_Z"),
            ]:
                if has(fields, key):
                    add("Sensors", param, fields[key])

        # ── RPM Sensor ────────────────────────────────────────────────────────
        elif defId == "rpm_sensor":
            instance = int(get(fields, "instance", 1))
            pfx = f"RPM{instance}"
            if has(fields, "rpm_type"):
                add("Sensors", f"{pfx}_TYPE", fields["rpm_type"])
            if has(fields, "rpm_scaling"):
                add("Sensors", f"{pfx}_SCALING", fields["rpm_scaling"])

        # ── Battery Monitor ───────────────────────────────────────────────────
        elif defId == "battery_monitor":
            instance = int(get(fields, "instance", 1))
            pfx = "BATT" if instance == 1 else f"BATT{instance}"
            for key, param in [
                ("batt_monitor",  f"{pfx}_MONITOR"),
                ("volt_pin",      f"{pfx}_VOLT_PIN"),
                ("curr_pin",      f"{pfx}_CURR_PIN"),
                ("volt_mult",     f"{pfx}_VOLT_MULT"),
                ("amp_pervlt",    f"{pfx}_AMP_PERVLT"),
                ("amp_offset",    f"{pfx}_AMP_OFFSET"),
                ("batt_capacity", f"{pfx}_CAPACITY"),
                ("low_volt",      f"{pfx}_LOW_VOLT"),
                ("crt_volt",      f"{pfx}_CRT_VOLT"),
                ("batt_arm_volt", f"{pfx}_ARM_VOLT"),
                ("low_mah",       f"{pfx}_LOW_MAH"),
                ("fs_low_act",    f"{pfx}_FS_LOW_ACT"),
                ("fs_crt_act",    f"{pfx}_FS_CRT_ACT"),
            ]:
                if has(fields, key):
                    add("Power", param, fields[key])

        # ── RC Input ─────────────────────────────────────────────────────────
        elif defId == "rc_input":
            if has(fields, "rc_protocols"):
                add("RC", "RC_PROTOCOLS", fields["rc_protocols"])
            rc_uart = get(fields, "rc_uart")
            if rc_uart:
                add("RC", f"{rc_uart}_PROTOCOL", 23)   # 23 = RCIN
            if has(fields, "rc_speed"):
                add("RC", "RC_SPEED", fields["rc_speed"])

        # ── Telemetry Radio ───────────────────────────────────────────────────
        elif defId == "telemetry":
            serial_port = get(fields, "serial_port", "SERIAL1")
            if has(fields, "protocol"):
                add("Telemetry", f"{serial_port}_PROTOCOL", fields["protocol"])
            if has(fields, "baud"):
                add("Telemetry", f"{serial_port}_BAUD", fields["baud"])
            if has(fields, "sysid_thismav"):
                add("Telemetry", "SYSID_THISMAV", fields["sysid_thismav"])
            if has(fields, "stream_rate"):
                rate  = fields["stream_rate"]
                sn    = serial_port.replace("SERIAL", "")
                for sr_param in [f"SR{sn}_RAW_SENS", f"SR{sn}_EXT_STAT",
                                  f"SR{sn}_RC_CHAN",  f"SR{sn}_POSITION"]:
                    add("Telemetry", sr_param, rate)

        # ── Companion Computer ────────────────────────────────────────────────
        elif defId == "companion":
            serial_port = get(fields, "serial_port", "SERIAL2")
            if has(fields, "protocol"):
                add("GCS", f"{serial_port}_PROTOCOL", fields["protocol"])
            if has(fields, "baud"):
                add("GCS", f"{serial_port}_BAUD", fields["baud"])

        # ── CAN / DroneCAN ────────────────────────────────────────────────────
        elif defId == "can_bus":
            for key, param in [
                ("can_p1_driver",    "CAN_P1_DRIVER"),
                ("can_p2_driver",    "CAN_P2_DRIVER"),
                ("can_p1_bitrate",   "CAN_P1_BITRATE"),
                ("can_p2_bitrate",   "CAN_P2_BITRATE"),
                ("can_p1_fdbitrate", "CAN_P1_FDBITRATE"),
                ("can_p2_fdbitrate", "CAN_P2_FDBITRATE"),
                ("can_d1_uc_node",   "CAN_D1_UC_NODE"),
                ("can_d1_uc_esc_bm", "CAN_D1_UC_ESC_BM"),
            ]:
                if has(fields, key):
                    add("CAN", param, fields[key])

        # ── LED / Buzzer ──────────────────────────────────────────────────────
        elif defId == "led_notify":
            for key, param in [
                ("ntf_led_types",   "NTF_LED_TYPES"),
                ("ntf_led_bright",  "NTF_LED_BRIGHT"),
                ("ntf_buzz_types",  "NTF_BUZZ_TYPES"),
                ("ntf_buzz_volume", "NTF_BUZZ_VOLUME"),
            ]:
                if has(fields, key):
                    add("Notify", param, fields[key])

        # ── Camera Trigger ────────────────────────────────────────────────────
        elif defId == "camera_trigger":
            for key, param in [
                ("cam_trigg_type", "CAM_TRIGG_TYPE"),
                ("cam_duration",   "CAM_DURATION"),
                ("cam_servo_on",   "CAM_SERVO_ON"),
                ("cam_servo_off",  "CAM_SERVO_OFF"),
            ]:
                if has(fields, key):
                    add("Camera", param, fields[key])

        # ── Parachute ─────────────────────────────────────────────────────────
        elif defId == "parachute":
            for key, param in [
                ("chute_enabled",   "CHUTE_ENABLED"),
                ("chute_type",      "CHUTE_TYPE"),
                ("chute_servo_on",  "CHUTE_SERVO_ON"),
                ("chute_servo_off", "CHUTE_SERVO_OFF"),
                ("chute_alt_min",   "CHUTE_ALT_MIN"),
                ("chute_crt_sink",  "CHUTE_CRT_SINK"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Parachute", param, _bool_int(v) if isinstance(v, bool) else v)

        # ── Landing Gear ──────────────────────────────────────────────────────
        elif defId == "landing_gear":
            for key, param in [
                ("lgr_enable",       "LGR_ENABLE"),
                ("lgr_servo_rtract", "LGR_SERVO_RTRACT"),
                ("lgr_servo_deploy", "LGR_SERVO_DEPLOY"),
                ("lgr_deploy_alt",   "LGR_DEPLOY_ALT"),
                ("lgr_retract_alt",  "LGR_RETRACT_ALT"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Landing Gear", param, _bool_int(v) if isinstance(v, bool) else v)

        # ── Relay / GPIO ──────────────────────────────────────────────────────
        elif defId == "relay_gpio":
            instance = int(get(fields, "instance", 1))
            if has(fields, "relay_pin"):
                add("Relay", f"RELAY{instance}_PIN", fields["relay_pin"])
            if has(fields, "relay_default"):
                add("Relay", f"RELAY{instance}_DEFAULT", fields["relay_default"])

        # ── ADS-B ─────────────────────────────────────────────────────────────
        elif defId == "adsb":
            if has(fields, "adsb_type"):
                add("ADS-B", "ADSB_TYPE", fields["adsb_type"])
            serial_port = get(fields, "serial_port")
            adsb_type = get(fields, "adsb_type", 0)
            if serial_port and adsb_type != 0:
                add("ADS-B", f"{serial_port}_PROTOCOL", 1)   # MAVLink
            if has(fields, "adsb_squawk"):
                add("ADS-B", "ADSB_SQUAWK", fields["adsb_squawk"])
            if has(fields, "adsb_list_max"):
                add("ADS-B", "ADSB_LIST_MAX", fields["adsb_list_max"])
            if has(fields, "adsb_list_radius"):
                add("ADS-B", "ADSB_LIST_RADIUS", fields["adsb_list_radius"])

        # ── OSD ───────────────────────────────────────────────────────────────
        elif defId == "osd":
            if has(fields, "osd_type"):
                add("OSD", "OSD_TYPE", fields["osd_type"])
            serial_port = get(fields, "serial_port")
            osd_type = get(fields, "osd_type", 0)
            if serial_port and osd_type in (3, 4, 5):
                add("OSD", f"{serial_port}_PROTOCOL", 18)   # MSP

        # ── Attitude Controller ───────────────────────────────────────────────
        elif defId == "attitude_controller":
            for key, param in [
                ("atc_rat_rll_p",    "ATC_RAT_RLL_P"),  ("atc_rat_rll_i",    "ATC_RAT_RLL_I"),
                ("atc_rat_rll_d",    "ATC_RAT_RLL_D"),  ("atc_rat_rll_imax", "ATC_RAT_RLL_IMAX"),
                ("atc_rat_rll_vff",  "ATC_RAT_RLL_VFF"), ("atc_rat_rll_smax","ATC_RAT_RLL_SMAX"),
                ("atc_rat_rll_fltt", "ATC_RAT_RLL_FLTT"),("atc_rat_rll_flte","ATC_RAT_RLL_FLTE"),
                ("atc_rat_rll_fltd", "ATC_RAT_RLL_FLTD"),
                ("atc_rat_pit_p",    "ATC_RAT_PIT_P"),  ("atc_rat_pit_i",    "ATC_RAT_PIT_I"),
                ("atc_rat_pit_d",    "ATC_RAT_PIT_D"),  ("atc_rat_pit_imax", "ATC_RAT_PIT_IMAX"),
                ("atc_rat_pit_vff",  "ATC_RAT_PIT_VFF"), ("atc_rat_pit_smax","ATC_RAT_PIT_SMAX"),
                ("atc_rat_pit_fltt", "ATC_RAT_PIT_FLTT"),("atc_rat_pit_flte","ATC_RAT_PIT_FLTE"),
                ("atc_rat_pit_fltd", "ATC_RAT_PIT_FLTD"),
                ("atc_rat_yaw_p",    "ATC_RAT_YAW_P"),  ("atc_rat_yaw_i",    "ATC_RAT_YAW_I"),
                ("atc_rat_yaw_d",    "ATC_RAT_YAW_D"),  ("atc_rat_yaw_imax", "ATC_RAT_YAW_IMAX"),
                ("atc_rat_yaw_vff",  "ATC_RAT_YAW_VFF"), ("atc_rat_yaw_smax","ATC_RAT_YAW_SMAX"),
                ("atc_rat_yaw_fltt", "ATC_RAT_YAW_FLTT"),("atc_rat_yaw_flte","ATC_RAT_YAW_FLTE"),
                ("atc_rat_yaw_fltd", "ATC_RAT_YAW_FLTD"),
                ("atc_ang_rll_p",    "ATC_ANG_RLL_P"),  ("atc_ang_pit_p",    "ATC_ANG_PIT_P"),
                ("atc_ang_yaw_p",    "ATC_ANG_YAW_P"),
                ("atc_accel_r_max",  "ATC_ACCEL_R_MAX"),("atc_accel_p_max",  "ATC_ACCEL_P_MAX"),
                ("atc_accel_y_max",  "ATC_ACCEL_Y_MAX"),("atc_slew_yaw",     "ATC_SLEW_YAW"),
                ("atc_input_tc",     "ATC_INPUT_TC"),
            ]:
                if has(fields, key):
                    add("ATC", param, fields[key])
            if has(fields, "atc_angle_boost"):
                add("ATC", "ATC_ANGLE_BOOST", _bool_int(fields["atc_angle_boost"]))

        # ── Position Controller ───────────────────────────────────────────────
        elif defId == "position_controller":
            for key, param in [
                ("psc_posxy_p",        "PSC_POSXY_P"),
                ("psc_velxy_p",        "PSC_VELXY_P"),   ("psc_velxy_i",       "PSC_VELXY_I"),
                ("psc_velxy_d",        "PSC_VELXY_D"),   ("psc_velxy_imax",    "PSC_VELXY_IMAX"),
                ("psc_velxy_filt_hz",  "PSC_VELXY_FILT_HZ"),
                ("psc_velxy_d_filt_hz","PSC_VELXY_D_FILT_HZ"),
                ("psc_posz_p",         "PSC_POSZ_P"),
                ("psc_velz_p",         "PSC_VELZ_P"),    ("psc_velz_i",        "PSC_VELZ_I"),
                ("psc_velz_d",         "PSC_VELZ_D"),    ("psc_velz_imax",     "PSC_VELZ_IMAX"),
                ("psc_jerk_xy",        "PSC_JERK_XY"),   ("psc_jerk_z",        "PSC_JERK_Z"),
            ]:
                if has(fields, key):
                    add("PSC", param, fields[key])

        # ── Acro Mode ─────────────────────────────────────────────────────────
        elif defId == "acro_config":
            for key, param in [
                ("acro_rp_p",          "ACRO_RP_P"),
                ("acro_yaw_p",         "ACRO_YAW_P"),
                ("acro_rp_expo",       "ACRO_RP_EXPO"),
                ("acro_y_expo",        "ACRO_Y_EXPO"),
                ("acro_trainer",       "ACRO_TRAINER"),
                ("acro_thr_mid",       "ACRO_THR_MID"),
                ("acro_balance_roll",  "ACRO_BALANCE_ROLL"),
                ("acro_balance_pitch", "ACRO_BALANCE_PITCH"),
                ("acro_roll_rate",     "ACRO_ROLL_RATE"),
                ("acro_pitch_rate",    "ACRO_PITCH_RATE"),
                ("acro_yaw_rate",      "ACRO_YAW_RATE"),
            ]:
                if has(fields, key):
                    add("Acro", param, fields[key])

        # ── Compass ───────────────────────────────────────────────────────────
        elif defId == "compass_config":
            for key, param in [
                ("compass_enable",   "COMPASS_ENABLE"),
                ("compass_autodec",  "COMPASS_AUTODEC"),
                ("compass_dec",      "COMPASS_DEC"),
                ("compass_typemask", "COMPASS_TYPEMASK"),
                ("compass_disblmsk", "COMPASS_DISBLMSK"),
                ("compass_orient",   "COMPASS_ORIENT"),
                ("compass_auto_rot", "COMPASS_AUTO_ROT"),
            ]:
                if has(fields, key):
                    v = fields[key]
                    add("Compass", param, _bool_int(v) if isinstance(v, bool) else v)
            for key, param in [
                ("compass_use",      "COMPASS_USE"),
                ("compass_use2",     "COMPASS_USE2"),
                ("compass_use3",     "COMPASS_USE3"),
                ("compass_external", "COMPASS_EXTERNAL"),
            ]:
                if has(fields, key):
                    add("Compass", param, _bool_int(fields[key]))

        # ── Barometer ─────────────────────────────────────────────────────────
        elif defId == "baro_config":
            for key, param in [
                ("baro_primary",   "BARO_PRIMARY"),
                ("baro_probe_ext", "BARO_PROBE_EXT"),
                ("baro_ext_bus",   "BARO_EXT_BUS"),
                ("baro_field_elv", "BARO_FIELD_ELV"),
                ("baro_options",   "BARO_OPTIONS"),
                ("baro_fltr_rng",  "BARO_FLTR_RNG"),
            ]:
                if has(fields, key):
                    add("Baro", param, fields[key])

        # ── WP Navigation ─────────────────────────────────────────────────────
        elif defId == "wpnav_config":
            for key, param in [
                ("wpnav_speed",    "WPNAV_SPEED"),
                ("wpnav_speed_up", "WPNAV_SPEED_UP"),
                ("wpnav_speed_dn", "WPNAV_SPEED_DN"),
                ("wpnav_accel",    "WPNAV_ACCEL"),
                ("wpnav_radius",   "WPNAV_RADIUS"),
            ]:
                if has(fields, key):
                    add("Navigation", param, fields[key])
            if has(fields, "wpnav_rfnd_use"):
                add("Navigation", "WPNAV_RFND_USE", _bool_int(fields["wpnav_rfnd_use"]))

        # ── RTL Configuration ─────────────────────────────────────────────────
        elif defId == "rtl_config":
            for key, param in [
                ("rtl_alt",       "RTL_ALT"),
                ("rtl_alt_final", "RTL_ALT_FINAL"),
                ("rtl_speed",     "RTL_SPEED"),
                ("rtl_loit_time", "RTL_LOIT_TIME"),
                ("rtl_cone_slope","RTL_CONE_SLOPE"),
                ("rtl_alt_type",  "RTL_ALT_TYPE"),
                ("rtl_options",   "RTL_OPTIONS"),
                ("rtl_altitude",  "RTL_ALTITUDE"),
                ("rtl_radius",    "RTL_RADIUS"),
                ("rtl_climb_min", "RTL_CLIMB_MIN"),
            ]:
                if has(fields, key):
                    add("Navigation", param, fields[key])
            if has(fields, "rtl_autoland"):
                add("Navigation", "RTL_AUTOLAND", fields["rtl_autoland"])

        # ── Gimbal / Camera Mount ─────────────────────────────────────────────
        elif defId == "gimbal_mount":
            for key, param in [
                ("mnt1_type",       "MNT1_TYPE"),
                ("mnt1_deflt_mode", "MNT1_DEFLT_MODE"),
                ("mnt1_rc_in_tilt", "MNT1_RC_IN_TILT"),
                ("mnt1_rc_in_roll", "MNT1_RC_IN_ROLL"),
                ("mnt1_rc_in_pan",  "MNT1_RC_IN_PAN"),
                ("mnt1_rc_rate",    "MNT1_RC_RATE"),
                ("mnt1_pitch_min",  "MNT1_PITCH_MIN"),
                ("mnt1_pitch_max",  "MNT1_PITCH_MAX"),
                ("mnt1_roll_min",   "MNT1_ROLL_MIN"),
                ("mnt1_roll_max",   "MNT1_ROLL_MAX"),
                ("mnt1_yaw_min",    "MNT1_YAW_MIN"),
                ("mnt1_yaw_max",    "MNT1_YAW_MAX"),
            ]:
                if has(fields, key):
                    add("Gimbal", param, fields[key])

        # ── Obstacle Avoidance ────────────────────────────────────────────────
        elif defId == "obstacle_avoidance":
            for key, param in [
                ("oa_type",       "OA_TYPE"),
                ("oa_margin_max", "OA_MARGIN_MAX"),
                ("oa_lookahead",  "OA_LOOKAHEAD"),
                ("avoid_enable",  "AVOID_ENABLE"),
                ("avoid_margin",  "AVOID_MARGIN"),
                ("avoid_dist_max","AVOID_DIST_MAX"),
                ("prx1_type",     "PRX1_TYPE"),
                ("prx1_orient",   "PRX1_ORIENT"),
                ("prx1_yaw_corr", "PRX1_YAW_CORR"),
                ("prx_ign_gnd",   "PRX_IGN_GND"),
            ]:
                if has(fields, key):
                    add("OA", param, fields[key])

        # ── Traditional Helicopter ────────────────────────────────────────────
        elif defId == "traditional_heli":
            for key, param in [
                ("swash_type",    "H_SWASH_TYPE"),
                ("col_min",       "H_COL_MIN"),
                ("col_max",       "H_COL_MAX"),
                ("col_mid",       "H_COL_MID"),
                ("col_land_min",  "H_COL_LAND_MIN"),
                ("cyc_max",       "H_CYC_MAX"),
                ("rsc_mode",      "H_RSC_MODE"),
                ("rsc_setpt",     "H_RSC_SETPT"),
                ("rsc_gov_setpnt","H_RSC_GOV_SETPNT"),
                ("rsc_gov_range", "H_RSC_GOV_RANGE"),
                ("rsc_ramp_time", "H_RSC_RAMP_TIME"),
                ("rsc_runup_time","H_RSC_RUNUP_TIME"),
            ]:
                if has(fields, key):
                    add("Helicopter", param, fields[key])

        # ── Sprayer ───────────────────────────────────────────────────────────
        elif defId == "sprayer":
            if has(fields, "spray_enable"):
                add("Sprayer", "SPRAY_ENABLE", 1 if fields["spray_enable"] else 0)
            for key, param in [
                ("pump_rate",   "SPRAY_PUMP_RATE"),
                ("spinner_pwm", "SPRAY_SPINNER"),
                ("speed_min",   "SPRAY_SPEED_MIN"),
                ("pump_min",    "SPRAY_PUMP_MIN"),
            ]:
                if has(fields, key):
                    add("Sprayer", param, fields[key])

    # ── BLHeli aggregated params ──────────────────────────────────────────────
    if blheli_mask:
        add("BLHeli", "SERVO_BLH_MASK", blheli_mask)
    if blheli_telem_mask:
        add("BLHeli", "SERVO_BLH_TELEM", blheli_telem_mask)
    if blheli_bidi_mask:
        add("BLHeli", "SERVO_BLH_BDMASK", blheli_bidi_mask)
    if blheli_poles is not None:
        add("BLHeli", "SERVO_BLH_POLES", blheli_poles)

    return {"grouped": grouped, "flat": flat}


def get_reboot_required(param_list: list[dict]) -> list[dict]:
    return [p for p in param_list if p.get("reboot_required")]


# ── Reverse mapper: params → component instances ──────────────────────────────

# Motor SERVO_FUNCTION values that indicate a motor output
_MOTOR_FUNC_MIN = 33   # Motor 1
_MOTOR_FUNC_MAX = 44   # Motor 12

# Plane / VTOL control-surface SERVO_FUNCTION values (used for reverse param import)
_SURFACE_FUNCS = {
    2:   "Flap",
    3:   "Automatic Flaps",
    4:   "Aileron",
    16:  "Diff Spoiler Left 1",
    17:  "Diff Spoiler Right 1",
    19:  "Elevator",
    21:  "Rudder",
    24:  "Flaperon Left",
    25:  "Flaperon Right",
    26:  "Ground Steering",
    27:  "Parachute Release",
    29:  "Landing Gear",
    77:  "Elevon Left",
    78:  "Elevon Right",
    79:  "V-Tail Left",
    80:  "V-Tail Right",
    86:  "Diff Spoiler Left 2",
    87:  "Diff Spoiler Right 2",
    110: "AirBrakes",
}

_TILT_FUNCS = {
    41: "Tilt Front",
    45: "Tilt Rear",
    46: "Tilt Rear Left",
    47: "Tilt Rear Right",
    75: "Tilt Front Left",
    76: "Tilt Front Right",
}


def build_components_from_params(params: dict[str, float]) -> dict:
    """
    Reverse-map a flat {PARAM_NAME: value} dict into component instances
    with pre-populated field values, ready to be added to the canvas.

    Returns:
        {
            "vehicle_type": "copter" | "plane" | "vtol",
            "components": [
                { "defId": ..., "label": ..., "icon": ..., "virtual": bool,
                  "fields": {...}, "x": int, "y": int },
                ...
            ]
        }
    """
    p = {k.upper(): float(v) for k, v in params.items()}

    def has(*names: str) -> bool:
        return any(n in p for n in names)

    def ival(name: str, default=None):
        return int(p[name]) if name in p else default

    def fval(name: str, default=None):
        return p[name] if name in p else default

    def bval(name: str, default=None):
        return bool(int(p[name])) if name in p else default

    # ── Infer vehicle type ─────────────────────────────────────────────────
    if has("Q_ENABLE", "Q_FRAME_CLASS"):
        vehicle_type = "vtol"
    elif has("ARSPD_FBW_MIN", "ARSPD_FBW_MAX", "THR_MIN", "TRIM_THROTTLE"):
        vehicle_type = "plane"
    elif has("FRAME_CLASS", "MOT_PWM_TYPE", "MOT_SPIN_ARM"):
        vehicle_type = "copter"
    else:
        vehicle_type = "copter"

    components: list[dict] = []

    # Two-column layout: virtual on left, physical on right
    COL_VIRTUAL  = 20
    COL_PHYSICAL = 220
    ROW_H        = 44

    v_row = 0   # virtual row counter
    ph_row = 0  # physical row counter

    def vpos() -> tuple[int, int]:
        nonlocal v_row
        pos = (COL_VIRTUAL, 20 + v_row * ROW_H)
        v_row += 1
        return pos

    def ppos() -> tuple[int, int]:
        nonlocal ph_row
        pos = (COL_PHYSICAL, 20 + ph_row * ROW_H)
        ph_row += 1
        return pos

    def add_v(defId, label, icon, fields):
        x, y = vpos()
        components.append({"defId": defId, "label": label, "icon": icon,
                            "virtual": True, "noCanvas": True, "fields": fields, "x": x, "y": y})

    def add_p(defId, label, icon, fields):
        x, y = ppos()
        components.append({"defId": defId, "label": label, "icon": icon,
                            "virtual": False, "fields": fields, "x": x, "y": y})

    # ── Frame ─────────────────────────────────────────────────────────────
    if vehicle_type == "copter":
        f = {}
        for pn, key in [("FRAME_CLASS", "frame_class"), ("FRAME_TYPE", "frame_type")]:
            v = ival(pn)
            if v is not None:
                f[key] = v
        for pn, key in [("MOT_SPIN_ARM",   "mot_spin_arm"),
                        ("MOT_SPIN_MIN",   "mot_spin_min"),
                        ("MOT_SPIN_MAX",   "mot_spin_max"),
                        ("MOT_THST_EXPO",  "mot_thst_expo"),
                        ("MOT_THST_HOVER", "mot_thst_hover")]:
            v = fval(pn)
            if v is not None:
                f[key] = v
        if f:
            add_v("frame_copter", "Frame", "🚁", f)

    elif vehicle_type == "plane":
        f = {}
        for pn, key in [("ARSPD_FBW_MIN",  "airspeed_min"),
                        ("ARSPD_FBW_MAX",  "airspeed_max"),
                        ("THR_MIN",        "thr_min"),
                        ("THR_MAX",        "thr_max"),
                        ("TRIM_THROTTLE",  "thr_cruise")]:
            v = fval(pn)
            if v is not None:
                f[key] = v
        if "TRIM_ARSPD_CM" in p:
            f["airspeed_cruise"] = p["TRIM_ARSPD_CM"] / 100.0
        if "STALL_PREVENTION" in p:
            f["stall_prevention"] = bool(int(p["STALL_PREVENTION"]))
        for pn, key in [("TECS_CLMB_MAX",    "tecs_clmb_max"),
                        ("TECS_SINK_MIN",    "tecs_sink_min"),
                        ("TECS_SINK_MAX",    "tecs_sink_max"),
                        ("TECS_TIME_CONST",  "tecs_time_const"),
                        ("TECS_THR_DAMP",    "tecs_thrdamp"),
                        ("TECS_PTCH_FF",     "tecs_ptchff"),
                        ("TECS_PITCH_MAX",   "tecs_pitch_max"),
                        ("TECS_PITCH_MIN",   "tecs_pitch_min"),
                        ("TECS_LAND_ARSPD",  "tecs_land_arspd"),
                        ("TECS_LAND_SPDWGT", "tecs_land_spdwgt"),
                        ("TECS_SPDWEIGHT",   "tecs_spdweight"),
                        ("TECS_INTEG_GAIN",  "tecs_integ_gain")]:
            v = fval(pn)
            if v is not None:
                f[key] = v
        if f:
            add_v("frame_plane", "Frame", "✈", f)

    elif vehicle_type == "vtol":
        f = {}
        if "Q_ENABLE" in p:
            f["q_enable"] = bool(int(p["Q_ENABLE"]))
        for pn, key in [("Q_FRAME_CLASS", "q_frame_class"), ("Q_FRAME_TYPE", "q_frame_type"),
                        ("Q_TILT_TYPE",    "q_tilt_type"),   ("Q_TILT_MASK",    "q_tilt_mask")]:
            v = ival(pn)
            if v is not None:
                f[key] = v
        if "Q_TILT_ENABLE" in p:
            f["q_tilt_enable"] = bool(int(p["Q_TILT_ENABLE"]))
        if "Q_GUIDED_MODE" in p:
            f["q_guided_mode"] = bool(int(p["Q_GUIDED_MODE"]))
        for pn, key in [("Q_TILT_RATE_UP",   "q_tilt_rate_up"),  ("Q_TILT_RATE_DN",   "q_tilt_rate_dn"),
                        ("Q_TILT_MAX",       "q_tilt_max"),      ("Q_TILT_YAW_ANGLE", "q_tilt_yaw_angle"),
                        ("Q_TILT_FIX_ANGLE", "q_tilt_fix_angle"),
                        ("Q_TRANS_DECEL",  "q_trans_decel"),  ("Q_TRANSITION_MS","q_trans_timeout"),
                        ("Q_VFWD_GAIN",    "q_vfwd_gain"),    ("Q_ASSIST_SPEED", "q_assist_speed"),
                        ("Q_ASSIST_ALT",   "q_assist_alt"),   ("Q_LOIT_SPEED",   "q_loit_speed"),
                        ("Q_LOIT_ACC_MAX", "q_loit_accel"),   ("Q_LOIT_ANG_MAX", "q_loit_ang_max"),
                        ("Q_LOIT_BRK_ACCEL","q_loit_brkaccel"),("Q_RTL_MODE",   "q_rtl_mode"),
                        ("Q_WP_SPEED",     "q_wp_speed"),     ("Q_WP_ACCEL",     "q_wp_accel")]:
            fv = fval(pn)
            if fv is not None:
                f[key] = fv
        if f:
            add_v("frame_vtol", "Frame", "🔄", f)

    # ── Board Orientation ─────────────────────────────────────────────────
    if has("AHRS_ORIENTATION", "INS_POS_X", "INS_POS_Y", "INS_POS_Z"):
        f = {}
        v = ival("AHRS_ORIENTATION")
        if v is not None:
            f["ahrs_orientation"] = v
        for pn, key in [("INS_POS_X", "ins_pos_x"), ("INS_POS_Y", "ins_pos_y"), ("INS_POS_Z", "ins_pos_z")]:
            fv = fval(pn)
            if fv is not None:
                f[key] = fv
        if f:
            add_v("board_orientation", "Board Orientation", "🔲", f)

    # ── Board config ──────────────────────────────────────────────────────
    if has("BRD_TYPE", "BRD_SAFETY_DEFLT", "BRD_SAFETYOPTION", "BRD_HEAT_TARG",
           "BRD_IO_ENABLE", "BRD_VBUS_MIN", "BRD_OPTIONS"):
        f = {}
        for pn, key, cast in [
            ("BRD_TYPE",         "brd_type",         int),
            ("BRD_OPTIONS",      "brd_options",       int),
            ("BRD_BOOT_DELAY",   "brd_boot_delay",    int),
            ("BRD_SERIAL_NUM",   "brd_serial_num",    int),
            ("BRD_SAFETY_DEFLT", "brd_safety_deflt",  int),
            ("BRD_SAFETYOPTION", "brd_safetyoption",  int),
            ("BRD_SAFETY_MASK",  "brd_safety_mask",   int),
            ("BRD_HEAT_TARG",    "brd_heat_targ",     float),
            ("BRD_HEAT_P",       "brd_heat_p",        float),
            ("BRD_HEAT_I",       "brd_heat_i",        float),
            ("BRD_HEAT_IMAX",    "brd_heat_imax",     float),
            ("BRD_SER1_RTSCTS",  "brd_ser1_rtscts",   int),
            ("BRD_SER2_RTSCTS",  "brd_ser2_rtscts",   int),
            ("BRD_VBUS_MIN",     "brd_vbus_min",      float),
            ("BRD_PWM_VOLT_SEL", "brd_pwm_volt_sel",  int),
        ]:
            if pn in p:
                f[key] = cast(p[pn])
        for pn, key in [("BRD_IO_ENABLE", "brd_io_enable"),
                        ("BRD_IO_DSHOT",  "brd_io_dshot"),
                        ("BRD_SBUS_OUT",  "brd_sbus_out")]:
            if pn in p:
                f[key] = bool(int(p[pn]))
        if f:
            add_v("brd_config", "Flight Controller", "🖥", f)

    # ── Arming ────────────────────────────────────────────────────────────
    if has("ARMING_CHECK", "ARMING_ACCTHRESH", "ARMING_REQUIRE", "ARMING_RUDDER"):
        f = {}
        for pn, key, cast in [
            ("ARMING_CHECK",     "arming_check",     int),
            ("ARMING_MAGTHRESH", "arming_magthresh",  int),
            ("ARMING_REQUIRE",   "arming_require",    int),
            ("ARMING_RUDDER",    "arming_rudder",     int),
            ("ARMING_OPTIONS",   "arming_options",    int),
        ]:
            if pn in p:
                f[key] = cast(p[pn])
        fv = fval("ARMING_ACCTHRESH")
        if fv is not None:
            f["arming_accthresh"] = fv
        if f:
            add_v("arming", "Arming", "🔒", f)

    # ── Failsafe ──────────────────────────────────────────────────────────
    if has("FS_THR_ENABLE", "FS_THR_VALUE", "FS_GCS_ENABLE",
           "FS_EKF_ACTION", "FS_CRASH_CHECK", "FS_VIBE_ENABLE", "FS_OPTIONS",
           "FS_GCS_TIMEOUT", "FS_LONG_TIMEOUT", "FS_SHORT_TIMEOUT"):
        f = {}
        for pn, key in [("FS_THR_ENABLE",   "fs_thr_enable"),
                        ("FS_THR_VALUE",    "fs_thr_value"),
                        ("FS_GCS_ENABLE",   "fs_gcs_enable"),
                        ("FS_EKF_ACTION",   "fs_ekf_action"),
                        ("FS_CRASH_CHECK",  "fs_crash_check"),
                        ("FS_OPTIONS",      "fs_options")]:
            v = ival(pn)
            if v is not None:
                f[key] = v
        for pn, key in [("FS_EKF_THRESH",    "fs_ekf_thresh"),
                        ("FS_GCS_TIMEOUT",   "fs_gcs_timeout"),
                        ("FS_LONG_TIMEOUT",  "fs_long_timeout"),
                        ("FS_SHORT_TIMEOUT", "fs_short_timeout")]:
            fv = fval(pn)
            if fv is not None:
                f[key] = fv
        if "FS_VIBE_ENABLE" in p:
            f["fs_vibe_enable"] = bool(int(p["FS_VIBE_ENABLE"]))
        if f:
            add_v("failsafe", "Failsafe", "🛡", f)

    # ── Flight Modes ──────────────────────────────────────────────────────
    fm = {}
    for n in range(1, 7):
        v = ival(f"FLTMODE{n}")
        if v is not None:
            fm[f"fltmode{n}"] = v
    if fm:
        add_v("flight_modes", "Flight Modes", "🕹", fm)

    # ── Harmonic Notch ────────────────────────────────────────────────────
    if has("INS_HNTCH_ENABLE", "INS_HNTCH_FREQ",
           "INS_HNTC2_ENABLE", "INS_HNTC2_FREQ"):
        f = {}
        for pn, key in [("INS_HNTCH_ENABLE", "ins_hntch_enable"),
                        ("INS_HNTC2_ENABLE", "ins_hntc2_enable")]:
            if pn in p:
                f[key] = bool(int(p[pn]))
        for pn, key in [("INS_HNTCH_MODE",   "ins_hntch_mode"),
                        ("INS_HNTCH_FREQ",   "ins_hntch_freq"),
                        ("INS_HNTCH_BW",     "ins_hntch_bw"),
                        ("INS_HNTCH_ATTN",   "ins_hntch_attn"),
                        ("INS_HNTCH_HMNCS",  "ins_hntch_hmncs"),
                        ("INS_HNTCH_REF",    "ins_hntch_ref"),
                        ("INS_HNTCH_FM_RAT", "ins_hntch_fm_rat"),
                        ("INS_HNTCH_OPTS",   "ins_hntch_opts"),
                        ("INS_HNTC2_MODE",   "ins_hntc2_mode"),
                        ("INS_HNTC2_FREQ",   "ins_hntc2_freq"),
                        ("INS_HNTC2_BW",     "ins_hntc2_bw"),
                        ("INS_HNTC2_ATTN",   "ins_hntc2_attn"),
                        ("INS_HNTC2_HMNCS",  "ins_hntc2_hmncs"),
                        ("INS_HNTC2_REF",    "ins_hntc2_ref"),
                        ("INS_HNTC2_FM_RAT", "ins_hntc2_fm_rat"),
                        ("INS_HNTC2_OPTS",   "ins_hntc2_opts")]:
            v = fval(pn)
            if v is not None:
                f[key] = v
        if f:
            add_v("harmonic_notch", "Harmonic Notch", "〰", f)

    # ── EKF Config ───────────────────────────────────────────────────────
    if has("AHRS_EKF_TYPE", "EK3_ENABLE", "EK3_SRC1_POSXY"):
        f = {}
        v = ival("AHRS_EKF_TYPE")
        if v is not None:
            f["ekf_type"] = v
        if "EK3_ENABLE" in p:
            f["ek3_enable"] = bool(int(p["EK3_ENABLE"]))
        for pn, key in [("EK3_SRC1_POSXY", "ek3_src1_posxy"),
                        ("EK3_SRC1_VELXY", "ek3_src1_velxy"),
                        ("EK3_SRC1_POSZ",  "ek3_src1_posz"),
                        ("EK3_SRC1_VELZ",  "ek3_src1_velz"),
                        ("EK3_SRC1_YAW",   "ek3_src1_yaw"),
                        ("EK3_SRC2_POSXY", "ek3_src2_posxy"),
                        ("EK3_SRC2_VELXY", "ek3_src2_velxy"),
                        ("EK3_SRC2_POSZ",  "ek3_src2_posz"),
                        ("EK3_SRC2_VELZ",  "ek3_src2_velz"),
                        ("EK3_SRC2_YAW",   "ek3_src2_yaw"),
                        ("EK3_SRC3_POSXY", "ek3_src3_posxy"),
                        ("EK3_SRC3_VELXY", "ek3_src3_velxy"),
                        ("EK3_SRC3_POSZ",  "ek3_src3_posz"),
                        ("EK3_SRC3_VELZ",  "ek3_src3_velz"),
                        ("EK3_SRC3_YAW",   "ek3_src3_yaw"),
                        ("EK3_GPS_TYPE",   "ek3_gps_type")]:
            v = ival(pn)
            if v is not None:
                f[key] = v
        for pn, key in [("EK3_GYRO_PNOISE", "ek3_gyro_pnoise"),
                        ("EK3_ACC_PNOISE",  "ek3_acc_pnoise"),
                        ("EK3_WIND_PNOISE", "ek3_wind_pnoise"),
                        ("EK3_GPS_V_NOISE", "ek3_gps_verr"),
                        ("EK3_GPS_P_NSE",   "ek3_gps_perr"),
                        ("EK3_BARO_M_NSE",  "ek3_baro_alt_noise"),
                        ("EK3_MAG_M_NSE",   "ek3_mag_noise"),
                        ("EK3_RNG_M_NSE",   "ek3_rng_m_nse"),
                        ("EK3_FLOW_M_NSE",  "ek3_flow_m_nse"),
                        ("EK3_ALT_M_NSQ",   "ek3_alt_m_nsq"),
                        ("EK3_AFFINITY",    "ek3_affinity"),
                        ("EK3_PRIMARY",     "ek3_primary")]:
            fv = fval(pn)
            if fv is not None:
                f[key] = fv
        if f:
            add_v("ekf_config", "EKF3", "🧭", f)

    # ── Geofence ─────────────────────────────────────────────────────────
    if has("FENCE_ENABLE", "FENCE_TYPE"):
        f = {}
        if "FENCE_ENABLE" in p:
            f["fence_enable"] = bool(int(p["FENCE_ENABLE"]))
        for pn, key in [("FENCE_TYPE",    "fence_type"),
                        ("FENCE_ACTION",  "fence_action"),
                        ("FENCE_ALT_MAX", "fence_alt_max"),
                        ("FENCE_ALT_MIN", "fence_alt_min"),
                        ("FENCE_RADIUS",  "fence_radius"),
                        ("FENCE_MARGIN",  "fence_margin")]:
            v = fval(pn)
            if v is not None:
                f[key] = v
        if f:
            add_v("geofence", "GeoFence", "🔒", f)

    # ── RC Mapping ────────────────────────────────────────────────────────
    _rc_map_keys = ("RCMAP_ROLL", "RCMAP_PITCH", "RC_OPTIONS",
                    *[f"RC{n}_{s}" for n in range(1, 17) for s in ("MIN", "MAX", "TRIM")])
    if has(*_rc_map_keys):
        f = {}
        for pn, key in [("RCMAP_ROLL",     "rcmap_roll"),
                        ("RCMAP_PITCH",    "rcmap_pitch"),
                        ("RCMAP_THROTTLE", "rcmap_throttle"),
                        ("RCMAP_YAW",      "rcmap_yaw"),
                        ("RC_OPTIONS",     "rc_options"),
                        ("RC_PROTOCOLS",   "rc_protocols"),
                        ("RC_FS_TIMEOUT",  "rc_fs_timeout")]:
            v = ival(pn)
            if v is not None:
                f[key] = v
        # Per-channel calibration, options, reversed
        for n in range(1, 17):
            for suffix, fkey in [("MIN",      f"rc{n}_min"),
                                  ("TRIM",     f"rc{n}_trim"),
                                  ("MAX",      f"rc{n}_max"),
                                  ("DZ",       f"rc{n}_dz"),
                                  ("OPTION",   f"rc{n}_option")]:
                v = ival(f"RC{n}_{suffix}")
                if v is not None:
                    f[fkey] = v
            rev_pn = f"RC{n}_REVERSED"
            if rev_pn in p:
                f[f"rc{n}_reversed"] = bool(int(p[rev_pn]))
        if f:
            add_v("rc_mapping", "RC Mapping", "📡", f)

    # ── CAN bus ───────────────────────────────────────────────────────────
    if has("CAN_P1_DRIVER", "CAN_P2_DRIVER"):
        f = {}
        for pn, key in [("CAN_P1_DRIVER",    "can_p1_driver"),
                        ("CAN_P2_DRIVER",    "can_p2_driver"),
                        ("CAN_P1_BITRATE",   "can_p1_bitrate"),
                        ("CAN_P2_BITRATE",   "can_p2_bitrate"),
                        ("CAN_P1_FDBITRATE", "can_p1_fdbitrate"),
                        ("CAN_P2_FDBITRATE", "can_p2_fdbitrate"),
                        ("CAN_D1_UC_NODE",   "can_d1_uc_node"),
                        ("CAN_D1_UC_ESC_BM", "can_d1_uc_esc_bm")]:
            v = ival(pn)
            if v is not None:
                f[key] = v
        if f:
            add_v("can_bus", "CAN / DroneCAN", "🔗", f)

    # ── Battery monitors ─────────────────────────────────────────────────
    for instance in range(1, 10):
        pfx = "BATT" if instance == 1 else f"BATT{instance}"
        monitor_param = f"{pfx}_MONITOR"
        if monitor_param not in p:
            continue
        f: dict = {"instance": instance}
        for suffix, key, cast in [
            ("MONITOR",    "batt_monitor",  int),
            ("VOLT_PIN",   "volt_pin",      int),
            ("CURR_PIN",   "curr_pin",      int),
            ("VOLT_MULT",  "volt_mult",     float),
            ("AMP_PERVLT", "amp_pervlt",    float),
            ("AMP_OFFSET", "amp_offset",    float),
            ("CAPACITY",   "batt_capacity", int),
            ("LOW_VOLT",   "low_volt",      float),
            ("CRT_VOLT",   "crt_volt",      float),
            ("ARM_VOLT",   "batt_arm_volt", float),
            ("LOW_MAH",    "low_mah",       int),
            ("FS_LOW_ACT", "fs_low_act",    int),
            ("FS_CRT_ACT", "fs_crt_act",    int),
        ]:
            pname = f"{pfx}_{suffix}"
            if pname in p:
                f[key] = cast(p[pname])
        add_p("battery_monitor", f"Battery {instance}", "🔋", f)

    # ── GPS ───────────────────────────────────────────────────────────────
    for instance in range(1, 3):
        suffix = "" if instance == 1 else str(instance)
        gps_type_param = f"GPS_TYPE{suffix}"
        if gps_type_param not in p:
            continue
        f = {"instance": instance, "gps_type": int(p[gps_type_param])}
        # Find serial port assigned to GPS (protocol=5)
        for sn in range(0, 7):
            if p.get(f"SERIAL{sn}_PROTOCOL") == 5.0:
                f["serial_port"] = f"SERIAL{sn}"
                baud = ival(f"SERIAL{sn}_BAUD")
                if baud is not None:
                    f["serial_baud"] = baud
                break
        if "GPS_AUTO_CONFIG" in p:
            f["gps_auto_config"] = bool(int(p["GPS_AUTO_CONFIG"]))
        for pn, key in [(f"COMPASS_USE{suffix}",      "compass_use"),
                        (f"COMPASS_EXTERNAL{suffix}", "compass_external"),
                        (f"COMPASS_ORIENT{suffix}",   "compass_orient")]:
            if pn in p:
                f[key] = bool(int(p[pn])) if key != "compass_orient" else int(p[pn])
        # Multi-GPS blending (only add to first GPS instance to avoid duplication)
        if instance == 1:
            for pn, key in [("GPS_BLEND_MASK",  "gps_blend_mask"),
                            ("GPS_BLEND_TC",    "gps_blend_tc"),
                            ("GPS_DELAY_MS",    "gps_delay_ms"),
                            ("GPS_HDOP_GOOD",   "gps_hdop_good"),
                            ("GPS_DRV_OPTIONS", "gps_drv_options")]:
                v = fval(pn)
                if v is not None:
                    f[key] = v
        add_p("gps", f"GPS {instance}", "📡", f)

    # ── Airspeed sensor ───────────────────────────────────────────────────
    for instance in range(1, 3):
        pfx = "ARSPD" if instance == 1 else f"ARSPD{instance}"
        type_param = f"{pfx}_TYPE"
        if type_param not in p:
            continue
        f = {"instance": instance}
        for suffix, key, cast in [
            ("TYPE",     "arspd_type",     int),
            ("USE",      "arspd_use",      int),
            ("BUS",      "arspd_bus",      int),
            ("PIN",      "arspd_pin",      int),
            ("RATIO",    "arspd_ratio",    float),
            ("SKIP_CAL", "arspd_skip_cal", lambda v: bool(int(v))),
            ("AUTOCAL",  "arspd_autocal",  lambda v: bool(int(v))),
        ]:
            pn = f"{pfx}_{suffix}"
            if pn in p:
                f[key] = cast(p[pn])
        add_p("airspeed", f"Airspeed {instance}", "💨", f)

    # ── Rangefinder ───────────────────────────────────────────────────────
    for instance in range(1, 11):
        type_param = f"RNGFND{instance}_TYPE"
        if type_param not in p:
            break
        f = {"instance": instance}
        for suffix, key, cast in [
            ("TYPE",     "rngfnd_type",    int),
            ("ORIENT",   "rngfnd_orient",  int),
            ("MIN_CM",   "rngfnd_min",     int),
            ("MAX_CM",   "rngfnd_max",     int),
            ("GNDCLEAR", "rngfnd_gndclear",int),
        ]:
            pn = f"RNGFND{instance}_{suffix}"
            if pn in p:
                f[key] = cast(p[pn])
        add_p("rangefinder", f"Rangefinder {instance}", "📏", f)

    # ── Telemetry / Companion (MAVLink serial ports, protocol 1 or 2) ────
    for sn in range(1, 7):
        proto = p.get(f"SERIAL{sn}_PROTOCOL")
        if proto not in (1.0, 2.0):
            continue
        # Skip if already claimed by GPS
        if any(c.get("fields", {}).get("serial_port") == f"SERIAL{sn}"
               for c in components if c["defId"] == "gps"):
            continue
        f = {"serial_port": f"SERIAL{sn}", "protocol": int(proto)}
        baud = ival(f"SERIAL{sn}_BAUD")
        if baud is not None:
            f["baud"] = baud
        if "SYSID_THISMAV" in p:
            f["sysid_thismav"] = int(p["SYSID_THISMAV"])
        add_p("telemetry", f"Telemetry (SERIAL{sn})", "📻", f)

    # ── RC Input ─────────────────────────────────────────────────────────
    rc_f = {}
    if "RC_PROTOCOLS" in p:
        rc_f["rc_protocols"] = int(p["RC_PROTOCOLS"])
    for sn in range(1, 7):
        if p.get(f"SERIAL{sn}_PROTOCOL") == 23.0:
            rc_f["rc_uart"] = f"SERIAL{sn}"
            break
    if "RC_SPEED" in p:
        rc_f["rc_speed"] = int(p["RC_SPEED"])
    if rc_f:
        add_p("rc_input", "RC Input", "📶", rc_f)

    # ── ESC / Motor outputs (copter / vtol) ───────────────────────────────
    if vehicle_type in ("copter", "vtol"):
        mot_pwm_type = ival("MOT_PWM_TYPE")
        blh_mask  = int(p.get("SERVO_BLH_MASK",  0))
        blh_telem = int(p.get("SERVO_BLH_TELEM", 0))
        blh_bidi  = int(p.get("SERVO_BLH_BDMASK", 0))
        blh_poles = ival("SERVO_BLH_POLES")

        # One ESC chip if any ESC-level params are present
        esc_f: dict = {}
        if mot_pwm_type is not None: esc_f["mot_pwm_type"]    = mot_pwm_type
        if blh_mask:                 esc_f["blheli_enabled"]  = True
        if blh_telem:                esc_f["blheli_telem"]    = True
        if blh_bidi:                 esc_f["blheli_bidi"]     = True
        if blh_poles is not None:    esc_f["blheli_poles"]    = blh_poles
        if esc_f:
            esc_f["connection_type"] = "pwm"
            esc_f["esc_role"] = "motor"
            add_p("esc", "ESC", "⚡", esc_f)

        # One Motor chip per SERVO output in the motor function range
        for servo_n in range(1, 15):
            fn = p.get(f"SERVO{servo_n}_FUNCTION")
            if fn is None:
                continue
            fn_int = int(fn)
            if not (_MOTOR_FUNC_MIN <= fn_int <= _MOTOR_FUNC_MAX):
                continue
            motor_num = fn_int - 32   # 33 → 1, 34 → 2, …
            f: dict = {"output_pin": servo_n, "motor_num": motor_num}
            if f"SERVO{servo_n}_REVERSED" in p:
                f["reversed"] = bool(int(p[f"SERVO{servo_n}_REVERSED"]))
            add_p("motor", f"Motor {motor_num}", "🔄", f)

    # ── Servos + throttle ESCs (plane + vtol) ────────────────────────────
    elif vehicle_type in ("plane", "vtol"):
        _THROTTLE_FUNCS = {70: "Throttle", 73: "Throttle Left", 74: "Throttle Right"}
        _ALL_SERVO_FUNCS = {**_SURFACE_FUNCS, **_TILT_FUNCS}
        for servo_n in range(1, 15):
            fn = p.get(f"SERVO{servo_n}_FUNCTION")
            if fn is None:
                continue
            fn_int = int(fn)
            if fn_int in _THROTTLE_FUNCS:
                label = _THROTTLE_FUNCS[fn_int]
                f: dict = {"connection_type": "pwm", "esc_role": "throttle",
                           "output_pin": servo_n, "servo_function": fn_int}
                for suffix, key in [("MIN", "servo_min"), ("MAX", "servo_max"), ("TRIM", "servo_trim")]:
                    v = fval(f"SERVO{servo_n}_{suffix}")
                    if v is not None:
                        f[key] = int(v)
                if f"SERVO{servo_n}_REVERSED" in p:
                    f["reversed"] = bool(int(p[f"SERVO{servo_n}_REVERSED"]))
                add_p("esc", label, "⚡", f)
            elif fn_int in _ALL_SERVO_FUNCS:
                label = _ALL_SERVO_FUNCS[fn_int]
                f = {"connection_type": "pwm", "output_pin": servo_n, "servo_function": fn_int}
                for suffix, key in [("MIN", "servo_min"), ("MAX", "servo_max"), ("TRIM", "servo_trim")]:
                    v = fval(f"SERVO{servo_n}_{suffix}")
                    if v is not None:
                        f[key] = int(v)
                if f"SERVO{servo_n}_REVERSED" in p:
                    f["reversed"] = bool(int(p[f"SERVO{servo_n}_REVERSED"]))
                v = fval(f"SERVO{servo_n}_RATE")
                if v is not None:
                    f["servo_rate"] = int(v)
                add_p("servo", label, "↔", f)

    # ── Attitude Controller ───────────────────────────────────────────────
    if has("ATC_RAT_RLL_P", "ATC_RAT_PIT_P", "ATC_RAT_YAW_P",
           "ATC_ANG_RLL_P", "ATC_ACCEL_R_MAX"):
        f = {}
        for pn, key in [
            ("ATC_RAT_RLL_P",   "atc_rat_rll_p"),  ("ATC_RAT_RLL_I",   "atc_rat_rll_i"),
            ("ATC_RAT_RLL_D",   "atc_rat_rll_d"),  ("ATC_RAT_RLL_IMAX","atc_rat_rll_imax"),
            ("ATC_RAT_RLL_VFF", "atc_rat_rll_vff"), ("ATC_RAT_RLL_SMAX","atc_rat_rll_smax"),
            ("ATC_RAT_RLL_FLTT","atc_rat_rll_fltt"),("ATC_RAT_RLL_FLTE","atc_rat_rll_flte"),
            ("ATC_RAT_RLL_FLTD","atc_rat_rll_fltd"),
            ("ATC_RAT_PIT_P",   "atc_rat_pit_p"),  ("ATC_RAT_PIT_I",   "atc_rat_pit_i"),
            ("ATC_RAT_PIT_D",   "atc_rat_pit_d"),  ("ATC_RAT_PIT_IMAX","atc_rat_pit_imax"),
            ("ATC_RAT_PIT_VFF", "atc_rat_pit_vff"), ("ATC_RAT_PIT_SMAX","atc_rat_pit_smax"),
            ("ATC_RAT_PIT_FLTT","atc_rat_pit_fltt"),("ATC_RAT_PIT_FLTE","atc_rat_pit_flte"),
            ("ATC_RAT_PIT_FLTD","atc_rat_pit_fltd"),
            ("ATC_RAT_YAW_P",   "atc_rat_yaw_p"),  ("ATC_RAT_YAW_I",   "atc_rat_yaw_i"),
            ("ATC_RAT_YAW_D",   "atc_rat_yaw_d"),  ("ATC_RAT_YAW_IMAX","atc_rat_yaw_imax"),
            ("ATC_RAT_YAW_VFF", "atc_rat_yaw_vff"), ("ATC_RAT_YAW_SMAX","atc_rat_yaw_smax"),
            ("ATC_RAT_YAW_FLTT","atc_rat_yaw_fltt"),("ATC_RAT_YAW_FLTE","atc_rat_yaw_flte"),
            ("ATC_RAT_YAW_FLTD","atc_rat_yaw_fltd"),
            ("ATC_ANG_RLL_P",   "atc_ang_rll_p"),  ("ATC_ANG_PIT_P",   "atc_ang_pit_p"),
            ("ATC_ANG_YAW_P",   "atc_ang_yaw_p"),
            ("ATC_ACCEL_R_MAX", "atc_accel_r_max"),("ATC_ACCEL_P_MAX", "atc_accel_p_max"),
            ("ATC_ACCEL_Y_MAX", "atc_accel_y_max"),("ATC_SLEW_YAW",    "atc_slew_yaw"),
            ("ATC_INPUT_TC",    "atc_input_tc"),
        ]:
            fv = fval(pn)
            if fv is not None:
                f[key] = fv
        if "ATC_ANGLE_BOOST" in p:
            f["atc_angle_boost"] = bool(int(p["ATC_ANGLE_BOOST"]))
        if f:
            add_v("attitude_controller", "Attitude Controller", "🎯", f)

    # ── Position Controller ───────────────────────────────────────────────
    if has("PSC_POSXY_P", "PSC_VELXY_P", "PSC_POSZ_P", "PSC_VELZ_P"):
        f = {}
        for pn, key in [
            ("PSC_POSXY_P",       "psc_posxy_p"),
            ("PSC_VELXY_P",       "psc_velxy_p"),   ("PSC_VELXY_I",      "psc_velxy_i"),
            ("PSC_VELXY_D",       "psc_velxy_d"),   ("PSC_VELXY_IMAX",   "psc_velxy_imax"),
            ("PSC_VELXY_FILT_HZ", "psc_velxy_filt_hz"),
            ("PSC_VELXY_D_FILT_HZ","psc_velxy_d_filt_hz"),
            ("PSC_POSZ_P",        "psc_posz_p"),
            ("PSC_VELZ_P",        "psc_velz_p"),    ("PSC_VELZ_I",       "psc_velz_i"),
            ("PSC_VELZ_D",        "psc_velz_d"),    ("PSC_VELZ_IMAX",    "psc_velz_imax"),
            ("PSC_JERK_XY",       "psc_jerk_xy"),   ("PSC_JERK_Z",       "psc_jerk_z"),
        ]:
            fv = fval(pn)
            if fv is not None:
                f[key] = fv
        if f:
            add_v("position_controller", "Position Controller", "📍", f)

    # ── Acro Mode ─────────────────────────────────────────────────────────
    if has("ACRO_RP_P", "ACRO_YAW_P", "ACRO_ROLL_RATE", "ACRO_PITCH_RATE"):
        f = {}
        for pn, key in [
            ("ACRO_RP_P",          "acro_rp_p"),
            ("ACRO_YAW_P",         "acro_yaw_p"),
            ("ACRO_RP_EXPO",       "acro_rp_expo"),
            ("ACRO_Y_EXPO",        "acro_y_expo"),
            ("ACRO_TRAINER",       "acro_trainer"),
            ("ACRO_THR_MID",       "acro_thr_mid"),
            ("ACRO_BALANCE_ROLL",  "acro_balance_roll"),
            ("ACRO_BALANCE_PITCH", "acro_balance_pitch"),
            ("ACRO_ROLL_RATE",     "acro_roll_rate"),
            ("ACRO_PITCH_RATE",    "acro_pitch_rate"),
            ("ACRO_YAW_RATE",      "acro_yaw_rate"),
        ]:
            fv = fval(pn)
            if fv is not None:
                f[key] = fv
        if f:
            add_v("acro_config", "Acro Mode", "🏎", f)

    # ── Compass ───────────────────────────────────────────────────────────
    if has("COMPASS_ENABLE", "COMPASS_USE", "COMPASS_ORIENT", "COMPASS_TYPEMASK",
           "COMPASS_AUTODEC", "COMPASS_DEC", "COMPASS_AUTO_ROT"):
        f = {}
        for pn, key in [("COMPASS_USE",      "compass_use"),
                        ("COMPASS_USE2",     "compass_use2"),
                        ("COMPASS_USE3",     "compass_use3"),
                        ("COMPASS_ENABLE",   "compass_enable"),
                        ("COMPASS_AUTODEC",  "compass_autodec"),
                        ("COMPASS_EXTERNAL", "compass_external")]:
            if pn in p:
                f[key] = bool(int(p[pn]))
        for pn, key in [("COMPASS_ORIENT",   "compass_orient"),
                        ("COMPASS_AUTO_ROT", "compass_auto_rot"),
                        ("COMPASS_TYPEMASK", "compass_typemask"),
                        ("COMPASS_DISBLMSK", "compass_disblmsk")]:
            v = ival(pn)
            if v is not None:
                f[key] = v
        fv = fval("COMPASS_DEC")
        if fv is not None:
            f["compass_dec"] = fv
        if f:
            add_v("compass_config", "Compass", "🧭", f)

    # ── Barometer ─────────────────────────────────────────────────────────
    if has("BARO_PRIMARY", "BARO_PROBE_EXT", "BARO_FIELD_ELV", "BARO_OPTIONS", "BARO_FLTR_RNG"):
        f = {}
        for pn, key in [("BARO_PRIMARY",   "baro_primary"),
                        ("BARO_PROBE_EXT", "baro_probe_ext"),
                        ("BARO_EXT_BUS",   "baro_ext_bus"),
                        ("BARO_OPTIONS",   "baro_options")]:
            v = ival(pn)
            if v is not None:
                f[key] = v
        for pn, key in [("BARO_FIELD_ELV", "baro_field_elv"),
                        ("BARO_FLTR_RNG",  "baro_fltr_rng")]:
            fv = fval(pn)
            if fv is not None:
                f[key] = fv
        if f:
            add_v("baro_config", "Barometer", "🌡", f)

    # ── WP Navigation ─────────────────────────────────────────────────────
    if vehicle_type in ("copter", "vtol"):
        if has("WPNAV_SPEED", "WPNAV_SPEED_UP", "WPNAV_ACCEL", "WPNAV_RADIUS"):
            f = {}
            for pn, key in [("WPNAV_SPEED",    "wpnav_speed"),
                            ("WPNAV_SPEED_UP", "wpnav_speed_up"),
                            ("WPNAV_SPEED_DN", "wpnav_speed_dn"),
                            ("WPNAV_ACCEL",    "wpnav_accel"),
                            ("WPNAV_RADIUS",   "wpnav_radius")]:
                v = fval(pn)
                if v is not None:
                    f[key] = v
            if "WPNAV_RFND_USE" in p:
                f["wpnav_rfnd_use"] = bool(int(p["WPNAV_RFND_USE"]))
            if f:
                add_v("wpnav_config", "WP Navigation", "🗺", f)

    # ── RTL Configuration ─────────────────────────────────────────────────
    if has("RTL_ALT", "RTL_ALT_FINAL", "RTL_SPEED",
           "RTL_ALTITUDE", "RTL_AUTOLAND", "RTL_RADIUS"):
        f = {}
        for pn, key in [("RTL_ALT",       "rtl_alt"),
                        ("RTL_ALT_FINAL", "rtl_alt_final"),
                        ("RTL_SPEED",     "rtl_speed"),
                        ("RTL_LOIT_TIME", "rtl_loit_time"),
                        ("RTL_ALT_TYPE",  "rtl_alt_type"),
                        ("RTL_OPTIONS",   "rtl_options"),
                        ("RTL_AUTOLAND",  "rtl_autoland"),
                        ("RTL_RADIUS",    "rtl_radius"),
                        ("RTL_CLIMB_MIN", "rtl_climb_min")]:
            v = fval(pn)
            if v is not None:
                f[key] = v
        for pn, key in [("RTL_CONE_SLOPE","rtl_cone_slope"),
                        ("RTL_ALTITUDE",  "rtl_altitude")]:
            fv = fval(pn)
            if fv is not None:
                f[key] = fv
        if f:
            add_v("rtl_config", "RTL Config", "🏠", f)

    # ── Gimbal / Camera Mount ─────────────────────────────────────────────
    if "MNT1_TYPE" in p and int(p["MNT1_TYPE"]) != 0:
        f = {}
        for pn, key in [("MNT1_TYPE",       "mnt1_type"),
                        ("MNT1_DEFLT_MODE", "mnt1_deflt_mode"),
                        ("MNT1_RC_IN_TILT", "mnt1_rc_in_tilt"),
                        ("MNT1_RC_IN_ROLL", "mnt1_rc_in_roll"),
                        ("MNT1_RC_IN_PAN",  "mnt1_rc_in_pan"),
                        ("MNT1_RC_RATE",    "mnt1_rc_rate")]:
            v = ival(pn)
            if v is not None:
                f[key] = v
        for pn, key in [("MNT1_PITCH_MIN", "mnt1_pitch_min"),
                        ("MNT1_PITCH_MAX", "mnt1_pitch_max"),
                        ("MNT1_ROLL_MIN",  "mnt1_roll_min"),
                        ("MNT1_ROLL_MAX",  "mnt1_roll_max"),
                        ("MNT1_YAW_MIN",   "mnt1_yaw_min"),
                        ("MNT1_YAW_MAX",   "mnt1_yaw_max")]:
            fv = fval(pn)
            if fv is not None:
                f[key] = fv
        if f:
            add_p("gimbal_mount", "Gimbal", "📷", f)

    # ── Obstacle Avoidance ────────────────────────────────────────────────
    if has("OA_TYPE", "AVOID_ENABLE", "PRX1_TYPE"):
        f = {}
        for pn, key in [("OA_TYPE",       "oa_type"),
                        ("AVOID_ENABLE",  "avoid_enable"),
                        ("PRX1_TYPE",     "prx1_type"),
                        ("PRX1_ORIENT",   "prx1_orient")]:
            v = ival(pn)
            if v is not None:
                f[key] = v
        for pn, key in [("OA_MARGIN_MAX", "oa_margin_max"),
                        ("OA_LOOKAHEAD",  "oa_lookahead"),
                        ("AVOID_MARGIN",  "avoid_margin"),
                        ("AVOID_DIST_MAX","avoid_dist_max"),
                        ("PRX1_YAW_CORR","prx1_yaw_corr"),
                        ("PRX_IGN_GND",  "prx_ign_gnd")]:
            fv = fval(pn)
            if fv is not None:
                f[key] = fv
        if f:
            add_v("obstacle_avoidance", "Obstacle Avoidance", "⛔", f)

    return {"vehicle_type": vehicle_type, "components": components}


def parse_param_file(text: str) -> dict[str, float]:
    """
    Parse an ArduPilot .param file (comma or tab separated, # comments).
    Returns a dict mapping parameter name → numeric value.
    """
    params: dict[str, float] = {}
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        # Support both comma and tab separators
        parts = line.replace("\t", ",").split(",", 1)
        if len(parts) != 2:
            continue
        name, val_str = parts[0].strip().upper(), parts[1].strip()
        try:
            params[name] = float(val_str)
        except ValueError:
            continue
    return params
