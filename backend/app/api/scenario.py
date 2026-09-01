"""Scenario Analysis API endpoints — Phase 9.

POST /scenario  runs simulate + impact + recommendations on a hypothetical state
"""

from fastapi import APIRouter, HTTPException
from typing import Any, Dict

from app.models.disruption import DisruptionRequest, ScenarioCompareRequest
from app.services.simulation_service import get_simulation_service

router = APIRouter(prefix="/scenario", tags=["scenario"])

_service = get_simulation_service()


@router.post("", response_model=Dict[str, Any])
def run_scenario(request: DisruptionRequest) -> Dict[str, Any]:
    """Run a complete what-if scenario on a CLONED state.

    This runs: simulate → impact → recommendations on the hypothetical state.
    Never mutates the live state, live graph, or live version.
    Returns the complete hypothetical analysis including impact and recommendations.
    """
    try:
        result = _service.run(request)
        return {
            "scenario": {
                "simulation_id": result.simulation_id,
                "simulated_event": result.simulated_event,
                "simulated_edge": result.simulated_edge,
            },
            "hypothetical_state": result.hypothetical_state,
            "hypothetical_accessibility": result.hypothetical_accessibility,
            "hypothetical_priorities": result.hypothetical_priorities,
            "hypothetical_impact": result.hypothetical_impact,
            "hypothetical_recommendations": result.hypothetical_recommendations,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scenario analysis failed: {str(exc)}")


@router.post("/compare", response_model=Dict[str, Any])
def compare_scenarios(payload: ScenarioCompareRequest) -> Dict[str, Any]:
    """Run two scenarios side-by-side and return both for comparison."""
    try:
        result_a = _service.run(payload.request_a)
        result_b = _service.run(payload.request_b)
        return {
            "scenario_a": {
                "simulation_id": result_a.simulation_id,
                "simulated_event": result_a.simulated_event,
                "simulated_edge": result_a.simulated_edge,
                "hypothetical_impact": result_a.hypothetical_impact,
                "hypothetical_recommendations": result_a.hypothetical_recommendations,
            },
            "scenario_b": {
                "simulation_id": result_b.simulation_id,
                "simulated_event": result_b.simulated_event,
                "simulated_edge": result_b.simulated_edge,
                "hypothetical_impact": result_b.hypothetical_impact,
                "hypothetical_recommendations": result_b.hypothetical_recommendations,
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Scenario comparison failed: {str(exc)}")