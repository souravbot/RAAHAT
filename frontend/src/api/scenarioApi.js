// Scenario API — what-if scenario analysis (Phase 9).

import request from './client'

/**
 * Run a complete what-if scenario (simulate + impact + recommendations).
 * @param {{edge_id: string, type: string, risk_delta?: number}} payload
 */
export function runScenario(payload) {
  return request('/scenario', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/**
 * Compare two scenarios side-by-side.
 * @param {{edge_id: string, type: string, risk_delta?: number}} payloadA
 * @param {{edge_id: string, type: string, risk_delta?: number}} payloadB
 */
export function compareScenarios(payloadA, payloadB) {
  return request('/scenario/compare', {
    method: 'POST',
    body: JSON.stringify({
      request_a: payloadA,
      request_b: payloadB,
    }),
  })
}