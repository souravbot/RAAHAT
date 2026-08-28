"""SimulationService — creates isolated hypothetical disruption scenarios.

A simulation deep-clones the live Regional State, applies a disruption to the
clone (using the SAME DisruptionService.apply logic), and returns the resulting
hypothetical state. It never mutates the live state, the live graph, or the live
version.
"""

from app.models.disruption import DisruptionRequest, SimulationResult
from app.services.disruption_service import DisruptionService
from app.services.accessibility_service import calculate_accessibility
from app.services.regional_state_service import RegionalStateService


def _next_sim_id() -> str:
    # Simple monotonic id for the session; survives module import.
    SimulationService._counter += 1
    return f"SIM{SimulationService._counter:03d}"


class SimulationService:
    _counter = 0

    def __init__(self, state_service: RegionalStateService):
        self._state_service = state_service

    def run(self, request: DisruptionRequest) -> SimulationResult:
        # Deep-clone the LIVE canonical state (not just the graph).
        hypothetical = self._state_service.state.clone()
        event, updated_edge = DisruptionService.apply(hypothetical, request)

        # Calculate accessibility for the hypothetical state
        from app.services.accessibility_service import calculate_accessibility
        accessibility_result = calculate_accessibility(hypothetical)

        return SimulationResult(
            simulation_id=_next_sim_id(),
            simulated_event=event,
            simulated_edge=updated_edge,
            hypothetical_state=hypothetical.to_payload(),
            hypothetical_accessibility=[v.model_dump() for v in accessibility_result.villages],
        )


_simulation_service = None


def get_simulation_service() -> SimulationService:
    global _simulation_service
    if _simulation_service is None:
        from app.services.regional_state_service import get_regional_state_service

        _simulation_service = SimulationService(get_regional_state_service())
    return _simulation_service
