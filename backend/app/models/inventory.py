"""Inventory and Supply Depletion models for the RAAHAT platform."""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Literal, Any
from pydantic import BaseModel, Field


class DepletionStatus(str, Enum):
    """Depletion status for a resource."""
    STABLE = "STABLE"
    WATCH = "WATCH"
    HIGH_RISK = "HIGH_RISK"
    CRITICAL = "CRITICAL"
    DEPLETED = "DEPLETED"
    NOT_CONSUMING = "NOT_CONSUMING"
    UNKNOWN = "UNKNOWN"


class SupplyStatus(str, Enum):
    """Overall supply status for a facility/resource."""
    STABLE = "STABLE"
    WATCH = "WATCH"
    HIGH_RISK = "HIGH_RISK"
    CRITICAL = "CRITICAL"
    DEPLETED = "DEPLETED"


class ResupplyStatus(str, Enum):
    """Resupply reachability status."""
    REACHABLE = "REACHABLE"
    AT_RISK = "AT_RISK"
    BLOCKED = "BLOCKED"


class InventoryResource(BaseModel):
    """A single resource in inventory."""
    name: str
    quantity: float
    unit: str
    consumption_per_day: float = 0.0
    consumption_unit_time: str = "day"


class InventoryData(BaseModel):
    """Inventory data for a facility (hospital/warehouse)."""
    resources: Dict[str, InventoryResource] = Field(default_factory=dict)


class ResupplyInfo(BaseModel):
    """Resupply reachability information."""
    reachable: bool
    warehouse_id: Optional[str] = None
    warehouse_name: Optional[str] = None
    travel_cost_min: Optional[float] = None
    status: ResupplyStatus = ResupplyStatus.BLOCKED


class DepletionEstimate(BaseModel):
    """Depletion estimate for a resource."""
    hours_until_depletion: Optional[float] = None
    days_until_depletion: Optional[float] = None
    depletion_status: DepletionStatus


class ResourceDepletionInfo(BaseModel):
    """Complete depletion info for a resource."""
    resource_name: str
    current_stock: float
    unit: str
    consumption_per_day: float
    hours_until_depletion: Optional[float] = None
    days_until_depletion: Optional[float] = None
    depletion_status: DepletionStatus
    resupply: ResupplyInfo
    supply_criticality_score: float
    supply_status: SupplyStatus
    criticality_components: Dict[str, float]


class FacilitySupplyInfo(BaseModel):
    """Complete supply info for a facility."""
    facility_id: str
    facility_name: str
    facility_type: str
    overall_supply_status: SupplyStatus
    critical_resources: List[str]
    resources: List[ResourceDepletionInfo]


class RegionalSupplySummary(BaseModel):
    """Regional supply summary."""
    total_inventory_facilities: int
    critical_facilities: int
    high_risk_facilities: int
    depleted_resources: int
    critical_resources: int
    resupply_isolated_facilities: int
    total_population_at_risk: int


class DepletionResponse(BaseModel):
    """Response for GET /depletion endpoint."""
    regional_state_version: int
    calculated_at: str
    alerts: List[FacilitySupplyInfo]
    summary: RegionalSupplySummary


class FacilityDepletionResponse(BaseModel):
    """Response for GET /depletion/{node_id} endpoint."""
    facility: FacilitySupplyInfo
    calculated_at: str
    regional_state_version: int


# Configuration
class DepletionConfig(BaseModel):
    """Configurable thresholds for depletion analysis."""
    critical_hours: float = 24.0
    high_risk_hours: float = 72.0
    moderate_hours: float = 168.0
    
    # Weights for criticality scoring
    depletion_urgency_weight: float = 0.50
    resupply_access_weight: float = 0.30
    transport_risk_weight: float = 0.20
    
    # Thresholds for supply status
    stable_max: float = 30.0
    watch_max: float = 60.0
    high_risk_max: float = 80.0
    
    @classmethod
    def default(cls) -> "DepletionConfig":
        return cls()