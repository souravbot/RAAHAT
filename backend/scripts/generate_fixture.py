"""Deterministic fixture generator for the RAAHAT fictional NER demo region.

Run:
    python -m scripts.generate_fixture

Writes the canonical regional state to:
    ../data/regional_state.json
"""

import json
import random
from pathlib import Path

from app.models.edge import EdgeStatus, EdgeType, TransportEdge
from app.models.node import NodeState, NodeType, RegionalNode
from app.models.regional_state import RegionalMetadata, RegionalState

BACKEND_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BACKEND_DIR / "data"
OUTPUT_PATH = DATA_DIR / "regional_state.json"

REGION_ID = "raahat_demo_ner"
REGION_NAME = "RAAHAT Fictional NER Demo Region"
SEED = 42

# Fixed timestamp so regenerating the fixture is byte-for-byte reproducible.
# Using a constant (rather than now()) keeps the output deterministic.
FIXED_TIMESTAMP = "2026-01-01T00:00:00+00:00"


def _now() -> str:
    return FIXED_TIMESTAMP


# --------------------------------------------------------------------------
# Fixture topology. Node ids are stable identifiers; coordinates are fictional
# but geographically clustered to mirror NER connectivity characteristics.
# --------------------------------------------------------------------------

def build_nodes(rng: random.Random) -> list[RegionalNode]:
    """Define the ~25 nodes across three clusters.

    Cluster A — Main Service Hub (hospitals, warehouses, markets, junctions)
    Cluster B — Connected Communities (villages with multiple routes)
    Cluster C — Remote Communities (villages behind a bridge bottleneck)
    """

    def village(vid, name, lat, lng, population, vuln=None):
        attrs = {"population": population}
        if vuln is not None:
            attrs["vulnerability_index"] = vuln
        return RegionalNode(
            id=vid, name=name, type=NodeType.VILLAGE, lat=lat, lng=lng,
            attributes=attrs, state=NodeState(status="NORMAL"),
        )

    def hospital(hid, name, lat, lng, beds):
        return RegionalNode(
            id=hid, name=name, type=NodeType.HOSPITAL, lat=lat, lng=lng,
            attributes={
                "bed_count": beds,
                "inventory": {
                    "medicine": {"quantity": 500, "unit": "units", "daily_consumption_rate": 80},
                },
            },
            state=NodeState(status="NORMAL"),
        )

    def warehouse(wid, name, lat, lng, capacity, inventory):
        return RegionalNode(
            id=wid, name=name, type=NodeType.WAREHOUSE, lat=lat, lng=lng,
            attributes={"capacity": capacity, "inventory": inventory},
            state=NodeState(status="NORMAL"),
        )

    def market(mid, name, lat, lng, capacity):
        return RegionalNode(
            id=mid, name=name, type=NodeType.MARKET, lat=lat, lng=lng,
            attributes={"market_capacity": capacity},
            state=NodeState(status="NORMAL"),
        )

    def junction(jid, name, lat, lng, jclass):
        return RegionalNode(
            id=jid, name=name, type=NodeType.ROAD_JUNCTION, lat=lat, lng=lng,
            attributes={"junction_class": jclass},
            state=NodeState(status="NORMAL"),
        )

    def bridge(bid, name, lat, lng, bclass, hint=None):
        attrs = {"bridge_class": bclass}
        if hint is not None:
            attrs["criticality_hint"] = hint
        return RegionalNode(
            id=bid, name=name, type=NodeType.BRIDGE, lat=lat, lng=lng,
            attributes=attrs, state=NodeState(status="NORMAL"),
        )

    nodes = []

    # --- Cluster A: Main Service Hub -------------------------------------
    nodes.append(junction("J001", "Riverside Crossing Junction", 26.18, 91.72, "PRIMARY"))
    nodes.append(junction("J002", "Hill Station Junction", 26.14, 91.66, "SECONDARY"))
    nodes.append(junction("J003", "Valley Spur Junction", 26.10, 91.78, "SECONDARY"))
    nodes.append(junction("J004", "Tea Belt Junction", 26.22, 91.62, "TERTIARY"))

    nodes.append(hospital("H001", "Central District Hospital", 26.17, 91.70, 220))
    nodes.append(hospital("H002", "City Referral Hospital", 26.15, 91.68, 160))
    nodes.append(hospital("H003", "Sector Health Centre", 26.12, 91.74, 60))

    nodes.append(warehouse(
        "W001", "Central Supply Warehouse", 26.19, 91.73, 10000,
        {
            "medicine": {"quantity": 3000, "unit": "units"},
            "water": {"quantity": 15000, "unit": "litres"},
            "food": {"quantity": 8000, "unit": "kg"},
        },
    ))
    nodes.append(warehouse(
        "W002", "Riverside Depot", 26.16, 91.71, 8000,
        {
            "medicine": {"quantity": 2200, "unit": "units"},
            "water": {"quantity": 9000, "unit": "litres"},
            "food": {"quantity": 5000, "unit": "kg"},
        },
    ))
    nodes.append(warehouse(
        "W003", "Hill Storage Hub", 26.13, 91.67, 6000,
        {
            "medicine": {"quantity": 1500, "unit": "units"},
            "water": {"quantity": 6000, "unit": "litres"},
            "food": {"quantity": 3500, "unit": "kg"},
        },
    ))

    nodes.append(market("M001", "Town Centre Market", 26.18, 91.69, 4000))
    nodes.append(market("M002", "Riverside Market", 26.155, 91.72, 3000))

    nodes.append(village("V001", "Lungri Village", 26.13, 91.76, 4200, 0.3))
    nodes.append(village("V002", "Bhage Village", 26.11, 91.70, 1800, 0.25))

    # --- Cluster B: Connected Communities ---------------------------------
    nodes.append(junction("J005", "East Belt Junction", 26.26, 91.88, "SECONDARY"))
    nodes.append(junction("J006", "North Spur Junction", 26.30, 91.94, "TERTIARY"))

    nodes.append(village("V003", "Dholpur Village", 26.24, 91.84, 6200, 0.2))
    nodes.append(village("V004", "Rangia Village", 26.28, 91.90, 3300, 0.28))
    nodes.append(village("V005", "Nalbari Village", 26.20, 91.82, 5100, 0.22))
    nodes.append(village("V006", "Sonapur Village", 26.31, 91.97, 1400, 0.35))

    # --- Cluster C: Remote Communities (behind bridge bottleneck) ---------
    nodes.append(junction("J007", "South Remote Junction", 25.98, 91.62, "TERTIARY"))

    nodes.append(bridge("B001", "Far Bank River Bridge", 26.06, 91.72, "MAJOR", "only_road_crossing"))
    nodes.append(bridge("B002", "Deep Gorge Bridge", 26.02, 91.68, "MINOR", "seasonal_risk"))

    nodes.append(village("V007", "Alubari Village", 25.95, 91.66, 2600, 0.45))
    nodes.append(village("V008", "Nongriat Village", 25.92, 91.60, 1200, 0.5))

    return nodes


