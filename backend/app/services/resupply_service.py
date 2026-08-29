"""Resupply reachability service for RAAHAT."""

from typing import Dict, List, Optional, Tuple
from app.models.inventory import (
    ResupplyInfo,
    ResupplyStatus,
)
from app.models.regional_state import RegionalState
from app.models.node import NodeType
from app.services.graph_service import build_graph
from app.services.regional_state_service import RegionalStateService
import networkx as nx


class ResupplyService:
    """Calculates resupply reachability from warehouses to facilities."""
    
    def __init__(self, state_service: RegionalStateService):
        self.state_service = state_service
    
    def get_warehouses(self, state: RegionalState) -> List:
        """Get all warehouse nodes."""
        return [n for n in state.nodes if n.type == NodeType.WAREHOUSE]
    
    def get_hospitals(self, state: RegionalState) -> List:
        """Get all hospital nodes."""
        return [n for n in state.nodes if n.type == NodeType.HOSPITAL]
    
    def build_operational_graph(self, state: RegionalState):
        """Build graph with only traversable edges."""
        G = nx.Graph()
        
        for node in state.nodes:
            G.add_node(node.id, name=node.name, type=node.type.value)
        
        for edge in state.edges:
            if edge.status.value in ["OPEN", "AT_RISK"]:
                # Risk-adjusted weight
                risk_factor = 1 + (edge.risk_score / 100.0)
                weight = edge.base_travel_time_min * risk_factor
                
                G.add_edge(
                    edge.connects[0],
                    edge.connects[1],
                    weight=weight,
                    edge_id=edge.id,
                    distance_km=edge.distance_km,
                    base_travel_time_min=edge.base_travel_time_min,
                    status=edge.status.value,
                    risk_score=edge.risk_score,
                )
        
        return G
    
    def calculate_resupply(
        self,
        state: RegionalState,
        facility_id: str
    ) -> ResupplyInfo:
        """Calculate resupply info for a facility (hospital)."""
        G = self.build_operational_graph(state)
        
        if facility_id not in G:
            return ResupplyInfo(
                reachable=False,
                status=ResupplyStatus.BLOCKED
            )
        
        warehouses = self.get_warehouses(self.state_service.state)
        warehouse_ids = [w.id for w in warehouses if w.id in G]
        
        if not warehouse_ids:
            return ResupplyInfo(
                reachable=False,
                status=ResupplyStatus.BLOCKED
            )
        
        best_warehouse = None
        best_cost = float('inf')
        best_path = None
        
        for wh_id in warehouse_ids:
            try:
                cost = nx.shortest_path_length(G, facility_id, wh_id, weight="weight")
                if cost < best_cost:
                    best_cost = cost
                    best_warehouse = wh_id
            except nx.NetworkXNoPath:
                continue
        
        if best_warehouse is None:
            return ResupplyInfo(
                reachable=False,
                status=ResupplyStatus.BLOCKED
            )
        
        # Find the warehouse object
        warehouse = next(w for w in warehouses if w.id == best_warehouse)
        
        # Determine status based on path risk
        try:
            path = nx.shortest_path(G, facility_id, best_warehouse, weight="weight")
            max_risk = max(G[u][v].get("risk_score", 0) for u, v in zip(path[:-1], path[1:]))
            
            if max_risk >= 70:
                status = ResupplyStatus.AT_RISK
            else:
                status = ResupplyStatus.REACHABLE
        except:
            status = ResupplyStatus.AT_RISK
        
        return ResupplyInfo(
            reachable=True,
            warehouse_id=best_warehouse,
            warehouse_name=warehouse.name,
            travel_cost_min=round(best_cost, 1),
            status=ResupplyStatus(status)
        )
    
    def calculate_all_resupply(self, state: RegionalState) -> Dict[str, ResupplyInfo]:
        """Calculate resupply info for all hospitals."""
        hospitals = self.get_hospitals(state)
        results = {}
        
        for hospital in hospitals:
            results[hospital.id] = self.calculate_resupply(state, hospital.id)
        
        return results


def get_resupply_service(state_service: RegionalStateService) -> ResupplyService:
    return ResupplyService(state_service)