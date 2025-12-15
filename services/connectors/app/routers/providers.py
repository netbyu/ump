"""
Providers Router
================
API endpoints for provider catalog (templates)

A Provider is a template/definition of an external service.
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Path, Body, Depends

from app.schemas import ProviderInfo, ProviderDetail, TestConnectionRequest, TestConnectionResponse
from app.connectors.registry import ProviderRegistry
from app.connectors.schema import SchemaRegistry
from app.connectors.base import AuthConfig, AuthType
from app.core.dependencies import get_registry, get_schema_registry

router = APIRouter(prefix="/providers", tags=["Providers"])


@router.get("", response_model=List[ProviderInfo])
async def list_providers(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search query"),
    registry: ProviderRegistry = Depends(get_registry),
):
    """List all available providers in the catalog"""
    if search or category:
        results = registry.search(
            query=search or "",
            categories=[category] if category else None,
        )
    else:
        results = registry.get_all_metadata()

    providers = []
    for meta in results:
        providers.append(ProviderInfo(
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

    return providers


@router.get("/categories")
async def list_categories(
    registry: ProviderRegistry = Depends(get_registry),
):
    """List all provider categories"""
    categories = set()
    for meta in registry.get_all_metadata():
        categories.update(meta.categories)
    return sorted(list(categories))


@router.get("/{provider_id}", response_model=ProviderDetail)
async def get_provider(
    provider_id: str = Path(..., description="Provider ID"),
    registry: ProviderRegistry = Depends(get_registry),
    schema_registry: SchemaRegistry = Depends(get_schema_registry),
):
    """Get detailed information about a provider"""
    meta = registry.get_metadata(provider_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Provider not found: {provider_id}")

    # Create instance to get actions/triggers
    provider = registry.create_instance(provider_id)

    actions = []
    if provider:
        for action in provider.get_actions():
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
    if provider:
        for trigger in provider.get_triggers():
            triggers.append({
                "id": trigger.id,
                "name": trigger.name,
                "description": trigger.description,
                "trigger_type": trigger.trigger_type,
                "outputs": [f.model_dump() for f in trigger.outputs],
                "config_fields": [f.model_dump() for f in trigger.config_fields],
            })

    auth_schema = schema_registry.get_auth_schema(provider_id) or {}

    return ProviderDetail(
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


@router.get("/{provider_id}/schema")
async def get_provider_schemas(
    provider_id: str = Path(..., description="Provider ID"),
    schema_registry: SchemaRegistry = Depends(get_schema_registry),
):
    """Get all schemas (auth, actions, triggers) for a provider"""
    schemas = schema_registry.get_connector_schemas(provider_id)
    if not schemas:
        raise HTTPException(status_code=404, detail=f"Provider not found: {provider_id}")
    return schemas


@router.get("/{provider_id}/actions/{action_id}/schema")
async def get_action_schema(
    provider_id: str = Path(..., description="Provider ID"),
    action_id: str = Path(..., description="Action ID"),
    schema_registry: SchemaRegistry = Depends(get_schema_registry),
):
    """Get JSON schema for a specific action"""
    schema = schema_registry.get_action_schema(provider_id, action_id)
    if not schema:
        raise HTTPException(status_code=404, detail=f"Action not found: {provider_id}/{action_id}")
    return schema


@router.post("/{provider_id}/test", response_model=TestConnectionResponse)
async def test_provider_credentials(
    provider_id: str = Path(..., description="Provider ID"),
    request: TestConnectionRequest = Body(...),
    registry: ProviderRegistry = Depends(get_registry),
):
    """Test credentials against a provider without storing them"""
    meta = registry.get_metadata(provider_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Provider not found: {provider_id}")

    auth_config = AuthConfig(
        auth_type=AuthType(meta.auth_schema.auth_type),
        credentials=request.credentials,
    )

    provider = registry.create_instance(provider_id, auth_config)
    if not provider:
        raise HTTPException(status_code=500, detail="Failed to create provider instance")

    result = await provider.test_connection()

    return TestConnectionResponse(
        success=result.success,
        message=result.data.get("message", "Test completed") if result.success else result.error_message or "Test failed",
        details=result.data,
    )
