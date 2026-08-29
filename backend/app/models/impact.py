"""Impact Analysis models for the RAAHAT platform."""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from enum import Enum


class ImpactLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"
    UNCHANGED = "UNCHANGED"


class ServiceImpactLevel(str, Enum):
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"
    NONE = "NONE"


class ImpactReason(str, Enum):
    HOSPITAL_ACCESS_LOST = "Hospital access lost"
    WAREHOUSE_ACCESS_LOST = "Warehouse access lost"
    HOSPITAL_CHANGED = "Nearest hospital changed"
    HEALTHCARE_COST_INCREASED = "Healthcare travel cost significantly increased"
    SUPPLY_COST_INCREASED = "Supply travel cost significantly increased"
    VILLAGE_ISOLATED = "Village became operationally isolated"
    HOSPITAL_CHANGED_TO_AT_RISK = "Nearest hospital became at-risk"
    WAREHOUSE_CHANGED_TO_AT_RISK = "Nearest warehouse became at-risk"


class VillageImpact(BaseModel):
    village_id: str
    name: str
    population: int

    before: Dict[str, Any]
    after: Dict[str, Any]

    accessibility_drop: float
    impact_level: ImpactLevel

    impact_reasons: List[str] = []


class ServiceImpact(BaseModel):
    service_id: str
    name: str
    villages_served_before: int
    villages_served_after: int
    coverage_loss: int
    impact_level: ServiceImpactLevel


class NewlyIsolatedNode(BaseModel):
    node_id: str
    name: str
    type: str
    isolation_reason: str


class ImpactScoreComponents(BaseModel):
    population_impact: float
    accessibility_impact: float
    isolation_impact: float
    service_impact: float


class ImpactMetrics(BaseModel):
    total_villages: int
    affected_villages_count: int
    critical_villages_count: int
    newly_isolated_count: int
    affected_population: int

    hospital_coverage_loss: int
    warehouse_coverage_loss: int

    average_accessibility_before: float
    average_accessibility_after: float
    regional_accessibility_change: float

    dependency_level: Literal["LOW", "MODERATE", "HIGH", "CRITICAL"]


class ImpactSummary(BaseModel):
    analysis_id: str
    scenario: Dict[str, Any]
    impact_score: float
    impact_level: ImpactLevel
    impact_components: Dict[str, float]
    regional_metrics: ImpactMetrics
    affected_villages: List[Dict[str, Any]]
    affected_hospitals: List[Dict[str, Any]]
    affected_warehouses: List[Dict[str, Any]]
    newly_isolated_nodes: List[Dict[str, Any]]
    impact_summary: str
    analyzed_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    regional_state_version: int


# Configuration
class ImpactConfig(BaseModel):
    accessibility_drop_threshold: float = 5.0
    critical_drop_threshold: float = 40.0
    high_drop_threshold: float = 20.0
    moderate_drop_threshold: float = 5.0
    significant_cost_increase_threshold: float = 30.0  # percentage

    # Impact score weights
    population_weight: float = 0.40
    accessibility_weight: float = 0.30
    isolation_weight: float = 0.20
    service_weight: float = 0.10

    @classmethod
    def default(cls) -> "ImpactConfig":
        return cls()