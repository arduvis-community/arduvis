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
import { api } from '../api/client'
import { useAppStore } from '../store/useAppStore'

const PROTOCOLS = ['tcp', 'udp']

export default function MAVLinkModal({ onClose }) {
  const mavlinkConnected = useAppStore(s => s.mavlinkConnected)
  const mavFcInfo        = useAppStore(s => s.mavFcInfo)
  const mavConnect       = useAppStore(s => s.mavConnect)
  const mavDisconnect    = useAppStore(s => s.mavDisconnect)

  const [host,     setHost]     = useState('127.0.0.1')
  const [port,     setPort]     = useState(5762)
  const [protocol, setProtocol] = useState('tcp')
  const [busy,     setBusy]     = useState(false)   // connecting / uploading / pulling
  const [busyMsg,  setBusyMsg]  = useState('')
  const [error,    setError]    = useState(null)
  const [result,   setResult]   = useState(null)    // last upload/pull result message

  // ── connect ──────────────────────────────────────────────────────────────────
  const handleConnect = async () => {
    setError(null)
    setResult(null)
    setBusy(true)
    setBusyMsg('Connecting…')
    try {
      await mavConnect({ host, port: Number(port), protocol })
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setBusy(false)
      setBusyMsg('')
    }
  }

  // ── disconnect ────────────────────────────────────────────────────────────────
  const handleDisconnect = async () => {
    setError(null)
    setResult(null)
    setBusy(true)
    setBusyMsg('Disconnecting…')
    try {
      await mavDisconnect()
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setBusy(false)
      setBusyMsg('')
    }
  }

  // ── upload params ─────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    setError(null)
    setResult(null)
    setBusy(true)
    setBusyMsg('Building param list…')
    try {
      const store = useAppStore.getState()
      const { components, vehicleType, vehicleLabel, frameInfo, baselineParams } = store
      const exportResult = await api.exportParam({
        components,
        vehicle_type:    vehicleType,
        vehicle_label:   vehicleLabel,
        frame_info:      frameInfo,
        baseline_params: baselineParams || {},
      })
      // exportParam returns plain text — parse it into [{param, value}]
      const flat = parseParamText(exportResult)
      setBusyMsg(`Uploading ${flat.length} params…`)
      const res = await api.mavUploadParams(flat)
      const msg = `Uploaded ${res.uploaded} / ${res.total} params` +
        (res.failed?.length ? ` (${res.failed.length} failed)` : '')
      setResult(msg)
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setBusy(false)
      setBusyMsg('')
    }
  }

  // ── pull params from FC ───────────────────────────────────────────────────────
  const handlePull = async () => {
    setError(null)
    setResult(null)
    setBusy(true)
    setBusyMsg('Fetching params from FC (may take up to 45 s)…')
    try {
      const data  = await api.mavPullParams()
      // Apply using the same flow as .param file import
      const store = useAppStore.getState()
      store.newProject()
      store.setVehicleType(data.vehicle_type)
      store.setBaselineParams(data.params)
      for (const comp of data.components) {
        const id = store.addComponent(comp.defId, comp.label, comp.icon, comp.virtual, comp.x, comp.y)
        if (comp.noCanvas) store.updateComponent(id, { noCanvas: true })
        for (const [key, val] of Object.entries(comp.fields || {})) {
          store.updateComponentField(id, key, val)
        }
      }
      setResult(`Pulled ${data.count} params — ${data.components.length} component(s) loaded`)
    } catch (err) {
      setError(extractMessage(err))
    } finally {
      setBusy(false)
      setBusyMsg('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
         onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-[420px] shadow-2xl"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${mavlinkConnected ? 'bg-green-400' : 'bg-gray-500'}`} />
            <span className="text-sm font-semibold text-white">MAVLink Connection</span>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-5 flex flex-col gap-4">

          {/* ── Connected state ───────────────────────────────────────────── */}
          {mavlinkConnected ? (
            <>
              <FCInfoCard info={mavFcInfo} />

              {result && (
                <div className="text-xs text-green-400 bg-green-400/10 border border-green-800
                                rounded px-3 py-2">
                  {result}
                </div>
              )}
              {error && <ErrorBanner msg={error} />}
              {busy && <BusyBanner msg={busyMsg} />}

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleUpload}
                  disabled={busy}
                  className="text-xs px-4 py-2 rounded bg-blue-700 hover:bg-blue-600
                             text-white disabled:opacity-50 disabled:cursor-not-allowed">
                  Upload params to FC
                </button>
                <button
                  onClick={handlePull}
                  disabled={busy}
                  className="text-xs px-4 py-2 rounded bg-gray-700 hover:bg-gray-600
                             border border-gray-600 text-gray-200
                             disabled:opacity-50 disabled:cursor-not-allowed">
                  Pull params from FC
                </button>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                <strong className="text-gray-400">Pull params</strong> replaces the current canvas
                with components inferred from the live FC configuration —
                like importing a .param file but directly from the flight controller.
              </p>
            </>
          ) : (
            /* ── Disconnected state ─────────────────────────────────────── */
            <>
              <p className="text-xs text-gray-400">
                Connect to Mission Planner (TCP output) or directly to a flight controller.
                Mission Planner's default TCP output is <span className="text-gray-200">127.0.0.1:5762</span>.
              </p>

              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs text-gray-400">Host</label>
                    <input
                      type="text"
                      value={host}
                      onChange={e => setHost(e.target.value)}
                      className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1.5
                                 text-gray-200 focus:outline-none focus:border-blue-500"
                      placeholder="127.0.0.1"
                    />
                  </div>
                  <div className="flex flex-col gap-1 w-24">
                    <label className="text-xs text-gray-400">Port</label>
                    <input
                      type="number"
                      value={port}
                      onChange={e => setPort(e.target.value)}
                      className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1.5
                                 text-gray-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1 w-20">
                    <label className="text-xs text-gray-400">Protocol</label>
                    <select
                      value={protocol}
                      onChange={e => setProtocol(e.target.value)}
                      className="text-xs bg-gray-800 border border-gray-600 rounded px-2 py-1.5
                                 text-gray-200 focus:outline-none focus:border-blue-500">
                      {PROTOCOLS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                {error && <ErrorBanner msg={error} />}
                {busy  && <BusyBanner msg={busyMsg} />}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-700 flex justify-between items-center">
          {mavlinkConnected ? (
            <button
              onClick={handleDisconnect}
              disabled={busy}
              className="text-xs px-4 py-1.5 rounded border border-red-800 text-red-400
                         hover:bg-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed">
              Disconnect
            </button>
          ) : (
            <span />
          )}
          {!mavlinkConnected && (
            <button
              onClick={handleConnect}
              disabled={busy}
              className="text-xs px-4 py-1.5 rounded bg-blue-700 hover:bg-blue-600
                         text-white disabled:opacity-50 disabled:cursor-not-allowed">
              {busy ? 'Connecting…' : 'Connect'}
            </button>
          )}
          {mavlinkConnected && (
            <button onClick={onClose}
              className="text-xs px-4 py-1.5 rounded border border-gray-600 text-gray-300
                         hover:bg-gray-700">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FCInfoCard({ info }) {
  return (
    <div className="bg-gray-800 rounded-lg px-4 py-3 flex flex-col gap-1.5">
      <div className="text-xs font-semibold text-green-400">Connected</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <Row label="Autopilot" val={info.ap_label   || '—'} />
        <Row label="Type"      val={info.type_label  || '—'} />
        <Row label="Sys ID"    val={info.sysid       ?? '—'} />
        <Row label="Comp ID"   val={info.compid      ?? '—'} />
      </div>
    </div>
  )
}

function Row({ label, val }) {
  return (
    <>
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-200">{String(val)}</span>
    </>
  )
}

function ErrorBanner({ msg }) {
  return (
    <div className="text-xs text-red-400 bg-red-400/10 border border-red-800 rounded px-3 py-2">
      {msg}
    </div>
  )
}

function BusyBanner({ msg }) {
  return (
    <div className="text-xs text-blue-300 bg-blue-400/10 border border-blue-800
                    rounded px-3 py-2 flex items-center gap-2">
      <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent
                       rounded-full animate-spin" />
      {msg}
    </div>
  )
}

// Parse plain-text .param content → [{param, value}]
function parseParamText(text) {
  const result = []
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const comma = trimmed.indexOf(',')
    if (comma < 1) continue
    const param = trimmed.slice(0, comma).trim()
    const value = parseFloat(trimmed.slice(comma + 1))
    if (param && !isNaN(value)) result.push({ param, value })
  }
  return result
}

function extractMessage(err) {
  if (!err) return 'Unknown error'
  const text = err.message || String(err)
  // FastAPI detail is JSON: {"detail": "..."} or plain string after the status line
  try {
    const m = text.match(/:\s*(\{.*\})$/)
    if (m) {
      const obj = JSON.parse(m[1])
      return obj.detail || text
    }
  } catch { /* ignore */ }
  // Strip "API POST /mavlink/connect → 400: " prefix for cleaner display
  const m2 = text.match(/→\s*\d+:\s*(.+)$/)
  return m2 ? m2[1].replace(/^\{.*?"detail"\s*:\s*"?/, '').replace(/"?\}$/, '') : text
}
