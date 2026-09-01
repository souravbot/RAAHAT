// ScenarioPreview — shows a complete what-if scenario (impact + recommendations)
// without mutating the live Regional Twin.

import { useState } from 'react'
import { useTwinStore } from '../../state/useTwinStore'

export default function ScenarioPreview() {
  const scenarioResult = useTwinStore((s) => s.scenarioResult)
  const scenarioBusy = useTwinStore((s) => s.scenarioBusy)
  const scenarioError = useTwinStore((s) => s.scenarioError)
  const clearScenarioResult = useTwinStore((s) => s.clearScenarioResult)
  const clearScenarioError = useTwinStore((s) => s.clearScenarioError)

  const [activeTab, setActiveTab] = useState('impact') // 'impact' | 'recommendations'

  if (!scenarioResult) return null

  const impact = scenarioResult.hypothetical_impact
  const recs = scenarioResult.hypothetical_recommendations
  const sim = scenarioResult.scenario

  return (
    <div className="scenario-preview control-panel">
      <div className="scenario-header">
        <span className="control-title">SCENARIO PREVIEW</span>
        <span className="sim-badge">HYPOTHETICAL</span>
        <button
          className="icon-btn"
          onClick={clearScenarioResult}
          title="Dismiss"
          aria-label="Dismiss scenario preview"
        >
          ✕
        </button>
      </div>

      {scenarioError && (
        <div className="control-error" onClick={clearScenarioError}>
          {scenarioError}
        </div>
      )}

      {scenarioBusy && <div className="loading-indicator">Analyzing scenario…</div>}

      {!scenarioBusy && sim && (
        <div className="scenario-meta">
          <div className="scenario-id">{sim.simulation_id}</div>
          <div className="scenario-scenario">
            <strong>Edge:</strong> {sim.simulated_edge?.id} ({sim.simulated_edge?.connects?.join(' ↔ ')})
            <span className="scenario-separator">•</span>
            <strong>Type:</strong> {sim.simulated_event?.type === 'CLOSURE' ? 'Closure' : 'Risk Increase'}
          </div>
        </div>
      )}

      <div className="scenario-tabs">
        <button
          className={`scenario-tab ${activeTab === 'impact' ? 'active' : ''}`}
          onClick={() => setActiveTab('impact')}
        >
          Impact Analysis
        </button>
        <button
          className={`scenario-tab ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
          disabled={!recs}
        >
          Recommendations
        </button>
      </div>

      {activeTab === 'impact' && impact && (
        <ScenarioImpactView impact={impact} />
      )}

      {activeTab === 'recommendations' && (
        <ScenarioRecommendationsView recs={recs} />
      )}
    </div>
  )
}

function ScenarioImpactView({ impact }) {
  if (!impact) return <div className="no-data">No impact data available.</div>

  const { impact_score, impact_level, impact_components, regional_metrics, impact_summary } = impact
  const isCritical = impact_level === 'CRITICAL'
  const isHigh = impact_level === 'HIGH'

  return (
    <div className="scenario-impact-view">
      <div className={`impact-score ${isCritical ? 'critical' : isHigh ? 'high' : ''}`}>
        <div className="impact-score-label">Impact Score</div>
        <div className="impact-score-value">{impact_score} / 100</div>
        <div className={`impact-level ${impact_level?.toLowerCase()}`}>{impact_level}</div>
      </div>

      <div className="impact-components">
        <span>Population: {impact_components?.population_impact ?? 0}</span>
        <span>Accessibility: {impact_components?.accessibility_impact ?? 0}</span>
        <span>Isolation: {impact_components?.isolation_impact ?? 0}</span>
        <span>Service: {impact_components?.service_impact ?? 0}</span>
      </div>

      <div className="impact-metrics">
        <div className="metric-item">
          <div className="metric-value">{regional_metrics?.affected_villages_count ?? 0}</div>
          <div className="metric-label">Affected Villages</div>
        </div>
        <div className="metric-item">
          <div className="metric-value">{regional_metrics?.affected_population ?? 0}</div>
          <div className="metric-label">Affected Population</div>
        </div>
        <div className="metric-item">
          <div className="metric-value">{regional_metrics?.newly_isolated_count ?? 0}</div>
          <div className="metric-label">Newly Isolated</div>
        </div>
        <div className="metric-item">
          <div className="metric-value">{regional_metrics?.dependency_level ?? 'LOW'}</div>
          <div className="metric-label">Dependency Level</div>
        </div>
      </div>

      <div className="scenario-summary">
        <strong>Why this matters:</strong> {impact_summary}
      </div>
    </div>
  )
}

function ScenarioRecommendationsView({ recs }) {
  if (!recs) return <div className="no-data">No recommendation generated.</div>
  if (recs.success === false) {
    return (
      <div className="scenario-failed">
        <div className="action-failed-message">{recs.message}</div>
        {recs.reasons?.length > 0 && (
          <ul className="action-reasons-list">
            {recs.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  const { selected_warehouse, selected_vehicle, selected_route, vehicle_to_warehouse_route, steps, reasons } = recs

  return (
    <div className="scenario-recs-view">
      <div className="scenario-recs-facts">
        <div className="scenario-fact">
          <span className="scenario-fact-label">Warehouse</span>
          <span className="scenario-fact-value">{selected_warehouse?.id}</span>
        </div>
        <div className="scenario-fact">
          <span className="scenario-fact-label">Vehicle</span>
          <span className="scenario-fact-value">{selected_vehicle?.id} ({selected_vehicle?.type})</span>
        </div>
        <div className="scenario-fact">
          <span className="scenario-fact-label">Route</span>
          <span className="scenario-fact-value">{selected_route?.total_distance} km</span>
        </div>
      </div>

      {reasons?.length > 0 && (
        <div className="scenario-reasons">
          <strong>Why this recommendation?</strong>
          <ul className="action-reasons-list">
            {reasons.map((r, i) => (
              <li key={i}>✓ {r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="scenario-steps">
        <strong>Execution Steps</strong>
        <ol className="action-steps">
          {(steps || []).map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    </div>
  )
}