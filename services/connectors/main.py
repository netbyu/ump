"""
UCMP Connectors FastAPI Service
===============================
REST API for connector management, credential storage, and action execution.
"""

import os
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Depends, Query, Path, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ucmp_connectors import (
    ConnectorRegistry,
    CredentialManager,
    SchemaRegistry,
    AuthConfig,
    AuthType,
    ExecutionContext,
    ExecutionResult,
)
from ucmp_connectors.core.credentials import InMemoryCredentialBackend

# Global instances
registry: ConnectorRegistry = None
cred_manager: CredentialManager = None
schema_registry: SchemaRegistry = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    global registry, cred_manager, schema_registry

    # Initialize registry and auto-discover connectors
    registry = ConnectorRegistry.get_instance()
    registry.auto_discover("ucmp_connectors.connectors")

    # Load declarative manifests
    manifests_dir = os.path.join(os.path.dirname(__file__), "ucmp_connectors/schemas/manifests")
    if os.path.exists(manifests_dir):
        registry.load_manifests_from_directory(manifests_dir)

    # Initialize credential manager (use in-memory for now, can swap to PostgreSQL)
    encryption_key = os.environ.get("UCMP_CREDENTIAL_KEY", "dev-key-change-in-prod-32chars!")
    backend = InMemoryCredentialBackend()
    cred_manager = CredentialManager(backend, encryption_key=encryption_key)

    # Initialize schema registry
    schema_registry = SchemaRegistry(registry)

    yield

    # Cleanup
    pass


