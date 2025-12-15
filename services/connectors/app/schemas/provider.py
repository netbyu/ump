"""
Provider Schemas
================
Pydantic models for provider-related API operations

A Provider is a template/definition of an external service (e.g., Slack, Twilio).
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ProviderInfo(BaseModel):
    """Basic provider information"""
    id: str
    name: str
    description: str
    version: str
    icon_url: Optional[str] = None
    categories: List[str] = []
    tags: List[str] = []
    auth_type: str
    supports_webhooks: bool = False


class ProviderDetail(ProviderInfo):
    """Detailed provider information including actions and triggers"""
    actions: List[Dict[str, Any]] = []
    triggers: List[Dict[str, Any]] = []
    auth_schema: Dict[str, Any] = {}


# Backward compatibility aliases
ConnectorInfo = ProviderInfo
ConnectorDetail = ProviderDetail
