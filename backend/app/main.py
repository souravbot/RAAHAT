"""RAAHAT backend — FastAPI application entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import twin
from app.api import health
from app.api import legacy_mock
from app.api import disruption
from app.api import simulation
from app.api import events
from app.api import reset
from app.api import accessibility
from app.api import impact
from app.api import depletion
from app.api import priority
from app.api import recommendations
from app.api import scenario
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="RAAHAT API",
    description=(
        "Regional AI for Accessibility, Assistance & Transport — backend API "
        "for the RAAHAT logistics intelligence platform."
    ),
    version="0.5.0",
)

# CORS: allow local frontend dev (Vite default) during the prototype phase.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(twin.router)
app.include_router(legacy_mock.router)
app.include_router(disruption.router)
app.include_router(simulation.router)
app.include_router(events.router)
app.include_router(reset.router)
app.include_router(accessibility.router)
app.include_router(impact.router)
app.include_router(depletion.router)
app.include_router(priority.router)
app.include_router(recommendations.router)
app.include_router(scenario.router)
app.include_router(events.router)
app.include_router(reset.router)
app.include_router(accessibility.router)
app.include_router(impact.router)
app.include_router(events.router)
app.include_router(reset.router)
app.include_router(accessibility.router)
