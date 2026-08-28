"""Edge model for the RAAHAT Regional Digital Twin."""

from enum import Enum
from typing import Any, Dict

from pydantic import BaseModel, Field, field_validator


class EdgeType(str, Enum):
    """Concrete edge type."""

    ROAD = "ROAD"
    BRIDGE = "BRIDGE"


class EdgeStatus(str, Enum):
    """Operational status of a transportation edge."""

    OPEN = "OPEN"
    AT_RISK = "AT_RISK"
    CLOSED = "CLOSED"


class EdgeState(BaseModel):
    """Current operational state of an edge."""

    last_updated_at: str = Field(default="", description="ISO timestamp")

    def __bool__(self):
        return self.last_updated_at != ""


class TransportEdge(BaseModel):
    """A transportation connection between exactly two nodes."""

    id: str
    type: EdgeType
    connects: list[str] = Field(min_length=2, max_length=2)
    distance_km: float = Field(ge=0)
    base_travel_time_min: float = Field(ge=0)
    status: EdgeStatus = EdgeStatus.OPEN
    risk_score: int = Field(ge=0, le=100)
    attributes: Dict[str, Any] = Field(default_factory=dict)
    state: EdgeState = Field(default_factory=EdgeState)

    @field_validator("connects")
    @classmethod
    def check_connects(cls, v):
        if len(v) != 2:
            raise ValueError("An edge must connect exactly two node IDs")
        if v[0] == v[1]:
            raise ValueError("An edge cannot connect a node to itself")
        return v

    @field_validator("risk_score")
    @classmethod
    def check_risk(cls, v):
        if not (0 <= v <= 100):
            raise ValueError("risk_score must be between 0 and 100")
        return v

    @property
    def source(self) -> str:
        return self.connects[0]

    @property
    def target(self) -> str:
        return self.connects[1]

    def model_dump_simple(self) -> Dict[str, Any]:
        data = self.model_dump()
        data["type"] = self.type.value
        data["status"] = self.status.value
        return data
