// Shared API client for the RAAHAT backend.
// In development, the Vite dev server proxies root-level routes (/twin, /priority, /demo, etc.) to FastAPI.

const rawBase = import.meta.env.VITE_API_BASE_URL || ''
const API_BASE = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase

async function request(path, options = {}) {
  const url = `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })

  if (!res.ok) {
    // FastAPI structured errors: { "detail": "..." }
    let detail
    try {
      const body = await res.json()
      detail = body?.detail || `Request failed with status ${res.status}`
    } catch {
      detail = `Request failed with status ${res.status}`
    }
    throw new Error(detail)
  }

  return res.json()
}

export default request
