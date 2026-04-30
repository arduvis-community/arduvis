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
data/frame_types.py
────────────────────────────────────────────────────────────────────────────────
Python port of frameTypes.js — STUB for bootstrap phase.
Full motor position data to be ported from frameTypes.js.
"""

from typing import Any

COPTER_FRAMES: list[dict[str, Any]] = [
    {
        "id": "quad_x",
        "label": "Quad X",
        "frameClass": 1,
        "frameType": 1,
        "motorCount": 4,
        "description": "Standard quad, X configuration.",
        "motors": [
            {"num": 1, "cx":  0.7, "cy":  0.7, "spin": "ccw"},
            {"num": 2, "cx": -0.7, "cy":  0.7, "spin": "cw"},
            {"num": 3, "cx": -0.7, "cy": -0.7, "spin": "ccw"},
            {"num": 4, "cx":  0.7, "cy": -0.7, "spin": "cw"},
        ],
    },
]

PLANE_CONFIGS: list[dict[str, Any]] = []
VTOL_MOTOR_FRAMES: list[dict[str, Any]] = []

COPTER_FRAME_CLASS_OPTIONS = [
    {"value": 1,  "label": "Quad (4 motors)",       "icon": "🚁"},
    {"value": 2,  "label": "Hex (6 motors)",         "icon": "🚁"},
    {"value": 3,  "label": "Octo (8 motors)",        "icon": "🚁"},
    {"value": 7,  "label": "Tri (3 motors)",         "icon": "🚁"},
    {"value": 12, "label": "DodecaHex (12 motors)", "icon": "🚁"},
]


def get_copter_frame(frame_class: int, frame_type: int) -> dict | None:
    return next(
        (f for f in COPTER_FRAMES
         if f["frameClass"] == frame_class and f["frameType"] == frame_type),
        None
    )


def get_vtol_frame(q_frame_class: int, q_frame_type: int) -> dict | None:
    return next(
        (f for f in VTOL_MOTOR_FRAMES
         if f.get("qFrameClass") == q_frame_class and f.get("qFrameType") == q_frame_type),
        None
    )
