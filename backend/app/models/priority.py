"""Priority Intelligence models for the RAAHAT platform (Phase 7)."""

from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class PriorityLevel(str, Enum):
    """Configured priority level thresholds."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"


class PriorityFacility(BaseModel):
    """Facility identity inside a priority entry."""
    id: str
    name: str
    type: str


class PriorityResource(BaseModel):
    """Resource identity + configured weight inside a priority entry."""
    type: str
    weight: float


class PriorityInputs(BaseModel):
    """Normalized component scores used to compute the priority score."""
    hours_until_depletion: Optional[float] = None
    depletion_urgency_score: float = 0.0

    facility_accessibility_score: float = 0.0
    accessibility_vulnerability: float = 0.0

    resupply_reachable: bool = False
    resupply_risk_score: float = 0.0

    resource_importance_score: float = 0.0


class ResourcePriority(BaseModel):
    """A single ranked FACILITY + RESOURCE priority entry."""
    rank: int
    facility: PriorityFacility
    resource: PriorityResource
    priority_score: float
    priority_level: str
    inputs: PriorityInputs
    reason: str


class PrioritySummary(BaseModel):
    """Regional priority summary for the dashboard."""
    critical_priorities: int
    high_priorities: int
    moderate_priorities: int
    low_priorities: int
    resupply_isolated_facilities: int
    most_urgent: Optional[Dict[str, str]] = None


class PriorityResponse(BaseModel):
    """Response for GET /priority."""
    regional_state_version: int
    calculated_at: str
    summary: PrioritySummary
    priorities: List[ResourcePriority]


class FacilityPriorityResponse(BaseModel):
    """Response for GET /priority/{node_id}."""
    facility: Dict[str, str]
    regional_state_version: int
    calculated_at: str
    priorities: List[ResourcePriority]


class SimulatedPriorityResult(BaseModel):
    """Hypothetical priorities for a simulation scenario.

    Distinct from the live priority response so simulation results can never
    be confused with (or overwrite) live intelligence.
    """
    simulation_id: str
    regional_state_version: int
    calculated_at: str
    summary: PrioritySummary
    priorities: List[ResourcePriority]