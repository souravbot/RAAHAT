// MapLegend — small overlay explaining marker colors and edge statuses.

import { NODE_META, EDGE_STATUS_META } from './icons'

export default function MapLegend() {
  const nodeEntries = Object.entries(NODE_META)
  const statusEntries = Object.entries(EDGE_STATUS_META)

  return (
    <div className="map-legend">
      <div className="legend-section">
        <div className="legend-title">Locations</div>
        <div className="legend-grid">
          {nodeEntries.map(([type, meta]) => (
            <div className="legend-item" key={type}>
              <span
                className="legend-swatch"
                style={{ background: meta.color }}
              />
              <span>{meta.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="legend-section">
        <div className="legend-title">Connections</div>
        <div className="legend-grid">
          {statusEntries.map(([status, meta]) => (
            <div className="legend-item" key={status}>
              <span
                className="legend-line"
                style={{ background: meta.color }}
              />
              <span>{meta.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
