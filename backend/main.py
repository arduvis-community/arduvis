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
backend/main.py
AVC desktop backend — FastAPI + PyWebView launcher.
"""
import os, sys, threading, logging, subprocess, time
from pathlib import Path
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from routers import project, export, validate, mavlink, components

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)-8s %(name)s %(message)s", datefmt="%H:%M:%S")
log = logging.getLogger("avc")

def _find_frontend_dist() -> Path:
    """Locate frontend/dist whether running from source or a PyInstaller bundle."""
    # PyInstaller onefile: sys._MEIPASS is the temp extraction root
    if hasattr(sys, "_MEIPASS"):
        p = Path(sys._MEIPASS) / "frontend" / "dist"
        log.info("Bundle mode — MEIPASS=%s  frontend=%s  exists=%s",
                 sys._MEIPASS, p, p.exists())
        return p
    # Dev / editable install: main.py lives at backend/, so go up two levels
    p = Path(__file__).parent.parent / "frontend" / "dist"
    log.info("Dev mode — frontend=%s  exists=%s", p, p.exists())
    return p

FRONTEND_DIST = _find_frontend_dist()
USER_DATA    = Path.home() / ".avc"
for d in ["projects", "airframes", "exports"]:
    (USER_DATA / d).mkdir(parents=True, exist_ok=True)

PORT = 8374

@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("AVC backend starting — user data: %s", USER_DATA)
    yield
    log.info("AVC backend shutting down")

app = FastAPI(title="ArduPilot Visual Configurator", version="0.1.0", lifespan=lifespan)

app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"])

app.include_router(project.router,    prefix="/api/project",    tags=["project"])
app.include_router(export.router,     prefix="/api/export",     tags=["export"])
app.include_router(validate.router,   prefix="/api/validate",   tags=["validate"])
app.include_router(mavlink.router,    prefix="/api/mavlink",    tags=["mavlink"])
app.include_router(components.router, prefix="/api/components", tags=["components"])

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0", "user_data": str(USER_DATA)}

def _serve_index():
    idx = FRONTEND_DIST / "index.html"
    if idx.exists():
        return FileResponse(idx)
    # Debug info so we can diagnose path issues
    return {
        "error": "frontend not built",
        "frontend_dist": str(FRONTEND_DIST),
        "exists": FRONTEND_DIST.exists(),
        "meipass": getattr(sys, "_MEIPASS", None),
    }

@app.get("/", include_in_schema=False)
def serve_root():
    return _serve_index()

@app.get("/assets/{file_path:path}", include_in_schema=False)
def serve_asset(file_path: str):
    asset = FRONTEND_DIST / "assets" / file_path
    if asset.exists():
        return FileResponse(asset)
    from fastapi import HTTPException
    raise HTTPException(status_code=404, detail=f"Asset not found: {file_path}")

@app.get("/{full_path:path}", include_in_schema=False)
def serve_spa(full_path: str = ""):
    return _serve_index()

def _run_uvicorn():
    uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="warning")

def _wait_for_server(timeout: float = 5.0) -> bool:
    """Poll until the server accepts connections. Returns True on success."""
    import socket
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", PORT), timeout=0.2):
                return True
        except OSError:
            time.sleep(0.1)
    return False

def _kill_port(port: int) -> bool:
    """Kill any process listening on the given port. Returns True if a PID was killed."""
    try:
        if sys.platform == "win32":
            out = subprocess.check_output(["netstat", "-ano"], text=True, stderr=subprocess.DEVNULL)
            for line in out.splitlines():
                parts = line.split()
                if len(parts) >= 5 and f":{port}" in parts[1] and parts[3] == "LISTENING":
                    pid = int(parts[4])
                    subprocess.call(["taskkill", "/F", "/PID", str(pid)],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    log.info("Killed PID %d holding port %d", pid, port)
                    return True
        else:
            # macOS / Linux: lsof -ti tcp:<port> returns one PID per line
            out = subprocess.check_output(
                ["lsof", "-ti", f"tcp:{port}"],
                text=True, stderr=subprocess.DEVNULL,
            ).strip()
            if out:
                for pid_str in out.splitlines():
                    pid = int(pid_str.strip())
                    subprocess.call(["kill", "-9", str(pid)],
                                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    log.info("Killed PID %d holding port %d", pid, port)
                return True
    except Exception as e:
        log.warning("_kill_port(%d) failed: %s", port, e)
    return False

class JsApi:
    def save_file(self, filename: str, content: str) -> dict:
        """Open a native Save dialog and write content to the chosen path."""
        import webview
        window = webview.windows[0]
        result = window.create_file_dialog(
            webview.SAVE_DIALOG,
            directory=str(Path.home() / ".avc" / "exports"),
            save_filename=filename,
            file_types=("Parameter files (*.param)", "All files (*.*)"),
        )
        if not result:
            return {"cancelled": True, "path": None}
        path = Path(result[0] if isinstance(result, (list, tuple)) else result)
        path.write_text(content, encoding="utf-8")
        return {"cancelled": False, "path": str(path)}


def launch_desktop():
    import webview
    threading.Thread(target=_run_uvicorn, daemon=True).start()
    if not _wait_for_server(timeout=5.0):
        log.warning("Backend did not respond on port %d — killing port holder and retrying", PORT)
        _kill_port(PORT)
        time.sleep(0.5)
        threading.Thread(target=_run_uvicorn, daemon=True).start()
        if not _wait_for_server(timeout=8.0):
            log.error("Backend failed to start after retry — exiting")
            sys.exit(1)
    window = webview.create_window(
        title="ArduPilot Visual Configurator",
        url=f"http://127.0.0.1:{PORT}",
        width=1440, height=900, min_size=(1024, 700), resizable=True,
        text_select=False, js_api=JsApi())
    webview.start(debug=False)

if __name__ == "__main__":
    launch_desktop()
