"""User schemas for CRUD operations."""
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, EmailStr


class UserBase(BaseModel):
    """Base user schema with common fields."""

    username: str = Field(..., min_length=3, max_length=50, description="Unique username")
    email: EmailStr = Field(..., description="User email address")
    full_name: Optional[str] = Field(None, max_length=100, description="Full name")
    tenant_id: Optional[str] = Field(None, max_length=50, description="Tenant ID")


class UserCreate(UserBase):
    """Schema for creating a new user."""

    password: str = Field(..., min_length=8, description="Password (min 8 characters)")
    is_active: bool = Field(default=True, description="Whether user is active")
    is_superuser: bool = Field(default=False, description="Whether user is a superuser")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "john.doe",
                "email": "john.doe@example.com",
                "full_name": "John Doe",
                "tenant_id": "tenant_acme",
                "password": "securepassword123",
                "is_active": True,
                "is_superuser": False,
            }
        }


class UserUpdate(BaseModel):
    """Schema for updating an existing user."""

    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, max_length=100)
    tenant_id: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=8)

    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.updated@example.com",
                "full_name": "John Updated",
                "is_active": True,
            }
        }


class UserResponse(BaseModel):
    """Schema for user response (without sensitive data)."""

    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    tenant_id: Optional[str] = None
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "username": "john.doe",
                "email": "john.doe@example.com",
                "full_name": "John Doe",
                "tenant_id": "tenant_acme",
                "is_active": True,
                "is_superuser": False,
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
                "last_login_at": None,
            }
        }


class UserInDB(UserResponse):
    """Schema for user with hashed password (internal use)."""

    hashed_password: str


class UserList(BaseModel):
    """Schema for paginated user list response."""

    items: List[UserResponse]
    total: int
    page: int
    page_size: int
    pages: int


class UserWithRoles(UserResponse):
    """Schema for user response with roles."""

    roles: List[dict] = Field(default_factory=list, description="User's role assignments")

    class Config:
        from_attributes = True
