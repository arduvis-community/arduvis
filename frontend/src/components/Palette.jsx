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

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api/client'
import { computeComplete } from '../utils/componentUtils'

const FRAME_IDS = ['frame_copter', 'frame_plane', 'frame_vtol']

// Def IDs that should never appear as canvas blocks — config-only panel items.
const NO_CANVAS_DEFS = new Set(['servo_outputs'])

const CATEGORY_ORDER = [
  'Vehicle Setup',
  'Autopilot',
  'Propulsion',
  'Sensors',
  'Power',
  'RC / GCS',
  'Peripherals',
]

function SkeletonItem() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 animate-pulse">
      <div className="w-4 h-4 rounded bg-gray-700 flex-shrink-0" />
      <div className="h-3 rounded bg-gray-700 flex-grow" />
    </div>
  )
}

function SkeletonSection() {
  return (
    <div className="mb-1">
      <div className="px-3 pt-3 pb-1">
        <div className="h-2 w-16 rounded bg-gray-700 animate-pulse" />
      </div>
      <SkeletonItem />
      <SkeletonItem />
      <SkeletonItem />
    </div>
  )
}

/** Dot indicating whether a setup item has been configured. */
function SetupStatusDot({ defId, components }) {
  const inst = components.find(c => c.defId === defId)
  if (!inst) return <span className="w-1.5 h-1.5 rounded-full bg-gray-600 flex-shrink-0" />
  const hasFields = inst.fields && Object.keys(inst.fields).length > 0
  return (
    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${hasFields ? 'bg-green-400' : 'bg-amber-400'}`} />
  )
}

export default function Palette() {
  const { vehicleType, sidebarOpen, components } = useAppStore()
  const [defs, setDefs]       = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [blockMsg, setBlockMsg] = useState(null)
  const [splitPct, setSplitPct] = useState(35)
  const blockTimer = useRef(null)
  const containerRef = useRef(null)
  const setupPanelRef = useRef(null)
  const dragging = useRef(false)

  const onDividerMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true
    const onMouseMove = (ev) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((ev.clientY - rect.top) / rect.height) * 100
      let maxPct = 80
      if (setupPanelRef.current) {
        const contentPct = (setupPanelRef.current.scrollHeight / rect.height) * 100
        maxPct = Math.min(80, contentPct)
      }
      setSplitPct(Math.min(Math.max(pct, 10), maxPct))
    }
    const onMouseUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [])

  const showBlock = (msg) => {
    clearTimeout(blockTimer.current)
    setBlockMsg(msg)
    blockTimer.current = setTimeout(() => setBlockMsg(null), 3500)
  }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    api.getComponentDefs(vehicleType)
      .then(data => {
        if (cancelled) return
        setDefs(data)
        setLoading(false)
        // Retroactively patch any existing component instances that should be noCanvas
        const noCanvasIds = new Set([
          ...NO_CANVAS_DEFS,
          ...data.filter(d => d.noCanvas || d.virtual).map(d => d.id),
        ])
        const { components, updateComponent } = useAppStore.getState()
        components.forEach(c => {
          if (noCanvasIds.has(c.defId) && !c.noCanvas) {
            updateComponent(c.id, { noCanvas: true })
          }
        })
      })
      .catch(e  => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [vehicleType])

  if (!sidebarOpen) return null

  const setupDefs   = defs.filter(d => d.category === 'Vehicle Setup')
  const physicalGrouped = CATEGORY_ORDER
    .filter(cat => cat !== 'Vehicle Setup')
    .flatMap(cat => {
      const items = defs.filter(d => d.category === cat)
      return items.length ? [{ category: cat, items }] : []
    })

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSetupClick = (def) => {
    const { components, addComponent, updateComponent, selectComponent } = useAppStore.getState()
    const existing = components.find(c => c.defId === def.id)
    if (existing) {
      // Ensure noCanvas is still set (handles legacy loaded projects)
      if (!existing.noCanvas) updateComponent(existing.id, { noCanvas: true })
      selectComponent(existing.id)
      return
    }
    // Create the component but keep it off-canvas — it lives only in the store
    const id = addComponent(def.id, def.label, def.icon, true, 0, 0)
    updateComponent(id, { noCanvas: true })
    selectComponent(id)
  }

  const handleDragStart = (e, def) => {
    const { components: all, backgroundImageTop, backgroundImageBottom } = useAppStore.getState()

    if (def.id === 'autopilot_cube') {
      if (all.some(c => c.defId === 'autopilot_cube')) {
        e.preventDefault()
        showBlock('Only one autopilot is supported in Community Edition.')
        return
      }
      e.dataTransfer.setData('application/avc-component', JSON.stringify({
        defId: def.id, label: def.label, icon: def.icon, virtual: def.virtual,
      }))
      e.dataTransfer.effectAllowed = 'copy'
      return
    }

    const frameComp = all.find(c => FRAME_IDS.includes(c.defId))
    const hasImage  = !!(backgroundImageTop || backgroundImageBottom)

    if (!frameComp) {
      e.preventDefault()
      showBlock('Set up your Frame first — choose a frame type in the Inspector.')
      return
    }
    if (!hasImage) {
      e.preventDefault()
      showBlock('Set an airframe image in the Frame inspector before adding components.')
      return
    }

    e.dataTransfer.setData('application/avc-component', JSON.stringify({
      defId:   def.id,
      label:   def.label,
      icon:    def.icon,
      virtual: def.virtual,
    }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div ref={containerRef}
         className="w-auto flex-shrink-0 bg-gray-800/60 border-r border-gray-700 flex flex-col overflow-hidden">

      {loading && (
        <div className="overflow-y-auto flex-1">
          <SkeletonSection />
          <SkeletonSection />
          <SkeletonSection />
        </div>
      )}

      {!loading && error && (
        <div className="px-3 py-4 text-xs text-red-400">
          Failed to load components
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Vehicle Setup panel ─────────────────────────────────────── */}
          <div ref={setupPanelRef}
               className="flex-none overflow-y-auto border-b border-gray-700"
               style={{ height: `${splitPct}%` }}>
            <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5 sticky top-0 bg-gray-800/90 z-10">
              <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-widest">
                Vehicle Setup
              </span>
            </div>

            {setupDefs.length === 0 && (
              <p className="px-3 py-1 text-[11px] text-gray-600 italic">
                No setup items for this vehicle
              </p>
            )}

            {setupDefs.map(def => {
              const inst         = components.find(c => c.defId === def.id)
              const isConfigured = !!inst && computeComplete(inst, def)

              return (
                <div
                  key={def.id}
                  onClick={() => handleSetupClick(def)}
                  className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all
                    border-l-2 group
                    ${inst
                      ? 'border-purple-600/60 bg-purple-900/10 hover:bg-purple-900/20'
                      : 'border-transparent hover:bg-gray-700/50 hover:border-purple-500/40'
                    }`}
                  title="Click to configure">
                  <span className="flex-shrink-0 text-sm leading-none">{def.icon}</span>
                  <span className={`text-xs leading-tight flex-1
                    ${inst ? 'text-gray-200' : 'text-gray-400'}`}>
                    {def.label}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0
                    ${isConfigured ? 'bg-green-400' : inst ? 'bg-amber-400' : 'bg-gray-600'}`} />
                </div>
              )
            })}
          </div>

          {/* ── Divider ─────────────────────────────────────────────────── */}
          <div
            onMouseDown={onDividerMouseDown}
            className="flex-none h-1.5 bg-gray-700 hover:bg-blue-600/60 cursor-row-resize
                       flex items-center justify-center transition-colors group"
            title="Drag to resize">
            <div className="w-6 h-0.5 rounded-full bg-gray-500 group-hover:bg-blue-400 transition-colors" />
          </div>

          {/* ── Physical components (draggable) ─────────────────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {blockMsg && (
              <div className="mx-2 mt-2 px-2 py-1.5 rounded border border-amber-700/60
                              bg-amber-900/20 text-[11px] text-amber-300 leading-snug">
                {blockMsg}
              </div>
            )}
            {physicalGrouped.map(({ category, items }) => (
              <div key={category} className="mb-1">
                <div className="px-3 pt-3 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                  {category}
                </div>

                {items.map(def => (
                  <div
                    key={def.id}
                    draggable
                    onDragStart={e => handleDragStart(e, def)}
                    className="flex items-center gap-2 px-3 py-2 cursor-grab hover:bg-gray-700/60
                               border-l-2 border-transparent hover:border-blue-500 transition-all">
                    <span className="flex-shrink-0" style={{ fontSize: 13 }}>{def.icon}</span>
                    <span className="text-xs text-gray-300 leading-tight">{def.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
