"""Legacy mock endpoint retained so the Phase-0 frontend keeps working.

The frontend currently calls GET /api/locations for its static markers. This is
kept until a later phase migrates the map to read from /twin. It is NOT part of
the Phase 1 digital twin; it only serves the old static fixture.
"""

from fastapi import APIRouter, HTTPException
from pathlib import Path
from typing import Any, Dict, List

from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["mock-legacy"])

_DATA_DIR = Path(__file__).resolve().parents[2] / "data"


class MockLocation(BaseModel):
    id: str
    name: str
    kind: str
    lat: float
    lon: float
    status: str = "unknown"


class MockLocationList(BaseModel):
    locations: List[MockLocation]


@router.get("/locations", response_model=MockLocationList)
def get_locations() -> MockLocationList:
    """Return the static set of locations (markers) for the frontend map."""
    fixture = _DATA_DIR / "locations.json"
    if not fixture.exists():
        raise HTTPException(status_code=500, detail="locations.json fixture missing")
    import json

    data: Dict[str, Any] = json.loads(fixture.read_text(encoding="utf-8"))
    return MockLocationList(**data)
