"""
Execution Schemas
=================
Pydantic models for action execution API operations
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel


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
