"""POST /simulate — create an isolated hypothetical disruption scenario."""

from fastapi import APIRouter, HTTPException

from app.models.disruption import DisruptionRequest, SimulationResult
from app.services.disruption_service import DisruptionError
from app.services.simulation_service import get_simulation_service

router = APIRouter(tags=["simulation"])

_simulation_service = get_simulation_service()


@router.post("/simulate", response_model=SimulationResult)
def run_simulation(request: DisruptionRequest) -> SimulationResult:
    """Run a hypothetical disruption on a CLONED state.

    Never mutates the live state, live graph, or live version.
    """
    try:
        result = _simulation_service.run(request)
    except DisruptionError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return result
