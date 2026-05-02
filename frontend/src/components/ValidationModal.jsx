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
import { useAppStore } from '../store/useAppStore'

/**
 * ValidationModal
 *
 * Props:
 *   errors      string[]  — blocking issues (export not allowed)
 *   warnings    string[]  — advisory issues (export allowed with acknowledgement)
 *   onExport    fn        — called when user clicks "Export anyway" (warnings-only path)
 *   onClose     fn        — called when user closes / clicks "Fix issues"
 */
export default function ValidationModal({ errors, warnings, onExport, onClose }) {
  const toggleChecklist = useAppStore(s => s.toggleChecklist)
  const checklistOpen   = useAppStore(s => s.checklistOpen)
  const hasErrors       = errors.length > 0
  const hasWarnings     = warnings.length > 0

  const handleFixIssues = () => {
    onClose()
    if (!checklistOpen) toggleChecklist()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
         onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-[500px] shadow-2xl"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-base">{hasErrors ? '🔴' : '⚠️'}</span>
            <span className="text-sm font-semibold text-white">
              {hasErrors ? 'Cannot export — issues found' : 'Review before exporting'}
            </span>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">

          {/* Errors */}
          {hasErrors && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">
                {errors.length} error{errors.length !== 1 ? 's' : ''} — must fix before exporting
              </p>
              <div className="bg-red-950/40 border border-red-800/60 rounded-lg px-3 py-2 flex flex-col gap-2">
                {errors.map((e, i) => (
                  <div key={i} className="flex gap-2 text-xs text-red-300">
                    <span className="flex-shrink-0 mt-0.5">✕</span>
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
                {!hasErrors && ' — export with caution'}
              </p>
              <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg px-3 py-2 flex flex-col gap-2">
                {warnings.map((w, i) => (
                  <div key={i} className="flex gap-2 text-xs text-amber-300">
                    <span className="flex-shrink-0 mt-0.5">⚠</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guidance */}
          <p className="text-[11px] text-gray-500 leading-relaxed">
            {hasErrors
              ? 'Fix the errors above before exporting. Use the Setup Checklist to guide you through required configuration steps.'
              : 'Warnings are advisory. You can export now but should review the items above before uploading params to a flight controller.'}
          </p>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-700 flex items-center justify-between">
          <button
            onClick={handleFixIssues}
            className="text-xs px-4 py-1.5 rounded border border-gray-600 text-gray-300
                       hover:bg-gray-700">
            {checklistOpen ? 'Close' : 'Open Checklist'}
          </button>

          <div className="flex gap-2">
            <button onClick={onClose}
              className="text-xs px-4 py-1.5 rounded border border-gray-600 text-gray-400
                         hover:bg-gray-700">
              Cancel
            </button>
            {!hasErrors && (
              <button
                onClick={() => { onClose(); onExport() }}
                className="text-xs px-4 py-1.5 rounded border border-amber-700 bg-amber-900/30
                           text-amber-300 hover:bg-amber-900/50 font-medium">
                Export anyway
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
