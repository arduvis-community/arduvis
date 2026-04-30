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

import React, { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'

// ── Layout constants ───────────────────────────────────────────────────────────
const FC_W        = 200
const FC_H        = 96
const CAN1_PORT_Y = 37
const CAN2_PORT_Y = 69
const PORT_DX     = FC_W + 8
const LEAF_W      = 190
const LEAF_H      = 36
const LEAF_GAP    = 10
const PADDING_V   = 40
const PADDING_H   = 32
const FC_LEFT_1   = 40
const LEAF_LEFT_1 = FC_LEFT_1 + FC_W + 80
const FC_BOTTOM_GAP = 56

const CAN1_COLOR  = '#60a5fa'
const CAN2_COLOR  = '#a78bfa'

const VARIANT_ICONS = {
  cube_orange_plus: '🟧', cube_orange: '🟧', cube_purple: '🟪',
  cube_yellow: '🟨', cube_green: '🟩', cube_black: '⬛',
  cube_blue: '🟦', cube_red: '🟥', cube_mini: '⬜',
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function normFcIds(raw) {
  return Array.isArray(raw) ? raw : (raw ? [raw] : [])
}

function getCanBuses(c) {
  if (c.fields?.dual_bus) return [1, 2]
  return [c.fields?.can_bus ?? 1]
}

// ── FC chip ────────────────────────────────────────────────────────────────────
function FcCard({ fc, isSelected, onClick }) {
  const fcNum    = fc.fields?.fc_instance ?? 1
  const chipIcon = VARIANT_ICONS[fc.fields?.cube_variant] ?? '🟧'
  return (
    <div
      onClick={onClick}
      style={{ width: FC_W, height: FC_H }}
      className={`absolute rounded-lg cursor-pointer select-none
                  border bg-[#0a1226]
                  ${isSelected ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-blue-900/40'}
                  transition-colors`}>
      <div className="absolute left-0 top-3.5 w-[3px] rounded-full bg-blue-700"
        style={{ height: FC_H - 28 }} />
      <div className="absolute text-blue-300 font-bold text-[22px] leading-none"
        style={{ left: 14, top: 14, fontFamily: 'system-ui' }}>
        FC {fcNum}
      </div>
      <div className="absolute text-[11px] text-gray-400/65 truncate"
        style={{ left: 14, top: 44, width: FC_W - 60, fontFamily: 'system-ui' }}>
        {fc.label}
      </div>
      <div className="absolute rounded flex items-center justify-center
                      border border-blue-800/30 bg-blue-950/20"
        style={{ right: 12, top: 12, width: 38, height: 32 }}>
        <span style={{ fontSize: 18 }}>{chipIcon}</span>
      </div>
      <div className="absolute text-[9px] text-blue-300/65 text-right"
        style={{ right: 54, top: CAN1_PORT_Y - 7, fontFamily: 'system-ui' }}>CAN1</div>
      <div className="absolute text-[9px] text-purple-300/65 text-right"
        style={{ right: 54, top: CAN2_PORT_Y - 7, fontFamily: 'system-ui' }}>CAN2</div>
    </div>
  )
}

// ── Leaf chip ──────────────────────────────────────────────────────────────────
function LeafCard({ comp, isSelected, onClick, buses = [1] }) {
  const dual     = buses.length === 2
  const primary  = buses[0]
  const color    = dual ? 'border-blue-800/30' : primary === 2 ? 'border-purple-800/40' : 'border-blue-800/30'
  const selColor = primary === 2 && !dual ? 'border-purple-400' : 'border-blue-500'
  return (
    <div
      onClick={onClick}
      style={{ width: LEAF_W, height: LEAF_H }}
      className={`absolute rounded cursor-pointer select-none
                  flex items-center gap-2 px-2
                  bg-[#111827]/90 border
                  ${isSelected ? selColor + ' ring-1 ring-blue-500/30' : color}
                  transition-colors`}>
      <span className="text-[13px] flex-shrink-0">{comp.icon || '◆'}</span>
      <span className="text-[11px] text-gray-300 truncate flex-1" style={{ fontFamily: 'system-ui' }}>
        {comp.label}
      </span>
      {dual && <span className="text-[8px] text-blue-400/70 flex-shrink-0 leading-none">dual</span>}
      {comp.fields?.node_id != null && (
        <span className="text-[9px] text-gray-600 flex-shrink-0">#{comp.fields.node_id}</span>
      )}
    </div>
  )
}

function ModeBadge() {
  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <span className="text-[10px] px-3 py-1 rounded border border-blue-700/50
                       bg-blue-950/60 text-blue-300 font-medium tracking-wide uppercase">
        CAN Topology
      </span>
    </div>
  )
}

// ── Main topology view ─────────────────────────────────────────────────────────
export default function CanTopologyView() {
  const { components, selectedComponentId, selectComponent, deselectAll } = useAppStore()

  const fcChips = useMemo(
    () => components.filter(c => c.defId === 'autopilot_cube'),
    [components]
  )

  const canDevices = useMemo(() => components.filter(c =>
    !c.noCanvas
    && c.defId !== 'autopilot_cube'
    && c.fields?.connection_type === 'dronecan'
    && normFcIds(c.fields?.fc_assignment).length > 0
  ), [components])

  const layout = useMemo(() => {
    let curY = PADDING_V
    return fcChips.map(fc => {
      const all = canDevices.filter(c => normFcIds(c.fields?.fc_assignment).includes(fc.id))
      const leafItems = []
      let leafY = curY
      for (const comp of all) {
        leafItems.push({ comp, y: leafY, buses: getCanBuses(comp) })
        leafY += LEAF_H + LEAF_GAP
      }
      const blockH = Math.max(FC_H, leafItems.length > 0 ? leafItems[leafItems.length-1].y + LEAF_H - curY : 0)
      const fcY = curY
      curY += blockH + FC_BOTTOM_GAP
      return { fc, fcY, leafItems, blockH }
    })
  }, [fcChips, canDevices])

  const SVG_RIGHT = LEAF_LEFT_1 + LEAF_W + PADDING_H

  const totalH = layout.length > 0
    ? layout[layout.length-1].fcY + layout[layout.length-1].blockH + PADDING_V
    : 400

  if (fcChips.length === 0) {
    return (
      <div className="flex-1 relative overflow-auto bg-gray-900 flex items-center justify-center">
        <ModeBadge />
        <p className="text-gray-600 text-xs text-center leading-relaxed pointer-events-none">
          Add a <span className="text-gray-400">CubeOrange+</span> from the Autopilot palette,<br />
          then switch to Topology mode.
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex-1 relative overflow-auto bg-gray-900"
      onClick={(e) => { if (e.target === e.currentTarget) deselectAll() }}>

      <ModeBadge />

      <div className="relative" style={{ width: SVG_RIGHT, minHeight: totalH }}>
        <svg className="absolute inset-0 pointer-events-none"
          width={SVG_RIGHT} height={Math.max(totalH, 400)} style={{ zIndex: 0 }}>

          {layout.map(({ fc, fcY, leafItems }) =>
            leafItems.flatMap(({ comp, y, buses }) =>
              buses.map(bus => {
                const portY = fcY + (bus === 1 ? CAN1_PORT_Y : CAN2_PORT_Y)
                const portX = FC_LEFT_1 + PORT_DX
                const lY    = y + LEAF_H / 2
                const color = bus === 1 ? CAN1_COLOR : CAN2_COLOR
                const cx1   = portX + 36
                const cx2   = LEAF_LEFT_1 - 36
                return (
                  <g key={comp.id + ':bus' + bus}>
                    <line x1={FC_LEFT_1 + FC_W - 6} y1={portY} x2={portX} y2={portY}
                      stroke={color} strokeWidth={1.5} opacity={0.55} />
                    <path d={`M ${portX} ${portY} C ${cx1} ${portY} ${cx2} ${lY} ${LEAF_LEFT_1} ${lY}`}
                      stroke={color} strokeWidth={1.5} fill="none" opacity={0.65}
                      strokeDasharray={bus === 2 ? '5 3' : undefined} />
                  </g>
                )
              })
            )
          )}

          {layout.map(({ fc, fcY }) => (
            <g key={fc.id + '_ports'}>
              <circle cx={FC_LEFT_1 + PORT_DX} cy={fcY + CAN1_PORT_Y}
                r={5} fill="#0f172a" stroke={CAN1_COLOR} strokeWidth={1.5} />
              <circle cx={FC_LEFT_1 + PORT_DX} cy={fcY + CAN2_PORT_Y}
                r={5} fill="#0f172a" stroke={CAN2_COLOR} strokeWidth={1.5} />
            </g>
          ))}
        </svg>

        {layout.map(({ fc, fcY, leafItems }) => (
          <React.Fragment key={fc.id}>
            <div style={{ position: 'absolute', left: FC_LEFT_1, top: fcY, zIndex: 1 }}>
              <FcCard fc={fc} isSelected={fc.id === selectedComponentId}
                onClick={(e) => { e.stopPropagation(); selectComponent(fc.id) }} />
            </div>
            {leafItems.map(({ comp, y, buses }) => (
              <div key={comp.id} style={{ position: 'absolute', left: LEAF_LEFT_1, top: y, zIndex: 1 }}>
                <LeafCard comp={comp} buses={buses}
                  isSelected={comp.id === selectedComponentId}
                  onClick={(e) => { e.stopPropagation(); selectComponent(comp.id) }} />
              </div>
            ))}
          </React.Fragment>
        ))}

        {fcChips.length > 0 && layout.every(l => l.leafItems.length === 0) && (
          <div className="absolute pointer-events-none" style={{ left: LEAF_LEFT_1, top: PADDING_V }}>
            <p className="text-gray-600 text-xs leading-relaxed">
              Select a component and set<br />
              <span className="text-gray-400">Connection type → DroneCAN</span>,<br />
              then assign it to the FC.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
