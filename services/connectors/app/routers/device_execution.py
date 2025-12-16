"""
Device Integration Execution Router
====================================
API endpoints for executing actions via device integrations.

This router allows executing provider actions through a device's integration,
automatically using the device's configured credentials and connection settings.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, HTTPException, Path, Body, Depends
from pydantic import BaseModel

from app.connectors.registry import ProviderRegistry
from app.connectors.base import AuthConfig, AuthType, ExecutionContext
from app.core.dependencies import get_registry

router = APIRouter(prefix="/device-integrations", tags=["Device Integration Execution"])


class ExecuteRequest(BaseModel):
    """Request to execute an action"""
    inputs: Dict[str, Any] = {}
    context: Optional[Dict[str, Any]] = None


class ExecuteResponse(BaseModel):
    """Response from action execution"""
    success: bool
    data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    execution_time_ms: Optional[int] = None


# In-memory mock for device integrations (in production, this would come from the main API database)
# This is a simplified version - the real implementation would query the devices database
MOCK_INTEGRATIONS = {
    1: {
        "id": 1,
        "device_id": 1,
        "provider_id": "zabbix",
        "host": "192.168.1.50",
        "port": 443,
        "credentials": {
            "username": "Admin",
            "password": "zabbix",
            "api_url": "https://192.168.1.50/api_jsonrpc.php",
        },
    },
    2: {
        "id": 2,
        "device_id": 1,
        "provider_id": "portainer",
        "host": "192.168.1.50",
        "port": 9443,
        "credentials": {
            "api_key": "ptr_xxxxx",
            "base_url": "https://192.168.1.50:9443",
        },
    },
}


async def get_integration_config(integration_id: int) -> Optional[Dict[str, Any]]:
    """
    Get integration configuration including credentials.

    In production, this would:
    1. Query the devices.device_integrations table
    2. Decrypt credentials
    3. Return the full configuration
    """
    # For now, return mock data or try to fetch from main API
    import os
    import httpx

    main_api_url = os.getenv("MAIN_API_URL", "http://localhost:8001")

    try:
        async with httpx.AsyncClient() as client:
            # Try to get integration from main API
            response = await client.get(
                f"{main_api_url}/api/device-integrations/{integration_id}",
                timeout=5.0
            )
            if response.status_code == 200:
                return response.json()
    except Exception:
        pass

    # Fall back to mock data
    return MOCK_INTEGRATIONS.get(integration_id)


@router.post(
    "/{integration_id}/actions/{action_id}/execute",
    response_model=ExecuteResponse,
)
async def execute_integration_action(
    integration_id: int = Path(..., description="Device Integration ID"),
    action_id: str = Path(..., description="Action ID to execute"),
    request: ExecuteRequest = Body(...),
    registry: ProviderRegistry = Depends(get_registry),
):
    """
    Execute an action through a device integration.

    This endpoint:
    1. Looks up the device integration configuration
    2. Creates a provider instance with the integration's credentials
    3. Executes the specified action
    4. Returns the result

    This is like Swagger's "Try it out" but for your configured integrations.
    """
    # Get integration configuration
    integration = await get_integration_config(integration_id)
    if not integration:
        raise HTTPException(
            status_code=404,
            detail=f"Integration not found: {integration_id}"
        )

    provider_id = integration.get("provider_id")
    if not provider_id:
        raise HTTPException(
            status_code=400,
            detail="Integration has no provider configured"
        )

    # Get provider metadata
    meta = registry.get_metadata(provider_id)
    if not meta:
        raise HTTPException(
            status_code=404,
            detail=f"Provider not found: {provider_id}"
        )

    # Build auth config from integration credentials
    credentials = integration.get("credentials", {})

    # Add host/port from integration if not in credentials
    if "host" not in credentials and integration.get("host"):
        credentials["host"] = integration["host"]
    if "port" not in credentials and integration.get("port"):
        credentials["port"] = integration["port"]
    if "base_url" not in credentials:
        host = integration.get("host_override") or integration.get("host", "localhost")
        port = integration.get("port")
        protocol = "https" if port in [443, 9443, 8443] else "http"
        credentials["base_url"] = f"{protocol}://{host}:{port}" if port else f"{protocol}://{host}"

    auth_config = AuthConfig(
        auth_type=AuthType(meta.auth_schema.auth_type),
        credentials=credentials,
    )

    # Create provider instance
    provider = registry.create_instance(provider_id, auth_config)
    if not provider:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create provider instance: {provider_id}"
        )

    # Check if action exists
    actions = provider.get_actions()
    action = next((a for a in actions if a.id == action_id), None)
    if not action:
        raise HTTPException(
            status_code=404,
            detail=f"Action not found: {action_id}"
        )

    # Build execution context
    context = ExecutionContext(
        workflow_id=request.context.get("workflow_id") if request.context else None,
        step_id=request.context.get("step_id") if request.context else None,
        user_id=request.context.get("user_id") if request.context else None,
        tenant_id=request.context.get("tenant_id") if request.context else None,
    )

    # Validate inputs
    try:
        provider.validate_inputs(action_id, request.inputs)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Input validation failed: {str(e)}")

    # Execute the action
    try:
        result = await provider.execute_action(action_id, request.inputs, context)

        return ExecuteResponse(
            success=result.success,
            data=result.data,
            error_message=result.error_message,
            error_code=result.error_code,
            execution_time_ms=result.execution_time_ms,
        )
    except Exception as e:
        return ExecuteResponse(
            success=False,
            error_message=str(e),
            error_code="EXECUTION_ERROR",
        )


@router.get("/{integration_id}/actions")
async def list_integration_actions(
    integration_id: int = Path(..., description="Device Integration ID"),
    registry: ProviderRegistry = Depends(get_registry),
):
    """
    List all available actions for a device integration's provider.
    """
    integration = await get_integration_config(integration_id)
    if not integration:
        raise HTTPException(
            status_code=404,
            detail=f"Integration not found: {integration_id}"
        )

    provider_id = integration.get("provider_id")
    if not provider_id:
        raise HTTPException(
            status_code=400,
            detail="Integration has no provider configured"
        )

    # Create provider instance to get actions
    provider = registry.create_instance(provider_id)
    if not provider:
        raise HTTPException(
            status_code=404,
            detail=f"Provider not found: {provider_id}"
        )

    actions = []
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

    return {
        "integration_id": integration_id,
        "provider_id": provider_id,
        "actions": actions,
    }


@router.post("/{integration_id}/test")
async def test_integration_connection(
    integration_id: int = Path(..., description="Device Integration ID"),
    registry: ProviderRegistry = Depends(get_registry),
):
    """
    Test the connection for a device integration.
    """
    integration = await get_integration_config(integration_id)
    if not integration:
        raise HTTPException(
            status_code=404,
            detail=f"Integration not found: {integration_id}"
        )

    provider_id = integration.get("provider_id")
    if not provider_id:
        raise HTTPException(
            status_code=400,
            detail="Integration has no provider configured"
        )

    # Get provider metadata
    meta = registry.get_metadata(provider_id)
    if not meta:
        raise HTTPException(
            status_code=404,
            detail=f"Provider not found: {provider_id}"
        )

    # Build auth config
    credentials = integration.get("credentials", {})
    if "host" not in credentials and integration.get("host"):
        credentials["host"] = integration["host"]
    if "port" not in credentials and integration.get("port"):
        credentials["port"] = integration["port"]

    auth_config = AuthConfig(
        auth_type=AuthType(meta.auth_schema.auth_type),
        credentials=credentials,
    )

    # Create provider instance
    provider = registry.create_instance(provider_id, auth_config)
    if not provider:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create provider instance: {provider_id}"
        )

    # Test connection
    result = await provider.test_connection()

    return {
        "success": result.success,
        "message": result.data.get("message", "Test completed") if result.success else result.error_message,
        "details": result.data,
    }
