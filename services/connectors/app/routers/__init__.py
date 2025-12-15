"""
API Routers
===========
FastAPI routers for different API endpoints

Terminology:
- Provider: Template/definition of an external service (catalog)
- Connector: A configured instance of a provider with credentials for a specific device/service
"""

from .providers import router as providers_router
from .connectors import router as connectors_router
from .credentials import router as credentials_router
from .execution import router as execution_router

__all__ = [
    "providers_router",
    "connectors_router",
    "credentials_router",
    "execution_router",
]
