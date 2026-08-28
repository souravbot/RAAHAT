// Renders a single edge (road/bridge) as a stylized polyline colored by status.

import { Polyline } from 'react-leaflet'
import { EDGE_STATUS_META } from './icons'

export default function EdgeLine({ edge, source, target, selected, onSelect }) {
  if (!source || !target) return null
  const meta = EDGE_STATUS_META[edge.status] || EDGE_STATUS_META.OPEN
  const positions = [
    [source.lat, source.lng],
    [target.lat, target.lng],
  ]
  const width = selected ? 5 : 3.5

  return (
    <>
      {/* Invisible wide hit-area for easier clicking */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: 'transparent',
          weight: 12,
          interactive: true,
          eventHandlers: { click: () => onSelect(edge.id) },
        }}
      />
      <Polyline
        positions={positions}
        pathOptions={{
          color: meta.color,
          weight: width,
          opacity: selected ? 1 : 0.8,
          dashArray: edge.status !== 'OPEN' ? '6 6' : undefined,
        }}
      />
    </>
  )
}
