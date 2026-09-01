// DisruptionsView — Dedicated Disruption Control & Simulation Center (Phase 16).
// Area A: Operational Summary Cards (Active, Affected, At-Risk, Closed).
// Area B: Active Disruption Feed & Event History with spatial focus.
// Area C: Simulation & What-If Engine on cloned state (Live vs Simulation safety).
// Integrated with real backend endpoints: /disruption, /simulate, /scenario, /events, /reset.

import { useState, useEffect, useMemo } from 'react'
import { useTwinStore } from '../state/useTwinStore'
import MapView from '../map/MapView'

const EDGE_META = { ROAD: 'Road Corridor', BRIDGE: 'Bridge Crossing' }

export default function DisruptionsView() {
  const nodes = useTwinStore((s) => s.nodes)
  const edges = useTwinStore((s) => s.edges)
  const events = useTwinStore((s) => s.events)
  const loadEvents = useTwinStore((s) => s.loadEvents)
  const selectedEdgeId = useTwinStore((s) => s.selectedEdgeId)
  const selectEdge = useTwinStore((s) => s.selectEdge)
  const applyLiveDisruption = useTwinStore((s) => s.applyLiveDisruption)
  const runSimulationNow = useTwinStore((s) => s.runSimulationNow)
  const runScenarioNow = useTwinStore((s) => s.runScenarioNow)
  const compareScenariosNow = useTwinStore((s) => s.compareScenariosNow)
  const clearSimulationState = useTwinStore((s) => s.clearSimulationState)
  const resetDemo = useTwinStore((s) => s.resetDemo)

  const disruptionBusy = useTwinStore((s) => s.disruptionBusy)
  const disruptionError = useTwinStore((s) => s.disruptionError)
  const scenarioBusy = useTwinStore((s) => s.scenarioBusy)
  const scenarioError = useTwinStore((s) => s.scenarioError)
  const simResult = useTwinStore((s) => s.simResult)
  const scenarioResult = useTwinStore((s) => s.scenarioResult)

  const [edgeId, setEdgeId] = useState(selectedEdgeId || '')
  const [disruptionType, setDisruptionType] = useState('closure')
  const [riskDelta, setRiskDelta] = useState(30)
  const [activeTab, setActiveTab] = useState('simulate') // 'simulate' | 'active_list' | 'history'
  const [statusMessage, setStatusMessage] = useState(null)

  // Load backend session events on mount
  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // Sync edge selection from map or list
  useEffect(() => {
    if (selectedEdgeId && selectedEdgeId !== edgeId) {
      setEdgeId(selectedEdgeId)
    }
  }, [selectedEdgeId])

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  // Operational metrics from live backend twin
  const closedEdges = useMemo(() => edges.filter((e) => e.status === 'CLOSED'), [edges])
  const atRiskEdges = useMemo(() => edges.filter((e) => e.status === 'AT_RISK'), [edges])
  const openEdges = useMemo(() => edges.filter((e) => e.status === 'OPEN'), [edges])
  const totalDisrupted = closedEdges.length + atRiskEdges.length

  const isSimActive = simResult !== null || scenarioResult !== null
  const busy = disruptionBusy || scenarioBusy

  const selectedEdge = edges.find((e) => e.id === edgeId)

  const getEdgeTitle = (edge) => {
    const a = byId.get(edge.connects[0])
    const b = byId.get(edge.connects[1])
    return `${a?.name || edge.connects[0]} ↔ ${b?.name || edge.connects[1]}`
  }

  const payload = () => ({
    edge_id: edgeId,
    type: disruptionType,
    risk_delta: disruptionType === 'risk_increase' ? Number(riskDelta) : 0,
  })

  // ⚡ Run Hypothetical Simulation (Cloned State, Non-Live)
  const handleSimulate = async () => {
    if (!edgeId) return
    setStatusMessage(null)
    try {
      const res = await runSimulationNow(payload())
      setStatusMessage({
        kind: 'sim',
        text: `Hypothetical simulation created for ${res.simulated_edge?.id || edgeId}. Live state untouched.`,
      })
    } catch {
      // error handled in store
    }
  }

  // 🔬 Run Complete Scenario (Simulation + Impact + Recommendations on Cloned State)
  const handleScenario = async () => {
    if (!edgeId) return
    setStatusMessage(null)
    try {
      const res = await runScenarioNow(payload())
      setStatusMessage({
        kind: 'sim',
        text: `Full scenario analyzed for ${edgeId}. Cascading impact & recommendations calculated.`,
      })
    } catch {
      // error handled in store
    }
  }

  // 🚨 Apply to Live Regional State
  const handleApplyLive = async () => {
    if (!edgeId) return
    if (!window.confirm(`Are you sure you want to apply this disruption to the LIVE Regional Digital Twin?`)) return
    setStatusMessage(null)
    try {
      const res = await applyLiveDisruption(payload())
      setStatusMessage({
        kind: 'live',
        text: `Live disruption applied to ${res.updated_edge?.id}. State version bumped to v${res.regional_state_version}.`,
      })
      loadEvents()
    } catch {
      // error handled in store
    }
  }

  // Reset Simulation / Return to Live View
  const handleResetSimulation = () => {
    clearSimulationState()
    setStatusMessage(null)
  }

  // Reset Live Regional State to Baseline Fixture
  const handleResetBaseline = async () => {
    if (!window.confirm('Reset the LIVE Regional Digital Twin to its original baseline fixture?')) return
    try {
      await resetDemo()
      clearSimulationState()
      setStatusMessage({
        kind: 'live',
        text: 'Regional Digital Twin restored to original baseline fixture.',
      })
      loadEvents()
    } catch {}
  }

  // Simulated Impact Data (from scenarioResult or simResult)
  const impactData = scenarioResult?.hypothetical_impact || simResult?.hypothetical_impact
  const simulatedEdge = scenarioResult?.scenario?.simulated_edge || simResult?.simulated_edge
  const hypotheticalRecs = scenarioResult?.hypothetical_recommendations

  return (
    <div className="disruptions-view-container" id="disruptions-view">
      {/* ============================================================
          AREA A: OPERATIONAL DISRUPTION SUMMARY STRIP
          ============================================================ */}
      <header className="disruption-header-strip">
        <div className="disruption-header-left">
          <div className="disruption-view-title-group">
            <span className="material-symbols-outlined disruption-main-icon">bolt</span>
            <div>
              <h1 className="disruption-page-heading">Disruption Control &amp; Simulation</h1>
              <span className="disruption-page-sub">
                Real-time transport corridor status and non-live what-if impact modeling
              </span>
            </div>
          </div>
        </div>

        {/* Live vs Simulation State Safety Banner */}
        <div className="disruption-mode-indicator">
          {isSimActive ? (
            <div className="mode-badge mode-simulation" title="Currently evaluating non-live scenario">
              <span className="mode-dot dot-sim"></span>
              <span>SIMULATION ACTIVE (NON-LIVE)</span>
              <button className="btn-return-live" onClick={handleResetSimulation}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_back</span>
                Return to Live View
              </button>
            </div>
          ) : (
            <div className="mode-badge mode-live" title="Live operational digital twin monitoring">
              <span className="mode-dot dot-live"></span>
              <span>LIVE OPERATIONAL STATE</span>
            </div>
          )}
        </div>
      </header>

      {/* Summary KPI Cards */}
      <div className="disruption-kpi-grid">
        <div className="disruption-kpi-card kpi-total">
          <div className="dkpi-header">
            <span className="material-symbols-outlined dkpi-icon">warning</span>
            <span className="dkpi-label">ACTIVE DISRUPTIONS</span>
          </div>
          <div className="dkpi-value">{totalDisrupted}</div>
          <span className="dkpi-sub">{totalDisrupted > 0 ? 'Corridors require intervention' : 'All corridors nominal'}</span>
        </div>

        <div className="disruption-kpi-card kpi-affected">
          <div className="dkpi-header">
            <span className="material-symbols-outlined dkpi-icon">alt_route</span>
            <span className="dkpi-label">AFFECTED ROUTES</span>
          </div>
          <div className="dkpi-value">{totalDisrupted} / {edges.length}</div>
          <span className="dkpi-sub">{openEdges.length} routes fully accessible</span>
        </div>

        <div className="disruption-kpi-card kpi-warn">
          <div className="dkpi-header">
            <span className="material-symbols-outlined dkpi-icon">speed</span>
            <span className="dkpi-label">AT-RISK CORRIDORS</span>
          </div>
          <div className="dkpi-value">{atRiskEdges.length}</div>
          <span className="dkpi-sub">Elevated transit risk</span>
        </div>

        <div className="disruption-kpi-card kpi-danger">
          <div className="dkpi-header">
            <span className="material-symbols-outlined dkpi-icon">block</span>
            <span className="dkpi-label">CLOSED CORRIDORS</span>
          </div>
          <div className="dkpi-value">{closedEdges.length}</div>
          <span className="dkpi-sub">Impassable / severed links</span>
        </div>
      </div>

      {/* ============================================================
          MAIN WORKSPACE: Split Layout (Panels Left, Map Right)
          ============================================================ */}
      <div className="disruption-workspace">
        {/* Left Side: Control & Results Column */}
        <div className="disruption-control-col">
          {/* Navigation Tabs */}
          <div className="disruption-tabs-bar">
            <button
              className={`d-tab-btn ${activeTab === 'simulate' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('simulate')}
            >
              <span className="material-symbols-outlined">science</span>
              Simulate Disruption
            </button>
            <button
              className={`d-tab-btn ${activeTab === 'active_list' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('active_list')}
            >
              <span className="material-symbols-outlined">format_list_bulleted</span>
              Active Disruptions ({totalDisrupted})
            </button>
            <button
              className={`d-tab-btn ${activeTab === 'history' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <span className="material-symbols-outlined">history</span>
              Event History ({events.length})
            </button>
          </div>

          {/* Messages & Errors */}
          {disruptionError && (
            <div className="disruption-alert alert-error">
              <span className="material-symbols-outlined">error</span>
              <span>{disruptionError}</span>
            </div>
          )}
          {scenarioError && (
            <div className="disruption-alert alert-error">
              <span className="material-symbols-outlined">error</span>
              <span>{scenarioError}</span>
            </div>
          )}
          {statusMessage && (
            <div className={`disruption-alert alert-${statusMessage.kind}`}>
              <span className="material-symbols-outlined">check_circle</span>
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* ── TAB 1: SIMULATE DISRUPTION (AREA C) ── */}
          {activeTab === 'simulate' && (
            <div className="sim-panel-wrap">
              <div className="sim-config-card">
                <div className="sim-card-heading">
                  <span className="material-symbols-outlined sim-heading-icon">bolt</span>
                  <h3>Configure What-If Disruption Scenario</h3>
                </div>
                <p className="sim-card-desc">
                  Simulations execute over an in-memory cloned graph snapshot. The live Regional Twin is protected from mutations.
                </p>

                {/* Target Edge Selector */}
                <div className="form-group">
                  <label className="form-label">SELECT TRANSPORT CORRIDOR</label>
                  <select
                    className="form-select"
                    value={edgeId}
                    onChange={(e) => {
                      setEdgeId(e.target.value)
                      selectEdge(e.target.value)
                    }}
                  >
                    <option value="">Select a corridor to disrupt…</option>
                    {edges.map((edge) => (
                      <option key={edge.id} value={edge.id}>
                        {edge.id} — {getEdgeTitle(edge)} ({EDGE_META[edge.type] || edge.type} · {edge.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Edge Metadata Summary */}
                {selectedEdge && (
                  <div className="selected-edge-brief">
                    <div className="edge-brief-header">
                      <span className="edge-brief-id">{selectedEdge.id}</span>
                      <span className={`edge-brief-status status-${selectedEdge.status?.toLowerCase()}`}>
                        {selectedEdge.status}
                      </span>
                    </div>
                    <div className="edge-brief-title">{getEdgeTitle(selectedEdge)}</div>
                    <div className="edge-brief-stats">
                      <span>Distance: <strong>{selectedEdge.distance_km} km</strong></span>
                      <span>Transit: <strong>{selectedEdge.base_travel_time_min} min</strong></span>
                      <span>Risk: <strong>{selectedEdge.risk_score}/100</strong></span>
                    </div>
                  </div>
                )}

                {/* Disruption Mode */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="form-label">DISRUPTION TYPE</label>
                    <select
                      className="form-select"
                      value={disruptionType}
                      onChange={(e) => setDisruptionType(e.target.value)}
                    >
                      <option value="closure">Total Closure / Impassable (Sever Link)</option>
                      <option value="risk_increase">Risk Elevation (Landslide / Flood Warning)</option>
                    </select>
                  </div>

                  {disruptionType === 'risk_increase' && (
                    <div className="form-group flex-1">
                      <label className="form-label">RISK DELTA (+)</label>
                      <input
                        className="form-input"
                        type="number"
                        min="5"
                        max="100"
                        step="5"
                        value={riskDelta}
                        onChange={(e) => setRiskDelta(Number(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                {/* Action CTAs */}
                <div className="sim-actions-group">
                  <button
                    className="btn-sim-primary"
                    onClick={handleSimulate}
                    disabled={!edgeId || busy}
                  >
                    <span className="material-symbols-outlined">
                      {disruptionBusy ? 'hourglass_top' : 'bolt'}
                    </span>
                    {disruptionBusy ? 'Running Simulation…' : '⚡ Run Simulation (Non-Live)'}
                  </button>

                  <button
                    className="btn-sim-scenario"
                    onClick={handleScenario}
                    disabled={!edgeId || busy}
                    title="Runs simulation, cascading impact analysis, and auto-recommendation on hypothetical state"
                  >
                    <span className="material-symbols-outlined">
                      {scenarioBusy ? 'hourglass_top' : 'psychology'}
                    </span>
                    {scenarioBusy ? 'Analyzing Scenario…' : '🔬 Run Full Scenario + AI Dispatch'}
                  </button>
                </div>

                <div className="live-apply-footer">
                  <span className="live-footer-note">Ready to enact changes in real operations?</span>
                  <button
                    className="btn-apply-live"
                    onClick={handleApplyLive}
                    disabled={!edgeId || busy}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>shield</span>
                    Apply Disruption to LIVE State
                  </button>
                </div>
              </div>

              {/* ── SIMULATED IMPACT RESULTS (AREA C / STEP 6) ── */}
              {isSimActive && (
                <div className="simulated-impact-card">
                  <div className="impact-card-top">
                    <div className="impact-badge-group">
                      <span className="sim-mode-tag">HYPOTHETICAL RESULT</span>
                      {impactData?.impact_level && (
                        <span className={`impact-level-tag level-${impactData.impact_level.toLowerCase()}`}>
                          {impactData.impact_level} IMPACT
                        </span>
                      )}
                    </div>
                    <button className="btn-close-sim" onClick={handleResetSimulation} title="Dismiss simulation">
                      ✕
                    </button>
                  </div>

                  <div className="sim-impact-header">
                    <h4>Cascading Impact Assessment</h4>
                    <span className="sim-impact-sub">
                      Evaluated on hypothetical {simulatedEdge?.type || 'CORRIDOR'} {simulatedEdge?.id} ({simulatedEdge?.status || 'CLOSED'})
                    </span>
                  </div>

                  {/* Key Metrics */}
                  <div className="sim-impact-metrics">
                    <div className="simp-stat">
                      <span className="simp-val">{impactData?.impact_score ?? simResult?.simulated_edge?.risk_score ?? '—'}</span>
                      <span className="simp-lbl">Impact Score / 100</span>
                    </div>
                    <div className="simp-stat">
                      <span className="simp-val">{impactData?.regional_metrics?.newly_isolated_count ?? 0}</span>
                      <span className="simp-lbl">Newly Isolated</span>
                    </div>
                    <div className="simp-stat">
                      <span className="simp-val">{impactData?.regional_metrics?.affected_villages_count ?? 0}</span>
                      <span className="simp-lbl">Affected Villages</span>
                    </div>
                    <div className="simp-stat">
                      <span className="simp-val">{impactData?.regional_metrics?.affected_population ? Number(impactData.regional_metrics.affected_population).toLocaleString() : '—'}</span>
                      <span className="simp-lbl">Pop. At Risk</span>
                    </div>
                  </div>

                  {/* Impact Summary */}
                  {impactData?.impact_summary && (
                    <div className="simp-summary-box">
                      <strong>Operational Summary:</strong>
                      <p>{impactData.impact_summary}</p>
                    </div>
                  )}

                  {/* Isolated Villages List */}
                  {impactData?.newly_isolated_nodes?.length > 0 && (
                    <div className="simp-isolated-section">
                      <span className="simp-section-title">ISOLATED COMMUNITIES</span>
                      <div className="simp-isolated-list">
                        {impactData.newly_isolated_nodes.map((n) => (
                          <div key={n.node_id} className="simp-isolated-item">
                            <span className="simp-iso-name">{n.name} ({n.node_id})</span>
                            <span className="simp-iso-reason">{n.isolation_reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Recommendation Box */}
                  {hypotheticalRecs?.success && hypotheticalRecs.plan && (
                    <div className="simp-recs-box">
                      <div className="simp-recs-header">
                        <span className="material-symbols-outlined" style={{ color: 'var(--green-600)' }}>task_alt</span>
                        <strong>Recommended AI Dispatch Plan:</strong>
                      </div>
                      <div className="simp-recs-content">
                        Dispatch <strong>{hypotheticalRecs.plan.selected_vehicle?.id}</strong> from{' '}
                        <strong>{hypotheticalRecs.plan.selected_warehouse?.name}</strong> to{' '}
                        <strong>{hypotheticalRecs.plan.request?.target_node}</strong> (Route length:{' '}
                        {hypotheticalRecs.plan.selected_route?.total_distance} km).
                      </div>
                    </div>
                  )}

                  <div className="simp-actions-footer">
                    <button className="btn-reset-sim-action" onClick={handleResetSimulation}>
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>restart_alt</span>
                      Clear Simulation &amp; Return to Live
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: ACTIVE DISRUPTIONS LIST (AREA B) ── */}
          {activeTab === 'active_list' && (
            <div className="active-disruptions-list">
              <div className="active-list-header">
                <h3>Live Disrupted Corridors</h3>
                <span className="active-list-count">{totalDisrupted} currently active</span>
              </div>

              {totalDisrupted === 0 ? (
                <div className="empty-disruptions-state">
                  <span className="material-symbols-outlined empty-icon">verified</span>
                  <h4>All Transport Corridors Nominal</h4>
                  <p>No active road closures or elevated risk disruptions detected on the live digital twin.</p>
                </div>
              ) : (
                <div className="disruption-cards-scroll">
                  {closedEdges.map((edge) => (
                    <div
                      key={edge.id}
                      className={`disruption-feed-card status-closed ${selectedEdgeId === edge.id ? 'is-selected' : ''}`}
                      onClick={() => {
                        selectEdge(edge.id)
                        setEdgeId(edge.id)
                      }}
                    >
                      <div className="df-card-top">
                        <span className="df-type-badge type-closed">CLOSED / SEVERED</span>
                        <span className="df-edge-id">{edge.id}</span>
                      </div>
                      <div className="df-corridor-title">{getEdgeTitle(edge)}</div>
                      <div className="df-corridor-meta">
                        <span>{EDGE_META[edge.type] || edge.type}</span> ·{' '}
                        <span>{edge.distance_km} km</span> ·{' '}
                        <span>Risk Score: {edge.risk_score}/100</span>
                      </div>
                    </div>
                  ))}

                  {atRiskEdges.map((edge) => (
                    <div
                      key={edge.id}
                      className={`disruption-feed-card status-at-risk ${selectedEdgeId === edge.id ? 'is-selected' : ''}`}
                      onClick={() => {
                        selectEdge(edge.id)
                        setEdgeId(edge.id)
                      }}
                    >
                      <div className="df-card-top">
                        <span className="df-type-badge type-warn">AT RISK</span>
                        <span className="df-edge-id">{edge.id}</span>
                      </div>
                      <div className="df-corridor-title">{getEdgeTitle(edge)}</div>
                      <div className="df-corridor-meta">
                        <span>{EDGE_META[edge.type] || edge.type}</span> ·{' '}
                        <span>{edge.distance_km} km</span> ·{' '}
                        <span>Elevated Risk: {edge.risk_score}/100</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reset baseline button */}
              <div className="baseline-reset-wrap">
                <button className="btn-reset-baseline" onClick={handleResetBaseline}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>restart_alt</span>
                  Reset Live Digital Twin to Original Baseline
                </button>
              </div>
            </div>
          )}

          {/* ── TAB 3: EVENT HISTORY (AREA B) ── */}
          {activeTab === 'history' && (
            <div className="event-history-panel">
              <div className="active-list-header">
                <h3>Recorded Disruption Events</h3>
                <span className="active-list-count">{events.length} session events</span>
              </div>

              {events.length === 0 ? (
                <div className="empty-disruptions-state">
                  <span className="material-symbols-outlined empty-icon">history</span>
                  <h4>No Disruption Events Recorded</h4>
                  <p>Events applied or simulated during this session will appear here in chronological order.</p>
                </div>
              ) : (
                <div className="events-timeline">
                  {events.map((ev, idx) => (
                    <div key={ev.id || idx} className="event-timeline-item">
                      <div className="event-item-bullet"></div>
                      <div className="event-item-card">
                        <div className="event-item-top">
                          <span className={`event-badge badge-${ev.type?.toLowerCase() || 'closure'}`}>
                            {ev.type}
                          </span>
                          <span className="event-target-id">{ev.target_id}</span>
                          <span className="event-time">{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : 'Recent'}</span>
                        </div>
                        <div className="event-item-desc">
                          Target: <strong>{ev.target_type} {ev.target_id}</strong> · Severity: <strong>{ev.severity || 'HIGH'}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Embedded Digital Twin Map (STEP 5) */}
        <div className="disruption-map-col">
          <div className="d-map-card">
            <div className="d-map-header">
              <div className="d-map-title">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--navy-500)' }}>hub</span>
                <span>Regional Transport Network · Disruption Focus</span>
              </div>
              <div className="d-map-legend-pills">
                <span className="d-pill pill-open">● Open</span>
                <span className="d-pill pill-warn">● At Risk</span>
                <span className="d-pill pill-danger">● Closed</span>
              </div>
            </div>

            <div className="d-map-canvas-wrap">
              <MapView />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
