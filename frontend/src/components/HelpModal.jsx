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

import React from 'react'

const steps = [
  {
    label: 'Choose your vehicle type',
    body: 'Select Multirotor, Fixed Wing, or VTOL from the toolbar dropdown. The palette updates to show only components relevant to that vehicle type.',
  },
  {
    label: 'Load an airframe view',
    body: 'Click "Standard view…" in the Inspector panel to choose from 17 built-in ArduPilot layouts, or use "Import airframe" to load your own image.',
  },
  {
    label: 'Add components from the palette',
    body: 'Drag component chips from the left palette onto the canvas and position them over the corresponding part of the airframe. Motor chips display their assigned motor number once configured.',
  },
  {
    label: 'Configure in the Inspector',
    body: 'Click any component to select it. The right Inspector panel shows all configurable fields — output pin, motor number, function, protocol, and more. Fill every required field to clear the amber status dot.',
  },
  {
    label: 'Save your project',
    body: 'Click the 💾 icon or use File → Save. Projects are stored in %USERPROFILE%\\.avc\\projects and can be reopened via File → Open at any time.',
  },
  {
    label: 'Export your .param file',
    body: 'Click "Export .param" in the toolbar to save a standard ArduPilot parameter file. Load it directly into Mission Planner, QGroundControl, or any other GCS.',
  },
  {
    label: 'Import an existing .param file',
    body: 'Use "Import .param" to load a file from your GCS. AVC reconstructs the component layout from the parameters it recognises, so you can continue editing an existing configuration.',
  },
]

export default function HelpModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
         onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-[520px] max-h-[85vh]
                      flex flex-col shadow-2xl"
           onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 flex-shrink-0">
          <span className="text-sm font-semibold text-white">Quick Start Guide</span>
          <button onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-700 flex items-center
                              justify-center text-[10px] font-bold text-white mt-0.5">
                {i + 1}
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-200 leading-tight">{step.label}</div>
                <div className="text-xs text-gray-400 leading-relaxed mt-0.5">{step.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-700 flex-shrink-0 flex justify-end">
          <button onClick={onClose}
            className="text-xs px-4 py-1.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-700">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
