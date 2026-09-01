// Renders a single edge (road/bridge) as a stylized polyline colored by status.
// Supports animated status transitions, flowing dash patterns on AT_RISK routes,
// hover tooltips, and disruption hazard badges on CLOSED routes.

import { Polyline, Tooltip, Marker } from 'react-leaflet'
import L from 'leaflet'
import { EDGE_STATUS_META } from './icons'

function createDisruptionHazardIcon(edgeId) {
  const html = `
    <div class="disruption-hazard-pin" title="Disruption Detected: ${edgeId}">
      <span class="hazard-ripple"></span>
      <span class="hazard-icon">✕</span>
    </div>`
  return L.divIcon({
    html,
    className: 'disruption-hazard-wrap',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

export default function EdgeLine({ edge, source, target, selected, onSelect }) {
  if (!source || !target) return null
  const meta = EDGE_STATUS_META[edge.status] || EDGE_STATUS_META.OPEN
  const positions = [
    [source.lat, source.lng],
    [target.lat, target.lng],
  ]
  const isAtRisk = edge.status === 'AT_RISK'
  const isClosed = edge.status === 'CLOSED'
  const width = selected ? 6 : isClosed ? 4.5 : isAtRisk ? 4 : 3.5

  const midLat = (source.lat + target.lat) / 2
  const midLng = (source.lng + target.lng) / 2

  const sourceName = source.name || edge.connects[0]
  const targetName = target.name || edge.connects[1]

  return (
    <>
      {/* Invisible wide hit-area for easier clicking */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: 'transparent',
          weight: 16,
          interactive: true,
        }}
        eventHandlers={{ click: () => onSelect(edge.id) }}
      />
      {/* Visible styled and animated route line */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: meta.color,
          weight: width,
          opacity: selected ? 1 : isClosed ? 0.95 : 0.82,
          dashArray: isAtRisk ? '8, 8' : undefined,
          className: `raahat-edge-line edge-${edge.status.toLowerCase()} ${selected ? 'is-selected' : ''}`,
        }}
        eventHandlers={{ click: () => onSelect(edge.id) }}
      >
        <Tooltip direction="center" opacity={0.96} className="raahat-map-tooltip">
          <div className="tooltip-node-header">
            <span className={`tooltip-status-pill status-${edge.status.toLowerCase()}`}>
              {meta.label}
            </span>
            <span className="tooltip-node-id">{edge.id}</span>
          </div>
          <div className="tooltip-node-title">
            {sourceName} ↔ {targetName}
          </div>
          <div className="tooltip-node-details">
            <div className="tooltip-node-line">
              Distance: <strong>{edge.distance_km} km</strong> · Base Time: <strong>{edge.base_travel_time_min} min</strong>
            </div>
            <div className="tooltip-node-line">
              Risk Score: <strong>{edge.risk_score || 0}/100</strong>
            </div>
          </div>
        </Tooltip>
      </Polyline>

      {/* Disruption Hazard Badge at midpoint if CLOSED */}
      {isClosed && (
        <Marker
          position={[midLat, midLng]}
          icon={createDisruptionHazardIcon(edge.id)}
          eventHandlers={{ click: () => onSelect(edge.id) }}
        >
          <Tooltip direction="top" offset={[0, -12]} opacity={0.96} className="raahat-map-tooltip">
            <div className="tooltip-hazard-header">
              <span className="hazard-alert-tag">DISRUPTION DETECTED</span>
              <span className="tooltip-node-id">{edge.id}</span>
            </div>
            <div className="tooltip-node-title">{sourceName} ↔ {targetName}</div>
            <div className="tooltip-node-line line-isolated">Status: CLOSED / ROUTE IMPASSABLE</div>
          </Tooltip>
        </Marker>
      )}
    </>
  )
}
