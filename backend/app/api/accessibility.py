"""Accessibility Intelligence API endpoints."""

from fastapi import APIRouter, HTTPException
from typing import List

from app.services.accessibility_service import (
    calculate_accessibility,
    calculate_accessibility_summary,
)
from app.services.regional_state_service import get_regional_state_service
from app.models.accessibility import (
    VillageAccessibility,
    AccessibilitySummary,
    AccessibilityResult,
)

router = APIRouter(prefix="/accessibility", tags=["accessibility"])

_service = get_regional_state_service()


@router.get("", response_model=AccessibilityResult)
def get_all_accessibility() -> AccessibilityResult:
    """Return accessibility intelligence for all villages."""
    state = _service.state
    return calculate_accessibility(state)


@router.get("/summary", response_model=AccessibilitySummary)
def get_accessibility_summary() -> AccessibilitySummary:
    """Return regional accessibility summary for the dashboard."""
    state = _service.state
    return calculate_accessibility_summary(state)


@router.get("/{village_id}", response_model=VillageAccessibility)
def get_village_accessibility(village_id: str) -> VillageAccessibility:
    """Return detailed accessibility for a specific village."""
    state = _service.state
    
    # Check if village exists
    village = state.node_map().get(village_id)
    if village is None:
        raise HTTPException(status_code=404, detail=f"Village {village_id} does not exist")
    
    if village.type.value != "VILLAGE":
        raise HTTPException(status_code=404, detail=f"Node {village_id} is not a village")
    
    result = calculate_accessibility(state)
    
    for village_result in result.villages:
        if village_result.village_id == village_id:
            return village_result
    
    raise HTTPException(status_code=404, detail=f"Accessibility not calculated for {village_id}")