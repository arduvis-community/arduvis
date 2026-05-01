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

import { useRef, useCallback, useEffect, useState } from 'react'
import { Stage, Layer, Rect, Group, Text, Circle, Image as KonvaImage } from 'react-konva'
import { useAppStore } from '../store/useAppStore'
import WireLayer from './WireLayer'
import CanTopologyView from './CanTopologyView'

const STATUS_COLORS = { green: '#4ade80', amber: '#fbbf24', gray: '#6b7280' }

function componentStatus(c) {
  if (c.complete === true)  return 'green'
  if (c.complete === false) return 'amber'
  const hasAny = (c.fields && Object.keys(c.fields).length > 0) || !!c.outputPin
  if (!hasAny) return 'gray'
  if (c.virtual) return 'green'
  return c.outputPin ? 'green' : 'amber'
}

const CHIP_W = 160
const CHIP_H = 32
const DRAG_THRESHOLD = 6   // px — cursor must move this far before drag starts

function chipDisplayLabel(component, allComponents) {
  const { defId, label, fields } = component
  if (defId === 'motor') {
    const num = fields?.motor_num
    return num != null ? `Motor ${num}` : label
  }
  if (defId === 'esc') {
    const cm = fields?.connected_motors || 0
    if (cm) {
      const assigned = Array.from({ length: 12 }, (_, i) => i + 1)
        .filter(n => (cm >> (n - 1)) & 1)
      return `ESC [${assigned.join(', ')}]`
    }
    const nums = allComponents
      .filter(c => c.defId === 'motor' && c.fields?.motor_num != null)
      .map(c => c.fields.motor_num)
      .sort((a, b) => a - b)
    return nums.length ? `ESC [${nums.join(', ')}]` : label
  }
  return label
}

// Pure rendering — no Konva event handling (interaction lives in the div layer)
function BlockChip({ component, allComponents, isSelected }) {
  const icon   = component.icon || '◆'
  const status = componentStatus(component)
  const DOT_X  = CHIP_W - 12
  const DOT_Y  = CHIP_H / 2
  const displayLabel = chipDisplayLabel(component, allComponents)

  return (
    <Group id={component.id} x={component.x} y={component.y}>
      <Rect
        width={CHIP_W} height={CHIP_H} cornerRadius={6}
        fill="rgba(17,24,39,0.92)"
        stroke={isSelected ? '#3b82f6' : 'rgba(255,255,255,0.10)'}
        strokeWidth={isSelected ? 1.5 : 0.5} />
      <Text text={icon} x={7} y={9} fontSize={14} />
      <Text
        text={displayLabel}
        x={26} y={10}
        width={DOT_X - 26 - 6}
        fontSize={11} fill="#e5e7eb" fontFamily="system-ui"
        wrap="none" ellipsis={true} />
      <Circle x={DOT_X} y={DOT_Y} radius={4} fill={STATUS_COLORS[status]} />
    </Group>
  )
}

