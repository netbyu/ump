"""
Connectors Router
=================
API endpoints for connector instance management

A Connector is a configured instance of a provider with stored credentials.
"""

from typing import List, Optional
from datetime import datetime
import uuid

from fastapi import APIRouter, HTTPException, Query, Path, Body, Depends

from app.schemas import (
    ConnectorCreate,
    ConnectorUpdate,
    ConnectorResponse,
    ConnectorList,
    TestConnectionResponse,
)
from app.connectors.registry import ProviderRegistry
from app.connectors.credentials import CredentialManager
from app.connectors.base import AuthConfig, AuthType
from app.core.dependencies import get_registry, get_credential_manager

router = APIRouter(prefix="/connectors", tags=["Connectors"])

# In-memory storage for connector instances (replace with database in production)
_connector_store: dict = {}


@router.post("", response_model=ConnectorResponse, status_code=201)
async def create_connector(
    request: ConnectorCreate = Body(...),
    registry: ProviderRegistry = Depends(get_registry),
    cred_manager: CredentialManager = Depends(get_credential_manager),
):
    """Create a new connector instance from a provider"""
    # Validate provider exists
    meta = registry.get_metadata(request.provider_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Provider not found: {request.provider_id}")

    # Generate connector ID
    connector_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Store credentials if provided
    credential_id = None
    if request.credentials:
        credential_id = cred_manager.store(
            connector_id=connector_id,
            credentials=request.credentials,
            credential_type=meta.auth_schema.auth_type,
        )

    # Create connector record
    connector = {
        "id": connector_id,
        "name": request.name,
        "provider_id": request.provider_id,
        "description": request.description,
        "credential_id": credential_id,
        "config": request.config,
        "is_active": True,
        "is_verified": False,
        "last_verified_at": None,
        "created_at": now,
        "updated_at": now,
    }

    _connector_store[connector_id] = connector

    return ConnectorResponse(
        id=connector_id,
        name=request.name,
        provider_id=request.provider_id,
        description=request.description,
        is_active=True,
        is_verified=False,
        created_at=now,
        updated_at=now,
        provider_name=meta.name,
        provider_icon_url=meta.icon_url,
    )


@router.get("", response_model=ConnectorList)
async def list_connectors(
    provider_id: Optional[str] = Query(None, description="Filter by provider"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name"),
    registry: ProviderRegistry = Depends(get_registry),
):
    """List all connector instances"""
    connectors = []

    for conn in _connector_store.values():
        # Apply filters
        if provider_id and conn["provider_id"] != provider_id:
            continue
        if is_active is not None and conn["is_active"] != is_active:
            continue
        if search and search.lower() not in conn["name"].lower():
            continue

        meta = registry.get_metadata(conn["provider_id"])

        connectors.append(ConnectorResponse(
            id=conn["id"],
            name=conn["name"],
            provider_id=conn["provider_id"],
            description=conn["description"],
            is_active=conn["is_active"],
            is_verified=conn["is_verified"],
            last_verified_at=conn["last_verified_at"],
            created_at=conn["created_at"],
            updated_at=conn["updated_at"],
            provider_name=meta.name if meta else None,
            provider_icon_url=meta.icon_url if meta else None,
        ))

    return ConnectorList(items=connectors, total=len(connectors))


@router.get("/{connector_id}", response_model=ConnectorResponse)
async def get_connector(
    connector_id: str = Path(..., description="Connector ID"),
    registry: ProviderRegistry = Depends(get_registry),
):
    """Get a specific connector instance"""
    conn = _connector_store.get(connector_id)
    if not conn:
        raise HTTPException(status_code=404, detail=f"Connector not found: {connector_id}")

    meta = registry.get_metadata(conn["provider_id"])

    return ConnectorResponse(
        id=conn["id"],
        name=conn["name"],
        provider_id=conn["provider_id"],
        description=conn["description"],
        is_active=conn["is_active"],
        is_verified=conn["is_verified"],
        last_verified_at=conn["last_verified_at"],
        created_at=conn["created_at"],
        updated_at=conn["updated_at"],
        provider_name=meta.name if meta else None,
        provider_icon_url=meta.icon_url if meta else None,
    )


@router.patch("/{connector_id}", response_model=ConnectorResponse)
async def update_connector(
    connector_id: str = Path(..., description="Connector ID"),
    request: ConnectorUpdate = Body(...),
    registry: ProviderRegistry = Depends(get_registry),
    cred_manager: CredentialManager = Depends(get_credential_manager),
):
    """Update a connector instance"""
    conn = _connector_store.get(connector_id)
    if not conn:
        raise HTTPException(status_code=404, detail=f"Connector not found: {connector_id}")

    # Update fields
    if request.name is not None:
        conn["name"] = request.name
    if request.description is not None:
        conn["description"] = request.description
    if request.is_active is not None:
        conn["is_active"] = request.is_active
    if request.config is not None:
        conn["config"] = request.config

    # Update credentials if provided
    if request.credentials is not None:
        meta = registry.get_metadata(conn["provider_id"])
        if conn["credential_id"]:
            cred_manager.delete(conn["credential_id"])
        conn["credential_id"] = cred_manager.store(
            connector_id=connector_id,
            credentials=request.credentials,
            credential_type=meta.auth_schema.auth_type if meta else "api_key",
        )
        conn["is_verified"] = False

    conn["updated_at"] = datetime.utcnow()

    meta = registry.get_metadata(conn["provider_id"])

    return ConnectorResponse(
        id=conn["id"],
        name=conn["name"],
        provider_id=conn["provider_id"],
        description=conn["description"],
        is_active=conn["is_active"],
        is_verified=conn["is_verified"],
        last_verified_at=conn["last_verified_at"],
        created_at=conn["created_at"],
        updated_at=conn["updated_at"],
        provider_name=meta.name if meta else None,
        provider_icon_url=meta.icon_url if meta else None,
    )


@router.delete("/{connector_id}", status_code=204)
async def delete_connector(
    connector_id: str = Path(..., description="Connector ID"),
    cred_manager: CredentialManager = Depends(get_credential_manager),
):
    """Delete a connector instance"""
    conn = _connector_store.get(connector_id)
    if not conn:
        raise HTTPException(status_code=404, detail=f"Connector not found: {connector_id}")

    # Delete credentials
    if conn["credential_id"]:
        cred_manager.delete(conn["credential_id"])

    del _connector_store[connector_id]


@router.post("/{connector_id}/test", response_model=TestConnectionResponse)
async def test_connector(
    connector_id: str = Path(..., description="Connector ID"),
    registry: ProviderRegistry = Depends(get_registry),
    cred_manager: CredentialManager = Depends(get_credential_manager),
):
    """Test a connector's connection"""
    conn = _connector_store.get(connector_id)
    if not conn:
        raise HTTPException(status_code=404, detail=f"Connector not found: {connector_id}")

    meta = registry.get_metadata(conn["provider_id"])
    if not meta:
        raise HTTPException(status_code=500, detail=f"Provider not found: {conn['provider_id']}")

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

    result = await provider.test_connection()

    # Update verified status
    if result.success:
        conn["is_verified"] = True
        conn["last_verified_at"] = datetime.utcnow()
        conn["updated_at"] = datetime.utcnow()

    return TestConnectionResponse(
        success=result.success,
        message=result.data.get("message", "Test completed") if result.success else result.error_message or "Test failed",
        details=result.data,
    )
