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
 * Inspector.jsx
 * Right-panel form that renders editable fields for the selected canvas block.
 *
 * On first selection the full component definition (including inspector groups)
 * is fetched from GET /api/components/{defId} and cached in `defCache`.
 *
 * Field types handled:
 *   select      → <select>
 *   number      → <input type="number">
 *   toggle      → toggle switch row
 *   text        → <input type="text">
 *   bitmask     → <input type="number"> (raw integer; note explains bit layout)
 *   multiselect → checkboxes; stored value is OR-ed bitmask integer
 *   pinSelect   → PinSelector grid; written to component.outputPin, not fields
 *
 * After any change a `complete` boolean is written to the component:
 *   true  = all required:true fields have values (and outputPin if physical)
 *   false = not yet complete
 * CanvasArea reads this to colour the status ring green / amber / gray.
 */

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api/client'
import PinSelector from './PinSelector'
import { fieldVisible, computeComplete } from '../utils/componentUtils'

const FRAME_DEF_IDS = new Set(['frame_copter', 'frame_plane', 'frame_vtol'])
const MOTOR_IDS     = ['motor', 'esc']

const PIN_TO_SERVO = {
  ...Object.fromEntries(['M1','M2','M3','M4','M5','M6','M7','M8'].map((p, i) => [p, i + 1])),
  ...Object.fromEntries(['A1','A2','A3','A4','A5','A6'].map((p, i) => [p, i + 9])),
}

function computeClaimedPorts(components) {
  const claimed = {}
  for (const c of components) {
    if (!c.outputPin) continue
    const sn = PIN_TO_SERVO[c.outputPin]
    if (!sn) continue
    const key = `servo${sn}_function`
    if (c.defId === 'motor' && c.fields?.motor_num != null) {
      claimed[key] = { chipLabel: `Motor ${c.fields.motor_num}`, fn: 32 + c.fields.motor_num }
    } else if (['servo', 'esc'].includes(c.defId) && c.fields?.servo_function != null) {
      claimed[key] = { chipLabel: c.label, fn: c.fields.servo_function }
    }
  }
  return claimed
}

function AirframeSection({ activeView, backgroundImageTop, backgroundImageBottom, setBackground, setStandardViewsOpen, viewMismatch }) {
  const fileRef = useRef(null)
  const hasImage = activeView === 'top' ? !!backgroundImageTop : !!backgroundImageBottom

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setBackground(activeView, ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="mb-3">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
        Airframe image ({activeView} view)
      </div>
      <input ref={fileRef} type="file" accept=".svg,.png,.jpg,.jpeg"
        className="hidden" onChange={handleFile} />
      <div className="flex gap-1.5">
        <button
          onClick={() => fileRef.current?.click()}
          className={`flex-1 text-xs px-2 py-1.5 rounded border font-medium
            ${hasImage
              ? 'border-amber-600 text-amber-300 hover:bg-amber-900/30'
              : 'border-gray-600 text-gray-300 hover:bg-gray-700'}`}>
          {hasImage ? 'Replace image' : 'Import image'}
        </button>
        {hasImage && (
          <button
            onClick={() => setBackground(activeView, null)}
            className="text-xs px-2 py-1.5 rounded border border-red-900 text-red-400
                       hover:bg-red-900/30">
            Clear
          </button>
        )}
      </div>
      <button
        onClick={() => setStandardViewsOpen(true)}
        className="relative w-full text-xs px-2 py-1.5 rounded border border-blue-800/60
                   text-amber-300 hover:bg-amber-900/20 mt-1">
        Standard view…
        {viewMismatch && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400"
                title="View motor count doesn't match placed components" />
        )}
      </button>
    </div>
  )
}

// ── Module-level definition cache ─────────────────────────────────────────────
const defCache = new Map()

