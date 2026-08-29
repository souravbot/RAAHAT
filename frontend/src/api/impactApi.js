// Impact API client for the RAAHAT frontend.

import request from './client'

/**
 * Analyze the cascading impact of closing a specific edge.
 * @param {string} edgeId - The edge ID to analyze
 */
export function analyzeImpact(edgeId) {
  return request(`/impact/${encodeURIComponent(edgeId)}`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
}