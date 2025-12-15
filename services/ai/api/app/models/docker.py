"""Docker deployment models"""
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DockerFramework(str, Enum):
    """Supported LLM frameworks for Docker deployment"""
    OLLAMA = "ollama"
    VLLM = "vllm"
    TGI = "tgi"
    LLAMA_CPP = "llama-cpp"


class ContainerStatus(str, Enum):
    """Container status"""
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    RESTARTING = "restarting"
    REMOVING = "removing"
    EXITED = "exited"
    DEAD = "dead"


class DockerEndpoint(BaseModel):
    """Docker endpoint (host) information"""
    model_config = {"protected_namespaces": ()}

    id: int
    name: str
    type: int  # 1=Docker, 2=Agent, etc.
    url: str
    public_url: Optional[str] = None
    status: int  # 1=Up, 2=Down
    snapshots: Optional[List[Any]] = None


class DockerDeploymentCreate(BaseModel):
    """Request model for deploying LLM to Docker"""
    model_config = {"protected_namespaces": ()}

    endpoint_id: int = Field(..., description="Portainer endpoint ID")
    endpoint_name: Optional[str] = Field(None, description="Endpoint name (alternative to ID)")

    # Container configuration
    name: str = Field(..., description="Container name")
    framework: DockerFramework = Field(..., description="LLM framework")
    model_name: Optional[str] = Field(None, description="Model to deploy")

    # Resource allocation
    gpu_enabled: bool = Field(True, description="Enable GPU support")
    port: Optional[int] = Field(None, description="Host port (auto-assigned if not specified)")
    cpu_limit: Optional[float] = Field(None, description="CPU limit (cores)")
    memory_limit: Optional[str] = Field(None, description="Memory limit (e.g., '8g')")

    # Advanced options
    hf_token: Optional[str] = Field(None, description="HuggingFace token for gated models")
    env_vars: Dict[str, str] = Field(default_factory=dict, description="Additional environment variables")
    volumes: List[str] = Field(default_factory=list, description="Volume mounts")

    # Integration
    auto_create_connection: bool = Field(True, description="Auto-create LLM connection")
    use_in_livekit: bool = Field(False, description="Enable for LiveKit")
    use_in_mcp: bool = Field(False, description="Enable for MCP")


class DockerDeploymentResponse(BaseModel):
    """Response model for Docker deployment"""
    model_config = {"protected_namespaces": ()}

    id: str  # Container ID
    container_id: str
    name: str
    framework: str
    model_name: Optional[str]

    # Endpoint info
    endpoint_id: int
    endpoint_name: str

    # Network
    host_ip: Optional[str]
    host_port: Optional[int]
    container_port: int

    # Status
    status: ContainerStatus
    created_at: datetime
    started_at: Optional[datetime] = None

    # Connection info
    base_url: Optional[str] = None
    connection_id: Optional[str] = Field(None, description="Associated LLM connection ID")

    # Resource usage
    cpu_usage: Optional[float] = None
    memory_usage: Optional[str] = None


class DockerContainerListResponse(BaseModel):
    """Response model for listing Docker containers"""
    containers: List[DockerDeploymentResponse]
    total: int
    running_count: int
    by_framework: Dict[str, int] = Field(default_factory=dict)
