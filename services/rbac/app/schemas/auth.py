"""Authentication schemas for login and token handling."""
from typing import Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    """Schema for login request."""

    username: str = Field(..., min_length=1, max_length=50, description="Username")
    password: str = Field(..., min_length=1, description="Password")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "admin",
                "password": "admin123",
            }
        }


class Token(BaseModel):
    """Schema for token response."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
            }
        }


class TokenData(BaseModel):
    """Schema for decoded token data."""

    username: str
    tenant_id: Optional[str] = None


class AuthResponse(BaseModel):
    """Schema for authentication response with user details."""

    access_token: str
    token_type: str = "bearer"
    user: "UserBasic"


class UserBasic(BaseModel):
    """Basic user info returned with auth response."""

    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    tenant_id: Optional[str] = None
    is_superuser: bool = False

    class Config:
        from_attributes = True


# Update forward reference
AuthResponse.model_rebuild()
