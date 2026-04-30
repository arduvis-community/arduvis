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
test_1_completeness.py
────────────────────────────────────────────────────────────────────────────────
Verifies that the component definitions and param mappings are structurally
complete — no missing fields, no orphaned IDs, no broken references.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from data.component_defs import COMPONENT_DEFS, CATEGORIES, COMPONENT_DEFS_MAP, defs_for_vehicle


# ── Constants ─────────────────────────────────────────────────────────────────

EXPECTED_CATEGORIES = [
    "Vehicle Setup", "Autopilot", "Propulsion", "Sensors", "Power", "RC / GCS", "Peripherals"
]

VALID_FIELD_TYPES = {
    "select", "number", "toggle", "text", "bitmask",
    "multiselect", "pinSelect", "note",
}

VALID_VEHICLES = {"copter", "plane", "vtol", "heli"}


# ── Category completeness ─────────────────────────────────────────────────────

class TestCategories:
    def test_categories_list_matches_expected(self):
        assert CATEGORIES == EXPECTED_CATEGORIES

    def test_all_categories_have_at_least_one_component(self):
        cats_used = {d["category"] for d in COMPONENT_DEFS}
        for cat in CATEGORIES:
            assert cat in cats_used, f"Category '{cat}' has no components"

    def test_no_component_has_unknown_category(self):
        for d in COMPONENT_DEFS:
            assert d["category"] in CATEGORIES, (
                f"Component '{d['id']}' has unknown category '{d['category']}'"
            )


# ── Component count ───────────────────────────────────────────────────────────

class TestComponentCount:
    def test_minimum_component_count(self):
        """We expect at least 45 component definitions."""
        assert len(COMPONENT_DEFS) >= 45, (
            f"Only {len(COMPONENT_DEFS)} components — expected >= 45"
        )

    def test_no_duplicate_component_ids(self):
        ids = [d["id"] for d in COMPONENT_DEFS]
        dupes = [i for i in ids if ids.count(i) > 1]
        assert dupes == [], f"Duplicate component IDs: {set(dupes)}"

    def test_component_defs_map_is_consistent(self):
        """COMPONENT_DEFS_MAP must contain every entry in COMPONENT_DEFS."""
        for d in COMPONENT_DEFS:
            assert d["id"] in COMPONENT_DEFS_MAP
            assert COMPONENT_DEFS_MAP[d["id"]] is d


# ── Top-level required fields on every component ─────────────────────────────

class TestComponentTopLevelFields:
    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_has_id(self, comp):
        assert "id" in comp and comp["id"]

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_has_label(self, comp):
        assert "label" in comp and comp["label"]

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_has_category(self, comp):
        assert "category" in comp

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_has_icon(self, comp):
        assert "icon" in comp and comp["icon"]

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_has_vehicles_list(self, comp):
        assert "vehicles" in comp
        assert isinstance(comp["vehicles"], list)
        assert len(comp["vehicles"]) >= 1

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_vehicles_are_valid(self, comp):
        for v in comp["vehicles"]:
            assert v in VALID_VEHICLES, (
                f"Component '{comp['id']}' has unknown vehicle '{v}'"
            )

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_has_virtual_bool(self, comp):
        assert "virtual" in comp
        assert isinstance(comp["virtual"], bool)

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_has_multi_bool(self, comp):
        assert "multi" in comp
        assert isinstance(comp["multi"], bool)

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_has_inspector_list(self, comp):
        assert "inspector" in comp
        assert isinstance(comp["inspector"], list)


# ── Inspector group and field structure ───────────────────────────────────────

