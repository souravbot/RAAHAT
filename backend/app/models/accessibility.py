"""Accessibility Intelligence models for the RAAHAT platform."""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, Literal
from datetime import datetime


class ServiceAccessibility(BaseModel):
    """Accessibility to a specific service (hospital or warehouse)."""
    reachable: bool
    nearest_service_id: Optional[str] = None
    nearest_service_name: Optional[str] = None
    travel_cost_min: Optional[float] = None
    access_score: float = 0.0


class VillageAccessibility(BaseModel):
    """Complete accessibility intelligence for a village."""
    village_id: str
    accessibility_score: float
    hospital: ServiceAccessibility
    warehouse: ServiceAccessibility
    network_resilience_score: float
    calculated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")


class AccessibilityResult(BaseModel):
    """Full accessibility intelligence result for the region."""
    region_id: str
    calculated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    villages: list[VillageAccessibility]


class AccessibilitySummary(BaseModel):
    """Regional accessibility summary for the dashboard."""
    average_accessibility: float
    high_accessibility_villages: int
    moderate_accessibility_villages: int
    low_accessibility_villages: int
    isolated_villages: int


# Configuration for accessibility scoring
class AccessibilityConfig(BaseModel):
    """Configurable thresholds for accessibility scoring."""
    # Travel cost thresholds (minutes) for score mapping
    time_excellent: float = 30.0
    time_moderate: float = 60.0
    time_poor: float = 120.0
    time_very_poor: float = 180.0
    
    # Weights for overall accessibility score
    hospital_weight: float = 0.40
    warehouse_weight: float = 0.40
    resilience_weight: float = 0.20
    
    # Resilience scoring
    min_edges_for_resilience: int = 2
    max_edges_for_resilience: int = 5
    
    @classmethod
    def default(cls) -> "AccessibilityConfig":
        return cls()