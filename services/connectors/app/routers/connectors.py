"""
Connectors Router
=================
API endpoints for connector management
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Path, Body, Depends

from app.schemas import ConnectorInfo, ConnectorDetail, TestConnectionRequest, TestConnectionResponse
from app.connectors.registry import ConnectorRegistry
from app.connectors.schema import SchemaRegistry
from app.connectors.base import AuthConfig, AuthType
from app.core.dependencies import get_registry, get_schema_registry

router = APIRouter(prefix="/connectors", tags=["Connectors"])


@router.get("", response_model=List[ConnectorInfo])
async def list_connectors(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search query"),
    registry: ConnectorRegistry = Depends(get_registry),
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


@router.get("/{connector_id}", response_model=ConnectorDetail)
async def get_connector(
    connector_id: str = Path(..., description="Connector ID"),
    registry: ConnectorRegistry = Depends(get_registry),
    schema_registry: SchemaRegistry = Depends(get_schema_registry),
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


@router.get("/{connector_id}/schema")
async def get_connector_schemas(
    connector_id: str = Path(..., description="Connector ID"),
    schema_registry: SchemaRegistry = Depends(get_schema_registry),
):
    """Get all schemas (auth, actions, triggers) for a connector"""
    schemas = schema_registry.get_connector_schemas(connector_id)
    if not schemas:
        raise HTTPException(status_code=404, detail=f"Connector not found: {connector_id}")
    return schemas


@router.get("/{connector_id}/actions/{action_id}/schema")
async def get_action_schema(
    connector_id: str = Path(..., description="Connector ID"),
    action_id: str = Path(..., description="Action ID"),
    schema_registry: SchemaRegistry = Depends(get_schema_registry),
):
    """Get JSON schema for a specific action"""
    schema = schema_registry.get_action_schema(connector_id, action_id)
    if not schema:
        raise HTTPException(status_code=404, detail=f"Action not found: {connector_id}/{action_id}")
    return schema


@router.post("/{connector_id}/test", response_model=TestConnectionResponse)
async def test_connection(
    connector_id: str = Path(..., description="Connector ID"),
    request: TestConnectionRequest = Body(...),
    registry: ConnectorRegistry = Depends(get_registry),
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
