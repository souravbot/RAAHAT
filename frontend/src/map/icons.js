// Node type → marker visual config (color + glyph + label).
// Used to build Leaflet divIcon markers and sidebar/panel labels.

export const NODE_META = {
  HOSPITAL: { color: '#e11d48', label: 'Hospital', glyph: 'H' },
  WAREHOUSE: { color: '#2563eb', label: 'Warehouse', glyph: 'W' },
  VILLAGE: { color: '#059669', label: 'Village', glyph: 'V' },
  MARKET: { color: '#d97706', label: 'Market', glyph: 'M' },
  ROAD_JUNCTION: { color: '#64748b', label: 'Road Junction', glyph: 'J' },
  BRIDGE: { color: '#7c3aed', label: 'Bridge', glyph: 'B' },
}

export const EDGE_STATUS_META = {
  OPEN: { color: '#16a34a', label: 'Open' },
  AT_RISK: { color: '#d97706', label: 'At Risk' },
  CLOSED: { color: '#dc2626', label: 'Closed' },
}

export function nodeMeta(type) {
  return NODE_META[type] || { color: '#94a3b8', label: type || 'Unknown', glyph: '?' }
}
