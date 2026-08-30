"""Recommendation API endpoints — Phase 8.

POST /recommend-action          generate an explainable action plan
POST /recommend-action/confirm  confirm dispatch (vehicle -> en-route)
"""

from fastapi import APIRouter, HTTPException
from typing import Any, Dict

from app.models.vehicles import ConfirmDispatchRequest, RecommendActionRequest
from app.services.recommendation_service import (
    RecommendationError,
    get_recommendation_service,
)

router = APIRouter(prefix="/recommend-action", tags=["recommend-action"])

_service = get_recommendation_service()


@router.post("")
def recommend_action(request: RecommendActionRequest) -> Dict[str, Any]:
    """Generate an explainable recommended action plan.

    Receives shortage/resource data (target node, resource, required quantity,
    optional priority) from the existing Priority Engine / supply monitoring,
    then selects a warehouse, an accessibility-aware route, and the best
    available vehicle — with dynamic, explainable reasons.
    """
    try:
        result = _service.recommend(request)
        return result
    except RecommendationError as exc:
        return {
            "success": False,
            "message": str(exc),
            "reasons": exc.reasons,
        }


@router.post("/confirm")
def confirm_dispatch(request: ConfirmDispatchRequest) -> Dict[str, Any]:
    """Confirm dispatch of a recommended vehicle.

    Only then is the vehicle's status set to en-route in the digital twin.
    """
    try:
        result = _service.confirm_dispatch(request.vehicle_id)
        return result
    except RecommendationError as exc:
        raise HTTPException(status_code=404, detail=str(exc))