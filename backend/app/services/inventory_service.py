"""Inventory service for RAAHAT - orchestrates inventory, depletion, and resupply."""

from typing import Dict, List, Optional
from app.models.inventory import (
    InventoryData,
    InventoryResource,
    FacilitySupplyInfo,
    ResourceDepletionInfo,
    RegionalSupplySummary,
    DepletionStatus,
    SupplyStatus,
    ResupplyInfo,
)
from app.models.regional_state import RegionalState
from app.models.node import NodeType
from app.services.regional_state_service import RegionalStateService
from app.services.depletion_service import DepletionService, calculate_depletion_estimate
from app.services.resupply_service import ResupplyService


class InventoryService:
    """Orchestrates inventory, depletion, and resupply calculations."""
    
    def __init__(self, state_service: RegionalStateService):
        self.state_service = state_service
        self.depletion_service = DepletionService(state_service)
        self.resupply_service = ResupplyService(state_service)
    
    def calculate_all_supply_intelligence(self, state: RegionalState) -> List:
        """Calculate supply intelligence for all inventory-holding facilities."""
        results = []
        
        for node in state.nodes:
            if node.type not in [NodeType.HOSPITAL, NodeType.WAREHOUSE]:
                continue
            
            # Get inventory data from node attributes
            inventory = node.attributes.get("inventory", {})
            if not inventory:
                continue
            
            facility_info = self._calculate_facility_supply(node, node.id, state)
            if facility_info:
                results.append(facility_info)
        
        # Sort by urgency (critical first)
        results.sort(key=lambda f: self._urgency_sort_key(f))
        
        return results
    
    def _calculate_facility_supply(self, node, facility_id: str, state) -> Optional:
        """Calculate supply intelligence for a single facility."""
        # Get inventory
        inventory = node.attributes.get("inventory", {})
        if not inventory:
            return None
        
        # Get resupply info
        resupply_info = self.resupply_service.calculate_resupply(
            self.state_service.state, node.id
        )
        
        # Calculate depletion for each resource
        resources = []
        critical_resources = []
        
        for resource_name, resource_data in inventory.items():
            if isinstance(resource_data, dict):
                resource = InventoryResource(
                    name=resource_name,
                    quantity=resource_data.get("quantity", 0),
                    unit=resource_data.get("unit", "units"),
                    consumption_per_day=resource_data.get("consumption_per_day", 0)
                )
            else:
                continue
            
            # Calculate depletion estimate
            depletion = calculate_depletion_estimate(resource)
            
            # Get resupply info
            resupply = self.resupply_service.calculate_resupply(
                self.state_service.state, node.id
            )
            
            # Calculate criticality
            criticality_score, supply_status, components = \
                self.depletion_service.calculate_resource_criticality(
                    resource, resupply, self.depletion_service.config
                )
            
            resource_info = ResourceDepletionInfo(
                resource_name=resource_name,
                current_stock=resource.quantity,
                unit=resource.unit,
                consumption_per_day=resource.consumption_per_day,
                hours_until_depletion=depletion.hours_until_depletion,
                days_until_depletion=depletion.days_until_depletion,
                depletion_status=depletion.depletion_status,
                resupply=resupply,
                supply_criticality_score=round(score, 1),
                supply_status=status,
                criticality_components=components
            )
            
            resources.append(resource_info)
            
            if resource_info.supply_status in [SupplyStatus.CRITICAL, SupplyStatus.HIGH_RISK]:
                critical_resources.append(resource_name)
        
        # Determine overall facility status
        overall_status = self._determine_overall_status(resources)
        
        return FacilitySupplyInfo(
            facility_id=node.id,
            facility_name=node.name,
            facility_type=node.type.value,
            overall_supply_status=overall_status,
            critical_resources=critical_resources,
            resources=resources
        )
    
    def _determine_overall_status(self, resources: List) -> str:
        """Determine overall facility supply status."""
        if not resources:
            return "STABLE"
        
        statuses = [r.supply_status for r in resources]
        
        if any(s == "CRITICAL" for s in resources):
            return "CRITICAL"
        elif any(s == "HIGH_RISK" for s in resources):
            return "HIGH_RISK"
        elif any(s == "WATCH" for s in resources):
            return "WATCH"
        else:
            return "STABLE"
    
    def _urgency_sort_key(self, facility) -> tuple:
        """Sort key for urgency ordering."""
        status_priority = {
            "DEPLETED": 0,
            "CRITICAL": 1,
            "HIGH_RISK": 2,
            "WATCH": 3,
            "STABLE": 4,
        }
        
        max_priority = max(
            ({"CRITICAL": 0, "HIGH_RISK": 1, "WATCH": 2, "STABLE": 3}.get(r.supply_status, 4)
             for r in facility.resources),
            default=4
        )
        
        min_hours = min(
            (r.hours_until_depletion or float('inf') for r in facility.resources),
            default=float('inf')
        )
        
        return (max_priority, min_hours)
    
    def calculate_regional_summary(self, facilities: List) -> "RegionalSupplySummary":
        """Calculate regional supply summary."""
        total_facilities = len([n for n in self.state_service.state.nodes 
                               if n.type in [NodeType.HOSPITAL, NodeType.WAREHOUSE]])
        
        critical_facilities = sum(1 for f in facilities 
                                 if f.overall_supply_status == "CRITICAL")
        high_risk_facilities = sum(1 for f in facilities 
                                   if f.overall_supply_status == "HIGH_RISK")
        
        critical_resources = sum(1 for f in facilities 
                                for r in f.resources if r.supply_status == "CRITICAL")
        depleted_resources = sum(1 for f in facilities 
                                for r in f.resources if r.depletion_status == "DEPLETED")
        
        resupply_isolated = sum(1 for f in facilities 
                               for r in f.resources 
                               if not r.resupply.reachable)
        
        total_pop = sum(
            n.attributes.get("population", 0) 
            for n in self.state_service.state.nodes 
            if n.type == NodeType.VILLAGE
        )
        
        return RegionalSupplySummary(
            total_inventory_facilities=total_facilities,
            critical_facilities=critical_facilities,
            high_risk_facilities=high_risk_facilities,
            depleted_resources=depleted_resources,
            critical_resources=critical_resources,
            resupply_isolated_facilities=resupply_isolated,
            total_population_at_risk=total_pop
        )


def get_inventory_service(state_service) -> InventoryService:
    return InventoryService(state_service)