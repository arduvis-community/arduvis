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
 * api/client.js
 * Thin API client for the FastAPI backend.
 * In dev:        Vite proxies /api/* to http://127.0.0.1:8374
 * In production: FastAPI serves the built React app from the same origin
 */

const BASE = '/api'

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API ${method} ${path} → ${res.status}: ${text}`)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

export const api = {
  health:          ()        => request('GET',  '/health'),

  // Project
  listProjects:    ()        => request('GET',    '/project/list'),
  saveProject:     (p)       => request('POST',   '/project/save', p),
  loadProject:     (name)    => request('GET',    `/project/load/${encodeURIComponent(name)}`),
  deleteProject:   (name)    => request('DELETE', `/project/delete/${encodeURIComponent(name)}`),
  openFolder:      (name)    => request('GET',    `/project/open-folder/${encodeURIComponent(name)}`),

  // Export / Import
  exportParam:     (payload) => request('POST', '/export/param',        payload),
  saveExport:      (payload) => request('POST', '/export/save',         payload),
  importParam:     (content) => request('POST', '/export/import/param', { content }),

  // Validate
  validate:        (payload) => request('POST', '/validate',     payload),

  // Components
  getComponentDefs: (vehicle) => request('GET', `/components/definitions?vehicle=${vehicle}`),
  getComponentDef:  (defId)   => request('GET', `/components/${defId}`),

  // ArduPilot param metadata — cache-busted so WebView2 never serves a stale response
  getParamMeta:    (vehicle) => request('GET', `/params/meta?vehicle=${vehicle}&_=${Date.now()}`),
  compareParam:    (payload) => request('POST', '/export/compare',             payload),

  // MAVLink
  mavConnect:      (cfg)     => request('POST', '/mavlink/connect',        cfg),
  mavStatus:       ()        => request('GET',  '/mavlink/status'),
  mavDisconnect:   ()        => request('POST', '/mavlink/disconnect'),
  mavUploadParams: (params)  => request('POST', '/mavlink/upload_params',  { params }),
  mavPullParams:   ()        => request('GET',  '/mavlink/pull_params'),
}
