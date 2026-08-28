# RAAHAT

**R**egional **A**I for **A**ccessibility, **A**ssistance &amp; **T**ransport

AI-powered smart logistics, accessibility & regional resilience intelligence platform for the **North Eastern Region (NER) of India**.

> **North Star:** *Keep essential resources accessible despite disruption.*

RAAHAT is more than a route finder. It continuously builds an understanding of the regional logistics environment — detecting/predicting disruptions, calculating cascading impacts, evaluating resources, prioritizing critical needs, and recommending optimized actions for hospitals, villages, warehouses, and markets across the NER.

---

## Repository Structure (Monorepo)

```
rahaaat/
├── backend/    # FastAPI project (Python)
│   ├── app/
│   │   ├── main.py        # App entrypoint + CORS + routers
│   │   ├── routes/        # health & mock API routes
│   │   ├── schemas/       # Pydantic models
│   │   └── graph/         # Network/graph logic (placeholder for now)
│   ├── data/              # JSON fixtures (e.g. locations.json)
│   ├── requirements.txt
│   └── .env.example
└── frontend/   # React app (Vite + Leaflet)
    ├── src/
    │   ├── App.jsx          # Main app with Leaflet map
    │   └── api/mock.js       # Mock API client
    ├── vite.config.js       # Dev proxy → backend
    └── .env.example
```

**Phase 0 status:** Monorepo scaffolding. Filesystem/JSON-based, no auth or database yet.

---

## Prerequisites

- **Python 3.11+**
- **Node.js 18+** and npm
- (Optional) OpenStreetMap tiles require internet access for the map to render.

---

## Backend (FastAPI)

```bash
cd backend

# 1. Create virtual environment
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy env template (optional)
cp .env.example .env

# 4. Run the dev server
uvicorn app.main:app --reload --port 8000
```

The backend will be served at `http://localhost:8000`.

- Health check: `GET /health` → `{"status": "ok", ...}`
- Mock locations: `GET /api/locations` → static markers from `data/locations.json`
- Interactive API docs: `http://localhost:8000/docs`

---

## Frontend (React + Vite + Leaflet)

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Copy env template (optional)
cp .env.example .env

# 3. Run the dev server
npm run dev
```

The frontend will be served at `http://localhost:5173`. It renders a Leaflet map and fetches the static set of markers from `GET /api/locations`.

During dev, Vite proxies `/api` → `http://localhost:8000`, so **start the backend first**, then the frontend.

---

## Running Both

**Terminal 1 — backend:**

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Environment Variables

| Location  | File          | Key                 | Default                | Purpose                        |
|-----------|---------------|---------------------|------------------------|--------------------------------|
| backend   | `.env.example`| `HOST`/`PORT`       | `0.0.0.0` / `8000`     | Dev server bind              |
| backend   | `.env.example`| `CORS_ORIGINS`      | `http://localhost:5173`| Allowed frontend origins      |
| frontend  | `.env.example`| `VITE_API_BASE_URL` | `/api`                 | Base URL for API calls        |
| frontend  | `.env.example`| `VITE_PORT`         | `5173`                 | Vite dev server port          |

---

## Roadmap (upcoming phases)

- **Regional Digital Twin** — dynamic model of infrastructure, environment, locations, resources, logistics & events.
- **Live Regional Map** — interactive visualization with disruptions, risk zones, and routes.
- **Accessibility Intelligence** — how reliably a location can be reached.
- **Disruption-impact analysis, resource prioritization & route/resource optimization.**

*See the project document for the full RAAHAT vision.*
