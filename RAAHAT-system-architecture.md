# RAAHAT — System / Model Architecture (STEP 3)

This is the architecture blueprint. Once finalized, paste this whole document (or the relevant section) into your AI agent's context before every build prompt — it's the contract every phase must obey. Nothing in Phase 0 onward should contradict this.

---

## 1. HIGH-LEVEL ARCHITECTURE (all major layers)

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                       │
│   Map View · Panels · What-If UI · NL Assistant Chat     │
└───────────────────────────┬───────────────────────────────┘
                             │ REST (JSON)
┌───────────────────────────▼───────────────────────────────┐
│                        API LAYER                           │
│         FastAPI — one router per engine (Section 6)        │
└───────────────────────────┬───────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────┐
│                 REGIONAL STATE / DIGITAL TWIN               │
│      In-memory networkx graph = single source of truth      │
│         (Section 4) — every engine reads/writes here        │
└───────────────────────────┬───────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                     ▼
┌───────────────┐   ┌────────────────┐   ┌──────────────────┐
│ ACCESSIBILITY  │   │ IMPACT/DEPEND. │   │ SUPPLY/DEPLETION  │
│    ENGINE       │   │     ENGINE      │   │      ENGINE        │
└───────┬────────┘   └────────┬────────┘   └─────────┬─────────┘
        │                     │                       │
        └──────────┬──────────┴───────────┬───────────┘
                    ▼                      ▼
           ┌─────────────────┐   ┌────────────────────┐
           │  PRIORITY ENGINE │   │ OPTIMIZATION ENGINE │
           └────────┬─────────┘   └──────────┬──────────┘
                    └───────────┬─────────────┘
                                ▼
                     ┌────────────────────┐
                     │ RECOMMENDATION      │
                     │ ENGINE (explainable)│
                     └──────────┬──────────┘
                                ▼
                     ┌────────────────────┐
                     │  NL ASSISTANT (LLM) │  ← reads engine outputs only,
                     │  (thin wrapper)      │    never invents numbers
                     └────────────────────┘
