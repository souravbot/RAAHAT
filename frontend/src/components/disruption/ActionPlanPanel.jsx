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
  const vehicles = useTwinStore((s) => s.vehicles)

  // Manual / prefilled request fields.
  const [targetNode, setTargetNode] = useState('')
  const [resource, setResource] = useState('')
  const [quantity, setQuantity] = useState('')

  const [source, setSource] = useState('priority') // 'priority' | 'manual'

  // Use the top priority as a convenient default shortage trigger.
  const topPriority = priorities && priorities.length > 0 ? priorities[0] : null

  const handleGenerate = async () => {
    let payload
    if (source === 'priority' && topPriority) {
      payload = {
        target_node: topPriority.facility.id,
        resource: topPriority.resource.type,
        required_quantity: 200, // demo default quantity
        priority: topPriority.priority_level,
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
    <div className="action-plan-panel control-panel">
      <div className="control-header">
        <span className="control-title">RECOMMENDED ACTION</span>
        <span className="live-badge action-badge">PLANNING</span>
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

      {source === 'priority' && topPriority ? (
        <div className="action-source-note">
          Shortage from top priority: <strong>{topPriority.facility.id}</strong> —{' '}
          <strong>{topPriority.resource.type.toUpperCase()}</strong> (
          {topPriority.priority_level})
        </div>
      ) : source === 'priority' ? (
        <div className="action-source-note">No priority detected yet.</div>
      ) : (
        <div className="action-manual-fields">
          <input
            className="control-input"
            placeholder="Target node (e.g. H003)"
            value={targetNode}
            onChange={(e) => setTargetNode(e.target.value)}
          />
          <input
            className="control-input"
            placeholder="Resource (e.g. food)"
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
        disabled={actionBusy || (source === 'priority' && !topPriority)}
      >
        {actionBusy ? 'Generating…' : 'GENERATE RECOMMENDED ACTION'}
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
    <div className="action-plan-card">
      <div className="action-card-header">
        <span className="action-card-title">🚨 RECOMMENDED ACTION PLAN</span>
        <button className="icon-btn" onClick={onClose} aria-label="Dismiss">
          ✕
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
        <div className="action-card-step-label">1 · Selected Warehouse</div>
        <div className="action-card-value">
          {plan.selected_warehouse?.id}
          <span className="action-sub">{plan.selected_warehouse?.name}</span>
        </div>
      </div>

      <div className="action-card-section">
        <div className="action-card-step-label">2 · Selected Vehicle</div>
        <div className="action-card-value">
          {selectedVehicle?.id}
          <span className="action-sub">
            {selectedVehicle?.type} · cap {selectedVehicle?.capacity}
          </span>
        </div>
      </div>

      <div className="action-card-section">
        <div className="action-card-step-label">3 · Recommended Route</div>
        <div className="action-card-route">
          <span className="action-route-node">{plan.selected_route?.start}</span>
          <span className="action-route-arrow">→</span>
          <span className="action-route-node">{plan.selected_route?.end}</span>
        </div>
        <div className="action-route-meta">
          Distance: {plan.selected_route?.total_distance} km · Weighted cost:{' '}
          {plan.selected_route?.weighted_cost}
        </div>
      </div>

      {/* Numbered steps */}
      <div className="action-card-section">
        <div className="action-card-step-label">Execution Steps</div>
        <ol className="action-steps">
          {(plan.steps || []).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      {/* Why this recommendation */}
      {plan.reasons?.length > 0 && (
        <div className="action-card-section">
          <div className="action-card-step-label">Why this recommendation?</div>
          <ul className="action-checks">
            {plan.reasons.map((r, i) => (
              <li key={i}>✓ {r}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        className="btn action-dispatch-btn"
        onClick={onConfirm}
        disabled={!dispatchable || dispatching}
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