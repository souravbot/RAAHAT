"""EventService — in-memory event history for the backend session.

Modular so persistent storage can be added later without changing callers.
"""

from typing import List

from app.models.event import DisruptionEvent


class EventService:
    """Appends and lists disruption events for the current session."""

    def __init__(self):
        self._events: List[DisruptionEvent] = []

    def record(self, event: DisruptionEvent) -> None:
        self._events.append(event)

    def list(self) -> List[DisruptionEvent]:
        return list(self._events)

    def clear(self) -> None:
        self._events.clear()


# Module-level singleton so routes and services share one history.
_event_service: EventService | None = None


def get_event_service() -> EventService:
    global _event_service
    if _event_service is None:
        _event_service = EventService()
    return _event_service