class TestInspectorStructure:
    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_inspector_groups_have_label_and_fields(self, comp):
        for grp in comp["inspector"]:
            assert "label" in grp, f"Group in '{comp['id']}' missing 'label'"
            assert "fields" in grp, f"Group in '{comp['id']}' missing 'fields'"
            assert isinstance(grp["fields"], list)

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_all_fields_have_key_label_type(self, comp):
        for grp in comp["inspector"]:
            for f in grp["fields"]:
                assert "key"   in f, f"Field in '{comp['id']}' group '{grp['label']}' missing 'key'"
                assert "label" in f, f"Field '{f.get('key')}' in '{comp['id']}' missing 'label'"
                assert "type"  in f, f"Field '{f.get('key')}' in '{comp['id']}' missing 'type'"

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_all_field_types_are_valid(self, comp):
        for grp in comp["inspector"]:
            for f in grp["fields"]:
                assert f["type"] in VALID_FIELD_TYPES, (
                    f"Field '{f['key']}' in '{comp['id']}' has unknown type '{f['type']}'"
                )

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_select_fields_have_options(self, comp):
        for grp in comp["inspector"]:
            for f in grp["fields"]:
                if f["type"] == "select":
                    assert "options" in f and len(f["options"]) > 0, (
                        f"Select field '{f['key']}' in '{comp['id']}' has no options"
                    )

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_no_duplicate_field_keys_within_group(self, comp):
        """
        Duplicate keys within a group are intentional when each entry carries a
        distinct 'vehicle' attribute (so only one is ever rendered at a time).
        Only flag duplicates where two entries share the same key AND the same
        'vehicle' value (including both being absent), which is a genuine error.
        """
        for grp in comp["inspector"]:
            seen: set[tuple] = set()
            for f in grp["fields"]:
                identity = (f["key"], f.get("vehicle"))  # (key, vehicle-filter)
                assert identity not in seen, (
                    f"Component '{comp['id']}' group '{grp['label']}' "
                    f"has truly duplicate field: key='{f['key']}' vehicle={f.get('vehicle')!r}"
                )
                seen.add(identity)

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_dependsOn_references_existing_field(self, comp):
        all_keys = set()
        for grp in comp["inspector"]:
            all_keys.update(f["key"] for f in grp["fields"])
        for grp in comp["inspector"]:
            for f in grp["fields"]:
                dep = f.get("dependsOn")
                if not dep:
                    continue
                clauses = dep.get("allOf", [dep]) if isinstance(dep, dict) else [dep]
                for clause in clauses:
                    ref = clause.get("field")
                    assert ref in all_keys, (
                        f"Field '{f['key']}' in '{comp['id']}' dependsOn unknown field '{ref}'"
                    )

    @pytest.mark.parametrize("comp", COMPONENT_DEFS, ids=lambda c: c["id"])
    def test_number_fields_min_lte_max(self, comp):
        for grp in comp["inspector"]:
            for f in grp["fields"]:
                if f["type"] == "number":
                    mn = f.get("min")
                    mx = f.get("max")
                    if mn is not None and mx is not None:
                        assert mn <= mx, (
                            f"Field '{f['key']}' in '{comp['id']}' has min {mn} > max {mx}"
                        )


# ── Vehicle filtering ─────────────────────────────────────────────────────────

class TestVehicleFiltering:
    def test_copter_defs_not_empty(self):
        defs = defs_for_vehicle("copter")
        assert len(defs) >= 5

    def test_plane_defs_not_empty(self):
        defs = defs_for_vehicle("plane")
        assert len(defs) >= 5

    def test_vtol_defs_not_empty(self):
        defs = defs_for_vehicle("vtol")
        assert len(defs) >= 5

    def test_copter_defs_all_include_copter(self):
        for d in defs_for_vehicle("copter"):
            assert "copter" in d["vehicles"]

    def test_plane_defs_all_include_plane(self):
        for d in defs_for_vehicle("plane"):
            assert "plane" in d["vehicles"]

    def test_vtol_defs_all_include_vtol(self):
        for d in defs_for_vehicle("vtol"):
            assert "vtol" in d["vehicles"]

    def test_frame_copter_in_copter_only(self):
        ids = [d["id"] for d in defs_for_vehicle("copter")]
        assert "frame_copter" in ids

    def test_frame_copter_not_in_plane(self):
        ids = [d["id"] for d in defs_for_vehicle("plane")]
        assert "frame_copter" not in ids

    def test_frame_plane_in_plane(self):
        ids = [d["id"] for d in defs_for_vehicle("plane")]
        assert "frame_plane" in ids

    def test_frame_vtol_in_vtol(self):
        ids = [d["id"] for d in defs_for_vehicle("vtol")]
        assert "frame_vtol" in ids

    def test_gps_in_all_vehicles(self):
        for vtype in ("copter", "plane", "vtol"):
            ids = [d["id"] for d in defs_for_vehicle(vtype)]
            assert "gps" in ids, f"gps not in {vtype} defs"


# ── Multi-instance constraints ─────────────────────────────────────────────────

class TestMultiInstanceRules:
    def test_multi_components_have_max_instances_or_none(self):
        for d in COMPONENT_DEFS:
            if d["multi"]:
                # maxInstances must be a positive int or absent
                mi = d.get("maxInstances")
                if mi is not None:
                    assert isinstance(mi, int) and mi > 0, (
                        f"Component '{d['id']}' has invalid maxInstances: {mi}"
                    )

    def test_non_multi_components_have_no_max_instances(self):
        for d in COMPONENT_DEFS:
            if not d["multi"]:
                assert d.get("maxInstances") is None or d.get("maxInstances") == 1, (
                    f"Non-multi component '{d['id']}' has maxInstances set"
                )
