// Recommendation / Action-Plan API client for RAAHAT frontend (Phase 8).

import request from './client'

/**
 * Generate an explainable recommended action plan for a supply shortage.
 * @param {{target_node: string, resource: string, required_quantity: number, priority?: string}} payload
 */
export function recommendAction(payload) {
  return request('/recommend-action', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Confirm dispatch of a recommended vehicle (sets vehicle status to en-route).
 * @param {string} vehicleId
 */
export function confirmDispatch(vehicleId) {
  return request('/recommend-action/confirm', {
    method: 'POST',
    body: JSON.stringify({ vehicle_id: vehicleId }),
  })
}