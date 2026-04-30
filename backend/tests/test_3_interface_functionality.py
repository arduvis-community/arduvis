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
test_3_interface_functionality.py
────────────────────────────────────────────────────────────────────────────────
Verifies that every API endpoint responds with a successful HTTP status code
and does not crash. This is a "lights on" test — we care that each route
is reachable and returns 2xx (or the documented 404 for missing resources).
"""

import sys
from pathlib import Path
_tests   = Path(__file__).parent
_backend = _tests.parent
for _p in (str(_backend), str(_tests)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import pytest
from shared import MINIMAL_EXPORT_PAYLOAD, FULL_EXPORT_PAYLOAD, MINIMAL_SAVE_PAYLOAD, COPTER_FRAME_COMPONENT


# ═══════════════════════════════════════════════════════════════════════════════
# Health
# ═══════════════════════════════════════════════════════════════════════════════

class TestHealth:
    def test_health_returns_200(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# Components
# ═══════════════════════════════════════════════════════════════════════════════

class TestComponentsEndpoints:

    def test_get_all_components_200(self, client):
        r = client.get("/api/components/")
        assert r.status_code == 200

    def test_get_categories_200(self, client):
        r = client.get("/api/components/categories")
        assert r.status_code == 200

    @pytest.mark.parametrize("vehicle", ["copter", "plane", "vtol"])
    def test_get_definitions_by_vehicle_200(self, client, vehicle):
        r = client.get(f"/api/components/definitions?vehicle={vehicle}")
        assert r.status_code == 200

    def test_get_definitions_no_vehicle_200(self, client):
        r = client.get("/api/components/definitions")
        assert r.status_code == 200

    @pytest.mark.parametrize("vehicle", ["copter", "plane", "vtol"])
    def test_get_vehicle_route_200(self, client, vehicle):
        r = client.get(f"/api/components/vehicle/{vehicle}")
        assert r.status_code == 200

    def test_get_component_by_id_200(self, client):
        r = client.get("/api/components/frame_copter")
        assert r.status_code == 200

    def test_get_component_unknown_id_404(self, client):
        r = client.get("/api/components/does_not_exist_xyz")
        assert r.status_code == 404

    def test_get_gps_component_200(self, client):
        r = client.get("/api/components/gps")
        assert r.status_code == 200

    def test_get_battery_monitor_component_200(self, client):
        r = client.get("/api/components/battery_monitor")
        assert r.status_code == 200

    def test_invalid_vehicle_type_422(self, client):
        r = client.get("/api/components/definitions?vehicle=helicopter")
        assert r.status_code == 422


# ═══════════════════════════════════════════════════════════════════════════════
# Frames
# ═══════════════════════════════════════════════════════════════════════════════

class TestFramesEndpoints:

    def test_copter_frames_200(self, client):
        r = client.get("/api/frames/copter")
        assert r.status_code == 200

    def test_copter_frame_classes_200(self, client):
        r = client.get("/api/frames/copter/classes")
        assert r.status_code == 200

    def test_plane_frames_200(self, client):
        r = client.get("/api/frames/plane")
        assert r.status_code == 200

    def test_vtol_frames_200(self, client):
        r = client.get("/api/frames/vtol")
        assert r.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════

class TestExportEndpoints:

    def test_export_param_200(self, client):
        r = client.post("/api/export/param", json=MINIMAL_EXPORT_PAYLOAD)
        assert r.status_code == 200

    def test_export_param_with_full_config_200(self, client):
        r = client.post("/api/export/param", json=FULL_EXPORT_PAYLOAD)
        assert r.status_code == 200

    def test_export_param_missing_vehicle_type_422(self, client):
        bad_payload = {k: v for k, v in MINIMAL_EXPORT_PAYLOAD.items()
                       if k != "vehicle_type"}
        r = client.post("/api/export/param", json=bad_payload)
        assert r.status_code == 422

    def test_import_param_200(self, client):
        r = client.post("/api/export/import/param",
                        json={"content": "FRAME_CLASS,1\nFRAME_TYPE,1\n"})
        assert r.status_code == 200

    def test_import_param_empty_content_200(self, client):
        r = client.post("/api/export/import/param", json={"content": ""})
        assert r.status_code == 200

    def test_import_param_only_comments_200(self, client):
        r = client.post("/api/export/import/param",
                        json={"content": "# just comments\n# nothing here\n"})
        assert r.status_code == 200

    def test_import_param_missing_content_field_422(self, client):
        r = client.post("/api/export/import/param", json={})
        assert r.status_code == 422

    def test_export_save_200(self, client, isolated_dirs):
        r = client.post("/api/export/save", json=MINIMAL_EXPORT_PAYLOAD)
        assert r.status_code == 200

    def test_export_param_with_baseline_passthrough_200(self, client):
        payload = {
            **MINIMAL_EXPORT_PAYLOAD,
            "baseline_params": {"SOME_CALIB_PARAM": 1.23, "ACCEL_BIAS": 0.001},
        }
        r = client.post("/api/export/param", json=payload)
        assert r.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# Project
# ═══════════════════════════════════════════════════════════════════════════════

class TestProjectEndpoints:

    def test_list_projects_200(self, client):
        r = client.get("/api/project/list")
        assert r.status_code == 200

    def test_load_nonexistent_project_404(self, client):
        r = client.get("/api/project/load/does_not_exist_xyzzy")
        assert r.status_code == 404

    def test_delete_nonexistent_project_404(self, client):
        r = client.delete("/api/project/delete/does_not_exist_xyzzy")
        assert r.status_code == 404

    def test_save_project_200(self, client, isolated_dirs):
        from shared import MINIMAL_SAVE_PAYLOAD
        payload = {**MINIMAL_SAVE_PAYLOAD, "basePath": str(isolated_dirs["projects"].parent)}
        r = client.post("/api/project/save", json=payload)
        assert r.status_code == 200

    def test_save_invalid_name_400(self, client, isolated_dirs):
        from shared import MINIMAL_SAVE_PAYLOAD
        payload = {**MINIMAL_SAVE_PAYLOAD, "name": "", "basePath": str(isolated_dirs["projects"].parent)}
        r = client.post("/api/project/save", json=payload)
        assert r.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════════
# Validate
# ═══════════════════════════════════════════════════════════════════════════════

class TestValidateEndpoint:

    def test_validate_empty_components_200(self, client):
        r = client.post("/api/validate", json={
            "components": [], "vehicle_type": "copter", "frame_info": None
        })
        assert r.status_code == 200

    def test_validate_with_components_200(self, client):
        from shared import COPTER_FRAME_COMPONENT
        r = client.post("/api/validate", json={
            "components": [COPTER_FRAME_COMPONENT],
            "vehicle_type": "copter",
            "frame_info": None,
        })
        assert r.status_code == 200


# ═══════════════════════════════════════════════════════════════════════════════
# MAVLink (stub)
# ═══════════════════════════════════════════════════════════════════════════════

class TestMavlinkEndpoints:

    def test_mavlink_status_200(self, client):
        r = client.get("/api/mavlink/status")
        assert r.status_code == 200

    def test_mavlink_connect_200(self, client):
        r = client.post("/api/mavlink/connect",
                        json={"connection_string": "tcp:127.0.0.1:5760"})
        assert r.status_code == 200

    def test_mavlink_disconnect_200(self, client):
        r = client.post("/api/mavlink/disconnect")
        assert r.status_code == 200
