# ArduPilot Visual Configurator (AVC) — Community Edition

> **Beta** — Active development. Always verify exported parameters on the bench before flying.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

AVC is a visual drag-and-drop tool for configuring ArduPilot flight controllers.
Build your hardware layout on a canvas, set parameters through the Inspector,
and export a ready-to-use `.param` file.

📖 **[User Guide](docs/user-guide.md)** — full walkthrough, components reference, and workflow documentation.

**Community Edition** — free and open-source under the GNU GPL v3.
Enterprise support and branded builds are available separately (see below).

Copyright © 2026 Patternlynx Limited. See [TRADEMARKS.md](TRADEMARKS.md) for
brand usage terms.

---

## Project structure

```
arduvis/
├── backend/          Python / FastAPI
│   ├── main.py       App entry point + PyWebView launcher
│   ├── app.py        FastAPI application factory
│   ├── routers/      API routes (project, export, validate, mavlink, frames)
│   └── data/         ArduPilot component definitions and param mappings
├── frontend/         React / Vite / Tailwind / Konva
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api/      Fetch wrapper
│   │   ├── store/    Zustand global state
│   │   └── components/
│   └── package.json
├── build/
│   └── avc.spec      PyInstaller spec (Windows single EXE)
├── LICENSE           GNU GPL v3
└── TRADEMARKS.md     Patternlynx brand usage terms
```

---

## Self-compilation

### Prerequisites

- Python 3.11+ with `venv`
- Node 18+
- Windows (primary target; macOS/Linux builds untested in this release)

### 1 — Install dependencies

```bash
# Python backend
cd backend
python -m venv .venv
.venv/Scripts/activate        # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

# React frontend
cd ../frontend
npm install
```

### 2 — Run in development mode

```bash
# Terminal A — FastAPI backend (must use venv Python):
backend/.venv/Scripts/python.exe -c \
  "import uvicorn, sys; sys.path.insert(0,'backend'); \
   from app import create_app; app=create_app(dev=True); \
   uvicorn.run(app, host='127.0.0.1', port=8374)"

# Terminal B — React dev server:
cd frontend && npm run dev
```

Open <http://localhost:5173> in your browser.

### 3 — Build the desktop EXE (Windows)

```bash
# Kill any running AVC or Python processes first, then:
cd frontend && npm run build
cd ..
backend/.venv/Scripts/pyinstaller build/avc.spec \
  --distpath dist/windows --workpath build/tmp --clean
# Output: dist/windows/AVC.exe
```

### 4 — Run the test suite

```bash
cd backend
.venv/Scripts/pytest tests/ -v
```

---

## Hardware support

This beta release targets **CubePilot Cube** flight controllers only.
Other hardware is unsupported and may produce incorrect results.

---

## Contributing

Contributions are welcome under the GPL-3.0 terms.

- Open an issue before starting significant work so we can align on approach.
- All contributed code must be compatible with GPL-3.0.
- Do not include Patternlynx brand assets in contributions (see [TRADEMARKS.md](TRADEMARKS.md)).
- Bug reports: <avc@patternlynx.com>

---

## Community vs Enterprise

| | Community Edition | Enterprise / Paid Support |
|---|---|---|
| Source code | Open (GPL-3.0) | Proprietary |
| Cost | Free | Contact us |
| Branding | Patternlynx (trademark protected) | Custom / white-label |
| Support | Community issues | Dedicated |
| Contact | GitHub Issues | <avc@patternlynx.com> |

---

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).

The Patternlynx name and logo are proprietary trademarks — see [TRADEMARKS.md](TRADEMARKS.md).
