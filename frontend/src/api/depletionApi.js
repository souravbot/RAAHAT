// Depletion API client for RAAHAT frontend.

import request from './client'

/**
 * Get depletion intelligence for all inventory facilities.
 */
export function fetchAllDepletion() {
  return request('/depletion')
}

/**
 * Get depletion intelligence for a specific facility.
 * @param {string} nodeId - The facility ID
 */
export function fetchFacilityDepletion(nodeId) {
  return request(`/depletion/${encodeURIComponent(nodeId)}`)
}

/**
 * Get regional supply summary.
 */
export function fetchRegionalSupplySummary() {
  return request('/depletion/summary/regional')
}