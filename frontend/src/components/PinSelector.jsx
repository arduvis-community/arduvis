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

/**
 * PinSelector.jsx
 * Grid of MAIN OUT (M1-M8) and AUX OUT (A1-A6) output-pin buttons.
 *
 * Props:
 *   value        — currently selected pin string e.g. "M3", "A2", or null
 *   usedPins     — Set of pin strings already claimed by other components
 *   onChange     — (pin: string | null) => void
 */
import React from 'react'

const MAIN_PINS = ['M1','M2','M3','M4','M5','M6','M7','M8']
const AUX_PINS  = ['A1','A2','A3','A4','A5','A6']

export default function PinSelector({ value, usedPins = new Set(), onChange }) {
  function handleClick(pin) {
    const taken = usedPins.has(pin) && pin !== value
    if (taken) return
    onChange(pin === value ? null : pin)
  }

  function btnClass(pin) {
    if (pin === value)
      return 'bg-amber-600 border-blue-400 text-white ring-1 ring-blue-400'
    if (usedPins.has(pin))
      return 'bg-gray-900 border-gray-700 text-gray-600 opacity-40 cursor-not-allowed'
    return 'bg-gray-700 border-gray-500 text-gray-200 hover:bg-gray-600 hover:border-blue-400 hover:text-white'
  }

  const PinRow = ({ pins }) => (
    <div className="flex gap-1 flex-wrap">
      {pins.map(pin => (
        <button
          key={pin}
          type="button"
          title={usedPins.has(pin) && pin !== value ? `${pin} — in use` : pin}
          onClick={() => handleClick(pin)}
          className={`w-9 h-7 rounded text-[11px] font-mono font-medium border
                      transition-colors select-none ${btnClass(pin)}`}>
          {pin}
        </button>
      ))}
    </div>
  )

  return (
    <div className="rounded border border-gray-700 bg-gray-900/60 p-2 space-y-2">
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
          Main Out (PWM / DSHOT)
        </div>
        <PinRow pins={MAIN_PINS} />
      </div>
      <div>
        <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5">
          Aux Out (IOMCU)
        </div>
        <PinRow pins={AUX_PINS} />
      </div>
      {!value && (
        <p className="text-[9px] text-amber-500/70">No pin assigned — click to select</p>
      )}
    </div>
  )
}
