"""Demo orchestration for the RAAHAT judge-ready walkthrough.

This service reuses the real disruption, impact, priority, and recommendation
engines instead of hard-coding scenario values. It keeps the flow deterministic:
reset -> central bridge disruption -> impact -> depletion -> priority -> target
selection -> recommendation -> story summary.
"""

from __future__ import annotations

import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.models.disruption import DisruptionRequest
from app.models.vehicles import RecommendActionRequest
from app.services.disruption_service import DisruptionService
from app.services.event_service import get_event_service
from app.services.impact_analysis_service import ImpactAnalysisEngine, ImpactConfig
from app.services.priority_service import PriorityService
from app.services.recommendation_service import RecommendationError, RecommendationService
from app.services.regional_state_service import RegionalStateService
from app.services.route_optimizer import RouteOptimizer
from app.services.vehicle_selector import VehicleSelector
from app.services.warehouse_selector import WarehouseSelector

DEMO_EDGE_ID = "E023"
DEMO_SCENARIO_NAME = "Central Bridge Disruption"


class DemoService:
    """Orchestrates the single-click RAHAAT demonstration."""

    def __init__(self, state_service: RegionalStateService):
        self.state_service = state_service
        self.event_service = get_event_service()

    def reset(self) -> Dict[str, Any]:
        state = self.state_service.reset()
        self.event_service.clear()
        return {
            "success": True,
            "message": "RAHAAT Digital Twin reset to clean demonstration state.",
            "demo_state": "READY",
            "timestamp": _now_iso(),
            "regional_state_version": state.metadata.version,
        }

    def run_scenario(self) -> Dict[str, Any]:
        clean_state = self.state_service.state.clone()
        self.state_service.reset()
        live_state = self.state_service.state

        disruption_request = DisruptionRequest(edge_id=DEMO_EDGE_ID, type="closure", risk_delta=0)
        event, updated_edge = DisruptionService.apply(live_state, disruption_request)
        self.state_service.bump_metadata()
        self.event_service.record(event)

        # Keep the live state as the actual demo state, but calculate impact from
        # a clean baseline versus the disrupted clone so the cascade is real.
        hypothetical_state = clean_state.clone()
        DisruptionService.apply(hypothetical_state, disruption_request)
        impact_engine = ImpactAnalysisEngine(
            state_service=type("_StateService", (), {"state": clean_state})(),
            config=ImpactConfig.default(),
        )
        impact_result = impact_engine.analyze_edge_closure(
            DEMO_EDGE_ID,
            hypothetical_state=hypothetical_state,
            baseline_state=clean_state,
        )

        # Use live inventory + priority intelligence after the disruption.
        priority_service = PriorityService(self.state_service)
        priority_response = priority_service.get_priority_response()
        selected_target = self._select_target(priority_response.priorities)

        # Build the recommendation from the selected shortage.
        recommendation = self._build_recommendation(selected_target)

        story = [
            {
                "step": 1,
                "title": "Digital Twin Ready",
                "summary": "Clean fixture restored and the regional network is back to baseline operating conditions.",
            },
            {
                "step": 2,
                "title": "Bridge Disruption Detected",
                "summary": f"Edge {updated_edge.id} ({updated_edge.connects[0]} → {updated_edge.connects[1]}) was closed, matching the central bridge bottleneck scenario.",
            },
            {
                "step": 3,
                "title": "Impact Analysis Complete",
                "summary": impact_result.get("impact_summary", "Impact analysis completed across affected villages and services."),
            },
            {
                "step": 4,
                "title": "Supply Risk Identified",
                "summary": self._depletion_summary(priority_response),
            },
            {
                "step": 5,
                "title": "Priority Engine Activated",
                "summary": selected_target["summary"],
            },
            {
                "step": 6,
                "title": "Recommended Response Generated",
                "summary": self._recommendation_summary(recommendation),
            },
        ]

        return {
            "success": True,
            "demo": {
                "scenario_name": DEMO_SCENARIO_NAME,
                "status": "COMPLETED",
                "is_live_demo": True,
                "timestamp": _now_iso(),
            },
            "disruption": {
                "edge_id": updated_edge.id,
                "status": updated_edge.status.value,
                "description": f"{updated_edge.id} was closed to simulate the central bridge outage affecting the remote access corridor.",
                "edge_name": updated_edge.id,
                "risk_score": updated_edge.risk_score,
            },
            "impact": {"data": impact_result},
            "depletion": {
                "data": {
                    "regional_state_version": self.state_service.state.metadata.version,
                    "alerts": priority_response.priorities[:5],
                    "summary": priority_response.summary.model_dump() if hasattr(priority_response.summary, "model_dump") else priority_response.summary,
                }
            },
            "priority": {
                "data": priority_response.model_dump(),
                "selected_target": selected_target["target"],
                "selected_priority_target": selected_target["target"]["facility_id"],
                "selection_reason": selected_target["selection_reason"],
            },
            "selected_target": selected_target["target"],
            "selected_priority_target": selected_target["target"]["facility_id"],
            "recommendation": recommendation,
            "story": story,
        }

    def _select_target(self, priorities: List[Any]) -> Dict[str, Any]:
        for priority_entry in priorities:
            candidate = self._priority_candidate(priority_entry)
            if not candidate:
                continue
            # Try the first feasible priority candidate with an actual recommendation.
            req = RecommendActionRequest(
                target_node=candidate["facility_id"],
                resource=candidate["resource"],
                required_quantity=candidate["required_quantity"],
                priority=candidate["priority_level"],
            )
            recommendation_service = self._recommendation_service()
            try:
                result = recommendation_service.recommend(req, state=self.state_service.state)
            except RecommendationError:
                continue
            if result.get("success"):
                return {
                    "target": {
                        "facility_id": candidate["facility_id"],
                        "facility_name": candidate["facility_name"],
                        "resource": candidate["resource"],
                        "priority_level": candidate["priority_level"],
                        "required_quantity": candidate["required_quantity"],
                    },
                    "selection_reason": (
                        f"Highest-priority affected location with a feasible supply response: "
                        f"{candidate['facility_name']} ({candidate['resource']}) at {candidate['priority_level']} priority."
                    ),
                    "summary": (
                        f"Priority engine selected {candidate['facility_name']} for {candidate['resource']} supply. "
                        f"The request is actionable through the live network and a feasible route is available."
                    ),
                }

        fallback = priorities[0] if priorities else None
        if fallback is None:
            raise ValueError("No priority entries were available for the demo scenario")
        fallback_facility = fallback.facility
        fallback_resource = fallback.resource.type
        fallback_target = fallback_facility.id
        return {
            "target": {
                "facility_id": fallback_target,
                "facility_name": fallback_facility.name,
                "resource": fallback_resource,
                "priority_level": fallback.priority_level,
                "required_quantity": 200.0,
            },
            "selection_reason": "The highest-priority affected facility was selected as the first actionable shortage candidate.",
            "summary": f"Priority engine selected {fallback_facility.name} for {fallback_resource} despite no higher feasible route being available.",
        }

    def _priority_candidate(self, priority_entry: Any) -> Optional[Dict[str, Any]]:
        facility_id = priority_entry.facility.id
        resource_name = priority_entry.resource.type
        facility = self.state_service.state.node_map().get(facility_id)
        if facility is None:
            return None
        inventory = (facility.attributes.get("inventory") or {}).get(resource_name)
        if not inventory:
            return None
        quantity = float(inventory.get("quantity", 0.0) or 0.0)
        if quantity <= 0:
            return None
        required_quantity = max(50.0, min(quantity * 0.5, 300.0))
        return {
            "facility_id": facility_id,
            "facility_name": facility.name,
            "resource": resource_name,
            "priority_level": priority_entry.priority_level,
            "required_quantity": required_quantity,
        }

    def _build_recommendation(self, selected_target: Dict[str, Any]) -> Dict[str, Any]:
        recommendation_service = self._recommendation_service()
        req = RecommendActionRequest(
            target_node=selected_target["target"]["facility_id"],
            resource=selected_target["target"]["resource"],
            required_quantity=float(selected_target["target"]["required_quantity"]),
            priority=selected_target["target"]["priority_level"],
        )
        result = recommendation_service.recommend(req, state=self.state_service.state)
        return result

    def _recommendation_service(self) -> RecommendationService:
        route_optimizer = RouteOptimizer()
        warehouse_selector = WarehouseSelector(route_optimizer)
        vehicle_selector = VehicleSelector(route_optimizer)
        return RecommendationService(
            self.state_service,
            route_optimizer=route_optimizer,
            warehouse_selector=warehouse_selector,
            vehicle_selector=vehicle_selector,
        )

    @staticmethod
    def _depletion_summary(priority_response: Any) -> str:
        if not priority_response.priorities:
            return "No supply alerts were generated for the demo scenario."
        top = priority_response.priorities[0]
        return (
            f"The most urgent resource issue is {top.resource.type} at {top.facility.name}, "
            f"with a priority score of {top.priority_score} and a {top.priority_level} ranking."
        )

    @staticmethod
    def _recommendation_summary(recommendation: Dict[str, Any]) -> str:
        if not recommendation.get("success"):
            return recommendation.get("message", "No viable recommendation was generated.")
        warehouse = recommendation.get("selected_warehouse", {})
        vehicle = recommendation.get("selected_vehicle", {})
        route = recommendation.get("selected_route", {})
        return (
            f"Dispatching from {warehouse.get('name')} using vehicle {vehicle.get('id')} along a feasible route "
            f"({route.get('total_distance')} km, {route.get('weighted_cost')} weighted cost)."
        )


def _now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def get_demo_service() -> DemoService:
    from app.services.regional_state_service import get_regional_state_service

    return DemoService(get_regional_state_service())
