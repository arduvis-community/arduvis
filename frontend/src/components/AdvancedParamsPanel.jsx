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

import React, { useState, useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'

const INPUT_CLS = 'bg-gray-900 text-gray-200 text-xs border border-gray-600 rounded ' +
  'px-2 py-1 focus:outline-none focus:border-blue-500'

function groupKey(paramName) {
  const idx = paramName.indexOf('_')
  return idx > 0 ? paramName.slice(0, idx) : paramName
}

export default function AdvancedParamsPanel() {
  const { baselineParams, setBaselineParam, deleteBaselineParam, toggleAdvancedParams } = useAppStore()

  const [search,        setSearch]        = useState('')
  const [collapsed,     setCollapsed]     = useState(new Set())
  const [newName,       setNewName]       = useState('')
  const [newValue,      setNewValue]      = useState('')
  const [addError,      setAddError]      = useState('')

  const q = search.trim().toUpperCase()

  // Build grouped structure, filtered by search
  const groups = useMemo(() => {
    const map = {}
    for (const key of Object.keys(baselineParams).sort()) {
      if (q && !key.includes(q)) continue
      const g = groupKey(key)
      if (!map[g]) map[g] = []
      map[g].push(key)
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [baselineParams, q])

  const totalVisible = groups.reduce((n, [, keys]) => n + keys.length, 0)
  const totalAll     = Object.keys(baselineParams).length

  const toggleGroup = (g) =>
    setCollapsed(prev => { const s = new Set(prev); s.has(g) ? s.delete(g) : s.add(g); return s })

  const collapseAll = () => setCollapsed(new Set(groups.map(([g]) => g)))
  const expandAll   = () => setCollapsed(new Set())

  const handleValueBlur = (key, raw) => {
    const num = parseFloat(raw)
    setBaselineParam(key, isNaN(num) ? raw : num)
  }

  const handleAdd = () => {
    const key = newName.trim().toUpperCase()
    if (!key) { setAddError('Name required'); return }
    if (!/^[A-Z0-9_]+$/.test(key)) { setAddError('Letters, numbers and _ only'); return }
    const num = parseFloat(newValue)
    setBaselineParam(key, isNaN(num) ? newValue : num)
    setNewName('')
    setNewValue('')
    setAddError('')
  }

  const onKeyDown = (e) => { if (e.key === 'Enter') handleAdd() }

  return (
    <div className="w-80 flex-shrink-0 bg-gray-800/40 border-l border-gray-700 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-200">Parameters</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
            {q ? `${totalVisible} / ${totalAll}` : totalAll}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={expandAll}
            className="text-[10px] text-gray-500 hover:text-gray-300">expand</button>
          <span className="text-gray-700">·</span>
          <button onClick={collapseAll}
            className="text-[10px] text-gray-500 hover:text-gray-300">collapse</button>
          <button onClick={toggleAdvancedParams}
            className="text-gray-500 hover:text-gray-200 text-base leading-none ml-1">✕</button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-2.5 pb-1.5 flex-shrink-0">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search params…"
          className={INPUT_CLS + ' w-full'}
        />
      </div>

      {/* Info note */}
      <p className="px-3 pb-2 text-[10px] text-gray-500 flex-shrink-0">
        Params managed by components take precedence on export.
      </p>

      {/* Grouped param list */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {groups.length === 0 ? (
          <p className="text-[11px] text-gray-600 pt-2">
            {q ? 'No matching parameters.' : 'No additional parameters. Add one below or import a .param file.'}
          </p>
        ) : groups.map(([groupName, keys]) => {
          const isCollapsed = collapsed.has(groupName) && !q
          return (
            <div key={groupName} className="mb-1">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(groupName)}
                className="w-full flex items-center justify-between py-1 group">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[8px] transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>▶</span>
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-500 group-hover:text-gray-300">
                    {groupName}
                  </span>
                </div>
                <span className="text-[9px] text-gray-600">{keys.length}</span>
              </button>

              {/* Params in group */}
              {!isCollapsed && (
                <div className="space-y-1 pl-3 border-l border-gray-700/50 mb-1">
                  {keys.map(key => (
                    <ParamRow
                      key={key}
                      paramKey={key}
                      value={baselineParams[key]}
                      onBlur={handleValueBlur}
                      onDelete={deleteBaselineParam}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add new param */}
      <div className="px-3 py-2.5 border-t border-gray-700 flex-shrink-0 flex flex-col gap-1.5">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Add parameter</div>
        <div className="flex gap-1.5">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value.toUpperCase())}
            onKeyDown={onKeyDown}
            placeholder="PARAM_NAME"
            className={INPUT_CLS + ' flex-1 min-w-0 font-mono'}
          />
          <input
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="value"
            className={INPUT_CLS + ' w-16'}
          />
          <button onClick={handleAdd}
            className="text-xs px-2 py-1 rounded border border-blue-600 bg-blue-900/40 text-blue-300 hover:bg-blue-800/50 flex-shrink-0">
            Add
          </button>
        </div>
        {addError && <p className="text-[10px] text-red-400">{addError}</p>}
      </div>

    </div>
  )
}

function ParamRow({ paramKey, value, onBlur, onDelete }) {
  const [local, setLocal] = useState(String(value))

  // Trim group prefix for the displayed label inside the group
  const idx   = paramKey.indexOf('_')
  const short = idx > 0 ? paramKey.slice(idx + 1) : paramKey

  return (
    <div className="flex items-center gap-1.5 group">
      <span className="text-[11px] font-mono text-gray-400 flex-1 min-w-0 truncate" title={paramKey}>
        {short}
      </span>
      <input
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => onBlur(paramKey, local)}
        className="w-20 bg-gray-900 text-gray-200 text-xs border border-gray-700 rounded px-1.5 py-0.5
                   focus:outline-none focus:border-blue-500 text-right"
      />
      <button
        onClick={() => onDelete(paramKey)}
        className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none flex-shrink-0"
        title="Remove">
        ✕
      </button>
    </div>
  )
}
