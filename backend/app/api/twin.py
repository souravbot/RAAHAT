"""/twin routes — read access to the Regional Digital Twin.

These routes contain no business logic; they validate input, call services and
serialize results.
"""

from fastapi import APIRouter, HTTPException

from app.api.schemas import (
    EdgeDetailResponse,
    NodeDetailResponse,
    TwinResponse,
    TwinSummary,
)
from app.services.regional_state_service import get_regional_state_service
from app.services.graph_service import GraphService
from app.services.accessibility_service import calculate_accessibility

router = APIRouter(prefix="/twin", tags=["twin"])

_service = get_regional_state_service()


def _graph_service() -> GraphService:
    # Rebuild from canonical state each call so the projection stays fresh once
    # later phases mutate state. Cheap for this graph size.
    return GraphService(_service.state)


@router.get("", response_model=TwinResponse)
def get_twin() -> TwinResponse:
    """Return the complete current Regional State plus a summary."""
    state = _service.state
    graph = _graph_service()

    # Calculate village accessibility intelligence
    from app.services.accessibility_service import calculate_accessibility
    accessibility_result = calculate_accessibility(state)

    return TwinResponse(
        metadata=state.metadata,
        nodes=[n.model_dump_simple() for n in state.nodes],
        edges=[e.model_dump_simple() for e in state.edges],
        summary=TwinSummary(
            total_nodes=len(state.nodes),
            total_edges=len(state.edges),
            nodes_by_type=graph.nodes_by_type(),
            edges_by_status=graph.edges_by_status(),
        ),
        village_accessibility=[v.model_dump() for v in accessibility_result.villages],
    )


@router.get("/node/{node_id}", response_model=NodeDetailResponse)
def get_node(node_id: str) -> NodeDetailResponse:
    """Return a single node plus its directly connected edges and nodes."""
    try:
        node = _service.get_node(node_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Node {node_id} does not exist")

    edges = _service.edges_for_node(node_id)
    neighbors = _service.neighbors_of(node_id)
    neighbor_nodes = [_service.get_node(nid) for nid in neighbors]

    return NodeDetailResponse(
        node=node,
        directly_connected_edges=edges,
        directly_connected_nodes=neighbor_nodes,
    )


@router.get("/edge/{edge_id}", response_model=EdgeDetailResponse)
def get_edge(edge_id: str) -> EdgeDetailResponse:
    """Return a single edge plus its source and target nodes."""
    try:
        edge = _service.get_edge(edge_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Edge {edge_id} does not exist")

    source = _service.get_node(edge.connects[0])
    target = _service.get_node(edge.connects[1])

    return EdgeDetailResponse(
        edge=edge,
        source_node=source,
        target_node=target,
    )
