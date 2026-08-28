// EdgeDetailPanel — shows the selected edge's full detail.

import { useTwinStore } from '../state/useTwinStore'
import { EDGE_STATUS_META } from '../map/icons'
import { coord } from '../utils/formatters'

export default function EdgeDetailPanel({ edge }) {
  const nodes = useTwinStore((s) => s.nodes)
  const clearSelection = useTwinStore((s) => s.clearSelection)
  const selectNode = useTwinStore((s) => s.selectNode)

  const meta = EDGE_STATUS_META[edge.status] || EDGE_STATUS_META.OPEN
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const source = byId.get(edge.connects[0])
  const target = byId.get(edge.connects[1])

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <span
          className="type-badge"
          style={{ background: meta.color }}
        >
          {edge.type}
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

      <h2 className="detail-title">{edge.type} connection</h2>
      <div className="detail-id">{edge.id}</div>

      <dl className="detail-list">
        <div className="detail-row">
          <dt>Status</dt>
          <dd>
            <span className={`state-pill state-${edge.status.toLowerCase()}`}>
              {edge.status}
            </span>
          </dd>
        </div>
        <div className="detail-row">
          <dt>Risk score</dt>
          <dd>{edge.risk_score} / 100</dd>
        </div>
        <div className="detail-row">
          <dt>Distance</dt>
          <dd>{edge.distance_km} km</dd>
        </div>
        <div className="detail-row">
          <dt>Base travel time</dt>
          <dd>{edge.base_travel_time_min} min</dd>
        </div>
      </dl>

      <div className="detail-block">
        <h3 className="detail-subtitle">Connected nodes</h3>
        {[source, target].map((node, i) =>
          node ? (
            <button
              key={node.id}
              className="node-link"
              onClick={() => selectNode(node.id)}
            >
              <span className="node-link-id">{node.id}</span>
              <span className="node-link-name">{node.name}</span>
              <span className="node-link-coord">
                {coord(node.lat)}, {coord(node.lng)}
              </span>
            </button>
          ) : (
            <div key={i} className="node-link-missing">
              Unknown node
            </div>
          ),
        )}
      </div>
    </div>
  )
}
