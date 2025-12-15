"""
Connector Schemas
=================
Pydantic models for connector instance API operations

A Connector is a configured instance of a provider with stored credentials.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ConnectorCreate(BaseModel):
    """Request to create a new connector instance"""
    name: str = Field(..., description="User-defined name for this connector")
    provider_id: str = Field(..., description="ID of the provider to use")
    description: str = ""
    credentials: Dict[str, Any] = Field(default={}, description="Credentials for authentication")
    config: Dict[str, Any] = Field(default={}, description="Additional configuration")


class ConnectorUpdate(BaseModel):
    """Request to update a connector instance"""
    name: Optional[str] = None
    description: Optional[str] = None
    credentials: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class ConnectorResponse(BaseModel):
    """Connector instance response"""
    id: str
    name: str
    provider_id: str
    description: str = ""
    is_active: bool = True
    is_verified: bool = False
    last_verified_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Provider info (denormalized for convenience)
    provider_name: Optional[str] = None
    provider_icon_url: Optional[str] = None


class ConnectorList(BaseModel):
    """List of connector instances"""
    items: List[ConnectorResponse]
    total: int


class TestConnectionRequest(BaseModel):
    """Request to test a connection"""
    credentials: Dict[str, Any] = Field(..., description="Credentials to test")


class TestConnectionResponse(BaseModel):
    """Response from connection test"""
    success: bool
    message: str
    details: Dict[str, Any] = {}