export default function CanvasArea() {
  const {
    components, selectComponent, deselectAll, moveComponent, addComponent,
    zoom, panX, panY, setZoom, setPan,
    activeView, setActiveView,
    backgroundImageTop, backgroundImageBottom,
    snapEnabled, snapSize,
    selectedComponentId,
    canvasMode,
    showWires, wireWaypoints,
  } = useAppStore()

  const stageRef     = useRef(null)
  const containerRef = useRef(null)

  // Refs to store actions — keep stable in [] callbacks
  const selectRef   = useRef(selectComponent);  selectRef.current   = selectComponent
  const deselectRef = useRef(deselectAll);       deselectRef.current = deselectAll
  const setPanRef   = useRef(setPan);            setPanRef.current   = setPan
  const moveRef     = useRef(moveComponent);     moveRef.current     = moveComponent

  // Always-fresh canvas + snap state for [] callbacks
  const liveRef = useRef({})
  const bgUrl = activeView === 'top' ? backgroundImageTop : backgroundImageBottom
  liveRef.current = { panX, panY, zoom, components, snapEnabled, snapSize, bgUrl }

  // Active gesture state — never triggers re-render
  const panRef  = useRef(null)   // { startX, startY, startPanX, startPanY }
  const dragRef = useRef(null)   // { chipId, startMouseX, startMouseY, startChipX, startChipY, active }

  // Resize canvas to match container — adjusts pan so the world centre stays fixed.
  // Depends on canvasMode so it re-attaches after returning from topology mode
  // (the div unmounts during topology, nulling containerRef).
  const [stageSize, setStageSize] = useState({ w: 900, h: 600 })
  const prevSizeRef = useRef({ w: 0, h: 0 })
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const newW = Math.round(width)
      const newH = Math.round(height)
      const prev = prevSizeRef.current
      if (prev.w > 0 && prev.h > 0) {
        const { panX: px, panY: py, zoom: z } = liveRef.current
        const cx = (-px + prev.w / 2) / z
        const cy = (-py + prev.h / 2) / z
        setPanRef.current(newW / 2 - cx * z, newH / 2 - cy * z)
      }
      prevSizeRef.current = { w: newW, h: newH }
      setStageSize({ w: newW, h: newH })
    })
    ro.observe(containerRef.current)
    const initW = Math.round(containerRef.current.clientWidth)
    const initH = Math.round(containerRef.current.clientHeight)
    prevSizeRef.current = { w: initW, h: initH }
    setStageSize({ w: initW, h: initH })
    return () => ro.disconnect()
  }, [canvasMode])

  // Load background as HTMLImageElement so Konva can draw it inside the Layer
  const [bgImageEl, setBgImageEl] = useState(null)
  useEffect(() => {
    if (!bgUrl) { setBgImageEl(null); return }
    const img = new window.Image()
    img.onload = () => setBgImageEl(img)
    img.src = bgUrl
  }, [bgUrl])

  // Compute object-contain dimensions in world space.
  // BG_SCALE > 1 makes the airframe larger in world space so component chips
  // appear proportionally smaller relative to the aircraft.
  const BG_SCALE = 2.0
  const bgRect = (() => {
    if (!bgImageEl || !stageSize.w || !stageSize.h) return null
    const natW = bgImageEl.naturalWidth  || stageSize.w
    const natH = bgImageEl.naturalHeight || stageSize.h
    const targetW = stageSize.w * BG_SCALE
    const targetH = stageSize.h * BG_SCALE
    const scale = Math.min(targetW / natW, targetH / natH)
    const w = natW * scale
    const h = natH * scale
    return { x: (targetW - w) / 2, y: (targetH - h) / 2, w, h }
  })()

  // ── Drop ──────────────────────────────────────────────────────────────────────
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const { panX, panY, zoom, snapEnabled, snapSize, bgUrl } = liveRef.current
    if (!bgUrl) return
    const raw = e.dataTransfer.getData('application/avc-component')
    if (!raw) return
    const item = JSON.parse(raw)
    const snap = (v) => snapEnabled ? Math.round(v / snapSize) * snapSize : v
    const rect = e.currentTarget.getBoundingClientRect()
    const x = snap((e.clientX - rect.left - panX) / zoom)
    const y = snap((e.clientY - rect.top  - panY) / zoom)
    addComponent(item.defId, item.label, item.icon, item.virtual, x, y)
  }, [addComponent])

  // ── Window-level mouse: handles both pan tracking and chip drag ───────────────
  useEffect(() => {
    const snap = (v) => {
      const { snapEnabled, snapSize } = liveRef.current
      return snapEnabled ? Math.round(v / snapSize) * snapSize : v
    }

    const onMove = (e) => {
      // ── Chip drag ──
      if (dragRef.current) {
        const ds = dragRef.current
        const dx = e.clientX - ds.startMouseX
        const dy = e.clientY - ds.startMouseY

        if (!ds.active) {
          if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return
          ds.active = true
        }

        const { zoom } = liveRef.current
        const newX = ds.startChipX + dx / zoom
        const newY = ds.startChipY + dy / zoom

        // Update the Konva node directly — no React re-render needed during drag
        const node = stageRef.current?.findOne('#' + ds.chipId)
        if (node) {
          node.x(newX)
          node.y(newY)
          node.getLayer().batchDraw()
        }
        return
      }

      // ── Pan ──
      if (!panRef.current) return
      const dx = e.clientX - panRef.current.startX
      const dy = e.clientY - panRef.current.startY
      setPanRef.current(
        panRef.current.startPanX + dx,
        panRef.current.startPanY + dy,
      )
    }

    const onUp = (e) => {
      if (dragRef.current?.active) {
        const ds = dragRef.current
        const { zoom } = liveRef.current
        const dx = e.clientX - ds.startMouseX
        const dy = e.clientY - ds.startMouseY
        const finalX = snap(ds.startChipX + dx / zoom)
        const finalY = snap(ds.startChipY + dy / zoom)

        // Snap the Konva node to avoid a visual jump when React re-renders
        const node = stageRef.current?.findOne('#' + ds.chipId)
        if (node) {
          node.x(finalX)
          node.y(finalY)
          node.getLayer().batchDraw()
        }

        moveRef.current(ds.chipId, finalX, finalY)
      }
      dragRef.current = null
      panRef.current  = null
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
  }, [])

  // ── Primary interaction handler ───────────────────────────────────────────────
  const handleDivMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    const { panX, panY, zoom, components } = liveRef.current
    const rect = containerRef.current.getBoundingClientRect()
    const cx = (e.clientX - rect.left  - panX) / zoom
    const cy = (e.clientY - rect.top   - panY) / zoom

    // Last match wins (highest z-order chip)
    let hit = null
    for (const c of components) {
      if (!c.noCanvas && cx >= c.x && cx <= c.x + CHIP_W && cy >= c.y && cy <= c.y + CHIP_H) {
        hit = c
      }
    }

    if (hit) {
      selectRef.current(hit.id)
      dragRef.current = {
        chipId:     hit.id,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startChipX:  hit.x,
        startChipY:  hit.y,
        active:     false,
      }
      return
    }

    deselectRef.current()
    panRef.current = {
      startX:    e.clientX,
      startY:    e.clientY,
      startPanX: panX,
      startPanY: panY,
    }
  }, [])

  // ── Wheel zoom ────────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault()
    const scaleBy = 1.08
    const { panX, panY, zoom: curZoom } = liveRef.current
    const nw      = e.evt.deltaY < 0 ? curZoom * scaleBy : curZoom / scaleBy
    const clamped = Math.min(4, Math.max(0.25, nw))
    const ptr     = stageRef.current.getPointerPosition()
    const nx = -(ptr.x - panX) / curZoom * clamped + ptr.x
    const ny = -(ptr.y - panY) / curZoom * clamped + ptr.y
    setZoom(clamped)
    setPan(nx, ny)
  }, [setZoom, setPan])

  // ── Topology mode — pure HTML+SVG view (no Konva canvas) ─────────────────────
  if (canvasMode === 'topology') {
    return <CanTopologyView />
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-gray-900"
      onMouseDown={handleDivMouseDown}
      onDrop={handleDrop}
      onDragOver={e => e.preventDefault()}>

      {/* View tabs */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex rounded overflow-hidden
                      border border-gray-600">
        {['top','bottom'].map(v => {
          const isActive = activeView === v
          const disabled = v === 'bottom' && !backgroundImageBottom
          return (
            <button key={v}
              onClick={() => !disabled && setActiveView(v)}
              title={disabled ? 'No bottom view loaded — import an airframe or use Standard View' : undefined}
              className={`text-xs px-4 py-1 transition-colors ${
                disabled
                  ? 'bg-gray-800/40 text-gray-600 cursor-not-allowed'
                  : isActive
                    ? 'bg-blue-700/60 text-white'
                    : 'bg-gray-800/80 text-gray-400 hover:text-gray-200'}`}>
              {v.charAt(0).toUpperCase() + v.slice(1)} view
              {disabled && <span className="ml-1 text-gray-700">—</span>}
            </button>
          )
        })}
      </div>

      <Stage
        ref={stageRef}
        width={stageSize.w}
        height={stageSize.h}
        onWheel={handleWheel}>

        <Layer x={panX} y={panY} scaleX={zoom} scaleY={zoom}>

          {/* Background airframe image */}
          {bgImageEl && bgRect && (
            <KonvaImage
              image={bgImageEl}
              x={bgRect.x} y={bgRect.y}
              width={bgRect.w} height={bgRect.h}
              opacity={0.85}
              listening={false} />
          )}

          {/* Dot grid */}
          {Array.from({ length: 40 }, (_, row) =>
            Array.from({ length: 60 }, (_, col) => (
              <Rect key={`${row}-${col}`}
                x={col * 20 + 9} y={row * 20 + 9}
                width={2} height={2} cornerRadius={1}
                fill="rgba(255,255,255,0.04)"
                listening={false} />
            ))
          )}

          {/* Wire routing layer — read-only in CE (no waypoint editing) */}
          {showWires && (
            <WireLayer
              components={components}
              wireWaypoints={wireWaypoints}
              canvasMode={canvasMode}
              panX={panX} panY={panY} zoom={zoom}
              selectedComponentId={selectedComponentId}
            />
          )}

          {components.filter(c => !c.noCanvas).map(c => (
            <BlockChip
              key={c.id}
              component={c}
              allComponents={components}
              isSelected={c.id === selectedComponentId} />
          ))}

        </Layer>

        {/* Fixed watermark — not affected by pan/zoom */}
        <Layer listening={false}>
          <Text
            text="BETA — Not validated for flight use"
            x={8} y={stageSize.h - 22}
            fontSize={11}
            fontFamily="monospace"
            fill="rgba(251,191,36,0.35)"
            listening={false} />
        </Layer>

      </Stage>

      {/* Onboarding hint */}
      {!liveRef.current.bgUrl
        && !components.some(c => ['frame_copter','frame_plane','frame_vtol'].includes(c.defId))
        && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center max-w-xs">
            <p className="text-gray-600 text-xs leading-relaxed">
              Start by selecting your vehicle type in the toolbar,<br />
              then add a <span className="text-gray-400">Frame</span> component
              from the <span className="text-gray-400">Vehicle Setup</span> palette.
            </p>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 z-10">
        <button onClick={() => setZoom(Math.min(4, zoom * 1.2))}
          className="w-7 h-7 bg-gray-800 border border-gray-600 rounded text-gray-300 hover:bg-gray-700 text-sm">+</button>
        <span className="text-xs text-gray-500 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => setZoom(Math.max(0.25, zoom / 1.2))}
          className="w-7 h-7 bg-gray-800 border border-gray-600 rounded text-gray-300 hover:bg-gray-700 text-sm">−</button>
        <button onClick={() => { setZoom(1); setPan(0, 0) }}
          className="ml-1 text-xs px-2 h-7 bg-gray-800 border border-gray-600 rounded text-gray-400 hover:bg-gray-700">
          Reset
        </button>
      </div>
    </div>
  )
}
