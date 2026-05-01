# AVC Community Edition — Changelog

All notable changes to this project are documented here.
Builds are numbered `b001`, `b002`, … — the build number appears in the window title.

---

## b032 — ArduPilot 4.7+ support + param comparison tool

### Breaking changes
- **ArduPilot 4.7 or later is now required.** Older firmware is not supported.
- **ARMING_CHECK removed.** This parameter no longer exists in ArduPilot 4.7. The Arming component now only shows accelerometer threshold, compass threshold, and arming behaviour options.

### New features
- **Param comparison tool** — Load any Mission Planner or QGroundControl `.param` file and compare it against AVC's output. Shows mismatches (same param, different value), params AVC generates that the reference doesn't have, and params the reference has that AVC doesn't generate. Click the amber **Compare** button in the toolbar, next to Import .param.
- **"Requires ArduPilot 4.7+"** notice added to the disclaimer, About modal, and README.

---

## b031 — Beta warnings

- Canvas watermark: `BETA — Not validated for flight use` shown at the bottom of the canvas.
- Disclaimer modal: prominent red "⚠ Beta software — not for flight use" banner at the top, including the firmware version requirement.

---

## b030 — Beta feedback round 1

### Bug fixes
- **Status dot now accurate** — categories in the Vehicle Setup panel turn green only when all required fields are genuinely complete. Previously the dot could turn green prematurely or fail to turn green after filling a dropdown.
- **Duplicate RC_PROTOCOLS removed** — the RC Channel Mapping component had a conflicting copy of the RC protocols field. It now only appears in the RC Input component where it belongs.

### New features
- **Export defaults toggle** — `+defaults` checkbox next to the Export .param button. When checked, the exported file includes default values for all configured component fields, not just ones the user explicitly changed. Useful when flashing a flight controller that already has non-default params.
- **Simple / Full Inspector mode** — a `Simple` / `Full` toggle button appears in the Inspector when a component is selected. Simple mode (default) hides advanced fields such as PID tuning groups, notch filter 2, EKF tuning, and logging configuration. Full mode shows everything. Your preference is saved.

---

## b029 — Full ArduPilot param browser

### New features
- **Parameters panel** — click the **Params** button in the toolbar to open a full browser of all ArduPilot parameters for your vehicle type (934 copter / 1167 plane). Search by name or description. Click any parameter to expand its description, range, unit, and — for enum parameters — a dropdown of valid values. Set a value to include it in the next export. Parameters you've set are highlighted in blue and preserved across saves.
- Parameters are grouped by prefix (e.g., `GPS`, `EK3`, `ATC`) with collapsible sections and expand/collapse all controls.
- Parameters set via the panel are now correctly saved to disk with your project.

---

## b022 — Component param browser (earlier)

- Initial Params panel with grouped display and add/edit/delete for additional parameters.
- Fixed: Params panel not opening (store actions were missing from CE store overlay).

---

## b018 — Wiring model, airframe, and topology

### Features
- Motor → ESC → FC wiring chain — motors connect to ESCs only.
- Battery and PDB as draggable components with power bus wires.
- CAN topology view — click **Topology** in the toolbar. Shows Flight Controller and DroneCAN devices with CAN1 (solid blue) and CAN2 (dashed purple) wires.
- Wire opacity dimming — select a component to highlight its wires; unrelated wires dim.
- Wire visual weight by protocol: power 2.5 px, DroneCAN 1.5 px, PWM/serial 1.0 px.
- Airframe background scales 2× in world space so component chips appear proportionally smaller. Zoom out to ~50% to see the full aircraft.

### Bug fixes
- Blank canvas after returning from Topology view — fixed.
- Frame prerequisite check — dragging components now works as long as a frame component exists, regardless of whether it has fields set (fixes VTOL with QuadPlane disabled).

---

## b014 — Initial public release

- Visual drag-and-drop hardware configuration for ArduPilot CubePilot Cube.
- Vehicle types: Multirotor, Fixed Wing, VTOL / QuadPlane.
- Component categories: Autopilot, Propulsion, Sensors, Power, RC & GCS, Peripherals.
- Export `.param` files compatible with Mission Planner and QGroundControl.
- Import `.param` files — reconstructs component layout from recognised parameters.
- Save / open projects (layout + airframe images + generated `.param`).
- MAVLink live connection — upload or pull parameters directly from a running GCS.
- 17 built-in standard airframe views (Quad X, Hex X, QuadPlane, etc.).
- CAN topology view for DroneCAN device assignment.
- One CubePilot Cube per project (Community Edition limit).

---

## Known limitations

- **Beta software** — parameters have not been independently validated. Always verify against ArduPilot documentation before flight.
- **ArduPilot 4.7+ only** — older firmware is unsupported.
- **CubePilot Cube hardware only** — other flight controllers are not supported in this beta.
- **Windows primary target** — macOS and Linux builds are provided but untested.
- Many ArduPilot parameters are not yet covered by components. Use the **Params** panel for additional parameters, or the **+defaults** export option to produce a more complete file.
