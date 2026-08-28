// Mock API client — talks to the FastAPI backend during dev.
// In production the proxy is handled by the Vite server or a CDN.

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export async function fetchLocations() {
  const res = await fetch(`${API_BASE}/locations`)
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`)
  }
  return res.json()
}
