"""
Integration Schemas
===================
Pydantic models for integration API operations

An Integration is a binding between a device/system and a connector.
"""

from typing import Any, Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ActionMapping(BaseModel):
    """Maps a device event to a connector action"""
    event_type: str = Field(..., description="Device event type to trigger on")
    action_id: str = Field(..., description="Connector action to execute")
    input_mapping: Dict[str, Any] = Field(default={}, description="Map event data to action inputs")
    conditions: List[Dict[str, Any]] = Field(default=[], description="Conditions for execution")
    enabled: bool = True


class IntegrationCreate(BaseModel):
    """Request to create a new integration"""
    name: str = Field(..., description="User-defined name for this integration")
    connector_id: str = Field(..., description="ID of the connector instance to use")
    device_id: Optional[str] = Field(None, description="ID of the device to integrate")
    system_id: Optional[str] = Field(None, description="ID of the system to integrate")
    description: str = ""
    action_mappings: List[ActionMapping] = Field(default=[], description="Event to action mappings")
    trigger_config: Dict[str, Any] = Field(default={}, description="Trigger configuration")


class IntegrationUpdate(BaseModel):
    """Request to update an integration"""
    name: Optional[str] = None
    description: Optional[str] = None
    action_mappings: Optional[List[ActionMapping]] = None
    trigger_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class IntegrationResponse(BaseModel):
    """Integration response"""
    id: str
    name: str
    connector_id: str
    device_id: Optional[str] = None
    system_id: Optional[str] = None
    description: str = ""
    action_mappings: List[ActionMapping] = []
    trigger_config: Dict[str, Any] = {}
    is_active: bool = True
    last_triggered_at: Optional[datetime] = None
    trigger_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Related info (denormalized for convenience)
    connector_name: Optional[str] = None
    provider_name: Optional[str] = None
    device_name: Optional[str] = None


class IntegrationList(BaseModel):
    """List of integrations"""
    items: List[IntegrationResponse]
    total: int


class TriggerIntegrationRequest(BaseModel):
    """Request to manually trigger an integration"""
    event_type: str = Field(..., description="Event type to simulate")
    event_data: Dict[str, Any] = Field(default={}, description="Event data")


class TriggerIntegrationResponse(BaseModel):
    """Response from triggering an integration"""
    success: bool
    message: str
    execution_id: Optional[str] = None
    results: List[Dict[str, Any]] = []
