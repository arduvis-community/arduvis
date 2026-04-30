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
routers/project.py
────────────────────────────────────────────────────────────────────────────────
Project save / load using a per-project folder structure.

Each project lives in its own subfolder:
    ~/.avc/projects/<name>/
        layout.json           — component positions, fields, canvas state
        airframe_top.<ext>    — top-view background image (png / jpg / svg)
        airframe_bottom.<ext> — bottom-view background image (optional)
        <name>.param          — auto-generated ArduPilot parameter file
"""
import base64
import json
import re
import shutil
import subprocess
import sys
from datetime import date
from pathlib import Path
from typing import Any, Optional
from urllib.parse import quote, unquote

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from data.param_mappings import build_param_list

router = APIRouter()
PROJECTS_DIR = Path.home() / ".avc" / "projects"
PROJECTS_DIR.mkdir(parents=True, exist_ok=True)


# ── Image helpers ─────────────────────────────────────────────────────────────

def _image_ext(data_url: str) -> str:
    m = re.match(r"data:image/(\w+)", data_url)
    if m:
        ext = m.group(1)
        return "jpg" if ext in ("jpeg", "jpg") else ext
    return "png"


def _save_image(data_url: str, path: Path) -> None:
    if ";base64," in data_url:
        raw = base64.b64decode(data_url.split(",", 1)[1])
        path.write_bytes(raw)
    else:
        # URI-encoded SVG (from built-in standard views)
        svg_text = unquote(data_url.split(",", 1)[1])
        path.write_text(svg_text, encoding="utf-8")


def _load_image(path: Path) -> str:
    ext = path.suffix.lstrip(".").lower()
    if ext == "svg":
        content = path.read_text(encoding="utf-8")
        return f"data:image/svg+xml;charset=utf-8,{quote(content)}"
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
    raw = base64.b64encode(path.read_bytes()).decode()
    return f"data:{mime};base64,{raw}"


# ── Param generation ──────────────────────────────────────────────────────────

def _build_param_text(components: list, vehicle_type: str, vehicle_label: str) -> str:
    result = build_param_list(components, vehicle_type)
    lines = [
        "# ArduPilot Visual Configurator",
        f"# Vehicle : {vehicle_label}",
        f"# Firmware: {vehicle_type}",
        f"# Date    : {date.today()}",
        "",
    ]
    flat = result.get("flat", [])
    for entry in flat:
        lines.append(f"{entry['param']},{entry['value']}")
    if not flat:
        lines.append("# No parameters generated — complete component configuration first")
    return "\n".join(lines)


# ── Pydantic models ───────────────────────────────────────────────────────────

class SavePayload(BaseModel):
    name: str
    vehicleType: str
    vehicleLabel: str
    frameInfo: Optional[dict[str, Any]] = None
    components: list[dict[str, Any]]
    canvas: dict[str, Any]
    airframeTop:    Optional[str] = None   # data URL
    airframeBottom: Optional[str] = None   # data URL
    basePath:       Optional[str] = None   # custom save directory; defaults to PROJECTS_DIR


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/list")
def list_projects():
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    projects = []
    for d in sorted(PROJECTS_DIR.iterdir()):
        if not d.is_dir():
            continue
        layout_path = d / "layout.json"
        if not layout_path.exists():
            continue
        try:
            meta = json.loads(layout_path.read_text())
            projects.append({
                "name":           d.name,
                "vehicleType":    meta.get("vehicleType", "copter"),
                "vehicleLabel":   meta.get("vehicleLabel", d.name),
                "componentCount": len(meta.get("components", [])),
                "savedAt":        layout_path.stat().st_mtime,
            })
        except Exception:
            projects.append({"name": d.name, "vehicleType": "copter", "vehicleLabel": d.name})
    return projects


@router.post("/save")
def save_project(payload: SavePayload):
    # Sanitise folder name
    safe = re.sub(r"[^\w\-. ]", "_", payload.name).strip().replace(" ", "_")
    if not safe:
        raise HTTPException(400, "Invalid project name")

    # Use custom base path if provided, otherwise default projects dir
    if payload.basePath:
        base = Path(payload.basePath).expanduser().resolve()
        base.mkdir(parents=True, exist_ok=True)
    else:
        base = PROJECTS_DIR

    folder = base / safe
    folder.mkdir(parents=True, exist_ok=True)

    # ── Save airframe images ──────────────────────────────────────────────
    for old in folder.glob("airframe_top.*"):
        old.unlink()
    for old in folder.glob("airframe_bottom.*"):
        old.unlink()

    top_file = bot_file = None
    if payload.airframeTop:
        ext = _image_ext(payload.airframeTop)
        p = folder / f"airframe_top.{ext}"
        _save_image(payload.airframeTop, p)
        top_file = p.name
    if payload.airframeBottom:
        ext = _image_ext(payload.airframeBottom)
        p = folder / f"airframe_bottom.{ext}"
        _save_image(payload.airframeBottom, p)
        bot_file = p.name

    # ── Save layout.json ──────────────────────────────────────────────────
    layout = {
        "vehicleType":        payload.vehicleType,
        "vehicleLabel":       payload.vehicleLabel,
        "frameInfo":          payload.frameInfo,
        "components":         payload.components,
        "canvas":             payload.canvas,
        "airframeTopFile":    top_file,
        "airframeBottomFile": bot_file,
    }
    (folder / "layout.json").write_text(json.dumps(layout, indent=2))

    # ── Generate .param file ──────────────────────────────────────────────
    param_text = _build_param_text(payload.components, payload.vehicleType, payload.vehicleLabel)
    param_path = folder / f"{safe}.param"
    param_path.write_text(param_text)

    return {
        "saved": str(folder),
        "files": {
            "layout":       "layout.json",
            "param":        param_path.name,
            "airframeTop":  top_file,
            "airframeBottom": bot_file,
        },
    }


_LEGACY_DEFID_MAP: dict[str, tuple[str, dict]] = {
    "servo_surface": ("servo", {"connection_type": "pwm"}),
    "servo_tilt":    ("servo", {"connection_type": "pwm"}),
    "esc_plane":     ("esc",   {"connection_type": "pwm", "esc_role": "throttle"}),
}
_LEGACY_ESC_DEFAULTS = {"connection_type": "pwm", "esc_role": "motor"}

def _migrate_components(components: list) -> list:
    out = []
    for comp in components:
        did = comp.get("defId", "")
        if did in _LEGACY_DEFID_MAP:
            new_id, extra_fields = _LEGACY_DEFID_MAP[did]
            comp = {**comp, "defId": new_id,
                    "fields": {**extra_fields, **comp.get("fields", {})}}
        elif did == "esc" and "connection_type" not in comp.get("fields", {}):
            comp = {**comp, "fields": {**_LEGACY_ESC_DEFAULTS, **comp.get("fields", {})}}
        # Upgrade saved projects that used "can" before the dronecan rename
        fields = comp.get("fields") or {}
        if fields.get("connection_type") == "can":
            comp = {**comp, "fields": {**fields, "connection_type": "dronecan"}}
        out.append(comp)
    return out


@router.get("/load/{name}")
def load_project(name: str):
    folder = PROJECTS_DIR / name
    layout_path = folder / "layout.json"
    if not layout_path.exists():
        raise HTTPException(404, f"Project '{name}' not found")

    layout = json.loads(layout_path.read_text())
    layout["components"] = _migrate_components(layout.get("components", []))

    # Re-attach images as data URLs
    for file_key, url_key in [("airframeTopFile", "airframeTop"), ("airframeBottomFile", "airframeBottom")]:
        filename = layout.pop(file_key, None)
        layout[url_key] = None
        if filename:
            img_path = folder / filename
            if img_path.exists():
                layout[url_key] = _load_image(img_path)

    return layout


@router.delete("/delete/{name}")
def delete_project(name: str):
    folder = PROJECTS_DIR / name
    if not folder.exists():
        raise HTTPException(404, f"Project '{name}' not found")
    shutil.rmtree(folder)
    return {"deleted": name}


@router.get("/open-folder/{name}")
def open_project_folder(name: str):
    """Open the project folder in the OS file explorer."""
    folder = PROJECTS_DIR / name
    if not folder.exists():
        raise HTTPException(404, f"Project '{name}' not found")
    if sys.platform == "win32":
        subprocess.Popen(["explorer", str(folder)])
    elif sys.platform == "darwin":
        subprocess.Popen(["open", str(folder)])
    else:
        subprocess.Popen(["xdg-open", str(folder)])
    return {"opened": str(folder)}
