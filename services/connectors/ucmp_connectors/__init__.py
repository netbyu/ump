"""
UCMP Connector Framework
========================
A flexible integration platform for building automation connectors,
inspired by n8n, Zapier, and Pabbly.

Quick Start:
-----------

    from ucmp_connectors import ConnectorRegistry, CredentialManager
    from ucmp_connectors.connectors import TwilioConnector

    # Get registry and create connector
    registry = ConnectorRegistry.get_instance()

    # Create connector with credentials
    twilio = registry.create_instance("twilio", auth_config=AuthConfig(
        auth_type=AuthType.BASIC,
        credentials={"account_sid": "AC...", "auth_token": "..."}
    ))

    # Execute action
    result = await twilio.execute_action(
        "send_sms",
        {"to": "+1555...", "from_number": "+1555...", "body": "Hello!"},
        ExecutionContext()
    )

For Temporal Integration:
------------------------

    from ucmp_connectors.temporal import (
        get_connector_activities,
        get_connector_workflows,
        ConnectorActionInput,
    )

    # Register activities with Temporal worker
    worker = Worker(
        client,
        task_queue="connectors",
        activities=get_connector_activities(),
        workflows=get_connector_workflows(),
    )
"""

__version__ = "1.0.0"
__author__ = "UCMP Team"

# Core exports
from .core.base import (
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

from .core.registry import ConnectorRegistry, register_connector
from .core.credentials import CredentialManager, InMemoryCredentialBackend
from .core.schema import SchemaRegistry

# Convenience function to get started quickly
def create_registry() -> ConnectorRegistry:
    """Create and return a connector registry with auto-discovery"""
    registry = ConnectorRegistry.get_instance()
    registry.auto_discover()
    return registry


__all__ = [
    # Version
    "__version__",

    # Core classes
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

    # Registry & Management
    "ConnectorRegistry",
    "register_connector",
    "CredentialManager",
    "InMemoryCredentialBackend",
    "SchemaRegistry",

    # Utilities
    "create_registry",
]
