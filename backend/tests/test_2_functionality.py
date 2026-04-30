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
test_2_functionality.py
────────────────────────────────────────────────────────────────────────────────
Tests for core data-layer logic:
  • parse_param_file  — parses raw .param text
  • build_param_list  — translates component instances → ArduPilot params
  • build_components_from_params — reverse-maps params → component instances
  • _fmt precision helper
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from data.param_mappings import (
    build_param_list,
    parse_param_file,
    build_components_from_params,
)
from routers.export import _fmt


# ── Helpers ───────────────────────────────────────────────────────────────────

def flat_params(components, vehicle_type="copter") -> dict[str, float | int]:
    """Run build_param_list and return a flat {NAME: value} dict."""
    result = build_param_list(components, vehicle_type)
    return {e["param"]: e["value"] for e in result["flat"]}


# ═══════════════════════════════════════════════════════════════════════════════
# Section A: parse_param_file
# ═══════════════════════════════════════════════════════════════════════════════

class TestParseParamFile:

    def test_comma_separated(self):
        text = "FRAME_CLASS,1\nFRAME_TYPE,1\n"
        params = parse_param_file(text)
        assert params["FRAME_CLASS"] == 1.0
        assert params["FRAME_TYPE"]  == 1.0

    def test_tab_separated(self):
        text = "FRAME_CLASS\t1\nFRAME_TYPE\t1\n"
        params = parse_param_file(text)
        assert params["FRAME_CLASS"] == 1.0

    def test_comment_lines_ignored(self):
        text = "# This is a comment\nFRAME_CLASS,1\n# Another\nFRAME_TYPE,1\n"
        params = parse_param_file(text)
        assert len(params) == 2

    def test_blank_lines_ignored(self):
        text = "\n\nFRAME_CLASS,1\n\n\nFRAME_TYPE,1\n\n"
        params = parse_param_file(text)
        assert len(params) == 2

    def test_header_block_ignored(self):
        text = (
            "# ArduPilot Visual Configurator — Parameter Export\n"
            "# Copyright (C) 2026 Patternlynx Limited.\n"
            "# Generated : 2026-01-01\n"
            "\n"
            "FRAME_CLASS,1\n"
        )
        params = parse_param_file(text)
        assert "FRAME_CLASS" in params

    def test_float_value(self):
        params = parse_param_file("MOT_SPIN_ARM,0.1\n")
        assert abs(params["MOT_SPIN_ARM"] - 0.1) < 1e-9

    def test_high_precision_float(self):
        params = parse_param_file("MOT_SPIN_ARM,0.100000000000\n")
        assert abs(params["MOT_SPIN_ARM"] - 0.1) < 1e-9

    def test_uppercase_normalisation(self):
        # param names should be uppercased by the parser
        params = parse_param_file("frame_class,1\n")
        assert "FRAME_CLASS" in params

    def test_invalid_value_skipped(self):
        text = "FRAME_CLASS,1\nBAD_PARAM,not_a_number\nFRAME_TYPE,1\n"
        params = parse_param_file(text)
        assert "BAD_PARAM" not in params
        assert "FRAME_CLASS" in params

    def test_empty_file(self):
        assert parse_param_file("") == {}

    def test_only_comments(self):
        assert parse_param_file("# just\n# comments\n") == {}

    def test_mixed_separator_file(self):
        text = "FRAME_CLASS,1\nFRAME_TYPE\t1\nMOT_SPIN_ARM,0.1\n"
        params = parse_param_file(text)
        assert len(params) == 3


# ═══════════════════════════════════════════════════════════════════════════════
# Section B: build_param_list — forward mapping
# ═══════════════════════════════════════════════════════════════════════════════

