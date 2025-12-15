"""Credentials-related Pydantic models"""
from typing import Optional
from pydantic import BaseModel, Field


class AWSCredentialsCreate(BaseModel):
    """Request model for storing AWS credentials"""
    access_key_id: str = Field(..., min_length=16, max_length=128)
    secret_access_key: str = Field(..., min_length=16, max_length=128)
    default_region: str = Field("us-east-1", description="Default AWS region")
    key_pair_name: Optional[str] = Field(None, description="Default SSH key pair name")


class AWSCredentialsResponse(BaseModel):
    """Response model for AWS credentials (without secrets)"""
    id: str
    access_key_id: str = Field(..., description="Masked access key ID")
    default_region: str
    key_pair_name: Optional[str]
    created_at: str

    class Config:
        from_attributes = True