app = FastAPI(
    title="UCMP Connectors API",
    description="Integration platform for managing connectors, credentials, and executing actions",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Pydantic Models
# =============================================================================

class ConnectorInfo(BaseModel):
    """Basic connector information"""
    id: str
    name: str
    description: str
    version: str
    icon_url: Optional[str] = None
    categories: List[str] = []
    tags: List[str] = []
    auth_type: str
    supports_webhooks: bool = False


class ConnectorDetail(ConnectorInfo):
    """Detailed connector information including actions and triggers"""
    actions: List[Dict[str, Any]] = []
    triggers: List[Dict[str, Any]] = []
    auth_schema: Dict[str, Any] = {}


class CredentialCreate(BaseModel):
    """Create credential request"""
    connector_id: str
    name: str
    credentials: Dict[str, Any]
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None


class CredentialResponse(BaseModel):
    """Credential response (without sensitive data)"""
    id: str
    connector_id: str
    name: str
    auth_type: str
    is_valid: bool
    created_at: str
    updated_at: str
    last_used_at: Optional[str] = None


class ExecuteActionRequest(BaseModel):
    """Execute action request"""
    credential_id: str
    inputs: Dict[str, Any] = {}
    workflow_id: Optional[str] = None
    step_id: Optional[str] = None
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None


class ExecuteActionResponse(BaseModel):
    """Execute action response"""
    success: bool
    data: Dict[str, Any] = {}
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    execution_time_ms: int = 0
    has_more: bool = False
    cursor: Optional[str] = None


class TestConnectionRequest(BaseModel):
    """Test connection request"""
    credentials: Dict[str, Any]


class TestConnectionResponse(BaseModel):
    """Test connection response"""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


# =============================================================================
# Connectors Endpoints
# =============================================================================

@app.get("/api/connectors", response_model=List[ConnectorInfo], tags=["Connectors"])
async def list_connectors(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search query"),
):
    """List all available connectors"""
    if search or category:
        results = registry.search(
            query=search or "",
            categories=[category] if category else None,
        )
    else:
        results = registry.get_all_metadata()

    connectors = []
    for meta in results:
        connectors.append(ConnectorInfo(
            id=meta.id,
            name=meta.name,
            description=meta.description,
            version=meta.version,
            icon_url=meta.icon_url,
            categories=meta.categories,
            tags=meta.tags,
            auth_type=meta.auth_schema.auth_type,
            supports_webhooks=meta.supports_webhooks,
        ))

    return connectors


@app.get("/api/connectors/{connector_id}", response_model=ConnectorDetail, tags=["Connectors"])
async def get_connector(
    connector_id: str = Path(..., description="Connector ID"),
):
    """Get detailed information about a connector"""
    meta = registry.get_metadata(connector_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Connector not found: {connector_id}")

    # Create instance to get actions/triggers
    connector = registry.create_instance(connector_id)

    actions = []
    if connector:
        for action in connector.get_actions():
            actions.append({
                "id": action.id,
                "name": action.name,
                "description": action.description,
                "category": action.category,
                "inputs": [f.model_dump() for f in action.inputs],
                "outputs": [f.model_dump() for f in action.outputs],
                "is_idempotent": action.is_idempotent,
            })

    triggers = []
    if connector:
        for trigger in connector.get_triggers():
            triggers.append({
                "id": trigger.id,
                "name": trigger.name,
                "description": trigger.description,
                "trigger_type": trigger.trigger_type,
                "outputs": [f.model_dump() for f in trigger.outputs],
                "config_fields": [f.model_dump() for f in trigger.config_fields],
            })

    auth_schema = schema_registry.get_auth_schema(connector_id) or {}

    return ConnectorDetail(
        id=meta.id,
        name=meta.name,
        description=meta.description,
        version=meta.version,
        icon_url=meta.icon_url,
        categories=meta.categories,
        tags=meta.tags,
        auth_type=meta.auth_schema.auth_type,
        supports_webhooks=meta.supports_webhooks,
        actions=actions,
        triggers=triggers,
        auth_schema=auth_schema,
    )


@app.get("/api/connectors/{connector_id}/schema", tags=["Connectors"])
async def get_connector_schemas(
    connector_id: str = Path(..., description="Connector ID"),
):
    """Get all schemas (auth, actions, triggers) for a connector"""
    schemas = schema_registry.get_connector_schemas(connector_id)
    if not schemas:
        raise HTTPException(status_code=404, detail=f"Connector not found: {connector_id}")
    return schemas


@app.get("/api/connectors/{connector_id}/actions/{action_id}/schema", tags=["Connectors"])
async def get_action_schema(
    connector_id: str = Path(..., description="Connector ID"),
    action_id: str = Path(..., description="Action ID"),
):
    """Get JSON schema for a specific action"""
    schema = schema_registry.get_action_schema(connector_id, action_id)
    if not schema:
        raise HTTPException(status_code=404, detail=f"Action not found: {connector_id}/{action_id}")
    return schema


# =============================================================================
# Credentials Endpoints
# =============================================================================

@app.post("/api/credentials", response_model=CredentialResponse, tags=["Credentials"])
async def create_credentials(
    request: CredentialCreate,
):
    """Store new credentials for a connector"""
    # Validate connector exists
    meta = registry.get_metadata(request.connector_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Connector not found: {request.connector_id}")

    # Store credentials
    cred_id = await cred_manager.store_credentials(
        connector_id=request.connector_id,
        credentials=request.credentials,
        name=request.name,
        auth_type=meta.auth_schema.auth_type,
        user_id=request.user_id,
        tenant_id=request.tenant_id,
    )

    # Get stored credential metadata
    stored = await cred_manager.backend.retrieve(cred_id)

    return CredentialResponse(
        id=stored.id,
        connector_id=stored.connector_id,
        name=stored.name,
        auth_type=stored.auth_type,
        is_valid=stored.is_valid,
        created_at=stored.created_at.isoformat(),
        updated_at=stored.updated_at.isoformat(),
        last_used_at=stored.last_used_at.isoformat() if stored.last_used_at else None,
    )


@app.get("/api/credentials", response_model=List[CredentialResponse], tags=["Credentials"])
async def list_credentials(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    connector_id: Optional[str] = Query(None, description="Filter by connector ID"),
    tenant_id: Optional[str] = Query(None, description="Filter by tenant ID"),
):
    """List stored credentials"""
    if user_id:
        credentials = await cred_manager.list_user_credentials(
            user_id=user_id,
            tenant_id=tenant_id,
            connector_id=connector_id,
        )
    else:
        # List all (for admin)
        all_creds = []
        for cid in registry.get_connector_ids():
            creds = await cred_manager.backend.list_for_connector(cid, tenant_id)
            all_creds.extend(creds)
        credentials = [
            {
                "id": c.id,
                "connector_id": c.connector_id,
                "name": c.name,
                "auth_type": c.auth_type,
                "is_valid": c.is_valid,
                "created_at": c.created_at.isoformat(),
                "updated_at": c.updated_at.isoformat(),
                "last_used_at": c.last_used_at.isoformat() if c.last_used_at else None,
            }
            for c in all_creds
        ]

    return credentials


@app.delete("/api/credentials/{credential_id}", tags=["Credentials"])
async def delete_credentials(
    credential_id: str = Path(..., description="Credential ID"),
):
    """Delete stored credentials"""
    success = await cred_manager.delete_credentials(credential_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Credentials not found: {credential_id}")
    return {"success": True, "message": "Credentials deleted"}


@app.post("/api/credentials/{credential_id}/test", response_model=TestConnectionResponse, tags=["Credentials"])
async def test_stored_credentials(
    credential_id: str = Path(..., description="Credential ID"),
):
    """Test stored credentials by connecting to the service"""
    auth_config = await cred_manager.get_auth_config(credential_id)
    if not auth_config:
        raise HTTPException(status_code=404, detail=f"Credentials not found: {credential_id}")

    # Get credential info to find connector_id
    stored = await cred_manager.backend.retrieve(credential_id)
    connector = registry.create_instance(stored.connector_id, auth_config)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Connector not found: {stored.connector_id}")

    result = await connector.test_connection()

    # Update validity status
    if not result.success:
        await cred_manager.mark_invalid(credential_id)

    return TestConnectionResponse(
        success=result.success,
        message=result.data.get("message", "Test completed") if result.success else result.error_message or "Test failed",
        details=result.data,
    )


@app.post("/api/connectors/{connector_id}/test", response_model=TestConnectionResponse, tags=["Connectors"])
async def test_connection(
    connector_id: str = Path(..., description="Connector ID"),
    request: TestConnectionRequest = Body(...),
):
    """Test credentials without storing them"""
    meta = registry.get_metadata(connector_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Connector not found: {connector_id}")

    auth_config = AuthConfig(
        auth_type=AuthType(meta.auth_schema.auth_type),
        credentials=request.credentials,
    )

    connector = registry.create_instance(connector_id, auth_config)
    if not connector:
        raise HTTPException(status_code=500, detail="Failed to create connector instance")

    result = await connector.test_connection()

    return TestConnectionResponse(
        success=result.success,
        message=result.data.get("message", "Test completed") if result.success else result.error_message or "Test failed",
        details=result.data,
    )


# =============================================================================
# Execution Endpoints
# =============================================================================

@app.post(
    "/api/connectors/{connector_id}/actions/{action_id}/execute",
    response_model=ExecuteActionResponse,
    tags=["Execution"],
)
async def execute_action(
    connector_id: str = Path(..., description="Connector ID"),
    action_id: str = Path(..., description="Action ID"),
    request: ExecuteActionRequest = Body(...),
):
    """Execute a connector action"""
    # Get credentials
    auth_config = await cred_manager.get_auth_config(request.credential_id)
    if not auth_config:
        raise HTTPException(status_code=404, detail=f"Credentials not found: {request.credential_id}")

    # Create connector
    connector = registry.create_instance(connector_id, auth_config)
    if not connector:
        raise HTTPException(status_code=404, detail=f"Connector not found: {connector_id}")

    # Build context
    context = ExecutionContext(
        workflow_id=request.workflow_id,
        step_id=request.step_id,
        user_id=request.user_id,
        tenant_id=request.tenant_id,
    )

    # Validate inputs
    try:
        connector.validate_inputs(action_id, request.inputs)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Execute
    result = await connector.execute_action(action_id, request.inputs, context)

    return ExecuteActionResponse(
        success=result.success,
        data=result.data,
        error_message=result.error_message,
        error_code=result.error_code,
        execution_time_ms=result.execution_time_ms,
        has_more=result.has_more,
        cursor=result.cursor,
    )


# =============================================================================
# Health Check
# =============================================================================

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    connector_count = len(registry.get_connector_ids()) if registry else 0
    return {
        "status": "healthy",
        "service": "ucmp-connectors",
        "connectors_loaded": connector_count,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
