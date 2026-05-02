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

In a PyInstaller bundle the JSON is extracted to sys._MEIPASS/backend/data/.
In dev mode it sits next to this file at ../data/ardupilot_params.json.
"""

import json
import sys
from functools import lru_cache
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter()


def _json_path() -> Path:
    if hasattr(sys, '_MEIPASS'):
        return Path(sys._MEIPASS) / 'backend' / 'data' / 'ardupilot_params.json'
    # dev: this file is backend/routers/ardupilot_params.py
    return Path(__file__).parent.parent / 'data' / 'ardupilot_params.json'


@lru_cache(maxsize=None)
def _load() -> dict:
    try:
        with open(_json_path(), encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


@router.get("/meta")
def get_param_meta(vehicle: str = "copter"):
    key = "plane" if vehicle == "vtol" else vehicle
    data = _load()
    if key not in data:
        raise HTTPException(404, f"No param metadata for vehicle '{vehicle}'")
    return JSONResponse(content=data[key], headers={"Cache-Control": "no-store"})
