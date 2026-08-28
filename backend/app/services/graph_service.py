"""GraphService — builds and inspects a NetworkX projection of the regional state.

The NetworkX graph is a *computational representation* derived from the canonical
RegionalState (JSON). It is never the source of truth / persistent state.
"""

from typing import Dict

import networkx as nx

from app.models.regional_state import RegionalState


def build_graph(state: RegionalState) -> nx.MultiGraph:
    """Build an undirected MultiGraph projection from canonical regional state.

    A MultiGraph is used so that multiple parallel connections between the same
    two nodes remain possible (an edge is keyed by its edge id).
    """
    graph = nx.MultiGraph()

    for node in state.nodes:
        graph.add_node(
            node.id,
            name=node.name,
            type=node.type.value,
            category=node.category.value if node.category else None,
            lat=node.lat,
            lng=node.lng,
            attributes=node.attributes,
            state=node.state.model_dump(),
        )

    for edge in state.edges:
        graph.add_edge(
            edge.connects[0],
            edge.connects[1],
            key=edge.id,
            edge_id=edge.id,
            type=edge.type.value,
            distance_km=edge.distance_km,
            base_travel_time_min=edge.base_travel_time_min,
            status=edge.status.value,
            risk_score=edge.risk_score,
            attributes=edge.attributes,
            state=edge.state.model_dump(),
        )

    return graph


class GraphService:
    """Thin wrapper exposing graph build + inspect helpers for API use."""

    def __init__(self, state: RegionalState):
        self._state = state
        self._graph: nx.MultiGraph = build_graph(state)

    @property
    def graph(self) -> nx.MultiGraph:
        return self._graph

    def refresh(self) -> None:
        """Rebuild the graph projection from the current regional state."""
        self._graph = build_graph(self._state)

    def nodes_by_type(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for _, data in self._graph.nodes(data=True):
            t = data.get("type", "UNKNOWN")
            counts[t] = counts.get(t, 0) + 1
        return counts

    def edges_by_status(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for _, _, data in self._graph.edges(data=True):
            s = data.get("status", "UNKNOWN")
            counts[s] = counts.get(s, 0) + 1
        return counts
