"""
Credentials Router
==================
API endpoints for credential management
"""

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Path, Depends

from app.schemas import CredentialCreate, CredentialResponse, TestConnectionResponse
from app.connectors.registry import ConnectorRegistry
from app.connectors.credentials import CredentialManager
from app.core.dependencies import get_registry, get_credential_manager

router = APIRouter(prefix="/credentials", tags=["Credentials"])


@router.post("", response_model=CredentialResponse)
async def create_credentials(
    request: CredentialCreate,
    registry: ConnectorRegistry = Depends(get_registry),
    cred_manager: CredentialManager = Depends(get_credential_manager),
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


@router.get("", response_model=List[CredentialResponse])
async def list_credentials(
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    connector_id: Optional[str] = Query(None, description="Filter by connector ID"),
    tenant_id: Optional[str] = Query(None, description="Filter by tenant ID"),
    registry: ConnectorRegistry = Depends(get_registry),
    cred_manager: CredentialManager = Depends(get_credential_manager),
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


@router.delete("/{credential_id}")
async def delete_credentials(
    credential_id: str = Path(..., description="Credential ID"),
    cred_manager: CredentialManager = Depends(get_credential_manager),
):
    """Delete stored credentials"""
    success = await cred_manager.delete_credentials(credential_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Credentials not found: {credential_id}")
    return {"success": True, "message": "Credentials deleted"}


@router.post("/{credential_id}/test", response_model=TestConnectionResponse)
async def test_stored_credentials(
    credential_id: str = Path(..., description="Credential ID"),
    registry: ConnectorRegistry = Depends(get_registry),
    cred_manager: CredentialManager = Depends(get_credential_manager),
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
