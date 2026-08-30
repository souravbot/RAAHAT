"""Facility accessibility service for the RAAHAT platform (Phase 7).

Calculates how accessible an inventory-holding facility (hospital/warehouse) is
through the current operational transport network.

This is DIFFERENT from the Phase 4 village accessibility engine: the Phase 4
engine answers "how accessible are services FROM each village". This service
answers "how accessible is a FACILITY itself to the rest of the region", using:

  - whether the facility is reachable through the operational network
  - the number of operational routes (edges) directly connected to it
  - the risk-adjusted travel cost to/from surrounding regional nodes
  - connectivity with surrounding regional nodes

The Phase 4 village logic is NOT copied or redesigned here; this is a separate,
modular facility-level calculation reusing the same operational-graph approach.
"""

import networkx as nx

from app.models.regional_state import RegionalState
from app.models.node import NodeType
from app.models.edge import EdgeStatus


def build_facility_graph(state: RegionalState) -> nx.Graph:
    """Build an undirected graph with only traversable (OPEN/AT_RISK) edges.

    Risk-adjusted travel cost is used as the edge weight, matching the Phase 4
    and Phase 6 operational graphs.
    """
    G = nx.Graph()

    for node in state.nodes:
        G.add_node(
            node.id,
            name=node.name,
            type=node.type.value,
            lat=node.lat,
            lng=node.lng,
        )

    for edge in state.edges:
        if edge.status in (EdgeStatus.OPEN, EdgeStatus.AT_RISK):
            risk_factor = 1 + (edge.risk_score / 100.0)
            weight = edge.base_travel_time_min * risk_factor
            G.add_edge(
                edge.connects[0],
                edge.connects[1],
                edge_id=edge.id,
                weight=weight,
                distance_km=edge.distance_km,
                base_travel_time_min=edge.base_travel_time_min,
                status=edge.status.value,
                risk_score=edge.risk_score,
            )

    return G


def _connectivity_score(graph: nx.Graph, node_id: str) -> float:
    """Score the facility's direct connectivity (0-100).

    0 operational routes  -> 0
    1-2 operational routes -> proportional (0-50)
    3+ operational routes  -> 50-100
    """
    if node_id not in graph:
        return 0.0
    degree = graph.degree(node_id)

    if degree <= 0:
        return 0.0
    if degree <= 2:
        return degree * 25.0  # 25 / 50
    if degree >= 4:
        return 100.0
    return 50.0 + (degree - 2) * 25.0  # 3 -> 75


def _network_position_score(graph: nx.Graph, state: RegionalState, node_id: str) -> float:
    """Score how well-connected the facility is to surrounding regional nodes.

    Uses the risk-adjusted travel cost to the nearest N surrounding nodes and
    the number of reachable regional nodes in total.

    Returns a score 0-100 (higher = better connected = more accessible).
    """
    if node_id not in graph:
        return 0.0

    other_nodes = [n.id for n in state.nodes if n.id != node_id and n.id in graph]
    if not other_nodes:
        return 0.0

    costs = []
    for other_id in other_nodes:
        try:
            cost = nx.shortest_path_length(graph, node_id, other_id, weight="weight")
            costs.append(cost)
        except nx.NetworkXNoPath:
            continue

    if not costs:
        return 0.0

    reachable_count = len(costs)
    reachability_ratio = reachable_count / len(other_nodes)

    # Average risk-adjusted cost to the nearest 5 reachable nodes.
    nearest = sorted(costs)[:5]
    avg_cost = sum(nearest) / len(nearest)

    # Cost scoring: <= 15 min -> 100, >= 120 min -> 0, linear between.
    if avg_cost <= 15:
        cost_score = 100.0
    elif avg_cost >= 120:
        cost_score = 0.0
    else:
        cost_score = 100.0 - ((avg_cost - 15.0) / 105.0) * 100.0

    # Combine reachability ratio (40%) + nearest-node cost score (60%).
    score = 0.40 * (reachability_ratio * 100.0) + 0.60 * cost_score
    return max(0.0, min(100.0, score))


def calculate_facility_accessibility(
    state: RegionalState,
    facility_id: str,
    graph: nx.Graph = None,
) -> float:
    """Calculate an accessibility score (0-100) for an inventory facility.

    A score of 0 means the facility is completely isolated from the operational
    network. Higher scores mean the facility is easier to reach and better
    connected to the rest of the region.
    """
    if graph is None:
        graph = build_facility_graph(state)

    if facility_id not in graph:
        return 0.0

    connectivity = _connectivity_score(graph, facility_id)
    network_position = _network_position_score(graph, state, facility_id)

    # Connectivity 40% + network position 60%.
    score = 0.40 * connectivity + 0.60 * network_position
    return round(max(0.0, min(100.0, score)), 1)


def calculate_facility_accessibility_map(
    state: RegionalState,
    facility_ids: list,
) -> dict:
    """Calculate facility accessibility scores for many facilities in one pass.

    Reuses one operational graph for all facilities (avoids rebuilding it per
    facility).
    """
    graph = build_facility_graph(state)
    result = {}
    for facility_id in facility_ids:
        result[facility_id] = calculate_facility_accessibility(
            state, facility_id, graph
        )
    return result