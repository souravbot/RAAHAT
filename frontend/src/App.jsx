import { useEffect, useState } from 'react'
import { useTwinStore } from './state/useTwinStore'
import MapView from './map/MapView'
import Sidebar from './panels/Sidebar'
import NodeDetailPanel from './panels/NodeDetailPanel'
import EdgeDetailPanel from './panels/EdgeDetailPanel'
import DisruptionControl from './components/disruption/DisruptionControl'
import SimulationResult from './components/disruption/SimulationResult'
import AccessibilityDashboard from './components/disruption/AccessibilityDashboard'
import ImpactAnalysisPanel from './components/disruption/ImpactAnalysisPanel'
import CriticalSupplyPanel from './components/disruption/CriticalSupplyPanel'
import PriorityPanel from './components/disruption/PriorityPanel'
import './App.css'

export default function App() {
  const loadTwin = useTwinStore((s) => s.loadTwin)
  const loadDepletion = useTwinStore((s) => s.loadDepletion)
  const resetDemo = useTwinStore((s) => s.resetDemo)
  const loading = useTwinStore((s) => s.loading)
  const error = useTwinStore((s) => s.error)
  const metadata = useTwinStore((s) => s.metadata)
  const nodes = useTwinStore((s) => s.nodes)
  const edges = useTwinStore((s) => s.edges)
  const summary = useTwinStore((s) => s.summary)
  const selectedNodeId = useTwinStore((s) => s.selectedNodeId)
  const selectedEdgeId = useTwinStore((s) => s.selectedEdgeId)

  const [confirmReset, setConfirmReset] = useState(false)
  const [depletionLoaded, setDepletionLoaded] = useState(false)

  useEffect(() => {
    loadTwin()
  }, [loadTwin])

  useEffect(() => {
    if (!depletionLoaded) {
      setDepletionLoaded(true)
      loadDepletion()
    }
  }, [loadDepletion, depletionLoaded])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId)

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    setConfirmReset(false)
    try {
      await resetDemo()
    } catch {
      // error surfaced via disruptionError
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>RAAHAT</h1>
          <span className="subtitle">Regional AI for Accessibility, Assistance &amp; Transport</span>
        </div>
        <div
          className={`api-status ${error ? 'error' : loading ? 'loading' : 'ok'}`}
          title={error || undefined}
        >
          {error
            ? 'Offline'
            : loading
              ? 'Loading twin…'
              : `Twin v${metadata?.version} · ${summary?.total_nodes ?? nodes.length} nodes / ${summary?.total_edges ?? edges.length} routes`}
        </div>
      </header>

      {error ? (
        <div className="error-screen">
          <h2>Unable to load the Regional Twin</h2>
          <p>{error}</p>
          <p className="error-hint">
            Start the RAAHAT backend (<code>uvicorn app.main:app --port 8000</code>) and refresh.
          </p>
        </div>
      ) : (
        <div className="app-body">
          <Sidebar />
          <div className="map-region">
            <MapView />
            {(selectedNode || selectedEdge) && (
              <div className="detail-overlay">
                {selectedNode && <NodeDetailPanel node={selectedNode} />}
                {selectedEdge && <EdgeDetailPanel edge={selectedEdge} />}
              </div>
            )}
          </div>
          <aside className="control-column">
            <DisruptionControl />
            <SimulationResult />
            <ImpactAnalysisPanel />
            <CriticalSupplyPanel />
            <PriorityPanel />
            <AccessibilityDashboard />
            <button
              className={`btn reset-btn ${confirmReset ? 'reset-confirm' : ''}`}
              onClick={handleReset}
            >
              {confirmReset ? 'Confirm reset?' : 'RESET DEMO'}
            </button>
          </aside>
        </div>
      )}
    </div>
  )
}
