// Renders a single node as a styled circular marker (divIcon) with a type glyph.

import { Marker } from 'react-leaflet'
import L from 'leaflet'
import { nodeMeta } from './icons'

function makeIcon(node, selected) {
  const meta = nodeMeta(node.type)
  const selectedStyle = selected ? ' box-shadow: 0 0 0 3px #0369a1;' : ''
  const html = `
    <div class="node-marker ${selected ? 'is-selected' : ''}"
         style="--marker-color:${meta.color};${selectedStyle}">
      <span class="node-marker-glyph">${meta.glyph}</span>
    </div>`
  return L.divIcon({
    html,
    className: 'node-marker-wrap',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  })
}

export default function NodeMarker({ node, selected, onSelect }) {
  const icon = makeIcon(node, selected)
  return (
    <Marker
      position={[node.lat, node.lng]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(node.id) }}
    />
  )
}
