"""
FastAPI Dependencies
====================
Dependency injection for services
"""

from typing import Optional
from functools import lru_cache

from app.connectors.registry import ProviderRegistry
from app.connectors.credentials import CredentialManager, InMemoryCredentialBackend
from app.connectors.schema import SchemaRegistry
from app.core.config import settings

# Global instances (initialized on startup)
_registry: Optional[ProviderRegistry] = None
_cred_manager: Optional[CredentialManager] = None
_schema_registry: Optional[SchemaRegistry] = None


def init_services():
    """Initialize global service instances"""
    global _registry, _cred_manager, _schema_registry

    # Initialize provider registry
    _registry = ProviderRegistry.get_instance()

    # Initialize credential manager
    backend = InMemoryCredentialBackend()
    _cred_manager = CredentialManager(backend, encryption_key=settings.CREDENTIAL_ENCRYPTION_KEY)

    # Initialize schema registry
    _schema_registry = SchemaRegistry(_registry)

    return _registry, _cred_manager, _schema_registry


def get_registry() -> ProviderRegistry:
    """Get provider registry instance"""
    if _registry is None:
        raise RuntimeError("Services not initialized. Call init_services() first.")
    return _registry


def get_credential_manager() -> CredentialManager:
    """Get credential manager instance"""
    if _cred_manager is None:
        raise RuntimeError("Services not initialized. Call init_services() first.")
    return _cred_manager


def get_schema_registry() -> SchemaRegistry:
    """Get schema registry instance"""
    if _schema_registry is None:
        raise RuntimeError("Services not initialized. Call init_services() first.")
    return _schema_registry
