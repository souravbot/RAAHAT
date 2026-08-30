"""Priority Intelligence API endpoints (Phase 7)."""

from fastapi import APIRouter, HTTPException, Path, Query

from app.models.priority import (
    FacilityPriorityResponse,
    PriorityResponse,
)
from app.services.priority_service import get_priority_service

router = APIRouter(prefix="/priority", tags=["priority"])


@router.get("", response_model=PriorityResponse)
def get_all_priorities(
    limit: int = Query(None, ge=1, description="Maximum number of priority entries"),
    facility_type: str = Query(None, description="Filter by facility type (HOSPITAL/WAREHOUSE)"),
    priority_level: str = Query(None, description="Filter by priority level (CRITICAL/HIGH/MODERATE/LOW)"),
) -> PriorityResponse:
    """Return all monitored facility-resource priorities ranked highest first.

    Filtering operates on the dynamically calculated priority data.
    """
    service = get_priority_service()
    return service.get_priority_response(
        limit=limit,
        facility_type=facility_type,
        priority_level=priority_level,
    )


@router.get("/{node_id}", response_model=FacilityPriorityResponse)
def get_facility_priorities(
    node_id: str = Path(..., description="ID of the inventory-holding facility"),
) -> FacilityPriorityResponse:
    """Return priority rankings for a single inventory-holding facility."""
    service = get_priority_service()
    try:
        return service.get_facility_priority_response(node_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Node {node_id} does not exist")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))