"""
Pydantic Schemas for API request/response models

Terminology:
- Provider: Template/definition of an external service
- Connector: A configured instance of a provider with credentials
- Integration: A binding between a device/system and a connector
"""

# Provider schemas (templates)
from .provider import (
    ProviderInfo,
    ProviderDetail,
    ConnectorInfo,      # Backward compat alias
    ConnectorDetail,    # Backward compat alias
)

# Connector schemas (configured instances)
from .connector import (
    ConnectorCreate,
    ConnectorUpdate,
    ConnectorResponse,
    ConnectorList,
    TestConnectionRequest,
    TestConnectionResponse,
)

# Integration schemas (device bindings)
from .integration import (
    ActionMapping,
    IntegrationCreate,
    IntegrationUpdate,
    IntegrationResponse,
    IntegrationList,
    TriggerIntegrationRequest,
    TriggerIntegrationResponse,
)

# Credential schemas
from .credential import CredentialCreate, CredentialResponse

# Execution schemas
from .execution import (
    ExecuteActionRequest,
    ExecuteActionResponse,
)

__all__ = [
    # Provider
    "ProviderInfo",
    "ProviderDetail",
    "ConnectorInfo",        # Backward compat
    "ConnectorDetail",      # Backward compat
    # Connector
    "ConnectorCreate",
    "ConnectorUpdate",
    "ConnectorResponse",
    "ConnectorList",
    "TestConnectionRequest",
    "TestConnectionResponse",
    # Integration
    "ActionMapping",
    "IntegrationCreate",
    "IntegrationUpdate",
    "IntegrationResponse",
    "IntegrationList",
    "TriggerIntegrationRequest",
    "TriggerIntegrationResponse",
    # Credential
    "CredentialCreate",
    "CredentialResponse",
    # Execution
    "ExecuteActionRequest",
    "ExecuteActionResponse",
]
