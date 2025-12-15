"""
Integrations Router
===================
API endpoints for integration management

An Integration is a binding between a device/system and a connector.
"""

from typing import List, Optional
from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException, Query, Path, Body, Depends

from app.schemas import (
    IntegrationCreate,
    IntegrationUpdate,
    IntegrationResponse,
    IntegrationList,
    TriggerIntegrationRequest,
    TriggerIntegrationResponse,
)
from app.connectors.registry import ProviderRegistry
from app.connectors.credentials import CredentialManager
from app.connectors.base import AuthConfig, AuthType, ExecutionContext
from app.core.dependencies import get_registry, get_credential_manager

router = APIRouter(prefix="/integrations", tags=["Integrations"])

# In-memory storage for integrations (replace with database in production)
_integration_store: dict = {}

# Reference to connector store from connectors router
from app.routers.connectors import _connector_store


@router.post("", response_model=IntegrationResponse, status_code=201)
async def create_integration(
    request: IntegrationCreate = Body(...),
    registry: ProviderRegistry = Depends(get_registry),
):
    """Create a new integration binding"""
    # Validate connector exists
    conn = _connector_store.get(request.connector_id)
    if not conn:
        raise HTTPException(status_code=404, detail=f"Connector not found: {request.connector_id}")

    # Generate integration ID
    integration_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Get provider info
    meta = registry.get_metadata(conn["provider_id"])

    # Create integration record
    integration = {
        "id": integration_id,
        "name": request.name,
        "connector_id": request.connector_id,
        "device_id": request.device_id,
        "system_id": request.system_id,
        "description": request.description,
        "action_mappings": [m.model_dump() for m in request.action_mappings],
        "trigger_config": request.trigger_config,
        "is_active": True,
        "last_triggered_at": None,
        "trigger_count": 0,
        "created_at": now,
        "updated_at": now,
    }

    _integration_store[integration_id] = integration

    return IntegrationResponse(
        id=integration_id,
        name=request.name,
        connector_id=request.connector_id,
        device_id=request.device_id,
        system_id=request.system_id,
        description=request.description,
        action_mappings=request.action_mappings,
        trigger_config=request.trigger_config,
        is_active=True,
        created_at=now,
        updated_at=now,
        connector_name=conn["name"],
        provider_name=meta.name if meta else None,
    )


