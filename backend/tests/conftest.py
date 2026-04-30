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
conftest.py — shared fixtures for the AVC backend test suite.

Run from the backend/ directory:
    ../.venv/Scripts/pytest tests/ -v
"""

import sys
import json
import shutil
from pathlib import Path

# ── Make sure "backend/" is on sys.path so top-level imports work ─────────────
TESTS_DIR   = Path(__file__).parent
BACKEND_DIR = TESTS_DIR.parent
for _p in (str(BACKEND_DIR), str(TESTS_DIR)):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import pytest
from starlette.testclient import TestClient

from app import create_app


# ── App / client ──────────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def app():
    return create_app(dev=True)


@pytest.fixture(scope="session")
def client(app):
    return TestClient(app, raise_server_exceptions=True)


# ── Redirect file-system writes to a temp dir ─────────────────────────────────

@pytest.fixture()
def isolated_dirs(tmp_path, monkeypatch):
    """
    Redirect PROJECTS_DIR and EXPORTS_DIR to a temp directory so tests
    never touch ~/.avc/ on the developer's machine.
    """
    projects = tmp_path / "projects"
    exports  = tmp_path / "exports"
    projects.mkdir()
    exports.mkdir()

    import routers.project as proj_router
    import routers.export  as exp_router

    monkeypatch.setattr(proj_router, "PROJECTS_DIR", projects)
    monkeypatch.setattr(exp_router,  "EXPORTS_DIR",  exports)

    return {"projects": projects, "exports": exports}
