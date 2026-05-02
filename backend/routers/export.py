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
routers/export.py
Generate and parse ArduPilot .param files.
"""
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel
from typing import Any
from pathlib import Path
from datetime import date

from data.param_mappings import build_param_list, parse_param_file, build_components_from_params
from data.component_defs import COMPONENT_DEFS_MAP

router = APIRouter()
EXPORTS_DIR = Path.home() / ".avc" / "exports"


class ExportRequest(BaseModel):
    components:       list[dict[str, Any]]
    vehicle_type:     str            # 'copter' | 'plane' | 'vtol'
    vehicle_label:    str
    frame_info:       dict[str, Any] | None = None
    baseline_params:  dict[str, Any] | None = None  # original imported params — passthrough
    include_defaults: bool = False   # when True, fill unset fields with schema defaults before export


class ImportRequest(BaseModel):
    content: str   # raw text of the .param file


class CompareRequest(BaseModel):
    components:       list[dict[str, Any]]
    vehicle_type:     str
    baseline_params:  dict[str, Any] | None = None
    include_defaults: bool = True   # default True for comparison — want full picture
    reference_content: str          # raw .param file text from Mission Planner / GCS


# Components whose number-field defaults are vehicle-specific tuning values.
# These are NOT exported with +defaults — only user-set values are included.
# Prevents unverified Claude-authored defaults from reaching a real flight controller.
_TUNING_COMPONENT_IDS = frozenset({
    "attitude_controller", "position_controller", "ekf_config",
    "harmonic_notch", "acro_config", "wpnav_config", "rtl_config",
    "logging_config", "obstacle_avoidance",
})


def _fill_defaults(components: list[dict]) -> list[dict]:
    """Return a copy of components with schema defaults filled in for any unset fields.

    Tuning components (PIDs, EKF, notch filter, etc.) are excluded — their number
    field defaults are vehicle-specific and must be explicitly set by the user.
    """
    result = []
    for comp in components:
        def_schema = COMPONENT_DEFS_MAP.get(comp.get("defId", ""))
        if not def_schema:
            result.append(comp)
            continue
        is_tuning = comp.get("defId") in _TUNING_COMPONENT_IDS
        filled_fields = dict(comp.get("fields") or {})
        for group in def_schema.get("inspector", []):
            for field in group.get("fields", []):
                key = field.get("key")
                if not key or key in filled_fields or field.get("default") is None:
                    continue
                # Skip unset number fields in tuning components
                if is_tuning and field.get("type") == "number":
                    continue
                filled_fields[key] = field["default"]
        result.append({**comp, "fields": filled_fields})
    return result


def _fmt(value) -> str:
    """Format a parameter value cleanly (no scientific notation, full precision)."""
    if isinstance(value, float):
        return f"{value:.12f}".rstrip("0").rstrip(".")
    return str(value)


@router.post("/param", response_class=PlainTextResponse)
def export_param(req: ExportRequest) -> str:
    """Build and return .param file content from component configuration.

    Component-derived params override any baseline params with the same name.
    All remaining baseline params are emitted in a passthrough section so that
    calibration data, PID tuning, and other non-UI params are preserved.
    """
    components = _fill_defaults(req.components) if req.include_defaults else req.components
    result   = build_param_list(components, req.vehicle_type)
    flat:    list[dict]       = result["flat"]
    grouped: dict[str, list]  = result["grouped"]

    # Build a set of param names produced by components (uppercase)
    component_param_names = {e["param"].upper() for e in flat}

    # Passthrough: baseline params not overridden by any component
    baseline = {k.upper(): v for k, v in (req.baseline_params or {}).items()}
    passthrough = {k: v for k, v in baseline.items()
                   if k not in component_param_names}

    total_count = len(flat) + len(passthrough)

    lines = [
        "# ArduPilot Visual Configurator — Parameter Export",
        "# Copyright (C) 2026 Patternlynx Limited. Licensed under GPL-3.0.",
        f"# Generated        : {date.today()}",
        f"# Flight Controller: CubePilot Cube",
        f"# Firmware         : {req.vehicle_type}",
        f"# Vehicle          : {req.vehicle_label}",
        f"# Parameters       : {total_count}",
        f"# Defaults included: {'yes' if req.include_defaults else 'no — non-default params only'}",
        "# NOTE: Beta software — verify all parameters before flight.",
        "",
    ]

    # ── Configured sections (from components) ────────────────────────────────
    for group, entries in grouped.items():
        lines.append(f"# ── {group} {'─' * max(0, 50 - len(group))}")
        for e in entries:
            lines.append(f"{e['param']},{_fmt(e['value'])}")
        lines.append("")

    # ── Passthrough (original import params not covered by components) ────────
    if passthrough:
        lines.append("# ── Passthrough (preserved from original import) " + "─" * 3)
        for name in sorted(passthrough):
            lines.append(f"{name},{_fmt(passthrough[name])}")
        lines.append("")

    return "\n".join(lines)


@router.post("/save")
def save_export(req: ExportRequest):
    """Generate and save .param file to ~/.avc/exports/"""
    EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
    content  = export_param(req)
    filename = f"{req.vehicle_label.replace(' ', '_')}_{date.today()}.param"
    path     = EXPORTS_DIR / filename
    path.write_text(content, encoding="utf-8")
    return {"path": str(path), "filename": filename}


@router.post("/import/param")
def import_param(req: ImportRequest) -> dict:
    """
    Parse a .param file and reverse-map it into component instances.
    Returns the raw params dict, inferred vehicle type, and ready-to-use
    component definitions with pre-populated field values.
    """
    params     = parse_param_file(req.content)
    inferred   = build_components_from_params(params)
    return {
        "params":       params,
        "count":        len(params),
        "vehicle_type": inferred["vehicle_type"],
        "components":   inferred["components"],
    }


@router.post("/compare")
def compare_params(req: CompareRequest):
    """Compare AVC-generated params against a reference .param file (e.g. from Mission Planner).

    Returns mismatches (same param, different value), params missing from AVC output,
    params AVC generates that the reference doesn't have, and a match count.
    """
    components = _fill_defaults(req.components) if req.include_defaults else req.components
    result = build_param_list(components, req.vehicle_type)
    flat: list[dict] = result["flat"]

    # Build AVC param map (uppercase keys → float values)
    avc: dict[str, float] = {}
    for e in flat:
        try:
            avc[e["param"].upper()] = float(e["value"])
        except (ValueError, TypeError):
            pass

    # Parse reference file
    ref: dict[str, float] = parse_param_file(req.reference_content)

    mismatches = []
    avc_only   = []
    match_count = 0

    for param, avc_val in sorted(avc.items()):
        if param in ref:
            ref_val = ref[param]
            # Compare with tolerance for floating point
            if abs(float(avc_val) - float(ref_val)) > 1e-6:
                mismatches.append({"param": param, "avc_value": avc_val, "ref_value": ref_val})
            else:
                match_count += 1
        else:
            avc_only.append({"param": param, "value": avc_val})

    # Params in reference but not generated by AVC
    missing_from_avc = sorted(k for k in ref if k not in avc)

    return {
        "mismatches":       mismatches,
        "missing_from_avc": missing_from_avc,
        "avc_only":         avc_only,
        "match_count":      match_count,
        "avc_total":        len(avc),
        "ref_total":        len(ref),
    }
