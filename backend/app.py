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
app.py
────────────────────────────────────────────────────────────────────────────────
FastAPI application factory.

All route modules are registered here. Adding a new feature = create a new
router in routers/ and add one line here.
"""

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# ── Router imports ────────────────────────────────────────────────────────────
from routers import components, frames, project, export, validate, mavlink


def create_app(dev: bool = False) -> FastAPI:
    app = FastAPI(
        title="AVC API",
        version="0.1.0",
        description="ArduPilot Visual Configurator backend",
        # Disable docs UI in production
        docs_url="/docs" if dev else None,
        redoc_url=None,
    )

    # ── CORS ─────────────────────────────────────────────────────────────────
    # In dev, Vite runs on port 5173. Allow it.
    # In prod, the React UI is served from the same origin so CORS isn't needed,
    # but we keep a tight allow-list anyway.
    origins = (
        ["http://localhost:5173", "http://127.0.0.1:5173"]
        if dev
        else ["http://127.0.0.1:8374"]
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── API routes ────────────────────────────────────────────────────────────
    app.include_router(components.router, prefix="/api/components", tags=["components"])
    app.include_router(frames.router,     prefix="/api/frames",     tags=["frames"])
    app.include_router(project.router,    prefix="/api/project",    tags=["project"])
    app.include_router(export.router,     prefix="/api/export",     tags=["export"])
    app.include_router(validate.router,   prefix="/api/validate",   tags=["validate"])
    app.include_router(mavlink.router,    prefix="/api/mavlink",    tags=["mavlink"])

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/api/health")
    def health():
        return {"status": "ok", "version": "0.1.0"}

    # ── Serve React build in production ───────────────────────────────────────
    if not dev:
        bundle_dir = Path(getattr(sys, "_MEIPASS", Path(__file__).parent.parent))
        dist = bundle_dir / "frontend" / "dist"
        if dist.exists():
            # Serve static assets (JS, CSS, images).
            app.mount("/assets", StaticFiles(directory=str(dist / "assets")), name="assets")

            # Catch-all: serve index.html for any non-API route (React Router SPA).
            from fastapi.responses import FileResponse

            @app.get("/{full_path:path}")
            def serve_react(full_path: str):
                index = dist / "index.html"
                return FileResponse(str(index))

    return app
