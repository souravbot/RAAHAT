import { useEffect, useState } from 'react'
import { useTwinStore } from './state/useTwinStore'
import MapView from './map/MapView'
import IconSidebar from './panels/IconSidebar'
import RightIntelPanel from './panels/RightIntelPanel'
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
import MapFocusView from './views/MapFocusView'
import ImpactAnalysisView from './views/ImpactAnalysisView'
import PriorityQueueView from './views/PriorityQueueView'
import SimulationsView from './views/SimulationsView'
import './App.css'

/* ---------- region options ---------- */
const REGIONS = [
  { id: 'assam-east', label: 'Assam — Eastern Corridor' },
  { id: 'assam-west', label: 'Assam — Western Corridor' },
  { id: 'meghalaya', label: 'Meghalaya Highlands' },
  { id: 'arunachal', label: 'Arunachal Pradesh' },
]

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
  const [activeView, setActiveView] = useState('dashboard')
  const [selectedRegion, setSelectedRegion] = useState('assam-east')
  const [isLive, setIsLive] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    loadTwin()
  }, [loadTwin])

  useEffect(() => {
    if (!depletionLoaded) {
      setDepletionLoaded(true)
      loadDepletion()
    }
  }, [loadDepletion, depletionLoaded])

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

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

  const handleSimulateDisruption = () => {
    setIsLive(false)
    setDrawerOpen(true)
  }

  // Count of open/at-risk/closed edges for top bar stats
  const openEdges = edges.filter(e => e.status === 'OPEN').length
  const atRiskEdges = edges.filter(e => e.status === 'AT_RISK').length
  const closedEdges = edges.filter(e => e.status === 'CLOSED').length

  return (
    <div className="app" id="raahat-app">
      {/* =============== TOP BAR =============== */}
      <header className="topbar" id="topbar">
        <div className="topbar-left">
          <div className="brand" id="brand">
            <h1 className="brand-wordmark">RAAHAT</h1>
            <span className="brand-tagline">Regional Logistics Intelligence</span>
          </div>

          <div className="topbar-divider" />

          {/* Region selector */}
          <div className="region-selector" id="region-selector">
            <span className="material-symbols-outlined region-icon">location_on</span>
            <select
              className="region-select"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="topbar-center">
          {/* Live KPI strip — pill chips */}
          <div className="kpi-strip" id="kpi-strip">
            <div className="kpi-chip">
              <span className="material-symbols-outlined kpi-chip-icon">hub</span>
              <span className="kpi-value">{nodes.length}</span>
              <span className="kpi-label">Nodes</span>
            </div>
            <div className="kpi-chip kpi-ok">
              <span className="material-symbols-outlined kpi-chip-icon">route</span>
              <span className="kpi-value">{openEdges}</span>
              <span className="kpi-label">Open</span>
            </div>
            <div className="kpi-chip kpi-warn">
              <span className="material-symbols-outlined kpi-chip-icon">warning</span>
              <span className="kpi-value">{atRiskEdges}</span>
              <span className="kpi-label">At Risk</span>
            </div>
            <div className="kpi-chip kpi-danger">
              <span className="material-symbols-outlined kpi-chip-icon">block</span>
              <span className="kpi-value">{closedEdges}</span>
              <span className="kpi-label">Closed</span>
            </div>
          </div>
        </div>

        <div className="topbar-right">
          {/* Status badge */}
          <div className={`status-badge ${isLive ? 'status-live' : 'status-sim'}`} id="status-badge">
            <span className={`status-dot ${isLive ? 'dot-live' : 'dot-sim'}`} />
            <span className="status-text">{isLive ? 'LIVE' : 'SIMULATION'}</span>
          </div>

          {/* Twin version */}
          <div className={`twin-status ${error ? 'twin-error' : loading ? 'twin-loading' : 'twin-ok'}`} id="twin-status">
            {error
              ? 'Offline'
              : loading
                ? 'Connecting…'
                : `v${metadata?.version}`}
          </div>

          {/* Simulate Disruption button */}
          <button
            className="btn-simulate"
            id="btn-simulate-disruption"
            onClick={handleSimulateDisruption}
          >
            <span className="material-symbols-outlined btn-simulate-icon">bolt</span>
            Simulate Disruption
          </button>

          {/* Time */}
          <div className="topbar-time">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      {/* =============== BODY =============== */}
      {error ? (
        <div className="error-screen" id="error-screen">
          <span className="material-symbols-outlined error-icon-large">cloud_off</span>
          <h2>Unable to load the Regional Twin</h2>
          <p>{error}</p>
          <p className="error-hint">
            Start the RAAHAT backend (<code>uvicorn app.main:app --port 8000</code>) and refresh.
          </p>
        </div>
      ) : (
        <div className={`app-body ${drawerOpen ? 'drawer-open' : ''}`} id="app-body">
          {/* Left icon sidebar */}
          <IconSidebar activeView={activeView} onNavigate={setActiveView} />

          {/* ============ VIEW SWITCHER ============ */}
          {activeView === 'map' && (
            <MapFocusView />
          )}

          {activeView === 'impact' && (
            <ImpactAnalysisView />
          )}

          {activeView === 'queue' && (
            <PriorityQueueView />
          )}

          {activeView === 'simulations' && (
            <SimulationsView />
          )}

          {activeView === 'dashboard' && (
            <>
              {/* Map region (center-right) */}
              <div className="map-region" id="map-region">
                <MapView />

                {/* Map overlay stats */}
                <div className="map-overlay-stats" id="map-overlay-stats">
                  <div className="map-stat">
                    <span className="material-symbols-outlined map-stat-icon">hub</span>
                    <span className="map-stat-value">{summary?.total_nodes ?? nodes.length}</span>
                    <span className="map-stat-label">nodes</span>
                  </div>
                  <div className="map-stat">
                    <span className="material-symbols-outlined map-stat-icon">route</span>
                    <span className="map-stat-value">{summary?.total_edges ?? edges.length}</span>
                    <span className="map-stat-label">routes</span>
                  </div>
                </div>

                {/* Drawer toggle button */}
                <button
                  className="drawer-toggle"
                  id="drawer-toggle"
                  onClick={() => setDrawerOpen((v) => !v)}
                  title={drawerOpen ? 'Close Controls' : 'Open Controls'}
                >
                  <span className="material-symbols-outlined">
                    {drawerOpen ? 'right_panel_close' : 'right_panel_open'}
                  </span>
                  {drawerOpen ? 'Close' : 'Controls'}
                </button>

                {/* Node/Edge detail overlay */}
                {(selectedNode || selectedEdge) && (
                  <div className="detail-overlay" id="detail-overlay">
                    {selectedNode && <NodeDetailPanel node={selectedNode} />}
                    {selectedEdge && <EdgeDetailPanel edge={selectedEdge} />}
                  </div>
                )}
              </div>

              {/* Right Intelligence Panel */}
              <RightIntelPanel />

              {/* Controls overlay (slides out from right edge, behind intel panel) */}
              <div className="controls-drawer" id="controls-drawer">
                <div className="drawer-scroll">
                  {/* Demo story panel */}
                  <div className="demo-story-panel">
                    <div className="story-header">
                      <span className="material-symbols-outlined story-header-icon">auto_awesome</span>
                      RAAHAT LIVE DEMONSTRATION
                    </div>
                    <ul className="story-list">
                      <li className="story-step complete">
                        <span className="material-symbols-outlined story-check">check_circle</span>
                        1. Digital Twin Ready
                      </li>
                      <li className="story-step complete">
                        <span className="material-symbols-outlined story-check">check_circle</span>
                        2. Bridge Disruption Detected
                      </li>
                      <li className="story-step complete">
                        <span className="material-symbols-outlined story-check">check_circle</span>
                        3. Impact Analysed
                      </li>
                      <li className="story-step complete">
                        <span className="material-symbols-outlined story-check">check_circle</span>
                        4. Supply Risk Identified
                      </li>
                      <li className="story-step active">
                        <span className="material-symbols-outlined story-arrow">arrow_forward</span>
                        5. Priority Calculated
                      </li>
                      <li className="story-step">
                        <span className="material-symbols-outlined story-pending">radio_button_unchecked</span>
                        6. Response Optimized
                      </li>
                    </ul>
                    {demoResult && (
                      <div className="story-summary">
                        <strong>{demoResult.demo?.scenario_name}</strong>
                        <p>{demoResult.story?.[5]?.summary || demoResult.priority?.selection_reason}</p>
                      </div>
                    )}
                    <div className="demo-actions">
                      <button className="btn-demo-run" onClick={handleDemoRun} disabled={demoBusy}>
                        <span className="material-symbols-outlined">{demoBusy ? 'hourglass_top' : 'play_arrow'}</span>
                        {demoBusy ? 'Running…' : 'Run Demo'}
                      </button>
                      <button className="btn-demo-reset" onClick={handleDemoReset} disabled={demoBusy}>
                        <span className="material-symbols-outlined">restart_alt</span>
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* Disruption + existing panels */}
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
                    className={`btn-reset-full ${confirmReset ? 'reset-confirm' : ''}`}
                    onClick={handleReset}
                    id="btn-reset-demo"
                  >
                    <span className="material-symbols-outlined">delete_forever</span>
                    {confirmReset ? 'Confirm Reset?' : 'Reset All Data'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
