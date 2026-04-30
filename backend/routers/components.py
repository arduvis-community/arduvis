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
routers/components.py
────────────────────────────────────────────────────────────────────────────────
Serves the component block definitions (palette items + inspector schemas)
to the React frontend.

The data layer lives in data/component_defs.py. These routes are thin —
they filter and serve; no business logic here.
"""

from typing import Literal, Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from data.component_defs import COMPONENT_DEFS, CATEGORIES, defs_for_vehicle

router = APIRouter()

# Community components superseded by per-FC settings in the topology inspector.
# Suppressed from palette lists so users configure orientation/board per autopilot chip.
_TOPOLOGY_SUPERSEDED = {"board_orientation", "brd_config"}

def _palette_defs(defs: list) -> list:
    return [d for d in defs if d["id"] not in _TOPOLOGY_SUPERSEDED]


@router.get("/")
def get_all_components():
    """Return every component definition (all vehicle types)."""
    return _palette_defs(COMPONENT_DEFS)


@router.get("/categories")
def get_categories():
    """Return palette category order."""
    return CATEGORIES


@router.get("/definitions")
def get_definitions(
    vehicle: Optional[Literal["copter", "plane", "vtol"]] = Query(None)
):
    """
    Return component defs filtered by vehicle type query param.
    GET /api/components/definitions?vehicle=copter
    Omit vehicle to get all definitions.
    """
    if vehicle:
        return _palette_defs(defs_for_vehicle(vehicle))
    return _palette_defs(COMPONENT_DEFS)


@router.get("/vehicle/{vehicle_type}")
def get_components_for_vehicle(
    vehicle_type: Literal["copter", "plane", "vtol"]
):
    """Return only the component defs relevant to the given vehicle type."""
    return _palette_defs(defs_for_vehicle(vehicle_type))


@router.get("/{component_id}")
def get_component(component_id: str):
    """Return a single component definition by id."""
    match = next((c for c in COMPONENT_DEFS if c["id"] == component_id), None)
    if not match:
        return JSONResponse(status_code=404, content={"error": f"Component '{component_id}' not found"})
    return match
