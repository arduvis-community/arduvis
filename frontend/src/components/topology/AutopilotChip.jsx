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
import { Group, Rect, Text, Circle, Line } from 'react-konva'

export const CHIP_W = 200
export const CHIP_H = 96

// Port positions in chip-local coords — used by Phase 2 wire routing
export const PORTS = {
  can1: { x: CHIP_W, y: 37 },
  can2: { x: CHIP_W, y: 69 },
}

function CanPort({ portY, label }) {
  return (
    <Group>
      <Text
        text={label}
        x={CHIP_W - 54} y={portY - 7}
        width={44} align="right"
        fontSize={9} fill="rgba(147,197,253,0.65)" fontFamily="system-ui" />
      {/* Stub line to port circle */}
      <Line
        points={[CHIP_W - 6, portY, CHIP_W + 8, portY]}
        stroke="rgba(96,165,250,0.55)" strokeWidth={1.5} />
      {/* Port circle — attachment point for Phase 2 wires */}
      <Circle
        x={CHIP_W + 8} y={portY}
        radius={5}
        fill="#0f172a" stroke="#60a5fa" strokeWidth={1.5} />
    </Group>
  )
}

const VARIANT_ICONS = {
  cube_orange_plus: '🟧', cube_orange: '🟧', cube_purple: '🟪',
  cube_yellow: '🟨', cube_green: '🟩', cube_black: '⬛',
  cube_blue: '🟦', cube_red: '🟥', cube_mini: '⬜',
}

export default function AutopilotChip({ component, isSelected }) {
  const { x, y, fields, label } = component
  const fcNum    = fields?.fc_instance ?? 1
  const fcLabel  = `FC ${fcNum}`
  const chipIcon = VARIANT_ICONS[fields?.cube_variant] ?? '🟧'

  return (
    <Group id={component.id} x={x} y={y}>

      {/* Main body */}
      <Rect
        width={CHIP_W} height={CHIP_H} cornerRadius={8}
        fill="rgba(10,18,38,0.96)"
        stroke={isSelected ? '#3b82f6' : 'rgba(96,165,250,0.22)'}
        strokeWidth={isSelected ? 2 : 1} />

      {/* Left accent bar */}
      <Rect
        x={0} y={14} width={3} height={CHIP_H - 28}
        cornerRadius={1.5} fill="#2563eb" />

      {/* FC number — large */}
      <Text
        text={fcLabel}
        x={14} y={14}
        fontSize={22} fontStyle="bold"
        fill="#93c5fd" fontFamily="system-ui" />

      {/* Component label — small subtitle */}
      <Text
        text={label}
        x={14} y={44}
        fontSize={11}
        fill="rgba(209,213,219,0.65)" fontFamily="system-ui" />

      {/* Hardware icon block — top right */}
      <Rect
        x={CHIP_W - 52} y={12} width={38} height={32}
        cornerRadius={4}
        fill="rgba(37,99,235,0.12)" stroke="rgba(37,99,235,0.28)" strokeWidth={0.5} />
      <Text text={chipIcon} x={CHIP_W - 46} y={17} fontSize={18} />

      {/* CAN port stubs */}
      <CanPort portY={PORTS.can1.y} label="CAN1" />
      <CanPort portY={PORTS.can2.y} label="CAN2" />

    </Group>
  )
}
