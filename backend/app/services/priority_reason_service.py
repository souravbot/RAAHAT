"""PriorityReasonService — deterministic explanation generator for Phase 7.

Builds a concise, human-readable reason for EVERY priority entry explaining why
it received its ranking. No LLM, no ML — just rule-based composition of the
strongest contributing factors.
"""

from typing import List

from app.models.priority import ResourcePriority


class PriorityReasonService:
    """Generates deterministic explanations for priority entries."""

    def generate_reason(self, entry: ResourcePriority) -> str:
        """Build one concise sentence explaining why an entry ranked where it did."""
        inputs = entry.inputs
        resource = entry.resource.type
        factors: List[str] = []

        # --- Depletion urgency (strongest contributor) ---
        hours = inputs.hours_until_depletion

        if hours is not None and hours <= 0:
            factors.append(f"{resource} is already depleted")
        elif hours is not None and hours <= 24:
            factors.append(f"only {self._format_hours(hours)} remaining")
        elif hours is not None and hours <= 72:
            factors.append(f"{self._format_hours(hours)} remaining")
        elif hours is not None and hours <= 168:
            factors.append(f"{self._format_hours(hours)} remaining")

        # --- Accessibility vulnerability (second strongest) ---
        if inputs.facility_accessibility_score == 0:
            factors.append("the facility is isolated from the transport network")
        elif inputs.accessibility_vulnerability >= 60:
            factors.append("facility accessibility is low")
        elif inputs.accessibility_vulnerability >= 30:
            factors.append("facility accessibility is limited")

        # --- Resupply risk ---
        if not inputs.resupply_reachable:
            factors.append("no reachable resupply route is currently available")
        elif inputs.resupply_risk_score >= 60:
            factors.append("the only resupply route is at risk")

        # --- Resource importance ---
        if inputs.resource_importance_score >= 90:
            factors.append("high-priority essential resource")
        elif inputs.resource_importance_score >= 70:
            factors.append("important essential resource")

        if not factors:
            factors.append("stable conditions across all monitored factors")

        # Compose: "Oxygen has only 18 hours remaining, facility accessibility
        # is low, and no reachable resupply route is currently available."
        resource_label = resource.capitalize()
        if len(factors) == 1:
            return f"{resource_label}: {factors[0]}."
        return f"{resource_label} {', and '.join(factors)}."

    @staticmethod
    def _format_hours(hours: float) -> str:
        if hours == int(hours):
            return f"{int(hours)} hours"
        return f"{hours:.1f} hours"


def get_priority_reason_service() -> PriorityReasonService:
    return PriorityReasonService()