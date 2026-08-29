"""Impact Analysis API endpoints."""

from fastapi import APIRouter, HTTPException, Path

from app.services.impact_analysis_service import analyze_impact
from app.services.regional_state_service import get_regional_state_service

router = APIRouter(prefix="/impact", tags=["impact"])

_service = get_regional_state_service()


@router.post("/{edge_id}", response_model=dict)
def analyze_edge_impact(
    edge_id: str = Path(..., description="ID of the edge to analyze for impact"),
) -> dict:
    """Analyze the cascading impact of closing a specific transport edge.
    
    This creates a hypothetical scenario where the edge is CLOSED,
    compares against current live state, and returns detailed impact analysis.
    Does NOT modify the live Regional State.
    """
    try:
        result = analyze_impact(_service, edge_id)
        return result
    except Exception as exc:
        # Handle specific errors
        if "does not exist" in str(exc).lower():
            raise HTTPException(status_code=404, detail=f"Edge {edge_id} does not exist")
        raise HTTPException(status_code=500, detail=f"Impact analysis failed: {str(exc)}")


@router.get("", response_model=dict)
def get_impact_info() -> dict:
    """Return information about the impact analysis capability."""
    return {
        "description": "Cascading impact analysis for transport edge disruptions",
        "usage": "POST /impact/{edge_id} to analyze the cascading impact of closing a specific edge",
        "note": "Does not modify live Regional State. Creates hypothetical scenario only.",
        "example": {
            "edge_id": "E023",
            "type": "closure",
            "risk_delta": 0
        }
    }