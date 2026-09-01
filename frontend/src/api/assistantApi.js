// Assistant API client for RAAHAT frontend (Phase 10).

import request from './client'

/**
 * Send a natural language question to the RAHAAT assistant.
 * @param {string} question - The user's question
 * @param {string} [scenario_id] - Optional scenario ID for context
 */
export function askQuestion(question, scenario_id = null) {
  return request('/ask', {
    method: 'POST',
    body: JSON.stringify({ question, scenario_id }),
  })
}

/**
 * Get information about the assistant's capabilities.
 */
export function getAssistantInfo() {
  return request('/ask/info')
}