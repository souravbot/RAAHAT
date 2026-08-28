"""Disruption event model for the RAAHAT platform."""

import datetime
import uuid
from enum import Enum
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class DisruptionType(str, Enum):
    """Supported disruption operations for Phase 3."""

    CLOSURE = "CLOSURE"
    RISK_INCREASE = "RISK_INCREASE"

    @classmethod
    def from_request(cls, value: str) -> "DisruptionType":
        """Normalise a request string (e.g. 'closure') to the enum."""
        normalised = value.replace(" ", "_").upper()
        for member in cls:
            if member.value == normalised or member.value.lower() == value.lower():
                return member
        raise ValueError(f"Unsupported disruption type: {value}")


class EventTargetType(str, Enum):
    """What kind of entity a disruption targets.

    Phase 3 only supports EDGE disruptions, but future phases may target
    BRIDGE, ROAD, NODE, SERVICE or WAREHOUSE.
    """

    EDGE = "EDGE"
    BRIDGE = "BRIDGE"
    ROAD = "ROAD"
    NODE = "NODE"
    SERVICE = "SERVICE"
    WAREHOUSE = "WAREHOUSE"


class EventSeverity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class DisruptionEvent(BaseModel):
    """A single recorded disruption event."""

    event_id: str = Field(default_factory=lambda: f"EVT{uuid.uuid4().hex[:4].upper()}")
    type: DisruptionType
    target_type: EventTargetType
    target_id: str
    severity: EventSeverity
    risk_delta: int = 0
    source: str = "MANUAL_DEMO"
    timestamp: str = Field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
    )
    # Preserve pre-disruption values so future reset/recovery can restore them.
    original: Dict[str, Any] = Field(default_factory=dict)
    result: Optional[Dict[str, Any]] = None
