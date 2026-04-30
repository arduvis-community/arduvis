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
routers/frames.py
────────────────────────────────────────────────────────────────────────────────
Serves frame type definitions (motor layouts, frame class/type combos).
"""

from typing import Literal

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from data.frame_types import (
    COPTER_FRAMES,
    PLANE_CONFIGS,
    VTOL_MOTOR_FRAMES,
    COPTER_FRAME_CLASS_OPTIONS,
    get_copter_frame,
    get_vtol_frame,
)

router = APIRouter()


@router.get("/copter")
def get_copter_frames():
    return COPTER_FRAMES


@router.get("/copter/classes")
def get_copter_frame_classes():
    return COPTER_FRAME_CLASS_OPTIONS


@router.get("/copter/{frame_class}/{frame_type}")
def get_specific_copter_frame(frame_class: int, frame_type: int):
    frame = get_copter_frame(frame_class, frame_type)
    if not frame:
        return JSONResponse(
            status_code=404,
            content={"error": f"No Copter frame for CLASS={frame_class} TYPE={frame_type}"}
        )
    return frame


@router.get("/plane")
def get_plane_configs():
    return PLANE_CONFIGS


@router.get("/vtol")
def get_vtol_frames():
    return VTOL_MOTOR_FRAMES


@router.get("/vtol/{q_frame_class}/{q_frame_type}")
def get_specific_vtol_frame(q_frame_class: int, q_frame_type: int):
    frame = get_vtol_frame(q_frame_class, q_frame_type)
    if not frame:
        return JSONResponse(
            status_code=404,
            content={"error": f"No VTOL frame for Q_CLASS={q_frame_class} Q_TYPE={q_frame_type}"}
        )
    return frame
