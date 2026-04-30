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
data/can_topology_defs.py
────────────────────────────────────────────────────────────────────────────────
CAN Topology component definitions — Community Edition.

autopilot_cube — single FC unit. Community Edition supports exactly one
autopilot instance (maxInstances=1). The fc_instance field is omitted;
the chip always displays as FC 1.

Port positions in world space (chip-local origin at component x,y):
  CAN1 → { x + 200, y + 37 }
  CAN2 → { x + 200, y + 69 }
"""

_ORIENTATION_OPTIONS = [
    {"value": 0,  "label": "None (default)"},
    {"value": 1,  "label": "Yaw 45°"},
    {"value": 2,  "label": "Yaw 90°"},
    {"value": 3,  "label": "Yaw 135°"},
    {"value": 4,  "label": "Yaw 180°"},
    {"value": 5,  "label": "Yaw 225°"},
    {"value": 6,  "label": "Yaw 270°"},
    {"value": 7,  "label": "Yaw 315°"},
    {"value": 8,  "label": "Roll 180°"},
    {"value": 9,  "label": "Roll 180°, Yaw 45°"},
    {"value": 10, "label": "Roll 180°, Yaw 90°"},
    {"value": 11, "label": "Roll 180°, Yaw 135°"},
    {"value": 12, "label": "Pitch 180°"},
    {"value": 13, "label": "Roll 180°, Yaw 225°"},
    {"value": 14, "label": "Roll 180°, Yaw 270°"},
    {"value": 15, "label": "Roll 180°, Yaw 315°"},
    {"value": 16, "label": "Roll 90°"},
    {"value": 17, "label": "Roll 90°, Yaw 45°"},
    {"value": 18, "label": "Roll 90°, Yaw 90°"},
    {"value": 19, "label": "Roll 90°, Yaw 135°"},
    {"value": 20, "label": "Roll 270°"},
    {"value": 21, "label": "Roll 270°, Yaw 45°"},
    {"value": 22, "label": "Roll 270°, Yaw 90°"},
    {"value": 23, "label": "Roll 270°, Yaw 135°"},
    {"value": 24, "label": "Pitch 90°"},
    {"value": 25, "label": "Pitch 270°"},
    {"value": 26, "label": "Pitch 180°, Yaw 90°"},
    {"value": 27, "label": "Pitch 180°, Yaw 270°"},
    {"value": 28, "label": "Roll 90°, Pitch 90°"},
    {"value": 29, "label": "Roll 180°, Pitch 90°"},
    {"value": 30, "label": "Roll 270°, Pitch 90°"},
    {"value": 31, "label": "Roll 90°, Pitch 180°"},
    {"value": 32, "label": "Roll 270°, Pitch 180°"},
    {"value": 33, "label": "Roll 90°, Pitch 270°"},
    {"value": 34, "label": "Roll 180°, Pitch 270°"},
    {"value": 35, "label": "Roll 270°, Pitch 270°"},
    {"value": 36, "label": "Roll 90°, Pitch 180°, Yaw 90°"},
    {"value": 37, "label": "Roll 90°, Yaw 270°"},
    {"value": 38, "label": "Roll 90°, Pitch 68°, Yaw 293°"},
    {"value": 39, "label": "Pitch 315°"},
    {"value": 40, "label": "Roll 90°, Pitch 315°"},
]

# Variants with an IMU heater circuit (all except CubeMini)
_WITH_HEATER = [
    "cube_orange_plus", "cube_orange", "cube_purple",
    "cube_yellow", "cube_green", "cube_black", "cube_blue", "cube_red",
]

TOPOLOGY_DEFS: list[dict] = [
    {
        "id": "autopilot_cube",
        "label": "CubeOrange+",
        "category": "Autopilot",
        "icon": "🟧",
        "vehicles": ["copter", "plane", "vtol"],
        "virtual": False,
        "multi": False,
        "maxInstances": 1,
        "chipVariant": "autopilot_cube",
        "chipW": 200,
        "chipH": 96,
        "connections": ["CAN1", "CAN2"],
        "inspector": [

            # ── Flight controller identity ─────────────────────────────────────
            {"label": "Flight Controller", "fields": [
                {
                    "key": "cube_variant",
                    "label": "Cube model",
                    "type": "select",
                    "required": True,
                    "default": "cube_orange_plus",
                    "tooltip": "Physical Cube module installed on this carrier board. "
                               "Determines available IMUs, heater, and MCU architecture.",
                    "options": [
                        {"value": "cube_orange_plus", "label": "CubeOrange+ (H7, ICM-42688-P ×3, IMX 1.1)"},
                        {"value": "cube_orange",      "label": "CubeOrange (H7, ICM-20689 + ICM-20602 + ICM-20948)"},
                        {"value": "cube_purple",      "label": "CubePurple (H7, Orange-equivalent)"},
                        {"value": "cube_yellow",      "label": "CubeYellow (H7, Orange-equivalent)"},
                        {"value": "cube_green",       "label": "CubeGreen (H7, Orange-equivalent)"},
                        {"value": "cube_black",       "label": "CubeBlack (F4/F7, MPU-6000 + ICM-20689 + MPU-9250)"},
                        {"value": "cube_blue",        "label": "CubeBlue (F4/F7, Black-equivalent, US mil)"},
                        {"value": "cube_red",         "label": "CubeRed (dual STM32H7, triple IMU, redundant MCU)"},
                        {"value": "cube_mini",        "label": "CubeMini (F4, reduced IO, no heater)"},
                    ],
                },
                {
                    "key": "can_bitrate",
                    "label": "CAN Bitrate",
                    "type": "select",
                    "default": 1000000,
                    "tooltip": "CAN bus baud rate. 1 Mbps is the DroneCAN standard.",
                    "docs_param": "CAN_D1_PROTOCOL",
                    "options": [
                        {"value": 1000000, "label": "1 Mbps (standard)"},
                        {"value": 500000,  "label": "500 kbps"},
                    ],
                },
            ]},

            # ── Board orientation ──────────────────────────────────────────────
            {"label": "Board Orientation", "fields": [
                {
                    "key": "ahrs_orientation",
                    "label": "Board rotation",
                    "type": "select",
                    "required": True,
                    "default": 0,
                    "tooltip": "Physical rotation of this FC relative to the vehicle. "
                               "Change if the Cube is not mounted upright and forward-facing.",
                    "docs_param": "AHRS_ORIENTATION",
                    "options": _ORIENTATION_OPTIONS,
                },
                {
                    "key": "ins_pos_x",
                    "label": "X offset from CoG",
                    "type": "number", "min": -5, "max": 5, "default": 0, "unit": "m",
                    "tooltip": "Forward distance of the IMU from the vehicle centre of gravity.",
                    "docs_param": "INS_POS1_X",
                },
                {
                    "key": "ins_pos_y",
                    "label": "Y offset from CoG",
                    "type": "number", "min": -5, "max": 5, "default": 0, "unit": "m",
                    "tooltip": "Lateral (right) distance of the IMU from the vehicle centre of gravity.",
                    "docs_param": "INS_POS1_Y",
                },
                {
                    "key": "ins_pos_z",
                    "label": "Z offset from CoG",
                    "type": "number", "min": -5, "max": 5, "default": 0, "unit": "m",
                    "tooltip": "Vertical (down) distance of the IMU from the vehicle centre of gravity.",
                    "docs_param": "INS_POS1_Z",
                },
            ]},

            # ── Board-level settings ───────────────────────────────────────────
            {"label": "Board", "fields": [
                {
                    "key": "brd_options",
                    "label": "Board options (bitmask)",
                    "type": "bitmask",
                    "default": 0,
                    "tooltip": "Board-level feature flags. "
                               "'CPU max clock' applies to H7-based Cubes (Orange, Orange+, Red).",
                    "docs_param": "BRD_OPTIONS",
                    "bits": [
                        {"bit": 0, "label": "Disable MAVftp (saves RAM)"},
                        {"bit": 1, "label": "CPU max clock on startup (H7 only)"},
                    ],
                },
                {
                    "key": "brd_boot_delay",
                    "label": "Boot delay",
                    "type": "number", "min": 0, "max": 10000, "default": 0, "unit": "ms",
                    "tooltip": "Pause before ArduPilot initialises, giving peripherals time to power up.",
                    "docs_param": "BRD_BOOT_DELAY",
                },
                {
                    "key": "brd_serial_num",
                    "label": "Vehicle serial number",
                    "type": "number", "min": 0, "max": 2147483647, "default": 0,
                    "tooltip": "User-assigned serial number stamped in telemetry heartbeat.",
                    "docs_param": "BRD_SERIAL_NUM",
                },
            ]},

            # ── Safety switch ──────────────────────────────────────────────────
            {"label": "Safety Switch", "fields": [
                {
                    "key": "brd_safety_deflt",
                    "label": "Safety switch default",
                    "type": "select",
                    "default": 1,
                    "tooltip": "Whether the hardware safety switch starts armed or disarmed on boot.",
                    "docs_param": "BRD_SAFETY_DEFLT",
                    "options": [
                        {"value": 0, "label": "0 — Armed on boot (no safety)"},
                        {"value": 1, "label": "1 — Disarmed on boot (safety on)"},
                    ],
                },
                {
                    "key": "brd_safetyoption",
                    "label": "Safety button options",
                    "type": "bitmask",
                    "default": 3,
                    "tooltip": "Controls whether a safety button press is required to arm.",
                    "docs_param": "BRD_SAFETYOPTION",
                    "bits": [
                        {"bit": 0, "label": "Arm without safety button press"},
                        {"bit": 1, "label": "Disarm via button in-flight"},
                    ],
                },
                {
                    "key": "brd_safety_mask",
                    "label": "Safety mask",
                    "type": "bitmask",
                    "default": 0,
                    "tooltip": "Servo outputs that remain active while the safety switch is engaged.",
                    "docs_param": "BRD_SAFETY_MASK",
                    "bits": [
                        {"bit": 0,  "label": "Servo output 1"},
                        {"bit": 1,  "label": "Servo output 2"},
                        {"bit": 2,  "label": "Servo output 3"},
                        {"bit": 3,  "label": "Servo output 4"},
                        {"bit": 4,  "label": "Servo output 5"},
                        {"bit": 5,  "label": "Servo output 6"},
                        {"bit": 6,  "label": "Servo output 7"},
                        {"bit": 7,  "label": "Servo output 8"},
                        {"bit": 8,  "label": "Servo output 9"},
                        {"bit": 9,  "label": "Servo output 10"},
                        {"bit": 10, "label": "Servo output 11"},
                        {"bit": 11, "label": "Servo output 12"},
                        {"bit": 12, "label": "Servo output 13"},
                        {"bit": 13, "label": "Servo output 14"},
                    ],
                },
            ]},

            # ── IMU heater — not present on CubeMini ──────────────────────────
            {"label": "IMU Heater", "fields": [
                {
                    "key": "brd_heat_targ",
                    "label": "Heater target temperature",
                    "type": "number", "min": 0, "max": 80, "default": 45, "unit": "°C",
                    "tooltip": "Target temperature for the IMU heater. 0 = disabled.",
                    "docs_param": "BRD_HEAT_TARG",
                    "showIf": {"key": "cube_variant", "values": _WITH_HEATER},
                },
                {
                    "key": "brd_heat_p",
                    "label": "Heater P gain",
                    "type": "number", "min": 1, "max": 500, "default": 50,
                    "tooltip": "Proportional gain for the IMU heater PID controller.",
                    "docs_param": "BRD_HEAT_P",
                    "showIf": {"key": "cube_variant", "values": _WITH_HEATER},
                },
                {
                    "key": "brd_heat_i",
                    "label": "Heater I gain",
                    "type": "number", "min": 0, "max": 1, "default": 0.07,
                    "tooltip": "Integral gain for the IMU heater PID.",
                    "docs_param": "BRD_HEAT_I",
                    "showIf": {"key": "cube_variant", "values": _WITH_HEATER},
                },
                {
                    "key": "brd_heat_imax",
                    "label": "Heater I max",
                    "type": "number", "min": 0, "max": 100, "default": 70, "unit": "%",
                    "tooltip": "Maximum integrator value for the heater PID.",
                    "docs_param": "BRD_HEAT_IMAX",
                    "showIf": {"key": "cube_variant", "values": _WITH_HEATER},
                },
            ]},

            # ── IO board (IOMCU) ───────────────────────────────────────────────
            {"label": "IO Board", "fields": [
                {
                    "key": "brd_io_enable",
                    "label": "IO board enable",
                    "type": "toggle",
                    "default": True,
                    "tooltip": "Enables the IOMCU that drives the Cube MAIN OUT pins 1–8.",
                    "docs_param": "BRD_IO_ENABLE",
                    "note": "Must be enabled for MAIN 1–8 outputs on the CubePilot Cube.",
                },
                {
                    "key": "brd_io_dshot",
                    "label": "IO DShot enable",
                    "type": "toggle",
                    "default": False,
                    "tooltip": "Enables DShot protocol on IO board MAIN 1–8 outputs.",
                    "docs_param": "BRD_IO_ENABLE",
                },
                {
                    "key": "brd_sbus_out",
                    "label": "SBUS output enable",
                    "type": "toggle",
                    "default": False,
                    "tooltip": "Outputs an SBUS signal on the SBUS-out connector, mirroring RC input channels.",
                    "docs_param": "BRD_SBUS_OUT",
                },
            ]},

            # ── Serial flow control ────────────────────────────────────────────
            {"label": "Serial Flow Control", "fields": [
                {
                    "key": "brd_ser1_rtscts",
                    "label": "SERIAL1 RTS/CTS",
                    "type": "select",
                    "default": 2,
                    "tooltip": "Hardware flow control on TELEM1. Auto is recommended for SiK radios.",
                    "docs_param": "BRD_SER1_RTSCTS",
                    "options": [
                        {"value": 0, "label": "0 — Disabled"},
                        {"value": 1, "label": "1 — Enabled"},
                        {"value": 2, "label": "2 — Auto"},
                    ],
                },
                {
                    "key": "brd_ser2_rtscts",
                    "label": "SERIAL2 RTS/CTS",
                    "type": "select",
                    "default": 2,
                    "tooltip": "Hardware flow control on TELEM2.",
                    "docs_param": "BRD_SER2_RTSCTS",
                    "options": [
                        {"value": 0, "label": "0 — Disabled"},
                        {"value": 1, "label": "1 — Enabled"},
                        {"value": 2, "label": "2 — Auto"},
                    ],
                },
            ]},

            # ── Power monitoring ───────────────────────────────────────────────
            {"label": "Power Monitoring", "fields": [
                {
                    "key": "brd_vbus_min",
                    "label": "Min VBUS voltage",
                    "type": "number", "min": 3.5, "max": 5.5, "default": 4.3, "unit": "V",
                    "tooltip": "Minimum USB/servo-rail voltage required to arm.",
                    "docs_param": "BRD_VBUS_MIN",
                },
                {
                    "key": "brd_pwm_volt_sel",
                    "label": "Servo voltage",
                    "type": "select",
                    "default": 0,
                    "tooltip": "Servo rail output voltage.",
                    "docs_param": "BRD_PWM_VOLT_SEL",
                    "options": [
                        {"value": 0, "label": "0 — Auto (3.3 V)"},
                        {"value": 1, "label": "1 — Force 5 V"},
                    ],
                },
            ]},

        ],
    },
]
