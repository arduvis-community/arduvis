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

import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

const INPUT_CLS = 'bg-gray-900 text-gray-200 text-xs border border-gray-600 rounded ' +
  'px-2 py-1 focus:outline-none focus:border-blue-500'

export default function AdvancedParamsPanel() {
  const { baselineParams, setBaselineParam, deleteBaselineParam, toggleAdvancedParams } = useAppStore()

  const [search,   setSearch]   = useState('')
  const [newName,  setNewName]  = useState('')
  const [newValue, setNewValue] = useState('')
  const [addError, setAddError] = useState('')

  const sorted = Object.keys(baselineParams)
    .sort()
    .filter(k => !search || k.includes(search.toUpperCase()))

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

  const handleNameKeyDown = (e) => { if (e.key === 'Enter') handleAdd() }
  const handleValueKeyDown = (e) => { if (e.key === 'Enter') handleAdd() }

  return (
    <div className="w-80 flex-shrink-0 bg-gray-800/40 border-l border-gray-700 flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-3 py-2.5 border-b border-gray-700 flex-shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-200">Parameters</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">
            {Object.keys(baselineParams).length}
          </span>
        </div>
        <button onClick={toggleAdvancedParams}
          className="text-gray-500 hover:text-gray-200 text-base leading-none">✕</button>
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
        Params managed by components take precedence on export. These are preserved as additional params.
      </p>

      {/* Param list */}
      <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-1">
        {sorted.length === 0 ? (
          <p className="text-[11px] text-gray-600 pt-2">
            {search ? 'No matching parameters.' : 'No additional parameters. Add one below or import a .param file.'}
          </p>
        ) : sorted.map(key => (
          <ParamRow
            key={key}
            paramKey={key}
            value={baselineParams[key]}
            onBlur={handleValueBlur}
            onDelete={deleteBaselineParam}
          />
        ))}
      </div>

      {/* Add new param */}
      <div className="px-3 py-2.5 border-t border-gray-700 flex-shrink-0 flex flex-col gap-1.5">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-gray-500">Add parameter</div>
        <div className="flex gap-1.5">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value.toUpperCase())}
            onKeyDown={handleNameKeyDown}
            placeholder="PARAM_NAME"
            className={INPUT_CLS + ' flex-1 min-w-0 font-mono'}
          />
          <input
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={handleValueKeyDown}
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

  return (
    <div className="flex items-center gap-1.5 group">
      <span className="text-[11px] font-mono text-gray-400 flex-1 min-w-0 truncate" title={paramKey}>
        {paramKey}
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
