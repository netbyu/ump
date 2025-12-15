"""RBAC schemas for role and permission management."""
from typing import List, Optional

from pydantic import BaseModel, Field


class RoleAssignment(BaseModel):
    """Schema for assigning a role to a user."""

    username: str = Field(..., description="Username to assign role to")
    role: str = Field(..., description="Role name to assign")
    tenant_id: str = Field(..., description="Tenant ID (* for platform-wide)")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "john.doe",
                "role": "operator",
                "tenant_id": "tenant_acme",
            }
        }


class Permission(BaseModel):
    """Schema for a permission rule."""

    role: str = Field(..., description="Role this permission applies to")
    tenant_id: str = Field(..., description="Tenant ID (* for all tenants)")
    resource: str = Field(..., description="Resource name")
    action: str = Field(..., description="Action (create, read, update, delete, *)")

    class Config:
        json_schema_extra = {
            "example": {
                "role": "operator",
                "tenant_id": "tenant_acme",
                "resource": "extensions",
                "action": "update",
            }
        }


class RoleInfo(BaseModel):
    """Schema for role information."""

    role: str
    tenant_id: str


class PermissionInfo(BaseModel):
    """Schema for permission information."""

    role: str
    tenant_id: str
    resource: str
    action: str


class UserPermissionsResponse(BaseModel):
    """Response schema for user permissions query."""

    username: str
    roles: List[RoleInfo] = Field(..., description="List of role assignments with tenants")
    permissions: List[PermissionInfo] = Field(
        ..., description="List of effective permissions"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "username": "john.doe",
                "roles": [{"role": "operator", "tenant_id": "tenant_acme"}],
                "permissions": [
                    {
                        "role": "operator",
                        "tenant_id": "tenant_acme",
                        "resource": "extensions",
                        "action": "read",
                    },
                    {
                        "role": "operator",
                        "tenant_id": "tenant_acme",
                        "resource": "extensions",
                        "action": "update",
                    },
                ],
            }
        }


class PermissionCheckRequest(BaseModel):
    """Request schema for permission check."""

    username: str
    tenant_id: str
    resource: str
    action: str

    class Config:
        json_schema_extra = {
            "example": {
                "username": "john.doe",
                "tenant_id": "tenant_acme",
                "resource": "extensions",
                "action": "update",
            }
        }


class PermissionCheckResponse(BaseModel):
    """Response schema for permission check."""

    username: str
    tenant_id: str
    resource: str
    action: str
    allowed: bool

    class Config:
        json_schema_extra = {
            "example": {
                "username": "john.doe",
                "tenant_id": "tenant_acme",
                "resource": "extensions",
                "action": "update",
                "allowed": True,
            }
        }


class RoleList(BaseModel):
    """Response schema for listing roles."""

    roles: List[str]


class PolicyReloadResponse(BaseModel):
    """Response schema for policy reload."""

    message: str
    success: bool


class BulkRoleAssignment(BaseModel):
    """Schema for bulk role assignment."""

    assignments: List[RoleAssignment]

    class Config:
        json_schema_extra = {
            "example": {
                "assignments": [
                    {"username": "john.doe", "role": "operator", "tenant_id": "tenant_acme"},
                    {"username": "jane.doe", "role": "viewer", "tenant_id": "tenant_acme"},
                ]
            }
        }
