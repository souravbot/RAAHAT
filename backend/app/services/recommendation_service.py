"""RecommendationService — orchestrates Phase 8 action-plan generation.

Flow:
    Priority Engine detects shortage
        -> /recommend-action
        -> Warehouse Selection
        -> Accessibility-aware Route Optimization
        -> Vehicle Selection
        -> Explainable Action Plan

All reasons and numbered steps are generated DYNAMICALLY from the actual
decision (selected warehouse, vehicle, route) — nothing is hard-coded to match
a specific outcome. This service reuses the existing Regional State, inventory,
and route logic; it does not duplicate the Priority Engine.
"""

from typing import Dict, List, Optional

from app.models.regional_state import RegionalState
from app.models.vehicles import VehicleStatus
from app.services.regional_state_service import RegionalStateService
from app.services.route_optimizer import RouteOptimizer
from app.services.warehouse_selector import WarehouseSelector
from app.services.vehicle_selector import VehicleSelector


class RecommendationError(Exception):
    """Raised for a request that cannot produce a feasible action plan."""

    def __init__(self, message: str, reasons: Optional[List[str]] = None):
        super().__init__(message)
        self.message = message
        self.reasons = reasons or [message]


def _serialize_route(route: Optional[Dict], start: str, end: str) -> Dict:
    """Serialize a route for the API (exclude internal 'path' list)."""
    if route is None:
        return {
            "start": start,
            "end": end,
            "edges": [],
            "total_distance": 0.0,
            "weighted_cost": 0.0,
        }
    return {
        "start": route["start"],
        "end": route["end"],
        "edges": [
            {
                "source": e["source"],
                "target": e["target"],
                "edge_id": e.get("edge_id"),
                "status": e["status"],
                "distance_km": e.get("distance_km"),
                "weighted_cost": e.get("weight"),
            }
            for e in route["edges"]
        ],
        "total_distance": route["total_distance"],
        "weighted_cost": route["weighted_cost"],
    }


