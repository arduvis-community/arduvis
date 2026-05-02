// AVC — ArduPilot Visual Configurator
// Copyright (C) 2026 Patternlynx Limited
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import React, { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api/client'
import { computeComplete } from '../utils/componentUtils'

// ── Step definitions per vehicle type ───────────────────────────────────────
// type: 'frame'     → checks frameInfo !== null
// type: 'component' → checks one or more components with matching defId
// type: 'any'       → at least one component of those defIds, any complete one counts

const STEPS = {
  copter: [
    {
      id: 'airframe', title: 'Select Airframe', required: true, type: 'frame',
      desc: 'Choose a standard airframe layout from the toolbar Standard Views button.',
    },
    {
      id: 'brd_config', title: 'Flight Controller', required: true, type: 'component',
      defIds: ['brd_config', 'autopilot_cube'],
      desc: 'Configure board type, CPU speed, and serial port assignments.',
    },
    {
      id: 'board_orientation', title: 'Board Orientation', required: true, type: 'component',
      defIds: ['board_orientation', 'autopilot_cube'],
      desc: 'Set the physical mounting orientation of the flight controller.',
    },
    {
      id: 'motor', title: 'Motors', required: true, type: 'any',
      defIds: ['motor'],
      desc: 'Add and configure a motor component for each motor position.',
    },
    {
      id: 'esc', title: 'ESCs', required: true, type: 'any',
      defIds: ['esc'],
      desc: 'Configure ESC protocol (DSHOT, PWM) and calibration settings.',
    },
    {
      id: 'battery_monitor', title: 'Battery Monitor', required: true, type: 'component',
      defIds: ['battery_monitor'],
      desc: 'Set up voltage and current sensing for battery telemetry.',
    },
    {
      id: 'rc_input', title: 'RC Input', required: true, type: 'component',
      defIds: ['rc_input'],
      desc: 'Configure RC receiver type and protocol (SBUS, CRSF, etc.).',
    },
    {
      id: 'gps', title: 'GPS / Compass', required: false, type: 'component',
      defIds: ['gps'],
      desc: 'Add a GPS receiver. Required for position-hold and autonomous modes.',
    },
    {
      id: 'flight_modes', title: 'Flight Modes', required: true, type: 'component',
      defIds: ['flight_modes'],
      desc: 'Assign flight modes (Stabilize, AltHold, Loiter…) to RC switch positions.',
    },
    {
      id: 'failsafe', title: 'Failsafe', required: true, type: 'component',
      defIds: ['failsafe'],
      desc: 'Configure actions for RC loss, low battery, and GCS disconnect events.',
    },
    {
      id: 'arming', title: 'Arming', required: false, type: 'component',
      defIds: ['arming'],
      desc: 'Set arming thresholds and pre-arm check behaviour.',
    },
  ],

  plane: [
    {
      id: 'airframe', title: 'Select Airframe', required: true, type: 'frame',
      desc: 'Choose a standard airframe layout from the toolbar Standard Views button.',
    },
    {
      id: 'brd_config', title: 'Flight Controller', required: true, type: 'component',
      defIds: ['brd_config', 'autopilot_cube'],
      desc: 'Configure board type, CPU speed, and serial port assignments.',
    },
    {
      id: 'board_orientation', title: 'Board Orientation', required: true, type: 'component',
      defIds: ['board_orientation', 'autopilot_cube'],
      desc: 'Set the physical mounting orientation of the flight controller.',
    },
    {
      id: 'motor', title: 'Motor', required: true, type: 'any',
      defIds: ['motor'],
      desc: 'Configure the propulsion motor and throttle output.',
    },
    {
      id: 'esc', title: 'ESC', required: true, type: 'any',
      defIds: ['esc'],
      desc: 'Configure ESC protocol and throttle calibration.',
    },
    {
      id: 'servo_outputs', title: 'Servo Outputs', required: true, type: 'component',
      defIds: ['servo_outputs'],
      desc: 'Map servos to aileron, elevator, rudder, and flap channels.',
    },
    {
      id: 'battery_monitor', title: 'Battery Monitor', required: true, type: 'component',
      defIds: ['battery_monitor'],
      desc: 'Set up voltage and current sensing for battery telemetry.',
    },
    {
      id: 'rc_input', title: 'RC Input', required: true, type: 'component',
      defIds: ['rc_input'],
      desc: 'Configure RC receiver type and protocol.',
    },
    {
      id: 'gps', title: 'GPS / Compass', required: true, type: 'component',
      defIds: ['gps'],
      desc: 'GPS required for navigation modes (Auto, RTL, Cruise).',
    },
    {
      id: 'airspeed', title: 'Airspeed Sensor', required: false, type: 'component',
      defIds: ['airspeed'],
      desc: 'Pitot tube sensor — recommended for accurate airspeed and stall protection.',
    },
    {
      id: 'flight_modes', title: 'Flight Modes', required: true, type: 'component',
      defIds: ['flight_modes'],
      desc: 'Assign flight modes (Manual, FBWA, Auto…) to RC switch positions.',
    },
    {
      id: 'failsafe', title: 'Failsafe', required: true, type: 'component',
      defIds: ['failsafe'],
      desc: 'Configure actions for RC loss, low battery, and GCS disconnect events.',
    },
  ],

  vtol: [
    {
      id: 'airframe', title: 'Select Airframe', required: true, type: 'frame',
      desc: 'Choose a standard airframe layout from the toolbar Standard Views button.',
    },
    {
      id: 'brd_config', title: 'Flight Controller', required: true, type: 'component',
      defIds: ['brd_config', 'autopilot_cube'],
      desc: 'Configure board type, CPU speed, and serial port assignments.',
    },
    {
      id: 'board_orientation', title: 'Board Orientation', required: true, type: 'component',
      defIds: ['board_orientation', 'autopilot_cube'],
      desc: 'Set the physical mounting orientation of the flight controller.',
    },
    {
      id: 'frame_vtol', title: 'QuadPlane Setup', required: true, type: 'component',
      defIds: ['frame_vtol'],
      desc: 'Configure VTOL lift motor count, transition speed, and Q_ENABLE.',
    },
    {
      id: 'motor', title: 'Motors', required: true, type: 'any',
      defIds: ['motor'],
      desc: 'Add and configure lift and cruise motor components.',
    },
    {
      id: 'esc', title: 'ESCs', required: true, type: 'any',
      defIds: ['esc'],
      desc: 'Configure ESC protocol for lift and cruise motors.',
    },
    {
      id: 'servo_outputs', title: 'Servo Outputs', required: true, type: 'component',
      defIds: ['servo_outputs'],
      desc: 'Map servos to aileron, elevator, rudder, and flap channels.',
    },
    {
      id: 'battery_monitor', title: 'Battery Monitor', required: true, type: 'component',
      defIds: ['battery_monitor'],
      desc: 'Set up voltage and current sensing for battery telemetry.',
    },
    {
      id: 'rc_input', title: 'RC Input', required: true, type: 'component',
      defIds: ['rc_input'],
      desc: 'Configure RC receiver type and protocol.',
    },
    {
      id: 'gps', title: 'GPS / Compass', required: true, type: 'component',
      defIds: ['gps'],
      desc: 'GPS required for VTOL transition and navigation modes.',
    },
    {
      id: 'flight_modes', title: 'Flight Modes', required: true, type: 'component',
      defIds: ['flight_modes'],
      desc: 'Assign flight modes (QHOVER, FBWA, Auto…) to RC switch positions.',
    },
    {
      id: 'failsafe', title: 'Failsafe', required: true, type: 'component',
      defIds: ['failsafe'],
      desc: 'Configure actions for RC loss, low battery, and GCS disconnect events.',
    },
  ],
}

// ── Status helpers ───────────────────────────────────────────────────────────

function evalStep(step, hasAirframe, components, defs) {
  if (step.type === 'frame') {
    return { status: hasAirframe ? 'complete' : 'missing', instanceIds: [] }
  }
  const matches = components.filter(c => step.defIds.includes(c.defId))
  if (matches.length === 0) return { status: 'missing', instanceIds: [] }
  const instanceIds = matches.map(c => c.id)
  const anyComplete = matches.some(c => computeComplete(c, defs[c.defId]))
  return { status: anyComplete ? 'complete' : 'present', instanceIds }
}

const STATUS_ICON = {
  complete: <span className="text-green-400 font-bold text-sm">✓</span>,
  present:  <span className="text-amber-400 font-bold text-sm">◉</span>,
  missing:  <span className="text-gray-600 text-sm">○</span>,
}

// ── Panel ────────────────────────────────────────────────────────────────────

export default function SetupChecklistPanel() {
  const {
    vehicleType, frameInfo, backgroundImageTop, backgroundImageBottom, components,
    selectComponent, toggleChecklist, setStandardViewsOpen,
  } = useAppStore()

  const [defs, setDefs] = useState({})

  useEffect(() => {
    api.getComponentDefs(vehicleType)
      .then(list => {
        const map = {}
        for (const d of list) map[d.id] = d
        setDefs(map)
      })
      .catch(() => {})
  }, [vehicleType])

  const steps = STEPS[vehicleType] ?? STEPS.copter

  // frameInfo is only set on import; background image is the reliable signal for standard view selection
  const hasAirframe = !!frameInfo || !!backgroundImageTop || !!backgroundImageBottom

  const evaluated = steps.map(step => ({
    ...step,
    ...evalStep(step, hasAirframe, components, defs),
  }))

  const requiredSteps   = evaluated.filter(s => s.required)
  const completeCount   = requiredSteps.filter(s => s.status === 'complete').length
  const progressPercent = requiredSteps.length > 0
    ? Math.round((completeCount / requiredSteps.length) * 100)
    : 0

  const handleStepClick = (step) => {
    if (step.type === 'frame') {
      setStandardViewsOpen(true)
      return
    }
    if (step.instanceIds.length > 0) {
      selectComponent(step.instanceIds[0])
      toggleChecklist()  // close checklist so Inspector becomes visible
    }
  }

  return (
    <div className="w-72 flex-shrink-0 flex flex-col bg-gray-900 border-l border-gray-700 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-700 flex-shrink-0">
        <div>
          <span className="text-sm font-semibold text-white">Setup Checklist</span>
          <span className="ml-2 text-[11px] text-gray-500">ArduPilot 4.7+</span>
        </div>
        <button
          onClick={toggleChecklist}
          className="text-gray-500 hover:text-gray-200 text-sm leading-none px-1">
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-3 py-2 border-b border-gray-700/60 flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-400">
            Required steps complete
          </span>
          <span className={`text-[11px] font-medium ${
            completeCount === requiredSteps.length ? 'text-green-400' : 'text-amber-400'
          }`}>
            {completeCount} / {requiredSteps.length}
          </span>
        </div>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              progressPercent === 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="flex-1 overflow-y-auto py-1">
        {evaluated.map((step, i) => {
          const clickable = step.type === 'frame' || step.instanceIds.length > 0
          return (
            <button
              key={step.id}
              onClick={() => handleStepClick(step)}
              disabled={!clickable && step.status === 'missing'}
              className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 border-b border-gray-800/60
                transition-colors
                ${clickable
                  ? 'hover:bg-gray-800/60 cursor-pointer'
                  : 'cursor-default opacity-70'
                }`}>

              {/* Step number + status */}
              <div className="flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
                <span className="text-[10px] text-gray-600 font-mono leading-none">{String(i + 1).padStart(2, '0')}</span>
                <div className="mt-0.5">{STATUS_ICON[step.status]}</div>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-xs font-medium leading-snug ${
                    step.status === 'complete' ? 'text-green-300' :
                    step.status === 'present'  ? 'text-amber-300' :
                    'text-gray-300'
                  }`}>
                    {step.title}
                  </span>
                  {!step.required && (
                    <span className="text-[9px] px-1 py-0.5 rounded bg-gray-800 text-gray-500 border border-gray-700 leading-none">
                      optional
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 leading-snug mt-0.5">
                  {step.desc}
                </p>
                {step.status === 'present' && (
                  <p className="text-[10px] text-amber-500/80 mt-0.5">
                    Component added — open Inspector to complete configuration
                  </p>
                )}
                {step.status === 'missing' && clickable && (
                  <p className="text-[10px] text-amber-400/70 mt-0.5">
                    Click to open
                  </p>
                )}
              </div>
            </button>
          )
        })}

        {/* Footer note */}
        <div className="px-3 py-3 text-[10px] text-gray-600 leading-relaxed">
          Status dots in the Palette show per-component completion.
          Drag components from the Palette to add them to your configuration.
        </div>
      </div>

      {/* Ready to export banner */}
      {progressPercent === 100 && (
        <div className="px-3 py-2.5 border-t border-green-800/50 bg-green-950/30 flex-shrink-0">
          <p className="text-[11px] text-green-400 font-medium">
            ✓ All required steps complete
          </p>
          <p className="text-[10px] text-green-600 mt-0.5">
            Use Export .param to generate your parameter file.
          </p>
        </div>
      )}
    </div>
  )
}
