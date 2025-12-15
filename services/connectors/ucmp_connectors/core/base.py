"""
Base Connector Classes and Core Abstractions
============================================
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Dict, List, Optional, Callable, Type
from datetime import datetime
from pydantic import BaseModel, Field
import asyncio
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Enums
# =============================================================================

class AuthType(str, Enum):
    """Supported authentication types"""
    NONE = "none"
    API_KEY = "api_key"
    BASIC = "basic"
    BEARER = "bearer"
    OAUTH2 = "oauth2"
    OAUTH2_CLIENT_CREDENTIALS = "oauth2_client_credentials"
    CUSTOM = "custom"
    

class TriggerType(str, Enum):
    """Types of triggers for workflow initiation"""
    WEBHOOK = "webhook"           # Inbound webhook from external service
    POLLING = "polling"           # Scheduled polling for changes
    WEBSOCKET = "websocket"       # Real-time websocket connection
    MANUAL = "manual"             # Manual trigger


class FieldType(str, Enum):
    """Field types for dynamic schema generation"""
    STRING = "string"
    NUMBER = "number"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
    DATE = "date"
    DATETIME = "datetime"
    EMAIL = "email"
    URL = "url"
    PHONE = "phone"
    PASSWORD = "password"
    TEXT = "text"           # Multi-line text
    SELECT = "select"       # Dropdown selection
    MULTISELECT = "multiselect"
    FILE = "file"


# =============================================================================
# Exception Classes
# =============================================================================

class ConnectorError(Exception):
    """Base exception for connector errors"""
    def __init__(self, message: str, connector_id: str = None, details: dict = None):
        self.connector_id = connector_id
        self.details = details or {}
        super().__init__(message)


class AuthenticationError(ConnectorError):
    """Authentication failed"""
    pass


class RateLimitError(ConnectorError):
    """Rate limit exceeded"""
    def __init__(self, message: str, retry_after: int = None, **kwargs):
        self.retry_after = retry_after
        super().__init__(message, **kwargs)


class ValidationError(ConnectorError):
    """Input validation failed"""
    def __init__(self, message: str, field_errors: dict = None, **kwargs):
        self.field_errors = field_errors or {}
        super().__init__(message, **kwargs)


# =============================================================================
# Pydantic Models
# =============================================================================

class FieldDefinition(BaseModel):
    """Defines a single field for actions/triggers"""
    name: str
    label: str
    type: FieldType = FieldType.STRING
    description: str = ""
    required: bool = False
    default: Any = None
    secret: bool = False                    # Mask in UI, encrypt in storage
    options: List[Dict[str, str]] = []      # For SELECT/MULTISELECT: [{"value": "x", "label": "X"}]
    depends_on: Optional[str] = None        # Dynamic field that depends on another field
    placeholder: str = ""
    validation_regex: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None

    class Config:
        use_enum_values = True


class AuthConfig(BaseModel):
    """Authentication configuration for a connector instance"""
    auth_type: AuthType
    credentials: Dict[str, Any] = {}
    
    # OAuth2 specific
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    
    class Config:
        use_enum_values = True


class AuthSchemaDefinition(BaseModel):
    """Defines authentication requirements for a connector"""
    auth_type: AuthType
    fields: List[FieldDefinition] = []
    oauth2_config: Optional[Dict[str, Any]] = None  # auth_url, token_url, scopes, etc.
    
    class Config:
        use_enum_values = True


class ActionDefinition(BaseModel):
    """Defines an action that a connector can perform"""
    id: str                                 # Unique action identifier
    name: str                               # Human-readable name
    description: str = ""
    category: str = "General"               # For grouping in UI
    inputs: List[FieldDefinition] = []
    outputs: List[FieldDefinition] = []
    
    # Behavior hints
    is_batch_capable: bool = False          # Can process multiple items
    is_idempotent: bool = False             # Safe to retry
    estimated_duration_ms: int = 1000       # For timeout estimation
    rate_limit_weight: int = 1              # For rate limiting


class TriggerDefinition(BaseModel):
    """Defines a trigger that can initiate workflows"""
    id: str
    name: str
    description: str = ""
    trigger_type: TriggerType
    outputs: List[FieldDefinition] = []     # Data shape emitted by trigger
    
    # Configuration fields (e.g., which events to subscribe to)
    config_fields: List[FieldDefinition] = []
    
    # Polling specific
    default_poll_interval_seconds: int = 300
    min_poll_interval_seconds: int = 60
    
    class Config:
        use_enum_values = True


class ConnectorMetadata(BaseModel):
    """Metadata describing a connector"""
    id: str                                 # Unique connector identifier (e.g., "twilio", "asterisk")
    name: str                               # Display name
    description: str = ""
    version: str = "1.0.0"
    icon_url: Optional[str] = None
    documentation_url: Optional[str] = None
    
    # Categorization
    categories: List[str] = []              # ["telephony", "sms", "voice"]
    tags: List[str] = []
    
    # Auth requirements
    auth_schema: AuthSchemaDefinition
    
    # Capabilities
    supports_test_connection: bool = True
    supports_webhooks: bool = False
    base_url: Optional[str] = None          # For display/documentation


class ExecutionContext(BaseModel):
    """Context passed to action/trigger execution"""
    workflow_id: Optional[str] = None
    workflow_run_id: Optional[str] = None
    step_id: Optional[str] = None
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None
    
    # For logging/tracing
    correlation_id: Optional[str] = None
    
    # Execution settings
    timeout_ms: int = 30000
    retry_count: int = 0
    max_retries: int = 3
    
    # Additional context
    variables: Dict[str, Any] = {}          # Workflow variables
    metadata: Dict[str, Any] = {}


class ExecutionResult(BaseModel):
    """Result from action/trigger execution"""
    success: bool
    data: Dict[str, Any] = {}
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    
    # Metadata
    execution_time_ms: int = 0
    rate_limit_remaining: Optional[int] = None
    raw_response: Optional[Dict[str, Any]] = None  # Original API response
    
    # For pagination
    has_more: bool = False
    cursor: Optional[str] = None


# =============================================================================
# Base Connector Class
# =============================================================================

class ConnectorBase(ABC):
    """
    Base class for all connectors.
    
    Implement this class to create a new integration.
    """
    
    def __init__(self, auth_config: Optional[AuthConfig] = None):
        self.auth_config = auth_config
        self._authenticated = False
        self._rate_limiter: Optional[asyncio.Semaphore] = None
        self._http_client = None
        
    # -------------------------------------------------------------------------
    # Abstract Methods - Must Implement
    # -------------------------------------------------------------------------
    
    @classmethod
    @abstractmethod
    def get_metadata(cls) -> ConnectorMetadata:
        """Return connector metadata including auth requirements"""
        pass
    
    @abstractmethod
    async def authenticate(self) -> bool:
        """
        Authenticate with the service.
        Returns True if successful, raises AuthenticationError otherwise.
        """
        pass
    
    @abstractmethod
    def get_actions(self) -> List[ActionDefinition]:
        """Return list of available actions"""
        pass
    
    @abstractmethod
    async def execute_action(
        self,
        action_id: str,
        inputs: Dict[str, Any],
        context: ExecutionContext
    ) -> ExecutionResult:
        """Execute an action and return the result"""
        pass
    
    # -------------------------------------------------------------------------
    # Optional Methods - Override as Needed
    # -------------------------------------------------------------------------
    
    def get_triggers(self) -> List[TriggerDefinition]:
        """Return list of available triggers (override if connector supports triggers)"""
        return []
    
    async def test_connection(self) -> ExecutionResult:
        """
        Test the connection with current credentials.
        Default implementation just calls authenticate().
        """
        try:
            await self.authenticate()
            return ExecutionResult(success=True, data={"message": "Connection successful"})
        except AuthenticationError as e:
            return ExecutionResult(success=False, error_message=str(e), error_code="AUTH_FAILED")
        except Exception as e:
            return ExecutionResult(success=False, error_message=str(e), error_code="CONNECTION_ERROR")
    
    async def refresh_oauth_token(self) -> AuthConfig:
        """Refresh OAuth2 token if expired (override for OAuth2 connectors)"""
        raise NotImplementedError("OAuth2 token refresh not implemented")
    
    async def setup_webhook(
        self,
        trigger_id: str,
        webhook_url: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Register a webhook with the external service.
        Returns webhook registration details (e.g., webhook_id).
        """
        raise NotImplementedError("Webhook setup not implemented")
    
    async def teardown_webhook(self, webhook_id: str) -> bool:
        """Remove a previously registered webhook"""
        raise NotImplementedError("Webhook teardown not implemented")
    
    async def poll_trigger(
        self,
        trigger_id: str,
        config: Dict[str, Any],
        last_poll_state: Optional[Dict[str, Any]] = None
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Poll for new trigger events.
        Returns (list of events, new poll state to persist).
        """
        raise NotImplementedError("Polling not implemented")
    
    async def get_dynamic_options(
        self,
        field_name: str,
        depends_on_values: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """
        Fetch dynamic options for a field (e.g., list of available phone numbers).
        Returns list of {"value": "x", "label": "X"} options.
        """
        return []
    
    # -------------------------------------------------------------------------
    # Helper Methods
    # -------------------------------------------------------------------------
    
    async def ensure_authenticated(self):
        """Ensure connector is authenticated before making requests"""
        if not self._authenticated:
            await self.authenticate()
            self._authenticated = True
    
    def validate_inputs(self, action_id: str, inputs: Dict[str, Any]) -> None:
        """
        Validate inputs against action schema.
        Raises ValidationError if invalid.
        """
        action = next((a for a in self.get_actions() if a.id == action_id), None)
        if not action:
            raise ValidationError(f"Unknown action: {action_id}")
        
        field_errors = {}
        for field in action.inputs:
            value = inputs.get(field.name)
            
            # Required check
            if field.required and value is None:
                field_errors[field.name] = "This field is required"
                continue
            
            if value is not None:
                # Type validation
                if field.type == FieldType.INTEGER and not isinstance(value, int):
                    field_errors[field.name] = "Must be an integer"
                elif field.type == FieldType.NUMBER and not isinstance(value, (int, float)):
                    field_errors[field.name] = "Must be a number"
                elif field.type == FieldType.BOOLEAN and not isinstance(value, bool):
                    field_errors[field.name] = "Must be a boolean"
                
                # Length validation
                if field.min_length and isinstance(value, str) and len(value) < field.min_length:
                    field_errors[field.name] = f"Minimum length is {field.min_length}"
                if field.max_length and isinstance(value, str) and len(value) > field.max_length:
                    field_errors[field.name] = f"Maximum length is {field.max_length}"
        
        if field_errors:
            raise ValidationError("Input validation failed", field_errors=field_errors)
    
    async def close(self):
        """Cleanup resources (HTTP client, etc.)"""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None


# =============================================================================
# Declarative Connector (Schema-Driven)
# =============================================================================

class DeclarativeConnector(ConnectorBase):
    """
    Base class for simple REST API connectors defined via schema/manifest.
    Useful for straightforward APIs where a declarative approach suffices.
    """
    
    def __init__(
        self,
        manifest: Dict[str, Any],
        auth_config: Optional[AuthConfig] = None
    ):
        super().__init__(auth_config)
        self.manifest = manifest
        self._parsed_actions: List[ActionDefinition] = []
        self._parsed_triggers: List[TriggerDefinition] = []
        self._parse_manifest()
    
    def _parse_manifest(self):
        """Parse the manifest into action/trigger definitions"""
        # Parse actions
        for action_def in self.manifest.get("actions", []):
            self._parsed_actions.append(ActionDefinition(
                id=action_def["id"],
                name=action_def["name"],
                description=action_def.get("description", ""),
                inputs=[FieldDefinition(**f) for f in action_def.get("inputs", [])],
                outputs=[FieldDefinition(**f) for f in action_def.get("outputs", [])],
            ))
        
        # Parse triggers
        for trigger_def in self.manifest.get("triggers", []):
            self._parsed_triggers.append(TriggerDefinition(
                id=trigger_def["id"],
                name=trigger_def["name"],
                description=trigger_def.get("description", ""),
                trigger_type=TriggerType(trigger_def.get("trigger_type", "polling")),
                outputs=[FieldDefinition(**f) for f in trigger_def.get("outputs", [])],
            ))
    
    @classmethod
    def get_metadata(cls) -> ConnectorMetadata:
        # Override in subclass or set via manifest
        raise NotImplementedError("Set metadata via manifest or override")
    
    async def authenticate(self) -> bool:
        """Default authentication using manifest-defined auth type"""
        import httpx
        
        auth_type = self.auth_config.auth_type if self.auth_config else AuthType.NONE
        base_url = self.manifest.get("base_url", "")
        
        if auth_type == AuthType.API_KEY:
            # Test with a simple request if test_endpoint is defined
            test_endpoint = self.manifest.get("test_endpoint")
            if test_endpoint:
                headers = self._build_auth_headers()
                async with httpx.AsyncClient() as client:
                    resp = await client.get(f"{base_url}{test_endpoint}", headers=headers)
                    if resp.status_code == 401:
                        raise AuthenticationError("Invalid API key")
                    resp.raise_for_status()
        
        self._authenticated = True
        return True
    
    def _build_auth_headers(self) -> Dict[str, str]:
        """Build authentication headers based on auth config"""
        headers = {}
        if not self.auth_config:
            return headers
        
        creds = self.auth_config.credentials
        auth_type = self.auth_config.auth_type
        
        if auth_type == AuthType.API_KEY:
            header_name = self.manifest.get("auth", {}).get("header_name", "X-API-Key")
            headers[header_name] = creds.get("api_key", "")
        elif auth_type == AuthType.BEARER:
            token = self.auth_config.access_token or creds.get("token", "")
            headers["Authorization"] = f"Bearer {token}"
        elif auth_type == AuthType.BASIC:
            import base64
            credentials = f"{creds.get('username', '')}:{creds.get('password', '')}"
            encoded = base64.b64encode(credentials.encode()).decode()
            headers["Authorization"] = f"Basic {encoded}"
        
        return headers
    
    def get_actions(self) -> List[ActionDefinition]:
        return self._parsed_actions
    
    def get_triggers(self) -> List[TriggerDefinition]:
        return self._parsed_triggers
    
    async def execute_action(
        self,
        action_id: str,
        inputs: Dict[str, Any],
        context: ExecutionContext
    ) -> ExecutionResult:
        """Execute action based on manifest definition"""
        import httpx
        import time
        
        start_time = time.time()
        
        # Find action definition in manifest
        action_manifest = next(
            (a for a in self.manifest.get("actions", []) if a["id"] == action_id),
            None
        )
        if not action_manifest:
            return ExecutionResult(
                success=False,
                error_message=f"Unknown action: {action_id}",
                error_code="UNKNOWN_ACTION"
            )
        
        await self.ensure_authenticated()
        
        # Build request
        base_url = self.manifest.get("base_url", "")
        endpoint = action_manifest.get("endpoint", "")
        method = action_manifest.get("method", "GET").upper()
        
        # Variable substitution in endpoint
        for key, value in inputs.items():
            endpoint = endpoint.replace(f"{{{key}}}", str(value))
        
        url = f"{base_url}{endpoint}"
        headers = self._build_auth_headers()
        headers["Content-Type"] = "application/json"
        
        # Determine body/params based on method
        body_fields = action_manifest.get("body_fields", [])
        query_fields = action_manifest.get("query_fields", [])
        
        body = {k: v for k, v in inputs.items() if k in body_fields}
        params = {k: v for k, v in inputs.items() if k in query_fields}
        
        try:
            async with httpx.AsyncClient(timeout=context.timeout_ms / 1000) as client:
                if method in ("POST", "PUT", "PATCH"):
                    resp = await client.request(method, url, headers=headers, json=body, params=params)
                else:
                    resp = await client.request(method, url, headers=headers, params=params)
                
                execution_time_ms = int((time.time() - start_time) * 1000)
                
                # Handle rate limiting
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", 60))
                    raise RateLimitError(
                        "Rate limit exceeded",
                        retry_after=retry_after,
                        connector_id=self.manifest.get("id")
                    )
                
                resp.raise_for_status()
                data = resp.json() if resp.content else {}
                
                return ExecutionResult(
                    success=True,
                    data=data,
                    execution_time_ms=execution_time_ms,
                    raw_response=data
                )
                
        except httpx.HTTPStatusError as e:
            return ExecutionResult(
                success=False,
                error_message=str(e),
                error_code=f"HTTP_{e.response.status_code}",
                execution_time_ms=int((time.time() - start_time) * 1000)
            )
        except Exception as e:
            return ExecutionResult(
                success=False,
                error_message=str(e),
                error_code="EXECUTION_ERROR",
                execution_time_ms=int((time.time() - start_time) * 1000)
            )
