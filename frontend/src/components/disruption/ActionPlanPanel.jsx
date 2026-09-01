// ActionPlanPanel — Phase 8 Recommended Action Plan card.
//
// Lets the user generate an explainable recommended action plan for a supply
// shortage (from the Priority Engine), displays the action plan card with
// numbered steps + reasons, allows confirming dispatch, and draws the route on
// the existing map. The panel NEVER calculates priority/route logic itself —
// everything comes from POST /recommend-action.

import { useState } from 'react'
import { useTwinStore } from '../../state/useTwinStore'

// A selected priority can be used to prefill the "Generate Action" request.
// (facility id = target node, resource type, a sensible default quantity)

export default function ActionPlanPanel() {
  const actionPlan = useTwinStore((s) => s.actionPlan)
  const actionBusy = useTwinStore((s) => s.actionBusy)
  const actionError = useTwinStore((s) => s.actionError)
  const actionDispatching = useTwinStore((s) => s.actionDispatching)
  const generateActionPlan = useTwinStore((s) => s.generateActionPlan)
  const confirmVehicleDispatch = useTwinStore((s) => s.confirmVehicleDispatch)
  const clearActionPlan = useTwinStore((s) => s.clearActionPlan)
  const clearActionError = useTwinStore((s) => s.clearActionError)
  const priorities = useTwinStore((s) => s.priorities)
  const selectedPriorityTarget = useTwinStore((s) => s.selectedPriorityTarget)
  const vehicles = useTwinStore((s) => s.vehicles)

  // Manual / prefilled request fields.
  const [targetNode, setTargetNode] = useState('')
  const [resource, setResource] = useState('')
  const [quantity, setQuantity] = useState('200')

  const [source, setSource] = useState('priority') // 'priority' | 'manual'

  // Active target is either explicitly selected priority or top priority fallback
  const topPriority = priorities && priorities.length > 0 ? priorities[0] : null
  const activeTarget = selectedPriorityTarget || (topPriority ? {
    facility_id: topPriority.facility?.id || topPriority.facility_id,
    facility_name: topPriority.facility?.name || topPriority.facility_name,
    resource: topPriority.resource?.type || topPriority.resource_name || 'medicine',
    priority_level: topPriority.priority_level,
    required_quantity: 200,
  } : null)

  const handleGenerate = async () => {
    let payload
    if (source === 'priority' && activeTarget) {
      payload = {
        target_node: activeTarget.facility_id,
        resource: activeTarget.resource,
        required_quantity: Number(activeTarget.required_quantity) || 200,
        priority: activeTarget.priority_level,
      }
    } else {
      if (!targetNode || !resource || !quantity) {
        alert('Please provide target node, resource, and required quantity.')
        return
      }
      payload = {
        target_node: targetNode,
        resource: resource,
        required_quantity: Number(quantity),
        priority: null,
      }
    }
    await generateActionPlan(payload)
  }

  const handleConfirmDispatch = async () => {
    if (!actionPlan?.selected_vehicle?.id) return
    await confirmVehicleDispatch(actionPlan.selected_vehicle.id)
  }

  const success = actionPlan?.success === true
  const failed = actionPlan?.success === false

  return (
    <div className="action-plan-panel control-panel" id="action-plan-panel">
      <div className="control-header">
        <span className="control-title">RECOMMENDED ACTION</span>
        <span className="live-badge action-badge">OPTIMIZATION ENGINE</span>
      </div>

      {actionError && (
        <div className="control-error" onClick={clearActionError}>
          {actionError}
        </div>
      )}

      {/* Source selector */}
      <div className="action-source-toggle">
        <button
          className={`view-toggle-btn ${source === 'priority' ? 'is-active' : ''}`}
          onClick={() => setSource('priority')}
        >
          From Priority
        </button>
        <button
          className={`view-toggle-btn ${source === 'manual' ? 'is-active' : ''}`}
          onClick={() => setSource('manual')}
        >
          Manual
        </button>
      </div>

      {source === 'priority' && activeTarget ? (
        <div className="action-source-note">
          Shortage Target: <strong>{activeTarget.facility_name || activeTarget.facility_id}</strong> ({activeTarget.facility_id}) —{' '}
          <strong>{activeTarget.resource.toUpperCase()}</strong> (
          {activeTarget.priority_level || 'HIGH'})
        </div>
      ) : source === 'priority' ? (
        <div className="action-source-note">No priority detected yet.</div>
      ) : (
        <div className="action-manual-fields">
          <input
            className="control-input"
            placeholder="Target node (e.g. H001)"
            value={targetNode}
            onChange={(e) => setTargetNode(e.target.value)}
          />
          <input
            className="control-input"
            placeholder="Resource (e.g. medicine)"
            value={resource}
            onChange={(e) => setResource(e.target.value)}
          />
          <input
            className="control-input"
            placeholder="Required quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>
      )}

      <button
        className="btn btn-live action-generate-btn"
        onClick={handleGenerate}
        disabled={actionBusy || (source === 'priority' && !activeTarget)}
      >
        {actionBusy
          ? 'Generating response recommendation…'
          : activeTarget && source === 'priority'
            ? `GENERATE ACTION PLAN — ${activeTarget.facility_name || activeTarget.facility_id}`
            : 'GENERATE RECOMMENDED ACTION'}
      </button>

      {failed && (
        <div className="action-failed">
          <div className="action-failed-message">{actionPlan.message}</div>
          {actionPlan.reasons?.length > 0 && (
            <ul className="action-reasons-list">
              {actionPlan.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {success && actionPlan && (
        <ActionPlanCard
          plan={actionPlan}
          vehicles={vehicles}
          dispatching={actionDispatching}
          onConfirm={handleConfirmDispatch}
          onClose={clearActionPlan}
        />
      )}
    </div>
  )
}

// ---------------- Action plan card ----------------
function ActionPlanCard({ plan, vehicles, dispatching, onConfirm, onClose }) {
  const selectedVehicle = plan.selected_vehicle
  const dispatchable = selectedVehicle?.status === 'available'

  return (
    <div className="action-plan-card" id="action-plan-card">
      <div className="action-card-header">
        <span className="action-card-title">
          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--navy)' }}>assignment_turned_in</span>
          RECOMMENDED ACTION PLAN
        </span>
        <button className="icon-btn" onClick={onClose} aria-label="Dismiss">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
        </button>
      </div>

      <div className="action-card-facts">
        {plan.request?.priority && (
          <div className="action-fact">
            <span className="action-fact-label">Priority</span>
            <span className="action-fact-value">{plan.request.priority}</span>
          </div>
        )}
        <div className="action-fact">
          <span className="action-fact-label">Resource</span>
          <span className="action-fact-value">{plan.request?.resource}</span>
        </div>
        <div className="action-fact">
          <span className="action-fact-label">Quantity</span>
          <span className="action-fact-value">
            {plan.request?.required_quantity} units
          </span>
        </div>
      </div>

      <div className="action-card-section">
        <div className="action-card-step-label">
          <span className="material-symbols-outlined" style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: '0.25rem' }}>warehouse</span>
          SOURCE WAREHOUSE
        </div>
        <div className="action-card-value">
          {plan.selected_warehouse?.name || plan.selected_warehouse?.id}
          <span className="action-sub">ID: {plan.selected_warehouse?.id}</span>
        </div>
      </div>

      <div className="action-card-section">
        <div className="action-card-step-label">
          <span className="material-symbols-outlined" style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: '0.25rem' }}>local_shipping</span>
          ASSIGNED VEHICLE
        </div>
        <div className="action-card-value">
          {selectedVehicle?.id} <span style={{ fontWeight: 400, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>({selectedVehicle?.type})</span>
          <span className="action-sub">
            Capacity: {selectedVehicle?.capacity} units · At: {selectedVehicle?.current_node}
          </span>
        </div>
      </div>

      <div className="action-card-section">
        <div className="action-card-step-label">
          <span className="material-symbols-outlined" style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: '0.25rem' }}>alt_route</span>
          RECOMMENDED ROUTE
        </div>
        <div className="action-card-route">
          <span className="action-route-node">{plan.selected_route?.start}</span>
          <span className="action-route-arrow">→</span>
          <span className="action-route-node">{plan.selected_route?.end}</span>
        </div>
        <div className="action-route-meta">
          Distance: <strong>{plan.selected_route?.total_distance} km</strong> · Risk cost:{' '}
          <strong>{plan.selected_route?.weighted_cost}</strong>
        </div>
      </div>

      {/* Numbered steps */}
      <div className="action-card-section">
        <div className="action-card-step-label">
          <span className="material-symbols-outlined" style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: '0.25rem' }}>task_alt</span>
          EXECUTION STEPS
        </div>
        <ol className="action-steps">
          {(plan.steps || []).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      {/* Why this recommendation */}
      {plan.reasons?.length > 0 && (
        <div className="action-card-section">
          <div className="action-card-step-label">
            <span className="material-symbols-outlined" style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: '0.25rem' }}>insights</span>
            WHY THIS DECISION
          </div>
          <ul className="action-checks">
            {plan.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        className="btn action-dispatch-btn"
        onClick={onConfirm}
        disabled={!dispatchable || dispatching}
        id="btn-confirm-dispatch"
      >
        {dispatching
          ? 'Dispatching…'
          : dispatchable
            ? `CONFIRM DISPATCH ${selectedVehicle?.id}`
            : `${selectedVehicle?.id} already en-route`}
      </button>
      <div className="action-hint">
        Dispatch sets the vehicle to en-route and updates the digital twin map.
      </div>
    </div>
  )
}