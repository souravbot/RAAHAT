// Renders a single edge (road/bridge) as a stylized polyline colored by status.
// Supports animated status transitions and flowing dash patterns on AT_RISK routes.

import { Polyline } from 'react-leaflet'
import { EDGE_STATUS_META } from './icons'

export default function EdgeLine({ edge, source, target, selected, onSelect }) {
  if (!source || !target) return null
  const meta = EDGE_STATUS_META[edge.status] || EDGE_STATUS_META.OPEN
  const positions = [
    [source.lat, source.lng],
    [target.lat, target.lng],
  ]
  const width = selected ? 5.5 : 3.5
  const isAtRisk = edge.status === 'AT_RISK'
  const isClosed = edge.status === 'CLOSED'

  return (
    <>
      {/* Invisible wide hit-area for easier clicking */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: 'transparent',
          weight: 14,
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
          opacity: selected ? 1 : 0.85,
          dashArray: isAtRisk ? '8, 8' : undefined,
          className: `raahat-edge-line edge-${edge.status.toLowerCase()} ${selected ? 'is-selected' : ''}`,
        }}
        eventHandlers={{ click: () => onSelect(edge.id) }}
      />
    </>
  )
}
