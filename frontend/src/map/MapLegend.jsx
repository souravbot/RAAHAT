// MapLegend — small overlay explaining marker colors, glyph icons, edge statuses, and village accessibility.

import { NODE_META, EDGE_STATUS_META } from './icons'

export default function MapLegend() {
  const nodeEntries = Object.entries(NODE_META)
  const statusEntries = Object.entries(EDGE_STATUS_META)
  const accessibilityEntries = [
    { label: 'High Accessibility (80-100)', color: '#16a34a' },
    { label: 'Moderate Accessibility (50-79)', color: '#d97706' },
    { label: 'Low Accessibility (1-49)', color: '#f97316' },
    { label: 'Isolated (0)', color: '#dc2626' },
  ]

  return (
    <div className="map-legend">
      <div className="legend-section">
        <div className="legend-title">Locations</div>
        <div className="legend-grid">
          {nodeEntries.map(([type, meta]) => (
            <div className="legend-item" key={type}>
              <span
                className="legend-swatch legend-swatch-icon"
                style={{ background: meta.color }}
                dangerouslySetInnerHTML={{ __html: meta.glyphSvg || meta.glyph }}
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
      <div className="legend-section">
        <div className="legend-title">Village Accessibility</div>
        <div className="legend-grid">
          {accessibilityEntries.map((entry, i) => (
            <div className="legend-item" key={i}>
              <span
                className="legend-ring"
                style={{ background: entry.color }}
              />
              <span>{entry.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}