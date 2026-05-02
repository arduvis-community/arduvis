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
 * store/useAppStore.js
 * Global Zustand store. Single source of truth for the entire app.
 *
 * Sections:
 *   vehicle      — vehicleType, vehicleLabel
 *   frame        — selected frame definition
 *   components   — all placed component instances (canvas blocks)
 *   canvas       — zoom, pan, activeView (top/bottom), backgroundImage
 *   ui           — selectedComponentId, inspectorOpen, sidebarOpen
 *   backend      — health, mavlinkConnected
 *   project      — projectName, dirty (unsaved changes)
 *
 * Persistence:
 *   Project data is persisted to localStorage via Zustand `persist` so a
 *   browser refresh restores the last working state automatically.
 *   Volatile UI state (panel open/close, selection, backend health) is
 *   intentionally excluded from persistence.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../api/client'

let _nextId = 1
const uid = () => `c_${_nextId++}`

// After rehydration, advance _nextId past any ids already in state to avoid
// collisions with components restored from localStorage.
function syncNextId(components) {
  for (const c of components) {
    const n = parseInt(c.id?.replace('c_', '') ?? '0', 10)
    if (n >= _nextId) _nextId = n + 1
  }
}

export const useAppStore = create(
  persist(
    (set, get) => ({

      // ── Vehicle ────────────────────────────────────────────────────────────
      vehicleType:  'copter',
      vehicleLabel: 'My Quad',
      setVehicleType:  (t) => set({ vehicleType: t, isDirty: true }),
      setVehicleLabel: (l) => set({ vehicleLabel: l, isDirty: true }),

      // ── Frame ──────────────────────────────────────────────────────────────
      frameInfo: null,
      setFrameInfo: (f) => set({ frameInfo: f, isDirty: true }),

      // ── Baseline params (original import — re-emitted on export) ──────────
      baselineParams: {},
      setBaselineParams:   (p)      => set({ baselineParams: p || {}, isDirty: true }),
      setBaselineParam:    (key, v) => set(s => ({ baselineParams: { ...s.baselineParams, [key.toUpperCase()]: v }, isDirty: true })),
      deleteBaselineParam: (key)    => set(s => { const p = { ...s.baselineParams }; delete p[key]; return { baselineParams: p, isDirty: true } }),

      // ── Web Serial (direct USB to FC) ─────────────────────────────────────
      webSerialSession:   null,
      webSerialConnected: false,
      webSerialPort:      null,
      setWebSerialSession: (session, port) => set({
        webSerialSession:   session,
        webSerialConnected: !!session,
        webSerialPort:      port ?? null,
      }),

      // ── Advanced params panel ──────────────────────────────────────────────
      advancedParamsOpen: false,
      toggleAdvancedParams: () => set(s => ({ advancedParamsOpen: !s.advancedParamsOpen, inspectorOpen: false, checklistOpen: false })),

      // ── Setup checklist panel ──────────────────────────────────────────────
      checklistOpen: false,
      toggleChecklist: () => set(s => ({ checklistOpen: !s.checklistOpen, advancedParamsOpen: false })),

      // ── Export options ─────────────────────────────────────────────────────
      exportIncludeDefaults: false,
      setExportIncludeDefaults: (v) => set({ exportIncludeDefaults: v }),

      // ── Inspector display mode ─────────────────────────────────────────────
      inspectorSimpleMode: true,
      toggleInspectorSimpleMode: () => set(s => ({ inspectorSimpleMode: !s.inspectorSimpleMode })),

      // ── Param comparison ───────────────────────────────────────────────────
      comparisonResult: null,
      comparisonModalOpen: false,
      setComparisonResult:    (r) => set({ comparisonResult: r }),
      setComparisonModalOpen: (b) => set({ comparisonModalOpen: b }),

      // ── Components (canvas blocks) ─────────────────────────────────────────
      components: [],

      addComponent: (defId, label, icon, virtual, x, y) => {
        const c = { id: uid(), defId, label, icon: icon || '◆', virtual: !!virtual, x, y, fields: {}, outputPin: null }
        set(s => ({ components: [...s.components, c], isDirty: true }))
        return c.id
      },

      updateComponent: (id, patch) => set(s => ({
        components: s.components.map(c => c.id === id ? { ...c, ...patch } : c),
        isDirty: true,
      })),

      updateComponentField: (id, key, value) => set(s => ({
        components: s.components.map(c =>
          c.id === id ? { ...c, fields: { ...c.fields, [key]: value } } : c
        ),
        isDirty: true,
      })),

      removeComponent: (id) => set(s => ({
        components: s.components.filter(c => c.id !== id),
        selectedComponentId: s.selectedComponentId === id ? null : s.selectedComponentId,
        isDirty: true,
      })),

      duplicateComponent: (id) => {
        const s = get()
        const orig = s.components.find(c => c.id === id)
        if (!orig) return
        const copy = { ...orig, id: uid(), x: orig.x + 20, y: orig.y + 20, outputPin: null }
        set(s => ({ components: [...s.components, copy], isDirty: true }))
      },

      moveComponent: (id, x, y) => set(s => ({
        components: s.components.map(c => c.id === id ? { ...c, x, y } : c),
        isDirty: true,
      })),

      // ── Wire routing (read-only in CE — Pro writes waypoints) ─────────────
      showWires:     true,
      wireWaypoints: {},   // { [`${compId}:${fcId}`]: [{x, y}] }

      setShowWires: (b) => set({ showWires: b }),

      // ── Canvas ─────────────────────────────────────────────────────────────
      zoom:            1,
      panX:            0,
      panY:            0,
      activeView:      'top',
      snapEnabled:     true,
      snapSize:        20,
      backgroundImageTop:    null,
      backgroundImageBottom: null,

      setZoom:        (z) => set({ zoom: z }),
      setPan:         (x, y) => set({ panX: x, panY: y }),
      setActiveView:  (v) => set({ activeView: v }),
      setSnapEnabled: (b) => set({ snapEnabled: b }),
      setBackground:  (view, img) => view === 'top'
        ? set({ backgroundImageTop: img, isDirty: true })
        : set({ backgroundImageBottom: img, isDirty: true }),

      // ── Standard view tracking ─────────────────────────────────────────────
      activeViewMotorCount: 0,
      activeViewId: null,

      setActiveStandardView: (viewObj) => set({
        activeViewMotorCount: viewObj?.motorCount ?? 0,
        activeViewId: viewObj?.id ?? null,
      }),

      // ── UI (not persisted) ─────────────────────────────────────────────────
      selectedComponentId:     null,
      inspectorOpen:           true,
      sidebarOpen:             true,
      standardViewsOpen:       false,
      saveModalOpen:           false,
      canvasMode:              'standard',   // 'standard' | 'topology'

      selectComponent:          (id) => set({ selectedComponentId: id, inspectorOpen: true }),
      deselectAll:              ()   => set({ selectedComponentId: null }),
      toggleInspector:          ()   => set(s => ({ inspectorOpen: !s.inspectorOpen, advancedParamsOpen: false, checklistOpen: false })),
      toggleSidebar:            ()   => set(s => ({ sidebarOpen: !s.sidebarOpen })),
      setStandardViewsOpen:     (b)  => set({ standardViewsOpen: b }),
      setSaveModalOpen:         (b)  => set({ saveModalOpen: b }),
      setCanvasMode:            (m)  => set({ canvasMode: m, sidebarOpen: m !== 'topology' }),

      // ── Backend / MAVLink ──────────────────────────────────────────────────
      backendHealth:    null,
      mavlinkConnected: false,
      mavlinkModalOpen: false,
      mavFcInfo:        {},

      setMavlinkModalOpen: (b) => set({ mavlinkModalOpen: b }),

      checkHealth: async () => {
        try {
          const h = await api.health()
          set({ backendHealth: h })
        } catch {
          set({ backendHealth: null })
        }
        // Poll MAVLink status so the pill stays accurate
        try {
          const s = await api.mavStatus()
          set({ mavlinkConnected: s.connected, mavFcInfo: s.fc_info ?? {} })
        } catch {
          // backend may not be up yet — ignore
        }
      },

      mavConnect: async (cfg) => {
        const result = await api.mavConnect(cfg)
        set({ mavlinkConnected: result.connected, mavFcInfo: result.fc_info ?? {} })
        return result
      },

      mavDisconnect: async () => {
        await api.mavDisconnect()
        set({ mavlinkConnected: false, mavFcInfo: {} })
      },

      // ── Project ────────────────────────────────────────────────────────────
      projectName: 'Untitled',
      isDirty:     false,

      setProjectName: (n) => set({ projectName: n }),

      newProject: () => set({
        projectName:          'Untitled',
        vehicleType:          'copter',
        vehicleLabel:         'My Vehicle',
        frameInfo:            null,
        components:           [],
        baselineParams:       {},
        selectedComponentId:  null,
        backgroundImageTop:   null,
        backgroundImageBottom: null,
        zoom:       1,
        panX:       0,
        panY:       0,
        activeView: 'top',
        activeViewMotorCount: 0,
        activeViewId: null,
        wireWaypoints: {},
        showWires:     true,
        isDirty:    false,
      }),

      // saveProject(name?, basePath?) — name overrides the current projectName if provided.
      saveProject: async (name, basePath) => {
        const s = get()
        const saveName = (name ?? s.projectName).trim() || 'Untitled'
        const payload = {
          name:          saveName,
          vehicleType:   s.vehicleType,
          vehicleLabel:  s.vehicleLabel,
          frameInfo:     s.frameInfo,
          components:    s.components,
          canvas: { zoom: s.zoom, panX: s.panX, panY: s.panY, activeView: s.activeView },
          airframeTop:    s.backgroundImageTop    ?? null,
          airframeBottom: s.backgroundImageBottom ?? null,
          baselineParams: s.baselineParams,
          basePath:       basePath ?? null,
        }
        await api.saveProject(payload)
        set({ projectName: saveName, isDirty: false })
      },

      loadProject: async (name) => {
        const data = await api.loadProject(name)
        const components = data.components ?? []
        syncNextId(components)
        set({
          projectName:          name,
          vehicleType:          data.vehicleType   ?? 'copter',
          vehicleLabel:         data.vehicleLabel  ?? name,
          frameInfo:            data.frameInfo     ?? null,
          components,
          baselineParams:       data.baselineParams ?? {},
          backgroundImageTop:   data.airframeTop   ?? null,
          backgroundImageBottom: data.airframeBottom ?? null,
          zoom:       data.canvas?.zoom       ?? 1,
          panX:       data.canvas?.panX       ?? 0,
          panY:       data.canvas?.panY       ?? 0,
          activeView: data.canvas?.activeView ?? 'top',
          wireWaypoints: data.wireWaypoints ?? {},
          showWires:     data.showWires     ?? true,
          selectedComponentId: null,
          isDirty:    false,
        })
      },
    }),
    {
      name: 'avc-workspace',   // localStorage key

      // Only persist project data — not transient UI or backend state.
      partialize: (s) => ({
        projectName:          s.projectName,
        vehicleType:          s.vehicleType,
        vehicleLabel:         s.vehicleLabel,
        frameInfo:            s.frameInfo,
        components:           s.components,
        baselineParams:       s.baselineParams,
        zoom:                 s.zoom,
        panX:                 s.panX,
        panY:                 s.panY,
        activeView:           s.activeView,
        snapEnabled:          s.snapEnabled,
        snapSize:             s.snapSize,
        backgroundImageTop:   s.backgroundImageTop,
        backgroundImageBottom: s.backgroundImageBottom,
        activeViewMotorCount: s.activeViewMotorCount,
        activeViewId:         s.activeViewId,
        showWires:            s.showWires,
        wireWaypoints:        s.wireWaypoints,
        isDirty:              s.isDirty,
        inspectorSimpleMode:  s.inspectorSimpleMode,
      }),

      // After rehydration, sync the id counter so new components don't collide.
      onRehydrateStorage: () => (state) => {
        if (state?.components?.length) syncNextId(state.components)
      },
    }
  )
)
