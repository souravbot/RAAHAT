// Disruption API — live disruption, simulation, and reset.

import request from './client'

/**
 * Apply a live disruption to the regional state.
 * @param {{edge_id: string, type: string, risk_delta?: number}} payload
 */
export function applyDisruption(payload) {
  return request('/disruption', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Run a hypothetical What-If simulation (never mutates live state).
 * @param {{edge_id: string, type: string, risk_delta?: number}} payload
 */
export function runSimulation(payload) {
  return request('/simulate', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** Reset the demo to its original fixture baseline. */
export function resetDemo() {
  return request('/reset', { method: 'POST' })
}

/** Lists session disruption events. */
export function fetchEvents() {
  return request('/events')
}
