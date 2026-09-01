// ScenarioComparison — side-by-side comparison of two what-if scenarios.

import { useState } from 'react'
import { useTwinStore } from '../../state/useTwinStore'

export default function ScenarioComparison() {
  const scenarioComparison = useTwinStore((s) => s.scenarioComparison)
  const scenarioBusy = useTwinStore((s) => s.scenarioBusy)
  const scenarioError = useTwinStore((s) => s.scenarioError)
  const clearScenarioResult = useTwinStore((s) => s.clearScenarioResult)

  const [activeView, setActiveView] = useState('impact') // 'impact' | 'recommendations'

  if (!scenarioComparison) return null

  const a = scenarioComparison.scenario_a
  const b = scenarioComparison.scenario_b

  return (
    <div className="scenario-comparison control-panel">
      <div className="scenario-comp-header">
        <span className="control-title">SCENARIO COMPARISON</span>
        <span className="sim-badge">HYPOTHETICAL</span>
        <button
          className="icon-btn"
          onClick={clearScenarioResult}
          title="Dismiss"
          aria-label="Dismiss comparison"
        >
          ✕
        </button>
      </div>

      {scenarioError && (
        <div className="control-error" onClick={() => useTwinStore.getState().clearScenarioError()}>
          {scenarioError}
        </div>
      )}

      {scenarioBusy && <div className="loading-indicator">Comparing scenarios…</div>}

      <div className="scenario-tabs">
        <button
          className={`scenario-tab ${activeView === 'impact' ? 'active' : ''}`}
          onClick={() => setActiveView('impact')}
        >
          Impact Comparison
        </button>
        <button
          className={`scenario-tab ${activeView === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveView('recommendations')}
          disabled={!a?.hypothetical_recommendations || !b?.hypothetical_recommendations}
        >
          Recommendations
        </button>
      </div>

      {activeView === 'impact' && (
        <ScenarioImpactCompare a={a} b={b} />
      )}

      {activeView === 'recommendations' && (
        <ScenarioRecsCompare a={a} b={b} />
      )}
    </div>
  )
}

function ScenarioImpactCompare({ a, b }) {
  const impactA = a?.hypothetical_impact
  const impactB = b?.hypothetical_impact
  const scenarioInfoA = a
  const scenarioInfoB = b

  return (
    <div className="scenario-comp-grid">
      <div className="scenario-comp-col">
        <div className="comp-col-header">
          <strong>Scenario A</strong>
          <span className="sim-badge">SIMULATED</span>
        </div>
        {impactA ? <ImpactColumn impact={impactA} scenarioInfo={scenarioInfoA} /> : <div className="no-data">No impact data</div>}
      </div>
      <div className="scenario-comp-col">
        <div className="comp-col-header">
          <strong>Scenario B</strong>
          <span className="sim-badge">SIMULATED</span>
        </div>
        {impactB ? <ImpactColumn impact={impactB} scenarioInfo={scenarioInfoB} /> : <div className="no-data">No impact data</div>}
      </div>
    </div>
  )
}

function ImpactColumn({ impact, scenarioInfo }) {
  const { impact_score, impact_level, impact_components, regional_metrics } = impact
  const isCritical = impact_level === 'CRITICAL'
  const isHigh = impact_level === 'HIGH'

  return (
    <div className="comp-impact-col">
      <div className={`impact-score ${isCritical ? 'critical' : isHigh ? 'high' : ''}`}>
        <div className="impact-score-value">{impact_score} / 100</div>
        <div className={`impact-level ${impact_level?.toLowerCase()}`}>{impact_level}</div>
      </div>

      <div className="comp-components">
        <span>Pop: {impact_components?.population_impact ?? 0}</span>
        <span>Access: {impact_components?.accessibility_impact ?? 0}</span>
        <span>Isolation: {impact_components?.isolation_impact ?? 0}</span>
        <span>Service: {impact_components?.service_impact ?? 0}</span>
      </div>

      <div className="comp-metrics">
        <div className="comp-metric">
          <div className="comp-metric-value">{regional_metrics?.affected_villages_count ?? 0}</div>
          <div className="comp-metric-label">Villages</div>
        </div>
        <div className="comp-metric">
          <div className="comp-metric-value">{regional_metrics?.affected_population ?? 0}</div>
          <div className="comp-metric-label">Population</div>
        </div>
        <div className="comp-metric">
          <div className="comp-metric-value">{regional_metrics?.newly_isolated_count ?? 0}</div>
          <div className="comp-metric-label">Isolated</div>
        </div>
        <div className="comp-metric">
          <div className="comp-metric-value">{regional_metrics?.dependency_level ?? 'LOW'}</div>
          <div className="comp-metric-label">Dependency</div>
        </div>
      </div>

      {scenarioInfo && (
        <div className="comp-scenario">
          <strong>Edge:</strong> {scenarioInfo?.simulated_edge?.id} ({scenarioInfo?.simulated_event?.type === 'CLOSURE' ? 'Closure' : 'Risk'})
        </div>
      )}
    </div>
  )
}

function ScenarioRecsCompare({ a, b }) {
  const recA = a?.hypothetical_recommendations
  const recB = b?.hypothetical_recommendations

  if (!recA || !recB) return <div className="no-data">Recommendations not available for both scenarios.</div>

  return (
    <div className="scenario-comp-grid">
      <div className="scenario-comp-col">
        <div className="comp-col-header">
          <strong>Scenario A</strong>
          <span className="sim-badge">SIMULATED</span>
        </div>
        {recA ? <RecsColumn recs={recA} /> : <div className="no-data">No recommendation</div>}
      </div>
      <div className="scenario-comp-col">
        <div className="comp-col-header">
          <strong>Scenario B</strong>
          <span className="sim-badge">SIMULATED</span>
        </div>
        {recB ? <RecsColumn recs={recB} /> : <div className="no-data">No recommendation</div>}
      </div>
    </div>
  )
}

function RecsColumn({ recs }) {
  if (recs.success === false) {
    return (
      <div className="scenario-failed">
        <div className="action-failed-message">{recs.message}</div>
      </div>
    )
  }

  const { selected_warehouse, selected_vehicle, selected_route, steps, reasons } = recs

  return (
    <div className="comp-recs-col">
      <div className="comp-recs-facts">
        <div className="comp-fact">
          <span className="comp-fact-label">Warehouse</span>
          <span className="comp-fact-value">{selected_warehouse?.id}</span>
        </div>
        <div className="comp-fact">
          <span className="comp-fact-label">Vehicle</span>
          <span className="comp-fact-value">{selected_vehicle?.id}</span>
        </div>
        <div className="comp-fact">
          <span className="comp-fact-label">Distance</span>
          <span className="comp-fact-value">{selected_route?.total_distance ?? '—'} km</span>
        </div>
        <div className="comp-fact">
          <span className="comp-fact-label">Delivery time</span>
          <span className="comp-fact-value">{selected_route?.weighted_cost ?? '—'} min</span>
        </div>
        <div className="comp-fact">
          <span className="comp-fact-label">Risk</span>
          <span className="comp-fact-value">{recs.request?.priority || recs.selected_route?.at_risk_segments || 'LOW'}</span>
        </div>
      </div>

      <div className="comp-steps">
        <strong>Steps</strong>
        <ol className="action-steps">
          {(steps || []).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      {reasons?.length > 0 && (
        <div className="comp-reasons">
          <strong>Why?</strong>
          <ul className="action-reasons-list">
            {reasons.map((r, i) => (
              <li key={i}>✓ {r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
