"""Disruption request / result schemas (Phase 3 + 4)."""

from typing import Any, Dict, Optional, List

from pydantic import BaseModel, Field, field_validator

from app.models.event import DisruptionEvent
from app.models.edge import TransportEdge
from app.models.accessibility import VillageAccessibility


class DisruptionRequest(BaseModel):
    """Payload accepted by POST /disruption and POST /simulate."""

    edge_id: str
    type: str = "closure"
    risk_delta: int = 0

    @field_validator("type")
    @classmethod
    def supported_type(cls, v):
        from app.models.event import DisruptionType

        try:
            DisruptionType.from_request(v)
        except ValueError:
            raise ValueError(f"Unsupported disruption type: {v}")
        return v

    @field_validator("risk_delta")
    @classmethod
    def non_negative(cls, v):
        if v < 0:
            raise ValueError("risk_delta must be non-negative")
        return v


class DisruptionResult(BaseModel):
    event: DisruptionEvent
    updated_edge: TransportEdge
    regional_state_version: int
    updated_at: str


class SimulationResult(BaseModel):
    simulation_id: str
    simulated_event: DisruptionEvent
    simulated_edge: TransportEdge
    # The full hypothetical regional state (never the live one).
    hypothetical_state: Dict[str, Any]
    # Accessibility intelligence for the hypothetical scenario
    hypothetical_accessibility: List[Any] = []
    # Priority intelligence for the hypothetical scenario (Phase 7).
    # Simulated priorities are clearly labeled and never overwrite live
    # priority results.
    hypothetical_priorities: Optional[Any] = None
