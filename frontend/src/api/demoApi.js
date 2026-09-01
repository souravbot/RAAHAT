import request from './client'

export function resetDemoScenario() {
  return request('/demo/reset', { method: 'POST' })
}

export function runDemoScenario() {
  return request('/demo/run-scenario', { method: 'POST' })
}
