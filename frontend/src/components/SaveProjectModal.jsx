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
 * SaveProjectModal.jsx
 * Asks the user for a project name and save directory before writing.
 */
import React, { useState, useRef, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

const DEFAULT_BASE = '~/.avc/projects'

export default function SaveProjectModal({ onClose }) {
  const { projectName, saveProject } = useAppStore()
  const [name,    setName]    = useState(projectName === 'Untitled' ? '' : projectName)
  const [dir,     setDir]     = useState(DEFAULT_BASE)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Sanitise name: no slashes, leading dots, or control chars
  const sanitiseName = (v) => v.replace(/[/\\<>:"|?*\x00-\x1f]/g, '').trimStart()

  const handleSave = async () => {
    const trimmedName = name.trim()
    const trimmedDir  = dir.trim() || DEFAULT_BASE
    if (!trimmedName) return
    setSaving(true)
    setError(null)
    try {
      await saveProject(trimmedName, trimmedDir === DEFAULT_BASE ? null : trimmedDir)
      onClose()
    } catch (e) {
      setError(e.message ?? 'Save failed')
      setSaving(false)
    }
  }

  const safeName = name.trim() || '<name>'
  const safeDir  = dir.trim()  || DEFAULT_BASE

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>

      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[26rem] p-5">

        <h2 className="text-sm font-semibold text-gray-100 mb-4">Save project</h2>

        {/* Name */}
        <label className="text-xs text-gray-400 block mb-1">Project name</label>
        <input
          ref={inputRef}
          value={name}
          onChange={e => setName(sanitiseName(e.target.value))}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
          placeholder="my-quad"
          maxLength={64}
          className="w-full bg-gray-800 text-gray-200 text-sm border border-gray-600 rounded
                     px-2.5 py-1.5 mb-4 focus:outline-none focus:border-amber-500"
        />

        {/* Directory */}
        <label className="text-xs text-gray-400 block mb-1">Save directory</label>
        <input
          value={dir}
          onChange={e => setDir(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
          placeholder={DEFAULT_BASE}
          className="w-full bg-gray-800 text-gray-200 text-sm border border-gray-600 rounded
                     px-2.5 py-1.5 mb-1 focus:outline-none focus:border-amber-500 font-mono"
        />

        {/* Path preview */}
        <p className="text-[11px] text-gray-500 mb-4 font-mono break-all">
          {safeDir}/
          <span className={name.trim() ? 'text-gray-300' : 'text-gray-600'}>
            {safeName}/
          </span>
        </p>

        {error && (
          <p className="text-xs text-red-400 mb-3">{error}</p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded border border-gray-600 text-gray-400
                       hover:bg-gray-700">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="text-xs px-4 py-1.5 rounded border border-amber-600 bg-amber-700/20
                       text-amber-300 hover:bg-amber-700/40 disabled:opacity-40 font-medium">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
