"""RouteOptimizer — accessibility-aware route optimization for RAAHAT (Phase 8).

Finds the shortest + safest route between two nodes:

  - CLOSED edges are NEVER traversed.
  - AT_RISK edges receive a configurable penalty (default 2.0x).
  - OPEN edges use their normal travel time / distance.

The algorithm is deterministic and explainable. It builds on the existing
operational-graph approach already used elsewhere (Phase 4/6), so no duplicate
dataset or routing architecture is introduced.
"""

import networkx as nx
from typing import Dict, List, Optional, Tuple

from app.models.regional_state import RegionalState
from app.models.edge import EdgeStatus


class RouteOptimizer:
    """Computes accessibility-aware routes over the operational network."""

    RISK_PENALTY = 2.0  # configurable factor applied to AT_RISK edges

    def __init__(self, risk_penalty: float = RISK_PENALTY):
        self.risk_penalty = risk_penalty

    def build_graph(self, state: RegionalState) -> nx.Graph:
        """Build an undirected graph with ONLY traversable edges.

        - OPEN    edges: weight = base_travel_time_min
        - AT_RISK edges: weight = base_travel_time_min * risk_penalty
        - CLOSED  edges: excluded entirely

        Edge attributes keep status/penalty metadata for explanation + drawing.
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
            if edge.status == EdgeStatus.CLOSED:
                continue  # CLOSED = inaccessible, never part of a route

            if edge.status == EdgeStatus.AT_RISK:
                weight = edge.base_travel_time_min * self.risk_penalty
                penalty = True
            else:  # OPEN
                weight = edge.base_travel_time_min
                penalty = False

            G.add_edge(
                edge.connects[0],
                edge.connects[1],
                edge_id=edge.id,
                weight=float(weight),
                distance_km=edge.distance_km,
                base_travel_time_min=edge.base_travel_time_min,
                status=edge.status.value,
                risk_score=edge.risk_score,
                penalty=penalty,
            )

        return G

    def find_route(
        self,
        state: RegionalState,
        start: str,
        end: str,
        graph: Optional[nx.Graph] = None,
    ) -> Optional[Dict]:
        """Find the best accessibility-aware route from start to end.

        Returns None when no feasible route exists (either node is missing from
        the graph or there is no path through non-CLOSED edges).
        """
        if graph is None:
            graph = self.build_graph(state)

        if start not in graph or end not in graph:
            return None

        try:
            path = nx.shortest_path(graph, start, end, weight="weight")
        except nx.NetworkXNoPath:
            return None

        total_weighted_cost = 0.0
        total_distance_km = 0.0
        edges_detail = []

        for u, v in zip(path[:-1], path[1:]):
            data = graph[u][v]
            # Normalize MultiGraph-style data: take the chosen edge attributes.
            edge_info = data if not isinstance(data, dict) or "edge_id" in data else data
            total_weighted_cost += float(edge_info["weight"])
            total_distance_km += float(edge_info["distance_km"])
            edges_detail.append(
                {
                    "source": u,
                    "target": v,
                    "edge_id": edge_info["edge_id"],
                    "status": edge_info["status"],
                    "distance_km": edge_info["distance_km"],
                    "weight": edge_info["weight"],
                }
            )

        return {
            "start": start,
            "end": end,
            "path": path,
            "edges": edges_detail,
            "total_distance": round(total_distance_km, 1),
            "weighted_cost": round(total_weighted_cost, 1),
            "at_risk_segments": sum(1 for e in edges_detail if e["status"] == "AT_RISK"),
            "closed_segments": 0,  # CLOSED edges are never part of a route
        }

    def route_has_closed(self, state: RegionalState, result: Optional[Dict]) -> bool:
        """Sanity check: a route must never include CLOSED edges."""
        if result is None or not result.get("edges"):
            return False
        return any(e["status"] == "CLOSED" for e in result["edges"])

    def describe_segments(self, result: Optional[Dict]) -> str:
        """Human-readable one-line summary of the route (for reasons)."""
        if result is None:
            return "no accessible route"
        parts = [
            f"{len(result['edges'])} segment(s)",
            f"distance {result['total_distance']} km",
            f"weighted cost {result['weighted_cost']}",
        ]
        if result["at_risk_segments"]:
            parts.append(f"{result['at_risk_segments']} AT_RISK")
        return ", ".join(parts)


def get_route_optimizer() -> RouteOptimizer:
    return RouteOptimizer()