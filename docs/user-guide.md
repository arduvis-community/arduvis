# AVC Community Edition — User Guide

ArduPilot Visual Configurator (AVC) is a drag-and-drop tool for configuring ArduPilot flight controllers. Build your hardware layout on a canvas, configure each component in the Inspector, and export a ready-to-use `.param` file for Mission Planner, QGroundControl, or any compatible GCS.

This release targets **CubePilot Cube** flight controllers running **ArduPilot 4.7 or later**. One autopilot per project is supported in Community Edition.

---

## Contents

1. [Installation](#1-installation)
2. [Interface Overview](#2-interface-overview)
3. [Quick Start](#3-quick-start)
4. [Setup Checklist](#4-setup-checklist)
5. [Vehicle Types & Airframes](#5-vehicle-types--airframes)
6. [Components Reference](#6-components-reference)
7. [Inspector & Parameter Fields](#7-inspector--parameter-fields)
8. [Wiring & Connections](#8-wiring--connections)
9. [CAN Topology View](#9-can-topology-view)
10. [Projects — Save, Open, New](#10-projects--save-open-new)
11. [Parameter Export & Import](#11-parameter-export--import)
12. [Parameter Browser](#12-parameter-browser)
13. [Parameter Comparison](#13-parameter-comparison)
14. [MAVLink & USB Connection](#14-mavlink--usb-connection)
15. [Limitations](#15-limitations)
16. [Contributing & Support](#16-contributing--support)

---

## 1. Installation

1. Download `AVC.exe` from the [Releases page](https://github.com/arduvis-community/arduvis/releases)
2. Run it — no installer required
3. Accept the disclaimer on first launch
4. To self-build from source, see [README.md](../README.md)

**Requirements:** Windows 10/11. An internet connection is required on first launch to load the Inter font; subsequent launches work offline.

---

## 2. Interface Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Toolbar: File  💾  CubePilot Cube  [Vehicle]  [Project]                 │
│           Palette  Inspector  Params  Checklist  Topology  Wires          │
│                                       MP disconnected  Export  Import     │
├──────────────┬───────────────────────────────────────────┬───────────────┤
│              │                                           │               │
│   Palette    │               Canvas                      │   Inspector   │
│  (sidebar)   │       (dot-grid background)               │   (sidebar)   │
│              │                                           │               │
│  Vehicle     │  BETA — Not validated for flight use      │               │
│  Setup       │                                           │               │
│              │          [Zoom controls]                  │               │
└──────────────┴───────────────────────────────────────────┴───────────────┘
```

**Toolbar** — Two rows on narrow windows. Top row: File menu, save button, hardware badge, vehicle selector, project name. Second row: panel toggles (Palette, Inspector, Params, Checklist, Topology, Wires), connection status, and export/import buttons.

**Palette (left sidebar)** — Two panels:
- *Vehicle Setup* (top): Configuration-only components — frame type, flight modes, failsafes, EKF, etc.
- *Physical Components* (bottom): Draggable hardware chips — autopilot, motors, ESCs, sensors, power, RC, peripherals.

Status dots beside each component: **●** green = fully configured, **◉** amber = present but incomplete, **○** gray = not on canvas.

**Canvas (centre)** — The airframe view. Drag physical components onto it to position them. Scroll to zoom, click-drag the background to pan. A subtle dot grid helps with alignment.

**Inspector (right sidebar)** — Shows the fields for the selected component. Required fields are marked with a red `*`.

**Checklist, Params panels** — Alternative right-side panels toggled from the toolbar (see sections 4 and 12).

---

## 3. Quick Start

### Step 1 — Open the Setup Checklist
Click **Checklist** in the toolbar. This panel guides you through each required configuration step for your vehicle type.

### Step 2 — Choose vehicle type
Select **Multirotor**, **Fixed Wing**, or **VTOL / QuadPlane** from the toolbar dropdown.

### Step 3 — Load an airframe view
Click **Standard Views** (or the Airframe step in the Checklist). Pick a built-in airframe diagram — this sets the canvas background and auto-populates frame class/type fields.

### Step 4 — Drag components onto canvas
From the Physical Components panel, drag chips onto the canvas. Components cannot be dragged until a frame type and airframe image are set.

### Step 5 — Configure each component
Click any component chip to select it and fill in the Inspector. Required fields (red `*`) must be completed. The Checklist tracks overall progress.

### Step 6 — Verify before export
Click **Export .param**. A safety check runs automatically. Any missing or conflicting configuration is shown in a modal before the file is generated.

### Step 7 — Load the exported file
- **Mission Planner**: Config → Full Parameter List → Load from File
- **QGroundControl**: Vehicle Setup → Parameters → Load from file

> **Always verify exported parameters on the bench before flying.**

---

## 4. Setup Checklist

Click **Checklist** in the toolbar to open the guided setup panel on the right side.

The checklist shows all required and optional steps for the selected vehicle type, with live status:

| Icon | Meaning |
|------|---------|
| ✓ green | Component present and all required fields filled |
| ◉ amber | Component added but Inspector fields incomplete |
| ○ gray | Component not yet on the canvas |

**Clicking a step** that has a component selects it and opens the Inspector. Clicking the Airframe step opens the Standard Views selector.

A progress bar shows required steps complete / total required. A green banner appears when all required steps are done and the project is ready to export.

### Steps per vehicle type

**Multirotor:** Airframe → Flight Controller → Board Orientation → Motors → ESCs → Battery Monitor → RC Input → GPS *(optional)* → Flight Modes → Failsafe → Arming *(optional)*

**Fixed Wing:** Airframe → Flight Controller → Board Orientation → Motor → ESC → Servo Outputs → Battery Monitor → RC Input → GPS → Flight Modes → Failsafe → Airspeed *(optional)*

**VTOL / QuadPlane:** Airframe → Flight Controller → Board Orientation → QuadPlane Setup → Motors → ESCs → Servo Outputs → Battery Monitor → RC Input → GPS → Flight Modes → Failsafe

---

## 5. Vehicle Types & Airframes

Select a vehicle type in the toolbar. This determines which frame components and physical components appear in the Palette.

| Vehicle type | ArduPilot firmware | Frame component |
|---|---|---|
| Multirotor | ArduCopter | Frame (Copter) |
| Fixed Wing | ArduPlane | Frame (Plane) |
| VTOL / QuadPlane | ArduPlane + Q_ params | Frame (QuadPlane / VTOL) |

### Built-in standard views

**Copter** — Quad X, Quad +, Hex X, Hex +, Octa X, Octa +, X8 Coaxial, Y6 Coaxial, Tricopter, Bicopter

**Plane** — Fixed Wing, Flying Wing, Twin Pusher

**VTOL** — QuadPlane, Tilt-Rotor, Tailsitter, Fixed Wing

Selecting a standard view auto-populates `FRAME_CLASS` / `FRAME_TYPE` (or `Q_FRAME_CLASS` / `Q_FRAME_TYPE` for VTOL) in the exported `.param` file.

---

## 6. Components Reference

### Vehicle Setup

Configuration-only components. They appear in the top Palette panel and Inspector but have no canvas chip.

| Component | Purpose | Key parameters |
|---|---|---|
| Frame (Copter) | Frame class, type, motor count | `FRAME_CLASS`, `FRAME_TYPE` |
| Frame (Plane) | Fixed-wing options | `STALL_PREVENTION`, `AUTOTUNE` |
| Frame (QuadPlane / VTOL) | VTOL hybrid config | `Q_FRAME_CLASS`, `Q_ENABLE` |
| Board Orientation | FC mounting angle | `AHRS_ORIENTATION` |
| Flight Controller (Board) | CubePilot board settings | `BRD_*` |
| Harmonic Notch Filter | Vibration damping | `INS_HNTCH_*` |
| Failsafe Configuration | Loss-of-signal behaviour | `FS_THR_*`, `FS_GCS_*` |
| Arming | Pre-flight arming checks | `ARMING_*` |
| Flight Modes | Mode slot assignments | `FLTMODE1`–`FLTMODE6` |
| RC Channel Mapping | Channel → function | `RCMAP_*` |
| Navigation Filter (EKF3) | Sensor fusion options | `EK3_*` |
| CAN / DroneCAN | DroneCAN driver | `CAN_D1_PROTOCOL`, `CAN_P1_*` |
| Attitude Controller | PID gains (Copter/VTOL) | `ATC_*` |
| Position Controller | Position hold gains | `PSC_*` |
| WP Navigation | Waypoint nav speeds | `WPNAV_*` |
| RTL Configuration | Return-to-launch behaviour | `RTL_*` |

### Physical Components (canvas)

| Category | Component | Key fields |
|---|---|---|
| Autopilot | CubePilot Cube | Cube variant |
| Propulsion | Motor | Motor number, spin direction |
| Propulsion | ESC | Output pin, connection type, power source |
| Propulsion | Servo | Output pin, servo function, PWM range |
| Sensors | GPS / Compass | Connection type, port, orientation |
| Sensors | Airspeed Sensor | Type, port |
| Sensors | Rangefinder / Lidar | Type, port, range |
| Power | Battery Monitor | Type, voltage pin, current pin |
| Power | Battery | Cell count, capacity |
| RC & GCS | RC Input | Port, protocol |
| RC & GCS | Telemetry Radio | Port, baud rate |
| Peripherals | LED / Buzzer | Port, LED type |
| Peripherals | ADS-B Transponder | Port, baud rate, ICAO |

---

## 7. Inspector & Parameter Fields

Click any component (canvas chip or Palette item) to open it in the Inspector.

**Simple / Full mode** — A toggle in the Inspector header switches between Simple (hides advanced PID, EKF, and logging fields) and Full (shows everything). Simple is the default.

**Required fields** — Marked with a red `*`. The component's status dot will not turn green until all required fields are filled.

**Field types:**
- **Select / Dropdown** — choose from a fixed list of valid options
- **Number** — numeric entry with min/max range shown
- **Toggle** — on/off switch
- **Bitmask** — individual checkboxes for each flag bit
- **Pin selector** — visual grid of MAIN OUT and AUX OUT pins

**Defaults** — Fields show the ArduPilot default value when nothing is set. These are reference values only. Tuning parameters (PIDs, EKF noise values, notch filter ratios) must be set explicitly — they are not included in the export unless you fill them in.

---

## 8. Wiring & Connections

AVC draws visual wires between related components. Toggle wires with the **Wires** button.

| Wire | Colour | Description |
|---|---|---|
| Motor → ESC | Red (2 px) | 3-phase motor power |
| ESC / component → FC | Amber (3 strands) | PWM/DSHOT signal |
| Power bus | Red (2.5 px) | Battery, PDB, ESC power |
| DroneCAN → FC | Blue / Purple | CAN1 solid, CAN2 dashed |

When a component is selected, its wires are highlighted; all others dim to 10%. When exactly one flight controller is on canvas, PWM wires connect to it automatically — no manual FC assignment needed.

---

## 9. CAN Topology View

Click **Topology** in the toolbar. The Flight Controller appears on the left; DroneCAN leaf nodes on the right. Solid blue = CAN1; dashed purple = CAN2.

Each DroneCAN device needs:
1. `fc_assignment` → select the flight controller
2. `can_bus` → select CAN1 or CAN2

Click any node to configure it in the Inspector. Click **Palette** to return to the canvas.

---

## 10. Projects — Save, Open, New

**Storage location:** `%USERPROFILE%\.avc\projects\<project-name>\`

Each project contains layout, component fields, airframe images, and a generated `.param` file.

- **Save:** Click **💾** or **File → Save Project**
- **Open:** **File → Open Project**
- **New:** **File → New Project** (warns if unsaved changes)

A `●` in the toolbar indicates unsaved changes.

---

## 11. Parameter Export & Import

### Exporting

Click **Export .param**. Before generating the file, AVC runs a safety check:

**Errors (block export):**
- No flight controller on canvas
- No motors or ESCs (copter/VTOL)
- No Failsafe component configured
- Two components assigned to the same output pin

**Warnings (advisory — "Export anyway" option available):**
- Failsafe component added but no actions configured
- GPS-dependent flight modes (Loiter, Auto, RTL) without a GPS component
- Imported baseline params will be re-exported unchanged

If the check passes, the `.param` file is generated immediately.

### +defaults checkbox

The `+defaults` checkbox next to Export includes ArduPilot default values for all configured fields. **Note:** Tuning parameters (PIDs, EKF noise, notch filter ratios) are never exported as defaults — only values you explicitly set in the Inspector are included for those components.

### Importing

Click **Import .param** and select a `.param` file from Mission Planner, QGroundControl, or another source.

A preview modal shows detected components and the raw parameter table. Click **Apply to canvas** to create a new project.

**Note:** Disabled sensors are automatically skipped — `BATT2_MONITOR=0`, `RNGFND1_TYPE=0`, etc. will not create components.

All unrecognised parameters (calibration data, PID tuning, etc.) are stored and re-emitted on next export — nothing is discarded.

---

## 12. Parameter Browser

Click **Params** in the toolbar to open the full ArduPilot parameter browser (5,691 copter / 5,729 plane parameters from the official ArduPilot source).

- **Search** by parameter name or description
- Parameters are **grouped by prefix** (EK3, ATC, GPS, etc.) with expand/collapse controls
- **Enum params** show a dropdown of valid values
- **Bitmask params** show individual checkboxes
- **Range** shown in the description area
- Parameters you set are **highlighted in blue** and included in the next export

The Params panel is the place to configure any parameter not covered by a component in the Inspector.

---

## 13. Parameter Comparison

Click **Compare** in the toolbar and select a `.param` file from a real vehicle (from Mission Planner's "Save to file" or a backup).

The comparison modal shows:
- **⚠ Mismatches** — same parameter, different value between AVC and the reference. These are the most actionable: they indicate where AVC would change the current FC configuration.
- **ℹ AVC only** — parameters AVC generates that the reference doesn't include.
- **○ Missing from AVC** — parameters in the reference not generated by AVC. This list will always be large: AVC only emits parameters for configured components, while a full FC backup contains every parameter. Use the Params panel to set any specific ones you need.
- **✅ Matches** — count of parameters where AVC and the reference agree.

Use the comparison tool to validate AVC output against a known-good configuration before uploading to a new flight controller.

---

## 14. MAVLink & USB Connection

Click the **MP disconnected** pill in the toolbar to open the connection modal.

### USB (Web Serial) — direct connection to CubePilot

1. Select the **USB** tab
2. Choose baud rate (default 115200 for CubePilot USB)
3. Click **Select USB port…** — your browser's port picker opens
4. Select the CubePilot serial port
5. The pill changes to **USB connected**

No Mission Planner required. The CubePilot must not be claimed by another application (Mission Planner, ArduPilot Terminal, etc.) at the same time.

### TCP / UDP — via Mission Planner

1. Select the **TCP / UDP** tab
2. Enter host (`127.0.0.1`), port (`5762` for Mission Planner), and protocol
3. Click **Connect**

Mission Planner must be connected to the FC first. Enable TCP server via **Ctrl+F → Mavlink → TCP Host** in Mission Planner.

### Upload / Pull (both connection types)

**Upload params to FC** — generates the AVC parameter list and sends it directly to the flight controller. Parameters are uploaded one by one.

**Pull params from FC** — downloads all current parameters from the vehicle and reconstructs the canvas: components are placed, fields populated, and baseline params stored. The result is equivalent to importing a `.param` file from the vehicle. The current project is replaced.

---

## 15. Limitations

- **One CubePilot Cube per project** — Community Edition enforces a single-autopilot limit
- **CubePilot Cube hardware only** — other flight controllers are not supported in this beta
- **ArduPilot 4.7+ required** — older firmware is not supported
- **Windows is the primary target** — macOS and Linux builds are provided but untested
- **Beta software** — parameters have not been independently validated. Always verify all exported parameters against ArduPilot documentation before flight. Never rely solely on AVC for safety-critical configuration
- **USB Web Serial** requires a Chromium-based browser WebView (built into the EXE on Windows 10/11)

---

## 16. Contributing & Support

**Bug reports and feature requests:** [GitHub Issues](https://github.com/arduvis-community/arduvis/issues)

**Email:** avc@patternlynx.com

**Contributing code:**
1. Fork the repository
2. Make your changes on a branch
3. Open a pull request — describe what you changed and why
4. All contributions must be compatible with GPL-3.0

Do not include Patternlynx brand assets in contributions — see [TRADEMARKS.md](../TRADEMARKS.md).

**License:** GNU General Public License v3.0 — see [LICENSE](../LICENSE).