```

**Rule for the agent:** every engine below the Digital Twin is a *pure function* over graph state: `(graph_state, params) → result`. No engine mutates the live graph directly except the Disruption/Event Engine (Section on Event handling). Simulation calls always operate on a cloned graph.

---

## 2. FRONTEND ARCHITECTURE

**Structure:**
```
/frontend/src
├── api/            → one file per engine (accessibility.ts, impact.ts, priority.ts, ...)
├── map/            → MapView, NodeMarker, EdgeLine, layers for accessibility/risk coloring
├── panels/         → NodeDetailPanel, EdgeDetailPanel, ImpactPanel, PriorityPanel, ActionPlanPanel
├── simulate/        → DisruptionInjector, ScenarioCompare
├── assistant/        → ChatPanel
├── state/           → single global store (Zustand/Redux) holding: current twin snapshot,
│                       selected node/edge, active simulation (if any), last recommendation
└── App.tsx
```

**Core rule:** the frontend never computes accessibility/impact/priority itself — it only renders what the backend engines return. This keeps the "brain" server-side and demo-safe (no drift between what's shown and what's real).

**State model (frontend):**
- `liveTwin` — always mirrors `GET /twin`
- `simTwin` — nullable; populated only during a What-If session, rendered with a distinct visual style (e.g. dashed edges) so judges can tell live vs. hypothetical apart at a glance
- `activeSelection` — the clicked node/edge driving the detail panel
- `lastRecommendation` — the most recent action plan, kept visible until replaced

---

## 3. BACKEND / API ARCHITECTURE

**Structure:**
```
/backend
├── main.py                 → FastAPI app, router registration, CORS
├── models/                 → Pydantic schemas (Node, Edge, Vehicle, Disruption, ImpactResult, ...)
├── graph/
│   ├── twin_store.py       → holds the single live networkx graph instance + clone() helper
│   └── fixtures.py         → generates the demo region
├── engines/
│   ├── accessibility.py
│   ├── impact.py
│   ├── supply.py
│   ├── priority.py
│   ├── optimization.py
│   └── recommendation.py
├── routers/                → one router per engine, thin — validates input, calls engine, returns result
├── assistant/               → NL layer, tool-calling wrapper around the routers above
└── config/                 → priority weights, resource weights, thresholds (JSON, not hardcoded)
```

**Rule for the agent:** routers contain no business logic. All logic lives in `engines/`, which are plain Python functions/classes that take graph state and return typed results. This is what lets you unit-test the intelligence separately from the API, and lets the NL assistant call the *same* functions the REST endpoints call — one source of truth, satisfying Feature 31's "must not invent operational numbers" rule structurally, not by prompt-instruction alone.

---

## 4. REGIONAL STATE & DIGITAL TWIN ARCHITECTURE

- **Single live graph instance** held in server memory (`twin_store.py`), loaded from a fixture JSON at startup.
- **Every mutation** (disruption injection, vehicle dispatch, inventory update) goes through a small set of explicit mutator functions in `twin_store.py` — never ad hoc graph edits scattered across engines. This is what prevents "Phase -1 assumptions" from drifting: one file owns all writes to state.
- **Simulation isolation:** `twin_store.clone()` returns a deep copy for any `/simulate/*` call. Simulated calls never touch `twin_store`'s live instance.
- **Versioning (lightweight):** keep a `state_version` counter incremented on every live mutation, returned in `/twin`, so the frontend can detect staleness without polling logic getting complicated.

---

## 5. GRAPH / GIS ARCHITECTURE

- Graph = `networkx.Graph` (undirected is fine for road networks; use `Graph`, not `DiGraph`, unless one-way roads matter for your demo — they likely don't).
- **Node types:** `village`, `hospital`, `warehouse`, `market`, `junction` (junctions are pure infrastructure nodes with no resources — they exist so roads can branch without forcing every intersection to be a "place").
- **Edge attributes:** `distance_km`, `base_travel_time_min`, `status`, `risk_score`, `mode` (default `"road"`, extendable later for Feature 20).
- **Core algorithms used:**
  - Accessibility → `networkx.shortest_path` / `dijkstra_path_length` with a custom weight function combining `base_travel_time_min` and `risk_score` (weight = travel_time × (1 + risk_score/100), so a risky-but-open edge is still usable but penalized, matching the doc's "not simply the shortest route" requirement).
  - Impact → for a hypothetically closed edge, remove it from a cloned graph, then re-run reachability (`networkx.has_path`) from every hospital/warehouse to every village; anything that loses all paths = newly isolated.
  - Criticality (Feature 8) → betweenness centrality (`networkx.edge_betweenness_centrality`) as the base signal, blended with "villages/hospitals dependent" counts.

---

## 6. AI/ML INTELLIGENCE ARCHITECTURE

Be explicit with the agent that RAAHAT is **mostly deterministic graph/optimization logic**, with ML/LLM used only where it earns its place:

| Component | Technique | Why |
|---|---|---|
| Disruption risk prediction (F6) | Simple weighted rule or small logistic-regression-style model on rainfall/terrain/edge-age features (fixture-driven for demo) | Doesn't need deep learning; judges care that the *signal flows correctly*, not model sophistication |
| Demand forecasting (F10) | Simple trend/seasonality heuristic over historical fixture data | Same reasoning |
| Supply depletion (F11) | Pure arithmetic (stock / consumption_rate) | Deterministic, always correct — no ML needed |
| Accessibility/Impact/Priority/Optimization | Graph algorithms + weighted scoring (deterministic, explainable) | Core engines — must be deterministic so demo never "hallucinates" |
| NL Assistant (F31) | LLM with tool-calling, restricted to reading engine outputs | Only place a generative model touches the system |

**Rule for the agent:** don't reach for a neural net where a weighted formula does the job — a transparent formula is *more* impressive to judges here because it's explainable on demand (Feature 29 requires this anyway).

---

## 7. IMPACT & DEPENDENCY ARCHITECTURE

```
Edge status change
      ↓
Clone live graph
      ↓
Remove/degrade the edge in the clone
      ↓
For each hospital/warehouse: recompute reachable village set (BFS/DFS)
      ↓
Diff against pre-change reachable sets
      ↓
newly_isolated_villages = villages that lost ALL hospital/warehouse reach
      ↓
degraded_villages = villages whose accessibility_score dropped but still reachable
      ↓
affected_hospitals/warehouses = those whose service population shrank
      ↓
Feed into Supply Engine → does isolation coincide with low stock? (severity multiplier)
      ↓
Return structured ImpactResult + template-generated impact_summary string
```

**Dependency direction is explicit:** Impact Engine depends on Accessibility Engine's path logic but does NOT depend on Priority/Optimization — those come after, consuming Impact's output. Keep this one-directional; don't let the agent create circular calls between engines.

---

## 8. OPTIMIZATION ARCHITECTURE

Three sequential sub-decisions, each a small, testable function — not one monolithic "solve everything" call:

1. **Source selection** (`select_warehouse`): filter warehouses with sufficient stock of the needed resource → rank by (accessibility-aware distance to target, current risk-adjusted travel time) → pick best, keep runner-ups for the "reasons" explanation ("Warehouse W2 chosen over W1: W1's route risk is 40% higher").
2. **Route selection** (`select_route`): risk-weighted shortest path from chosen warehouse to target, avoiding CLOSED edges entirely, penalizing AT_RISK edges via the weight function from Section 5.
3. **Vehicle selection** (`select_vehicle`): filter available vehicles by capacity ≥ shipment size and reachability to the source warehouse → pick nearest.

Combine into `recommend_action(target_node, resource_type)` which calls all three in order and assembles the final `ActionPlan{warehouse, route, vehicle, reasons[]}`. Each sub-function contributes its own reason strings — this is where Explainability (F29) is generated structurally, not bolted on afterward.

---

## 9. DATABASE ARCHITECTURE

For the hackathon prototype: **no full RDBMS needed.**

- **Live state:** in-memory graph (Section 4), source of truth during runtime.
- **Persistence:** JSON fixture files under `/backend/data/` — one for the region graph, one for vehicles, one for config/weights. Loaded at startup; `POST /demo/reset` reloads them.
- **If you want state to survive a server restart mid-demo** (nice safety net): SQLite with two tables — `nodes` and `edges` mirroring the graph — synced on every mutation. Optional; only add this in a later phase if the in-memory approach proves fragile during rehearsal.

This will be finalized in STEP 5 (Database & Data Model) — this section is just the architectural stance so the agent doesn't default to spinning up Postgres + ORM machinery you don't need.

---

## 10. DATA FLOW BETWEEN EVERY MODULE

```
Fixture JSON
     ↓
twin_store (live graph)  ←──────────────┐
     ↓                                   │ (mutations only via
GET /twin → Frontend map render          │  explicit mutator fns)
     ↓                                   │
User clicks "Inject Disruption"          │
     ↓                                   │
POST /disruption ───────────────────────┘
     ↓
Accessibility Engine recomputes scores for all villages
     ↓
GET /twin (refetched) → map recolors
     ↓
User clicks "Analyze Impact" on the disrupted edge
     ↓
POST /impact/{edge_id} → clones graph, computes cascade → ImpactResult
     ↓
Frontend renders Impact panel + highlights affected nodes
     ↓
Supply Engine (GET /depletion) cross-references affected hospitals' stock
     ↓
Priority Engine (GET /priority) ranks urgent (node, resource) pairs
     ↓
User selects a priority row → POST /recommend-action
     ↓
Optimization Engine → warehouse + route + vehicle + reasons
     ↓
Recommendation Engine assembles final ActionPlan JSON
     ↓
Frontend renders Action Plan card + draws route on map
     ↓
(optional) NL Assistant: POST /ask → tool-calls the above endpoints → LLM phrases the answer
```

---

## 11. COMPLETE END-TO-END REQUEST FLOW (single demo click-through)

```
1. GET  /twin                      → initial map render
2. POST /disruption                → bridge closes
3. GET  /twin                      → map reflects new edge status + updated accessibility_score
4. POST /impact/{edge_id}          → cascading impact computed
5. GET  /depletion                 → critical supply check on affected hospitals
6. GET  /priority                  → ranked urgency list
7. POST /recommend-action          → warehouse + route + vehicle + reasons
8. (optional) POST /ask            → "why did you choose Route C?" answered from step 7's data
```

`POST /demo/run-scenario` (Phase 11 from the build plan) is just this entire flow collapsed into one backend call for a single-click judge demo — but the agent should build the 7 separate endpoints first, then compose the demo shortcut on top, not the reverse.

---

## Contract summary for the agent (paste this line into every build prompt if space allows)

> All engines are pure functions over graph state; only `twin_store.py` mutates live state; simulations always run on a cloned graph; every recommendation must carry a `reasons: []` list generated from the actual computation, never from a separate explanation step; the NL assistant only reads engine outputs via tool-calls and never fabricates numbers.

---

**Next (STEP 4):** Decision Contract + Demo Scenario — the exact fixture data (node names, stock numbers, the specific bridge that fails) and the precise sequence of clicks for your live demo, locked down so every engine's output is deterministic and rehearsable. Say the word and I'll draft that next.
