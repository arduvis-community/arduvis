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
import PoweredByBadge from './PoweredByBadge'

export default function AboutModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
         onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-[420px] shadow-2xl"
           onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <span className="text-sm font-semibold text-white">About AVC</span>
          <button onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center">
              <span className="text-white text-xs font-bold">AVC</span>
            </div>
            <div>
              <div className="text-white font-semibold text-base leading-tight">
                ArduPilot Visual Configurator
              </div>
              <div className="text-gray-400 text-xs mt-0.5">Version 0.1.0 — Beta</div>
            </div>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">
            AVC is a visual tool for configuring ArduPilot flight controllers using a
            drag-and-drop canvas. Build your hardware layout, set parameters
            through the inspector, and export a ready-to-use <span className="text-blue-300">.param</span> file.
          </p>

          <div className="text-xs text-gray-500 leading-relaxed border-t border-gray-800 pt-3 flex flex-col gap-1">
            <div>
              <span className="text-gray-400">Hardware support:</span> CubePilot Cube (this beta release)
            </div>
            <div>
              <span className="text-gray-400">Copyright:</span> Patternlynx Limited
            </div>
            <div>
              <span className="text-gray-400">License:</span>{' '}
              <span className="text-gray-300">GNU General Public License v3.0</span>
            </div>
          </div>

        </div>

        <div className="px-5 pb-1 flex justify-start">
          <PoweredByBadge />
        </div>

        <div className="px-5 py-3 border-t border-gray-700 flex justify-end">
          <button onClick={onClose}
            className="text-xs px-4 py-1.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-700">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
