"""PriorityService — Resource Priority Intelligence Engine (Phase 7).

This service is an ORCHESTRATION + SCORING + RANKING + EXPLANATION layer.

It REUSES existing RAAHAT intelligence instead of duplicating it:
  - Phase 6 (inventory + depletion + resupply) via InventoryService
  - Phase 7 facility accessibility via FacilityAccessibilityService
  - Phase 4 village accessibility is deliberately NOT used for facilities

The scoring model is deterministic and explainable:

    priority_score =
        0.40 * depletion_urgency_score
      + 0.25 * accessibility_vulnerability
      + 0.20 * resupply_risk_score
      + 0.15 * resource_importance_score

All component scores are normalized to 0-100; the final score is clamped to
0-100 and rounded to one decimal place. Resource weights come from
backend/config/resource_weights.json; thresholds from
backend/config/priority_config.json. No ML, no LLM.
"""

import datetime
import json
from pathlib import Path
from typing import Dict, List, Optional

from app.core.config import BACKEND_DIR
from app.models.inventory import SupplyStatus, DepletionStatus
from app.models.priority import (
    FacilityPriorityResponse,
    PriorityFacility,
    PriorityInputs,
    PriorityLevel,
    PriorityResource,
    PriorityResponse,
    PrioritySummary,
    ResourcePriority,
)
from app.models.regional_state import RegionalState
from app.models.node import NodeType
from app.services.facility_accessibility_service import (
    calculate_facility_accessibility_map,
)
from app.services.inventory_service import InventoryService
from app.services.priority_reason_service import PriorityReasonService
from app.services.regional_state_service import RegionalStateService
from app.services.resupply_service import ResupplyService


