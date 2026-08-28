"""POST /reset — restore the Regional Digital Twin to its original fixture."""

from fastapi import APIRouter

from app.models.regional_state import RegionalState
from app.services.event_service import get_event_service
from app.services.regional_state_service import get_regional_state_service

router = APIRouter(tags=["reset"])

_service = get_regional_state_service()
_event_service = get_event_service()


@router.post("/reset")
def reset_demo() -> dict:
    """Reset the live Regional State to its original fixture baseline.

    Reloads the fixture, resets metadata version, and clears event history.
    """
    state: RegionalState = _service.reset()
    _event_service.clear()
    return {
        "status": "ok",
        "regional_state_version": state.metadata.version,
        "state_updated_at": state.metadata.state_updated_at,
        "events_cleared": True,
    }
