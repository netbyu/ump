"""Pricing-related Pydantic models"""
from typing import List, Optional
from pydantic import BaseModel, Field


class InstanceTypeInfo(BaseModel):
    """Instance type information"""
    instance_type: str
    gpu_count: int
    gpu_model: str
    gpu_memory_gb: int
    vcpus: int
    memory_gb: int
    storage_gb: int
    network_gbps: int
    on_demand_price: float
    spot_price_estimate: float
    current_spot_price: Optional[float] = None
    savings_percentage: Optional[float] = None
    recommended_models: List[str] = []


class PricingResponse(BaseModel):
    """Response model for pricing information"""
    region: str
    instance_types: List[InstanceTypeInfo]
    updated_at: str


class RecommendationRequest(BaseModel):
    """Request model for instance recommendations"""
    model_config = {"protected_namespaces": ()}

    model_name: str = Field(..., description="Model name (e.g., llama3.1:70b)")


class RecommendationResponse(BaseModel):
    """Response model for instance recommendations"""
    model_config = {"protected_namespaces": ()}

    model_name: str
    recommendations: List[InstanceTypeInfo]
