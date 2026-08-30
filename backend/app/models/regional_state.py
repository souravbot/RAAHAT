"""Regional State — the canonical digital twin data model."""

import datetime
from typing import Dict, List

from pydantic import BaseModel, Field, field_validator

from app.models.edge import TransportEdge
from app.models.node import RegionalNode
from app.models.vehicles import Vehicle


class RegionalMetadata(BaseModel):
    """Top-level metadata about the region."""

    region_id: str
    region_name: str
    version: int = 1
    state_updated_at: str = Field(default_factory=lambda: datetime.datetime.now(
        datetime.timezone.utc
    ).isoformat())


class RegionalState(BaseModel):
    """Canonical JSON-serializable regional state.

    This is the single source of truth. The NetworkX graph is derived from this
    via build_graph(); it is never the persistent application state.
    """

    metadata: RegionalMetadata
    nodes: List[RegionalNode]
    edges: List[TransportEdge]
    vehicles: List[Vehicle] = Field(default_factory=list)

    def node_map(self) -> Dict[str, RegionalNode]:
        return {n.id: n for n in self.nodes}

    def edge_map(self) -> Dict[str, TransportEdge]:
        return {e.id: e for e in self.edges}

    def vehicle_map(self) -> Dict[str, Vehicle]:
        return {v.id: v for v in self.vehicles}

    def clone(self) -> "RegionalState":
        """Deep copy used for simulation isolation.

        Simulations operate on this clone; the live instance is never touched.
        """
        return self.model_copy(deep=True)

    def to_payload(self) -> Dict:
        """JSON-serializable form (matches what /twin returns node/edge-wise)."""
        return {
            "metadata": self.metadata.model_dump(),
            "nodes": [n.model_dump_simple() for n in self.nodes],
            "edges": [e.model_dump_simple() for e in self.edges],
            "vehicles": [v.model_dump_simple() for v in self.vehicles],
        }

    def bump_version(self, updated_at: str) -> None:
        """Increment the state version and refresh the updated timestamp."""
        self.metadata.version += 1
        self.metadata.state_updated_at = updated_at

    @field_validator("nodes")
    @classmethod
    def node_ids_unique(cls, v):
        ids = [n.id for n in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Node IDs must be unique")
        return v

    @field_validator("edges")
    @classmethod
    def edge_ids_unique(cls, v):
        ids = [e.id for e in v]
        if len(ids) != len(set(ids)):
            raise ValueError("Edge IDs must be unique")
        return v
