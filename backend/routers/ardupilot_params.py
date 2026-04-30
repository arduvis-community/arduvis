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
routers/ardupilot_params.py
Serves the bundled ArduPilot parameter metadata.

Data is loaded from data.ardupilot_params_data (a Python module) so that
PyInstaller bundles it automatically without any filesystem path resolution.
"""

from functools import lru_cache

from fastapi import APIRouter, HTTPException
from data.ardupilot_params_data import get as _get_param_data

router = APIRouter()


@lru_cache(maxsize=None)
def _load() -> dict:
    try:
        return _get_param_data()
    except Exception:
        return {}


@router.get("/meta")
def get_param_meta(vehicle: str = "copter"):
    # VTOL uses plane params
    key = "plane" if vehicle == "vtol" else vehicle
    data = _load()
    if key not in data:
        raise HTTPException(404, f"No param metadata for vehicle '{vehicle}'")
    return data[key]
