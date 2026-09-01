// Renders a single node as a styled circular marker (divIcon) with a type glyph.
// Supports size hierarchy, accessibility rings, isolated/critical pulse states, and hover tooltips.

import { Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { nodeMeta } from './icons'

function getAccessibilityColor(score) {
  if (score === 0) return '#dc2626'      // isolated - red
  if (score >= 80) return '#16a34a'     // high - green
  if (score >= 50) return '#d97706'     // moderate - amber
  return '#f97316'                      // low - orange
}

function makeIcon(node, selected, accessibilityScore) {
  const meta = nodeMeta(node.type)
  const size = meta.size || 28
  const half = Math.round(size / 2)
  const isIsolated = accessibilityScore === 0
  const isCritical = isIsolated || node.state?.status === 'critical' || node.state?.status === 'danger'
  const isWatch = node.state?.status === 'at_risk' || node.state?.status === 'warning'
  
  let classes = ['node-marker', `node-category-${meta.category?.toLowerCase() || 'regional'}`]
  if (selected) classes.push('is-selected')
  if (isIsolated) classes.push('is-isolated')
  else if (isCritical) classes.push('is-critical')
  else if (isWatch) classes.push('is-watch')

  // For villages, add accessibility ring
  let accessibilityRing = ''
  let accessibilityStyle = ''
  if (node.type === 'VILLAGE' && accessibilityScore !== undefined) {
    const color = getAccessibilityColor(accessibilityScore)
    accessibilityRing = `<div class="accessibility-ring" style="--access-color:${color};"></div>`
    accessibilityStyle = `--access-color:${color};`
  }
  
  const glyphContent = meta.glyphSvg || meta.glyph
  const html = `
    <div class="${classes.join(' ')}" style="--marker-color:${meta.color};width:${size}px;height:${size}px;${accessibilityStyle}">
      ${accessibilityRing}
      <span class="node-marker-glyph">${glyphContent}</span>
    </div>`
    
  return L.divIcon({
    html,
    className: 'node-marker-wrap',
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -half],
  })
}

export default function NodeMarker({ node, selected, onSelect, accessibilityScore }) {
  const meta = nodeMeta(node.type)
  const icon = makeIcon(node, selected, accessibilityScore)
  const isIsolated = accessibilityScore === 0

  // Build compact operational tooltip lines
  const tooltipDetails = []
  if (node.type === 'VILLAGE' && accessibilityScore !== undefined) {
    const accessLabel = accessibilityScore === 0 ? 'ISOLATED' : accessibilityScore >= 80 ? 'HIGH' : accessibilityScore >= 50 ? 'MODERATE' : 'LOW'
    tooltipDetails.push(`Accessibility: ${accessibilityScore}% (${accessLabel})`)
  }
  if (node.attributes?.population) {
    tooltipDetails.push(`Population: ${Number(node.attributes.population).toLocaleString()}`)
  }
  if (node.attributes?.capacity) {
    tooltipDetails.push(`Capacity: ${node.attributes.capacity} units`)
  }
  if (node.attributes?.total_stock) {
    tooltipDetails.push(`Total Stock: ${Number(node.attributes.total_stock).toLocaleString()} units`)
  }
  if (node.attributes?.available_vehicles !== undefined) {
    tooltipDetails.push(`Available Vehicles: ${node.attributes.available_vehicles}`)
  }

  return (
    <Marker
      position={[node.lat, node.lng]}
      icon={icon}
      eventHandlers={{ click: () => onSelect(node.id) }}
    >
      <Tooltip direction="top" offset={[0, -(meta.size / 2 + 4)]} opacity={0.96} className="raahat-map-tooltip">
        <div className="tooltip-node-header">
          <span className="tooltip-node-badge" style={{ background: meta.color }}>{meta.label}</span>
          <span className="tooltip-node-id">{node.id}</span>
        </div>
        <div className="tooltip-node-title">{node.name}</div>
        {tooltipDetails.length > 0 && (
          <div className="tooltip-node-details">
            {tooltipDetails.map((line, idx) => (
              <div key={idx} className={`tooltip-node-line ${isIsolated && line.includes('ISOLATED') ? 'line-isolated' : ''}`}>
                {line}
              </div>
            ))}
          </div>
        )}
      </Tooltip>
    </Marker>
  )
}
