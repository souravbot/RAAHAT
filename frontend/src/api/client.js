// Shared API client for the RAAHAT backend.
// The Vite dev server proxies /api/* to the FastAPI backend during dev.

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
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
