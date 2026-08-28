// NodeDetailPanel — shows the selected node's full detail, populated from the
// twin state (nodes + per-node attributes) shared in the global store.

import { useTwinStore } from '../state/useTwinStore'
import { nodeMeta } from '../map/icons'
import { attributeRows, categoryLabel, coord } from '../utils/formatters'

export default function NodeDetailPanel({ node }) {
  const edges = useTwinStore((s) => s.edges)
  const clearSelection = useTwinStore((s) => s.clearSelection)
  const villageAccessibility = useTwinStore((s) => s.villageAccessibility)
  const meta = nodeMeta(node.type)

  // Get accessibility data for villages
  const villageAccess = node.type === 'VILLAGE' 
    ? villageAccessibility?.find(v => v.village_id === node.id)
    : null

  const connectedEdges = edges.filter((e) => e.connects.includes(node.id))
  const rows = attributeRows(node.attributes)

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <span
          className="type-badge"
          style={{ background: meta.color }}
        >
          {meta.glyph} {meta.label}
        </span>
        <button
          className="icon-btn"
          onClick={clearSelection}
          title="Close"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      <h2 className="detail-title">{node.name}</h2>
      <div className="detail-id">{node.id}</div>

      <dl className="detail-list">
        <div className="detail-row">
          <dt>Category</dt>
          <dd>{categoryLabel(node.category)}</dd>
        </div>
        <div className="detail-row">
          <dt>Type</dt>
          <dd>{meta.label}</dd>
        </div>
        <div className="detail-row">
          <dt>State</dt>
          <dd>
            <span className={`state-pill state-${(node.state?.status || '').toLowerCase()}`}>
              {node.state?.status || 'UNKNOWN'}
            </span>
          </dd>
        </div>
        <div className="detail-row">
          <dt>Latitude</dt>
          <dd>{coord(node.lat)}</dd>
        </div>
        <div className="detail-row">
          <dt>Longitude</dt>
          <dd>{coord(node.lng)}</dd>
        </div>
        <div className="detail-row">
          <dt>Connected roads</dt>
          <dd>{connectedEdges.length}</dd>
        </div>
      </dl>

      {villageAccess && (
        <div className="detail-block accessibility-block">
          <h3 className="detail-subtitle">ACCESSIBILITY INTELLIGENCE</h3>
          <div className="accessibility-score-display">
            <span className="access-score-label">Overall Score</span>
            <span className="access-score-value">{villageAccess.accessibility_score.toFixed(1)}</span>
            <span className="access-score-suffix">/ 100</span>
          </div>
          <div className="accessibility-breakdown">
            <div className="access-item">
              <span className="access-label">Nearest Hospital</span>
              <span className="access-value">
                {villageAccess.hospital.reachable
                  ? `${villageAccess.hospital.nearest_service_name} (Hospital) — ${villageAccess.hospital.travel_cost_min} min`
                  : 'Unreachable'}
              </span>
            </div>
            <div className="access-item">
              <span className="access-label">Nearest Warehouse</span>
              <span className="access-value">
                {villageAccess.warehouse.reachable
                  ? `${villageAccess.warehouse.nearest_service_name} (Warehouse) — ${villageAccess.warehouse.travel_cost_min} min`
                  : 'Unreachable'}
              </span>
            </div>
            <div className="access-item">
              <span className="access-label">Network Resilience</span>
              <span className="access-value">{villageAccess.network_resilience_score.toFixed(1)} / 100</span>
            </div>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="detail-block">
          <h3 className="detail-subtitle">Node attributes</h3>
          <dl className="detail-list">
            {rows.map(({ key, value }) => (
              <div className="detail-row" key={key}>
                <dt>{key.replace(/_/g, ' ')}</dt>
                <dd className="detail-attr">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}
