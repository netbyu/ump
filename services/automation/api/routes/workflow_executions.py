"""
Workflow Execution API Routes
Integrates with Temporal for workflow orchestration
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Any
from datetime import datetime
import asyncpg

from ..temporal_client import TemporalClientManager

router = APIRouter(prefix="/workflows/executions", tags=["workflow-executions"])


# ============================================================================
# Request/Response Models
# ============================================================================

class StartWorkflowRequest(BaseModel):
    """Request to start a workflow"""
    workflow_id: str  # e.g., "customer_onboarding"
    workflow_data: dict
    execution_name: Optional[str] = None


class ApproveStepRequest(BaseModel):
    """Request to approve a step"""
    edited_data: Optional[dict] = None
    notes: Optional[str] = None


class RejectStepRequest(BaseModel):
    """Request to reject a step"""
    reason: str


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/start")
async def start_workflow_execution(request: StartWorkflowRequest):
    """
    Start a new workflow execution
    Creates Temporal workflow instance
    """
    try:
        # Generate execution ID
        execution_id = request.execution_name or f"{request.workflow_id}-{int(datetime.now().timestamp())}"

        # Start Temporal workflow
        handle = await TemporalClientManager.start_workflow(
            workflow_class=f"{request.workflow_id}_workflow",
            workflow_id=execution_id,
            args=[request.workflow_data],
            task_queue="automation-workflows"
        )

        # Log to database
        # await log_workflow_execution_started(execution_id, request.workflow_id)

        return {
            "execution_id": execution_id,
            "workflow_id": request.workflow_id,
            "status": "started",
            "message": "Workflow execution started successfully"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start workflow: {str(e)}"
        )


@router.get("/{execution_id}")
async def get_execution_status(execution_id: str):
    """
    Get current execution status
    Queries Temporal workflow for real-time state
    """
    try:
        # Query Temporal workflow
        status = await TemporalClientManager.query_workflow(
            workflow_id=execution_id,
            query_name="get_execution_status"
        )

        # Enrich with step deployment configs from PostgreSQL
        # (Adds deployment_mode, impact_level to each step)
        # enriched_status = await enrich_with_step_configs(status)

        return status

    except Exception as e:
        raise HTTPException(
            status_code=404,
            detail=f"Workflow execution not found: {str(e)}"
        )


@router.post("/{execution_id}/steps/{step_id}/approve")
async def approve_step(
    execution_id: str,
    step_id: str,
    request: ApproveStepRequest,
    user_id: str = "current_user"  # TODO: Get from auth
):
    """
    Approve a step
    Sends approval signal to Temporal workflow
    Workflow immediately continues execution
    """
    try:
        # Send approval signal to Temporal
        await TemporalClientManager.signal_workflow(
            workflow_id=execution_id,
            signal_name="approve_step",
            {
                'step_id': step_id,
                'user_id': user_id,
                'action': 'approved',
                'edited_data': request.edited_data,
                'notes': request.notes
            }
        )

        # Log approval in database
        # await log_step_approval(execution_id, step_id, user_id, 'approved', request.notes)

        return {
            "message": "Step approved successfully",
            "step_id": step_id,
            "execution_id": execution_id
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to approve step: {str(e)}"
        )


@router.post("/{execution_id}/steps/{step_id}/reject")
async def reject_step(
    execution_id: str,
    step_id: str,
    request: RejectStepRequest,
    user_id: str = "current_user"  # TODO: Get from auth
):
    """
    Reject a step
    Sends rejection signal to Temporal workflow
    Workflow will handle rejection (usually fails execution)
    """
    try:
        # Send rejection signal to Temporal
        await TemporalClientManager.signal_workflow(
            workflow_id=execution_id,
            signal_name="approve_step",
            {
                'step_id': step_id,
                'user_id': user_id,
                'action': 'rejected',
                'notes': request.reason
            }
        )

        # Log rejection in database
        # await log_step_approval(execution_id, step_id, user_id, 'rejected', request.reason)

        return {
            "message": "Step rejected",
            "step_id": step_id,
            "execution_id": execution_id,
            "reason": request.reason
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reject step: {str(e)}"
        )


@router.post("/{execution_id}/cancel")
async def cancel_execution(execution_id: str):
    """Cancel a running workflow execution"""
    try:
        await TemporalClientManager.cancel_workflow(execution_id)

        return {"message": "Workflow execution cancelled"}

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cancel execution: {str(e)}"
        )


@router.get("/{execution_id}/result")
async def get_execution_result(execution_id: str):
    """
    Get workflow execution result
    Waits for workflow to complete if still running
    """
    try:
        result = await TemporalClientManager.get_workflow_result(execution_id)

        return {
            "execution_id": execution_id,
            "status": "completed",
            "result": result
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get workflow result: {str(e)}"
        )
