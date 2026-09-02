// ScenarioComparisonView — Side-by-Side What-If Scenario Comparison & Decision Support (Phase 20).
// Consumes real backend POST /scenario/compare endpoint.
// Answers:
// 1. Which scenario has higher operational risk?
// 2. Which scenario causes greater disruption?
// 3. Which scenario has better accessibility?
// 4. Which response route is safer/better?
// 5. How does the recommended action change?
// 6. Why is one scenario preferable? (Deterministic comparison logic)

import { useState, useMemo } from 'react'
import { useTwinStore } from '../state/useTwinStore'
import MapView from '../map/MapView'

const EDGE_META = { ROAD: 'Road Corridor', BRIDGE: 'Bridge Crossing' }

export default function ScenarioComparisonView() {
  const nodes = useTwinStore((s) => s.nodes)
  const edges = useTwinStore((s) => s.edges)
  const compareScenariosNow = useTwinStore((s) => s.compareScenariosNow)
  const scenarioComparison = useTwinStore((s) => s.scenarioComparison)
  const scenarioBusy = useTwinStore((s) => s.scenarioBusy)
  const scenarioError = useTwinStore((s) => s.scenarioError)
  const clearScenarioError = useTwinStore((s) => s.clearScenarioError)
  const selectEdge = useTwinStore((s) => s.selectEdge)
  const focusNode = useTwinStore((s) => s.focusNode)
  const selectPriorityTarget = useTwinStore((s) => s.selectPriorityTarget)

  // Independent Scenario Configurations (Step 5)
  const [edgeIdA, setEdgeIdA] = useState('E023') // Default: Valley Spur ↔ Far Bank River Bridge
  const [typeA, setTypeA] = useState('closure')
  const [riskDeltaA, setRiskDeltaA] = useState(30)

  const [edgeIdB, setEdgeIdB] = useState('E027') // Default: Tea Belt ↔ Deep Gorge Bridge
  const [typeB, setTypeB] = useState('closure')
  const [riskDeltaB, setRiskDeltaB] = useState(50)

  // Map view switcher (Step 11)
  const [activeMapScenario, setActiveMapScenario] = useState('A') // 'A' | 'B'

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const getEdgeTitle = (edge) => {
    const a = byId.get(edge.connects[0])
    const b = byId.get(edge.connects[1])
    return `${a?.name || edge.connects[0]} ↔ ${b?.name || edge.connects[1]}`
  }

  const selectedEdgeA = edges.find((e) => e.id === edgeIdA)
  const selectedEdgeB = edges.find((e) => e.id === edgeIdB)

  // Run side-by-side comparison
  const handleCompare = async () => {
    if (!edgeIdA || !edgeIdB) return
    if (clearScenarioError) clearScenarioError()
    const payloadA = {
      edge_id: edgeIdA,
      type: typeA,
      risk_delta: typeA === 'risk_increase' ? Number(riskDeltaA) : 0,
    }
    const payloadB = {
      edge_id: edgeIdB,
      type: typeB,
      risk_delta: typeB === 'risk_increase' ? Number(riskDeltaB) : 0,
    }
    try {
      await compareScenariosNow(payloadA, payloadB)
    } catch {}
  }

  // Swap Scenarios A and B
  const handleSwap = () => {
    const tempEdge = edgeIdA
    const tempType = typeA
    const tempRisk = riskDeltaA
    setEdgeIdA(edgeIdB)
    setTypeA(typeB)
    setRiskDeltaA(riskDeltaB)
    setEdgeIdB(tempEdge)
    setTypeB(tempType)
    setRiskDeltaB(tempRisk)
  }

  // Reset Scenarios
  const handleResetA = () => {
    setEdgeIdA('E023')
    setTypeA('closure')
    setRiskDeltaA(30)
  }

  const handleResetB = () => {
    setEdgeIdB('E027')
    setTypeB('closure')
    setRiskDeltaB(50)
  }

  const resA = scenarioComparison?.scenario_a
  const resB = scenarioComparison?.scenario_b
  const impactA = resA?.hypothetical_impact
  const impactB = resB?.hypothetical_impact
  const recsA = resA?.hypothetical_recommendations?.plan
  const recsB = resB?.hypothetical_recommendations?.plan

  // ── Deterministic Decision Insight Logic (Step 9 & 10) ──
  const decisionInsight = useMemo(() => {
    if (!impactA || !impactB) return null

    const scoreA = impactA.impact_score ?? 0
    const scoreB = impactB.impact_score ?? 0
    const isolatedA = impactA.regional_metrics?.newly_isolated_count ?? 0
    const isolatedB = impactB.regional_metrics?.newly_isolated_count ?? 0
    const popA = impactA.regional_metrics?.affected_population ?? 0
    const popB = impactB.regional_metrics?.affected_population ?? 0
    const routeCostA = recsA?.selected_route?.weighted_cost ?? 999
    const routeCostB = recsB?.selected_route?.weighted_cost ?? 999

    const deltas = []

    // Impact Score Comparison
    if (Math.abs(scoreA - scoreB) > 0.1) {
      if (scoreA < scoreB) {
        deltas.push(`Scenario A produces ${(scoreB - scoreA).toFixed(1)} points lower overall regional impact score.`)
      } else {
        deltas.push(`Scenario B produces ${(scoreA - scoreB).toFixed(1)} points lower overall regional impact score.`)
      }
    }

    // Isolated Communities Comparison
    if (isolatedA !== isolatedB) {
      if (isolatedA < isolatedB) {
        deltas.push(`Scenario A preserves ground access for ${isolatedB - isolatedA} more community than Scenario B.`)
      } else {
        deltas.push(`Scenario B isolates ${isolatedA - isolatedB} fewer community (${isolatedB} vs ${isolatedA}).`)
      }
    }

    // Population at Risk Comparison
    if (popA !== popB) {
      if (popA < popB) {
        deltas.push(`Scenario A places ${Number(popB - popA).toLocaleString()} fewer residents at risk.`)
      } else {
        deltas.push(`Scenario B places ${Number(popA - popB).toLocaleString()} fewer residents at risk (${Number(popB).toLocaleString()} vs ${Number(popA).toLocaleString()}).`)
      }
    }

    // Dispatch Route Comparison
    if (Math.abs(routeCostA - routeCostB) > 0.5 && routeCostA < 900 && routeCostB < 900) {
      if (routeCostA < routeCostB) {
        deltas.push(`Scenario A enables a safer emergency dispatch route with ${(routeCostB - routeCostA).toFixed(1)} lower weighted risk cost.`)
      } else {
        deltas.push(`Scenario B enables a safer emergency dispatch route with ${(routeCostA - routeCostB).toFixed(1)} lower weighted risk cost.`)
      }
    }

    // Preferred Scenario Determination
    let preferred = 'EQUAL'
    let preferredReason = 'Both scenarios produce equivalent operational disruption across all monitored indicators.'

    if (scoreA < scoreB && isolatedA <= isolatedB) {
      preferred = 'A'
      preferredReason = `Scenario A is operationally preferable: it produces lower overall cascade impact (${scoreA.toFixed(1)} vs ${scoreB.toFixed(1)}) and maintains better community accessibility.`
    } else if (scoreB < scoreA && isolatedB <= isolatedA) {
      preferred = 'B'
      preferredReason = `Scenario B is operationally preferable: it produces lower overall cascade impact (${scoreB.toFixed(1)} vs ${scoreA.toFixed(1)}) and places fewer residents in severed catchments.`
    } else if (isolatedA < isolatedB) {
      preferred = 'A'
      preferredReason = `Scenario A is preferable for life safety: it avoids isolating ${isolatedB} communities.`
    } else if (isolatedB < isolatedA) {
      preferred = 'B'
      preferredReason = `Scenario B is preferable for life safety: it avoids isolating ${isolatedA} communities.`
    }

    return {
      preferred,
      preferredReason,
      deltas,
      scoreA,
      scoreB,
      isolatedA,
      isolatedB,
      popA,
      popB,
      routeCostA,
      routeCostB,
    }
  }, [impactA, impactB, recsA, recsB])

  return (
    <div className="scenario-comp-view-container" id="scenario-comp-view">
      {/* ============================================================
          AREA A: HEADER & CONTEXT
          ============================================================ */}
      <header className="scenario-comp-header-strip">
        <div className="sch-header-left">
          <div className="sch-view-title-group">
            <span className="material-symbols-outlined sch-main-icon">compare_arrows</span>
            <div>
              <h1 className="sch-page-heading">What-If Scenario Comparison &amp; Decision Support</h1>
              <span className="sch-page-sub">
                Evaluate trade-offs between alternative disruptions and deployment strategies on isolated graph snapshots
              </span>
            </div>
          </div>
        </div>

        <div className="sch-header-right">
          <div className="sch-context-badge">
            <span className="mode-dot dot-sim"></span>
            <span>WHAT-IF SIMULATION ANALYSIS (NON-LIVE)</span>
          </div>

          <button className="btn-sch-swap" onClick={handleSwap} title="Swap Scenario A and B">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>swap_horiz</span>
            Swap A ⇄ B
          </button>
        </div>
      </header>

      {/* Error alert */}
      {scenarioError && (
        <div className="sch-alert alert-error">
          <span className="material-symbols-outlined">error</span>
          <span>{scenarioError}</span>
        </div>
      )}

      {/* ============================================================
          AREA B: SCENARIO SETUP CONFIGURATION GRID (Step 5)
          ============================================================ */}
      <div className="scenario-setup-grid">
        {/* Scenario A Card */}
        <div className="scenario-config-card card-scenario-a">
          <div className="scc-header">
            <div className="scc-title-wrap">
              <span className="scc-badge badge-a">SCENARIO A</span>
              <span className="scc-label">Baseline Disruption</span>
            </div>
            <button className="btn-scc-reset" onClick={handleResetA} title="Reset Scenario A">
              Reset A
            </button>
          </div>

          <div className="scc-form">
            <div className="form-group">
              <label className="form-label">TARGET CORRIDOR</label>
              <select
                className="form-select"
                value={edgeIdA}
                onChange={(e) => setEdgeIdA(e.target.value)}
              >
                {edges.map((edge) => (
                  <option key={edge.id} value={edge.id}>
                    {edge.id} — {getEdgeTitle(edge)} ({edge.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">TYPE</label>
                <select
                  className="form-select"
                  value={typeA}
                  onChange={(e) => setTypeA(e.target.value)}
                >
                  <option value="closure">Total Closure (Sever Link)</option>
                  <option value="risk_increase">Risk Elevation</option>
                </select>
              </div>

              {typeA === 'risk_increase' && (
                <div className="form-group flex-1">
                  <label className="form-label">RISK DELTA (+)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="5"
                    max="100"
                    step="5"
                    value={riskDeltaA}
                    onChange={(e) => setRiskDeltaA(Number(e.target.value))}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Center in Middle */}
        <div className="scenario-action-center">
          <button
            className="btn-run-compare-action"
            onClick={handleCompare}
            disabled={!edgeIdA || !edgeIdB || scenarioBusy}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {scenarioBusy ? 'hourglass_top' : 'bolt'}
            </span>
            {scenarioBusy ? 'Executing Comparison Pipeline…' : '⚡ Run Side-by-Side Comparison'}
          </button>
          <span className="sac-note">Evaluates simulation, impact &amp; routing on 2 cloned graph snapshots</span>
        </div>

        {/* Scenario B Card */}
        <div className="scenario-config-card card-scenario-b">
          <div className="scc-header">
            <div className="scc-title-wrap">
              <span className="scc-badge badge-b">SCENARIO B</span>
              <span className="scc-label">Alternative Disruption</span>
            </div>
            <button className="btn-scc-reset" onClick={handleResetB} title="Reset Scenario B">
              Reset B
            </button>
          </div>

          <div className="scc-form">
            <div className="form-group">
              <label className="form-label">TARGET CORRIDOR</label>
              <select
                className="form-select"
                value={edgeIdB}
                onChange={(e) => setEdgeIdB(e.target.value)}
              >
                {edges.map((edge) => (
                  <option key={edge.id} value={edge.id}>
                    {edge.id} — {getEdgeTitle(edge)} ({edge.status})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label className="form-label">TYPE</label>
                <select
                  className="form-select"
                  value={typeB}
                  onChange={(e) => setTypeB(e.target.value)}
                >
                  <option value="closure">Total Closure (Sever Link)</option>
                  <option value="risk_increase">Risk Elevation</option>
                </select>
              </div>

              {typeB === 'risk_increase' && (
                <div className="form-group flex-1">
                  <label className="form-label">RISK DELTA (+)</label>
                  <input
                    className="form-input"
                    type="number"
                    min="5"
                    max="100"
                    step="5"
                    value={riskDeltaB}
                    onChange={(e) => setRiskDeltaB(Number(e.target.value))}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================
          AREA C: COMPARISON RESULTS & DECISION INSIGHT (Step 7, 8, 9, 10)
          ============================================================ */}
      {decisionInsight && (
        <div className="scenario-results-section">
          {/* ── DETERMINISTIC DECISION INSIGHT BOX (Step 9 & 10) ── */}
          <div className="decision-insight-card">
            <div className="dic-header">
              <span className="material-symbols-outlined dic-icon">psychology</span>
              <div>
                <span className="dic-tag">DETERMINISTIC DECISION INSIGHT</span>
                <h3 className="dic-title">{decisionInsight.preferredReason}</h3>
              </div>
              {decisionInsight.preferred !== 'EQUAL' && (
                <span className={`dic-winner-badge badge-${decisionInsight.preferred.toLowerCase()}`}>
                  PREFER SCENARIO {decisionInsight.preferred}
                </span>
              )}
            </div>

            {decisionInsight.deltas?.length > 0 && (
              <div className="dic-deltas-list">
                <span className="dic-deltas-title">KEY MEASURABLE DIFFERENCES:</span>
                {decisionInsight.deltas.map((d, idx) => (
                  <div key={idx} className="dic-delta-row">
                    <span className="material-symbols-outlined delta-bullet">check</span>
                    <span>{d}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 2-COLUMN SIDE-BY-SIDE BREAKDOWN GRID (Step 7 & 12) ── */}
          <div className="side-by-side-comparison-grid">
            {/* Column A */}
            <div className="scenario-col col-a">
              <div className="sc-header header-a">
                <span className="sc-badge badge-a">SCENARIO A RESULT</span>
                <h4>Corridor {resA?.simulated_edge?.id || edgeIdA}</h4>
              </div>

              <div className="sc-body">
                {/* Metric Summary */}
                <div className="sc-metric-tiles">
                  <div className="sc-tile">
                    <span className="sc-tile-val">{impactA?.impact_score?.toFixed(1) ?? '—'}</span>
                    <span className="sc-tile-lbl">Impact Score</span>
                  </div>
                  <div className="sc-tile">
                    <span className="sc-tile-val">{impactA?.regional_metrics?.newly_isolated_count ?? 0}</span>
                    <span className="sc-tile-lbl">Newly Isolated</span>
                  </div>
                  <div className="sc-tile">
                    <span className="sc-tile-val">{Number(impactA?.regional_metrics?.affected_population ?? 0).toLocaleString()}</span>
                    <span className="sc-tile-lbl">Pop. At Risk</span>
                  </div>
                </div>

                {/* Impact Narrative */}
                {impactA?.impact_summary && (
                  <div className="sc-summary-box">
                    <strong>Cascade Impact:</strong>
                    <p>{impactA.impact_summary}</p>
                  </div>
                )}

                {/* Response Strategy Breakdown (Step 12) */}
                <div className="sc-strategy-box">
                  <span className="strategy-heading">OPTIMIZED RESPONSE STRATEGY</span>
                  <div className="strategy-row">
                    <span>Source Warehouse:</span>
                    <strong>{recsA?.selected_warehouse?.name || 'W001'}</strong>
                  </div>
                  <div className="strategy-row">
                    <span>Assigned Vehicle:</span>
                    <strong>{recsA?.selected_vehicle?.id || 'VEH-002'} ({recsA?.selected_vehicle?.type || 'Truck'})</strong>
                  </div>
                  <div className="strategy-row">
                    <span>Route Cost:</span>
                    <strong>{recsA?.selected_route?.total_distance ?? 0} km (Cost: {recsA?.selected_route?.weighted_cost ?? 0})</strong>
                  </div>
                </div>

                {/* Explainability Reasons */}
                {recsA?.reasons?.length > 0 && (
                  <div className="sc-reasons-box">
                    <span className="reasons-heading">DECISION RATIONALE:</span>
                    <ul>
                      {recsA.reasons.slice(0, 3).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Column B */}
            <div className="scenario-col col-b">
              <div className="sc-header header-b">
                <span className="sc-badge badge-b">SCENARIO B RESULT</span>
                <h4>Corridor {resB?.simulated_edge?.id || edgeIdB}</h4>
              </div>

              <div className="sc-body">
                {/* Metric Summary */}
                <div className="sc-metric-tiles">
                  <div className="sc-tile">
                    <span className="sc-tile-val">{impactB?.impact_score?.toFixed(1) ?? '—'}</span>
                    <span className="sc-tile-lbl">Impact Score</span>
                  </div>
                  <div className="sc-tile">
                    <span className="sc-tile-val">{impactB?.regional_metrics?.newly_isolated_count ?? 0}</span>
                    <span className="sc-tile-lbl">Newly Isolated</span>
                  </div>
                  <div className="sc-tile">
                    <span className="sc-tile-val">{Number(impactB?.regional_metrics?.affected_population ?? 0).toLocaleString()}</span>
                    <span className="sc-tile-lbl">Pop. At Risk</span>
                  </div>
                </div>

                {/* Impact Narrative */}
                {impactB?.impact_summary && (
                  <div className="sc-summary-box">
                    <strong>Cascade Impact:</strong>
                    <p>{impactB.impact_summary}</p>
                  </div>
                )}

                {/* Response Strategy Breakdown (Step 12) */}
                <div className="sc-strategy-box">
                  <span className="strategy-heading">OPTIMIZED RESPONSE STRATEGY</span>
                  <div className="strategy-row">
                    <span>Source Warehouse:</span>
                    <strong>{recsB?.selected_warehouse?.name || 'W001'}</strong>
                  </div>
                  <div className="strategy-row">
                    <span>Assigned Vehicle:</span>
                    <strong>{recsB?.selected_vehicle?.id || 'VEH-002'} ({recsB?.selected_vehicle?.type || 'Truck'})</strong>
                  </div>
                  <div className="strategy-row">
                    <span>Route Cost:</span>
                    <strong>{recsB?.selected_route?.total_distance ?? 0} km (Cost: {recsB?.selected_route?.weighted_cost ?? 0})</strong>
                  </div>
                </div>

                {/* Explainability Reasons */}
                {recsB?.reasons?.length > 0 && (
                  <div className="sc-reasons-box">
                    <span className="reasons-heading">DECISION RATIONALE:</span>
                    <ul>
                      {recsB.reasons.slice(0, 3).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          AREA D: EMBEDDED MAP WITH SCENARIO SWITCHER (Step 11)
          ============================================================ */}
      <div className="scenario-map-section">
        <div className="s-map-card">
          <div className="s-map-header">
            <div className="s-map-title">
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--navy-500)' }}>hub</span>
              <span>Spatial Scenario Visualizer</span>
            </div>

            {/* Scenario A vs B Map Switcher */}
            <div className="s-map-switcher">
              <button
                className={`s-switch-btn ${activeMapScenario === 'A' ? 'is-active-a' : ''}`}
                onClick={() => {
                  setActiveMapScenario('A')
                  if (edgeIdA) selectEdge(edgeIdA)
                }}
              >
                ● Scenario A Map ({edgeIdA})
              </button>
              <button
                className={`s-switch-btn ${activeMapScenario === 'B' ? 'is-active-b' : ''}`}
                onClick={() => {
                  setActiveMapScenario('B')
                  if (edgeIdB) selectEdge(edgeIdB)
                }}
              >
                ● Scenario B Map ({edgeIdB})
              </button>
            </div>
          </div>

          <div className="s-map-canvas-wrap">
            <MapView />
          </div>
        </div>
      </div>
    </div>
  )
}
