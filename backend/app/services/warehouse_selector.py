"""WarehouseSelector — finds the best warehouse to supply a shortage (Phase 8).

Candidates must be warehouse nodes whose inventory has sufficient stock of the
requested resource (available_stock >= required_quantity). For each candidate:

  1. resource availability check
  2. sufficient quantity check
  3. accessibility-aware route to the target
  4. unreachable warehouses are excluded

The best warehouse is the one with the lowest accessibility-adjusted route cost
(shortest + safest route), NOT simply the geographically closest warehouse.
"""

from typing import Dict, List, Optional

from app.models.regional_state import RegionalState
from app.models.node import NodeType
from app.services.route_optimizer import RouteOptimizer


class WarehouseSelector:
    """Selects the best supply warehouse for a resource shortage."""

    def __init__(self, route_optimizer: Optional[RouteOptimizer] = None):
        self.route_optimizer = route_optimizer or RouteOptimizer()

    def get_warehouse_nodes(self, state: RegionalState) -> List:
        """All warehouse nodes in the twin."""
        return [n for n in state.nodes if n.type == NodeType.WAREHOUSE]

    def warehouse_inventory(self, state: RegionalState, node) -> Dict:
        """Inventory map from a warehouse node's attributes."""
        return node.attributes.get("inventory", {}) or {}

    def find_candidates(
        self,
        state: RegionalState,
        resource: str,
        required_quantity: float,
    ) -> List[Dict]:
        """Return warehouse candidates that have sufficient stock + a route.

        Each candidate dict:
          {
            "warehouse": node,
            "node_id": str,
            "name": str,
            "available_stock": float,
            "route": route_result or None,   # None => unreachable
          }
        """
        # NOTE: prefer find_candidates_to_target (needs a real target node).
        # This variant is retained for callers that only filter + route to a
        # target supplied separately; without a target there is no route.
        raise NotImplementedError(
            "Use find_candidates_to_target(state, resource, quantity, target_node)"
        )

    def find_candidates_to_target(
        self,
        state: RegionalState,
        resource: str,
        required_quantity: float,
        target_node: str,
    ) -> List[Dict]:
        """Candidates with an accessibility-aware route to a specific target."""
        graph = self.route_optimizer.build_graph(state)
        candidates = []

        for warehouse in self.get_warehouse_nodes(state):
            inventory = self.warehouse_inventory(state, warehouse)
            stock = inventory.get(resource)
            if stock is None:
                continue

            available = float(stock.get("quantity", 0.0))
            if available < required_quantity:
                continue

            route = self.route_optimizer.find_route(
                state, warehouse.id, target_node, graph=graph
            )
            candidates.append(
                {
                    "warehouse": warehouse,
                    "node_id": warehouse.id,
                    "name": warehouse.name,
                    "available_stock": available,
                    "route": route,
                }
            )

        return [c for c in candidates if c["route"] is not None]

    def select_best_warehouse(
        self,
        candidates: List[Dict],
    ) -> Optional[Dict]:
        """Pick the warehouse with the lowest accessibility-adjusted route cost.

        Ties are broken deterministically by (route cost, then node id) so the
        result is stable.
        """
        if not candidates:
            return None

        best = min(
            candidates,
            key=lambda c: (c["route"]["weighted_cost"], c["node_id"]),
        )
        return best


def get_warehouse_selector() -> WarehouseSelector:
    return WarehouseSelector()