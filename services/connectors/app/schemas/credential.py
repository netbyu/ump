"""
Credential Schemas
==================
Pydantic models for credential-related API operations
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel


class CredentialCreate(BaseModel):
    """Create credential request"""
    connector_id: str
    name: str
    credentials: Dict[str, Any]
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None


class CredentialResponse(BaseModel):
    """Credential response (without sensitive data)"""
    id: str
    connector_id: str
    name: str
    auth_type: str
    is_valid: bool
    created_at: str
    updated_at: str
    last_used_at: Optional[str] = None
