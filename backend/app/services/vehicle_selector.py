"""VehicleSelector — finds the best available vehicle for a dispatch (Phase 8).

Selection preferences (in order):
  1. vehicle must have sufficient capacity (capacity >= required_quantity)
  2. vehicle must be available (status == available)
  3. closest to the selected warehouse using accessibility-aware routing
  4. prefer the smallest sufficient capacity when travel costs are similar
     (avoid dispatching an unnecessarily large vehicle)
"""

from typing import Dict, List, Optional

from app.models.regional_state import RegionalState
from app.models.vehicles import Vehicle, VehicleStatus
from app.services.route_optimizer import RouteOptimizer


class VehicleSelector:
    """Selects the most suitable available vehicle for a dispatch."""

    def __init__(self, route_optimizer: Optional[RouteOptimizer] = None):
        self.route_optimizer = route_optimizer or RouteOptimizer()

    def get_all_vehicles(self, state: RegionalState) -> List[Vehicle]:
        return list(state.vehicles)

    def eligible_vehicles(
        self,
        state: RegionalState,
        required_quantity: float,
    ) -> List[Vehicle]:
        """Vehicles that are available AND have sufficient capacity."""
        eligible = []
        for vehicle in state.vehicles:
            if vehicle.status != VehicleStatus.AVAILABLE:
                continue
            if vehicle.capacity < required_quantity:
                continue
            eligible.append(vehicle)
        return eligible

    def select_vehicle(
        self,
        state: RegionalState,
        required_quantity: float,
        warehouse_node_id: str,
    ) -> Optional[Dict]:
        """Pick the best available vehicle for the warehouse pickup.

        Returns a dict with vehicle + approach route info, or None if no
        eligible vehicle has an accessible route to the warehouse.
        """
        eligible = self.eligible_vehicles(state, required_quantity)
        if not eligible:
            return None

        graph = self.route_optimizer.build_graph(state)

        scored: List[Dict] = []
        for vehicle in eligible:
            route = self.route_optimizer.find_route(
                state, vehicle.current_node, warehouse_node_id, graph=graph
            )
            if route is None:
                continue  # vehicle cannot reach the warehouse safely
            scored.append(
                {
                    "vehicle": vehicle,
                    "route": route,
                    "weighted_cost": route["weighted_cost"],
                    "capacity": vehicle.capacity,
                }
            )

        if not scored:
            return None

        # Primary: lowest accessibility-adjusted travel cost.
        # Tie-break: smallest sufficient capacity.
        best = min(
            scored,
            key=lambda s: (s["weighted_cost"], s["capacity"], s["vehicle"].id),
        )
        return best


def get_vehicle_selector() -> VehicleSelector:
    return VehicleSelector()