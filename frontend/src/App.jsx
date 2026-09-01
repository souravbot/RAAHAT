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
import ActionPlanPanel from './components/disruption/ActionPlanPanel'
import ScenarioPreview from './components/disruption/ScenarioPreview'
import ScenarioComparison from './components/disruption/ScenarioComparison'
import AssistantPanel from './components/disruption/AssistantPanel'
import './App.css'

export default function App() {
  const loadTwin = useTwinStore((s) => s.loadTwin)
  const loadDepletion = useTwinStore((s) => s.loadDepletion)
  const resetDemo = useTwinStore((s) => s.resetDemo)
  const loading = useTwinStore((s) => s.loading)
  const error = useTwinStore((s) => s.error)
  const metadata = useTwinStore((s) => s.metadata)
  const demoBusy = useTwinStore((s) => s.demoBusy)
  const demoResult = useTwinStore((s) => s.demoResult)
  const runDemoNow = useTwinStore((s) => s.runDemoNow)
  const resetDemoFlow = useTwinStore((s) => s.resetDemoFlow)
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

  const handleDemoRun = async () => {
    try {
      await runDemoNow()
    } catch {
      // demo error shown in store
    }
  }

  const handleDemoReset = async () => {
    try {
      await resetDemoFlow()
    } catch {
      // demo error shown in store
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <h1>RAAHAT</h1>
          <span className="subtitle">Regional AI for Accessibility, Assistance &amp; Transport</span>
        </div>
        <div className="header-actions">
          <button className="btn demo-btn" onClick={handleDemoRun} disabled={demoBusy}>
            {demoBusy ? 'Running demo…' : '▶ RUN LIVE DEMO'}
          </button>
          <button className="btn secondary-btn" onClick={handleDemoReset} disabled={demoBusy}>
            ↻ RESET DEMO
          </button>
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
            <div className="demo-story-panel">
              <div className="story-header">RAAHAT LIVE DEMONSTRATION</div>
              <ul className="story-list">
                <li className="story-step complete">✓ 1. Digital Twin Ready</li>
                <li className="story-step complete">✓ 2. Bridge Disruption Detected</li>
                <li className="story-step complete">✓ 3. Impact Analysed</li>
                <li className="story-step complete">✓ 4. Supply Risk Identified</li>
                <li className="story-step active">→ 5. Priority Calculated</li>
                <li className="story-step">6. Response Optimized</li>
              </ul>
              {demoResult && (
                <div className="story-summary">
                  <strong>{demoResult.demo?.scenario_name}</strong>
                  <p>{demoResult.story?.[5]?.summary || demoResult.priority?.selection_reason}</p>
                </div>
              )}
            </div>
            <DisruptionControl />
            <SimulationResult />
            <ImpactAnalysisPanel />
            <CriticalSupplyPanel />
            <PriorityPanel />
            <ActionPlanPanel />
            <ScenarioPreview />
            <ScenarioComparison />
            <AssistantPanel />
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
