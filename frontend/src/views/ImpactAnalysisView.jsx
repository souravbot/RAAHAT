// ImpactAnalysisView — Full-page impact analysis screen.
// Left panel: selectable edge list grouped by status.
// Right panel: impact cascade results when an edge is analyzed.

import { useState, useMemo } from 'react'
import { useTwinStore } from '../state/useTwinStore'

const IMPACT_LEVEL_STYLE = {
  CRITICAL: { bg: 'rgba(220, 38, 38, 0.12)', border: 'rgba(220, 38, 38, 0.3)', color: '#dc2626', label: 'CRITICAL' },
  HIGH:     { bg: 'rgba(217, 76, 60, 0.12)',  border: 'rgba(217, 76, 60, 0.3)',  color: '#ea580c', label: 'HIGH' },
  MODERATE: { bg: 'rgba(217, 119, 6, 0.12)',  border: 'rgba(217, 119, 6, 0.3)',  color: '#d97706', label: 'MODERATE' },
  LOW:      { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', color: '#2563eb', label: 'LOW' },
  UNCHANGED:{ bg: 'rgba(34, 197, 94, 0.12)',  border: 'rgba(34, 197, 94, 0.3)',  color: '#16a34a', label: 'UNCHANGED' },
}

const STATUS_ORDER = { CLOSED: 0, AT_RISK: 1, OPEN: 2 }

export default function ImpactAnalysisView() {
  const nodes = useTwinStore((s) => s.nodes)
  const edges = useTwinStore((s) => s.edges)
  const impactResult = useTwinStore((s) => s.impactResult)
  const impactBusy = useTwinStore((s) => s.impactBusy)
  const impactError = useTwinStore((s) => s.impactError)
  const runImpactAnalysis = useTwinStore((s) => s.runImpactAnalysis)
  const clearImpactResult = useTwinStore((s) => s.clearImpactResult)
  const clearImpactError = useTwinStore((s) => s.clearImpactError)
  const focusNode = useTwinStore((s) => s.focusNode)

  const [selectedEdgeId, setSelectedEdgeId] = useState(null)
  const [filterStatus, setFilterStatus] = useState('ALL')

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])

  const edgeLabel = (edge) => {
    const a = byId.get(edge.connects[0])
    const b = byId.get(edge.connects[1])
    return `${a?.name || edge.connects[0]} ↔ ${b?.name || edge.connects[1]}`
  }

  // Group edges by status
  const groupedEdges = useMemo(() => {
    let filtered = edges
    if (filterStatus !== 'ALL') filtered = edges.filter(e => e.status === filterStatus)
    return [...filtered].sort((a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3))
  }, [edges, filterStatus])

  const handleAnalyze = async (edgeId) => {
    setSelectedEdgeId(edgeId)
    if (clearImpactError) clearImpactError()
    try {
      await runImpactAnalysis(edgeId)
    } catch {
      // error surfaced via impactError
    }
  }

  const result = impactResult
  const style = result ? (IMPACT_LEVEL_STYLE[result.impact_level] || IMPACT_LEVEL_STYLE.UNCHANGED) : null

  return (
    <div className="view-impact" id="view-impact">
      {/* Left: Edge List */}
      <div className="impact-edge-list">
        <div className="view-panel-header">
          <div className="view-panel-title-group">
            <span className="material-symbols-outlined view-panel-icon">query_stats</span>
            <h2 className="view-panel-title">Impact Analysis</h2>
          </div>
          <p className="view-panel-desc">
            Select a route or bridge to analyze its cascading impact on the regional network.
          </p>
        </div>

        <div className="impact-filter-row">
          <label className="impact-filter-label">Filter by status:</label>
          <select
            className="impact-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All ({edges.length})</option>
            <option value="CLOSED">Closed ({edges.filter(e => e.status === 'CLOSED').length})</option>
            <option value="AT_RISK">At Risk ({edges.filter(e => e.status === 'AT_RISK').length})</option>
            <option value="OPEN">Open ({edges.filter(e => e.status === 'OPEN').length})</option>
          </select>
        </div>

        <div className="impact-edge-scroll">
          {groupedEdges.map((edge) => (
            <button
              key={edge.id}
              className={`impact-edge-item ${selectedEdgeId === edge.id ? 'is-selected' : ''}`}
              onClick={() => handleAnalyze(edge.id)}
            >
              <div className="impact-edge-info">
                <span className={`impact-edge-status ie-${edge.status?.toLowerCase()}`}>
                  {edge.status}
                </span>
                <span className="impact-edge-id">{edge.id}</span>
                <span className="impact-edge-type">{edge.type}</span>
              </div>
              <div className="impact-edge-route">{edgeLabel(edge)}</div>
              <div className="impact-edge-meta">
                Risk: {edge.risk_score}/100 · Distance: {edge.distance_km?.toFixed(1) ?? '?'} km
              </div>
            </button>
          ))}
          {groupedEdges.length === 0 && (
            <div className="view-empty">
              <span className="material-symbols-outlined">filter_list_off</span>
              No edges match this filter.
            </div>
          )}
        </div>
      </div>

      {/* Right: Impact Results */}
      <div className="impact-results-panel">
        {impactBusy && (
          <div className="view-loading">
            <span className="material-symbols-outlined spinning">progress_activity</span>
            <span>Running cascade analysis…</span>
          </div>
        )}

        {impactError && (
          <div className="view-error" onClick={clearImpactError}>
            <span className="material-symbols-outlined">error</span>
            {impactError}
          </div>
        )}

        {!impactBusy && !result && !impactError && (
          <div className="view-empty-state">
            <span className="material-symbols-outlined view-empty-icon">query_stats</span>
            <h3>Select a Route to Analyze</h3>
            <p>Choose a road or bridge from the list to see what happens when it fails — which villages lose access, which supplies deplete, and how fast.</p>
          </div>
        )}

        {!impactBusy && result && (
          <div className="impact-result-content">
            <div className="impact-result-header">
              <div className="impact-result-badge" style={{ background: style.bg, borderColor: style.border, color: style.color }}>
                {result.impact_level}
              </div>
              <div className="impact-result-score">
                <span className="impact-score-num">{result.impact_score}</span>
                <span className="impact-score-of">/100</span>
              </div>
              <div className="impact-result-edge">
                Edge: <strong>{result.scenario?.edge_id || selectedEdgeId}</strong>
              </div>
              <button className="view-btn-text" onClick={clearImpactResult}>
                <span className="material-symbols-outlined">close</span> Clear
              </button>
            </div>

            {/* Impact components */}
            {result.impact_components && (
              <div className="impact-components-grid">
                <div className="impact-comp-item">
                  <div className="impact-comp-val">{result.impact_components.population_impact ?? 0}</div>
                  <div className="impact-comp-lbl">Population</div>
                </div>
                <div className="impact-comp-item">
                  <div className="impact-comp-val">{result.impact_components.accessibility_impact ?? 0}</div>
                  <div className="impact-comp-lbl">Accessibility</div>
                </div>
                <div className="impact-comp-item">
                  <div className="impact-comp-val">{result.impact_components.isolation_impact ?? 0}</div>
                  <div className="impact-comp-lbl">Isolation</div>
                </div>
                <div className="impact-comp-item">
                  <div className="impact-comp-val">{result.impact_components.service_impact ?? 0}</div>
                  <div className="impact-comp-lbl">Service</div>
                </div>
              </div>
            )}

            {/* Regional metrics */}
            {result.regional_metrics && (
              <div className="impact-metrics-row">
                <div className="impact-metric">
                  <span className="material-symbols-outlined">group</span>
                  <strong>{result.regional_metrics.affected_villages_count ?? 0}</strong> villages
                </div>
                <div className="impact-metric">
                  <span className="material-symbols-outlined">people</span>
                  <strong>{result.regional_metrics.affected_population?.toLocaleString() ?? 0}</strong> people
                </div>
                <div className="impact-metric">
                  <span className="material-symbols-outlined">block</span>
                  <strong>{result.regional_metrics.newly_isolated_count ?? 0}</strong> isolated
                </div>
              </div>
            )}

            {/* Affected villages */}
            {result.affected_villages && result.affected_villages.length > 0 && (
              <div className="impact-section-block">
                <h4 className="impact-section-title">
                  <span className="material-symbols-outlined">location_on</span>
                  Affected Communities ({result.affected_villages.length})
                </h4>
                <div className="impact-village-list">
                  {result.affected_villages.map((v) => {
                    const lvlStyle = IMPACT_LEVEL_STYLE[v.impact_level] || IMPACT_LEVEL_STYLE.UNCHANGED
                    return (
                      <div
                        key={v.village_id}
                        className="impact-village-row"
                        onClick={() => focusNode(v.village_id)}
                      >
                        <div className="impact-village-name">{v.name}</div>
                        <div className="impact-village-pop">Pop: {v.population?.toLocaleString()}</div>
                        <span className="impact-village-badge" style={{ background: lvlStyle.bg, color: lvlStyle.color }}>
                          {v.impact_level}
                        </span>
                        <div className="impact-village-drop">
                          Accessibility ↓{v.accessibility_drop?.toFixed(1)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Summary */}
            {result.impact_summary && (
              <div className="impact-summary-box">
                <h4 className="impact-section-title">
                  <span className="material-symbols-outlined">info</span>
                  Why This Matters
                </h4>
                <p>{result.impact_summary}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