// ── Cube variant → label / icon ───────────────────────────────────────────────
const CUBE_VARIANT_LABELS = {
  cube_orange_plus: 'CubeOrange+', cube_orange: 'CubeOrange', cube_purple: 'CubePurple',
  cube_yellow: 'CubeYellow', cube_green: 'CubeGreen', cube_black: 'CubeBlack',
  cube_blue: 'CubeBlue', cube_red: 'CubeRed', cube_mini: 'CubeMini',
}
const CUBE_VARIANT_ICONS = {
  cube_orange_plus: '🟧', cube_orange: '🟧', cube_purple: '🟪',
  cube_yellow: '🟨', cube_green: '🟩', cube_black: '⬛',
  cube_blue: '🟦', cube_red: '🟥', cube_mini: '⬜',
}

// fieldVisible and computeComplete imported from ../utils/componentUtils

// ── Shared input / select classes ─────────────────────────────────────────────
const INPUT_CLS =
  'bg-gray-900 text-gray-200 text-sm border border-gray-600 rounded ' +
  'px-2 py-1.5 w-full focus:outline-none focus:border-amber-500'
const SELECT_CLS = INPUT_CLS + ' cursor-pointer'

// ── Individual field-type renderers ───────────────────────────────────────────

function FieldSelect({ field, value, onChange }) {
  return (
    <select
      value={value ?? field.default ?? ''}
      onChange={e => onChange(e.target.value)}
      className={SELECT_CLS}>
      {(value === undefined || value === null || value === '') &&
        <option value="">— select —</option>}
      {field.options?.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function FieldNumber({ field, value, onChange }) {
  return (
    <input
      type="number"
      value={value ?? field.default ?? ''}
      min={field.min} max={field.max} step={field.step ?? 'any'}
      onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className={INPUT_CLS}
    />
  )
}

function FieldToggle({ field, value, onChange }) {
  const checked = value !== undefined ? !!value : !!field.default
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                  ${checked ? 'bg-amber-600' : 'bg-gray-600'}`}>
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
                        ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

function FieldText({ field, value, onChange }) {
  return (
    <input
      type="text"
      value={value ?? field.default ?? ''}
      onChange={e => onChange(e.target.value)}
      className={INPUT_CLS}
    />
  )
}

function FieldBitmask({ field, value, onChange }) {
  const cur = typeof value === 'number' ? value : (field.default ?? 0)
  if (field.bits?.length) {
    const toggle = bitN => onChange((cur ?? 0) ^ (1 << bitN))
    const isChecked = bitN => (((cur ?? 0) >> bitN) & 1) === 1
    return (
      <div className="space-y-1.5">
        {field.bits.map(b => {
          const checked = isChecked(b.bit)
          return (
            <label key={b.bit}
              className="flex items-center gap-2 cursor-pointer select-none group"
              onClick={() => toggle(b.bit)}>
              <span className={`w-3.5 h-3.5 flex-shrink-0 rounded border transition-colors
                ${checked
                  ? 'bg-amber-600 border-amber-500'
                  : 'border-gray-500 group-hover:border-blue-400'}`}>
                {checked && (
                  <svg viewBox="0 0 10 10" className="w-3.5 h-3.5 text-white">
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5"
                      fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span className="text-xs text-gray-300">{b.label}</span>
            </label>
          )
        })}
        <p className="text-xs text-gray-500 mt-1">Value: {cur}</p>
      </div>
    )
  }
  return (
    <input
      type="number"
      value={cur}
      min={0} step={1}
      onChange={e => onChange(Number(e.target.value))}
      className={INPUT_CLS}
    />
  )
}

function FieldMultiselect({ field, value, onChange }) {
  const cur = typeof value === 'number' ? value : (field.default ?? 0)
  return (
    <div className="space-y-1.5">
      {field.options?.map(o => {
        const checked = (cur & o.value) !== 0
        return (
          <label key={o.value}
            className="flex items-center gap-2 cursor-pointer select-none group"
            onClick={() => onChange(cur ^ o.value)}>
            <span className={`w-3.5 h-3.5 flex-shrink-0 rounded border transition-colors
              ${checked
                ? 'bg-amber-600 border-amber-500'
                : 'border-gray-500 group-hover:border-blue-400'}`}>
              {checked && (
                <svg viewBox="0 0 10 10" className="w-3.5 h-3.5 text-white">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5"
                    fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            <span className="text-xs text-gray-300">{o.label}</span>
          </label>
        )
      })}
    </div>
  )
}

// ── Tooltip icon ──────────────────────────────────────────────────────────────

function TooltipIcon({ field, vehicleType }) {
  const [pos, setPos] = useState(null)
  const spanRef = useRef(null)
  const leaveTimer = useRef(null)
  const prefix = vehicleType === 'copter' ? 'copter' : 'plane'
  const docsUrl = field.docs_param
    ? `https://ardupilot.org/${prefix}/docs/parameters.html#${field.docs_param.toLowerCase().replace(/_/g, '-')}`
    : null

  const handleEnter = () => {
    clearTimeout(leaveTimer.current)
    const rect = spanRef.current?.getBoundingClientRect()
    if (rect) setPos({ bottom: window.innerHeight - rect.top + 6, right: window.innerWidth - rect.right })
  }
  const handleLeave = () => {
    leaveTimer.current = setTimeout(() => setPos(null), 100)
  }

  return (
    <span ref={spanRef} className="inline-flex items-center" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <span className="text-[10px] text-gray-600 hover:text-amber-400 cursor-help select-none ml-0.5 leading-none">
        ⓘ
      </span>
      {pos && createPortal(
        <div
          style={{ position: 'fixed', bottom: pos.bottom, right: pos.right, zIndex: 9999, width: '13rem' }}
          className="bg-gray-950 border border-gray-600 rounded p-2 shadow-xl"
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
        >
          <p className="text-[10px] text-gray-300 leading-relaxed">{field.tooltip}</p>
          {docsUrl && (
            <a href={docsUrl} target="_blank" rel="noreferrer"
              className="text-[9px] text-amber-400 hover:text-amber-300 mt-1.5 block">
              View in ArduPilot docs ↗
            </a>
          )}
        </div>,
        document.body
      )}
    </span>
  )
}

// ── Field row: label + control + optional note ────────────────────────────────

function FieldRow({ field, component, onFieldChange, onPinChange, usedPins, vehicleType, claim }) {
  if (claim) {
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500">{field.label}</label>
        </div>
        <div className="flex items-center justify-between rounded bg-gray-700/40 border border-gray-700 px-2 py-1">
          <span className="text-xs text-gray-300 truncate">{claim.chipLabel}</span>
          <span className="text-[10px] text-gray-500 ml-1 flex-shrink-0">fn {claim.fn}</span>
        </div>
      </div>
    )
  }

  const value = field.type === 'pinSelect'
    ? component.outputPin
    : component.fields[field.key]

  const handleChange = v =>
    field.type === 'pinSelect' ? onPinChange(v) : onFieldChange(field.key, v)

  let control
  switch (field.type) {
    case 'select':
      control = <FieldSelect field={field} value={value} onChange={handleChange} />
      break
    case 'number':
      control = <FieldNumber field={field} value={value} onChange={handleChange} />
      break
    case 'toggle':
      control = (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 flex items-center">
            {field.label}
            {field.tooltip && <TooltipIcon field={field} vehicleType={vehicleType} />}
          </span>
          <FieldToggle field={field} value={value} onChange={handleChange} />
        </div>
      )
      break
    case 'text':
      control = <FieldText field={field} value={value} onChange={handleChange} />
      break
    case 'bitmask':
      control = <FieldBitmask field={field} value={value} onChange={handleChange} />
      break
    case 'multiselect':
      control = <FieldMultiselect field={field} value={value} onChange={handleChange} />
      break
    case 'pinSelect':
      control = (
        <PinSelector
          value={component.outputPin}
          usedPins={usedPins}
          onChange={handleChange}
        />
      )
      break
    default:
      control = <FieldText field={field} value={value} onChange={handleChange} />
  }

  return (
    <div className="flex flex-col gap-0.5">
      {field.type !== 'toggle' && (
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-400 flex items-center">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
            {field.tooltip && <TooltipIcon field={field} vehicleType={vehicleType} />}
          </label>
          {field.unit && <span className="text-xs text-gray-400">{field.unit}</span>}
        </div>
      )}
      {control}
      {field.note && (
        <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{field.note}</p>
      )}
    </div>
  )
}

// ── Inspector group block ─────────────────────────────────────────────────────

function InspectorGroup({ group, component, vehicleType, onFieldChange, onPinChange, usedPins, claimedPorts, simpleMode }) {
  if (simpleMode && group.advanced) return null
  const visibleFields = group.fields.filter(f =>
    fieldVisible(f, component.fields) &&
    (!f.vehicle || f.vehicle === vehicleType) &&
    !(simpleMode && f.advanced)
  )
  if (!visibleFields.length) return null

  return (
    <div className="mb-3">
      <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
        {group.label}
      </div>
      <div className="flex flex-col gap-2.5">
        {visibleFields.map((f, fi) => (
          <FieldRow
            key={`${f.key}_${fi}`}
            field={f}
            component={component}
            onFieldChange={onFieldChange}
            onPinChange={onPinChange}
            usedPins={usedPins}
            vehicleType={vehicleType}
            claim={claimedPorts?.[f.key]}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main Inspector component ──────────────────────────────────────────────────

export default function Inspector() {
  const {
    selectedComponentId,
    components,
    updateComponent,
    removeComponent,
    duplicateComponent,
    deselectAll,
    vehicleType,
    activeView,
    backgroundImageTop,
    backgroundImageBottom,
    setBackground,
    setStandardViewsOpen,
    activeViewMotorCount,
    canvasMode,
    inspectorSimpleMode, toggleInspectorSimpleMode,
  } = useAppStore()

  const component    = components.find(c => c.id === selectedComponentId)
  const fcChips      = components.filter(c => c.defId === 'autopilot_cube')
  const escChips     = components.filter(c => c.defId === 'esc')
  const batteryChips = components.filter(c => c.defId === 'battery')
  const pdbChips     = components.filter(c => c.defId === 'pdb')
  const powerSources = components.filter(c => ['battery', 'pdb'].includes(c.defId))

  const placedMotorCount = components.filter(c => MOTOR_IDS.includes(c.defId)).length
  const viewMismatch = activeViewMotorCount > 0 && placedMotorCount > 0 && placedMotorCount !== activeViewMotorCount

  const [def,      setDef]      = useState(null)
  const [defError, setDefError] = useState(null)
  const [loading,  setLoading]  = useState(false)

  // Re-run whenever the selected component ID changes (not just defId) so that
  // switching between two blocks of the same type still refreshes correctly.
  // Cached defs are applied synchronously — no null flash.
  useEffect(() => {
    setDefError(null)

    if (!component) {
      setDef(null)
      setLoading(false)
      return
    }

    const apply = (d) => {
      setDef(d)
      setLoading(false)
      updateComponent(component.id, { complete: computeComplete(component, d) })
    }

    if (defCache.has(component.defId)) {
      apply(defCache.get(component.defId))
      return
    }

    // Not yet cached — show loading, then fetch
    setDef(null)
    setLoading(true)
    let cancelled = false

    api.getComponentDef(component.defId)
      .then(d => {
        if (cancelled) return
        defCache.set(component.defId, d)
        apply(d)
      })
      .catch(e => {
        if (cancelled) return
        setDefError(e.message)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedComponentId])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!component) {
    return (
      <div className="w-64 flex-shrink-0 bg-gray-800/40 border-l border-gray-700
                      flex flex-col items-center justify-center gap-3 text-gray-600">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="7" height="7" rx="1"/>
          <rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/>
          <rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <span className="text-xs">Select a component</span>
      </div>
    )
  }

  // Pins already claimed by other physical components on this canvas
  const usedPins = new Set(
    components
      .filter(c => c.id !== component.id && c.outputPin)
      .map(c => c.outputPin)
  )

  const hasPinSelect = !!def?.inspector?.flatMap(g => g.fields).some(f => f.type === 'pinSelect')
  const isPhysical   = hasPinSelect && component.fields?.connection_type !== 'dronecan'

  // ── Field-change handlers ─────────────────────────────────────────────────
  const applyAndMark = (patch) => {
    // Build updated component snapshot and recompute complete
    const next = {
      ...component,
      fields:    { ...component.fields, ...patch.fields },
      outputPin: patch.outputPin ?? component.outputPin,
    }
    updateComponent(component.id, {
      ...patch,
      complete: computeComplete(next, def),
    })
  }

  const handleFieldChange = (key, value) => {
    // Battery preset auto-fill
    if (key === 'preset' && def) {
      const presetGroup = def.inspector?.flatMap(g => g.fields)
        .find(f => f.key === 'preset')
      const opt = presetGroup?.options?.find(o => String(o.value) === String(value))
      if (opt?.autofill && Object.keys(opt.autofill).length > 0) {
        const newFields = { ...component.fields, preset: value, ...opt.autofill }
        applyAndMark({ fields: newFields })
        return
      }
    }

    // Cube variant → sync label + icon
    if (key === 'cube_variant') {
      const newLabel = CUBE_VARIANT_LABELS[value]
      if (newLabel) {
        applyAndMark({
          fields: { ...component.fields, [key]: value },
          label: newLabel,
          icon: CUBE_VARIANT_ICONS[value] ?? component.icon,
        })
        return
      }
    }

    // CAN assignment — value is now an array of FC ids (or null).
    if (key === 'fc_assignment') {
      const fcIds = Array.isArray(value) ? value : (value ? [value] : [])
      const newFields = { ...component.fields, [key]: fcIds.length ? fcIds : null }
      if (fcIds.length && newFields.connection_type !== 'dronecan') {
        const hasDroneCanOption = def?.inspector?.flatMap(g => g.fields)
          .find(f => f.key === 'connection_type')
          ?.options?.some(o => o.value === 'dronecan')
        if (hasDroneCanOption) newFields.connection_type = 'dronecan'
      }
      applyAndMark({ fields: newFields })
      return
    }

    applyAndMark({ fields: { ...component.fields, [key]: value } })
  }

  const handlePinChange = (pin) => {
    applyAndMark({ outputPin: pin })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="w-64 flex-shrink-0 bg-gray-800/40 border-l border-gray-700
                    flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-100 truncate flex-1">
            {component.label}
          </span>
          <button
            onClick={() => duplicateComponent(component.id)}
            className="text-[10px] text-gray-400 hover:text-gray-200 px-1.5 py-0.5 rounded
                       border border-gray-700 hover:border-gray-500 flex-shrink-0">
            Dup
          </button>
          <button
            onClick={() => { removeComponent(component.id); deselectAll() }}
            className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded
                       border border-red-900 hover:border-red-600 flex-shrink-0">
            Del
          </button>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="text-[10px] text-gray-600">{component.defId}</div>
          <button onClick={toggleInspectorSimpleMode}
            className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
              inspectorSimpleMode
                ? 'border-gray-600 text-gray-500 hover:text-gray-300'
                : 'border-blue-700/60 bg-blue-900/20 text-amber-400'
            }`}
            title={inspectorSimpleMode ? 'Show all fields' : 'Hide advanced fields'}>
            {inspectorSimpleMode ? 'Simple' : 'Full'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-3">

        {loading && (
          <div className="text-xs text-gray-500 animate-pulse">Loading…</div>
        )}

        {defError && (
          <div className="text-xs text-red-400 bg-red-900/20 rounded p-2">
            Could not load inspector schema.
          </div>
        )}

        {FRAME_DEF_IDS.has(component.defId) && (
          <AirframeSection
            activeView={activeView}
            backgroundImageTop={backgroundImageTop}
            backgroundImageBottom={backgroundImageBottom}
            setBackground={setBackground}
            setStandardViewsOpen={setStandardViewsOpen}
            viewMismatch={viewMismatch}
          />
        )}

        {!loading && !defError && def && (
          <>
            {/* CAN Assignment */}
            {(canvasMode === 'topology' || component.fields?.connection_type === 'dronecan')
              && component.defId !== 'autopilot_cube'
              && !isPhysical
              && fcChips.length > 0 && (
              <div className="mb-3">
                <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
                  CAN Assignment
                </div>
                <select
                  className={SELECT_CLS}
                  value={(() => {
                    const raw = component.fields?.fc_assignment
                    return Array.isArray(raw) ? (raw[0] ?? '') : (raw ?? '')
                  })()}
                  onChange={e => handleFieldChange('fc_assignment', e.target.value ? [e.target.value] : null)}>
                  <option value="">Not assigned</option>
                  {fcChips.map(fc => (
                    <option key={fc.id} value={fc.id}>
                      FC {fc.fields?.fc_instance ?? 1} — {fc.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {component.defId === 'motor' && escChips.length > 0 && (
              <div className="mb-3">
                <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
                  ESC
                </div>
                <select
                  className={SELECT_CLS}
                  value={component.fields?.esc_assignment ?? ''}
                  onChange={e => handleFieldChange('esc_assignment', e.target.value || null)}>
                  <option value="">Not assigned</option>
                  {escChips.map(esc => (
                    <option key={esc.id} value={esc.id}>
                      {esc.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* ESC — power source (battery or PDB) */}
            {component.defId === 'esc' && powerSources.length > 0 && (
              <div className="mb-3">
                <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
                  Power Source
                </div>
                <select
                  className={SELECT_CLS}
                  value={component.fields?.power_source ?? ''}
                  onChange={e => handleFieldChange('power_source', e.target.value || null)}>
                  <option value="">Not assigned</option>
                  {powerSources.map(ps => (
                    <option key={ps.id} value={ps.id}>{ps.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* PDB — battery assignment */}
            {component.defId === 'pdb' && batteryChips.length > 0 && (
              <div className="mb-3">
                <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
                  Battery
                </div>
                <select
                  className={SELECT_CLS}
                  value={component.fields?.battery_assignment ?? ''}
                  onChange={e => handleFieldChange('battery_assignment', e.target.value || null)}>
                  <option value="">Not assigned</option>
                  {batteryChips.map(b => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* PDB — FC power rail (BEC output) — multi-select */}
            {component.defId === 'pdb' && fcChips.length > 0 && (
              <div className="mb-3">
                <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
                  FC Power Rail (BEC)
                </div>
                {fcChips.map(fc => {
                  const raw      = component.fields?.fc_power_rails
                  const assigned = Array.isArray(raw) ? raw : (raw ? [raw] : [])
                  const checked  = assigned.includes(fc.id)
                  return (
                    <label key={fc.id} className="flex items-center gap-2 mb-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        className="accent-blue-500"
                        onChange={() => {
                          const next = checked
                            ? assigned.filter(id => id !== fc.id)
                            : [...assigned, fc.id]
                          handleFieldChange('fc_power_rails', next.length ? next : null)
                        }} />
                      <span className="text-xs text-gray-300">
                        FC {fc.fields?.fc_instance ?? 1} — {fc.label}
                      </span>
                    </label>
                  )
                })}
              </div>
            )}

            {/* Battery monitor — which battery it monitors */}
            {component.defId === 'battery_monitor' && batteryChips.length > 0 && (
              <div className="mb-3">
                <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 mb-2">
                  Battery
                </div>
                <select
                  className={SELECT_CLS}
                  value={component.fields?.battery_source ?? ''}
                  onChange={e => handleFieldChange('battery_source', e.target.value || null)}>
                  <option value="">Not assigned</option>
                  {batteryChips.map(b => (
                    <option key={b.id} value={b.id}>{b.label}</option>
                  ))}
                </select>
              </div>
            )}

            {def.inspector?.length === 0 && (
              <p className="text-xs text-gray-500 italic">No configurable fields.</p>
            )}
            {def.inspector?.map((group, i) => (
              <InspectorGroup
                key={i}
                group={group}
                component={component}
                vehicleType={vehicleType}
                onFieldChange={handleFieldChange}
                onPinChange={handlePinChange}
                usedPins={usedPins}
                claimedPorts={component.defId === 'servo_outputs'
                  ? computeClaimedPorts(components) : undefined}
                simpleMode={inspectorSimpleMode}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
