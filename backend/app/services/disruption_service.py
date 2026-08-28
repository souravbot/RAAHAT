"""DisruptionService — shared, reusable disruption logic.

Both POST /disruption (live) and POST /simulate (hypothetical) use the same
`apply` function. The only difference is which `RegionalState` object it mutates:
the live instance vs a deep clone.

`apply` is a pure function over a given state: it validates the target, computes
the new edge values, mutates that state's edge, and builds the event. It does
NOT bump metadata version — that is the caller's responsibility (live routes
bump; simulations do not).
"""

from typing import Tuple

from app.models.disruption import DisruptionRequest
from app.models.edge import EdgeStatus, TransportEdge
from app.models.event import (
    DisruptionEvent,
    DisruptionType,
    EventSeverity,
    EventTargetType,
)
from app.models.regional_state import RegionalState
from app.services.regional_state_service import RegionalStateError


class DisruptionError(RegionalStateError):
    """Raised for invalid disruption requests."""


class DisruptionService:
    @staticmethod
    def apply(state: RegionalState, request: DisruptionRequest) -> Tuple[DisruptionEvent, TransportEdge]:
        """Apply a disruption to the given state and build the event.

        Returns (event, updated_edge). Mutates `state`'s matching edge.
        """
        edge = state.edge_map().get(request.edge_id)
        if edge is None:
            raise DisruptionError(f"Edge {request.edge_id} does not exist")

        d_type = DisruptionType.from_request(request.type)
        original_status = edge.status.value
        original_risk = edge.risk_score

        if d_type == DisruptionType.CLOSURE:
            edge.status = EdgeStatus.CLOSED
            edge.risk_score = 100
            severity = EventSeverity.HIGH
        elif d_type == DisruptionType.RISK_INCREASE:
            new_risk = max(0, min(100, edge.risk_score + request.risk_delta))
            edge.risk_score = new_risk
            # Risk increase never creates CLOSED; derived status thresholds:
            #   < 40 -> OPEN, >= 40 -> AT_RISK
            edge.status = EdgeStatus.OPEN if new_risk < 40 else EdgeStatus.AT_RISK
            severity = _severity_for_risk(new_risk)
        else:  # pragma: no cover - guarded by validation
            raise DisruptionError(f"Unsupported disruption type: {request.type}")

        event = DisruptionEvent(
            type=d_type,
            target_type=EventTargetType.EDGE,
            target_id=edge.id,
            severity=severity,
            risk_delta=request.risk_delta,
            source="MANUAL_DEMO",
            original={
                "status": original_status,
                "risk_score": original_risk,
            },
            result={
                "status": edge.status.value,
                "risk_score": edge.risk_score,
            },
        )

        return event, edge


def _severity_for_risk(risk: int) -> EventSeverity:
    if risk >= 70:
        return EventSeverity.HIGH
    if risk >= 40:
        return EventSeverity.MEDIUM
    return EventSeverity.LOW
