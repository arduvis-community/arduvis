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
shared.py — reusable test payload data for the AVC test suite.
Import these in any test module directly.
"""

COPTER_FRAME_COMPONENT = {
    "defId": "frame_copter",
    "label": "Frame",
    "icon": "🚁",
    "virtual": True,
    "x": 20, "y": 20,
    "fields": {
        "frame_class":    1,
        "frame_type":     1,
        "mot_spin_arm":   0.1,
        "mot_spin_min":   0.15,
        "mot_spin_max":   0.95,
        "mot_thst_expo":  0.65,
        "mot_thst_hover": 0.35,
    },
}

GPS_COMPONENT = {
    "defId": "gps",
    "label": "GPS / Compass",
    "icon": "📡",
    "virtual": False,
    "x": 100, "y": 100,
    "fields": {
        "gps_type":    1,
        "instance":    1,
        "serial_port": "SERIAL3",
    },
}

BATTERY_COMPONENT = {
    "defId": "battery_monitor",
    "label": "Battery Monitor",
    "icon": "🔋",
    "virtual": True,
    "x": 20, "y": 100,
    "fields": {
        "instance":      1,
        "batt_monitor":  4,       # field key matches component_defs / param_mappings
        "preset":        "cube_brick",
        "volt_mult":     10.1,
        "amp_pervlt":    17.0,
        "volt_pin":      14,
        "curr_pin":      15,
        "batt_capacity": 5000,    # field key matches param_mappings
    },
}

MINIMAL_EXPORT_PAYLOAD = {
    "components":    [COPTER_FRAME_COMPONENT],
    "vehicle_type":  "copter",
    "vehicle_label": "Test Quad",
    "frame_info":    None,
    "baseline_params": None,
}

FULL_EXPORT_PAYLOAD = {
    "components":    [COPTER_FRAME_COMPONENT, GPS_COMPONENT, BATTERY_COMPONENT],
    "vehicle_type":  "copter",
    "vehicle_label": "Full Test Quad",
    "frame_info":    None,
    "baseline_params": None,
}

MINIMAL_SAVE_PAYLOAD = {
    "name":          "test_project",
    "vehicleType":   "copter",
    "vehicleLabel":  "Test Quad",
    "frameInfo":     None,
    "components":    [COPTER_FRAME_COMPONENT],
    "canvas":        {"zoom": 1.0, "panX": 0, "panY": 0, "activeView": "top"},
    "airframeTop":   None,
    "airframeBottom": None,
    "basePath":      None,
}
