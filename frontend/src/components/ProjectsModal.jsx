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
 * ProjectsModal.jsx
 * Open / manage saved projects. Shown when the user clicks "Open" in the Toolbar.
 */
import React, { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { api } from '../api/client'

const VEHICLE_ICON = { copter: '🚁', plane: '✈', vtol: '🔄' }

export default function ProjectsModal({ onClose }) {
  const { loadProject, isDirty } = useAppStore()

  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [deleting, setDeleting] = useState(null)   // name currently being deleted
  const [opening,  setOpening]  = useState(null)   // name currently loading

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.listProjects()
      .then(p => { if (!cancelled) { setProjects(p); setLoading(false) } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  const handleOpen = async (name) => {
    if (isDirty) {
      if (!window.confirm('You have unsaved changes. Open project anyway?')) return
    }
    setOpening(name)
    try {
      await loadProject(name)
      onClose()
    } catch (e) {
      alert(`Failed to open "${name}": ${e.message}`)
    } finally {
      setOpening(null)
    }
  }

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete project "${name}"? This cannot be undone.`)) return
    setDeleting(name)
    try {
      await api.deleteProject(name)
      setProjects(p => p.filter(x => x.name !== name))
    } catch (e) {
      alert(`Failed to delete: ${e.message}`)
    } finally {
      setDeleting(null)
    }
  }

  const handleOpenFolder = (name) => {
    api.openFolder(name).catch(() => {})
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>

      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-[520px] max-h-[80vh]
                      flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-700 flex items-center justify-between flex-shrink-0">
          <span className="text-sm font-semibold text-gray-100">Open project</span>
          <button onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-lg leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <p className="text-xs text-gray-500 animate-pulse">Loading projects…</p>
          )}
          {error && (
            <p className="text-xs text-red-400">Could not load projects: {error}</p>
          )}
          {!loading && !error && projects.length === 0 && (
            <p className="text-xs text-gray-500 italic">No saved projects yet.</p>
          )}
          {!loading && !error && projects.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {projects.map(p => (
                <div key={p.name}
                  className="flex items-center gap-3 px-3 py-2.5 rounded border border-gray-700
                             bg-gray-800/50 hover:bg-gray-800 transition-colors group">

                  {/* Icon + info */}
                  <span className="text-lg flex-shrink-0">
                    {VEHICLE_ICON[p.vehicleType] ?? '◆'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-200 font-medium truncate">
                      {p.vehicleLabel || p.name}
                    </div>
                    <div className="text-[10px] text-gray-500 flex gap-2">
                      <span>{p.name}</span>
                      {p.componentCount != null && (
                        <span>· {p.componentCount} component{p.componentCount !== 1 ? 's' : ''}</span>
                      )}
                      {p.savedAt && (
                        <span>· {new Date(p.savedAt * 1000).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleOpenFolder(p.name)}
                      title="Show in file explorer"
                      className="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5
                                 rounded border border-gray-700 hover:border-gray-500 opacity-0
                                 group-hover:opacity-100 transition-opacity">
                      📂
                    </button>
                    <button
                      onClick={() => handleDelete(p.name)}
                      disabled={deleting === p.name}
                      className="text-[10px] text-red-500 hover:text-red-300 px-1.5 py-0.5
                                 rounded border border-red-900 hover:border-red-600
                                 disabled:opacity-40">
                      {deleting === p.name ? '…' : 'Del'}
                    </button>
                    <button
                      onClick={() => handleOpen(p.name)}
                      disabled={opening === p.name}
                      className="text-[10px] text-blue-300 hover:text-white px-2.5 py-0.5
                                 rounded border border-blue-700 hover:bg-blue-700/40
                                 disabled:opacity-40 font-medium">
                      {opening === p.name ? 'Opening…' : 'Open'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-2.5 border-t border-gray-700 flex-shrink-0">
          <p className="text-[10px] text-gray-600">
            Projects are saved to {' '}
            <span className="font-mono text-gray-500">~/.avc/projects/</span>
            {' '}— each in its own folder containing the airframe image, layout, and .param file.
          </p>
        </div>
      </div>
    </div>
  )
}
