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

import React, { useRef, useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'

import { api } from '../api/client'
import ProjectsModal from './ProjectsModal'
import StandardViewsModal from './StandardViewsModal'
import SaveProjectModal from './SaveProjectModal'
import AboutModal from './AboutModal'
import HelpModal from './HelpModal'
import MAVLinkModal from './MAVLinkModal'

export default function Toolbar() {
  const {
    vehicleType, setVehicleType,
    projectName, setProjectName, isDirty,
    newProject,
    mavlinkConnected, mavlinkModalOpen, setMavlinkModalOpen, webSerialConnected,
    toggleInspector,
    advancedParamsOpen, toggleAdvancedParams,
    checklistOpen, toggleChecklist,
    standardViewsOpen, setStandardViewsOpen,
    canvasMode, setCanvasMode,
    showWires, setShowWires,
    exportIncludeDefaults, setExportIncludeDefaults,
    setComparisonResult, setComparisonModalOpen,
  } = useAppStore()

  const [showProjects, setShowProjects] = useState(false)
  const [showSave,     setShowSave]     = useState(false)
  const [showAbout,    setShowAbout]    = useState(false)
  const [showHelp,     setShowHelp]     = useState(false)
  const [showMenu,     setShowMenu]     = useState(false)
  const [showFileMenu, setShowFileMenu] = useState(false)
  const menuRef     = useRef(null)
  const fileMenuRef = useRef(null)

  useEffect(() => {
    if (!showMenu) return
    const handle = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showMenu])

  useEffect(() => {
    if (!showFileMenu) return
    const handle = (e) => { if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) setShowFileMenu(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showFileMenu])
  const paramImportRef   = useRef(null)
  const paramCompareRef  = useRef(null)
  const [importPreview, setImportPreview] = useState(null)  // { params, count, vehicle_type, components } | null

  const handleExport = async () => {
    const { components, vehicleType, vehicleLabel, frameInfo, baselineParams, exportIncludeDefaults } = useAppStore.getState()
    try {
      const content  = await api.exportParam({
        components, vehicle_type: vehicleType, vehicle_label: vehicleLabel,
        frame_info: frameInfo, baseline_params: baselineParams || {},
        include_defaults: exportIncludeDefaults,
      })
      const filename = `${vehicleLabel.replace(/\s+/g, '_')}.param`
      if (window.pywebview) {
        await window.pywebview.api.save_file(filename, content)
      } else {
        const blob = new Blob([content], { type: 'text/plain' })
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href = url; a.download = filename
        a.click(); URL.revokeObjectURL(url)
      }
    } catch(e) { console.error(e) }
  }

  const handleParamImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    e.target.value = ''
    try {
      const result = await api.importParam(text)
      setImportPreview(result)
    } catch (err) { console.error('param import failed', err) }
  }

  const handleParamCompare = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    e.target.value = ''
    try {
      const { components, vehicleType, baselineParams } = useAppStore.getState()
      const result = await api.compareParam({
        components, vehicle_type: vehicleType,
        baseline_params: baselineParams || {},
        include_defaults: true,
        reference_content: text,
      })
      setComparisonResult(result)
      setComparisonModalOpen(true)
    } catch (err) { console.error('param compare failed', err) }
  }

  const applyImport = () => {
    if (!importPreview) return
    const store = useAppStore.getState()
    store.newProject()
    store.setVehicleType(importPreview.vehicle_type)
    // Store all original params so they're re-emitted on export unchanged
    store.setBaselineParams(importPreview.params)
    for (const comp of importPreview.components) {
      const id = store.addComponent(comp.defId, comp.label, comp.icon, comp.virtual, comp.x, comp.y)
      if (comp.noCanvas) {
        store.updateComponent(id, { noCanvas: true })
      }
      for (const [key, val] of Object.entries(comp.fields || {})) {
        store.updateComponentField(id, key, val)
      }
    }
    setImportPreview(null)
  }

  return (
    <>
    {showProjects && <ProjectsModal onClose={() => setShowProjects(false)} />}
    {standardViewsOpen && <StandardViewsModal onClose={() => setStandardViewsOpen(false)} />}
    {showSave && <SaveProjectModal onClose={() => setShowSave(false)} />}
    {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    {showHelp  && <HelpModal  onClose={() => setShowHelp(false)}  />}
    {mavlinkModalOpen && <MAVLinkModal onClose={() => setMavlinkModalOpen(false)} />}

    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1 min-h-10 bg-gray-900 border-b border-gray-700 flex-shrink-0">

      {/* ── Identity group (always row 1) ─────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">

      {/* Logo */}
      <div className="flex items-center gap-2 mr-1">
        <div className="w-5 h-5 rounded-full bg-amber-600 flex-shrink-0" />
        <span className="text-sm font-semibold text-white tracking-wide">AVC</span>
      </div>

      <div className="w-px h-5 bg-gray-700" />

      {/* File menu */}
      <div className="relative" ref={fileMenuRef}>
        <button
          onClick={() => setShowFileMenu(v => !v)}
          className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-300 hover:bg-gray-700">
          File
        </button>
        {showFileMenu && (
          <div className="absolute left-0 top-full mt-1 w-40 bg-gray-900 border border-gray-700
                          rounded shadow-xl z-40 py-1 flex flex-col">
            <button
              onClick={() => {
                if (isDirty && !window.confirm('Unsaved changes — start a new project anyway?')) return
                newProject(); setShowFileMenu(false)
              }}
              className="text-xs text-left px-3 py-2 text-gray-300 hover:bg-gray-700">
              New Project
            </button>
            <button
              onClick={() => { setShowProjects(true); setShowFileMenu(false) }}
              className="text-xs text-left px-3 py-2 text-gray-300 hover:bg-gray-700">
              Open Project…
            </button>
            <button
              onClick={() => { setShowSave(true); setShowFileMenu(false) }}
              className={`text-xs text-left px-3 py-2 hover:bg-gray-700
                ${isDirty ? 'text-amber-300' : 'text-gray-300'}`}>
              {isDirty ? 'Save Project… ●' : 'Save Project…'}
            </button>
            {projectName !== 'Untitled' && (
              <>
                <div className="my-1 border-t border-gray-700" />
                <button
                  onClick={() => { api.openFolder(projectName).catch(() => {}); setShowFileMenu(false) }}
                  className="text-xs text-left px-3 py-2 text-gray-300 hover:bg-gray-700">
                  Show in Explorer
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Save icon — quick access, always visible */}
      <button
        onClick={() => setShowSave(true)}
        title="Save project"
        className={`text-sm px-1.5 py-0.5 rounded border hover:bg-gray-700
          ${isDirty ? 'border-amber-600 text-amber-300' : 'border-gray-600 text-gray-400'}`}>
        💾
      </button>

      <div className="w-px h-5 bg-gray-700" />

      {/* Flight controller — locked to CubePilot Cube for this release */}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-blue-800/60
                      bg-blue-950/40 text-blue-300 text-xs font-medium select-none"
           title="Supported hardware: CubePilot Cube (this beta release)">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
        CubePilot Cube
      </div>

      {/* Vehicle type */}
      <select
        value={vehicleType}
        onChange={e => setVehicleType(e.target.value)}
        className="bg-gray-800 text-gray-200 text-xs border border-gray-600 rounded px-2 py-1 cursor-pointer">
        <option value="copter">Multirotor</option>
        <option value="plane">Fixed Wing</option>
        <option value="vtol">VTOL / QuadPlane</option>
      </select>

      {/* Project name — read-only display; edited inside the save modal */}
      <span className={`text-xs px-2 py-0.5 rounded border ${
        projectName === 'Untitled'
          ? 'border-gray-700 text-gray-600'
          : 'border-gray-600 text-gray-300'
      }`}>
        {projectName}
      </span>

      {isDirty && <span className="text-amber-400 text-xs" title="Unsaved changes">●</span>}

      </div>{/* end identity group */}

      {/* ── Workspace buttons group ───────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0">

      <button
        onClick={() => setCanvasMode('standard')}
        className={`text-xs px-2 py-1 rounded border transition-colors ${
          canvasMode !== 'topology'
            ? 'border-amber-500 bg-amber-900/20 text-amber-300'
            : 'border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
        }`}>
        Palette
      </button>
      <button onClick={toggleInspector}
        className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-300 hover:bg-gray-700">
        Inspector
      </button>
      <button onClick={toggleAdvancedParams}
        className={`text-xs px-2 py-1 rounded border transition-colors ${
          advancedParamsOpen
            ? 'border-amber-500 bg-amber-900/20 text-amber-300'
            : 'border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
        }`}>
        Params
      </button>
      <button onClick={toggleChecklist}
        title="Step-by-step setup checklist"
        className={`text-xs px-2 py-1 rounded border transition-colors ${
          checklistOpen
            ? 'border-green-500 bg-green-900/40 text-green-300'
            : 'border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
        }`}>
        Checklist
      </button>

      <button
        onClick={() => setCanvasMode('topology')}
        title="CAN Topology view"
        className={`text-xs px-2 py-1 rounded border transition-colors ${
          canvasMode === 'topology'
            ? 'border-amber-500 bg-amber-900/20 text-amber-300'
            : 'border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
        }`}>
        Topology
      </button>

      <button
        onClick={() => setShowWires(!showWires)}
        title="Show or hide wire connections between components"
        className={`text-xs px-2 py-1 rounded border transition-colors ${
          showWires
            ? 'border-indigo-500 bg-indigo-900/40 text-indigo-300'
            : 'border-gray-600 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
        }`}>
        Wires
      </button>

      </div>{/* end workspace group */}

      {/* ── Right group: connection + export (ml-auto pushes right) ──────── */}
      <div className="flex items-center gap-2 ml-auto flex-shrink-0">

      {/* MAVLink status pill — click to open connection modal */}
      <button
        onClick={() => setMavlinkModalOpen(true)}
        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded border
          ${(mavlinkConnected || webSerialConnected)
            ? 'border-green-700 text-green-400 hover:bg-green-900/30'
            : 'border-gray-600 text-gray-400 hover:bg-gray-700'}`}>
        <div className={`w-2 h-2 rounded-full ${(mavlinkConnected || webSerialConnected) ? 'bg-green-400' : 'bg-gray-600'}`} />
        {webSerialConnected ? 'USB connected' : mavlinkConnected ? 'MP connected' : 'MP disconnected'}
      </button>

      {/* ⋯ menu */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(v => !v)}
          className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-300 hover:bg-gray-700 leading-none">
          ⋯
        </button>
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-gray-900 border border-gray-700
                          rounded shadow-xl z-40 py-1 flex flex-col">
            <button
              onClick={() => { setShowHelp(true); setShowMenu(false) }}
              className="text-xs text-left px-3 py-2 text-gray-300 hover:bg-gray-700">
              Help
            </button>
            <button
              onClick={() => { window.open('mailto:avc@patternlynx.com?subject=Bug%20Report', '_blank'); setShowMenu(false) }}
              className="text-xs text-left px-3 py-2 text-red-400 hover:bg-gray-700">
              Report a Bug
            </button>
            <button
              onClick={() => { setShowAbout(true); setShowMenu(false) }}
              className="text-xs text-left px-3 py-2 text-gray-300 hover:bg-gray-700">
              About AVC
            </button>
          </div>
        )}
      </div>

      <div className="w-px h-5 bg-gray-700" />

      <div className="flex items-center gap-1">
        <button onClick={handleExport}
          className="text-xs px-3 py-1 rounded-l border border-amber-600 text-amber-300
                     hover:bg-amber-900/20 font-medium">
          Export .param
        </button>
        <label title="Include default parameter values in export"
          className={`flex items-center gap-1 text-[10px] px-1.5 py-1 rounded-r border-y border-r cursor-pointer
            ${exportIncludeDefaults
              ? 'border-amber-600 bg-amber-900/20 text-amber-300'
              : 'border-amber-600/50 text-gray-500 hover:text-amber-400'}`}>
          <input type="checkbox" className="hidden"
            checked={exportIncludeDefaults}
            onChange={e => setExportIncludeDefaults(e.target.checked)} />
          +defaults
        </label>
      </div>

      <input
        ref={paramImportRef}
        type="file"
        accept=".param,.parm,.txt"
        className="hidden"
        onChange={handleParamImport}
      />
      <button
        onClick={() => paramImportRef.current?.click()}
        className="text-xs px-3 py-1 rounded border border-gray-600 text-gray-300
                   hover:bg-gray-700">
        Import .param
      </button>

      <input
        ref={paramCompareRef}
        type="file"
        accept=".param,.parm,.txt"
        className="hidden"
        onChange={handleParamCompare}
      />
      <button
        onClick={() => paramCompareRef.current?.click()}
        title="Compare AVC output against a reference .param file from Mission Planner"
        className="text-xs px-3 py-1 rounded border border-amber-700/60 text-amber-400
                   hover:bg-amber-900/30">
        Compare
      </button>

      </div>{/* end right group */}
    </div>{/* end toolbar */}

    {/* Param import preview modal */}
    {importPreview && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
           onClick={() => setImportPreview(null)}>
        <div className="bg-gray-900 border border-gray-700 rounded-lg w-[580px] max-h-[80vh]
                        flex flex-col shadow-2xl"
             onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            <div>
              <span className="text-sm font-semibold text-white">Import .param</span>
              <span className="ml-2 text-xs text-gray-400">
                {importPreview.count} parameters →&nbsp;
                <span className="text-amber-300">{importPreview.components.length} components</span>
                &nbsp;·&nbsp;
                <span className="text-gray-300 capitalize">{importPreview.vehicle_type}</span>
              </span>
            </div>
            <button onClick={() => setImportPreview(null)}
              className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
          </div>

          {/* Two-pane: components left, raw params right */}
          <div className="flex flex-1 overflow-hidden divide-x divide-gray-700 min-h-0">

            {/* Components pane */}
            <div className="w-1/2 overflow-y-auto px-3 py-3 flex flex-col gap-1">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
                Components to create
              </p>
              {importPreview.components.length === 0 && (
                <p className="text-xs text-gray-500 italic">No components detected</p>
              )}
              {importPreview.components.map((c, i) => (
                <div key={i}
                  className="flex items-center gap-2 text-xs px-2 py-1 rounded bg-gray-800/60 border border-gray-700">
                  <span className="text-base leading-none">{c.icon}</span>
                  <div className="min-w-0">
                    <div className="text-gray-200 truncate">{c.label}</div>
                    <div className="text-gray-500 text-[10px]">
                      {Object.keys(c.fields || {}).filter(k => k !== 'instance').length} fields
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Raw params pane */}
            <div className="w-1/2 overflow-y-auto px-3 py-3">
              <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1">
                Raw parameters ({importPreview.count})
              </p>
              <table className="w-full text-xs font-mono">
                <tbody>
                  {Object.entries(importPreview.params).map(([name, val]) => (
                    <tr key={name} className="border-b border-gray-800/60">
                      <td className="py-0.5 pr-2 text-amber-300">{name}</td>
                      <td className="py-0.5 text-right text-gray-400">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
            <p className="text-[11px] text-amber-400/80">
              This will replace the current project.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setImportPreview(null)}
                className="text-xs px-3 py-1.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-700">
                Cancel
              </button>
              <button onClick={applyImport}
                className="text-xs px-4 py-1.5 rounded border border-amber-600 bg-amber-700/20
                           text-amber-300 hover:bg-amber-700/30 font-medium">
                Apply to canvas
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
