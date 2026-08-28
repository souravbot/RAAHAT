"""Health-check endpoint."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict:
    """Basic health-check used to confirm the API is running."""
    return {"status": "ok", "service": "raahat-backend"}
