"""
Execution Router
================
API endpoints for action execution
"""

from fastapi import APIRouter, HTTPException, Path, Body, Depends

from app.schemas import ExecuteActionRequest, ExecuteActionResponse
from app.connectors.registry import ConnectorRegistry
from app.connectors.credentials import CredentialManager
from app.connectors.base import ExecutionContext
from app.core.dependencies import get_registry, get_credential_manager

router = APIRouter(prefix="/connectors", tags=["Execution"])


@router.post(
    "/{connector_id}/actions/{action_id}/execute",
    response_model=ExecuteActionResponse,
)
async def execute_action(
    connector_id: str = Path(..., description="Connector ID"),
    action_id: str = Path(..., description="Action ID"),
    request: ExecuteActionRequest = Body(...),
    registry: ConnectorRegistry = Depends(get_registry),
    cred_manager: CredentialManager = Depends(get_credential_manager),
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