class TestBuildParamList:

    # ── Return structure ──────────────────────────────────────────────────────

    def test_returns_grouped_and_flat(self):
        result = build_param_list([], "copter")
        assert "grouped" in result
        assert "flat" in result
        assert isinstance(result["grouped"], dict)
        assert isinstance(result["flat"], list)

    def test_empty_components_returns_empty(self):
        result = build_param_list([], "copter")
        assert result["flat"] == []

    def test_flat_entries_have_param_value_group(self):
        comp = {
            "defId": "frame_copter",
            "fields": {"frame_class": 1, "frame_type": 1},
        }
        result = build_param_list([comp], "copter")
        for entry in result["flat"]:
            assert "param" in entry
            assert "value" in entry
            assert "group" in entry

    # ── Frame copter mappings ─────────────────────────────────────────────────

    def test_frame_copter_frame_class(self):
        params = flat_params([
            {"defId": "frame_copter", "fields": {"frame_class": 2, "frame_type": 1}}
        ])
        assert params.get("FRAME_CLASS") == 2

    def test_frame_copter_frame_type(self):
        params = flat_params([
            {"defId": "frame_copter", "fields": {"frame_class": 1, "frame_type": 0}}
        ])
        assert params.get("FRAME_TYPE") == 0

    def test_frame_copter_motor_params(self):
        fields = {
            "frame_class": 1, "frame_type": 1,
            "mot_spin_arm": 0.1, "mot_spin_min": 0.15,
            "mot_spin_max": 0.95, "mot_thst_expo": 0.65,
        }
        params = flat_params([{"defId": "frame_copter", "fields": fields}])
        assert abs(params["MOT_SPIN_ARM"]  - 0.1)  < 1e-9
        assert abs(params["MOT_SPIN_MIN"]  - 0.15) < 1e-9
        assert abs(params["MOT_SPIN_MAX"]  - 0.95) < 1e-9
        assert abs(params["MOT_THST_EXPO"] - 0.65) < 1e-9

    def test_frame_copter_missing_field_not_emitted(self):
        params = flat_params([
            {"defId": "frame_copter", "fields": {"frame_class": 1}}
        ])
        # frame_type not in fields → should NOT appear
        assert "FRAME_TYPE" not in params

    # ── Frame plane mappings ──────────────────────────────────────────────────

    def test_frame_plane_airspeed_params(self):
        fields = {
            "airspeed_min": 12, "airspeed_max": 30,
            "airspeed_cruise": 15, "thr_cruise": 50,
        }
        params = flat_params([{"defId": "frame_plane", "fields": fields}], "plane")
        assert params.get("ARSPD_FBW_MIN") == 12
        assert params.get("ARSPD_FBW_MAX") == 30
        assert params.get("TRIM_THROTTLE") == 50
        # cruise speed converted to cm/s
        assert params.get("TRIM_ARSPD_CM") == 1500

    # ── GPS mappings ──────────────────────────────────────────────────────────

    def test_gps_instance1_type(self):
        comp = {
            "defId": "gps",
            "fields": {"gps_type": 1, "instance": 1, "serial_port": "SERIAL3"},
        }
        params = flat_params([comp])
        assert params.get("GPS_TYPE") == 1

    def test_gps_instance2_type(self):
        comp = {
            "defId": "gps",
            "fields": {"gps_type": 2, "instance": 2, "serial_port": "SERIAL4"},
        }
        params = flat_params([comp])
        # Instance 2 uses GPS_TYPE2 (suffix appended, not prefixed)
        assert params.get("GPS_TYPE2") == 2

    # ── Battery mappings ──────────────────────────────────────────────────────

    def test_battery_monitor_instance1(self):
        comp = {
            "defId": "battery_monitor",
            "fields": {
                "instance": 1, "batt_monitor": 4,   # field key = batt_monitor
                "volt_mult": 10.1, "amp_pervlt": 17.0,
                "volt_pin": 14, "curr_pin": 15, "batt_capacity": 5000,
            },
        }
        params = flat_params([comp])
        assert params.get("BATT_MONITOR") == 4
        assert abs(params.get("BATT_VOLT_MULT") - 10.1) < 1e-9
        assert params.get("BATT_CAPACITY") == 5000

    def test_battery_monitor_instance2(self):
        comp = {
            "defId": "battery_monitor",
            "fields": {
                "instance": 2, "batt_monitor": 4,
                "volt_mult": 10.1, "amp_pervlt": 17.0,
                "volt_pin": 14, "curr_pin": 15, "batt_capacity": 3000,
            },
        }
        params = flat_params([comp])
        assert params.get("BATT2_MONITOR") == 4
        assert params.get("BATT2_CAPACITY") == 3000

    # ── VTOL mappings ─────────────────────────────────────────────────────────

    def test_frame_vtol_q_enable(self):
        comp = {
            "defId": "frame_vtol",
            "fields": {"q_enable": True, "q_frame_class": 1, "q_frame_type": 1},
        }
        params = flat_params([comp], "vtol")
        assert params.get("Q_ENABLE") == 1
        assert params.get("Q_FRAME_CLASS") == 1

    # ── Board orientation ─────────────────────────────────────────────────────

    def test_board_orientation(self):
        comp = {
            "defId": "board_orientation",
            "fields": {"ahrs_orientation": 2},
        }
        params = flat_params([comp])
        assert params.get("AHRS_ORIENTATION") == 2

    # ── Grouped structure ─────────────────────────────────────────────────────

    def test_grouped_keys_match_flat_groups(self):
        comp = {
            "defId": "frame_copter",
            "fields": {"frame_class": 1, "frame_type": 1, "mot_spin_arm": 0.1},
        }
        result = build_param_list([comp], "copter")
        grouped_names = set()
        for entries in result["grouped"].values():
            grouped_names.update(e["param"] for e in entries)
        flat_names = {e["param"] for e in result["flat"]}
        assert grouped_names == flat_names


# ═══════════════════════════════════════════════════════════════════════════════
# Section C: build_components_from_params — reverse mapping
# ═══════════════════════════════════════════════════════════════════════════════

