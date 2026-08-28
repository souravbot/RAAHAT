// SimulationResult — displays the most recent What-If simulation result,
// clearly labeled as hypothetical and separate from the live state.

import { useTwinStore } from '../../state/useTwinStore'
import { EDGE_STATUS_META } from '../../map/icons'

export default function SimulationResult() {
  const simResult = useTwinStore((s) => s.simResult)
  const clearSimResult = useTwinStore((s) => s.clearSimResult)

  if (!simResult) return null

  const event = simResult.simulated_event
  const edge = simResult.simulated_edge
  const originalStatus = event.original?.status || '?'
  const statusMeta = EDGE_STATUS_META[edge.status] || {}

  return (
    <div className="sim-result">
      <div className="sim-result-header">
        <span className="sim-badge">HYPOTHETICAL SCENARIO</span>
        <button
          className="icon-btn"
          onClick={clearSimResult}
          title="Dismiss"
          aria-label="Dismiss simulation result"
        >
          ✕
        </button>
      </div>

      <h3 className="sim-title">SIMULATION RESULT</h3>
      <div className="sim-id">{simResult.simulation_id}</div>

      <div className="sim-state-row">
        <div>
          <div className="sim-state-label">Scenario</div>
          <div className="sim-state-value">
            {event.type === 'CLOSURE' ? 'Closure' : 'Risk Increase'}
          </div>
        </div>
        <div>
          <div className="sim-state-label">Target</div>
          <div className="sim-state-value">{event.target_id}</div>
        </div>
      </div>

      <div className="sim-transition">
        <div className="sim-arrow-block">
          <div className="sim-state-label">Previous state</div>
          <div className="sim-state-value">{originalStatus}</div>
        </div>
        <span className="sim-arrow">→</span>
        <div className="sim-arrow-block">
          <div className="sim-state-label">Hypothetical state</div>
          <div
            className="sim-state-value"
            style={{ color: statusMeta.color || undefined }}
          >
            {edge.status} · risk {edge.risk_score}
          </div>
        </div>
      </div>

      <div className="sim-live-note">
        <span className="dot dot-green" /> Live Regional State: <strong>UNCHANGED</strong>
      </div>
    </div>
  )
}
