"""Demo orchestration endpoints for judge-ready walkthroughs."""

from fastapi import APIRouter, HTTPException

from app.services.demo_service import get_demo_service

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/reset")
def demo_reset() -> dict:
    """Restore the clean fixture baseline and prepare the demo state."""
    try:
        return get_demo_service().reset()
    except Exception as exc:  # pragma: no cover - defensive safety net
        raise HTTPException(status_code=500, detail=f"Demo reset failed: {str(exc)}")


@router.post("/run-scenario")
def demo_run_scenario() -> dict:
    """Execute the central bridge disruption flow using real backend engines."""
    try:
        return get_demo_service().run_scenario()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Demo scenario failed: {str(exc)}")
