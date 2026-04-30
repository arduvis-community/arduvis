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

import React, { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import Toolbar from './components/Toolbar'
import Palette from './components/Palette'
import CanvasArea from './components/CanvasArea'
import Inspector from './components/Inspector'
import DisclaimerModal, { needsDisclaimer } from './components/DisclaimerModal'

export default function App() {
  const { checkHealth, backendHealth, sidebarOpen, inspectorOpen } = useAppStore()
  const [showDisclaimer, setShowDisclaimer] = useState(needsDisclaimer)

  // Ping backend on mount
  useEffect(() => { checkHealth() }, [])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-gray-900">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Palette />}
        <CanvasArea />
        {inspectorOpen && <Inspector />}
      </div>
      {/* Backend status indicator */}
      {!backendHealth && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-red-900/80 text-red-200
                        text-xs px-3 py-1 rounded-full border border-red-700">
          Backend not responding
        </div>
      )}
      {showDisclaimer && (
        <DisclaimerModal onAccept={() => setShowDisclaimer(false)} />
      )}
    </div>
  )
}