class RecommendationService:
    """Generates explainable recommended action plans."""

    def __init__(
        self,
        state_service: RegionalStateService,
        route_optimizer: Optional[RouteOptimizer] = None,
        warehouse_selector: Optional[WarehouseSelector] = None,
        vehicle_selector: Optional[VehicleSelector] = None,
    ):
        self.state_service = state_service
        self.route_optimizer = route_optimizer or RouteOptimizer()
        self.warehouse_selector = warehouse_selector or WarehouseSelector(self.route_optimizer)
        self.vehicle_selector = vehicle_selector or VehicleSelector(self.route_optimizer)

    # ------------------------------------------------------------- main entry
    def recommend(self, request) -> Dict:
        """Build a full action plan for a shortage request.

        Raises RecommendationError when no feasible plan exists; the API route
        converts it to a `success: false` structured response.
        """
        state = self.state_service.state
        target_node = request.target_node
        resource = request.resource
        required_quantity = float(request.required_quantity)

        # Validate target node exists.
        if target_node not in state.node_map():
            raise RecommendationError(
                f"Target node {target_node} does not exist.",
                reasons=[f"Target node {target_node} is not present in the regional twin."],
            )

        # --- 1. Warehouse candidates with sufficient stock + reachable route ---
        candidates = self.warehouse_selector.find_candidates_to_target(
            state, resource, required_quantity, target_node
        )
        if not candidates:
            raise self._no_warehouse_error(state, resource, required_quantity, target_node)

        # --- 2. Best warehouse (lowest accessibility-adjusted route cost) ---
        best_warehouse = self.warehouse_selector.select_best_warehouse(candidates)
        if best_warehouse is None:
            raise RecommendationError(
                "No accessible route is currently available because all possible "
                "paths contain CLOSED infrastructure.",
                reasons=["No accessible route is currently available because all possible "
                         "paths contain CLOSED infrastructure."],
            )

        wh = best_warehouse["warehouse"]
        wh_route = best_warehouse["route"]

        # --- 3. Best available vehicle (capacity + availability + nearest) ---
        vehicle_result = self.vehicle_selector.select_vehicle(
            state, required_quantity, wh.id
        )
        if vehicle_result is None:
            raise RecommendationError(
                "No available vehicle has sufficient capacity for this request.",
                reasons=["No available vehicle has sufficient capacity for this request."],
            )

        vehicle = vehicle_result["vehicle"]
        vehicle_route = vehicle_result["route"]

        # --- 4. Explainable reasons ---
        reasons = self._build_reasons(
            best_warehouse=best_warehouse,
            wh_route=wh_route,
            vehicle_result=vehicle_result,
            vehicle_route=vehicle_route,
            target_name=self._node_name(state, target_node),
        )

        # --- 5. Numbered action steps ---
        steps = self._build_steps(
            vehicle=vehicle,
            warehouse=wh,
            warehouse_route=wh_route,
            resource=resource,
            quantity=required_quantity,
            target_node=target_node,
            target_name=self._node_name(state, target_node),
        )

        return {
            "success": True,
            "request": {
                "target_node": target_node,
                "target_name": self._node_name(state, target_node),
                "resource": resource,
                "required_quantity": required_quantity,
                "priority": getattr(request, "priority", None),
            },
            "selected_warehouse": {
                "id": wh.id,
                "name": wh.name,
                "node": wh.id,
            },
            "selected_vehicle": {
                "id": vehicle.id,
                "current_node": vehicle.current_node,
                "capacity": vehicle.capacity,
                "type": vehicle.type.value,
                "status": vehicle.status.value,
            },
            "selected_route": _serialize_route(wh_route, wh.id, target_node),
            "vehicle_to_warehouse_route": _serialize_route(
                vehicle_route, vehicle.current_node, wh.id
            ),
            "steps": steps,
            "reasons": reasons,
        }

    # ------------------------------------------------------------ error helpers
    def _no_warehouse_error(self, state, resource, quantity, target_node) -> RecommendationError:
        # Distinguish "no stock" vs "no route" for a clearer message.
        stocked = [
            w for w in self.warehouse_selector.get_warehouse_nodes(state)
            if (w.attributes.get("inventory", {}) or {}).get(resource) is not None
        ]
        sufficient = [
            w for w in stocked
            if float(w.attributes["inventory"][resource].get("quantity", 0)) >= quantity
        ]
        if not stocked:
            return RecommendationError(
                f"No warehouse stocks the requested resource '{resource}'.",
                reasons=[f"No warehouse currently stocks '{resource}'."],
            )
        if not sufficient:
            return RecommendationError(
                "No warehouse has sufficient stock of the requested resource.",
                reasons=["No available warehouse currently has the required quantity."],
            )
        return RecommendationError(
            "No accessible route is currently available because all possible "
            "paths contain CLOSED infrastructure.",
            reasons=[
                "No accessible route is currently available because all possible "
                "paths contain CLOSED infrastructure.",
                f"Of {len(sufficient)} warehouse(s) with sufficient stock, none is "
                "reachable through the operational network.",
            ],
        )

    # ---------------------------------------------------------------- reasons
    def _build_reasons(
        self,
        best_warehouse: Dict,
        wh_route: Dict,
        vehicle_result: Dict,
        vehicle_route: Dict,
        target_name: str,
    ) -> List[str]:
        wh = best_warehouse["warehouse"]
        vehicle = vehicle_result["vehicle"]
        reasons: List[str] = []

        reasons.append(
            f"Warehouse {wh.id} was selected because it has sufficient "
            f"{best_warehouse['available_stock']:g} units of stock for the requested quantity."
        )
        reasons.append(
            f"{wh.id} provides the lowest accessibility-adjusted route cost "
            f"({wh_route['weighted_cost']}) to the target."
        )
        reasons.append(
            "Closed infrastructure was excluded from route selection."
        )
        reasons.append(
            "AT_RISK infrastructure was penalized during route optimization to "
            "prefer a safer route."
        )
        reasons.append(
            f"Vehicle {vehicle.id} was selected because it is available and has "
            f"sufficient capacity ({vehicle.capacity:g})."
        )
        reasons.append(
            f"{vehicle.id} is the nearest suitable vehicle to the selected warehouse "
            f"(approach cost {vehicle_route['weighted_cost']})."
        )

        # Route-specific: mention if the delivery route uses AT_RISK segments.
        if wh_route.get("at_risk_segments", 0) > 0:
            reasons.append(
                f"The selected route includes {wh_route['at_risk_segments']} AT_RISK "
                "segment(s); risk was factored into the weighted cost."
            )
        else:
            reasons.append("The selected delivery route uses only OPEN infrastructure.")

        return reasons

    # ----------------------------------------------------------------- steps
    def _build_steps(
        self,
        vehicle,
        warehouse,
        warehouse_route: Dict,
        resource: str,
        quantity: float,
        target_node: str,
        target_name: str,
    ) -> List[str]:
        return [
            f"Dispatch {vehicle.id} ({vehicle.type.value}) from its current location "
            f"({vehicle.current_node}).",
            f"Travel to Warehouse {warehouse.id} "
            f"({warehouse_route['weighted_cost']} weighted cost).",
            f"Load {quantity:g} units of {resource}.",
            "Follow the recommended accessibility-aware route to the target.",
            f"Deliver {quantity:g} units of {resource} to {target_node} ({target_name or 'target region'}).",
        ]

    # -------------------------------------------------------------- helpers
    @staticmethod
    def _node_name(state: RegionalState, node_id: str) -> Optional[str]:
        node = state.node_map().get(node_id)
        return node.name if node else None

    # ------------------------------------------------------------- dispatch
    def confirm_dispatch(self, vehicle_id: str) -> Dict:
        """Confirm dispatch: set vehicle status en-route and bump the twin.

        Recommendations never mutate the twin until the user confirms.
        """
        state_service = self.state_service
        try:
            vehicle = state_service.get_vehicle(vehicle_id)
        except KeyError:
            raise RecommendationError(
                f"Vehicle {vehicle_id} does not exist.",
                reasons=[f"Vehicle {vehicle_id} is not present in the fleet."],
            )

        if vehicle.status == VehicleStatus.EN_ROUTE:
            return {
                "success": True,
                "vehicle": {
                    "id": vehicle.id,
                    "current_node": vehicle.current_node,
                    "capacity": vehicle.capacity,
                    "type": vehicle.type.value,
                    "status": vehicle.status.value,
                },
                "message": f"Vehicle {vehicle_id} is already en-route.",
            }

        updated = state_service.set_vehicle_status(vehicle_id, VehicleStatus.EN_ROUTE)
        return {
            "success": True,
            "vehicle": {
                "id": updated.id,
                "current_node": updated.current_node,
                "capacity": updated.capacity,
                "type": updated.type.value,
                "status": updated.status.value,
            },
            "message": f"Vehicle {vehicle_id} dispatched: status set to en-route.",
            "regional_state_version": state_service.state.metadata.version,
        }


_recommendation_service = None


def get_recommendation_service() -> RecommendationService:
    global _recommendation_service
    if _recommendation_service is None:
        from app.services.regional_state_service import get_regional_state_service
        _recommendation_service = RecommendationService(get_regional_state_service())
    return _recommendation_service