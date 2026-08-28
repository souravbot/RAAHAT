"""GET /events — list the in-memory disruption event history."""

from typing import List

from fastapi import APIRouter

from app.models.event import DisruptionEvent
from app.services.event_service import get_event_service

router = APIRouter(tags=["events"])

_event_service = get_event_service()


@router.get("/events", response_model=List[DisruptionEvent])
def list_events() -> List[DisruptionEvent]:
    """Return all disruption events recorded this backend session."""
    return _event_service.list()
