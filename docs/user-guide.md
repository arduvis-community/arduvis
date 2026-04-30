# AVC Community Edition — User Guide

ArduPilot Visual Configurator (AVC) is a drag-and-drop tool for configuring ArduPilot flight controllers. Build your hardware layout on a canvas, configure each component in the Inspector, and export a ready-to-use `.param` file for Mission Planner, QGroundControl, or any compatible GCS.

This release targets **CubePilot Cube** flight controllers. One autopilot per project is supported in Community Edition.

---

## Contents

1. [Installation](#1-installation)
2. [Interface Overview](#2-interface-overview)
3. [Quick Start](#3-quick-start)
4. [Vehicle Types & Airframes](#4-vehicle-types--airframes)
5. [Components Reference](#5-components-reference)
6. [Wiring & Connections](#6-wiring--connections)
7. [CAN Topology View](#7-can-topology-view)
8. [Projects — Save, Open, New](#8-projects--save-open-new)
9. [Parameter Export & Import](#9-parameter-export--import)
10. [MAVLink Live Connection](#10-mavlink-live-connection)
11. [Limitations](#11-limitations)
12. [Contributing & Support](#12-contributing--support)

---

## 1. Installation

1. Download `AVC.exe` from the [Releases page](https://github.com/arduvis-community/arduvis/releases)
2. Run it — no installer required
3. Accept the disclaimer on first launch
4. To self-build from source, see [README.md](../README.md)

---

## 2. Interface Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  Toolbar                                                         │
├──────────────┬──────────────────────────────────┬───────────────┤
│              │                                  │               │
│   Palette    │           Canvas                 │   Inspector   │
│  (sidebar)   │                                  │   (sidebar)   │
│              │                                  │               │
└──────────────┴──────────────────────────────────┴───────────────┘
```

**Toolbar** — Vehicle type selector, project name, Palette/Topology mode buttons, wire toggle, MAVLink status, Export/Import .param buttons, and the File and Help menus.

**Palette (left sidebar)** — Two panels:
- *Vehicle Setup* (top): Configuration-only components — frame type, flight modes, failsafes, EKF, etc. These do not appear on canvas.
- *Physical Components* (bottom): Draggable hardware chips — autopilot, motors, ESCs, sensors, power, RC, peripherals.

**Canvas (centre)** — The airframe view. Drag physical components onto it to position them. Scroll to zoom, click-drag the background to pan. Switch to **Topology** mode from the toolbar to view the CAN bus network instead.

**Inspector (right sidebar)** — Shows the fields for the selected component. Required fields are marked with a red `*`. A green status dot means fully configured; amber means incomplete.

---

## 3. Quick Start

### Step 1 — Choose vehicle type
Select **Multirotor**, **Fixed Wing**, or **VTOL / QuadPlane** from the toolbar dropdown. The Palette updates to show only relevant components.

### Step 2 — Load an airframe view
In the Vehicle Setup panel, click the **Frame** component to open it in the Inspector. Click **Standard view…** to pick a built-in airframe diagram, or **Import image** to load your own PNG/JPG/SVG. The canvas background updates immediately.

### Step 3 — Drag components onto canvas
From the Physical Components panel, drag chips onto the canvas and position them over the airframe image. Motors, ESCs, sensors, and other hardware all work this way.

> Components cannot be dragged until a frame type and airframe image are set.

### Step 4 — Configure each component
Click a component chip on the canvas (or a Vehicle Setup item in the palette) to select it. Fill in all required fields in the Inspector. Fields with a red `*` must be completed before export.

Common required fields:
- **Autopilot**: Cube variant
- **Motor**: Motor number, ESC assignment
- **ESC**: Output pin, power source, connection type
- **GPS**: Connection type, port

### Step 5 — Verify CAN assignments
If you have DroneCAN devices (GPS, ESCs, battery monitor), click **Topology** in the toolbar to see the CAN bus diagram. Each leaf node should show a wire to the Flight Controller on CAN1 (solid blue) or CAN2 (dashed purple).

### Step 6 — Save the project
Click **💾** or **File → Save Project**. Enter a project name. The project is stored under `%USERPROFILE%\.avc\projects\` and includes the layout, airframe images, and a generated `.param` file. A `●` in the toolbar title indicates unsaved changes.

### Step 7 — Export .param
Click **Export .param** in the toolbar. The generated file can be loaded directly into Mission Planner *(Config → Full Parameter List → Load from File)* or QGroundControl *(Vehicle Setup → Parameters → Load from file)*.

> Always verify exported parameters on the bench before flying.

---

## 4. Vehicle Types & Airframes

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

You can also import a custom image (PNG, JPG, or SVG) for any airframe not in the list.

---

## 5. Components Reference

### Vehicle Setup

Configuration-only components. They appear in the top Palette panel and in the Inspector but have no canvas chip. Most map directly to ArduPilot parameter groups.

| Component | Purpose | Key parameters |
|---|---|---|
| Frame (Copter) | Frame class, type, motor count | `FRAME_CLASS`, `FRAME_TYPE` |
| Frame (Plane) | Fixed-wing options | `STALL_PREVENTION`, `AUTOTUNE` |
| Frame (QuadPlane / VTOL) | VTOL hybrid config | `Q_FRAME_CLASS`, `Q_FRAME_TYPE`, `Q_ENABLE` |
| Board Orientation | FC mounting angle | `AHRS_ORIENTATION` |
| Flight Controller (Board) | CubePilot board settings | `BRD_*` |
| Harmonic Notch Filter | Vibration damping | `INS_HNTCH_*` (Copter/VTOL) |
| Failsafe Configuration | Loss-of-signal behaviour | `FS_THR_*`, `FS_GCS_*` |
| Advanced Failsafe (AFS) | Extended safety system | `AFS_ENABLE`, `AFS_*` |
| Arming | Pre-flight arming checks | `ARMING_CHECK` |
| Flight Modes | Mode slot assignments | `FLTMODE1`–`FLTMODE6` |
| RC Channel Mapping | Channel → function | `RCMAP_*` |
| Compass / Magnetometer | Compass priorities, calibration flags | `COMPASS_*` |
| Barometer | Baro settings | `BARO_*` |
| Navigation Filter (EKF3) | Sensor fusion options | `EK3_*` |
| CAN / DroneCAN | DroneCAN driver, node allocation | `CAN_D1_PROTOCOL`, `CAN_P1_*` |
| GeoFence | Boundary limits | `FENCE_*` |
| Data Logging | SD card log parameters | `LOG_*` |
| Pilot Control (Copter) | Stick sensitivity, expo | `PILOT_*` |
| Attitude Controller | PID gains (Copter/VTOL) | `ATC_*` |
| Position Controller | Position hold gains | `PSC_*` |
| WP Navigation | Waypoint nav speeds | `WPNAV_*` |
| RTL Configuration | Return-to-launch behaviour | `RTL_*` |
| Takeoff & Landing (Plane) | Plane launch/land params | `TKOFF_*`, `LAND_*` |
| Terrain Following | Terrain avoidance | `TERRAIN_*` |
| Obstacle Avoidance | Proximity sensor config | `PRX_*`, `AVOID_*` |
| Gimbal / Camera Mount | Stabilised mount | `MNT_*` |
| Servo Outputs | Pin-to-servo function table | `SERVOn_FUNCTION` |
| Crash Detection | Crash event triggers | `FS_CRASH_CHECK` |
| Lua Scripting | Script enable flags | `SCR_ENABLE` |

### Autopilot

| Component | Purpose | Key fields |
|---|---|---|
| CubePilot Cube | Flight controller (one per project) | Cube variant (Orange+, Orange, Purple, Yellow, etc.) |

### Propulsion

| Component | Purpose | Key fields | Vehicles |
|---|---|---|---|
| Motor | Brushless motor | Motor number (1–12), spin direction, ESC assignment | Copter, VTOL |
| ESC | Electronic Speed Controller | Output pin, connection type (PWM / DroneCAN), power source, assigned motors | All |
| Servo | Control surface actuator | Output pin, servo function, PWM range, reversed | All |
| Traditional Helicopter | Heli rotor control | Swashplate type, rotor speed | Heli |

### Sensors

| Component | Purpose | Key fields | Vehicles |
|---|---|---|---|
| GPS / Compass | GNSS + magnetometer | Connection type, port, orientation | All |
| Airspeed Sensor | Dynamic pressure (IAS) | Type, port | Plane, VTOL |
| Rangefinder / Lidar | Altitude above terrain | Type, port, min/max range, orientation | All |
| Optical Flow | Velocity sensing | Port | Copter, VTOL |
| RPM Sensor | Motor RPM measurement | Port, pin, pulses-per-revolution | All |

### Power

| Component | Purpose | Key fields |
|---|---|---|
| Battery | LiPo / LiFe pack | Preset, cell count, capacity (mAh) |
| Battery Monitor | Voltage + current sensing | Type (Analog / DroneCAN), voltage pin, current pin |
| Power Distribution Board | Power distribution | Current pin, voltage pin, battery assignment, FC power rails |

### RC & GCS

| Component | Purpose | Key fields |
|---|---|---|
| RC Input | Radio receiver | Port, protocol (SBUS / DSMX / CRSF / PPM / etc.) |
| Telemetry Radio | Wireless GCS link | Port, baud rate, net ID |
| Companion Computer | Secondary onboard computer | Port, baud rate, protocol |

### Peripherals

| Component | Purpose | Key fields | Vehicles |
|---|---|---|---|
| LED / Buzzer | Status lights and tones | Port, LED type, buzzer pin | All |
| Camera Trigger | Mission photo trigger | Port, trigger type | All |
| Parachute | Emergency descent | Servo pin, deploy altitude | Copter, VTOL |
| Landing Gear | Retractable gear | Servo pin, servo function | All |
| Relay / GPIO | Digital output control | Pin, function, logic type | All |
| ADS-B Transponder | Aircraft identification | Port, baud rate, ICAO address | All |
| OSD | On-screen display | Protocol, port | All |
| Sprayer | Crop spray system | Pin, spray type | Copter |

---

## 6. Wiring & Connections

AVC draws visual wires between related components when you configure assignment fields. Toggle wires on/off with the **Wires** button in the toolbar.

| Wire | Assignment field | Colour | Description |
|---|---|---|---|
| Motor → ESC | `esc_assignment` | Red (2 px) | 3-phase motor power |
| ESC → power source | `power_source` | Red (2.5 px) | Power from battery or PDB |
| ESC → FC output | `output_fc` + `output_pin` | Amber (3 strands) | PWM signal to FC servo rail |
| PDB → battery | `battery_assignment` | Red (2.5 px) | Main battery feed |
| PDB → FC (BEC) | `fc_power_rails` | Red (2.5 px) | FC power from BEC |
| Battery monitor → battery | `battery_source` | Gray (2 strands) | Sense wire |
| DroneCAN device → FC | `fc_assignment` + `can_bus` | Blue / Purple | CAN1 (solid blue), CAN2 (dashed purple) |

Wire opacity: when a component is selected its wires are bright; unrelated wires dim to 10%.

**Power routing** — Power wires route via top/bottom block edges to stay out of the signal-wire lanes. Signal wires (PWM, serial, I²C) use left/right edges.

---

## 7. CAN Topology View

Click **Topology** in the toolbar to switch from the canvas to the CAN bus diagram.

- The **Flight Controller** appears on the left
- **DroneCAN leaf nodes** (GPS, ESCs, battery monitors, etc.) appear on the right
- A **solid blue line** = CAN1; a **dashed purple line** = CAN2
- Devices with `dual_bus` enabled show connections to both buses

Click any node in the topology view to select it and configure it in the Inspector. Click **Palette** to return to the canvas.

Each DroneCAN device needs:
1. `fc_assignment` → select the flight controller it connects to
2. `can_bus` → select CAN1 or CAN2

---

## 8. Projects — Save, Open, New

**Storage location:** `%USERPROFILE%\.avc\projects\<project-name>\`

Each saved project contains:
- `layout.json` — component positions, field values, canvas zoom/pan state
- `airframe_top.<ext>` — top-view background image
- `airframe_bottom.<ext>` — bottom-view image (if set)
- `<name>.param` — auto-generated ArduPilot parameter file

**Save:** Click **💾** or **File → Save Project**. A `●` in the toolbar indicates unsaved changes.

**Open:** **File → Open Project** → select from the list of saved projects.

**New:** **File → New Project** — warns if there are unsaved changes.

---

## 9. Parameter Export & Import

### Exporting

Click **Export .param** in the toolbar. A standard ArduPilot `.param` file is generated and saved via a file dialog.

The file contains:
- A header with date, vehicle type, and AVC version
- One `PARAM_NAME,value` pair per line
- All parameters derived from configured components
- Any parameters from a previous import that AVC does not manage (calibration data, PID tuning, etc.) are preserved and re-emitted

Load the file in:
- **Mission Planner**: Config → Full Parameter List → Load from File
- **QGroundControl**: Vehicle Setup → Parameters → Load from file

### Importing

Click **Import .param** in the toolbar. Select an existing `.param` file.

A preview modal shows:
- **Left pane**: Components detected from the parameters
- **Right pane**: Raw parameter table

Click **Apply to canvas** to create a new project with the imported configuration. All unrecognised parameters are stored and will be preserved on next export — nothing is discarded.

---

## 10. MAVLink Live Connection

AVC can connect to a running GCS (Mission Planner, QGroundControl) via MAVLink TCP to upload or pull parameters directly without a file.

**To connect:**
1. Click the **MP disconnected** pill in the toolbar
2. Enter host (`127.0.0.1` for local), port (`5762` for Mission Planner TCP), and protocol (TCP/UDP)
3. Click **Connect**

**Upload Params** — sends the AVC configuration to the vehicle in real time.

**Pull Params** — retrieves current parameters from the vehicle into AVC.

> Mission Planner must be connected to the FC before AVC can connect to it. In Mission Planner, enable TCP server via **Ctrl+F → Mavlink → TCP Host**.

---

## 11. Limitations

- **One CubePilot Cube per project** — Community Edition enforces a single-autopilot limit
- **CubePilot Cube hardware only** — other flight controllers are not supported in this beta
- **Windows is the primary target** — macOS and Linux builds are provided but untested in this release
- **Beta software** — always verify all exported parameters on the bench before flying. Never rely solely on AVC for safety-critical configuration

---

## 12. Contributing & Support

**Bug reports and feature requests:** [GitHub Issues](https://github.com/arduvis-community/arduvis/issues)

**Contributing code:**
1. Fork the repository
2. Make your changes on a branch
3. Open a pull request — describe what you changed and why
4. All contributions must be compatible with GPL-3.0

**Do not** include Patternlynx brand assets in contributions — see [TRADEMARKS.md](../TRADEMARKS.md).

**License:** GNU General Public License v3.0 — see [LICENSE](../LICENSE).
