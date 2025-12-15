"""Instance-related Pydantic models"""
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field


class Framework(str, Enum):
    """Supported LLM frameworks"""
    OLLAMA = "ollama"
    VLLM = "vllm"
    TGI = "tgi"
    LLAMA_CPP = "llama-cpp"
    CUSTOM = "custom"


class InstanceStatus(str, Enum):
    """Instance status"""
    PENDING = "pending"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"
    TERMINATED = "terminated"
    UNKNOWN = "unknown"


class InstanceCreate(BaseModel):
    """Request model for launching an instance"""
    instance_type: str = Field(..., description="EC2 instance type (e.g., g5.xlarge)")
    framework: Framework = Field(Framework.OLLAMA, description="LLM framework to install")
    model: Optional[str] = Field(None, description="Model to pull/load")
    name: str = Field("llm-test", description="Instance name tag")
    region: Optional[str] = Field(None, description="AWS region")
    volume_size_gb: int = Field(100, description="Root volume size in GB", ge=50, le=1000)
    max_price: Optional[float] = Field(None, description="Maximum spot price (USD/hour)")
    hf_token: Optional[str] = Field(None, description="HuggingFace token for gated models")


class InstanceResponse(BaseModel):
    """Response model for instance information"""
    id: str = Field(..., description="Database UUID")
    instance_id: str = Field(..., description="AWS instance ID")
    name: str
    instance_type: str
    framework: str
    model: Optional[str]
    region: str
    status: InstanceStatus
    public_ip: Optional[str]
    public_dns: Optional[str]
    private_ip: Optional[str]
    gpu: Optional[str] = Field(None, description="GPU model")
    gpu_memory: Optional[str] = Field(None, description="GPU memory")
    spot_price: Optional[float] = Field(None, description="Current spot price")
    max_price: Optional[float] = Field(None, description="Maximum spot price set")
    launched_at: datetime
    terminated_at: Optional[datetime] = None
    uptime_hours: Optional[float] = Field(None, description="Hours since launch")
    estimated_cost: Optional[float] = Field(None, description="Estimated cost so far")

    # Connection info
    ssh_command: Optional[str] = None
    ollama_endpoint: Optional[str] = None
    vllm_endpoint: Optional[str] = None
    tgi_endpoint: Optional[str] = None

    class Config:
        from_attributes = True


class InstanceListResponse(BaseModel):
    """Response model for listing instances"""
    instances: List[InstanceResponse]
    total: int
    active_count: int
    total_cost_estimate: float = Field(0.0, description="Total estimated cost across all instances")
