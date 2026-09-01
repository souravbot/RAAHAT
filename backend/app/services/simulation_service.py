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
from app.services.impact_analysis_service import ImpactAnalysisEngine, ImpactConfig
from app.services.priority_service import PriorityService
from app.services.recommendation_service import RecommendationService
from app.services.route_optimizer import RouteOptimizer
from app.services.warehouse_selector import WarehouseSelector
from app.services.vehicle_selector import VehicleSelector


def _next_sim_id() -> str:
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
        simulation_id = _next_sim_id()

        # Calculate accessibility for the hypothetical state
        from app.services.accessibility_service import calculate_accessibility
        accessibility_result = calculate_accessibility(hypothetical)

        # Calculate hypothetical priorities for the simulated state (Phase 7).
        priority_service = PriorityService(self._state_service)
        simulated_priorities = priority_service.get_simulated_priority_result(
            hypothetical, simulation_id
        )

        # Calculate impact analysis for the hypothetical state (Phase 9).
        impact_config = ImpactConfig.default()
        hypothetical_impact_engine = ImpactAnalysisEngine(
            state_service=type('MockStateService', (), {'state': hypothetical})(),
            config=impact_config
        )
        impact_result = hypothetical_impact_engine.analyze_edge_closure(
            updated_edge.id,
            hypothetical_state=hypothetical,
            baseline_state=self._state_service.state,
        )

        # Calculate recommendations for the hypothetical state.
        # Build a full recommendation service that operates on the hypothetical state.
        hypothetical_route_optimizer = RouteOptimizer()
        hypothetical_warehouse_selector = WarehouseSelector(hypothetical_route_optimizer)
        hypothetical_vehicle_selector = VehicleSelector(hypothetical_route_optimizer)
        hypothetical_rec_service = RecommendationService(
            type('MockStateService', (), {'state': hypothetical})(),
            route_optimizer=hypothetical_route_optimizer,
            warehouse_selector=hypothetical_warehouse_selector,
            vehicle_selector=hypothetical_vehicle_selector,
        )

        simulated_recommendations = None
        try:
            top_priority = simulated_priorities.priorities[0] if simulated_priorities.priorities else None
            if top_priority:
                from app.models.vehicles import RecommendActionRequest
                req = RecommendActionRequest(
                    target_node=top_priority.facility.id,
                    resource=top_priority.resource.type,
                    required_quantity=200,
                    priority=top_priority.priority_level
                )
                simulated_recommendations = hypothetical_rec_service.recommend(req, state=hypothetical)
                simulated_recommendations["is_simulated"] = True
                simulated_recommendations["simulation_id"] = simulation_id
        except Exception:
            simulated_recommendations = None

        return SimulationResult(
            simulation_id=simulation_id,
            simulated_event=event,
            simulated_edge=updated_edge,
            hypothetical_state=hypothetical.to_payload(),
            hypothetical_accessibility=[v.model_dump() for v in accessibility_result.villages],
            hypothetical_priorities=simulated_priorities,
            hypothetical_impact=impact_result,
            hypothetical_recommendations=simulated_recommendations,
        )


_simulation_service = None


def get_simulation_service() -> SimulationService:
    global _simulation_service
    if _simulation_service is None:
        from app.services.regional_state_service import get_regional_state_service

        _simulation_service = SimulationService(get_regional_state_service())
    return _simulation_service
