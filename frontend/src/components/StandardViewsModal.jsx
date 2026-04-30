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

import { useAppStore } from '../store/useAppStore'
import { STANDARD_VIEWS } from '../data/standardViews'

// Component defIds that represent a motor/ESC — used for auto-suggest + mismatch
const MOTOR_IDS = ['motor', 'esc']

export default function StandardViewsModal({ onClose }) {
  const {
    vehicleType,
    components,
    activeViewId,
    setBackground,
    setStandardViewsOpen,
    setActiveStandardView,
  } = useAppStore()

  const placedMotorCount = components.filter(c => MOTOR_IDS.includes(c.defId)).length
  const filtered = STANDARD_VIEWS.filter(v => v.vehicles.includes(vehicleType))

  const suggested = placedMotorCount > 0
    ? filtered.find(v => v.motorCount === placedMotorCount) ?? null
    : null

  function handleSelect(view) {
    setBackground('top', view.top)
    if (view.bottom) setBackground('bottom', view.bottom)
    setActiveStandardView(view)

    // Auto-populate frame class / type in the matching frame component
    const store = useAppStore.getState()
    const frameDefId = vehicleType === 'vtol' ? 'frame_vtol'
                     : vehicleType === 'plane' ? 'frame_plane'
                     : 'frame_copter'
    const frameComp = store.components.find(c => c.defId === frameDefId)
    if (frameComp) {
      if (view.frameClass !== undefined)
        store.updateComponentField(frameComp.id, 'frame_class', view.frameClass)
      if (view.frameType !== undefined)
        store.updateComponentField(frameComp.id, 'frame_type', view.frameType)
      if (view.qFrameClass !== undefined)
        store.updateComponentField(frameComp.id, 'q_frame_class', view.qFrameClass)
      if (view.qFrameType !== undefined)
        store.updateComponentField(frameComp.id, 'q_frame_type', view.qFrameType)
    }

    setStandardViewsOpen(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[680px] max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold text-gray-100">Airframe Views</span>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-lg leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-500 italic">
              No standard views for "{vehicleType}". Switch vehicle type in the toolbar.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(view => {
                const isActive    = activeViewId === view.id
                const isSuggested = !isActive && suggested?.id === view.id
                return (
                  <button
                    key={view.id}
                    onClick={() => handleSelect(view)}
                    className={`group relative flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors text-left ${
                      isActive
                        ? 'border-green-500 bg-green-950/30 hover:bg-green-950/50'
                        : isSuggested
                        ? 'border-blue-500 bg-blue-950/30 hover:bg-blue-950/50'
                        : 'border-gray-700 bg-gray-800/40 hover:bg-gray-800 hover:border-blue-600'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute top-2 right-2 text-[10px] bg-green-700 text-white px-1.5 py-0.5 rounded font-medium leading-tight">
                        ✓ Active
                      </span>
                    )}
                    {isSuggested && (
                      <span className="absolute top-2 right-2 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium leading-tight">
                        ✓ Suggested
                      </span>
                    )}

                    {/* Preview */}
                    <div className="w-full rounded overflow-hidden border border-gray-700 bg-gray-950">
                      <img src={view.top} alt={view.label} className="w-full h-36 object-contain" />
                    </div>

                    {/* Label row */}
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-base">{view.icon}</span>
                      <div>
                        <div className="text-sm font-medium text-gray-200 group-hover:text-white">
                          {view.label}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {view.bottom ? 'Top + Bottom view' : 'Top view only'}
                          {view.motorCount > 0 && (
                            <span className="ml-1 text-gray-600">· {view.motorCount} motors</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-gray-700 flex-shrink-0">
          <p className="text-[10px] text-gray-600">
            Schematic diagrams only. For a photo, use Import airframe in the Frame inspector.
          </p>
        </div>

      </div>
    </div>
  )
}
