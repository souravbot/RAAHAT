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
import ActionPlanPanel from './components/disruption/ActionPlanPanel'
import ScenarioPreview from './components/disruption/ScenarioPreview'
import ScenarioComparison from './components/disruption/ScenarioComparison'
import AssistantPanel from './components/disruption/AssistantPanel'
import OperationalIntelligenceWorkflow from './components/workflow/OperationalIntelligenceWorkflow'
import LoginPage from './views/LoginPage'
import MapFocusView from './views/MapFocusView'
import ImpactAnalysisView from './views/ImpactAnalysisView'
import PriorityQueueView from './views/PriorityQueueView'
import DisruptionsView from './views/DisruptionsView'
import SimulationsView from './views/SimulationsView'
import FieldOfficerDashboard from './views/FieldOfficerDashboard'
import { AuthProvider, useAuth } from './auth/AuthContext'
import RoleBadge from './components/auth/RoleBadge'
import DemoBar from './components/auth/DemoBar'
import SituationSummary from './components/SituationSummary'
import { ROLES, PERMISSIONS } from './auth/permissions'
import './App.css'

/* ---------- region options ---------- */
const REGIONS = [
  { id: 'assam-east', label: 'Assam — Eastern Corridor' },
  { id: 'assam-west', label: 'Assam — Western Corridor' },
  { id: 'meghalaya', label: 'Meghalaya Highlands' },
  { id: 'arunachal', label: 'Arunachal Pradesh' },
]

function getPathView() {
  const path = window.location.pathname
  if (path === '/login') return 'login'
  if (path === '/map') return 'map'
  if (path === '/impact-analysis' || path === '/impact') return 'impact'
  if (path === '/priority-queue' || path === '/queue') return 'queue'
  if (path === '/disruptions' || path === '/simulations') return 'disruptions'
  if (path === '/workflow') return 'workflow'
  return 'dashboard'
}

