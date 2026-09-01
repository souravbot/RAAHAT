// DisruptionControl — lets the operator apply a live disruption or run a
// What-If simulation against a selected transport edge.

import { useState } from 'react'
import { useTwinStore } from '../../state/useTwinStore'

const EDGE_META = { ROAD: 'Road', BRIDGE: 'Bridge' }

export default function DisruptionControl() {
  const nodes = useTwinStore((s) => s.nodes)
  const edges = useTwinStore((s) => s.edges)
  const applyLiveDisruption = useTwinStore((s) => s.applyLiveDisruption)
  const runSimulationNow = useTwinStore((s) => s.runSimulationNow)
  const runImpactAnalysis = useTwinStore((s) => s.runImpactAnalysis)
  const runScenarioNow = useTwinStore((s) => s.runScenarioNow)
  const runCompareScenarios = useTwinStore((s) => s.compareScenariosNow)
  const disruptionBusy = useTwinStore((s) => s.disruptionBusy)
  const disruptionError = useTwinStore((s) => s.disruptionError)
  const impactBusy = useTwinStore((s) => s.impactBusy)
  const scenarioBusy = useTwinStore((s) => s.scenarioBusy)
  const clearDisruptionError = useTwinStore((s) => s.clearDisruptionError)
  const clearImpactError = useTwinStore((s) => s.clearImpactError)
  const clearScenarioError = useTwinStore((s) => s.clearScenarioError)

  const [edgeId, setEdgeId] = useState('')
  const [type, setType] = useState('closure')
  const [riskDelta, setRiskDelta] = useState(20)
  const [actionMsg, setActionMsg] = useState(null)

  const byId = new Map(nodes.map((n) => [n.id, n]))

  const edgeLabel = (edge) => {
    const a = byId.get(edge.connects[0])
    const b = byId.get(edge.connects[1])
    const aName = a ? a.name : edge.connects[0]
    const bName = b ? b.name : edge.connects[1]
    return `${edge.id} — ${aName} ↔ ${bName} — ${EDGE_META[edge.type] || edge.type} · ${edge.status}`
  }

  const payload = () => ({
    edge_id: edgeId,
    type,
    risk_delta: riskDelta,
  })

  const selectedEdge = edges.find((e) => e.id === edgeId)

  const handleLive = async () => {
    if (!edgeId) return
    clearDisruptionError()
    setActionMsg(null)
    try {
      const res = await applyLiveDisruption(payload())
      setActionMsg({
        kind: 'live',
        text: `Edge ${res.updated_edge.id} is now ${res.updated_edge.status} (live v${res.regional_state_version}).`,
      })
    } catch (err) {
      // error surfaced via disruptionError
    }
  }

  const handleSimulate = async () => {
    if (!edgeId) return
    clearDisruptionError()
    setActionMsg(null)
    try {
      const res = await runSimulationNow(payload())
      setActionMsg({
        kind: 'sim',
        text: `Simulation ${res.simulation_id} created for edge ${res.simulated_edge.id}.`,
      })
    } catch (err) {
      // error surfaced via disruptionError
    }
  }

  const handleImpact = async () => {
    if (!edgeId) return
    clearImpactError()
    setActionMsg(null)
    try {
      const res = await runImpactAnalysis(edgeId)
      setActionMsg({
        kind: 'impact',
        text: `Impact analysis complete. Score: ${res.impact_score}, Level: ${res.impact_level}`,
      })
    } catch (err) {
      // error surfaced via impactError
    }
  }

  const handleScenario = async () => {
    if (!edgeId) return
    clearScenarioError()
    setActionMsg(null)
    try {
      const res = await runScenarioNow(payload())
      setActionMsg({
        kind: 'sim',
        text: `Scenario ${res.scenario?.simulation_id} complete. Impact: ${res.hypothetical_impact?.impact_score}, Recommendations: ${res.hypothetical_recommendations?.success ? 'Available' : 'None'}`,
      })
    } catch (err) {
      // error surfaced via scenarioError
    }
  }

  const handleCompare = async () => {
    if (!edgeId) return
    clearScenarioError()
    setActionMsg(null)
    try {
      const closurePayload = { ...payload(), type: 'closure' }
      const riskPayload = { ...payload(), type: 'risk_increase', risk_delta: 50 }
      const res = await runCompareScenarios(closurePayload, riskPayload)
      setActionMsg({
        kind: 'sim',
        text: `Comparison complete: ${res.scenario_a?.simulation_id} vs ${res.scenario_b?.simulation_id}`,
      })
    } catch (err) {
      // error surfaced via scenarioError
    }
  }

  return (
    <div className="control-panel">
      <div className="control-header">
        <span className="control-title">DISRUPTION CONTROL</span>
        <span className="live-badge">LIVE REGIONAL STATE</span>
      </div>

      <label className="control-legend-label">Transport connection</label>
      <select
        className="control-select"
        value={edgeId}
        onChange={(e) => setEdgeId(e.target.value)}
      >
        <option value="">Select an edge…</option>
        {edges.map((edge) => (
          <option key={edge.id} value={edge.id}>
            {edgeLabel(edge)}
          </option>
        ))}
      </select>

      <div className="control-row">
        <div className="control-field">
          <label className="control-legend-label">Disruption type</label>
          <select
            className="control-select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="closure">Closure</option>
            <option value="risk_increase">Risk Increase</option>
          </select>
        </div>

        {type === 'risk_increase' && (
          <div className="control-field">
            <label className="control-legend-label">Risk increase (+)</label>
            <input
              className="control-input"
              type="number"
              min="0"
              max="100"
              value={riskDelta}
              onChange={(e) => setRiskDelta(Number(e.target.value))}
            />
          </div>
        )}
      </div>

      {selectedEdge && (
        <div className="edge-summary">
          <span className="edge-summary-status" style={{ background: '#e2e8f0' }}>
            Current: {selectedEdge.status} · risk {selectedEdge.risk_score}/100
          </span>
        </div>
      )}

      {disruptionError && (
        <div className="control-error" onClick={clearDisruptionError}>
          {disruptionError}
        </div>
      )}

      {actionMsg && (
        <div className={`action-msg ${actionMsg.kind}`}>{actionMsg.text}</div>
      )}

      <div className="control-actions">
        <button
          className="btn btn-live"
          onClick={handleLive}
          disabled={!edgeId || disruptionBusy}
          title="Applies to the live Regional State"
        >
          {disruptionBusy ? 'Working…' : 'APPLY LIVE DISRUPTION'}
        </button>
        <button
          className="btn btn-sim"
          onClick={handleSimulate}
          disabled={!edgeId || disruptionBusy}
          title="Creates a hypothetical scenario, never touches live state"
        >
          {disruptionBusy ? 'Working…' : 'RUN WHAT-IF SIMULATION'}
        </button>
        <button
          className="btn btn-impact"
          onClick={handleImpact}
          disabled={!edgeId || disruptionBusy || impactBusy}
          title="Analyze cascading impact of closing this edge"
        >
          {impactBusy ? 'Analyzing…' : 'ANALYZE IMPACT'}
        </button>
        <button
          className="btn btn-scenario"
          onClick={handleScenario}
          disabled={!edgeId || scenarioBusy}
          title="Run full scenario: simulate + impact + recommendations"
        >
          {scenarioBusy ? 'Working…' : 'SCENARIO PREVIEW'}
        </button>
        <button
          className="btn btn-compare"
          onClick={handleCompare}
          disabled={!edgeId || scenarioBusy}
          title="Compare two scenarios side-by-side"
        >
          {scenarioBusy ? 'Working…' : 'COMPARE SCENARIOS'}
        </button>
      </div>
      <div className="control-hint">
        Live disruptions change the actual Regional State. Simulations are hypothetical only. Impact analysis shows cascading consequences.
      </div>
    </div>
  )
}
