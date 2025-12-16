"""
UCMP Connectors FastAPI Service
===============================
REST API for managing providers, connectors, and action execution.

Terminology:
- Provider: Template/definition of an external service (e.g., Zabbix, Portainer, Asterisk)
- Connector: A configured instance of a provider with credentials for a specific device/service
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.dependencies import init_services, get_registry
from app.routers import (
    providers_router,
    connectors_router,
    credentials_router,
    execution_router,
    nodes_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""

    # Initialize services
    registry, cred_manager, schema_registry = init_services()

    # Auto-discover code-based providers
    registry.auto_discover("app.connectors")

    # Load declarative provider manifests
    providers_dir = os.path.join(os.path.dirname(__file__), "connectors/providers")
    if os.path.exists(providers_dir):
        registry.load_manifests_from_directory(providers_dir)

    yield

    # Cleanup (if needed)
    pass


app = FastAPI(
    title=settings.APP_NAME,
    description="Connector platform for managing providers, connectors, and executing actions",
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(providers_router, prefix=settings.API_PREFIX)
app.include_router(connectors_router, prefix=settings.API_PREFIX)
app.include_router(credentials_router, prefix=settings.API_PREFIX)
app.include_router(execution_router, prefix=settings.API_PREFIX)
app.include_router(nodes_router, prefix=settings.API_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    try:
        registry = get_registry()
        provider_count = len(registry.get_provider_ids())
    except RuntimeError:
        provider_count = 0

    return {
        "status": "healthy",
        "service": "ucmp-connectors",
        "providers_loaded": provider_count,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
