"""
API Routers
===========
FastAPI routers for different API endpoints

Terminology:
- Provider: Template/definition of an external service (catalog)
- Connector: A configured instance of a provider with credentials
- Integration: A binding between a device/system and a connector
"""

from .providers import router as providers_router
from .connectors import router as connectors_router
from .integrations import router as integrations_router
from .credentials import router as credentials_router
from .execution import router as execution_router

__all__ = [
    "providers_router",
    "connectors_router",
    "integrations_router",
    "credentials_router",
    "execution_router",
]
