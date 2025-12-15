"""
Providers Router
================
API endpoints for provider catalog (templates)

A Provider is a template/definition of an external service.
"""

from typing import List, Optional
from pathlib import Path as FilePath

from fastapi import APIRouter, HTTPException, Query, Path, Body, Depends
from pydantic import BaseModel
import yaml

from app.schemas import ProviderInfo, ProviderDetail, TestConnectionRequest, TestConnectionResponse
from app.connectors.registry import ProviderRegistry
from app.connectors.schema import SchemaRegistry
from app.connectors.base import AuthConfig, AuthType
from app.core.dependencies import get_registry, get_schema_registry
from app.core.config import settings

router = APIRouter(prefix="/providers", tags=["Providers"])


class CreateProviderRequest(BaseModel):
    """Request to create a provider from YAML manifest"""
    manifest_yaml: str


class CreateProviderResponse(BaseModel):
    """Response for provider creation"""
    id: str
    name: str
    message: str


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
            protocol=meta.protocol if hasattr(meta, 'protocol') else "rest",
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
        protocol=meta.protocol if hasattr(meta, 'protocol') else "rest",
        auth_type=meta.auth_schema.auth_type,
        supports_webhooks=meta.supports_webhooks,
        actions=actions,
        triggers=triggers,
        auth_schema=auth_schema,
        documentation_url=meta.documentation_url,
        base_url=meta.base_url,
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


@router.post("", response_model=CreateProviderResponse)
async def create_provider(
    request: CreateProviderRequest = Body(...),
    registry: ProviderRegistry = Depends(get_registry),
):
    """
    Create a new provider from a YAML manifest.

    The manifest will be:
    1. Parsed and validated
    2. Registered in the provider registry
    3. Saved to disk in the providers directory
    """
    try:
        # Parse YAML
        manifest = yaml.safe_load(request.manifest_yaml)
    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {str(e)}")

    # Validate required fields
    if not manifest.get("id"):
        raise HTTPException(status_code=400, detail="Manifest must have an 'id' field")
    if not manifest.get("name"):
        raise HTTPException(status_code=400, detail="Manifest must have a 'name' field")

    provider_id = manifest["id"]
    provider_name = manifest["name"]

    # Check if provider already exists
    existing = registry.get_metadata(provider_id)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Provider '{provider_id}' already exists. Use PUT to update."
        )

    try:
        # Register the manifest
        registry.register_manifest(manifest)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to register provider: {str(e)}")

    # Save to disk
    try:
        providers_dir = FilePath(settings.PROVIDERS_DIR)
        if not providers_dir.is_absolute():
            # Make relative to project root
            providers_dir = FilePath(__file__).parent.parent.parent / settings.PROVIDERS_DIR

        providers_dir.mkdir(parents=True, exist_ok=True)
        manifest_path = providers_dir / f"{provider_id}.yaml"

        with open(manifest_path, "w") as f:
            f.write(request.manifest_yaml)
    except Exception as e:
        # Log but don't fail - provider is registered in memory
        import logging
        logging.warning(f"Failed to save provider manifest to disk: {e}")

    return CreateProviderResponse(
        id=provider_id,
        name=provider_name,
        message=f"Provider '{provider_name}' created successfully",
    )


@router.put("/{provider_id}", response_model=CreateProviderResponse)
async def update_provider(
    provider_id: str = Path(..., description="Provider ID to update"),
    request: CreateProviderRequest = Body(...),
    registry: ProviderRegistry = Depends(get_registry),
):
    """
    Update an existing provider's manifest.
    """
    try:
        manifest = yaml.safe_load(request.manifest_yaml)
    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {str(e)}")

    # Ensure ID matches
    if manifest.get("id") != provider_id:
        raise HTTPException(
            status_code=400,
            detail=f"Manifest ID '{manifest.get('id')}' doesn't match URL ID '{provider_id}'"
        )

    provider_name = manifest.get("name", provider_id)

    try:
        # Re-register (will overwrite)
        registry.register_manifest(manifest)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update provider: {str(e)}")

    # Save to disk
    try:
        providers_dir = FilePath(settings.PROVIDERS_DIR)
        if not providers_dir.is_absolute():
            providers_dir = FilePath(__file__).parent.parent.parent / settings.PROVIDERS_DIR

        manifest_path = providers_dir / f"{provider_id}.yaml"
        with open(manifest_path, "w") as f:
            f.write(request.manifest_yaml)
    except Exception as e:
        import logging
        logging.warning(f"Failed to save provider manifest to disk: {e}")

    return CreateProviderResponse(
        id=provider_id,
        name=provider_name,
        message=f"Provider '{provider_name}' updated successfully",
    )


@router.delete("/{provider_id}")
async def delete_provider(
    provider_id: str = Path(..., description="Provider ID to delete"),
    registry: ProviderRegistry = Depends(get_registry),
):
    """
    Delete a provider from the catalog.

    Note: Only deletes custom providers (manifest-based). Built-in providers cannot be deleted.
    """
    meta = registry.get_metadata(provider_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Provider not found: {provider_id}")

    # Try to unregister
    try:
        registry.unregister(provider_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to unregister provider: {str(e)}")

    # Try to delete from disk
    try:
        providers_dir = FilePath(settings.PROVIDERS_DIR)
        if not providers_dir.is_absolute():
            providers_dir = FilePath(__file__).parent.parent.parent / settings.PROVIDERS_DIR

        manifest_path = providers_dir / f"{provider_id}.yaml"
        if manifest_path.exists():
            manifest_path.unlink()
    except Exception as e:
        import logging
        logging.warning(f"Failed to delete provider manifest from disk: {e}")

    return {"message": f"Provider '{provider_id}' deleted successfully"}
