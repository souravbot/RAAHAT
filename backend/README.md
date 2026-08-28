# RAAHAT Backend — Regional Digital Twin (Phase 1)

The backend for the RAAHAT logistics intelligence platform. This phase implements
**Feature 1: Regional Digital Twin** — a canonical, JSON-serializable Regional
State representing a fictional NER-like prototype region, projected into a
NetworkX graph for traversal and future intelligence engines.

> **Phase 1 answers only:** *What exists in the region right now, and how is it connected?*
> It does **not** yet answer *what will happen, who is affected, which resource is
> urgent, or what should be done.* Those belong to later RAAHAT engines.

---

## Structure

```
backend/
├── app/
│   ├── main.py                       # FastAPI app, CORS, router registration
│   ├── models/                       # Pydantic schemas (source-of-truth types)
│   │   ├── node.py                   # Node categories & types
│   │   ├── edge.py                   # Edge types & statuses
│   │   └── regional_state.py         # Canonical Regional State
│   ├── services/
│   │   ├── regional_state_service.py # Load / validate / read state + singleton
│   │   └── graph_service.py          # build_graph() → networkx MultiGraph
│   ├── api/
│   │   ├── twin.py                   # GET /twin, /twin/node/{id}, /twin/edge/{id}
│   │   ├── health.py                 # GET /health
│   │   └── legacy_mock.py            # Kept for the Phase-0 frontend /api/locations
│   └── core/
│       └── config.py                 # Settings
├── data/
│   └── regional_state.json           # Canonical state (generated fixture)
├── scripts/
│   └── generate_fixture.py           # Deterministic fixture generator
├── requirements.txt
└── README.md
```

---

## Key design principles

- **JSON Regional State is the source of truth.** The NetworkX graph is a
  *computational projection* built from it (`build_graph(state)`), never the
  persistent state.
- **`MultiGraph`** so multiple parallel connections between the same two nodes
  remain possible; each edge is keyed by its `edge_id`.
- **`RegionalStateService`** owns all read access and validation. Later phases can
  swap the file-backed repository without changing engine interfaces.
- **Startup does not regenerate the fixture** — operational state on disk is never
  overwritten automatically. Run the generator explicitly to reset.

---

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Regenerate the fixture (as needed)

```bash
python -m scripts.generate_fixture
```

Deterministic: same seed → same output, byte-for-byte reproducible.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

---

## Endpoints

| Method | Path               | Description                                        |
|--------|--------------------|----------------------------------------------------|
| GET    | `/health`          | Health check                                       |
| GET    | `/twin`            | Full regional state + summary                      |
| GET    | `/twin/node/{id}`  | Node + directly connected edges & nodes            |
| GET    | `/twin/edge/{id}`  | Edge + source/target nodes                         |

Invalid node/edge IDs return `404` with a structured body:

```json
{ "detail": "Node V999 does not exist" }
```

---

## Demo network

25 nodes / 29 edges clustered into three groups:

- **Cluster A — Main Service Hub:** hospitals, warehouses, markets, junctions.
- **Cluster B — Connected Communities:** villages with multiple routes.
- **Cluster C — Remote Communities:** villages behind a **bridge bottleneck**
  (B001 primary, B002 higher-risk secondary). Closing the bridges isolates
  Cluster C — the cascading access reduction later phases will build on.
