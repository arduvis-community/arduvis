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
test_4_interface_accuracy.py
────────────────────────────────────────────────────────────────────────────────
Verifies that API responses contain the correct data — right shapes, right
values, right content — not just a 200 status code.
"""

import sys
from pathlib import Path
_tests   = Path(__file__).parent
_backend = _tests.parent
for _p in (str(_backend), str(_tests)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import pytest
from shared import MINIMAL_EXPORT_PAYLOAD, FULL_EXPORT_PAYLOAD, COPTER_FRAME_COMPONENT
from data.component_defs import CATEGORIES, COMPONENT_DEFS


# ═══════════════════════════════════════════════════════════════════════════════
# Health response
# ═══════════════════════════════════════════════════════════════════════════════

class TestHealthAccuracy:

    def test_health_has_status_ok(self, client):
        data = client.get("/api/health").json()
        assert data["status"] == "ok"

    def test_health_has_version(self, client):
        data = client.get("/api/health").json()
        assert "version" in data
        assert isinstance(data["version"], str)


# ═══════════════════════════════════════════════════════════════════════════════
# Component definitions response
# ═══════════════════════════════════════════════════════════════════════════════

class TestComponentsAccuracy:

    def test_all_components_response_is_list(self, client):
        data = client.get("/api/components/").json()
        assert isinstance(data, list)

    def test_all_components_count_matches_defs(self, client):
        data = client.get("/api/components/").json()
        assert len(data) == len(COMPONENT_DEFS)

    def test_categories_response_matches_expected(self, client):
        data = client.get("/api/components/categories").json()
        assert data == CATEGORIES

    @pytest.mark.parametrize("vehicle", ["copter", "plane", "vtol"])
    def test_vehicle_filter_returns_only_matching_vehicles(self, client, vehicle):
        data = client.get(f"/api/components/definitions?vehicle={vehicle}").json()
        assert isinstance(data, list)
        assert len(data) > 0
        for comp in data:
            assert vehicle in comp["vehicles"], (
                f"Component '{comp['id']}' returned for '{vehicle}' but vehicles={comp['vehicles']}"
            )

    def test_copter_filter_includes_frame_copter(self, client):
        data = client.get("/api/components/definitions?vehicle=copter").json()
        ids = [d["id"] for d in data]
        assert "frame_copter" in ids

    def test_plane_filter_excludes_frame_copter(self, client):
        data = client.get("/api/components/definitions?vehicle=plane").json()
        ids = [d["id"] for d in data]
        assert "frame_copter" not in ids

    def test_get_single_component_frame_copter(self, client):
        data = client.get("/api/components/frame_copter").json()
        assert data["id"] == "frame_copter"
        assert data["label"] == "Frame (Copter)"
        assert "inspector" in data
        assert isinstance(data["inspector"], list)

    def test_get_single_component_gps(self, client):
        data = client.get("/api/components/gps").json()
        assert data["id"] == "gps"
        assert "inspector" in data

    def test_single_component_has_all_required_fields(self, client):
        data = client.get("/api/components/frame_copter").json()
        for key in ("id", "label", "category", "icon", "vehicles", "virtual", "multi", "inspector"):
            assert key in data, f"Response for frame_copter missing '{key}'"

    def test_404_response_has_error_key(self, client):
        data = client.get("/api/components/no_such_id").json()
        assert "error" in data


# ═══════════════════════════════════════════════════════════════════════════════
# Export /param response content
# ═══════════════════════════════════════════════════════════════════════════════

class TestExportParamAccuracy:

    def test_response_is_plain_text(self, client):
        r = client.post("/api/export/param", json=MINIMAL_EXPORT_PAYLOAD)
        assert "text/plain" in r.headers["content-type"]

    def test_param_file_has_avc_header(self, client):
        text = client.post("/api/export/param", json=MINIMAL_EXPORT_PAYLOAD).text
        assert "# ArduPilot Visual Configurator" in text

    def test_param_file_has_copyright_line(self, client):
        text = client.post("/api/export/param", json=MINIMAL_EXPORT_PAYLOAD).text
        assert "Patternlynx" in text

    def test_param_file_has_cubepilot_fc_line(self, client):
        text = client.post("/api/export/param", json=MINIMAL_EXPORT_PAYLOAD).text
        assert "CubePilot" in text

    def test_param_file_has_vehicle_label(self, client):
        text = client.post("/api/export/param", json=MINIMAL_EXPORT_PAYLOAD).text
        assert "Test Quad" in text

    def test_param_file_has_vehicle_type(self, client):
        text = client.post("/api/export/param", json=MINIMAL_EXPORT_PAYLOAD).text
        assert "copter" in text

    def test_param_file_contains_frame_class(self, client):
        text = client.post("/api/export/param", json=MINIMAL_EXPORT_PAYLOAD).text
        assert "FRAME_CLASS" in text

    def test_param_file_contains_frame_type(self, client):
        text = client.post("/api/export/param", json=MINIMAL_EXPORT_PAYLOAD).text
        assert "FRAME_TYPE" in text

    def test_param_file_contains_mot_spin_arm(self, client):
        text = client.post("/api/export/param", json=MINIMAL_EXPORT_PAYLOAD).text
        assert "MOT_SPIN_ARM" in text

    def test_param_file_parseable_by_parser(self, client):
        from data.param_mappings import parse_param_file
        text = client.post("/api/export/param", json=FULL_EXPORT_PAYLOAD).text
        params = parse_param_file(text)
        assert len(params) > 0
        assert "FRAME_CLASS" in params

    def test_param_values_no_scientific_notation(self, client):
        text = client.post("/api/export/param", json=FULL_EXPORT_PAYLOAD).text
        for line in text.splitlines():
            if line.startswith("#") or not line.strip():
                continue
            parts = line.split(",")
            if len(parts) == 2:
                assert "e" not in parts[1].lower(), (
                    f"Scientific notation found in param line: {line}"
                )

    def test_baseline_params_in_passthrough_section(self, client):
        payload = {
            **MINIMAL_EXPORT_PAYLOAD,
            "baseline_params": {"CALIB_GYRO_X": 0.001, "ACCEL_CLIPPING": 0},
        }
        text = client.post("/api/export/param", json=payload).text
        assert "Passthrough" in text
        assert "CALIB_GYRO_X" in text

    def test_baseline_params_overridden_by_component(self, client):
        """If baseline has FRAME_CLASS and component also sets FRAME_CLASS,
        the component value should appear; it must NOT appear in passthrough."""
        payload = {
            **MINIMAL_EXPORT_PAYLOAD,
            "baseline_params": {"FRAME_CLASS": 99},  # will be overridden
        }
        text = client.post("/api/export/param", json=payload).text
        # FRAME_CLASS should appear only once (from component, not passthrough)
        lines = [l for l in text.splitlines() if l.startswith("FRAME_CLASS")]
        assert len(lines) == 1
        assert ",1" in lines[0]  # component value, not baseline 99

    def test_param_count_in_header(self, client):
        text = client.post("/api/export/param", json=MINIMAL_EXPORT_PAYLOAD).text
        count_line = next(l for l in text.splitlines() if "Parameters" in l)
        # Extract number after ":"
        count = int(count_line.split(":")[-1].strip())
        # Count actual data lines
        data_lines = [l for l in text.splitlines()
                      if l.strip() and not l.startswith("#") and "," in l]
        assert count == len(data_lines)


# ═══════════════════════════════════════════════════════════════════════════════
# Export /import response
# ═══════════════════════════════════════════════════════════════════════════════

class TestImportAccuracy:

    def test_import_response_has_required_keys(self, client):
        r = client.post("/api/export/import/param",
                        json={"content": "FRAME_CLASS,1\nFRAME_TYPE,1\n"})
        data = r.json()
        for key in ("params", "count", "vehicle_type", "components"):
            assert key in data, f"Import response missing '{key}'"

    def test_import_count_matches_params(self, client):
        content = "FRAME_CLASS,1\nFRAME_TYPE,1\nMOT_SPIN_ARM,0.1\n"
        data = client.post("/api/export/import/param",
                           json={"content": content}).json()
        assert data["count"] == len(data["params"])
        assert data["count"] == 3

    def test_import_vehicle_type_copter(self, client):
        content = "FRAME_CLASS,1\nFRAME_TYPE,1\n"
        data = client.post("/api/export/import/param",
                           json={"content": content}).json()
        assert data["vehicle_type"] == "copter"

    def test_import_vehicle_type_plane(self, client):
        content = "TECS_CRUISE_SPEED,15\nARSPD_FBW_MIN,12\n"
        data = client.post("/api/export/import/param",
                           json={"content": content}).json()
        assert data["vehicle_type"] == "plane"

    def test_import_vehicle_type_vtol(self, client):
        content = "Q_ENABLE,1\nQ_FRAME_CLASS,1\n"
        data = client.post("/api/export/import/param",
                           json={"content": content}).json()
        assert data["vehicle_type"] == "vtol"

    def test_import_components_is_list(self, client):
        data = client.post("/api/export/import/param",
                           json={"content": "FRAME_CLASS,1\n"}).json()
        assert isinstance(data["components"], list)

    def test_import_components_have_def_ids(self, client):
        content = "FRAME_CLASS,1\nFRAME_TYPE,1\n"
        data = client.post("/api/export/import/param",
                           json={"content": content}).json()
        for comp in data["components"]:
            assert "defId"  in comp
            assert "fields" in comp

    def test_import_params_dict_is_float_values(self, client):
        data = client.post("/api/export/import/param",
                           json={"content": "FRAME_CLASS,1\nMOT_SPIN_ARM,0.1\n"}).json()
        for k, v in data["params"].items():
            assert isinstance(v, (int, float)), (
                f"Param '{k}' has non-numeric value: {v!r}"
            )

    def test_import_empty_gives_empty_params(self, client):
        data = client.post("/api/export/import/param",
                           json={"content": ""}).json()
        assert data["count"] == 0
        assert data["params"] == {}


# ═══════════════════════════════════════════════════════════════════════════════
# Validate response structure
# ═══════════════════════════════════════════════════════════════════════════════

class TestValidateAccuracy:

    def test_validate_response_has_valid_errors_warnings(self, client):
        r = client.post("/api/validate", json={
            "components": [], "vehicle_type": "copter", "frame_info": None
        })
        data = r.json()
        assert "valid"    in data
        assert "errors"   in data
        assert "warnings" in data

    def test_validate_empty_is_valid(self, client):
        data = client.post("/api/validate", json={
            "components": [], "vehicle_type": "copter", "frame_info": None
        }).json()
        assert data["valid"] is True
        assert data["errors"] == []

    def test_validate_valid_is_bool(self, client):
        data = client.post("/api/validate", json={
            "components": [], "vehicle_type": "copter", "frame_info": None
        }).json()
        assert isinstance(data["valid"], bool)

    def test_validate_errors_is_list(self, client):
        data = client.post("/api/validate", json={
            "components": [], "vehicle_type": "copter", "frame_info": None
        }).json()
        assert isinstance(data["errors"],   list)
        assert isinstance(data["warnings"], list)


# ═══════════════════════════════════════════════════════════════════════════════
# MAVLink stub accuracy
# ═══════════════════════════════════════════════════════════════════════════════

class TestMavlinkAccuracy:

    def test_connect_returns_connected_false(self, client):
        data = client.post("/api/mavlink/connect",
                           json={"connection_string": "tcp:127.0.0.1:5760"}).json()
        assert data.get("connected") is False

    def test_status_has_connected_key(self, client):
        data = client.get("/api/mavlink/status").json()
        assert "connected" in data
