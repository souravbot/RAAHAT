// Formatting helpers for rendering twin data.

import { nodeMeta } from '../map/icons'

// Human-readable label for a node's category.
export function categoryLabel(category) {
  return category || '—'
}

// Format a coordinate to a reasonable precision.
export function coord(value) {
  return Number(value).toFixed(4)
}

// Present a node's attribute dict as an array of { key, value } rows.
export function attributeRows(attributes) {
  if (!attributes || typeof attributes !== 'object') return []
  const rows = []
  for (const [key, value] of Object.entries(attributes)) {
    let display = value
    if (value && typeof value === 'object') {
      display = JSON.stringify(value)
    }
    rows.push({ key, value: display })
  }
  return rows
}

// Node type meta with glyph for reuse in panels.
export function typeTag(type) {
  return nodeMeta(type)
}
