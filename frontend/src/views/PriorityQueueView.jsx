// PriorityQueueView — Priority Assessment & Critical Supply Risk Center (Phase 18).
// Consumes real backend Priority Engine (GET /priority) and Supply Depletion Engine (GET /depletion).
// Answers:
// 1. Which affected location requires attention first?
// 2. Why is it the highest priority? (Explainability & contributing factor breakdown)
// 3. Which critical resources are at risk?
// 4. How urgent is intervention?
// 5. What factors contributed to the priority decision?

import { useEffect, useState, useMemo } from 'react'
import { useTwinStore } from '../state/useTwinStore'
import MapView from '../map/MapView'

function formatHoursRemaining(hours) {
  if (hours == null) return 'Depleted'
  if (hours <= 0) return 'DEPLETED'
  if (hours >= 24 * 7) return `${(hours / 24).toFixed(0)} days`
  if (hours >= 24) return `${(hours / 24).toFixed(1)} days`
  return `${Math.round(hours)} hours`
}

export default function PriorityQueueView() {
  const priorities = useTwinStore((s) => s.priorities)
  const prioritySummary = useTwinStore((s) => s.prioritySummary)
  const priorityBusy = useTwinStore((s) => s.priorityBusy)
  const priorityError = useTwinStore((s) => s.priorityError)
  const loadPriorities = useTwinStore((s) => s.loadPriorities)
  const supplyData = useTwinStore((s) => s.supplyData)
  const supplySummary = useTwinStore((s) => s.supplySummary)
  const supplyBusy = useTwinStore((s) => s.supplyBusy)
  const loadDepletion = useTwinStore((s) => s.loadDepletion)
  const selectedPriorityTarget = useTwinStore((s) => s.selectedPriorityTarget)
  const selectPriorityTarget = useTwinStore((s) => s.selectPriorityTarget)
  const focusNode = useTwinStore((s) => s.focusNode)
  const simResult = useTwinStore((s) => s.simResult)
  const scenarioResult = useTwinStore((s) => s.scenarioResult)

  const [activeTab, setActiveTab] = useState('ranking') // 'ranking' | 'supply'
  const [filterLevel, setFilterLevel] = useState('ALL')
  const [filterType, setFilterType] = useState('ALL')
  const [selectedRankIdx, setSelectedRankIdx] = useState(0)

  // Initial load
  useEffect(() => {
    loadPriorities().catch(() => {})
    loadDepletion().catch(() => {})
  }, [loadPriorities, loadDepletion])

  const isSimulationMode = simResult !== null || scenarioResult !== null

  // Filtered priorities
  const filteredPriorities = useMemo(() => {
    let list = [...priorities]
    if (filterLevel !== 'ALL') list = list.filter(p => p.priority_level === filterLevel)
    if (filterType !== 'ALL') list = list.filter(p => (p.facility?.type || p.facility_type) === filterType)
    return list
  }, [priorities, filterLevel, filterType])

  // Highest priority item (#1)
  const highestPriority = priorities.length > 0 ? priorities[0] : null
  const selectedItem = filteredPriorities[selectedRankIdx] || highestPriority

  // Handoff to Action Plan (Step 11)
  const handleActionHandoff = (item) => {
    const target = item || selectedItem || highestPriority
    if (target) {
      selectPriorityTarget(target)
    }
    window.history.pushState(null, '', '/dashboard')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handleSelectItem = (item, idx) => {
    setSelectedRankIdx(idx)
    selectPriorityTarget(item)
    const facId = item.facility?.id || item.facility_id
    if (facId) {
      focusNode(facId)
    }
  }

  // Facility types in the data
  const facilityTypes = useMemo(() => {
    const types = new Set()
    priorities.forEach(p => {
      const t = p.facility?.type || p.facility_type
      if (t) types.add(t)
    })
    return Array.from(types)
  }, [priorities])
  return (
    <div className="priority-view-container" id="priority-view">
      {/* ============================================================
          AREA A: PRIORITY ASSESSMENT HEADER & CONTEXT
          ============================================================ */}
      <header className="priority-header-strip">
        <div className="priority-header-left">
          <div className="priority-view-title-group">
            <span className="material-symbols-outlined priority-main-icon">priority_high</span>
            <div>
              <h1 className="priority-page-heading">Operational Priority Assessment &amp; Supply Risk</h1>
              <span className="priority-page-sub">
                Identify locations requiring the most urgent operational response and essential resupply
              </span>
            </div>
          </div>
        </div>

        {/* Live vs Simulation State Badge */}
        <div className="priority-header-right">
          {isSimulationMode ? (
            <div className="priority-context-badge mode-simulation" title="Priorities evaluated on hypothetical scenario">
              <span className="mode-dot dot-sim"></span>
              <span>SIMULATED PRIORITY (NON-LIVE)</span>
            </div>
          ) : (
            <div className="priority-context-badge mode-live" title="Priorities evaluated on live regional twin state">
              <span className="mode-dot dot-live"></span>
              <span>LIVE REGIONAL PRIORITY</span>
            </div>
          )}
        </div>
      </header>

      {/* ============================================================
          AREA B: TOP OPERATIONAL SUMMARY STRIP
          ============================================================ */}
      <div className="priority-kpi-strip">
        <div className="priority-kpi-card kpi-danger">
          <div className="pkpi-top">
            <span className="material-symbols-outlined pkpi-icon">emergency</span>
            <span className="pkpi-label">CRITICAL PRIORITIES</span>
          </div>
          <div className="pkpi-value" style={{ color: 'var(--red-600)' }}>
            {prioritySummary?.critical_priorities ?? priorities.filter(p => p.priority_level === 'CRITICAL').length}
          </div>
          <span className="pkpi-sub">Immediate intervention needed</span>
        </div>

        <div className="priority-kpi-card kpi-warn">
          <div className="pkpi-top">
            <span className="material-symbols-outlined pkpi-icon">warning</span>
            <span className="pkpi-label">HIGH PRIORITIES</span>
          </div>
          <div className="pkpi-value" style={{ color: 'var(--amber-500)' }}>
            {prioritySummary?.high_priorities ?? priorities.filter(p => p.priority_level === 'HIGH').length}
          </div>
          <span className="pkpi-sub">Imminent depletion threshold</span>
        </div>

        <div className="priority-kpi-card">
          <div className="pkpi-top">
            <span className="material-symbols-outlined pkpi-icon">block</span>
            <span className="pkpi-label">RESUPPLY ISOLATED</span>
          </div>
          <div className="pkpi-value">
            {prioritySummary?.resupply_isolated_facilities ?? 0}
          </div>
          <span className="pkpi-sub">Facilities with severed routes</span>
        </div>

        <div className="priority-kpi-card kpi-urgent-target">
          <div className="pkpi-top">
            <span className="material-symbols-outlined pkpi-icon">stars</span>
            <span className="pkpi-label">MOST URGENT TARGET</span>
          </div>
          <div className="pkpi-urgent-name">
            {highestPriority
              ? `${highestPriority.facility?.name || highestPriority.facility_name}`
              : 'None'}
          </div>
          <span className="pkpi-sub">
            {highestPriority
              ? `Shortage: ${(highestPriority.resource?.type || highestPriority.resource_name || '').toUpperCase()}`
              : 'All facilities stable'}
          </span>
        </div>
      </div>

      {/* ============================================================
          MAIN WORKSPACE: Split Layout (Left: Priority Rankings, Right: Map)
          ============================================================ */}
      <div className="priority-workspace">
        {/* Left Side: Priority Engine Findings */}
        <div className="priority-details-col">
          {/* Navigation & Filter Bar */}
          <div className="priority-controls-bar">
            <div className="priority-tabs-group">
              <button
                className={`ptab-btn ${activeTab === 'ranking' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('ranking')}
              >
                <span className="material-symbols-outlined">format_list_numbered</span>
                Ranked Priority Queue ({filteredPriorities.length})
              </button>
              <button
                className={`ptab-btn ${activeTab === 'supply' ? 'is-active' : ''}`}
                onClick={() => setActiveTab('supply')}
              >
                <span className="material-symbols-outlined">inventory_2</span>
                Critical Supply Status ({supplyData.length})
              </button>
            </div>

            {/* Filter controls */}
            <div className="priority-filters">
              <select
                className="p-filter-select"
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
              >
                <option value="ALL">All Levels</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MODERATE">Moderate</option>
              </select>

              <select
                className="p-filter-select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="ALL">All Facilities</option>
                {facilityTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Loading state */}
          {priorityBusy && priorities.length === 0 && (
            <div className="priority-loading-card">
              <span className="material-symbols-outlined spin-loading">hourglass_top</span>
              <h3>Calculating operational priorities across regional network…</h3>
              <p>Evaluating multi-criteria depletion urgency, corridor accessibility, and facility criticality.</p>
            </div>
          )}

          {/* Error state with retry */}
          {priorityError && (
            <div className="priority-error-card">
              <span className="material-symbols-outlined">error</span>
              <span>{priorityError}</span>
              <button className="btn-retry-priority" onClick={() => loadPriorities()}>
                Retry Assessment
              </button>
            </div>
          )}

          {/* ── TAB 1: RANKED QUEUE & EXPLAINABILITY (Step 4, 5, 6) ── */}
          {activeTab === 'ranking' && !priorityBusy && (
            <div className="priority-flow-content">
              {/* ── HIGHEST PRIORITY HERO SECTION (Step 4) ── */}
              {highestPriority && (
                <div className="highest-priority-hero-card">
                  <div className="hph-header">
                    <div className="hph-badge">
                      <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>stars</span>
                      <span>#1 HIGHEST OPERATIONAL PRIORITY</span>
                    </div>
                    <span className="hph-score">{highestPriority.priority_score?.toFixed(1)} / 100</span>
                  </div>

                  <div className="hph-main-info">
                    <div>
                      <h3 className="hph-facility-name">
                        {highestPriority.facility?.name || highestPriority.facility_name}
                      </h3>
                      <span className="hph-meta">
                        ID: {highestPriority.facility?.id || highestPriority.facility_id} ·{' '}
                        {highestPriority.facility?.type || 'HOSPITAL'} ·{' '}
                        Critical Resource: <strong>{(highestPriority.resource?.type || highestPriority.resource_name || '').toUpperCase()}</strong>
                      </span>
                    </div>

                    <button
                      className="btn-hph-action"
                      onClick={() => handleActionHandoff(highestPriority)}
                    >
                      <span className="material-symbols-outlined">rocket_launch</span>
                      GENERATE ACTION PLAN
                    </button>
                  </div>

                  {/* Explainability: Why this is priority */}
                  <div className="hph-explainability-box">
                    <div className="hph-exp-title">
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--amber-500)' }}>insights</span>
                      <strong>WHY THIS LOCATION IS PRIORITIZED (Engine Decision Rationale)</strong>
                    </div>
                    <p className="hph-exp-reason">
                      {highestPriority.reason ||
                        `Critical depletion of ${highestPriority.resource?.type || 'medicine'} with reduced regional corridor accessibility.`}
                    </p>

                    {/* Contributing Score Factor Breakdown */}
                    {highestPriority.inputs && (
                      <div className="hph-factors-grid">
                        <div className="factor-item">
                          <span className="factor-val">
                            {highestPriority.inputs.hours_until_depletion != null
                              ? `${highestPriority.inputs.hours_until_depletion.toFixed(1)}h`
                              : '0h'}
                          </span>
                          <span className="factor-lbl">Time to Depletion</span>
                        </div>
                        <div className="factor-item">
                          <span className="factor-val">
                            {(highestPriority.inputs.facility_accessibility_score ?? 0).toFixed(0)}%
                          </span>
                          <span className="factor-lbl">Corridor Access</span>
                        </div>
                        <div className="factor-item">
                          <span className="factor-val">
                            {highestPriority.inputs.resupply_reachable ? 'Reachable' : 'Severed'}
                          </span>
                          <span className="factor-lbl">Resupply Access</span>
                        </div>
                        <div className="factor-item">
                          <span className="factor-val">
                            {(highestPriority.inputs.resource_importance_score ?? 0).toFixed(1)}
                          </span>
                          <span className="factor-lbl">Resource Urgency</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── RANKED QUEUE LIST (Step 5) ── */}
              <div className="ranked-queue-section">
                <div className="rq-section-header">
                  <h4>Ranked Operational Queue</h4>
                  <span className="rq-count">{filteredPriorities.length} monitored items</span>
                </div>

                {filteredPriorities.length === 0 ? (
                  <div className="empty-queue-card">
                    <span className="material-symbols-outlined">playlist_add_check</span>
                    <span>No priority locations match the selected filter criteria.</span>
                  </div>
                ) : (
                  <div className="ranked-items-list">
                    {filteredPriorities.map((item, idx) => {
                      const facName = item.facility?.name || item.facility_name
                      const facId = item.facility?.id || item.facility_id
                      const resName = (item.resource?.type || item.resource_name || 'Resource').toUpperCase()
                      const hours = item.inputs?.hours_until_depletion ?? item.days_to_depletion * 24
                      const isSelected = selectedRankIdx === idx
                      const level = (item.priority_level || 'moderate').toLowerCase()

                      return (
                        <div
                          key={`${facId}-${resName}-${idx}`}
                          className={`priority-queue-card level-${level} ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => handleSelectItem(item, idx)}
                        >
                          <div className="pqc-left">
                            <span className="pqc-rank">#{item.rank || idx + 1}</span>
                            <div className="pqc-info">
                              <div className="pqc-title-row">
                                <span className="pqc-fac-name">{facName}</span>
                                <span className="pqc-fac-id">{facId}</span>
                              </div>
                              <div className="pqc-meta-row">
                                <span className="pqc-resource-tag">{resName}</span>
                                <span>Remaining: <strong>{formatHoursRemaining(hours)}</strong></span>
                                {item.inputs?.resupply_reachable === false && (
                                  <span className="pqc-isolated-tag">CORRIDOR SEVERED</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="pqc-right">
                            <span className={`pqc-level-badge level-${level}`}>
                              {item.priority_level || 'WATCH'}
                            </span>
                            <span className="pqc-score">{item.priority_score?.toFixed(1)}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* ── SELECTED ITEM EXPLAINABILITY BREAKDOWN (Step 6) ── */}
              {selectedItem && selectedItem !== highestPriority && (
                <div className="selected-explainability-card">
                  <div className="sec-header">
                    <h4>Why #{selectedItem.rank || selectedRankIdx + 1} {selectedItem.facility?.name} is Prioritized</h4>
                    <span className="sec-score">{selectedItem.priority_score?.toFixed(1)} / 100</span>
                  </div>
                  <p className="sec-reason">{selectedItem.reason}</p>

                  <div className="sec-action-row">
                    <button className="btn-sec-handoff" onClick={() => handleActionHandoff(selectedItem)}>
                      <span>Generate Action Plan for {selectedItem.facility?.name}</span>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: CRITICAL SUPPLY STATUS & DEPLETION TIMELINES (Step 7 & 8) ── */}
          {activeTab === 'supply' && (
            <div className="supply-risk-content">
              <div className="supply-section-header">
                <h3>Facility Resource Stock &amp; Depletion Timelines</h3>
                <span className="supply-header-sub">Estimated burn rates from real digital twin consumption telemetry</span>
              </div>

              {supplyData.length === 0 ? (
                <div className="empty-queue-card">
                  <span className="material-symbols-outlined">inventory</span>
                  <span>No facility inventory alerts reported.</span>
                </div>
              ) : (
                <div className="supply-facilities-grid">
                  {supplyData.map((facility) => (
                    <div key={facility.facility_id} className="facility-supply-card" onClick={() => focusNode(facility.facility_id)}>
                      <div className="fsc-header">
                        <div className="fsc-title-wrap">
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--navy-500)' }}>
                            {facility.facility_type === 'HOSPITAL' ? 'local_hospital' : 'warehouse'}
                          </span>
                          <div>
                            <div className="fsc-name">{facility.facility_name}</div>
                            <span className="fsc-id">{facility.facility_id} · {facility.facility_type}</span>
                          </div>
                        </div>
                        <span className={`fsc-status-pill status-${(facility.status || 'normal').toLowerCase()}`}>
                          {facility.resupply_status || 'REACHABLE'}
                        </span>
                      </div>

                      {/* Resource Depletion Meters (Step 8) */}
                      <div className="fsc-resources-list">
                        {(facility.resources || []).map((res, rIdx) => {
                          const status = (res.supply_status || 'STABLE').toLowerCase()
                          const days = res.days_until_depletion
                          const stock = res.current_stock ?? res.stock ?? 0
                          const percent = Math.min(Math.max((days ? (days / 14) * 100 : 10), 5), 100)

                          return (
                            <div key={rIdx} className="resource-depletion-row">
                              <div className="rdr-info-top">
                                <span className="rdr-name">{(res.resource_name || 'Resource').toUpperCase()}</span>
                                <span className="rdr-stock">{stock.toLocaleString()} {res.unit || 'units'}</span>
                                <span className={`rdr-badge status-${status}`}>
                                  {days != null ? `${days.toFixed(1)}d left` : 'Depleted'}
                                </span>
                              </div>

                              {/* Horizontal Depletion Meter */}
                              <div className="rdr-meter-track">
                                <div
                                  className={`rdr-meter-fill fill-${status}`}
                                  style={{ width: `${percent}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Embedded Digital Twin Map (Step 9) */}
        <div className="priority-map-col">
          <div className="priority-map-card">
            <div className="pmap-header">
              <div className="pmap-title">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--navy-500)' }}>hub</span>
                <span>Priority Location Spatial Focus</span>
              </div>
              <div className="pmap-legend-strip">
                <span className="pmap-pill pill-p1">● #1 Priority</span>
                <span className="pmap-pill pill-critical">● Critical Risk</span>
                <span className="pmap-pill pill-watch">● At Risk</span>
              </div>
            </div>

            <div className="pmap-host-wrap">
              <MapView />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
