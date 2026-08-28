"""RegionalStateService — loads, validates and serves the canonical regional state.

Phase 1 is file-backed. Later phases may swap the repository behind this service
without changing the engine interfaces.

This service is the single owner of ALL live-state mutations. Engines must go
through these mutators; they must never edit the graph/state ad hoc.
"""

import datetime
import json
from functools import lru_cache
from pathlib import Path
from typing import Dict, List

from app.models.edge import EdgeStatus, TransportEdge
from app.models.node import RegionalNode
from app.models.regional_state import RegionalState
from app.core.config import get_settings


class RegionalStateError(Exception):
    """Raised when the regional state cannot be loaded or is invalid."""


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


class RegionalStateService:
    """Owns the current canonical RegionalState instance + read access helpers.

    All live-state mutations go through the mutator methods below.
    """

    def __init__(self, data_path: Path):
        self._data_path = data_path
        self._state: RegionalState = self._load()

    # ------------------------------------------------------------------ load
    def _load(self) -> RegionalState:
        if not self._data_path.exists():
            raise RegionalStateError(
                f"Regional state file not found: {self._data_path}. "
                "Run scripts/generate_fixture.py first."
            )
        try:
            raw = json.loads(self._data_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise RegionalStateError(f"Invalid JSON in {self._data_path}: {exc}")
        try:
            state = RegionalState.model_validate(raw)
        except Exception as exc:
            raise RegionalStateError(f"Regional state validation failed: {exc}")

        self._validate_state(state)
        return state

    @staticmethod
    def _validate_state(state: RegionalState) -> None:
        """Structural validation beyond Pydantic model constraints.

        - every node referenced by an edge must exist
        - each edge connects exactly two valid node IDs (already enforced by
          the model's min/max length, but we confirm referential integrity)
        """
        node_ids = set(state.node_map().keys())
        for edge in state.edges:
            for node_id in edge.connects:
                if node_id not in node_ids:
                    raise RegionalStateError(
                        f"Edge {edge.id} references unknown node {node_id}"
                    )

    # ---------------------------------------------------------------- access
    @property
    def state(self) -> RegionalState:
        return self._state

    def get_node(self, node_id: str) -> RegionalNode:
        node = self._state.node_map().get(node_id)
        if node is None:
            raise KeyError(node_id)
        return node

    def get_edge(self, edge_id: str) -> TransportEdge:
        edge = self._state.edge_map().get(edge_id)
        if edge is None:
            raise KeyError(edge_id)
        return edge

    def node_ids(self) -> List[str]:
        return [n.id for n in self._state.nodes]

    def edges_for_node(self, node_id: str) -> List[TransportEdge]:
        """All edges directly connected to a node."""
        if node_id not in self._state.node_map():
            raise KeyError(node_id)
        return [e for e in self._state.edges if node_id in e.connects]

    def neighbors_of(self, node_id: str) -> List[str]:
        """IDs of nodes directly connected to a node."""
        seen: Dict[str, None] = {}
        for edge in self.edges_for_node(node_id):
            for other in edge.connects:
                if other != node_id:
                    seen[other] = None
        return list(seen.keys())

    # ---------------------------------------------------------------- mutation
    def bump_metadata(self) -> None:
        """Increment version + refresh updated_at after a live mutation."""
        self._state.bump_version(_now_iso())

    def set_edge_status(self, edge_id: str, status: EdgeStatus, risk_score: int) -> TransportEdge:
        """Set an edge's status + risk score (e.g. a closure). Mutation only."""
        edge = self.get_edge(edge_id)
        edge.status = status
        edge.risk_score = max(0, min(100, int(risk_score)))
        self._bump_metadata()
        return edge

    def set_edge_risk(self, edge_id: str, risk_score: int) -> TransportEdge:
        """Set an edge's risk score and derive a consistent status.

        Never sets CLOSED from a risk change alone:
          risk < 40   -> OPEN
          risk >= 40  -> AT_RISK
        """
        edge = self.get_edge(edge_id)
        new_risk = max(0, min(100, int(risk_score)))
        edge.risk_score = new_risk
        if new_risk < 40:
            edge.status = EdgeStatus.OPEN
        else:
            edge.status = EdgeStatus.AT_RISK
        self._bump_metadata()
        return edge

    def reset(self) -> RegionalState:
        """Restore the original fixture baseline and reset metadata version.

        Live state lives in memory; the on-disk fixture is unchanged, so a fresh
        load restores the baseline.
        """
        self._state = self._load()
        # Force a clean version/a timestamp so the reset is visible.
        self._state.metadata.version = 1
        self._state.metadata.state_updated_at = _now_iso()
        return self._state


@lru_cache(maxsize=1)
def get_regional_state_service() -> RegionalStateService:
    """Shared singleton, cached for the lifetime of the process."""
    settings = get_settings()
    return RegionalStateService(settings.data_dir / "regional_state.json")
