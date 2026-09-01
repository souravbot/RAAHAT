// ImpactAnalysisPanel — Displays cascading impact analysis results.

import { useTwinStore } from '../../state/useTwinStore'

const IMPACT_LEVEL_STYLE = {
  CRITICAL: { bg: 'rgba(220, 38, 38, 0.12)', border: 'rgba(220, 38, 38, 0.3)', color: '#b91c1c' },
  HIGH: { bg: 'rgba(217, 76, 60, 0.12)', border: 'rgba(217, 76, 60, 0.3)', color: '#c0392b' },
  MODERATE: { bg: 'rgba(217, 119, 6, 0.12)', border: 'rgba(217, 119, 6, 0.3)', color: '#b45309' },
  LOW: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', color: '#2563eb' },
  UNCHANGED: { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', color: '#16a34a' },
}

export default function ImpactAnalysisPanel() {
  const impactResult = useTwinStore((s) => s.impactResult)
  const impactBusy = useTwinStore((s) => s.impactBusy)
  const impactError = useTwinStore((s) => s.impactError)
  const clearImpactResult = useTwinStore((s) => s.clearImpactResult)

  if (impactBusy && !impactResult) {
    return (
      <div className="impact-panel">
        <div className="loading-indicator">
          <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '0.35rem', verticalAlign: 'middle' }}>hourglass_top</span>
          Analyzing infrastructure impact…
        </div>
      </div>
    )
  }

  if (!impactResult) return null

  const { impact_score, impact_level, impact_components, regional_metrics, affected_villages, affected_hospitals, affected_warehouses, newly_isolated_nodes, impact_summary, scenario } = impactResult

  const style = IMPACT_LEVEL_STYLE[impact_level] || IMPACT_LEVEL_STYLE.UNCHANGED

  return (
    <div className="impact-panel">
      <div className="impact-header">
        <div className="impact-title">CASCADE IMPACT ANALYSIS</div>
        <div className="impact-badge" style={{ background: style.bg, borderColor: style.border, color: style.color }}>
          {impact_level}
        </div>
        <button className="icon-btn" onClick={clearImpactResult} title="Close" aria-label="Close impact panel">✕</button>
      </div>

      <div className="impact-scenario">
        <div className="scenario-label">Selected Infrastructure</div>
        <div className="scenario-value">{scenario?.edge_id || '—'}</div>
        <div className="scenario-label">Hypothetical Scenario</div>
        <div className="scenario-value scenario-closed">CLOSED</div>
      </div>

      <div className="impact-score-block">
        <div className="impact-score-label">Impact Score</div>
        <div className="impact-score-value">{impact_score} / 100</div>
        <div className="impact-components">
          <span>Population: {impact_components?.population_impact ?? 0}</span>
          <span>Accessibility: {impact_components?.accessibility_impact ?? 0}</span>
          <span>Isolation: {impact_components?.isolation_impact ?? 0}</span>
          <span>Service: {impact_components?.service_impact ?? 0}</span>
        </div>
      </div>

      <div className="impact-metrics-grid">
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
        <div className="metric-item">
          <div className="metric-value">{regional_metrics?.hospital_coverage_loss ?? 0}</div>
          <div className="metric-label">Hospital Coverage Loss</div>
        </div>
        <div className="metric-item">
          <div className="metric-value">{regional_metrics?.warehouse_coverage_loss ?? 0}</div>
          <div className="metric-label">Warehouse Coverage Loss</div>
        </div>
      </div>

      {affected_villages && affected_villages.length > 0 && (
        <div className="impact-section">
          <h4 className="section-title">AFFECTED COMMUNITIES</h4>
          <ul className="village-impact-list">
            {affected_villages.map((v) => (
              <li key={v.village_id} className={`village-impact-item impact-${(v.impact_level || '').toLowerCase()}`}>
                <div className="village-info">
                  <span className="village-name">{v.name} ({v.village_id})</span>
                  <span className="village-pop">Pop: {v.population.toLocaleString()}</span>
                </div>
                <div className="village-impact-details">
                  <span className="impact-drop">Drop: {v.accessibility_drop?.toFixed(1) ?? 0}</span>
                  <span className={`impact-level-${(v.impact_level || '').toLowerCase()}`}>{v.impact_level}</span>
                </div>
                <div className="village-reasons">
                  {v.impact_reasons?.map((r, i) => (
                    <span key={i} className="reason-tag">{r}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {newly_isolated_nodes && newly_isolated_nodes.length > 0 && (
        <div className="impact-section">
          <h4 className="section-title">NEWLY ISOLATED COMMUNITIES</h4>
          <ul className="isolated-list">
            {newly_isolated_nodes.map((n) => (
              <li key={n.node_id} className="isolated-item">
                <span className="isolated-name">{n.name} ({n.node_id})</span>
                <span className="isolated-reason">{n.isolation_reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(affected_hospitals && affected_hospitals.length > 0) || (affected_warehouses && affected_warehouses.length > 0) && (
        <div className="impact-section">
          <h4 className="section-title">SERVICE COVERAGE IMPACT</h4>
          {affected_hospitals && affected_hospitals.length > 0 && (
            <div className="service-impact-block">
              <div className="service-type">HOSPITALS</div>
              {affected_hospitals.map((h) => (
                <div key={h.service_id} className="service-impact-item">
                  <span className="service-name">{h.name} ({h.service_id})</span>
                  <span className="coverage-loss">Served: {h.villages_served_before} → {h.villages_served_after} (−{h.coverage_loss})</span>
                </div>
              ))}
            </div>
          )}
          {affected_warehouses && affected_warehouses.length > 0 && (
            <div className="service-impact-block">
              <div className="service-type">WAREHOUSES</div>
              {affected_warehouses.map((w) => (
                <div key={w.service_id} className="service-impact-item">
                  <span className="service-name">{w.name} ({w.service_id})</span>
                  <span className="coverage-loss">Served: {w.villages_served_before} → {w.villages_served_after} (−{w.coverage_loss})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="impact-summary-block">
        <h4 className="section-title">OPERATIONAL SIGNIFICANCE</h4>
        <p className="impact-summary-text">{impact_summary}</p>
      </div>

      <div className="impact-next-actions">
        <button
          className="btn btn-live"
          onClick={() => {
            const top = useTwinStore.getState().priorities?.[0]
            if (top) {
              useTwinStore.getState().selectPriorityTarget(top)
            }
          }}
          style={{ width: '100%', marginTop: '0.6rem', fontSize: '0.78rem' }}
          id="btn-impact-to-priorities"
        >
          VIEW PRIORITIES & PREPARE ACTION PLAN →
        </button>
      </div>
    </div>
  )
}