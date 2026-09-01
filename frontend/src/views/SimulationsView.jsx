// SimulationsView — Full-page what-if simulation screen.
// Form to select edge, disruption type, and run simulation or full scenario.
// Results display inline once a simulation completes.

import { useState, useMemo } from 'react'
import { useTwinStore } from '../state/useTwinStore'

const EDGE_META = { ROAD: 'Road', BRIDGE: 'Bridge' }

export default function SimulationsView() {
  const nodes = useTwinStore((s) => s.nodes)
  const edges = useTwinStore((s) => s.edges)
  const runSimulationNow = useTwinStore((s) => s.runSimulationNow)
  const runScenarioNow = useTwinStore((s) => s.runScenarioNow)
  const compareScenariosNow = useTwinStore((s) => s.compareScenariosNow)
  const disruptionBusy = useTwinStore((s) => s.disruptionBusy)
  const disruptionError = useTwinStore((s) => s.disruptionError)
  const scenarioBusy = useTwinStore((s) => s.scenarioBusy)
  const scenarioError = useTwinStore((s) => s.scenarioError)
  const simResult = useTwinStore((s) => s.simResult)
  const scenarioResult = useTwinStore((s) => s.scenarioResult)
  const scenarioComparison = useTwinStore((s) => s.scenarioComparison)
  const clearSimResult = useTwinStore((s) => s.clearSimResult)
  const clearScenarioResult = useTwinStore((s) => s.clearScenarioResult)
  const clearDisruptionError = useTwinStore((s) => s.clearDisruptionError)
  const clearScenarioError = useTwinStore((s) => s.clearScenarioError)

  const [edgeId, setEdgeId] = useState('')
  const [type, setType] = useState('closure')
  const [riskDelta, setRiskDelta] = useState(20)

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const edgeLabel = (edge) => {
    const a = byId.get(edge.connects[0])
    const b = byId.get(edge.connects[1])
    return `${a?.name || edge.connects[0]} ↔ ${b?.name || edge.connects[1]}`
  }

  const payload = () => ({
    edge_id: edgeId,
    type,
    risk_delta: riskDelta,
  })

  const selectedEdge = edges.find((e) => e.id === edgeId)
  const busy = disruptionBusy || scenarioBusy

  const handleSimulate = async () => {
    if (!edgeId) return
    clearDisruptionError()
    try { await runSimulationNow(payload()) } catch {}
  }

  const handleScenario = async () => {
    if (!edgeId) return
    if (clearScenarioError) clearScenarioError()
    try { await runScenarioNow(payload()) } catch {}
  }

  const handleCompare = async () => {
    if (!edgeId) return
    if (clearScenarioError) clearScenarioError()
    try {
      const closurePayload = { ...payload(), type: 'closure' }
      const riskPayload = { ...payload(), type: 'risk_increase', risk_delta: 50 }
      await compareScenariosNow(closurePayload, riskPayload)
    } catch {}
  }

  return (
    <div className="view-sim" id="view-sim">
      {/* Left: Form */}
      <div className="sim-form-panel">
        <div className="view-panel-header">
          <div className="view-panel-title-group">
            <span className="material-symbols-outlined view-panel-icon">science</span>
            <h2 className="view-panel-title">What-If Simulations</h2>
          </div>
          <p className="view-panel-desc">
            Test hypothetical disruptions without affecting the live regional state.
            Select an edge, configure the scenario, and run.
          </p>
        </div>

        {/* Edge selector */}
        <div className="sim-field">
          <label className="sim-label">Transport Connection</label>
          <select
            className="sim-select"
            value={edgeId}
            onChange={(e) => setEdgeId(e.target.value)}
          >
            <option value="">Select an edge…</option>
            {edges.map((edge) => (
              <option key={edge.id} value={edge.id}>
                {edge.id} — {edgeLabel(edge)} — {EDGE_META[edge.type] || edge.type} · {edge.status}
              </option>
            ))}
          </select>
        </div>

        {/* Edge info */}
        {selectedEdge && (
          <div className="sim-edge-info">
            <div className="sim-edge-row">
              <span className="sim-edge-label">Status:</span>
              <span className={`sim-edge-status se-${selectedEdge.status?.toLowerCase()}`}>{selectedEdge.status}</span>
            </div>
            <div className="sim-edge-row">
              <span className="sim-edge-label">Risk Score:</span>
              <span>{selectedEdge.risk_score}/100</span>
            </div>
            <div className="sim-edge-row">
              <span className="sim-edge-label">Type:</span>
              <span>{EDGE_META[selectedEdge.type] || selectedEdge.type}</span>
            </div>
            <div className="sim-edge-row">
              <span className="sim-edge-label">Distance:</span>
              <span>{selectedEdge.distance_km?.toFixed(1) ?? '?'} km</span>
            </div>
          </div>
        )}

        {/* Disruption type */}
        <div className="sim-field">
          <label className="sim-label">Disruption Type</label>
          <select
            className="sim-select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="closure">Full Closure</option>
            <option value="risk_increase">Risk Increase</option>
          </select>
        </div>

        {type === 'risk_increase' && (
          <div className="sim-field">
            <label className="sim-label">Risk Increase (+)</label>
            <input
              className="sim-input"
              type="number"
              min="0"
              max="100"
              value={riskDelta}
              onChange={(e) => setRiskDelta(Number(e.target.value))}
            />
          </div>
        )}

        {/* Errors */}
        {(disruptionError || scenarioError) && (
          <div className="view-error" onClick={() => { clearDisruptionError(); clearScenarioError?.() }}>
            <span className="material-symbols-outlined">error</span>
            {disruptionError || scenarioError}
          </div>
        )}

        {/* Action buttons */}
        <div className="sim-actions">
          <button
            className="sim-btn sim-btn-primary"
            onClick={handleSimulate}
            disabled={!edgeId || busy}
          >
            <span className="material-symbols-outlined">{busy ? 'hourglass_top' : 'play_arrow'}</span>
            {disruptionBusy ? 'Running…' : 'Run Simulation'}
          </button>
          <button
            className="sim-btn sim-btn-secondary"
            onClick={handleScenario}
            disabled={!edgeId || busy}
          >
            <span className="material-symbols-outlined">{scenarioBusy ? 'hourglass_top' : 'auto_awesome'}</span>
            {scenarioBusy ? 'Analyzing…' : 'Full Scenario Preview'}
          </button>
          <button
            className="sim-btn sim-btn-outline"
            onClick={handleCompare}
            disabled={!edgeId || busy}
          >
            <span className="material-symbols-outlined">compare</span>
            Compare: Closure vs Risk
          </button>
        </div>

        <div className="sim-hint">
          <span className="material-symbols-outlined">info</span>
          Simulations are hypothetical — they never change the live Regional State.
        </div>
      </div>

      {/* Right: Results */}
      <div className="sim-results-panel">
        {busy && (
          <div className="view-loading">
            <span className="material-symbols-outlined spinning">progress_activity</span>
            <span>Running simulation…</span>
          </div>
        )}

        {!busy && !simResult && !scenarioResult && !scenarioComparison && (
          <div className="view-empty-state">
            <span className="material-symbols-outlined view-empty-icon">science</span>
            <h3>Configure & Run a Simulation</h3>
            <p>Select an edge and disruption type, then run a simulation to see hypothetical impacts on the network.</p>
          </div>
        )}

        {/* Simple sim result */}
        {!busy && simResult && !scenarioResult && (
          <div className="sim-result-card">
            <div className="sim-result-header">
              <span className="material-symbols-outlined">check_circle</span>
              <h3>Simulation Complete</h3>
              <button className="view-btn-text" onClick={clearSimResult}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="sim-result-body">
              <div className="sim-result-row">
                <span className="sim-result-label">Simulation ID:</span>
                <span className="sim-result-val">{simResult.simulation_id}</span>
              </div>
              <div className="sim-result-row">
                <span className="sim-result-label">Edge:</span>
                <span className="sim-result-val">{simResult.simulated_edge?.id}</span>
              </div>
              <div className="sim-result-row">
                <span className="sim-result-label">Event:</span>
                <span className="sim-result-val">{simResult.simulated_event?.type}</span>
              </div>
              <div className="sim-result-row">
                <span className="sim-result-label">New Status:</span>
                <span className={`sim-edge-status se-${simResult.simulated_edge?.status?.toLowerCase()}`}>
                  {simResult.simulated_edge?.status}
                </span>
              </div>
              {simResult.changed_nodes && simResult.changed_nodes.length > 0 && (
                <div className="sim-changes">
                  <h4>Changed Nodes ({simResult.changed_nodes.length})</h4>
                  {simResult.changed_nodes.map((n, i) => (
                    <div key={i} className="sim-change-row">
                      <span>{n.node_id || n.id}</span>
                      <span>{n.accessibility_before?.toFixed(1)} → {n.accessibility_after?.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Full scenario result */}
        {!busy && scenarioResult && (
          <div className="sim-result-card">
            <div className="sim-result-header">
              <span className="material-symbols-outlined">auto_awesome</span>
              <h3>Scenario Preview</h3>
              <button className="view-btn-text" onClick={clearScenarioResult}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="sim-result-body">
              {scenarioResult.scenario && (
                <div className="sim-result-row">
                  <span className="sim-result-label">Scenario:</span>
                  <span className="sim-result-val">{scenarioResult.scenario.simulation_id}</span>
                </div>
              )}
              {scenarioResult.hypothetical_impact && (
                <>
                  <div className="sim-result-row">
                    <span className="sim-result-label">Impact Score:</span>
                    <span className="sim-result-val sim-impact-score">
                      {scenarioResult.hypothetical_impact.impact_score}/100
                    </span>
                  </div>
                  <div className="sim-result-row">
                    <span className="sim-result-label">Impact Level:</span>
                    <span className="sim-result-val">{scenarioResult.hypothetical_impact.impact_level}</span>
                  </div>
                  {scenarioResult.hypothetical_impact.affected_villages && (
                    <div className="sim-result-row">
                      <span className="sim-result-label">Affected Villages:</span>
                      <span className="sim-result-val">{scenarioResult.hypothetical_impact.affected_villages.length}</span>
                    </div>
                  )}
                </>
              )}
              {scenarioResult.hypothetical_recommendations?.success && (
                <div className="sim-recs">
                  <h4>
                    <span className="material-symbols-outlined">lightbulb</span>
                    Recommendations
                  </h4>
                  <p>{scenarioResult.hypothetical_recommendations.action_plan?.explanation || 'Recommendation available.'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Comparison result */}
        {!busy && scenarioComparison && (
          <div className="sim-result-card">
            <div className="sim-result-header">
              <span className="material-symbols-outlined">compare</span>
              <h3>Scenario Comparison</h3>
              <button className="view-btn-text" onClick={clearScenarioResult}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="sim-compare-grid">
              <div className="sim-compare-col">
                <h4>Scenario A: Closure</h4>
                <div className="sim-result-row">
                  <span className="sim-result-label">Impact:</span>
                  <span className="sim-result-val">{scenarioComparison.scenario_a?.hypothetical_impact?.impact_score ?? '—'}/100</span>
                </div>
                <div className="sim-result-row">
                  <span className="sim-result-label">Level:</span>
                  <span className="sim-result-val">{scenarioComparison.scenario_a?.hypothetical_impact?.impact_level ?? '—'}</span>
                </div>
              </div>
              <div className="sim-compare-vs">VS</div>
              <div className="sim-compare-col">
                <h4>Scenario B: Risk Increase</h4>
                <div className="sim-result-row">
                  <span className="sim-result-label">Impact:</span>
                  <span className="sim-result-val">{scenarioComparison.scenario_b?.hypothetical_impact?.impact_score ?? '—'}/100</span>
                </div>
                <div className="sim-result-row">
                  <span className="sim-result-label">Level:</span>
                  <span className="sim-result-val">{scenarioComparison.scenario_b?.hypothetical_impact?.impact_level ?? '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
