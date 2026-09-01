// ImpactAnalysisView — Full-page Cascading Impact Analysis Center (Phase 17).
// Consumes real backend impact results from POST /impact/{edge_id} & POST /scenario.
// Answers: "What infrastructure, locations, services, and people are affected by this disruption?"
// Includes: Live vs Sim mode safety, summary cards, cascading chain, accessibility before/after,
// essential service loss, embedded interactive map, and priority handoff.

import { useState, useEffect, useMemo } from 'react'
import { useTwinStore } from '../state/useTwinStore'
import MapView from '../map/MapView'

const EDGE_META = { ROAD: 'Road Corridor', BRIDGE: 'Bridge Crossing' }

export default function ImpactAnalysisView() {
  const nodes = useTwinStore((s) => s.nodes)
  const edges = useTwinStore((s) => s.edges)
  const selectedEdgeId = useTwinStore((s) => s.selectedEdgeId)
  const selectEdge = useTwinStore((s) => s.selectEdge)
  const impactResult = useTwinStore((s) => s.impactResult)
  const simResult = useTwinStore((s) => s.simResult)
  const scenarioResult = useTwinStore((s) => s.scenarioResult)
  const impactBusy = useTwinStore((s) => s.impactBusy)
  const impactError = useTwinStore((s) => s.impactError)
  const runImpactAnalysis = useTwinStore((s) => s.runImpactAnalysis)
  const clearImpactError = useTwinStore((s) => s.clearImpactError)
  const focusNode = useTwinStore((s) => s.focusNode)
  const selectPriorityTarget = useTwinStore((s) => s.selectPriorityTarget)
  const priorities = useTwinStore((s) => s.priorities)

  // Local edge selection for instant analysis
  const [activeEdgeId, setActiveEdgeId] = useState(
    selectedEdgeId || impactResult?.scenario?.edge_id || (edges.find(e => e.status === 'CLOSED')?.id || 'E023')
  )
  const [activeTab, setActiveTab] = useState('villages') // 'villages' | 'isolated' | 'services'

  // Auto-run impact analysis if an edge is selected but no result is present
  useEffect(() => {
    if (activeEdgeId && (!impactResult || impactResult.scenario?.edge_id !== activeEdgeId) && !impactBusy) {
      runImpactAnalysis(activeEdgeId).catch(() => {})
    }
  }, [activeEdgeId])

  // Sync with global store selection
  useEffect(() => {
    if (selectedEdgeId && selectedEdgeId !== activeEdgeId) {
      setActiveEdgeId(selectedEdgeId)
    }
  }, [selectedEdgeId])

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const getEdgeTitle = (edge) => {
    const a = byId.get(edge.connects[0])
    const b = byId.get(edge.connects[1])
    return `${a?.name || edge.connects[0]} ↔ ${b?.name || edge.connects[1]}`
  }

  const handleSelectEdge = (id) => {
    setActiveEdgeId(id)
    selectEdge(id)
    if (clearImpactError) clearImpactError()
    runImpactAnalysis(id).catch(() => {})
  }

  const handleRetry = () => {
    if (activeEdgeId) {
      if (clearImpactError) clearImpactError()
      runImpactAnalysis(activeEdgeId).catch(() => {})
    }
  }

  // Priority handoff action (Step 9)
  const handlePriorityHandoff = () => {
    const topPriority = priorities && priorities.length > 0 ? priorities[0] : null
    if (topPriority) {
      selectPriorityTarget(topPriority)
    }
    window.history.pushState(null, '', '/priority-queue')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const result = impactResult || scenarioResult?.hypothetical_impact
  const selectedEdge = edges.find((e) => e.id === activeEdgeId)
  const isSimulationMode = !!scenarioResult?.hypothetical_impact || (!!simResult && !impactResult)

  const levelClass = (result?.impact_level || 'moderate').toLowerCase()

  return (
    <div className="impact-view-container" id="impact-view">
      {/* ============================================================
          AREA A: IMPACT ANALYSIS HEADER & CONTEXT
          ============================================================ */}
      <header className="impact-header-strip">
        <div className="impact-header-left">
          <div className="impact-view-title-group">
            <span className="material-symbols-outlined impact-main-icon">query_stats</span>
            <div>
              <h1 className="impact-page-heading">Cascading Impact &amp; Reachability Analysis</h1>
              <span className="impact-page-sub">
                Assessing cascading reachability loss across regional infrastructure and essential services
              </span>
            </div>
          </div>
        </div>

        {/* Live vs Simulation State Badge */}
        <div className="impact-header-right">
          {isSimulationMode ? (
            <div className="impact-context-badge mode-simulation" title="Impact evaluated over hypothetical scenario">
              <span className="mode-dot dot-sim"></span>
              <span>SIMULATION ANALYSIS (NON-LIVE)</span>
            </div>
          ) : (
            <div className="impact-context-badge mode-live" title="Impact evaluated over live regional state">
              <span className="mode-dot dot-live"></span>
              <span>LIVE REGIONAL ANALYSIS</span>
            </div>
          )}

          {/* Quick Corridor Selector */}
          <div className="impact-corridor-select-wrap">
            <span className="material-symbols-outlined select-icon">alt_route</span>
            <select
              className="impact-corridor-select"
              value={activeEdgeId}
              onChange={(e) => handleSelectEdge(e.target.value)}
            >
              <option value="">Select corridor to evaluate…</option>
              {edges.map((edge) => (
                <option key={edge.id} value={edge.id}>
                  {edge.id} — {getEdgeTitle(edge)} ({edge.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Error alert with retry */}
      {impactError && (
        <div className="impact-error-banner">
          <span className="material-symbols-outlined">error</span>
          <span>Impact analysis could not be completed for {activeEdgeId || 'this corridor'}. {impactError}</span>
          <button className="btn-retry-impact" onClick={handleRetry}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>refresh</span>
            Retry Analysis
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {impactBusy && !result && (
        <div className="impact-loading-skeleton">
          <span className="material-symbols-outlined spin-loading">hourglass_top</span>
          <h3>Tracing cascading infrastructure impact across regional digital twin…</h3>
          <p>Evaluating shortest path reachability diffs, isolated populations, and service catchment loss.</p>
        </div>
      )}

      {/* ============================================================
          AREA B: IMPACT SUMMARY CARDS (Top Metrics)
          ============================================================ */}
      {result && (
        <div className="impact-kpi-strip">
          <div className={`impact-kpi-card kpi-score level-card-${levelClass}`}>
            <div className="ikpi-top">
              <span className="material-symbols-outlined ikpi-icon">speed</span>
              <span className="ikpi-label">IMPACT SCORE</span>
            </div>
            <div className="ikpi-val-group">
              <span className="ikpi-value">{result.impact_score != null ? result.impact_score.toFixed(1) : '—'}</span>
              <span className="ikpi-max">/ 100</span>
            </div>
            <span className={`ikpi-badge level-${levelClass}`}>
              {result.impact_level || 'MODERATE'} SEVERITY
            </span>
          </div>

          <div className="impact-kpi-card">
            <div className="ikpi-top">
              <span className="material-symbols-outlined ikpi-icon">cottage</span>
              <span className="ikpi-label">AFFECTED COMMUNITIES</span>
            </div>
            <div className="ikpi-value">{result.regional_metrics?.affected_villages_count ?? result.affected_villages?.length ?? 0}</div>
            <span className="ikpi-sub">Villages with reduced access</span>
          </div>

          <div className="impact-kpi-card">
            <div className="ikpi-top">
              <span className="material-symbols-outlined ikpi-icon">groups</span>
              <span className="ikpi-label">POPULATION AT RISK</span>
            </div>
            <div className="ikpi-value">
              {result.regional_metrics?.affected_population != null
                ? Number(result.regional_metrics.affected_population).toLocaleString()
                : '—'}
            </div>
            <span className="ikpi-sub">Residents in degraded catchment</span>
          </div>

          <div className="impact-kpi-card kpi-danger">
            <div className="ikpi-top">
              <span className="material-symbols-outlined ikpi-icon">block</span>
              <span className="ikpi-label">NEWLY ISOLATED</span>
            </div>
            <div className="ikpi-value" style={{ color: 'var(--red-600)' }}>
              {result.regional_metrics?.newly_isolated_count ?? result.newly_isolated_nodes?.length ?? 0}
            </div>
            <span className="ikpi-sub">Zero ground reachability</span>
          </div>

          <div className="impact-kpi-card">
            <div className="ikpi-top">
              <span className="material-symbols-outlined ikpi-icon">local_hospital</span>
              <span className="ikpi-label">SERVICE COVERAGE LOSS</span>
            </div>
            <div className="ikpi-value">
              -{(result.regional_metrics?.hospital_coverage_loss ?? 0) + (result.regional_metrics?.warehouse_coverage_loss ?? 0)}
            </div>
            <span className="ikpi-sub">Hospital &amp; warehouse links</span>
          </div>
        </div>
      )}

      {/* ============================================================
          MAIN WORKSPACE: Split Layout (Left: Impact Panels, Right: Map)
          ============================================================ */}
      <div className="impact-workspace">
        {/* Left Side: Detailed Impact Engine Findings */}
        <div className="impact-details-col">
          {result ? (
            <div className="impact-content-flow">
              {/* ── SECTION 1: CASCADING IMPACT CHAIN (Step 5) ── */}
              <div className="impact-panel-card cascade-chain-card">
                <div className="ip-card-header">
                  <div className="ip-title-group">
                    <span className="material-symbols-outlined ip-header-icon" style={{ color: 'var(--amber-500)' }}>account_tree</span>
                    <h3 className="ip-card-title">Cascading Consequence Chain</h3>
                  </div>
                  <span className="corridor-tag">{result.scenario?.edge_id || activeEdgeId} (CLOSED)</span>
                </div>

                {/* 5-Step Visual Cascade Progression */}
                <div className="cascade-steps-strip">
                  <div className="c-step">
                    <span className="c-step-num">01</span>
                    <span className="c-step-name">Disruption</span>
                    <span className="c-step-desc">{result.scenario?.edge_id || activeEdgeId} Severed</span>
                  </div>
                  <span className="c-arrow">→</span>
                  <div className="c-step">
                    <span className="c-step-num">02</span>
                    <span className="c-step-name">Infrastructure</span>
                    <span className="c-step-desc">{result.regional_metrics?.dependency_level || 'HIGH'} Dependency</span>
                  </div>
                  <span className="c-arrow">→</span>
                  <div className="c-step">
                    <span className="c-step-num">03</span>
                    <span className="c-step-name">Accessibility</span>
                    <span className="c-step-desc">-{result.impact_components?.accessibility_impact?.toFixed(0) ?? 65}% Drop</span>
                  </div>
                  <span className="c-arrow">→</span>
                  <div className="c-step">
                    <span className="c-step-num">04</span>
                    <span className="c-step-name">Services</span>
                    <span className="c-step-desc">{(result.affected_hospitals?.length || 0) + (result.affected_warehouses?.length || 0)} Facilities</span>
                  </div>
                </div>

                {/* 4 Impact Components Grid */}
                <div className="impact-components-mini-grid">
                  <div className="icomp-box">
                    <span className="icomp-val">{result.impact_components?.population_impact?.toFixed(1) ?? '—'}</span>
                    <span className="icomp-lbl">Population Impact</span>
                  </div>
                  <div className="icomp-box">
                    <span className="icomp-val">{result.impact_components?.accessibility_impact?.toFixed(1) ?? '—'}</span>
                    <span className="icomp-lbl">Accessibility Loss</span>
                  </div>
                  <div className="icomp-box">
                    <span className="icomp-val">{result.impact_components?.isolation_impact?.toFixed(1) ?? '—'}</span>
                    <span className="icomp-lbl">Isolation Severity</span>
                  </div>
                  <div className="icomp-box">
                    <span className="icomp-val">{result.impact_components?.service_impact?.toFixed(1) ?? '—'}</span>
                    <span className="icomp-lbl">Service Coverage Drop</span>
                  </div>
                </div>

                {/* Narrative Summary from Real Engine */}
                {result.impact_summary && (
                  <div className="operational-significance-box">
                    <div className="sig-header">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--navy-500)' }}>insights</span>
                      <strong>OPERATIONAL SIGNIFICANCE &amp; WHY THIS MATTERS</strong>
                    </div>
                    <p className="sig-text">{result.impact_summary}</p>
                  </div>
                )}
              </div>

              {/* ── SECTION 2: TABS FOR DEEP-DIVE DETAILS (Step 6, 7, 8) ── */}
              <div className="impact-panel-card tabs-card">
                <div className="impact-tabs-header">
                  <button
                    className={`itab-btn ${activeTab === 'villages' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('villages')}
                  >
                    <span className="material-symbols-outlined">cottage</span>
                    Affected Villages ({result.affected_villages?.length ?? 0})
                  </button>
                  <button
                    className={`itab-btn ${activeTab === 'isolated' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('isolated')}
                  >
                    <span className="material-symbols-outlined">block</span>
                    Newly Isolated ({result.newly_isolated_nodes?.length ?? 0})
                  </button>
                  <button
                    className={`itab-btn ${activeTab === 'services' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('services')}
                  >
                    <span className="material-symbols-outlined">local_hospital</span>
                    Service Catchment Loss
                  </button>
                </div>

                {/* TAB 1: Affected Villages List (Step 6) */}
                {activeTab === 'villages' && (
                  <div className="itab-content">
                    {(!result.affected_villages || result.affected_villages.length === 0) ? (
                      <div className="empty-tab-state">
                        <span className="material-symbols-outlined">verified</span>
                        <span>No village accessibility drops detected for this corridor.</span>
                      </div>
                    ) : (
                      <div className="affected-villages-list">
                        {result.affected_villages.map((v) => (
                          <div
                            key={v.village_id}
                            className={`village-impact-card level-${(v.impact_level || 'moderate').toLowerCase()}`}
                            onClick={() => focusNode(v.village_id)}
                          >
                            <div className="vic-top">
                              <div className="vic-title-wrap">
                                <span className="vic-name">{v.name}</span>
                                <span className="vic-id">{v.village_id}</span>
                              </div>
                              <span className={`vic-badge level-${(v.impact_level || 'moderate').toLowerCase()}`}>
                                {v.is_newly_isolated ? 'ISOLATED (0%)' : `${v.impact_level} IMPACT`}
                              </span>
                            </div>

                            <div className="vic-metrics-row">
                              <span>Population: <strong>{v.population?.toLocaleString() ?? '—'}</strong></span>
                              <span>Access Before: <strong>{v.accessibility_before?.toFixed(1) ?? '—'}%</strong></span>
                              <span>Access After: <strong>{v.accessibility_after?.toFixed(1) ?? '0.0'}%</strong></span>
                              <span className="vic-drop">Drop: <strong>-{v.accessibility_drop?.toFixed(1) ?? '—'}%</strong></span>
                            </div>

                            {v.impact_reasons?.length > 0 && (
                              <div className="vic-reasons">
                                {v.impact_reasons.map((r, idx) => (
                                  <span key={idx} className="vic-reason-tag">• {r}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: Newly Isolated Communities */}
                {activeTab === 'isolated' && (
                  <div className="itab-content">
                    {(!result.newly_isolated_nodes || result.newly_isolated_nodes.length === 0) ? (
                      <div className="empty-tab-state">
                        <span className="material-symbols-outlined">check_circle</span>
                        <span>No communities are completely isolated by this corridor failure.</span>
                      </div>
                    ) : (
                      <div className="isolated-nodes-list">
                        {result.newly_isolated_nodes.map((n) => (
                          <div
                            key={n.node_id}
                            className="isolated-node-card"
                            onClick={() => focusNode(n.node_id)}
                          >
                            <div className="inc-header">
                              <span className="material-symbols-outlined inc-icon">warning</span>
                              <span className="inc-name">{n.name}</span>
                              <span className="inc-id">{n.node_id}</span>
                            </div>
                            <p className="inc-reason">{n.isolation_reason || 'All reachable ground routes severed.'}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Essential Service Catchment Impact (Step 7) */}
                {activeTab === 'services' && (
                  <div className="itab-content">
                    <div className="service-impact-split">
                      {/* Hospitals Impact */}
                      <div className="service-impact-block">
                        <div className="sib-header">
                          <span className="material-symbols-outlined" style={{ color: 'var(--red-600)' }}>local_hospital</span>
                          <h4>HOSPITAL SERVICE COVERAGE</h4>
                        </div>
                        {(!result.affected_hospitals || result.affected_hospitals.length === 0) ? (
                          <div className="sib-empty">No hospital coverage loss reported.</div>
                        ) : (
                          <div className="sib-list">
                            {result.affected_hospitals.map((h) => (
                              <div key={h.service_id} className="sib-item" onClick={() => focusNode(h.service_id)}>
                                <span className="sib-name">{h.name} ({h.service_id})</span>
                                <span className="sib-loss">
                                  Served: <strong>{h.villages_served_before}</strong> → <strong>{h.villages_served_after}</strong> (-{h.coverage_loss} villages)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Warehouses Impact */}
                      <div className="service-impact-block">
                        <div className="sib-header">
                          <span className="material-symbols-outlined" style={{ color: 'var(--navy-500)' }}>warehouse</span>
                          <h4>WAREHOUSE DISTRIBUTION REACH</h4>
                        </div>
                        {(!result.affected_warehouses || result.affected_warehouses.length === 0) ? (
                          <div className="sib-empty">No warehouse distribution loss reported.</div>
                        ) : (
                          <div className="sib-list">
                            {result.affected_warehouses.map((w) => (
                              <div key={w.service_id} className="sib-item" onClick={() => focusNode(w.service_id)}>
                                <span className="sib-name">{w.name} ({w.service_id})</span>
                                <span className="sib-loss">
                                  Reach: <strong>{w.villages_served_before}</strong> → <strong>{w.villages_served_after}</strong> (-{w.coverage_loss} villages)
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECTION 3: PRIORITIZATION & ACTION PLAN HANDOFF (Step 9) ── */}
              <div className="impact-handoff-banner">
                <div className="handoff-info">
                  <span className="material-symbols-outlined handoff-icon">priority_high</span>
                  <div>
                    <strong>Ready to calculate emergency resupply priority?</strong>
                    <p>Transfer this impact assessment into the Multi-Criteria Priority Engine and AI Action Plan.</p>
                  </div>
                </div>
                <button className="btn-handoff-priority" onClick={handlePriorityHandoff}>
                  <span>View Priority Assessment &amp; Action Plan</span>
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_forward</span>
                </button>
              </div>
            </div>
          ) : (
            /* Empty State (Step 2) */
            <div className="impact-empty-guide">
              <span className="material-symbols-outlined empty-guide-icon">alt_route</span>
              <h3>No Transport Corridor Selected</h3>
              <p>Select a transport corridor or bridge above to run real-time cascading impact analysis across communities and healthcare networks.</p>
              <button className="btn-select-corridor-guide" onClick={() => handleSelectEdge('E023')}>
                <span className="material-symbols-outlined">bolt</span>
                Analyze Primary Bridge Corridor (E023)
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Embedded Digital Twin Map (Step 4) */}
        <div className="impact-map-col">
          <div className="impact-map-card">
            <div className="impact-map-header">
              <div className="imap-title">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--navy-500)' }}>hub</span>
                <span>Impact-Focused Regional Digital Twin</span>
              </div>
              <div className="imap-legend-strip">
                <span className="imap-pill pill-isolated">● Isolated (0%)</span>
                <span className="imap-pill pill-reduced">● Reduced Access</span>
                <span className="imap-pill pill-closed">● Disrupted Link</span>
              </div>
            </div>

            <div className="imap-host-wrap">
              <MapView />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
