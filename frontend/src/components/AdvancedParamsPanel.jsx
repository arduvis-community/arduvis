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

import React, { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api/client'

function groupKey(name) {
  const idx = name.indexOf('_')
  return idx > 0 ? name.slice(0, idx) : name
}

export default function AdvancedParamsPanel() {
  const {
    vehicleType, baselineParams,
    setBaselineParam, deleteBaselineParam, toggleAdvancedParams,
  } = useAppStore()

  const [meta,      setMeta]      = useState({})   // { PARAM_NAME: { n, d, u, v, r, ... } }
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [collapsed, setCollapsed] = useState(new Set())
  const [selected,  setSelected]  = useState(null)  // currently focused param key

  // Load full param metadata for current vehicle type
  useEffect(() => {
    setLoading(true)
    api.getParamMeta(vehicleType)
      .then(data => { setMeta(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [vehicleType])

  const q = search.trim().toUpperCase()

  // Build grouped structure from full metadata, filtered by search
  const groups = useMemo(() => {
    const map = {}
    for (const key of Object.keys(meta).sort()) {
      const m = meta[key]
      if (q && !key.includes(q) && !(m?.n ?? '').toUpperCase().includes(q)) continue
      const g = groupKey(key)
      if (!map[g]) map[g] = []
      map[g].push(key)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [meta, q])

  const totalMeta    = Object.keys(meta).length
  const totalSet     = Object.keys(baselineParams).length
  const totalVisible = groups.reduce((n, [, keys]) => n + keys.length, 0)

  const toggleGroup = (g) =>
    setCollapsed(prev => { const s = new Set(prev); s.has(g) ? s.delete(g) : s.add(g); return s })
  const collapseAll = () => setCollapsed(new Set(groups.map(([g]) => g)))
  const expandAll   = () => setCollapsed(new Set())

  // Scroll search: when searching, auto-expand all matching groups
  const isCollapsed = (g) => !q && collapsed.has(g)

  return (
    <div className="w-80 flex-shrink-0 bg-gray-800/40 border-l border-gray-700 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-200">Parameters</span>
          {!loading && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
              {q ? `${totalVisible} / ${totalMeta}` : totalMeta}
            </span>
          )}
          {totalSet > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-400 border border-blue-800">
              {totalSet} set
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={expandAll}  className="text-[10px] text-gray-500 hover:text-gray-300">expand</button>
          <span className="text-gray-700">·</span>
          <button onClick={collapseAll} className="text-[10px] text-gray-500 hover:text-gray-300">collapse</button>
          <button onClick={toggleAdvancedParams}
            className="text-gray-500 hover:text-gray-200 text-base leading-none ml-1">✕</button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-2.5 pb-1 flex-shrink-0">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setSelected(null) }}
          placeholder="Search by name or description…"
          className="bg-gray-900 text-gray-200 text-xs border border-gray-600 rounded px-2 py-1.5 w-full
                     focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Vehicle note */}
      <p className="px-3 pb-1.5 text-[10px] text-gray-600 flex-shrink-0">
        {vehicleType === 'vtol' ? 'Plane' : vehicleType.charAt(0).toUpperCase() + vehicleType.slice(1)} parameters
        {totalSet > 0 ? ` · ${totalSet} overridden in this project` : ''}
      </p>

      {/* Param list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <p className="text-[11px] text-gray-500 px-1 pt-3">Loading parameter definitions…</p>
        ) : groups.length === 0 ? (
          <p className="text-[11px] text-gray-600 px-1 pt-3">No matching parameters.</p>
        ) : groups.map(([groupName, keys]) => (
          <div key={groupName} className="mb-0.5">
            <button
              onClick={() => toggleGroup(groupName)}
              className="w-full flex items-center justify-between py-1 px-1 group">
              <div className="flex items-center gap-1.5">
                <span className={`text-[8px] text-gray-600 transition-transform ${isCollapsed(groupName) ? '' : 'rotate-90'}`}>▶</span>
                <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 group-hover:text-gray-300">
                  {groupName}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* count of set params in this group */}
                {keys.filter(k => k in baselineParams).length > 0 && (
                  <span className="text-[9px] text-blue-400">
                    {keys.filter(k => k in baselineParams).length} set
                  </span>
                )}
                <span className="text-[9px] text-gray-700">{keys.length}</span>
              </div>
            </button>

            {!isCollapsed(groupName) && (
              <div className="mb-1">
                {keys.map(key => (
                  <ParamRow
                    key={key}
                    paramKey={key}
                    meta={meta[key]}
                    currentValue={baselineParams[key]}
                    isSelected={selected === key}
                    onSelect={() => setSelected(s => s === key ? null : key)}
                    onSet={setBaselineParam}
                    onClear={deleteBaselineParam}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ParamRow({ paramKey, meta, currentValue, isSelected, onSelect, onSet, onClear }) {
  const isSet = currentValue !== undefined
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')

  const shortKey = (() => { const i = paramKey.indexOf('_'); return i > 0 ? paramKey.slice(i + 1) : paramKey })()

  const hasEnums = meta?.v && Object.keys(meta.v).length > 0

  const startEdit = (e) => {
    e.stopPropagation()
    setDraft(isSet ? String(currentValue) : '')
    setEditing(true)
  }

  const commitEdit = () => {
    const raw = draft.trim()
    if (raw === '') {
      onClear(paramKey)
    } else {
      const num = parseFloat(raw)
      onSet(paramKey, isNaN(num) ? raw : num)
    }
    setEditing(false)
  }

  const handleEnumChange = (e) => {
    const num = parseFloat(e.target.value)
    onSet(paramKey, isNaN(num) ? e.target.value : num)
  }

  return (
    <div className={`rounded px-1.5 py-1 mb-0.5 cursor-pointer transition-colors
      ${isSelected ? 'bg-gray-700/60' : 'hover:bg-gray-700/30'}`}
      onClick={onSelect}>

      {/* Top row: param key + current value / set control */}
      <div className="flex items-center gap-1.5">
        <span className={`text-[11px] font-mono flex-1 min-w-0 truncate
          ${isSet ? 'text-blue-300' : 'text-gray-400'}`}
          title={paramKey}>
          {shortKey}
          {meta?.rr && <span className="ml-1 text-[8px] text-amber-500" title="Reboot required">↺</span>}
        </span>

        {/* Value control */}
        {isSet && !editing && (
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-blue-300 font-mono">
              {hasEnums && meta.v[String(currentValue)] ? meta.v[String(currentValue)] : currentValue}
            </span>
            <button onClick={(e) => { e.stopPropagation(); onClear(paramKey) }}
              className="text-gray-600 hover:text-red-400 text-[10px] leading-none" title="Clear">✕</button>
          </div>
        )}
        {!isSet && !editing && (
          <button onClick={startEdit}
            className="text-[10px] text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100">
            set
          </button>
        )}
      </div>

      {/* Expanded detail */}
      {isSelected && (
        <div className="mt-1.5 space-y-1.5" onClick={e => e.stopPropagation()}>
          {/* Description */}
          {meta?.d && (
            <p className="text-[10px] text-gray-400 leading-relaxed">{meta.d}</p>
          )}

          {/* Range / unit */}
          <div className="flex gap-3 text-[10px] text-gray-500">
            {meta?.u && <span>Unit: <span className="text-gray-400">{meta.u}</span></span>}
            {meta?.r && <span>Range: <span className="text-gray-400">{meta.r[0]} – {meta.r[1]}</span></span>}
            {meta?.us && <span className="ml-auto text-gray-600">{meta.us}</span>}
          </div>

          {/* Input — enum select or free text */}
          {hasEnums ? (
            <select
              value={isSet ? String(currentValue) : ''}
              onChange={handleEnumChange}
              className="w-full bg-gray-900 text-gray-200 text-xs border border-gray-600 rounded px-2 py-1
                         focus:outline-none focus:border-blue-500">
              {!isSet && <option value="">— not set —</option>}
              {Object.entries(meta.v).map(([val, label]) => (
                <option key={val} value={val}>{label} ({val})</option>
              ))}
            </select>
          ) : editing ? (
            <div className="flex gap-1.5">
              <input
                autoFocus
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditing(false) }}
                placeholder={meta?.r ? `${meta.r[0]} – ${meta.r[1]}` : 'value'}
                className="flex-1 bg-gray-900 text-gray-200 text-xs border border-blue-600 rounded px-2 py-1
                           focus:outline-none"
              />
              <button onClick={commitEdit}
                className="text-xs px-2 py-1 rounded border border-blue-600 bg-blue-900/40 text-blue-300 hover:bg-blue-800/50">
                OK
              </button>
            </div>
          ) : (
            <button onClick={startEdit}
              className="w-full text-xs px-2 py-1 rounded border border-gray-600 text-gray-400
                         hover:border-blue-500 hover:text-blue-300 text-left">
              {isSet ? `Current: ${currentValue} — click to edit` : 'Click to set value…'}
            </button>
          )}

          {/* Bitmask */}
          {meta?.b && Object.keys(meta.b).length > 0 && (
            <div className="space-y-0.5 pt-0.5">
              <div className="text-[9px] text-gray-600 uppercase tracking-widest">Bitmask</div>
              {Object.entries(meta.b).map(([bit, label]) => {
                const mask = 1 << parseInt(bit)
                const checked = isSet && ((parseInt(currentValue) & mask) !== 0)
                return (
                  <label key={bit} className="flex items-center gap-1.5 cursor-pointer group/bit">
                    <span className={`w-3 h-3 flex-shrink-0 rounded border transition-colors
                      ${checked ? 'bg-blue-600 border-blue-500' : 'border-gray-600 group-hover/bit:border-blue-500'}`}>
                      {checked && <svg viewBox="0 0 12 12" fill="white"><path d="M2 6l3 3 5-5"/></svg>}
                    </span>
                    <span className="text-[10px] text-gray-400">{label}</span>
                    <input type="checkbox" className="hidden"
                      checked={checked}
                      onChange={() => {
                        const cur = isSet ? parseInt(currentValue) : 0
                        onSet(paramKey, checked ? cur & ~mask : cur | mask)
                      }}
                    />
                  </label>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
