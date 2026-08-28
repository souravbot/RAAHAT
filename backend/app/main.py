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
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="RAAHAT API",
    description=(
        "Regional AI for Accessibility, Assistance & Transport — backend API "
        "for the RAAHAT logistics intelligence platform."
    ),
    version="0.3.0",
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