class PriorityService:
    """Rank every FACILITY + RESOURCE priority across the region."""

    def __init__(
        self,
        state_service: RegionalStateService,
        resource_weights: Optional[Dict] = None,
        priority_config: Optional[Dict] = None,
    ):
        self.state_service = state_service
        self.inventory_service = InventoryService(state_service)
        self.resupply_service = ResupplyService(state_service)
        self.reason_service = PriorityReasonService()

        self.resource_weights = resource_weights or self._load_resource_weights()
        self.priority_config = priority_config or self._load_priority_config()

    # ---------------------------------------------------------- configuration
    @staticmethod
    def _load_resource_weights() -> Dict:
        path = BACKEND_DIR / "config" / "resource_weights.json"
        if path.exists():
            data = json.loads(path.read_text(encoding="utf-8"))
            return {
                "weights": data,
                "default": float(data.get("default_resource_weight", 0.50)),
            }
        return {"weights": {}, "default": 0.50}

    @staticmethod
    def _load_priority_config() -> Dict:
        path = BACKEND_DIR / "config" / "priority_config.json"
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
        # Safe defaults if the file is missing.
        return {
            "scoring_weights": {
                "depletion_urgency": 0.40,
                "accessibility_vulnerability": 0.25,
                "resupply_risk": 0.20,
                "resource_importance": 0.15,
            },
            "priority_levels": [
                {"level": "CRITICAL", "min": 80.0, "max": 100.0},
                {"level": "HIGH", "min": 60.0, "max": 79.9},
                {"level": "MODERATE", "min": 30.0, "max": 59.9},
                {"level": "LOW", "min": 0.0, "max": 29.9},
            ],
        }

    def get_scoring_weights(self) -> Dict[str, float]:
        return self.priority_config.get("scoring_weights", {
            "depletion_urgency": 0.40,
            "accessibility_vulnerability": 0.25,
            "resupply_risk": 0.20,
            "resource_importance": 0.15,
        })

    def get_priority_levels(self) -> List[Dict]:
        return self.priority_config.get("priority_levels", [])

    # ------------------------------------------------------------- importance
    def resource_weight(self, resource_name: str) -> float:
        """Lookup the configured importance weight for a resource.

        Unknown resources safely fall back to the configured default weight.
        """
        weights = self.resource_weights.get("weights", {})
        return float(weights.get(resource_name, self.resource_weights.get("default", 0.50)))

    def resource_importance_score(self, resource_name: str) -> float:
        """Normalized resource importance score (0-100)."""
        return max(0.0, min(100.0, self.resource_weight(resource_name) * 100.0))

    # ------------------------------------------------ depletion urgency (0-100)
    def depletion_urgency_score(
        self,
        hours_until_depletion: Optional[float],
        depletion_status: str,
    ) -> float:
        """Convert hours-until-depletion into a normalized urgency score (0-100).

        Deterministic + explainable bucket mapping:
          DEPLETED           -> 100
          0-24 hours         -> 92.5 (very high)
          24-72 hours        -> 75 (high)
          72-168 hours       -> 50 (moderate)
          >168 hours         -> 25 (low)
          NOT_CONSUMING      -> 0
          UNKNOWN data       -> 0 (no fake urgency)
        """
        if depletion_status == DepletionStatus.DEPLETED.value:
            return 100.0
        if depletion_status == DepletionStatus.NOT_CONSUMING.value:
            return 0.0
        if hours_until_depletion is None:
            # Unknown data: never fabricate urgency.
            return 0.0

        hours = float(hours_until_depletion)
        if hours <= 0:
            return 100.0
        if hours <= 24:
            return 92.5
        if hours <= 72:
            return 75.0
        if hours <= 168:
            return 50.0
        return 25.0

    # ------------------------------------------------- resupply risk (0-100)
    def resupply_risk_score(
        self,
        resupply_reachable: bool,
        resupply_status: str = "",
        travel_cost_min: Optional[float] = None,
    ) -> float:
        """Convert resupply reachability into a risk score (0-100).

        No reachable warehouse/route   -> 100 (very high risk)
        Only AT_RISK routes            -> 65 (moderate-high)
        Reachable via normal route     -> low (based on travel time)
        """
        if not resupply_reachable:
            return 100.0

        if resupply_status.upper() == "AT_RISK":
            return 65.0

        # Reachable via normal route: base low risk scaled by travel time.
        if travel_cost_min is not None and travel_cost_min > 0:
            travel_score = min(30.0, travel_cost_min / 4.0)
            return round(travel_score, 1)
        return 10.0

    # ------------------------------------------------------------- main engine
    def calculate_priorities(self, state: Optional[RegionalState] = None) -> List[ResourcePriority]:
        """Calculate + rank all facility-resource priorities (highest first)."""
        current = state or self.state_service.state

        facilities = self.inventory_service.calculate_all_supply_intelligence(current)
        facility_ids = [f.facility_id for f in facilities]

        # Facility accessibility map (Phase 7 modular facility-level calculation).
        accessibility_map = calculate_facility_accessibility_map(current, facility_ids)

        entries: List[ResourcePriority] = []
        for facility in facilities:
            facility_access = accessibility_map.get(facility.facility_id, 0.0)
            accessibility_vulnerability = max(0.0, min(100.0, 100.0 - facility_access))

            for r in facility.resources:
                entry = self._build_entry(
                    facility=facility,
                    resource=r,
                    facility_access=facility_access,
                )
                entries.append(entry)

        # Sort strictly by priority_score DESC, then rank automatically.
        entries.sort(key=lambda e: e.priority_score, reverse=True)
        for i, entry in enumerate(entries, start=1):
            entry.rank = i

        # Attach deterministic explanations (after ranking so they can mention rank context).
        for entry in entries:
            entry.reason = self.reason_service.generate_reason(entry)

        return entries

    def _build_entry(
        self,
        facility,
        resource,
        facility_access: float,
    ) -> ResourcePriority:
        """Build a single ResourcePriority from one facility + resource."""
        hours = resource.hours_until_depletion
        depletion_status = (
            resource.depletion_status.value
            if hasattr(resource.depletion_status, "value")
            else str(resource.depletion_status)
        )

        # Normalize component scores (all 0-100).
        dep_urgency = self.depletion_urgency_score(hours, depletion_status)
        acc_vuln = max(0.0, min(100.0, 100.0 - facility_access))
        resupply_reachable = resource.resupply.reachable
        resupply_risk = self.resupply_risk_score(
            resupply_reachable=resupply_reachable,
            resupply_status=resource.resupply.status.value
            if hasattr(resource.resupply.status, "value") else str(resource.resupply.status),
            travel_cost_min=resource.resupply.travel_cost_min,
        )
        imp_score = self.resource_importance_score(resource.resource_name)

        # Deterministic weighted formula.
        weights = self.get_scoring_weights()
        priority_score = (
            weights.get("depletion_urgency", 0.40) * dep_urgency
            + weights.get("accessibility_vulnerability", 0.25) * acc_vuln
            + weights.get("resupply_risk", 0.20) * resupply_risk
            + weights.get("resource_importance", 0.15) * imp_score
        )
        priority_score = round(max(0.0, min(100.0, priority_score)), 1)

        priority_level = self.level_for_score(priority_score)

        return ResourcePriority(
            rank=0,  # assigned after sorting
            facility=PriorityFacility(
                id=facility.facility_id,
                name=facility.facility_name,
                type=facility.facility_type,
            ),
            resource=PriorityResource(
                type=resource.resource_name,
                weight=round(self.resource_weight(resource.resource_name), 2),
            ),
            priority_score=priority_score,
            priority_level=priority_level,
            inputs=PriorityInputs(
                hours_until_depletion=hours,
                depletion_urgency_score=round(dep_urgency, 1),
                facility_accessibility_score=round(facility_access, 1),
                accessibility_vulnerability=round(acc_vuln, 1),
                resupply_reachable=resupply_reachable,
                resupply_risk_score=round(resupply_risk, 1),
                resource_importance_score=round(imp_score, 1),
            ),
            reason="",  # filled after ranking
        )

    def level_for_score(self, score: float) -> str:
        """Assign a priority level from the configured thresholds."""
        for level in self.get_priority_levels():
            lo = float(level["min"])
            hi = float(level["max"])
            if lo <= score <= hi:
                return level["level"]
        # Safe fallback.
        return PriorityLevel.LOW.value

    # --------------------------------------------------------------- summaries
    def build_summary(self, entries: List[ResourcePriority]) -> PrioritySummary:
        """Build a dynamic regional priority summary."""
        critical = sum(1 for e in entries if e.priority_level == "CRITICAL")
        high = sum(1 for e in entries if e.priority_level == "HIGH")
        moderate = sum(1 for e in entries if e.priority_level == "MODERATE")
        low = sum(1 for e in entries if e.priority_level == "LOW")

        isolated_facilities = set(
            e.facility.id for e in entries if not e.inputs.resupply_reachable
        )

        most_urgent = None
        if entries:
            top = entries[0]
            most_urgent = {"facility_id": top.facility.id, "resource": top.resource.type}

        return PrioritySummary(
            critical_priorities=critical,
            high_priorities=high,
            moderate_priorities=moderate,
            low_priorities=low,
            resupply_isolated_facilities=len(isolated_facilities),
            most_urgent=most_urgent,
        )

    # --------------------------------------------------------------- responses
    def get_priority_response(
        self,
        limit: Optional[int] = None,
        facility_type: Optional[str] = None,
        priority_level: Optional[str] = None,
    ) -> PriorityResponse:
        """Build the GET /priority response with optional dynamic filtering."""
        entries = self.calculate_priorities()
        entries = self._filter(entries, limit, facility_type, priority_level)
        summary = self.build_summary(entries)

        return PriorityResponse(
            regional_state_version=self.state_service.state.metadata.version,
            calculated_at=datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
            summary=summary,
            priorities=entries,
        )

    def get_facility_priority_response(self, node_id: str) -> FacilityPriorityResponse:
        """Build the GET /priority/{node_id} response for one facility."""
        state = self.state_service.state
        node = state.node_map().get(node_id)
        if node is None:
            raise KeyError(node_id)
        if node.type not in (NodeType.HOSPITAL, NodeType.WAREHOUSE):
            raise ValueError(f"Node {node_id} is not an inventory-holding facility")

        entries = [e for e in self.calculate_priorities() if e.facility.id == node_id]
        entries.sort(key=lambda e: e.priority_score, reverse=True)
        for i, entry in enumerate(entries, start=1):
            entry.rank = i

        return FacilityPriorityResponse(
            facility={
                "id": node.id,
                "name": node.name,
                "type": node.type.value,
            },
            regional_state_version=self.state_service.state.metadata.version,
            calculated_at=datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
            priorities=entries,
        )

    def get_simulated_priority_result(
        self,
        hypothetical_state: RegionalState,
        simulation_id: str,
    ) -> "SimulatedPriorityResult":
        """Calculate priorities for a HYPOTHETICAL (simulation) state.

        This result is separate from live priorities; it never touches or
        overwrites live intelligence.
        """
        from app.models.priority import SimulatedPriorityResult

        entries = self.calculate_priorities(hypothetical_state)
        summary = self.build_summary(entries)
        return SimulatedPriorityResult(
            simulation_id=simulation_id,
            regional_state_version=hypothetical_state.metadata.version,
            calculated_at=datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
            summary=summary,
            priorities=entries,
        )

    # --------------------------------------------------------------- filtering
    @staticmethod
    def _filter(
        entries: List[ResourcePriority],
        limit: Optional[int],
        facility_type: Optional[str],
        priority_level: Optional[str],
    ) -> List[ResourcePriority]:
        """Apply optional dynamic filters on calculated priority data."""
        if facility_type:
            entries = [e for e in entries if e.facility.type == facility_type.upper()]
        if priority_level:
            entries = [e for e in entries if e.priority_level == priority_level.upper()]
        if limit is not None and limit > 0:
            entries = entries[:limit]
        return entries


def get_priority_service() -> PriorityService:
    from app.services.regional_state_service import get_regional_state_service
    return PriorityService(get_regional_state_service())