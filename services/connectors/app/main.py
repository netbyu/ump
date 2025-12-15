"""
UCMP Connectors FastAPI Service
===============================
REST API for connector management, credential storage, and action execution.
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.dependencies import init_services, get_registry
from app.routers import connectors_router, credentials_router, execution_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""

    # Initialize services
    registry, cred_manager, schema_registry = init_services()

    # Auto-discover code-based connectors
    registry.auto_discover("app.connectors")

    # Load declarative manifests
    manifests_dir = os.path.join(os.path.dirname(__file__), "connectors/manifests")
    if os.path.exists(manifests_dir):
        registry.load_manifests_from_directory(manifests_dir)

    yield

    # Cleanup (if needed)
    pass


app = FastAPI(
    title=settings.APP_NAME,
    description="Integration platform for managing connectors, credentials, and executing actions",
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
app.include_router(connectors_router, prefix=settings.API_PREFIX)
app.include_router(credentials_router, prefix=settings.API_PREFIX)
app.include_router(execution_router, prefix=settings.API_PREFIX)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    try:
        registry = get_registry()
        connector_count = len(registry.get_connector_ids())
    except RuntimeError:
        connector_count = 0

    return {
        "status": "healthy",
        "service": "ucmp-connectors",
        "connectors_loaded": connector_count,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
