// ActionPlanView — Dedicated Recommended Action Plan & Resource Deployment Center (Phase 19).
// Takes the highest-priority shortage target and calls POST /recommend-action to produce
// an explainable, accessibility-aware deployment plan with selected warehouse, vehicle, route,
// and step-by-step execution instructions.

import { useState, useEffect, useMemo } from 'react'
import { useTwinStore } from '../state/useTwinStore'
import MapView from '../map/MapView'

export default function ActionPlanView() {
  const priorities = useTwinStore((s) => s.priorities)
  const selectedPriorityTarget = useTwinStore((s) => s.selectedPriorityTarget)
  const selectPriorityTarget = useTwinStore((s) => s.selectPriorityTarget)
  const actionPlan = useTwinStore((s) => s.actionPlan)
  const actionBusy = useTwinStore((s) => s.actionBusy)
  const actionError = useTwinStore((s) => s.actionError)
  const actionDispatching = useTwinStore((s) => s.actionDispatching)
  const generateActionPlan = useTwinStore((s) => s.generateActionPlan)
  const confirmVehicleDispatch = useTwinStore((s) => s.confirmVehicleDispatch)
  const clearActionPlan = useTwinStore((s) => s.clearActionPlan)
  const clearActionError = useTwinStore((s) => s.clearActionError)
  const focusNode = useTwinStore((s) => s.focusNode)
  const simResult = useTwinStore((s) => s.simResult)
  const scenarioResult = useTwinStore((s) => s.scenarioResult)

  const [dispatchStatus, setDispatchStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('plan') // 'plan' | 'alternatives'

  // Determine active target: from selectedPriorityTarget or #1 highest priority in store
  const topPriority = priorities && priorities.length > 0 ? priorities[0] : null
  const activeTarget = selectedPriorityTarget || (topPriority ? {
    facility_id: topPriority.facility?.id || topPriority.facility_id,
    facility_name: topPriority.facility?.name || topPriority.facility_name,
    resource: topPriority.resource?.type || topPriority.resource_name || 'medicine',
    priority_level: topPriority.priority_level || 'HIGH',
    required_quantity: 200,
  } : null)

  const isSimulationMode = simResult !== null || scenarioResult !== null

  // Auto-generate action plan on mount if target exists and no plan generated yet
  useEffect(() => {
    if (activeTarget && (!actionPlan || actionPlan.request?.target_node !== activeTarget.facility_id) && !actionBusy) {
      const payload = {
        target_node: activeTarget.facility_id,
        resource: activeTarget.resource || 'medicine',
        required_quantity: Number(activeTarget.required_quantity) || 200,
        priority: activeTarget.priority_level || 'HIGH',
      }
      generateActionPlan(payload).catch(() => {})
    }
  }, [activeTarget?.facility_id])

  // Generate action plan handler
  const handleGenerate = async () => {
    if (!activeTarget) return
    if (clearActionError) clearActionError()
    setDispatchStatus(null)
    const payload = {
      target_node: activeTarget.facility_id,
      resource: activeTarget.resource || 'medicine',
      required_quantity: Number(activeTarget.required_quantity) || 200,
      priority: activeTarget.priority_level || 'HIGH',
    }
    try {
      await generateActionPlan(payload)
      if (activeTarget.facility_id) {
        focusNode(activeTarget.facility_id)
      }
    } catch {}
  }

  // Confirm Dispatch execution (Step 16)
  const handleConfirmDispatch = async () => {
    if (!actionPlan?.selected_vehicle?.id) return
    try {
      await confirmVehicleDispatch(actionPlan.selected_vehicle.id)
      setDispatchStatus({
        success: true,
        message: `Deployment confirmed. Vehicle ${actionPlan.selected_vehicle.id} status updated to EN-ROUTE in Regional Digital Twin.`,
      })
    } catch (err) {
      setDispatchStatus({
        success: false,
        message: `Unable to dispatch vehicle: ${err.message}`,
      })
    }
  }

  const plan = actionPlan
  const success = plan?.success === true
  const failed = plan?.success === false
  const selectedVehicle = plan?.selected_vehicle
  const selectedWarehouse = plan?.selected_warehouse
  const selectedRoute = plan?.selected_route
  const isDispatchable = selectedVehicle?.status === 'available'

  return (
    <div className="action-plan-view-container" id="action-plan-view">
      {/* ============================================================
          AREA A: ACTION PLAN HEADER & OPERATIONAL CONTEXT
          ============================================================ */}
      <header className="action-plan-header-strip">
        <div className="ap-header-left">
          <div className="ap-view-title-group">
            <span className="material-symbols-outlined ap-main-icon">assignment_turned_in</span>
            <div>
              <h1 className="ap-page-heading">Recommended Action Plan &amp; Resource Deployment</h1>
              <span className="ap-page-sub">
                AI-assisted deployment optimization based on accessibility, stock availability, and vehicle capacity
              </span>
            </div>
          </div>
        </div>

        {/* Live vs Simulation State Badge */}
        <div className="ap-header-right">
          {isSimulationMode ? (
            <div className="ap-context-badge mode-simulation" title="Action plan evaluated on hypothetical simulation state">
              <span className="mode-dot dot-sim"></span>
              <span>SIMULATED ACTION PLAN (NON-LIVE)</span>
            </div>
          ) : (
            <div className="ap-context-badge mode-live" title="Action plan evaluated on live operational twin state">
              <span className="mode-dot dot-live"></span>
              <span>LIVE DEPLOYMENT PLAN</span>
            </div>
          )}

          {/* Quick Target Switcher */}
          {priorities.length > 0 && (
            <div className="ap-target-select-wrap">
              <span className="material-symbols-outlined select-icon">priority_high</span>
              <select
                className="ap-target-select"
                value={activeTarget?.facility_id || ''}
                onChange={(e) => {
                  const p = priorities.find(p => (p.facility?.id || p.facility_id) === e.target.value)
                  if (p) {
                    selectPriorityTarget(p)
                    const facId = p.facility?.id || p.facility_id
                    if (facId) focusNode(facId)
                  }
                }}
              >
                {priorities.map((p, idx) => {
                  const facName = p.facility?.name || p.facility_name
                  const facId = p.facility?.id || p.facility_id
                  const resName = p.resource?.type || p.resource_name || 'Resource'
                  return (
                    <option key={`${facId}-${idx}`} value={facId}>
                      #{p.rank || idx + 1} {facName} ({resName.toUpperCase()} · {p.priority_level})
                    </option>
                  )
                })}
              </select>
            </div>
          )}
        </div>
      </header>

      {/* ============================================================
          MAIN WORKSPACE: Split Layout (Left: Action Cards, Right: Map)
          ============================================================ */}
      <div className="action-plan-workspace">
        {/* Left Column: Action Sequence & Decision Rationale */}
        <div className="action-plan-details-col">
          {/* Error Banner */}
          {actionError && (
            <div className="ap-alert alert-error">
              <span className="material-symbols-outlined">error</span>
              <span>{actionError}</span>
              <button className="btn-retry-ap" onClick={handleGenerate}>Retry</button>
            </div>
          )}

          {/* Dispatch Confirmation Banner */}
          {dispatchStatus && (
            <div className={`ap-alert alert-${dispatchStatus.success ? 'success' : 'error'}`}>
              <span className="material-symbols-outlined">
                {dispatchStatus.success ? 'check_circle' : 'error'}
              </span>
              <span>{dispatchStatus.message}</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {actionBusy && (
            <div className="action-loading-card">
              <span className="material-symbols-outlined spin-loading">hourglass_top</span>
              <h3>Building optimal deployment action plan…</h3>
              <p>Evaluating warehouse stock, selecting available vehicle, and calculating accessibility-aware routes.</p>
            </div>
          )}

          {/* ── TOP TARGET BRIEF CARD (Step 4) ── */}
          {activeTarget ? (
            <div className="target-brief-card">
              <div className="tbc-header">
                <div className="tbc-badge-wrap">
                  <span className="tbc-rank-badge">PRIORITY TARGET</span>
                  <span className={`tbc-level-badge level-${(activeTarget.priority_level || 'high').toLowerCase()}`}>
                    {activeTarget.priority_level || 'HIGH'} PRIORITY
                  </span>
                </div>
                <span className="tbc-id">{activeTarget.facility_id}</span>
              </div>

              <div className="tbc-main">
                <div>
                  <h3 className="tbc-facility-name">{activeTarget.facility_name || activeTarget.facility_id}</h3>
                  <span className="tbc-demand">
                    Required Shortage: <strong>{activeTarget.required_quantity || 200} units</strong> of{' '}
                    <strong>{(activeTarget.resource || 'medicine').toUpperCase()}</strong>
                  </span>
                </div>

                <button
                  className="btn-regenerate-plan"
                  onClick={handleGenerate}
                  disabled={actionBusy}
                  title="Re-run recommendation engine"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {actionBusy ? 'hourglass_top' : 'refresh'}
                  </span>
                  {actionBusy ? 'Optimizing…' : 'Recalculate Plan'}
                </button>
              </div>
            </div>
          ) : (
            <div className="ap-empty-card">
              <span className="material-symbols-outlined empty-icon">priority_high</span>
              <h3>No Priority Target Selected</h3>
              <p>Select a location from the Priority Assessment to generate an optimal warehouse and vehicle deployment plan.</p>
              <button
                className="btn-go-priority"
                onClick={() => {
                  window.history.pushState(null, '', '/priority')
                  window.dispatchEvent(new PopStateEvent('popstate'))
                }}
              >
                Go to Priority Assessment →
              </button>
            </div>
          )}

          {/* ── 4-STEP VISUAL DECISION SEQUENCE (Step 6 & 12) ── */}
          {success && plan && (
            <div className="decision-flow-container">
              {/* Visual 4-Step Chain */}
              <div className="decision-chain-strip">
                <div className="dc-step">
                  <span className="dc-step-num">01</span>
                  <span className="dc-step-icon material-symbols-outlined" style={{ color: 'var(--navy-500)' }}>warehouse</span>
                  <span className="dc-step-name">Warehouse</span>
                  <span className="dc-step-val">{selectedWarehouse?.id || 'W001'}</span>
                </div>
                <span className="dc-arrow">→</span>
                <div className="dc-step">
                  <span className="dc-step-num">02</span>
                  <span className="dc-step-icon material-symbols-outlined" style={{ color: 'var(--amber-500)' }}>local_shipping</span>
                  <span className="dc-step-name">Vehicle</span>
                  <span className="dc-step-val">{selectedVehicle?.id || 'V002'}</span>
                </div>
                <span className="dc-arrow">→</span>
                <div className="dc-step">
                  <span className="dc-step-num">03</span>
                  <span className="dc-step-icon material-symbols-outlined" style={{ color: '#0284c7' }}>alt_route</span>
                  <span className="dc-step-name">Safe Route</span>
                  <span className="dc-step-val">{selectedRoute?.total_distance || '0'} km</span>
                </div>
                <span className="dc-arrow">→</span>
                <div className="dc-step">
                  <span className="dc-step-num">04</span>
                  <span className="dc-step-icon material-symbols-outlined" style={{ color: 'var(--green-600)' }}>task_alt</span>
                  <span className="dc-step-name">Delivery</span>
                  <span className="dc-step-val">{activeTarget?.facility_id}</span>
                </div>
              </div>

              {/* ── STEP 1: SELECTED WAREHOUSE CARD (Step 7) ── */}
              <div className="deployment-card warehouse-card">
                <div className="dep-card-header">
                  <div className="dep-header-left">
                    <span className="material-symbols-outlined dep-icon" style={{ color: '#2563eb' }}>warehouse</span>
                    <div>
                      <span className="dep-step-tag">STEP 1 · SOURCE INVENTORY ORIGIN</span>
                      <h4 className="dep-title">{selectedWarehouse?.name || selectedWarehouse?.id}</h4>
                    </div>
                  </div>
                  <span className="dep-badge badge-warehouse">ID: {selectedWarehouse?.id}</span>
                </div>

                <div className="dep-body">
                  <div className="dep-metrics-grid">
                    <div className="dep-metric">
                      <span className="dep-metric-val">
                        {Number(selectedWarehouse?.current_stock ?? selectedWarehouse?.stock ?? 0).toLocaleString()} units
                      </span>
                      <span className="dep-metric-lbl">Available Stock</span>
                    </div>
                    <div className="dep-metric">
                      <span className="dep-metric-val">{(activeTarget?.resource || 'Medicine').toUpperCase()}</span>
                      <span className="dep-metric-lbl">Allocated Resource</span>
                    </div>
                    <div className="dep-metric">
                      <span className="dep-metric-val" style={{ color: 'var(--green-600)' }}>Sufficient</span>
                      <span className="dep-metric-lbl">Inventory Status</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── STEP 2: ASSIGNED VEHICLE CARD (Step 8) ── */}
              <div className="deployment-card vehicle-card">
                <div className="dep-card-header">
                  <div className="dep-header-left">
                    <span className="material-symbols-outlined dep-icon" style={{ color: 'var(--amber-500)' }}>local_shipping</span>
                    <div>
                      <span className="dep-step-tag">STEP 2 · ASSIGNED TRANSPORT ASSET</span>
                      <h4 className="dep-title">{selectedVehicle?.id} — {selectedVehicle?.type}</h4>
                    </div>
                  </div>
                  <span className={`dep-badge ${isDispatchable ? 'badge-available' : 'badge-enroute'}`}>
                    {selectedVehicle?.status === 'available' ? 'AVAILABLE' : 'EN-ROUTE'}
                  </span>
                </div>

                <div className="dep-body">
                  <div className="dep-metrics-grid">
                    <div className="dep-metric">
                      <span className="dep-metric-val">{selectedVehicle?.capacity} units</span>
                      <span className="dep-metric-lbl">Vehicle Capacity</span>
                    </div>
                    <div className="dep-metric">
                      <span className="dep-metric-val">{selectedVehicle?.current_node}</span>
                      <span className="dep-metric-lbl">Current Location</span>
                    </div>
                    <div className="dep-metric">
                      <span className="dep-metric-val" style={{ color: 'var(--green-600)' }}>Capacity Match</span>
                      <span className="dep-metric-lbl">Load Verification</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── STEP 3 & 4: RECOMMENDED ROUTE & STEPS (Step 9 & 10) ── */}
              <div className="deployment-card route-card">
                <div className="dep-card-header">
                  <div className="dep-header-left">
                    <span className="material-symbols-outlined dep-icon" style={{ color: '#0284c7' }}>alt_route</span>
                    <div>
                      <span className="dep-step-tag">STEP 3 · ACCESSIBILITY-AWARE ROUTE</span>
                      <h4 className="dep-title">
                        {selectedRoute?.start} → {selectedRoute?.end}
                      </h4>
                    </div>
                  </div>
                  <span className="dep-badge badge-route">
                    {selectedRoute?.total_distance} km · Risk Cost: {selectedRoute?.weighted_cost}
                  </span>
                </div>

                {/* Structured Execution Steps (Step 10) */}
                {plan.steps?.length > 0 && (
                  <div className="route-execution-steps">
                    <span className="steps-heading">EXECUTION SEQUENCE</span>
                    <ol className="steps-list">
                      {plan.steps.map((step, idx) => (
                        <li key={idx} className="step-item">
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>

              {/* ── EXPLAINABILITY: WHY THIS ACTION WAS RECOMMENDED (Step 11) ── */}
              {plan.reasons?.length > 0 && (
                <div className="deployment-card explainability-card">
                  <div className="dep-card-header">
                    <div className="dep-header-left">
                      <span className="material-symbols-outlined dep-icon" style={{ color: 'var(--green-600)' }}>psychology</span>
                      <div>
                        <span className="dep-step-tag">DECISION AUDIT TRAIL</span>
                        <h4 className="dep-title">Why This Action Was Recommended</h4>
                      </div>
                    </div>
                  </div>

                  <div className="reasons-bullet-list">
                    {plan.reasons.map((reason, idx) => (
                      <div key={idx} className="reason-row">
                        <span className="material-symbols-outlined reason-check">check_circle</span>
                        <span className="reason-text">{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── DISPATCH ACTION & CONFIRMATION (Step 16) ── */}
              <div className="dispatch-action-footer">
                <div className="daf-note">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--amber-500)' }}>info</span>
                  <span>Confirming deployment updates the vehicle status to EN-ROUTE across all Command Center screens.</span>
                </div>

                <button
                  className="btn-confirm-dispatch-action"
                  onClick={handleConfirmDispatch}
                  disabled={!isDispatchable || actionDispatching}
                  id="btn-main-confirm-dispatch"
                >
                  <span className="material-symbols-outlined">
                    {actionDispatching ? 'hourglass_top' : 'local_shipping'}
                  </span>
                  {actionDispatching
                    ? 'Executing Dispatch Protocol…'
                    : isDispatchable
                    ? `CONFIRM DISPATCH & DEPLOY ${selectedVehicle?.id}`
                    : `${selectedVehicle?.id} IS ALREADY EN-ROUTE`}
                </button>
              </div>
            </div>
          )}

          {/* ── NO RECOMMENDATION / ISOLATED STATE (Step 14) ── */}
          {failed && plan && (
            <div className="no-recommendation-card">
              <div className="nrc-header">
                <span className="material-symbols-outlined nrc-icon">block</span>
                <div>
                  <span className="nrc-tag">NO ACCESSIBLE GROUND ROUTE</span>
                  <h3>Deployment Plan Unavailable</h3>
                </div>
              </div>

              <p className="nrc-message">{plan.message || 'No accessible ground route could be found from any warehouse.'}</p>

              {plan.reasons?.length > 0 && (
                <div className="nrc-reasons">
                  <strong>Contributing Constraints:</strong>
                  <ul>
                    {plan.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="nrc-fallback-box">
                <div className="nrc-fallback-title">
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>flight</span>
                  <strong>Recommended Operational Fallback:</strong>
                </div>
                <p>Escalate to emergency aerial relief (drone/helicopter dispatch) and prioritize infrastructure clearing on severed bridge corridors.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Embedded Interactive Map with Route Overlay (Step 9) */}
        <div className="action-plan-map-col">
          <div className="ap-map-card">
            <div className="ap-map-header">
              <div className="ap-map-title">
                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--navy-500)' }}>hub</span>
                <span>Optimized Resource Deployment Route</span>
              </div>
              <div className="ap-map-legend">
                <span className="ap-pill pill-warehouse">● Source Warehouse</span>
                <span className="ap-pill pill-route">● Recommended Route</span>
                <span className="ap-pill pill-target">● Destination Target</span>
              </div>
            </div>

            <div className="ap-map-host-wrap">
              <MapView />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
