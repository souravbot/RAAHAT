"""Accessibility Intelligence Engine for RAAHAT.

Calculates how accessible essential services (hospitals, warehouses) are
for each village based on the current operational transport network.
"""

import networkx as nx
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass

from app.models.accessibility import (
    VillageAccessibility,
    ServiceAccessibility,
    AccessibilityResult,
    AccessibilitySummary,
    AccessibilityConfig,
)
from app.models.regional_state import RegionalState
from app.models.node import NodeType
from app.models.edge import EdgeStatus


@dataclass
class ServiceReachability:
    """Intermediate result for service reachability."""
    reachable: bool
    nearest_service_id: Optional[str] = None
    nearest_service_name: Optional[str] = None
    travel_cost_min: Optional[float] = None


class AccessibilityEngine:
    """Calculates accessibility intelligence for all villages."""
    
    def __init__(self, config: Optional[AccessibilityConfig] = None):
        self.config = config or AccessibilityConfig.default()
    
    def _build_operational_graph(self, state: RegionalState) -> nx.Graph:
        """Build a filtered graph with only traversable edges.
        
        Only OPEN and AT_RISK edges are traversable.
        CLOSED edges are excluded from the graph.
        Risk-adjusted travel cost is used as edge weight.
        """
        G = nx.Graph()
        
        # Add all nodes
        for node in state.nodes:
            G.add_node(
                node.id,
                name=node.name,
                type=node.type.value,
                category=node.category.value if node.category else None,
                lat=node.lat,
                lng=node.lng,
            )
        
        # Add only traversable edges with risk-adjusted weights
        for edge in state.edges:
            if edge.status in (EdgeStatus.OPEN, EdgeStatus.AT_RISK):
                # Risk-adjusted cost: base_time * (1 + risk_score / 100)
                risk_factor = 1 + (edge.risk_score / 100.0)
                weight = edge.base_travel_time_min * risk_factor
                
                G.add_edge(
                    edge.connects[0],
                    edge.connects[1],
                    edge_id=edge.id,
                    weight=weight,
                    distance_km=edge.distance_km,
                    base_travel_time_min=edge.base_travel_time_min,
                    risk_score=edge.risk_score,
                    status=edge.status.value,
                )
        
        return G
    
    def _get_service_nodes(self, state: RegionalState, service_type: NodeType) -> List[str]:
        """Get all node IDs of a specific service type."""
        return [
            node.id for node in state.nodes
            if node.type == service_type
        ]
    
    def _calculate_service_access(
        self,
        graph: nx.Graph,
        village_id: str,
        service_nodes: List[str],
        state: RegionalState,
    ) -> ServiceReachability:
        """Calculate accessibility to the nearest reachable service."""
        if village_id not in graph:
            return ServiceReachability(reachable=False)
        
        if not service_nodes:
            return ServiceReachability(reachable=False)
        
        best_cost = float('inf')
        best_service_id = None
        best_service_name = None
        
        for service_id in service_nodes:
            if service_id not in graph:
                continue
            
            try:
                # Use risk-adjusted weight for shortest path
                cost = nx.shortest_path_length(
                    graph, village_id, service_id, weight="weight"
                )
                if cost < best_cost:
                    best_cost = cost
                    best_service_id = service_id
                    # Get service name from state
                    service_node = state.node_map().get(service_id)
                    if service_node:
                        best_service_name = service_node.name
            except nx.NetworkXNoPath:
                continue
        
        if best_cost == float('inf'):
            return ServiceReachability(reachable=False)
        
        return ServiceReachability(
            reachable=True,
            nearest_service_id=best_service_id,
            nearest_service_name=best_service_name,
            travel_cost_min=round(best_cost, 1),
        )
    
    def _calculate_network_resilience(
        self,
        graph: nx.Graph,
        village_id: str,
    ) -> float:
        """Calculate network resilience score for a village.
        
        Based on number of operational edges directly connected to the village,
        and whether there are multiple alternative paths to key services.
        
        Returns a score 0-100.
        """
        if village_id not in graph:
            return 0.0
        
        # Count operational edges directly connected
        degree = graph.degree(village_id)
        
        # Simple heuristic: more connections = more resilient
        # Normalize: min_edges=2 -> 0, max_edges=5 -> 100
        min_edges = self.config.min_edges_for_resilience
        max_edges = self.config.max_edges_for_resilience
        
        if degree <= min_edges:
            return 0.0
        elif degree >= max_edges:
            return 100.0
        else:
            # Linear interpolation
            return ((degree - min_edges) / (max_edges - min_edges)) * 100.0
    
    def _travel_cost_to_score(self, cost_min: float) -> float:
        """Convert travel cost to a normalized access score (0-100).
        
        Uses configurable thresholds for scoring.
        """
        config = self.config
        
        if cost_min <= config.time_excellent:
            # Excellent: 100 to 80
            return 100.0 - (cost_min / config.time_excellent) * 20.0
        elif cost_min <= config.time_moderate:
            # Moderate: 80 to 60
            ratio = (cost_min - config.time_excellent) / (config.time_moderate - config.time_excellent)
            return 80.0 - ratio * 20.0
        elif cost_min <= config.time_poor:
            # Poor: 60 to 20
            ratio = (cost_min - config.time_moderate) / (config.time_poor - config.time_moderate)
            return 60.0 - ratio * 40.0
        elif cost_min <= config.time_very_poor:
            # Very poor: 20 to 0
            ratio = (cost_min - config.time_poor) / (config.time_very_poor - config.time_poor)
            return 20.0 - ratio * 20.0
        else:
            return 0.0
    
    def _calculate_village_accessibility(
        self,
        village_id: str,
        graph: nx.Graph,
        hospital_nodes: List[str],
        warehouse_nodes: List[str],
        state: RegionalState,
    ) -> VillageAccessibility:
        """Calculate complete accessibility for a single village."""
        # Hospital access
        hospital_reach = self._calculate_service_access(graph, village_id, hospital_nodes, state)
        hospital_score = (
            self._travel_cost_to_score(hospital_reach.travel_cost_min)
            if hospital_reach.reachable else 0.0
        )
        
        # Warehouse access
        warehouse_reach = self._calculate_service_access(graph, village_id, warehouse_nodes, state)
        warehouse_score = (
            self._travel_cost_to_score(warehouse_reach.travel_cost_min)
            if warehouse_reach.reachable else 0.0
        )
        
        # Network resilience
        resilience_score = self._calculate_network_resilience(graph, village_id)
        
        # Overall score
        config = self.config
        if not hospital_reach.reachable and not warehouse_reach.reachable:
            overall = 0.0
        else:
            overall = (
                config.hospital_weight * hospital_score +
                config.warehouse_weight * warehouse_score +
                config.resilience_weight * resilience_score
            )
        
        overall = max(0.0, min(100.0, overall))
        hospital_score = max(0.0, min(100.0, hospital_score))
        warehouse_score = max(0.0, min(100.0, warehouse_score))
        resilience_score = max(0.0, min(100.0, resilience_score))
        
        return VillageAccessibility(
            village_id=village_id,
            accessibility_score=round(overall, 1),
            hospital=ServiceAccessibility(
                reachable=hospital_reach.reachable,
                nearest_service_id=hospital_reach.nearest_service_id,
                nearest_service_name=hospital_reach.nearest_service_name,
                travel_cost_min=hospital_reach.travel_cost_min,
                access_score=round(hospital_score, 1),
            ),
            warehouse=ServiceAccessibility(
                reachable=warehouse_reach.reachable,
                nearest_service_id=warehouse_reach.nearest_service_id,
                nearest_service_name=warehouse_reach.nearest_service_name,
                travel_cost_min=warehouse_reach.travel_cost_min,
                access_score=round(warehouse_score, 1),
            ),
            network_resilience_score=round(resilience_score, 1),
        )
    
    def calculate_all(self, state: RegionalState) -> AccessibilityResult:
        """Calculate accessibility for all villages in the region."""
        graph = self._build_operational_graph(state)
        hospital_nodes = self._get_service_nodes(state, NodeType.HOSPITAL)
        warehouse_nodes = self._get_service_nodes(state, NodeType.WAREHOUSE)
        
        villages = [
            node for node in state.nodes
            if node.type == NodeType.VILLAGE
        ]
        
        village_results = []
        for village in villages:
            result = self._calculate_village_accessibility(
                village.id, graph, hospital_nodes, warehouse_nodes, state
            )
            village_results.append(result)
        
        return AccessibilityResult(
            region_id=state.metadata.region_id,
            villages=village_results,
        )
    
    def calculate_summary(self, result: AccessibilityResult) -> AccessibilitySummary:
        """Calculate regional accessibility summary."""
        if not result.villages:
            return AccessibilitySummary(
                average_accessibility=0.0,
                high_accessibility_villages=0,
                moderate_accessibility_villages=0,
                low_accessibility_villages=0,
                isolated_villages=0,
            )
        
        scores = [v.accessibility_score for v in result.villages]
        avg = round(sum(scores) / len(scores), 1)
        
        high = sum(1 for s in scores if s >= 80)
        moderate = sum(1 for s in scores if 50 <= s < 80)
        low = sum(1 for s in scores if 1 <= s < 50)
        isolated = sum(1 for s in scores if s == 0)
        
        return AccessibilitySummary(
            average_accessibility=avg,
            high_accessibility_villages=high,
            moderate_accessibility_villages=moderate,
            low_accessibility_villages=low,
            isolated_villages=isolated,
        )


# Convenience function for easy use
def calculate_accessibility(state: RegionalState) -> AccessibilityResult:
    """Calculate accessibility for all villages in the regional state."""
    engine = AccessibilityEngine()
    return engine.calculate_all(state)


def calculate_accessibility_summary(state: RegionalState) -> AccessibilitySummary:
    """Calculate regional accessibility summary."""
    result = calculate_accessibility(state)
    engine = AccessibilityEngine()
    return engine.calculate_summary(result)