# AVC Community Edition — ArduPilot Visual Configurator
# Copyright (C) 2026 Patternlynx Limited
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.

"""
routers/validate.py  (Community Edition)
CE validation: enforces single-autopilot limit at the server level.
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any

router = APIRouter()

class ValidateRequest(BaseModel):
    components: list[dict[str, Any]]
    vehicle_type: str
    frame_info: dict[str, Any] | None = None

class ValidationResult(BaseModel):
    valid: bool
    errors: list[dict]
    warnings: list[dict]

@router.post("", response_model=ValidationResult)
def validate(req: ValidateRequest):
    errors   = []
    warnings = []

    # CE hard limit: only one autopilot supported
    fc_count = sum(1 for c in req.components if c.get("defId") == "autopilot_cube")
    if fc_count > 1:
        errors.append({
            "component_id": None,
            "field": "autopilot_cube",
            "message": "Community Edition supports one autopilot only.",
        })

    for c in req.components:
        if c.get("needsPin") and not c.get("outputPin"):
            errors.append({
                "component_id": c.get("id"),
                "field": "outputPin",
                "message": f"{c.get('label', 'Component')} has no output pin assigned.",
            })

    return ValidationResult(valid=len(errors) == 0, errors=errors, warnings=warnings)
