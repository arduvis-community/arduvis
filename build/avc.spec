# -*- mode: python ; coding: utf-8 -*-
"""
build/avc.spec
PyInstaller spec for AVC desktop app.

Build commands:
  Windows : pyinstaller build/avc.spec --distpath dist/windows
  macOS   : pyinstaller build/avc.spec --distpath dist/macos
  Linux   : pyinstaller build/avc.spec --distpath dist/linux

The built React frontend must exist at frontend/dist/ before running.
Run `cd frontend && npm run build` first.
"""
import sys
from pathlib import Path

ROOT = Path(SPECPATH).parent  # repo root
BACKEND = ROOT / "backend"
FRONTEND_DIST = ROOT / "frontend" / "dist"

block_cipher = None

a = Analysis(
    [str(BACKEND / "main.py")],
    pathex=[str(ROOT), str(BACKEND)],
    binaries=[],
    datas=[
        # Bundle the built React app
        (str(FRONTEND_DIST), "frontend/dist"),
        # Bundle ArduPilot data files
        (str(BACKEND / "data"), "backend/data"),
    ],
    hiddenimports=[
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "fastapi",
        "pydantic",
        "webview",
        "webview.platforms",
        # pymavlink — dialects are loaded dynamically so must be listed explicitly
        "pymavlink",
        "pymavlink.mavutil",
        "pymavlink.mavparm",
        "pymavlink.dialects",
        "pymavlink.dialects.v20",
        "pymavlink.dialects.v20.ardupilotmega",
        "pymavlink.dialects.v20.common",
        "pymavlink.generator",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "numpy", "pandas"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

# ── Platform-specific output ──────────────────────────────────────────────────

if sys.platform == "darwin":
    # macOS: create .app bundle
    exe = EXE(pyz, a.scripts, [], exclude_binaries=True,
              name="AVC", debug=False, bootloader_ignore_signals=False,
              strip=False, upx=True, console=False,
              icon=str(ROOT / "build" / "icons" / "avc.icns"))
    coll = COLLECT(exe, a.binaries, a.zipfiles, a.datas,
                   strip=False, upx=True, upx_exclude=[], name="AVC")
    app  = BUNDLE(coll, name="AVC.app", icon=str(ROOT / "build" / "icons" / "avc.icns"),
                  bundle_identifier="org.ardupilot.avc",
                  info_plist={
                      "CFBundleName": "ArduPilot Visual Configurator",
                      "CFBundleShortVersionString": "0.1.0",
                      "NSHighResolutionCapable": True,
                  })

elif sys.platform == "win32":
    # Windows: single .exe
    exe = EXE(pyz, a.scripts, a.binaries, a.zipfiles, a.datas, [],
              name="AVC",
              debug=False, bootloader_ignore_signals=False,
              strip=False, upx=True, upx_exclude=[], runtime_tmpdir=None,
              console=False, disable_windowed_traceback=False,
              argv_emulation=False, target_arch=None, codesign_identity=None,
              entitlements_file=None,
              icon=str(ROOT / "build" / "icons" / "avc.ico"))

else:
    # Linux: directory bundle (wrap in AppImage separately)
    exe = EXE(pyz, a.scripts, [], exclude_binaries=True,
              name="avc", debug=False, bootloader_ignore_signals=False,
              strip=False, upx=True, console=False)
    coll = COLLECT(exe, a.binaries, a.zipfiles, a.datas,
                   strip=False, upx=True, upx_exclude=[], name="avc")
