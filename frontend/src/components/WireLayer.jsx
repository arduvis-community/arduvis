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

import React, { useMemo, useState, useCallback } from 'react'
import { Group, Line, Circle } from 'react-konva'
import { buildConnections, buildWirePath, buildParallelLines, insertWaypoint } from '../utils/wireUtils'

// ── Protocol rendering config ──────────────────────────────────────────────
// power/motor: single thick line (no parallel-strand spread)
// others:      parallel strands via buildParallelLines

const WIRE_STROKE_WIDTH = {
  power:    2.5,
  motor:    2.0,
  dronecan: 1.5,
  pwm:      1.0,
  serial:   1.0,
  i2c:      1.0,
  smbus:    1.0,
  analog:   1.0,
}

// Protocols that render as a single thick centerline (not spread strands)
const SINGLE_LINE_PROTOCOLS = new Set(['power', 'motor'])

// ── WaypointHandle ─────────────────────────────────────────────────────────

function WaypointHandle({ index, wp, color, connectionKey, allWaypoints, onMove, onRemove }) {
  const [hov, setHov] = useState(false)

  const handleDragMove = useCallback((e) => {
    const pos = e.target.position()
    const updated = allWaypoints.map((w, i) =>
      i === index ? { x: pos.x, y: pos.y } : w
    )
    onMove(connectionKey, updated)
  }, [allWaypoints, index, connectionKey, onMove])

  const handleContextMenu = useCallback((e) => {
    e.evt.preventDefault()
    onRemove(connectionKey, index)
  }, [connectionKey, index, onRemove])

  return (
    <Circle
      x={wp.x} y={wp.y}
      radius={5}
      fill="white"
      stroke={color}
      strokeWidth={1.5}
      opacity={hov ? 1 : 0.75}
      draggable
      onMouseDown={(e) => e.evt.stopPropagation()}
      onDragMove={handleDragMove}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    />
  )
}

// ── WireGroup ──────────────────────────────────────────────────────────────

function WireGroup({ connection, waypoints, panX, panY, zoom, opacity,
                     onAddWaypoint, onRemoveWaypoint }) {
  const pathPoints = useMemo(
    () => buildWirePath(connection.srcPoint, connection.dstPoint, waypoints),
    [connection.srcPoint, connection.dstPoint, waypoints]
  )

  const isSingleLine = SINGLE_LINE_PROTOCOLS.has(connection.protocol)
  const strokeWidth  = WIRE_STROKE_WIDTH[connection.protocol] ?? 1.2

  const parallelLines = useMemo(
    () => isSingleLine ? null : buildParallelLines(pathPoints, connection.wireCount),
    [pathPoints, connection.wireCount, isSingleLine]
  )

  // Flat centerline for the invisible hit area
  const centerPts = useMemo(
    () => pathPoints.flatMap(p => [p.x, p.y]),
    [pathPoints]
  )

  const handleWireClick = useCallback((e) => {
    if (!onAddWaypoint) return
    e.cancelBubble = true
    const stage = e.target.getStage()
    const ptr = stage.getPointerPosition()
    const worldX = (ptr.x - panX) / zoom
    const worldY = (ptr.y - panY) / zoom
    const newWaypoints = insertWaypoint(waypoints, { x: worldX, y: worldY }, pathPoints)
    onAddWaypoint(connection.key, newWaypoints)
  }, [onAddWaypoint, panX, panY, zoom, waypoints, pathPoints, connection.key])

  return (
    <Group opacity={opacity}>
      {/* Invisible wide hit area for click-to-insert-waypoint */}
      <Line
        points={centerPts}
        stroke="transparent"
        strokeWidth={1}
        hitStrokeWidth={14}
        lineCap="round"
        lineJoin="round"
        onClick={handleWireClick}
        listening={!!onAddWaypoint}
      />

      {isSingleLine ? (
        // Power / motor: single thick centerline
        <Line
          points={centerPts}
          stroke={connection.color}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      ) : (
        // Signal wires: N parallel strands
        parallelLines.map((pts, i) => (
          <Line
            key={i}
            points={pts}
            stroke={connection.color}
            strokeWidth={strokeWidth}
            lineCap="round"
            lineJoin="round"
            listening={false}
          />
        ))
      )}

      {/* Draggable waypoint handles (onAddWaypoint defined when enabled) */}
      {onAddWaypoint && waypoints.map((wp, idx) => (
        <WaypointHandle
          key={idx}
          index={idx}
          wp={wp}
          color={connection.color}
          connectionKey={connection.key}
          allWaypoints={waypoints}
          onMove={onAddWaypoint}
          onRemove={onRemoveWaypoint}
        />
      ))}
    </Group>
  )
}

// ── WireLayer ──────────────────────────────────────────────────────────────

export default function WireLayer({
  components,
  wireWaypoints,
  canvasMode,
  panX, panY, zoom,
  selectedComponentId,
  onAddWaypoint,
  onRemoveWaypoint,
}) {
  const connections = useMemo(
    () => buildConnections(components, canvasMode),
    [components, canvasMode]
  )

  const hasSelection = !!selectedComponentId

  return (
    <Group listening={!!onAddWaypoint}>
      {connections.map(conn => {
        // Opacity: dim unrelated wires when a component is selected
        let opacity
        if (!hasSelection) {
          opacity = 0.40
        } else if (conn.key.includes(selectedComponentId)) {
          opacity = 0.85
        } else {
          opacity = 0.10
        }

        return (
          <WireGroup
            key={conn.key}
            connection={conn}
            waypoints={wireWaypoints[conn.key] ?? []}
            panX={panX}
            panY={panY}
            zoom={zoom}
            opacity={opacity}
            onAddWaypoint={onAddWaypoint}
            onRemoveWaypoint={onRemoveWaypoint}
          />
        )
      })}
    </Group>
  )
}
