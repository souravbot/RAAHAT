// Node type → marker visual config (color + size + category + crisp SVG glyph + label).
// Used to build Leaflet divIcon markers, cluster representations, and legend icons.

export const NODE_META = {
  HOSPITAL: {
    color: '#e11d48',
    label: 'Hospital',
    category: 'CRITICAL',
    size: 34,
    glyph: 'H',
    glyphSvg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  },
  WAREHOUSE: {
    color: '#2563eb',
    label: 'Warehouse',
    category: 'CRITICAL',
    size: 34,
    glyph: 'W',
    glyphSvg: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"></path><path d="M5 21V7l7-4 7 4v14"></path><path d="M9 10h6"></path><path d="M9 14h6"></path></svg>`,
  },
  BRIDGE: {
    color: '#7c3aed',
    label: 'Bridge',
    category: 'IMPORTANT',
    size: 28,
    glyph: 'B',
    glyphSvg: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V10a8 8 0 0 1 16 0v9"></path><path d="M2 19h20"></path><line x1="8" y1="19" x2="8" y2="14"></line><line x1="16" y1="19" x2="16" y2="14"></line></svg>`,
  },
  ROAD_JUNCTION: {
    color: '#64748b',
    label: 'Road Junction',
    category: 'IMPORTANT',
    size: 26,
    glyph: 'J',
    glyphSvg: `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="4" fill="currentColor"></circle></svg>`,
  },
  VILLAGE: {
    color: '#059669',
    label: 'Village',
    category: 'REGIONAL',
    size: 26,
    glyph: 'V',
    glyphSvg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5z"></path><path d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6"></path></svg>`,
  },
  MARKET: {
    color: '#d97706',
    label: 'Market',
    category: 'REGIONAL',
    size: 26,
    glyph: 'M',
    glyphSvg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
  },
}

export const EDGE_STATUS_META = {
  OPEN: { color: '#16a34a', label: 'Open' },
  AT_RISK: { color: '#d97706', label: 'At Risk' },
  CLOSED: { color: '#dc2626', label: 'Closed' },
}

export function nodeMeta(type) {
  return NODE_META[type] || { color: '#94a3b8', label: type || 'Unknown', category: 'REGIONAL', size: 26, glyph: '?', glyphSvg: '?' }
}