class TestBuildComponentsFromParams:

    def test_infers_copter_from_frame_class(self):
        params = {"FRAME_CLASS": 1.0, "FRAME_TYPE": 1.0}
        result = build_components_from_params(params)
        assert result["vehicle_type"] == "copter"

    def test_infers_plane_from_tecs_param(self):
        params = {"TECS_CRUISE_SPEED": 15.0, "ARSPD_FBW_MIN": 12.0}
        result = build_components_from_params(params)
        assert result["vehicle_type"] == "plane"

    def test_infers_vtol_from_q_enable(self):
        params = {"Q_ENABLE": 1.0, "Q_FRAME_CLASS": 1.0}
        result = build_components_from_params(params)
        assert result["vehicle_type"] == "vtol"

    def test_returns_components_list(self):
        params = {"FRAME_CLASS": 1.0, "FRAME_TYPE": 1.0}
        result = build_components_from_params(params)
        assert isinstance(result["components"], list)

    def test_copter_produces_frame_copter_component(self):
        params = {"FRAME_CLASS": 1.0, "FRAME_TYPE": 1.0}
        result = build_components_from_params(params)
        def_ids = [c["defId"] for c in result["components"]]
        assert "frame_copter" in def_ids

    def test_frame_copter_fields_populated(self):
        params = {"FRAME_CLASS": 2.0, "FRAME_TYPE": 0.0, "MOT_SPIN_ARM": 0.1}
        result = build_components_from_params(params)
        fc = next(c for c in result["components"] if c["defId"] == "frame_copter")
        assert fc["fields"]["frame_class"] == 2
        assert fc["fields"]["frame_type"] == 0
        assert abs(fc["fields"]["mot_spin_arm"] - 0.1) < 1e-9

    def test_gps_component_recovered(self):
        params = {"FRAME_CLASS": 1.0, "GPS_TYPE": 1.0}
        result = build_components_from_params(params)
        def_ids = [c["defId"] for c in result["components"]]
        assert "gps" in def_ids

    def test_component_instances_have_required_shape(self):
        """Every returned component instance must have defId, label, fields."""
        params = {"FRAME_CLASS": 1.0, "FRAME_TYPE": 1.0, "GPS_TYPE": 1.0}
        result = build_components_from_params(params)
        for comp in result["components"]:
            assert "defId"  in comp
            assert "label"  in comp
            assert "fields" in comp
            assert isinstance(comp["fields"], dict)

    def test_empty_params_returns_components_list(self):
        result = build_components_from_params({})
        assert "components" in result
        assert isinstance(result["components"], list)


# ═══════════════════════════════════════════════════════════════════════════════
# Section D: Round-trip — export then import
# ═══════════════════════════════════════════════════════════════════════════════

class TestRoundTrip:

    def test_copter_frame_round_trip(self):
        """
        forward:   frame_copter fields  →  FRAME_CLASS, FRAME_TYPE
        parse:     raw text  →  params dict
        reverse:   params dict  →  frame_copter component
        """
        original_fields = {"frame_class": 2, "frame_type": 0, "mot_spin_arm": 0.12}
        comp = {"defId": "frame_copter", "fields": original_fields}

        # Forward
        result = build_param_list([comp], "copter")
        lines = [f"{e['param']},{_fmt(e['value'])}" for e in result["flat"]]
        param_text = "\n".join(lines)

        # Parse
        params = parse_param_file(param_text)
        assert "FRAME_CLASS" in params
        assert params["FRAME_CLASS"] == 2.0

        # Reverse
        rebuilt = build_components_from_params(params)
        assert rebuilt["vehicle_type"] == "copter"
        fc = next(c for c in rebuilt["components"] if c["defId"] == "frame_copter")
        assert fc["fields"]["frame_class"] == 2
        assert fc["fields"]["frame_type"] == 0
        assert abs(fc["fields"]["mot_spin_arm"] - 0.12) < 1e-6

    def test_battery_round_trip(self):
        comp = {
            "defId": "battery_monitor",
            "fields": {
                "instance": 1, "batt_monitor": 4,
                "volt_mult": 10.1, "amp_pervlt": 17.0,
                "volt_pin": 14, "curr_pin": 15, "batt_capacity": 5000,
            },
        }
        result = build_param_list([comp], "copter")
        lines = [f"{e['param']},{_fmt(e['value'])}" for e in result["flat"]]
        params = parse_param_file("\n".join(lines))

        assert "BATT_MONITOR" in params
        assert params["BATT_MONITOR"] == 4.0
        assert params["BATT_CAPACITY"] == 5000.0


# ═══════════════════════════════════════════════════════════════════════════════
# Section E: _fmt precision helper
# ═══════════════════════════════════════════════════════════════════════════════

class TestFmtHelper:

    def test_integer_value_no_decimal(self):
        assert _fmt(1) == "1"

    def test_round_float_no_trailing_zeros(self):
        assert _fmt(1.0) == "1"

    def test_clean_decimal(self):
        result = _fmt(0.1)
        assert "0.1" in result
        assert not result.endswith("0")

    def test_no_scientific_notation(self):
        result = _fmt(0.000123456789012)
        assert "e" not in result.lower()

    def test_full_precision_preserved(self):
        # 12 decimal places for values that need it
        result = _fmt(0.123456789012)
        assert len(result.split(".")[-1]) <= 12

    def test_string_value_returned_as_is(self):
        assert _fmt("SERIAL3") == "SERIAL3"
