"""API routes"""
from .instances import router as instances_router
from .pricing import router as pricing_router
from .credentials import router as credentials_router
from .quotas import router as quotas_router
from .models import router as models_router
from .connections import router as connections_router
from .docker import router as docker_router
from .stacks import router as stacks_router

__all__ = ["instances_router", "pricing_router", "credentials_router", "quotas_router", "models_router", "connections_router", "docker_router", "stacks_router"]
