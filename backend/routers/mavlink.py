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
routers/mavlink.py
MAVLink integration — connects to Mission Planner or a flight controller
directly over TCP/UDP. Requires pymavlink (installed separately).

Default connection: TCP 127.0.0.1:5762 (Mission Planner's default TCP output).
"""
import threading
import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any

router = APIRouter()

# ── Module-level connection state ──────────────────────────────────────────────
_connection = None          # mavutil.mavlink_connection object
_fc_info: dict  = {}        # sysid, mav_type, autopilot reported in heartbeat
_lock = threading.Lock()

# MAV_TYPE labels (subset covering ArduPilot vehicle types)
_MAV_TYPE = {
    0:  "Generic",
    1:  "Fixed Wing",
    2:  "Quadrotor",
    3:  "Coaxial",
    4:  "Helicopter",
    6:  "Ground Rover",
    10: "Ground Rover",
    13: "Hexarotor",
    14: "Octorotor",
    15: "Tricopter",
    19: "VTOL QuadPlane",
    20: "VTOL Tiltrotor",
    22: "VTOL Tailsitter",
}

_MAV_AUTOPILOT = {
    3:  "ArduPilot",
    8:  "Invalid",
}


def _try_mavutil():
    try:
        from pymavlink import mavutil
        return mavutil
    except ImportError:
        return None


class ConnectRequest(BaseModel):
    host:     str = "127.0.0.1"
    port:     int = 5762
    protocol: str = "tcp"       # "tcp" | "udp"


class ParamUploadRequest(BaseModel):
    params: list[dict[str, Any]]   # [{param, value}, ...]


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/connect")
def connect(req: ConnectRequest):
    global _connection, _fc_info

    mavutil = _try_mavutil()
    if mavutil is None:
        raise HTTPException(503, "pymavlink not installed — run: pip install pymavlink")

    conn_str = f"{req.protocol}:{req.host}:{req.port}"

    with _lock:
        # Close any existing connection first
        if _connection is not None:
            try:
                _connection.close()
            except Exception:
                pass
            _connection = None
            _fc_info = {}

        try:
            mav = mavutil.mavlink_connection(
                conn_str,
                autoreconnect=False,
                source_system=255,
            )
            msg = mav.wait_heartbeat(timeout=8)
            if msg is None:
                mav.close()
                raise HTTPException(408, f"No heartbeat from {conn_str} within 8 s — is Mission Planner connected?")

            mav_type  = getattr(msg, "type", 0)
            autopilot = getattr(msg, "autopilot", 0)

            _connection = mav
            _fc_info = {
                "sysid":     mav.target_system,
                "compid":    mav.target_component,
                "mav_type":  mav_type,
                "autopilot": autopilot,
                "type_label": _MAV_TYPE.get(mav_type, f"Type {mav_type}"),
                "ap_label":   _MAV_AUTOPILOT.get(autopilot, f"AP {autopilot}"),
            }
            return {"connected": True, "fc_info": _fc_info}

        except HTTPException:
            raise
        except Exception as exc:
            _connection = None
            _fc_info = {}
            raise HTTPException(400, str(exc))


@router.get("/status")
def status():
    return {
        "connected": _connection is not None,
        "fc_info":   _fc_info if _connection is not None else {},
    }


@router.post("/disconnect")
def disconnect():
    global _connection, _fc_info
    with _lock:
        if _connection is not None:
            try:
                _connection.close()
            except Exception:
                pass
            _connection = None
            _fc_info = {}
    return {"disconnected": True}


@router.get("/pull_params")
def pull_params():
    """
    Fetch all parameters from the connected flight controller.
    Reverse-maps them into AVC components using the same logic as .param file import.
    Returns the same shape as POST /export/import/param so the frontend can reuse
    the existing import flow.
    """
    if _connection is None:
        raise HTTPException(400, "Not connected to a flight controller")

    mav = _connection
    raw: dict[str, float] = {}

    try:
        mav.param_fetch_all()
        deadline = time.time() + 45   # full ArduPilot param set can take ~30 s
        while time.time() < deadline:
            msg = mav.recv_match(type="PARAM_VALUE", blocking=True, timeout=2)
            if msg is None:
                break
            raw[msg.param_id.strip()] = float(msg.param_value)
            if len(raw) >= msg.param_count:
                break
    except Exception as exc:
        raise HTTPException(500, f"Param fetch failed: {exc}")

    if not raw:
        raise HTTPException(504, "No parameters received — connection may have dropped")

    # Reuse the same reverse-mapper as the .param file import endpoint
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
    from data.param_mappings import build_components_from_params
    inferred = build_components_from_params(raw)

    return {
        "params":       raw,
        "count":        len(raw),
        "vehicle_type": inferred["vehicle_type"],
        "components":   inferred["components"],
    }


@router.post("/upload_params")
def upload_params(req: ParamUploadRequest):
    """
    Push a flat param list to the connected flight controller via PARAM_SET.
    Each entry must have 'param' and 'value' keys.
    ArduPilot stores all user params as MAV_PARAM_TYPE_REAL32 (float).
    """
    if _connection is None:
        raise HTTPException(400, "Not connected to a flight controller")

    try:
        from pymavlink.dialects.v20 import ardupilotmega as mavlink2
        REAL32 = mavlink2.MAV_PARAM_TYPE_REAL32
    except Exception as exc:
        raise HTTPException(503, f"pymavlink dialect unavailable: {exc}")

    mav      = _connection
    uploaded = 0
    failed:  list[str] = []

    for p in req.params:
        param_id = str(p.get("param") or p.get("name") or p.get("param_id") or "")
        if not param_id:
            continue
        try:
            value = float(p.get("value", 0))
            mav.param_set_send(param_id, value, REAL32)
            uploaded += 1
            time.sleep(0.015)   # ~65 params/s — avoids flooding the FC
        except Exception:
            failed.append(param_id)

    return {"uploaded": uploaded, "failed": failed, "total": len(req.params)}