def build_edges(rng: random.Random) -> list[TransportEdge]:
    """Define ~28 road/bridge edges connecting the node ids above.

    Travel times are intentionally not perfectly proportional to distance so the
    network reads as terrain-like. Remote roads (Cluster C) get higher time/km.
    """

    def road(eid, a, b, km, minutes, risk, status=EdgeStatus.OPEN):
        return TransportEdge(
            id=eid, type=EdgeType.ROAD, connects=[a, b],
            distance_km=km, base_travel_time_min=minutes,
            status=status, risk_score=risk,
            state={"last_updated_at": ""},
        )

    def bridge_edge(eid, a, b, km, minutes, risk, status=EdgeStatus.OPEN):
        return TransportEdge(
            id=eid, type=EdgeType.BRIDGE, connects=[a, b],
            distance_km=km, base_travel_time_min=minutes,
            status=status, risk_score=risk,
            state={"last_updated_at": ""},
        )

    edges = []

    # ---- Cluster A hub (ring + spokes) ---------------------------------
    edges.append(road("E001", "J001", "J002", 8.0, 12, 8))
    edges.append(road("E002", "J002", "J003", 14.0, 22, 15))
    edges.append(road("E003", "J003", "J001", 12.0, 18, 10))
    edges.append(road("E004", "J001", "J004", 9.0, 14, 12))

    # services to hub
    edges.append(road("E005", "J001", "H001", 2.0, 4, 5))
    edges.append(road("E006", "J002", "H002", 1.5, 3, 4))
    edges.append(road("E007", "J003", "H003", 2.5, 5, 6))
    edges.append(road("E008", "J001", "W001", 1.8, 4, 5))
    edges.append(road("E009", "J002", "W002", 2.2, 4, 5))
    edges.append(road("E010", "J003", "W003", 2.0, 4, 5))
    edges.append(road("E011", "J001", "M001", 1.2, 3, 4))
    edges.append(road("E012", "J003", "M002", 1.6, 3, 4))

    # local villages
    edges.append(road("E013", "J003", "V001", 6.0, 14, 20))
    edges.append(road("E014", "J002", "V002", 7.5, 16, 22))
    edges.append(road("E015", "J004", "V002", 9.0, 20, 25))

    # ---- Cluster B -------------------------------------------------------
    edges.append(road("E016", "J001", "J005", 18.0, 30, 12))
    edges.append(road("E017", "J005", "V003", 4.0, 9, 12))
    edges.append(road("E018", "J005", "V004", 6.5, 13, 16))
    edges.append(road("E019", "J005", "J006", 10.0, 18, 14))
    edges.append(road("E020", "J006", "V004", 5.0, 11, 15))
    edges.append(road("E021", "J005", "V005", 7.0, 15, 18))
    edges.append(road("E022", "J006", "V006", 8.0, 19, 24))

    # ---- Cluster C (remote, behind bridge) ------------------------------
    # B001 is the primary gallon; B002 a secondary, higher-risk crossing.
    edges.append(bridge_edge("E023", "J003", "B001", 5.0, 8, 12))
    edges.append(road("E024", "B001", "J007", 16.0, 34, 20))
    edges.append(road("E025", "J007", "V007", 6.5, 16, 24))
    edges.append(road("E026", "J007", "V008", 8.5, 22, 30))

    # Secondary route via B002 (higher risk / slower) so isolation is not total
    edges.append(bridge_edge("E027", "J004", "B002", 12.0, 26, 40))
    edges.append(road("E028", "B002", "J007", 9.0, 24, 35))

    # local link within cluster C
    edges.append(road("E029", "V007", "V008", 7.0, 18, 26))

    return edges


