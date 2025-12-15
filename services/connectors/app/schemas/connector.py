"""
Connector Schemas
=================
Pydantic models for connector-related API operations
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ConnectorInfo(BaseModel):
    """Basic connector information"""
    id: str
    name: str
    description: str
    version: str
    icon_url: Optional[str] = None
    categories: List[str] = []
    tags: List[str] = []
    auth_type: str
    supports_webhooks: bool = False


class ConnectorDetail(ConnectorInfo):
    """Detailed connector information including actions and triggers"""
    actions: List[Dict[str, Any]] = []
    triggers: List[Dict[str, Any]] = []
    auth_schema: Dict[str, Any] = {}
