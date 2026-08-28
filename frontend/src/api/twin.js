// Twin API — reads the Regional Digital Twin from GET /twin.
// This is the single source of truth for the map; the frontend never
// hardcodes nodes/edges/coordinates.

import request from './client'

/**
 * Fetch the complete regional twin.
 * Returns { metadata, nodes, edges, summary }.
 */
export function fetchTwin() {
  return request('/twin')
}

/**
 * Fetch a single node's detail (node + directly connected edges/nodes).
 */
export function fetchNode(nodeId) {
  return request(`/twin/node/${encodeURIComponent(nodeId)}`)
}

/**
 * Fetch a single edge's detail (edge + source/target nodes).
 */
export function fetchEdge(edgeId) {
  return request(`/twin/edge/${encodeURIComponent(edgeId)}`)
}
