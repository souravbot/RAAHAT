// Renders a single node as a styled circular marker (divIcon) with a type glyph.
// For villages, includes accessibility visualization through border/ring colors.

import { Marker } from 'react-leaflet'
import L from 'leaflet'
import { nodeMeta } from './icons'

function getAccessibilityColor(score) {
  if (score === 0) return '#dc2626'      // isolated - red
  if (score >= 80) return '#16a34a'       // high - green
  if (score >= 50) return '#d97706'       // moderate - amber
  return '#f97316'                        // low - orange
}

function makeIcon(node, selected, accessibilityScore) {
  const meta = nodeMeta(node.type)
  const selectedStyle = selected ? ' box-shadow: 0 0 0 3px #0369a1;' : ''
  
  // For villages, add accessibility ring
  let accessibilityRing = ''
  let accessibilityStyle = ''
  if (node.type === 'VILLAGE' && accessibilityScore !== undefined) {
    const color = getAccessibilityColor(accessibilityScore)
    accessibilityRing = `<div class="accessibility-ring" style="--access-color:${color};"></div>`
    accessibilityStyle = `--access-color:${color};`
  }
  
  const html = `
    <div class="node-marker ${selected ? 'is-selected' : ''}" style="--marker-color:${meta.color};${selectedStyle}${accessibilityStyle}">
      ${accessibilityRing}
      <span class="node-marker-glyph">${meta.glyph}</span>
    </div>`
  return L.divIcon({
    html,
    className: 'node-marker-wrap',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  })
}

export default function NodeMarker({ node, selected, onSelect, accessibilityScore }) {
  const icon = makeIcon(node, selected, accessibilityScore)
  return (
    <Marker
      position={[node.lat, node.lng]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(node.id) }}
    />
  )
}
