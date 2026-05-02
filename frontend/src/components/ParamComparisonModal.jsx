// AVC — ArduPilot Visual Configurator
// Copyright (C) 2026 Patternlynx Limited
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

import React, { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export default function ParamComparisonModal() {
  const { comparisonResult, setComparisonModalOpen } = useAppStore()
  const [missingSearch, setMissingSearch] = useState('')

  if (!comparisonResult) return null

  const { mismatches, missing_from_avc, avc_only, match_count, avc_total, ref_total } = comparisonResult

  const filteredMissing = missingSearch
    ? missing_from_avc.filter(p => p.includes(missingSearch.toUpperCase()))
    : missing_from_avc

  const close = () => setComparisonModalOpen(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
         onClick={close}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-[600px] max-h-[85vh]
                      flex flex-col shadow-2xl overflow-hidden"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white">Param Comparison</span>
            <button onClick={close}
              className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
          </div>
          <div className="flex gap-4 text-xs text-gray-400">
            <span>AVC generated: <span className="text-amber-300 font-mono">{avc_total}</span></span>
            <span>Reference file: <span className="text-gray-200 font-mono">{ref_total}</span></span>
            <span>Matches: <span className="text-green-400 font-mono">{match_count}</span></span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Mismatches */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber-400 text-sm font-semibold">
                ⚠ Mismatches
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 text-amber-400 border border-amber-800">
                {mismatches.length}
              </span>
              <span className="text-[10px] text-gray-600">— AVC value differs from reference</span>
            </div>
            {mismatches.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No mismatches — all AVC params match the reference.</p>
            ) : (
              <div className="rounded border border-amber-900/40 overflow-hidden">
                <div className="grid grid-cols-3 gap-0 text-[10px] font-semibold text-gray-500 bg-gray-800/60 px-3 py-1.5">
                  <span>Parameter</span><span>AVC</span><span>Reference</span>
                </div>
                {mismatches.map(({ param, avc_value, ref_value }) => (
                  <div key={param}
                    className="grid grid-cols-3 gap-0 px-3 py-1.5 border-t border-gray-800 text-xs hover:bg-gray-800/40">
                    <span className="font-mono text-amber-300 truncate">{param}</span>
                    <span className="font-mono text-amber-300">{avc_value}</span>
                    <span className="font-mono text-gray-300">{ref_value}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* AVC only */}
          {avc_only.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-amber-400 text-sm font-semibold">
                  ℹ AVC only
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/20 text-amber-400 border border-blue-900">
                  {avc_only.length}
                </span>
                <span className="text-[10px] text-gray-600">— AVC generates these; reference file doesn't have them</span>
              </div>
              <div className="rounded border border-blue-900/30 overflow-hidden">
                {avc_only.map(({ param, value }) => (
                  <div key={param}
                    className="flex justify-between px-3 py-1 border-b border-gray-800 last:border-0 text-xs hover:bg-gray-800/40">
                    <span className="font-mono text-amber-300">{param}</span>
                    <span className="font-mono text-gray-400">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Missing from AVC */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-400 text-sm font-semibold">
                ○ Missing from AVC
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                {missing_from_avc.length}
              </span>
              <span className="text-[10px] text-gray-600">— reference has these; AVC doesn't generate them</span>
            </div>
            <p className="text-[10px] text-gray-600 mb-2">
              Expected to be large — AVC only emits params for components you've configured.
              Use the Params panel or "+defaults" export to cover more.
            </p>
            <input
              value={missingSearch}
              onChange={e => setMissingSearch(e.target.value)}
              placeholder="Filter params…"
              className="bg-gray-800 border border-gray-700 text-xs text-gray-200 rounded px-2 py-1 w-full mb-2
                         focus:outline-none focus:border-amber-500"
            />
            <div className="rounded border border-gray-800 max-h-48 overflow-y-auto">
              {filteredMissing.length === 0 ? (
                <p className="text-xs text-gray-600 px-3 py-2 italic">No results.</p>
              ) : filteredMissing.map(param => (
                <div key={param}
                  className="px-3 py-1 border-b border-gray-800/50 last:border-0 text-xs font-mono text-gray-500 hover:text-gray-300">
                  {param}
                </div>
              ))}
            </div>
          </section>

          {/* Matches summary */}
          <section className="text-xs text-gray-500 border-t border-gray-800 pt-3">
            ✅ <span className="text-green-400">{match_count}</span> of {avc_total} AVC params match the reference exactly.
          </section>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-700 flex justify-end flex-shrink-0">
          <button onClick={close}
            className="text-xs px-4 py-1.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-700">
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
