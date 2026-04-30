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
test_5_save_open_import.py
────────────────────────────────────────────────────────────────────────────────
End-to-end tests for the file I/O workflows:
  • Project save / load / list / delete lifecycle
  • .param file export and disk save
  • .param file import (round-trip accuracy)
  • SVG airframe image round-trip (standard views)
  • PNG airframe image round-trip (user-uploaded)
"""

import sys
import json
import base64
from pathlib import Path
_tests   = Path(__file__).parent
_backend = _tests.parent
for _p in (str(_backend), str(_tests)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import pytest
from shared import (
    MINIMAL_SAVE_PAYLOAD,
    MINIMAL_EXPORT_PAYLOAD,
    FULL_EXPORT_PAYLOAD,
    COPTER_FRAME_COMPONENT,
)

# ── Minimal fake images ────────────────────────────────────────────────────────
# 1×1 red PNG, base64-encoded
_PNG_1X1 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8"
    "z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg=="
)
PNG_DATA_URL = f"data:image/png;base64,{_PNG_1X1}"

SVG_DATA_URL = (
    "data:image/svg+xml;charset=utf-8,"
    "%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20"
    "width%3D%22100%22%20height%3D%22100%22%3E%3Ccircle%20cx%3D%2250%22"
    "%20cy%3D%2250%22%20r%3D%2240%22%2F%3E%3C%2Fsvg%3E"
)


# ═══════════════════════════════════════════════════════════════════════════════
# Section A: Project save
# ═══════════════════════════════════════════════════════════════════════════════

class TestProjectSave:

    def _payload(self, isolated_dirs, name="test_save", **overrides):
        base = {
            **MINIMAL_SAVE_PAYLOAD,
            "name": name,
            "basePath": str(isolated_dirs["projects"].parent),
        }
        base.update(overrides)
        return base

    def test_save_returns_saved_path(self, client, isolated_dirs):
        r = client.post("/api/project/save", json=self._payload(isolated_dirs))
        data = r.json()
        assert "saved" in data
        assert "test_save" in data["saved"]

    def test_save_returns_file_listing(self, client, isolated_dirs):
        r = client.post("/api/project/save", json=self._payload(isolated_dirs))
        data = r.json()
        assert "files" in data
        assert "layout" in data["files"]
        assert "param"  in data["files"]

    def test_save_creates_layout_json(self, client, isolated_dirs):
        r = client.post("/api/project/save", json=self._payload(isolated_dirs))
        saved_path = Path(r.json()["saved"])
        layout_file = saved_path / "layout.json"
        assert layout_file.exists()

    def test_save_creates_param_file(self, client, isolated_dirs):
        r = client.post("/api/project/save", json=self._payload(isolated_dirs))
        saved_path = Path(r.json()["saved"])
        param_files = list(saved_path.glob("*.param"))
        assert len(param_files) == 1

    def test_save_layout_json_is_valid_json(self, client, isolated_dirs):
        r = client.post("/api/project/save", json=self._payload(isolated_dirs))
        saved_path = Path(r.json()["saved"])
        layout = json.loads((saved_path / "layout.json").read_text())
        assert "vehicleType" in layout
        assert "components"  in layout

    def test_save_sanitises_project_name_spaces(self, client, isolated_dirs):
        r = client.post("/api/project/save",
                        json=self._payload(isolated_dirs, name="My Quad Project"))
        assert r.status_code == 200
        saved_path = Path(r.json()["saved"])
        # spaces should be replaced with underscores in folder name
        assert " " not in saved_path.name

    def test_save_with_png_airframe_creates_image_file(self, client, isolated_dirs):
        r = client.post("/api/project/save",
                        json=self._payload(isolated_dirs, name="quad_png",
                                           airframeTop=PNG_DATA_URL))
        assert r.status_code == 200
        data = r.json()
        assert data["files"]["airframeTop"] is not None
        assert data["files"]["airframeTop"].endswith(".png")
        img_file = Path(data["saved"]) / data["files"]["airframeTop"]
        assert img_file.exists()
        assert img_file.stat().st_size > 0

    def test_save_with_svg_airframe_creates_image_file(self, client, isolated_dirs):
        r = client.post("/api/project/save",
                        json=self._payload(isolated_dirs, name="quad_svg",
                                           airframeTop=SVG_DATA_URL))
        assert r.status_code == 200
        data = r.json()
        assert data["files"]["airframeTop"] is not None
        assert data["files"]["airframeTop"].endswith(".svg")

    def test_save_no_airframe_leaves_image_fields_null(self, client, isolated_dirs):
        r = client.post("/api/project/save", json=self._payload(isolated_dirs))
        data = r.json()
        assert data["files"]["airframeTop"]    is None
        assert data["files"]["airframeBottom"] is None

    def test_save_empty_name_returns_400(self, client, isolated_dirs):
        r = client.post("/api/project/save",
                        json=self._payload(isolated_dirs, name=""))
        assert r.status_code == 400


# ═══════════════════════════════════════════════════════════════════════════════
# Section B: Project load
# ═══════════════════════════════════════════════════════════════════════════════

class TestProjectLoad:

    def _save_and_get_name(self, client, isolated_dirs, name="loadme", **overrides):
        import routers.project as proj_router
        payload = {
            **MINIMAL_SAVE_PAYLOAD,
            "name": name,
            "basePath": None,
            **overrides,
        }
        # Monkeypatch already set by isolated_dirs; use PROJECTS_DIR directly
        r = client.post("/api/project/save", json=payload)
        assert r.status_code == 200
        return name

    def test_load_nonexistent_404(self, client):
        r = client.get("/api/project/load/this_project_does_not_exist_xyz")
        assert r.status_code == 404

    def test_load_returns_vehicle_type(self, client, isolated_dirs):
        name = self._save_and_get_name(client, isolated_dirs, name="load_vt")
        r = client.get(f"/api/project/load/{name}")
        data = r.json()
        assert data["vehicleType"] == "copter"

    def test_load_returns_vehicle_label(self, client, isolated_dirs):
        name = self._save_and_get_name(client, isolated_dirs, name="load_vl")
        r = client.get(f"/api/project/load/{name}")
        data = r.json()
        assert data["vehicleLabel"] == "Test Quad"

    def test_load_returns_components(self, client, isolated_dirs):
        name = self._save_and_get_name(client, isolated_dirs, name="load_comp")
        r = client.get(f"/api/project/load/{name}")
        data = r.json()
        assert "components" in data
        assert isinstance(data["components"], list)
        assert len(data["components"]) == 1

    def test_load_returns_canvas(self, client, isolated_dirs):
        name = self._save_and_get_name(client, isolated_dirs, name="load_canvas")
        r = client.get(f"/api/project/load/{name}")
        data = r.json()
        assert "canvas" in data

    def test_load_airframe_top_is_null_when_not_saved(self, client, isolated_dirs):
        name = self._save_and_get_name(client, isolated_dirs, name="load_noimg")
        r = client.get(f"/api/project/load/{name}")
        data = r.json()
        assert data.get("airframeTop") is None

    def test_load_airframe_top_is_data_url_when_saved(self, client, isolated_dirs):
        name = self._save_and_get_name(client, isolated_dirs, name="load_img",
                                       airframeTop=PNG_DATA_URL)
        r = client.get(f"/api/project/load/{name}")
        data = r.json()
        assert data.get("airframeTop") is not None
        assert data["airframeTop"].startswith("data:image/")

    def test_load_svg_round_trips_as_data_url(self, client, isolated_dirs):
        name = self._save_and_get_name(client, isolated_dirs, name="load_svg",
                                       airframeTop=SVG_DATA_URL)
        r = client.get(f"/api/project/load/{name}")
        data = r.json()
        assert data["airframeTop"] is not None
        assert "svg" in data["airframeTop"]

    def test_load_components_data_matches_saved(self, client, isolated_dirs):
        name = self._save_and_get_name(client, isolated_dirs, name="load_fidelity")
        r = client.get(f"/api/project/load/{name}")
        comps = r.json()["components"]
        assert comps[0]["defId"] == "frame_copter"


# ═══════════════════════════════════════════════════════════════════════════════
# Section C: Project list
# ═══════════════════════════════════════════════════════════════════════════════

class TestProjectList:

    def test_list_returns_list(self, client, isolated_dirs):
        r = client.get("/api/project/list")
        assert isinstance(r.json(), list)

    def test_saved_project_appears_in_list(self, client, isolated_dirs):
        # Save via save endpoint routing to isolated dir
        payload = {
            **MINIMAL_SAVE_PAYLOAD,
            "name": "listed_project",
        }
        client.post("/api/project/save", json=payload)
        # list uses PROJECTS_DIR which is monkeypatched
        names = [p["name"] for p in client.get("/api/project/list").json()]
        assert "listed_project" in names

    def test_list_entries_have_required_fields(self, client, isolated_dirs):
        payload = {**MINIMAL_SAVE_PAYLOAD, "name": "meta_project"}
        client.post("/api/project/save", json=payload)
        projects = client.get("/api/project/list").json()
        entry = next((p for p in projects if p["name"] == "meta_project"), None)
        assert entry is not None
        for field in ("name", "vehicleType", "vehicleLabel", "componentCount"):
            assert field in entry, f"List entry missing '{field}'"

    def test_list_component_count_correct(self, client, isolated_dirs):
        payload = {**MINIMAL_SAVE_PAYLOAD, "name": "count_project"}
        client.post("/api/project/save", json=payload)
        projects = client.get("/api/project/list").json()
        entry = next(p for p in projects if p["name"] == "count_project")
        assert entry["componentCount"] == 1


# ═══════════════════════════════════════════════════════════════════════════════
# Section D: Project delete
# ═══════════════════════════════════════════════════════════════════════════════

class TestProjectDelete:

    def test_delete_nonexistent_404(self, client):
        r = client.delete("/api/project/delete/no_such_project_xyz")
        assert r.status_code == 404

    def test_delete_existing_project_200(self, client, isolated_dirs):
        payload = {**MINIMAL_SAVE_PAYLOAD, "name": "to_delete"}
        client.post("/api/project/save", json=payload)
        r = client.delete("/api/project/delete/to_delete")
        assert r.status_code == 200

    def test_delete_response_has_deleted_key(self, client, isolated_dirs):
        payload = {**MINIMAL_SAVE_PAYLOAD, "name": "del_check"}
        client.post("/api/project/save", json=payload)
        data = client.delete("/api/project/delete/del_check").json()
        assert "deleted" in data
        assert data["deleted"] == "del_check"

    def test_deleted_project_not_in_list(self, client, isolated_dirs):
        payload = {**MINIMAL_SAVE_PAYLOAD, "name": "del_list"}
        client.post("/api/project/save", json=payload)
        client.delete("/api/project/delete/del_list")
        names = [p["name"] for p in client.get("/api/project/list").json()]
        assert "del_list" not in names

    def test_deleted_project_load_gives_404(self, client, isolated_dirs):
        payload = {**MINIMAL_SAVE_PAYLOAD, "name": "del_load"}
        client.post("/api/project/save", json=payload)
        client.delete("/api/project/delete/del_load")
        r = client.get("/api/project/load/del_load")
        assert r.status_code == 404


# ═══════════════════════════════════════════════════════════════════════════════
# Section E: Export save to disk
# ═══════════════════════════════════════════════════════════════════════════════

class TestExportSave:

    def test_export_save_returns_path_and_filename(self, client, isolated_dirs):
        data = client.post("/api/export/save", json=MINIMAL_EXPORT_PAYLOAD).json()
        assert "path"     in data
        assert "filename" in data

    def test_export_save_filename_contains_label(self, client, isolated_dirs):
        data = client.post("/api/export/save", json=MINIMAL_EXPORT_PAYLOAD).json()
        assert "Test_Quad" in data["filename"]

    def test_export_save_filename_has_param_extension(self, client, isolated_dirs):
        data = client.post("/api/export/save", json=MINIMAL_EXPORT_PAYLOAD).json()
        assert data["filename"].endswith(".param")

    def test_export_save_file_exists_on_disk(self, client, isolated_dirs):
        data = client.post("/api/export/save", json=MINIMAL_EXPORT_PAYLOAD).json()
        assert Path(data["path"]).exists()

    def test_export_save_file_content_is_valid_param(self, client, isolated_dirs):
        from data.param_mappings import parse_param_file
        data = client.post("/api/export/save", json=MINIMAL_EXPORT_PAYLOAD).json()
        content = Path(data["path"]).read_text()
        params = parse_param_file(content)
        assert "FRAME_CLASS" in params


# ═══════════════════════════════════════════════════════════════════════════════
# Section F: Full import round-trip
# ═══════════════════════════════════════════════════════════════════════════════

class TestImportRoundTrip:

    def test_export_then_import_recovers_vehicle_type(self, client):
        # Step 1: export
        param_text = client.post("/api/export/param",
                                 json=MINIMAL_EXPORT_PAYLOAD).text
        # Step 2: import
        data = client.post("/api/export/import/param",
                           json={"content": param_text}).json()
        assert data["vehicle_type"] == "copter"

    def test_export_then_import_recovers_frame_class(self, client):
        param_text = client.post("/api/export/param",
                                 json=MINIMAL_EXPORT_PAYLOAD).text
        data = client.post("/api/export/import/param",
                           json={"content": param_text}).json()
        fc = next((c for c in data["components"] if c["defId"] == "frame_copter"), None)
        assert fc is not None
        assert fc["fields"]["frame_class"] == 1

    def test_export_then_import_frame_type_preserved(self, client):
        payload = {
            **MINIMAL_EXPORT_PAYLOAD,
            "components": [{
                **COPTER_FRAME_COMPONENT,
                "fields": {**COPTER_FRAME_COMPONENT["fields"], "frame_type": 0},
            }],
        }
        param_text = client.post("/api/export/param", json=payload).text
        data = client.post("/api/export/import/param",
                           json={"content": param_text}).json()
        fc = next(c for c in data["components"] if c["defId"] == "frame_copter")
        assert fc["fields"]["frame_type"] == 0

    def test_export_then_import_mot_spin_arm_precision(self, client):
        payload = {
            **MINIMAL_EXPORT_PAYLOAD,
            "components": [{
                **COPTER_FRAME_COMPONENT,
                "fields": {**COPTER_FRAME_COMPONENT["fields"], "mot_spin_arm": 0.12},
            }],
        }
        param_text = client.post("/api/export/param", json=payload).text
        data = client.post("/api/export/import/param",
                           json={"content": param_text}).json()
        fc = next(c for c in data["components"] if c["defId"] == "frame_copter")
        assert abs(fc["fields"]["mot_spin_arm"] - 0.12) < 1e-6

    def test_export_then_import_component_count(self, client):
        """More components in → import should produce same or more components."""
        param_text = client.post("/api/export/param",
                                 json=FULL_EXPORT_PAYLOAD).text
        data = client.post("/api/export/import/param",
                           json={"content": param_text}).json()
        # FULL_EXPORT_PAYLOAD has frame_copter + gps + battery_monitor
        def_ids = {c["defId"] for c in data["components"]}
        assert "frame_copter"    in def_ids
        assert "gps"             in def_ids
        assert "battery_monitor" in def_ids

    def test_import_real_param_file_content(self, client):
        """Simulate importing a real-world ArduPilot .param file snippet."""
        real_param = (
            "# ArduPilot Parameter File\n"
            "# Exported from Mission Planner\n"
            "\n"
            "FRAME_CLASS,1\n"
            "FRAME_TYPE,1\n"
            "MOT_SPIN_ARM,0.1\n"
            "MOT_SPIN_MIN,0.15\n"
            "MOT_SPIN_MAX,0.95\n"
            "BATT_MONITOR,4\n"
            "BATT_VOLT_MULT,10.1\n"
            "BATT_AMP_PERVLT,17.0\n"
            "GPS_TYPE,1\n"
            "SERIAL3_BAUD,38\n"
        )
        data = client.post("/api/export/import/param",
                           json={"content": real_param}).json()
        assert data["vehicle_type"] == "copter"
        assert data["count"] == 10
        def_ids = {c["defId"] for c in data["components"]}
        assert "frame_copter" in def_ids

    def test_project_save_param_file_is_parseable(self, client, isolated_dirs):
        """The .param file auto-generated during project save must be parseable."""
        from data.param_mappings import parse_param_file
        payload = {**MINIMAL_SAVE_PAYLOAD, "name": "param_parse_test"}
        r = client.post("/api/project/save", json=payload)
        saved_path = Path(r.json()["saved"])
        param_file = next(saved_path.glob("*.param"))
        params = parse_param_file(param_file.read_text())
        # Should have at least the frame params from COPTER_FRAME_COMPONENT
        assert "FRAME_CLASS" in params


# ═══════════════════════════════════════════════════════════════════════════════
# Section G: Complete project lifecycle
# ═══════════════════════════════════════════════════════════════════════════════

class TestProjectLifecycle:

    def test_full_lifecycle_save_list_load_delete(self, client, isolated_dirs):
        """
        End-to-end: save → list (confirms present) → load (confirms data)
        → delete → list (confirms gone) → load (404).
        """
        name = "lifecycle_project"
        payload = {**MINIMAL_SAVE_PAYLOAD, "name": name}

        # Save
        r = client.post("/api/project/save", json=payload)
        assert r.status_code == 200

        # List — present
        projects = client.get("/api/project/list").json()
        assert any(p["name"] == name for p in projects)

        # Load — correct data
        loaded = client.get(f"/api/project/load/{name}").json()
        assert loaded["vehicleType"] == "copter"
        assert len(loaded["components"]) == 1

        # Delete
        r = client.delete(f"/api/project/delete/{name}")
        assert r.status_code == 200

        # List — gone
        projects = client.get("/api/project/list").json()
        assert not any(p["name"] == name for p in projects)

        # Load — 404
        assert client.get(f"/api/project/load/{name}").status_code == 404