def build_state() -> RegionalState:
    rng = random.Random(SEED)  # deterministic
    nodes = build_nodes(rng)
    edges = build_edges(rng)

    state = RegionalState(
        metadata=RegionalMetadata(
            region_id=REGION_ID,
            region_name=REGION_NAME,
            version=1,
            state_updated_at=_now(),
        ),
        nodes=nodes,
        edges=edges,
    )
    return state


def _validate(state: RegionalState) -> None:
    node_ids = {n.id for n in state.nodes}
    assert len(node_ids) == len(state.nodes), "Duplicate node ids"
    edge_ids = {e.id for e in state.edges}
    assert len(edge_ids) == len(state.edges), "Duplicate edge ids"
    for edge in state.edges:
        for nid in edge.connects:
            assert nid in node_ids, f"Edge {edge.id} references missing node {nid}"
    print(f"Nodes: {len(state.nodes)}, Edges: {len(state.edges)}")
    print("Node types:", {t.value: sum(1 for n in state.nodes if n.type == t) for t in NodeType})
    print("Edge types:", {t.value: sum(1 for e in state.edges if e.type == t) for t in EdgeType})
    print("Edge statuses:", {s.value: sum(1 for e in state.edges if e.status == s) for s in EdgeStatus})


def main() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    state = build_state()
    _validate(state)

    payload = {
        "metadata": state.metadata.model_dump(),
        "nodes": [n.model_dump_simple() for n in state.nodes],
        "edges": [e.model_dump_simple() for e in state.edges],
    }
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
