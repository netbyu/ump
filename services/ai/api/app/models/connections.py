"""LLM Connection models"""
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, HttpUrl


class ConnectionType(str, Enum):
    """Types of LLM connections"""
    LOCAL = "local"  # Local Ollama, llama.cpp, etc.
    REMOTE = "remote"  # Custom OpenAI-compatible endpoints
    AWS_SPOT = "aws_spot"  # AWS Spot instances (existing)
    OPENAI = "openai"  # OpenAI API
    ANTHROPIC = "anthropic"  # Anthropic Claude API
    GOOGLE = "google"  # Google Gemini API
    AZURE = "azure"  # Azure OpenAI
    GROQ = "groq"  # Groq API
    TOGETHER = "together"  # Together AI
    CUSTOM = "custom"  # Other custom endpoints


class ConnectionStatus(str, Enum):
    """Connection status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    TESTING = "testing"


class LLMConnectionCreate(BaseModel):
    """Request model for creating LLM connection"""
    model_config = {"protected_namespaces": ()}

    name: str = Field(..., min_length=1, max_length=255, description="Connection name")
    connection_type: ConnectionType = Field(..., description="Type of connection")
    description: Optional[str] = Field(None, description="Connection description")

    # Endpoint configuration
    base_url: Optional[str] = Field(None, description="Base URL for API")
    model_name: Optional[str] = Field(None, description="Default model name")

    # Authentication
    api_key: Optional[str] = Field(None, description="API key (encrypted)")
    organization_id: Optional[str] = Field(None, description="Organization ID (for OpenAI, etc.)")

    # Advanced configuration
    timeout: int = Field(30, ge=1, le=300, description="Request timeout in seconds")
    max_retries: int = Field(3, ge=0, le=10, description="Max retry attempts")
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0, description="Default temperature")
    max_tokens: Optional[int] = Field(None, ge=1, description="Default max tokens")

    # Extra configuration (JSON)
    extra_config: Optional[Dict[str, Any]] = Field(None, description="Additional configuration")

    # Tags and metadata
    tags: list[str] = Field(default_factory=list, description="Tags for organization")
    is_active: bool = Field(True, description="Whether connection is active")

    # Integration flags
    use_in_livekit: bool = Field(False, description="Available for LiveKit")
    use_in_mcp: bool = Field(False, description="Available for MCP servers")
    use_in_automation: bool = Field(False, description="Available for automation workflows")


class LLMConnectionUpdate(BaseModel):
    """Request model for updating LLM connection"""
    model_config = {"protected_namespaces": ()}

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    api_key: Optional[str] = None
    organization_id: Optional[str] = None
    timeout: Optional[int] = None
    max_retries: Optional[int] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    extra_config: Optional[Dict[str, Any]] = None
    tags: Optional[list[str]] = None
    is_active: Optional[bool] = None
    use_in_livekit: Optional[bool] = None
    use_in_mcp: Optional[bool] = None
    use_in_automation: Optional[bool] = None


class LLMConnectionResponse(BaseModel):
    """Response model for LLM connection"""
    model_config = {"protected_namespaces": (), "from_attributes": True}

    id: str
    user_id: Optional[str] = None
    name: str
    connection_type: ConnectionType
    description: Optional[str]
    base_url: Optional[str]
    model_name: Optional[str]
    api_key_masked: Optional[str] = Field(None, description="Masked API key (e.g., sk-...xyz)")
    organization_id: Optional[str]
    status: ConnectionStatus
    timeout: int
    max_retries: int
    temperature: Optional[float]
    max_tokens: Optional[int]
    extra_config: Optional[Dict[str, Any]]
    tags: list[str]
    is_active: bool
    use_in_livekit: bool
    use_in_mcp: bool
    use_in_automation: bool

    # Metadata
    created_at: datetime
    updated_at: datetime
    last_tested_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None

    # AWS Spot specific (if applicable)
    aws_instance_id: Optional[str] = None
    aws_public_ip: Optional[str] = None


class ConnectionTestRequest(BaseModel):
    """Request model for testing a connection"""
    prompt: str = Field("Hello, how are you?", description="Test prompt")
    max_tokens: Optional[int] = Field(50, description="Max tokens for test")


class ConnectionTestResponse(BaseModel):
    """Response model for connection test"""
    model_config = {"protected_namespaces": ()}

    success: bool
    response_text: Optional[str] = None
    latency_ms: Optional[float] = None
    error: Optional[str] = None
    model_used: Optional[str] = None


class LLMConnectionListResponse(BaseModel):
    """Response model for listing connections"""
    connections: list[LLMConnectionResponse]
    total: int
    by_type: Dict[str, int] = Field(default_factory=dict, description="Count by connection type")
    active_count: int
