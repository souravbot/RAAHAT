"""Depletion calculation service for RAAHAT."""

from typing import Dict, List, Optional, Tuple
from app.models.inventory import (
    InventoryResource,
    DepletionStatus,
    SupplyStatus,
    DepletionEstimate,
    ResourceDepletionInfo,
    FacilitySupplyInfo,
    ResupplyInfo,
    DepletionConfig,
    ResupplyStatus,
    DepletionConfig,
)

from app.models.regional_state import RegionalState
from app.models.node import NodeType
from app.services.accessibility_service import calculate_accessibility
from app.services.regional_state_service import RegionalStateService


class DepletionService:
    """Calculates depletion estimates and supply criticality."""
    
    def __init__(self, state_service: RegionalStateService, config: Optional[DepletionConfig] = None):
        self.state_service = state_service
        self.config = config or DepletionConfig.default()
    
    def calculate_depletion_estimate(self, resource: InventoryResource) -> DepletionEstimate:
        """Calculate depletion estimate for a single resource."""
        if resource.quantity <= 0:
            return DepletionEstimate(
                hours_until_depletion=0.0,
                days_until_depletion=0.0,
                depletion_status=DepletionStatus.DEPLETED
            )
        
        if resource.consumption_per_day <= 0:
            return DepletionEstimate(
                hours_until_depletion=None,
                days_until_depletion=None,
                depletion_status=DepletionStatus.NOT_CONSUMING
            )
        
        hours = resource.quantity / (resource.consumption_per_day / 24.0)
        days = hours / 24.0
        
        if hours <= self.config.critical_hours:
            status = DepletionStatus.CRITICAL
        elif hours <= self.config.high_risk_hours:
            status = DepletionStatus.HIGH_RISK
        elif hours <= self.config.moderate_hours:
            status = DepletionStatus.WATCH
        else:
            status = DepletionStatus.STABLE
        
        return DepletionEstimate(
            hours_until_depletion=round(hours, 1),
            days_until_depletion=round(days, 2),
            depletion_status=status
        )
    
    def calculate_resource_criticality(
        self,
        resource: InventoryResource,
        resupply: ResupplyInfo,
        config: DepletionConfig
    ) -> Tuple[float, SupplyStatus, Dict[str, float]]:
        """Calculate supply criticality score for a resource."""
        # Get depletion estimate
        estimate = self.calculate_depletion_estimate(resource)
        
        # Depletion urgency component (0-100)
        if estimate.hours_until_depletion is None:
            depletion_urgency = 0.0
        elif estimate.hours_until_depletion <= config.critical_hours:
            depletion_urgency = 100.0
        elif estimate.hours_until_depletion <= config.high_risk_hours:
            depletion_urgency = 80.0
        elif estimate.hours_until_depletion <= config.moderate_hours:
            depletion_urgency = 50.0
        else:
            # Linear scale from moderate threshold down to 0
            max_hours = config.moderate_hours * 2  # arbitrary upper bound
            depletion_urgency = max(0, 50 - (estimate.hours_until_depletion - config.moderate_hours) * 50 / config.moderate_hours)
        
        # Resupply access component (0-100)
        if resupply.reachable:
            resupply_access = 30.0  # Base for reachable
            if resupply.travel_cost_min is not None:
                # Penalize based on travel time
                travel_penalty = min(30, resupply.travel_cost_min / 10)
                resupply_access = max(0, 30 - travel_penalty)
        else:
            resupply_access = 0.0
        
        # Transport risk component (0-100)
        # Based on travel cost and risk
        transport_risk = 0.0
        if resupply.reachable and resupply.travel_cost_min is not None:
            transport_risk = min(20, resupply.travel_cost_min / 10)
        elif not resupply.reachable:
            transport_risk = 20.0
        
        # Calculate weighted score
        score = (
            depletion_urgency * 0.5 +
            resupply_access * 0.3 +
            (20 - transport_risk) * 0.2  # Lower risk = higher score component
        )
        
        # Clamp
        score = max(0, min(100, score))
        
        # Determine status
        if score >= 80:
            status = SupplyStatus.CRITICAL
        elif score >= 60:
            status = SupplyStatus.HIGH_RISK
        elif score >= 30:
            status = SupplyStatus.WATCH
        else:
            status = SupplyStatus.STABLE
        
        components = {
            "depletion_urgency": round(depletion_urgency * 0.5, 1),
            "resupply_access": round(resupply_access * 0.3, 1),
            "transport_risk": round((20 - transport_risk) * 0.2, 1)
        }
        
        return score, status, components


# Convenience function
def calculate_depletion_estimate(resource: InventoryResource, config: Optional[DepletionConfig] = None) -> DepletionEstimate:
    """Calculate depletion estimate for a resource."""
    cfg = config or DepletionConfig.default()
    service = DepletionService(None, cfg)
    return service.calculate_depletion_estimate(resource)