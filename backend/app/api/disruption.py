"""POST /disruption — apply a live disruption to the Regional Digital Twin."""

from fastapi import APIRouter, HTTPException

from app.models.disruption import DisruptionRequest, DisruptionResult
from app.services.disruption_service import DisruptionError, DisruptionService
from app.services.event_service import get_event_service
from app.services.regional_state_service import get_regional_state_service

router = APIRouter(tags=["disruption"])

_service = get_regional_state_service()
_event_service = get_event_service()


@router.post("/disruption", response_model=DisruptionResult)
def apply_live_disruption(request: DisruptionRequest) -> DisruptionResult:
    """Apply a disruption to the LIVE regional state.

    Mutates the canonical Regional State, bumps its version, records an event,
    and returns the updated edge + version. The NetworkX graph is refreshed on
    the next /twin read.
    """
    try:
        event, updated_edge = DisruptionService.apply(_service.state, request)
    except DisruptionError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    # Live mutation: bump version + timestamp, then record the event.
    _service.bump_metadata()
    _event_service.record(event)

    return DisruptionResult(
        event=event,
        updated_edge=updated_edge,
        regional_state_version=_service.state.metadata.version,
        updated_at=_service.state.metadata.state_updated_at,
    )
