"""Response schemas for the /twin API endpoints."""

from typing import Any, Dict, List

from pydantic import BaseModel

from app.models.edge import TransportEdge
from app.models.node import RegionalNode
from app.models.regional_state import RegionalMetadata
from app.models.accessibility import VillageAccessibility


class TwinSummary(BaseModel):
    total_nodes: int
    total_edges: int
    nodes_by_type: Dict[str, int]
    edges_by_status: Dict[str, int]


class TwinResponse(BaseModel):
    metadata: RegionalMetadata
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    summary: TwinSummary
    # Village accessibility intelligence
    village_accessibility: List[VillageAccessibility] = []


class NodeDetailResponse(BaseModel):
    node: RegionalNode
    directly_connected_edges: List[TransportEdge]
    directly_connected_nodes: List[RegionalNode]


class EdgeDetailResponse(BaseModel):
    edge: TransportEdge
    source_node: RegionalNode
    target_node: RegionalNode
