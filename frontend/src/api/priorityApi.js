// Priority Intelligence API client for RAAHAT frontend (Phase 7).

import request from './client'

/**
 * Get ranked regional resource priorities.
 * @param {object} opts - Optional filters (limit, facilityType, priorityLevel)
 */
export function fetchPriorities(opts = {}) {
  const params = new URLSearchParams()
  if (opts.limit) params.set('limit', String(opts.limit))
  if (opts.facilityType) params.set('facility_type', opts.facilityType)
  if (opts.priorityLevel) params.set('priority_level', opts.priorityLevel)
  const qs = params.toString()
  return request(`/priority${qs ? `?${qs}` : ''}`)
}

/**
 * Get priority rankings for a single inventory-holding facility.
 * @param {string} nodeId - Facility ID (hospital/warehouse)
 */
export function fetchFacilityPriorities(nodeId) {
  return request(`/priority/${encodeURIComponent(nodeId)}`)
}