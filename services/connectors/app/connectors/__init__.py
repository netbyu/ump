"""
Connectors Module
=================
Connector framework core components and implementations.
"""

from .base import (
    ConnectorBase,
    DeclarativeConnector,
    ConnectorMetadata,
    AuthConfig,
    AuthType,
    AuthSchemaDefinition,
    ActionDefinition,
    TriggerDefinition,
    TriggerType,
    FieldDefinition,
    FieldType,
    ExecutionContext,
    ExecutionResult,
    ConnectorError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
)
from .registry import ConnectorRegistry, register_connector
from .credentials import CredentialManager, InMemoryCredentialBackend
from .schema import SchemaRegistry

__all__ = [
    # Base classes
    "ConnectorBase",
    "DeclarativeConnector",
    "ConnectorMetadata",
    "AuthConfig",
    "AuthType",
    "AuthSchemaDefinition",
    "ActionDefinition",
    "TriggerDefinition",
    "TriggerType",
    "FieldDefinition",
    "FieldType",
    "ExecutionContext",
    "ExecutionResult",
    # Exceptions
    "ConnectorError",
    "AuthenticationError",
    "RateLimitError",
    "ValidationError",
    # Registry
    "ConnectorRegistry",
    "register_connector",
    # Credentials
    "CredentialManager",
    "InMemoryCredentialBackend",
    # Schema
    "SchemaRegistry",
]