@router.get("", response_model=IntegrationList)
async def list_integrations(
    connector_id: Optional[str] = Query(None, description="Filter by connector"),
    device_id: Optional[str] = Query(None, description="Filter by device"),
    system_id: Optional[str] = Query(None, description="Filter by system"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    registry: ProviderRegistry = Depends(get_registry),
):
    """List all integrations"""
    integrations = []

    for integ in _integration_store.values():
        # Apply filters
        if connector_id and integ["connector_id"] != connector_id:
            continue
        if device_id and integ["device_id"] != device_id:
            continue
        if system_id and integ["system_id"] != system_id:
            continue
        if is_active is not None and integ["is_active"] != is_active:
            continue

        # Get related info
        conn = _connector_store.get(integ["connector_id"])
        meta = registry.get_metadata(conn["provider_id"]) if conn else None

        integrations.append(IntegrationResponse(
            id=integ["id"],
            name=integ["name"],
            connector_id=integ["connector_id"],
            device_id=integ["device_id"],
            system_id=integ["system_id"],
            description=integ["description"],
            action_mappings=integ["action_mappings"],
            trigger_config=integ["trigger_config"],
            is_active=integ["is_active"],
            last_triggered_at=integ["last_triggered_at"],
            trigger_count=integ["trigger_count"],
            created_at=integ["created_at"],
            updated_at=integ["updated_at"],
            connector_name=conn["name"] if conn else None,
            provider_name=meta.name if meta else None,
        ))

    return IntegrationList(items=integrations, total=len(integrations))


@router.get("/{integration_id}", response_model=IntegrationResponse)
async def get_integration(
    integration_id: str = Path(..., description="Integration ID"),
    registry: ProviderRegistry = Depends(get_registry),
):
    """Get a specific integration"""
    integ = _integration_store.get(integration_id)
    if not integ:
        raise HTTPException(status_code=404, detail=f"Integration not found: {integration_id}")

    conn = _connector_store.get(integ["connector_id"])
    meta = registry.get_metadata(conn["provider_id"]) if conn else None

    return IntegrationResponse(
        id=integ["id"],
        name=integ["name"],
        connector_id=integ["connector_id"],
        device_id=integ["device_id"],
        system_id=integ["system_id"],
        description=integ["description"],
        action_mappings=integ["action_mappings"],
        trigger_config=integ["trigger_config"],
        is_active=integ["is_active"],
        last_triggered_at=integ["last_triggered_at"],
        trigger_count=integ["trigger_count"],
        created_at=integ["created_at"],
        updated_at=integ["updated_at"],
        connector_name=conn["name"] if conn else None,
        provider_name=meta.name if meta else None,
    )


@router.patch("/{integration_id}", response_model=IntegrationResponse)
async def update_integration(
    integration_id: str = Path(..., description="Integration ID"),
    request: IntegrationUpdate = Body(...),
    registry: ProviderRegistry = Depends(get_registry),
):
    """Update an integration"""
    integ = _integration_store.get(integration_id)
    if not integ:
        raise HTTPException(status_code=404, detail=f"Integration not found: {integration_id}")

    # Update fields
    if request.name is not None:
        integ["name"] = request.name
    if request.description is not None:
        integ["description"] = request.description
    if request.is_active is not None:
        integ["is_active"] = request.is_active
    if request.action_mappings is not None:
        integ["action_mappings"] = [m.model_dump() for m in request.action_mappings]
    if request.trigger_config is not None:
        integ["trigger_config"] = request.trigger_config

    integ["updated_at"] = datetime.utcnow()

    conn = _connector_store.get(integ["connector_id"])
    meta = registry.get_metadata(conn["provider_id"]) if conn else None

    return IntegrationResponse(
        id=integ["id"],
        name=integ["name"],
        connector_id=integ["connector_id"],
        device_id=integ["device_id"],
        system_id=integ["system_id"],
        description=integ["description"],
        action_mappings=integ["action_mappings"],
        trigger_config=integ["trigger_config"],
        is_active=integ["is_active"],
        last_triggered_at=integ["last_triggered_at"],
        trigger_count=integ["trigger_count"],
        created_at=integ["created_at"],
        updated_at=integ["updated_at"],
        connector_name=conn["name"] if conn else None,
        provider_name=meta.name if meta else None,
    )


@router.delete("/{integration_id}", status_code=204)
async def delete_integration(
    integration_id: str = Path(..., description="Integration ID"),
):
    """Delete an integration"""
    if integration_id not in _integration_store:
        raise HTTPException(status_code=404, detail=f"Integration not found: {integration_id}")

    del _integration_store[integration_id]


@router.post("/{integration_id}/trigger", response_model=TriggerIntegrationResponse)
async def trigger_integration(
    integration_id: str = Path(..., description="Integration ID"),
    request: TriggerIntegrationRequest = Body(...),
    registry: ProviderRegistry = Depends(get_registry),
    cred_manager: CredentialManager = Depends(get_credential_manager),
):
    """Manually trigger an integration with event data"""
    integ = _integration_store.get(integration_id)
    if not integ:
        raise HTTPException(status_code=404, detail=f"Integration not found: {integration_id}")

    if not integ["is_active"]:
        raise HTTPException(status_code=400, detail="Integration is not active")

    conn = _connector_store.get(integ["connector_id"])
    if not conn:
        raise HTTPException(status_code=500, detail="Connector not found")

    if not conn["is_active"]:
        raise HTTPException(status_code=400, detail="Connector is not active")

    meta = registry.get_metadata(conn["provider_id"])
    if not meta:
        raise HTTPException(status_code=500, detail="Provider not found")

    # Get credentials
    credentials = {}
    if conn["credential_id"]:
        credentials = cred_manager.retrieve(conn["credential_id"]) or {}

    auth_config = AuthConfig(
        auth_type=AuthType(meta.auth_schema.auth_type),
        credentials=credentials,
    )

    provider = registry.create_instance(conn["provider_id"], auth_config)
    if not provider:
        raise HTTPException(status_code=500, detail="Failed to create provider instance")

    # Find matching action mappings
    matching_mappings = [
        m for m in integ["action_mappings"]
        if m.get("event_type") == request.event_type and m.get("enabled", True)
    ]

    if not matching_mappings:
        return TriggerIntegrationResponse(
            success=True,
            message=f"No action mappings found for event type: {request.event_type}",
            results=[],
        )

    # Execute actions
    results = []
    execution_id = str(uuid.uuid4())

    for mapping in matching_mappings:
        action_id = mapping.get("action_id")
        input_mapping = mapping.get("input_mapping", {})

        # Map event data to action inputs
        inputs = {}
        for key, value in input_mapping.items():
            if isinstance(value, str) and value.startswith("{{") and value.endswith("}}"):
                # Simple template substitution
                field = value[2:-2].strip()
                inputs[key] = request.event_data.get(field)
            else:
                inputs[key] = value

        # Execute action
        context = ExecutionContext(
            workflow_id=integration_id,
            workflow_run_id=execution_id,
            step_id=action_id,
        )

        result = await provider.execute_action(action_id, inputs, context)
        results.append({
            "action_id": action_id,
            "success": result.success,
            "data": result.data,
            "error_message": result.error_message,
        })

    # Update integration stats
    integ["last_triggered_at"] = datetime.utcnow()
    integ["trigger_count"] += 1
    integ["updated_at"] = datetime.utcnow()

    all_success = all(r["success"] for r in results)

    return TriggerIntegrationResponse(
        success=all_success,
        message="All actions executed successfully" if all_success else "Some actions failed",
        execution_id=execution_id,
        results=results,
    )