function AppContent() {
  const { role, roleMeta, isAuthenticated, userEmail, login, logout, switchRole, hasPermission } = useAuth()

  const loadTwin = useTwinStore((s) => s.loadTwin)
  const loadDepletion = useTwinStore((s) => s.loadDepletion)
  const loadPriorities = useTwinStore((s) => s.loadPriorities)
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

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [initialDataLoaded, setInitialDataLoaded] = useState(false)
  const [activeView, setActiveView] = useState(() => {
    const v = getPathView()
    return v === 'login' ? 'dashboard' : v
  })
  const [selectedRegion, setSelectedRegion] = useState('assam-east')
  const [isLive, setIsLive] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Route Protection & History Sync
  useEffect(() => {
    const checkRoute = () => {
      const isAuth = localStorage.getItem('raahat_auth') === 'true'
      const path = window.location.pathname
      const pathView = getPathView()

      if (!isAuth) {
        // Unauthenticated users visiting root/landing go directly to landing page
        if (path === '/' || path === '' || path === '/landing') {
          window.location.replace('/landing.html')
          return
        }
        if (path !== '/login') {
          window.history.replaceState(null, '', '/login')
        }
      } else {
        // Authenticated users visiting root/login/landing go to dashboard
        if (path === '/' || path === '/login' || path === '/landing' || path === '/landing.html') {
          window.history.replaceState(null, '', '/dashboard')
          setActiveView('dashboard')
        } else {
          setActiveView(pathView === 'login' ? 'dashboard' : pathView)
        }
      }
    }

    checkRoute()
    const onPop = () => checkRoute()
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated && !initialDataLoaded) {
      setInitialDataLoaded(true)
      loadTwin().catch(() => {})
      loadDepletion().catch(() => {})
      loadPriorities().catch(() => {})
    }
  }, [isAuthenticated, initialDataLoaded, loadTwin, loadDepletion, loadPriorities])

  // Open the control drawer when a demo scenario completes so impact/action panels are visible.
  useEffect(() => {
    if (demoResult?.success) {
      setDrawerOpen(true)
    }
  }, [demoResult])

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const handleNavigate = (viewId) => {
    // Restrict Field Officers from admin simulation pages
    if (role === ROLES.FIELD_OFFICER && (viewId === 'simulations' || viewId === 'disruptions')) {
      alert('Simulations & Disruption Control are restricted to Command Center personnel.')
      return
    }

    const pathMap = {
      dashboard: '/dashboard',
      map: '/map',
      disruptions: '/disruptions',
      simulations: '/disruptions',
      impact: '/impact-analysis',
      queue: '/priority-queue',
      workflow: '/workflow',
      login: '/login',
    }
    const targetPath = pathMap[viewId] || '/dashboard'
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath)
    }
    setActiveView(viewId)
  }

  const handleLoginSuccess = (selectedRole, email) => {
    login(selectedRole, email)
    window.history.pushState(null, '', '/dashboard')
    setActiveView('dashboard')
  }

  const handleLogout = () => {
    logout()
    setUserMenuOpen(false)
    window.history.pushState(null, '', '/login')
  }

  const handleRoleSwitch = (newRole) => {
    switchRole(newRole)
    setUserMenuOpen(false)
    window.history.pushState(null, '', '/dashboard')
    setActiveView('dashboard')
  }

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

  const handleSimulateDisruption = () => {
    setIsLive(false)
    setDrawerOpen(true)
  }

  // If not authenticated, render Login Page
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
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

          {/* Simulate Disruption button (Command Center & Demo Mode only) */}
          {hasPermission(PERMISSIONS.TRIGGER_DISRUPTION) && (
            <button
              className="btn-simulate"
              id="btn-simulate-disruption"
              onClick={handleSimulateDisruption}
            >
              <span className="material-symbols-outlined btn-simulate-icon">bolt</span>
              Simulate Disruption
            </button>
          )}

          {/* Role & User Indicator */}
          <div className="user-menu-container" id="user-menu-container">
            <button
              className="user-indicator-btn"
              onClick={() => setUserMenuOpen((v) => !v)}
              id="btn-user-menu"
            >
              <RoleBadge role={role} showSubLabel={false} />
              <span className="material-symbols-outlined user-chevron">expand_more</span>
            </button>

            {userMenuOpen && (
              <div className="user-dropdown-menu" id="user-dropdown-menu">
                <div className="user-dropdown-header">
                  <strong>{roleMeta.label}</strong>
                  <span>{userEmail}</span>
                  <span className="role-sub-desc">{roleMeta.subLabel}</span>
                </div>

                <div className="user-dropdown-divider" />

                <div className="user-role-switch-title">Switch Mode (Demo):</div>
                <button
                  className={`user-dropdown-item ${role === ROLES.COMMAND_CENTER ? 'is-active' : ''}`}
                  onClick={() => handleRoleSwitch(ROLES.COMMAND_CENTER)}
                >
                  <span className="material-symbols-outlined">shield_person</span>
                  Command Center
                </button>
                <button
                  className={`user-dropdown-item ${role === ROLES.FIELD_OFFICER ? 'is-active' : ''}`}
                  onClick={() => handleRoleSwitch(ROLES.FIELD_OFFICER)}
                >
                  <span className="material-symbols-outlined">badge</span>
                  Field Officer
                </button>
                <button
                  className={`user-dropdown-item ${role === ROLES.DEMO ? 'is-active' : ''}`}
                  onClick={() => handleRoleSwitch(ROLES.DEMO)}
                >
                  <span className="material-symbols-outlined">sports_score</span>
                  Hackathon Demo Mode
                </button>

                <div className="user-dropdown-divider" />

                <button className="user-dropdown-item logout-btn" onClick={handleLogout} id="btn-logout">
                  <span className="material-symbols-outlined">logout</span>
                  Log Out
                </button>
              </div>
            )}
          </div>

          {/* Time */}
          <div className="topbar-time">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      {/* Demo Mode Progress Banner */}
      {role === ROLES.DEMO && <DemoBar />}

      {/* =============== BODY =============== */}
      {error ? (
        <div className="error-screen" id="error-screen">
          <span className="material-symbols-outlined error-icon-large">cloud_off</span>
          <h2>Unable to connect to the Regional Intelligence System</h2>
          <p>The RAAHAT backend service is not responding.</p>
          <p className="error-hint">
            Start the backend (<code>uvicorn app.main:app --port 8000</code>) and refresh.
          </p>
          <button
            className="btn btn-sim"
            style={{ marginTop: '0.5rem', flex: 'none', width: 'auto', padding: '0.55rem 1.5rem' }}
            onClick={() => window.location.reload()}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '0.35rem' }}>refresh</span>
            Retry Connection
          </button>
        </div>
      ) : role === ROLES.FIELD_OFFICER ? (
        /* Field Officer Experience */
        <FieldOfficerDashboard />
      ) : (
        /* Command Center & Demo Mode Experience */
        <div className={`app-body ${drawerOpen ? 'drawer-open' : ''}`} id="app-body">
          {/* Left icon sidebar */}
          <IconSidebar activeView={activeView} onNavigate={handleNavigate} />

          {/* ============ MAIN CONTENT AREA ============ */}
          <div className="app-main-area" id="app-main-area">
            {/* Situation Summary Bar — command center & demo only */}
            {(activeView === 'dashboard') && (
              <SituationSummary />
            )}

            {/* Inner view area (below situation bar) */}
            <div className="app-views-area">
          {activeView === 'map' && (
            <MapFocusView />
          )}

          {activeView === 'impact' && (
            <ImpactAnalysisView />
          )}

          {activeView === 'queue' && (
            <PriorityQueueView />
          )}

          {(activeView === 'disruptions' || activeView === 'simulations') && (
            <DisruptionsView />
          )}

          {activeView === 'workflow' && (
            <OperationalIntelligenceWorkflow />
          )}

          {activeView === 'dashboard' && (
            <>
              {/* Center Map */}
              <main className="map-region" id="map-region">
                <div className="map-host">
                  <MapView />
                </div>

                {/* Floating Map Stats Overlay */}
                <div className="map-overlay-stats" id="map-overlay-stats">
                  <div className="map-stat">
                    <span className="material-symbols-outlined map-stat-icon">location_city</span>
                    <span className="map-stat-value">{summary?.total_nodes ?? nodes.length}</span>
                    <span className="map-stat-label">Nodes</span>
                  </div>
                  <div className="map-stat">
                    <span className="material-symbols-outlined map-stat-icon">alt_route</span>
                    <span className="map-stat-value">{summary?.total_edges ?? edges.length}</span>
                    <span className="map-stat-label">Routes</span>
                  </div>
                </div>

                {/* Open Disruption Controls button when drawer is closed */}
                {!drawerOpen && hasPermission(PERMISSIONS.TRIGGER_DISRUPTION) && (
                  <button
                    className="drawer-toggle"
                    onClick={() => setDrawerOpen(true)}
                    id="btn-open-drawer"
                  >
                    <span className="material-symbols-outlined">flash_on</span>
                    Controls
                  </button>
                )}

                {/* Selected Node / Edge details */}
                {selectedNode && (
                  <div className="detail-overlay" id="node-detail-overlay">
                    <NodeDetailPanel node={selectedNode} />
                  </div>
                )}
                {selectedEdge && !selectedNode && (
                  <div className="detail-overlay" id="edge-detail-overlay">
                    <EdgeDetailPanel edge={selectedEdge} />
                  </div>
                )}
              </main>

              {/* Right Panel */}
              <RightIntelPanel />
            </>
          )}
            </div>{/* end app-views-area */}
          </div>{/* end app-main-area */}

          {/* Slide-out Controls Drawer */}
          {drawerOpen && (
            <div className="controls-drawer" id="controls-drawer">
              <div className="drawer-header">
                <h3 className="drawer-title">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px', marginRight: '0.4rem', verticalAlign: 'middle', color: 'var(--amber)' }}>flash_on</span>
                  Disruption Control
                </h3>
                <button
                  className="drawer-close"
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close controls"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="drawer-content">
                <AccessibilityDashboard />
                <DisruptionControl />
                <SimulationResult />
                <ImpactAnalysisPanel />
                <ScenarioPreview />
                <ActionPlanPanel />
                <ScenarioComparison />
                <AssistantPanel />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
