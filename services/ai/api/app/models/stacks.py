"""Automation Stack models"""
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class StackCategory(str, Enum):
    """Stack categories"""
    VOICE_AGENT = "voice_agent"
    TEMPORAL = "temporal"
    COMPLETE = "complete"
    INFRASTRUCTURE = "infrastructure"
    MONITORING = "monitoring"
    ITSM = "itsm"
    CUSTOM = "custom"


class DeploymentTarget(str, Enum):
    """Where the stack can be deployed"""
    DOCKER = "docker"
    AWS_SPOT = "aws_spot"
    KUBERNETES = "kubernetes"


class ComponentStatus(str, Enum):
    """Component status"""
    PENDING = "pending"
    STARTING = "starting"
    RUNNING = "running"
    STOPPED = "stopped"
    ERROR = "error"


class StackStatus(str, Enum):
    """Overall stack status"""
    DEPLOYING = "deploying"
    RUNNING = "running"
    PARTIALLY_RUNNING = "partially_running"
    STOPPED = "stopped"
    ERROR = "error"
    TERMINATED = "terminated"


class StackComponent(BaseModel):
    """Individual component in a stack"""
    model_config = {"protected_namespaces": ()}

    name: str
    display_name: str
    description: Optional[str] = None

    # Docker configuration
    image: str
    tag: str = "latest"
    ports: List[Dict[str, int]] = Field(default_factory=list)  # [{"host": 7880, "container": 7880}]
    environment: Dict[str, str] = Field(default_factory=dict)
    volumes: List[str] = Field(default_factory=list)
    command: Optional[str] = None

    # Dependencies
    depends_on: List[str] = Field(default_factory=list)

    # Resource requirements
    cpu_limit: Optional[float] = None
    memory_limit: Optional[str] = None
    gpu_required: bool = False

    # Health check
    health_check: Optional[Dict[str, Any]] = None


class StackResourceRequirements(BaseModel):
    """Stack resource requirements"""
    min_ram_gb: int
    min_vram_gb: Optional[int] = None
    min_cpu_cores: int
    min_disk_gb: int
    requires_gpu: bool = False
    recommended_instance_type: Optional[str] = None  # For AWS


class StackAutoSetup(BaseModel):
    """Auto-setup configuration"""
    create_llm_connections: bool = True
    configure_redis: bool = True
    run_database_migrations: bool = True
    pull_models: bool = True
    create_network: bool = True

    # Post-deployment actions
    post_deploy_commands: List[str] = Field(default_factory=list)

    # Health checks
    health_check_endpoints: List[str] = Field(default_factory=list)
    max_startup_time_seconds: int = 300


class StackTemplate(BaseModel):
    """Complete stack template definition"""
    model_config = {"protected_namespaces": ()}

    id: str
    name: str
    description: str
    category: StackCategory
    version: str = "1.0.0"

    # Visual
    icon: Optional[str] = None
    tags: List[str] = Field(default_factory=list)

    # Components
    components: List[StackComponent]

    # Deployment
    deployment_targets: List[DeploymentTarget]
    resources: StackResourceRequirements

    # Auto-setup
    auto_setup: StackAutoSetup

    # Configuration options (user-customizable)
    configurable_options: List[Dict[str, Any]] = Field(default_factory=list)

    # Documentation
    setup_instructions: Optional[str] = None
    usage_instructions: Optional[str] = None


class StackDeploymentCreate(BaseModel):
    """Request to deploy a stack"""
    model_config = {"protected_namespaces": ()}

    stack_id: str  # Template ID
    name: str  # User-defined name for this deployment
    description: Optional[str] = None

    # Deployment target
    deployment_target: DeploymentTarget

    # For Docker deployment
    docker_host_id: Optional[str] = None
    portainer_endpoint_id: Optional[int] = None

    # For AWS deployment
    aws_instance_type: Optional[str] = None
    aws_region: Optional[str] = None

    # Configuration overrides
    config_overrides: Dict[str, Any] = Field(default_factory=dict)

    # Integration flags
    create_llm_connections: bool = True
    use_in_livekit: bool = False
    use_in_temporal: bool = False


class DeployedComponent(BaseModel):
    """Status of a deployed component"""
    model_config = {"protected_namespaces": ()}

    name: str
    container_id: Optional[str] = None
    status: ComponentStatus
    port_mappings: Dict[int, int] = Field(default_factory=dict)
    health_status: Optional[str] = None
    started_at: Optional[datetime] = None
    error_message: Optional[str] = None


class StackDeploymentResponse(BaseModel):
    """Deployed stack information"""
    model_config = {"protected_namespaces": ()}

    id: str  # Deployment ID
    stack_id: str  # Template ID
    name: str
    description: Optional[str]

    # Deployment info
    deployment_target: DeploymentTarget
    status: StackStatus

    # Location
    docker_host_id: Optional[str] = None
    docker_host_name: Optional[str] = None
    aws_instance_id: Optional[str] = None
    host_ip: Optional[str] = None

    # Components
    components: List[DeployedComponent]
    total_components: int
    running_components: int

    # Access URLs
    access_urls: Dict[str, str] = Field(default_factory=dict)  # {"livekit": "http://...", "web": "http://..."}

    # LLM connections created
    llm_connection_ids: List[str] = Field(default_factory=list)

    # Metadata
    deployed_at: datetime
    deployed_by: Optional[str] = None
    last_health_check: Optional[datetime] = None


class StackListResponse(BaseModel):
    """List of deployed stacks"""
    stacks: List[StackDeploymentResponse]
    total: int
    by_status: Dict[str, int] = Field(default_factory=dict)
    by_category: Dict[str, int] = Field(default_factory=dict)
