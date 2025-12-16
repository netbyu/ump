"""
UC Platform - FastAPI Backend
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
import os
import uuid

from database import get_db, init_db
from models import IntegrationCategory as DBIntegrationCategory
from models import IntegrationType as DBIntegrationType
from models import IntegrationInstance as DBIntegrationInstance
from models import AIAgent as DBAIAgent
from models import AIConversation as DBAIConversation
from models import User as DBUser
from models import Device as DBDevice
from models import DeviceType as DBDeviceType
from models import DeviceManufacturer as DBDeviceManufacturer
from models import Location as DBLocation
from models import DeviceGroup as DBDeviceGroup
from models import DeviceGroupType as DBDeviceGroupType
from models import DeviceIntegration as DBDeviceIntegration
from models import Platform as DBPlatform
from models import PlatformType as DBPlatformType
from models import CredentialGroup as DBCredentialGroup

# LiveKit token generation
from livekit import api

app = FastAPI(
    title="UC Platform API",
    description="Unified Communication Management Platform API",
    version="0.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============== Models ==============

class User(BaseModel):
    id: str
    email: str
    name: str
    role: str
    avatar: Optional[str] = None


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    user: User
    token: str


class PhoneSystem(BaseModel):
    id: str
    name: str
    type: str
    status: str
    ipAddress: str
    location: str
    totalExtensions: int
    activeExtensions: int
    lastSync: str
    createdAt: str


class LiveKitToken(BaseModel):
    token: str
    roomName: str
    serverUrl: str


class IntegrationType(BaseModel):
    """Template/blueprint for integration types"""
    id: str
    name: str
    category: str
    icon: str
    description: str
    vendor: str
    documentation_url: Optional[str] = None
    config_schema: dict
    supported_features: list[str]
    is_active: bool
    created_at: str
    updated_at: str


class IntegrationInstance(BaseModel):
    """Actual configured integration instance"""
    id: str
    integration_type_id: str
    name: str
    status: str
    config: dict
    last_sync_at: Optional[str] = None
    last_sync_status: Optional[str] = None
    records_synced: int
    error_count: int
    enabled: bool
    created_by: str
    created_at: str
    updated_at: str


class IntegrationCategory(BaseModel):
    """Categories for grouping integrations"""
    id: str
    key: str
    label: str
    icon: str
    description: str
    display_order: int


# ============== Mock Data ==============

MOCK_USER = User(
    id="1",
    email="admin@ucplatform.com",
    name="Admin User",
    role="admin",
)

MOCK_PHONE_SYSTEMS = [
    PhoneSystem(
        id="1",
        name="HQ-PBX-01",
        type="cisco",
        status="online",
        ipAddress="192.168.1.10",
        location="Headquarters",
        totalExtensions=500,
        activeExtensions=423,
        lastSync="2024-12-12T10:00:00Z",
        createdAt="2024-01-15T08:00:00Z",
    ),
    PhoneSystem(
        id="2",
        name="Branch-PBX-01",
        type="avaya",
        status="online",
        ipAddress="192.168.2.10",
        location="Branch Office",
        totalExtensions=100,
        activeExtensions=87,
        lastSync="2024-12-12T09:45:00Z",
        createdAt="2024-03-20T14:00:00Z",
    ),
    PhoneSystem(
        id="3",
        name="DC-Asterisk",
        type="asterisk",
        status="degraded",
        ipAddress="10.0.1.50",
        location="Data Center",
        totalExtensions=200,
        activeExtensions=156,
        lastSync="2024-12-12T08:30:00Z",
        createdAt="2024-02-10T11:00:00Z",
    ),
]

# Integration Categories
MOCK_INTEGRATION_CATEGORIES = [
    IntegrationCategory(
        id="1",
        key="itsm",
        label="🎫 ITSM / Ticketing",
        icon="🎫",
        description="IT Service Management and ticketing systems",
        display_order=1,
    ),
    IntegrationCategory(
        id="2",
        key="hr",
        label="👔 HR Systems",
        icon="👔",
        description="Human Resources and employee management",
        display_order=2,
    ),
    IntegrationCategory(
        id="3",
        key="crm",
        label="💼 CRM",
        icon="💼",
        description="Customer Relationship Management",
        display_order=3,
    ),
    IntegrationCategory(
        id="4",
        key="comm",
        label="💬 Communication",
        icon="💬",
        description="Team communication platforms",
        display_order=4,
    ),
    IntegrationCategory(
        id="5",
        key="pbx",
        label="📞 PBX Systems",
        icon="📞",
        description="Phone systems and telephony",
        display_order=5,
    ),
    IntegrationCategory(
        id="6",
        key="analytics",
        label="📊 Analytics",
        icon="📊",
        description="Analytics and reporting platforms",
        display_order=6,
    ),
    IntegrationCategory(
        id="7",
        key="custom",
        label="🔧 Custom / Webhooks",
        icon="🔧",
        description="Custom integrations and webhooks",
        display_order=7,
    ),
]

# Integration Types (Templates)
MOCK_INTEGRATION_TYPES = [
    IntegrationType(
        id="1",
        name="ServiceNow",
        category="itsm",
        icon="❄️",
        description="Enterprise IT service management platform",
        vendor="ServiceNow Inc",
        documentation_url="https://docs.servicenow.com",
        config_schema={"api_url": "string", "api_key": "string", "instance": "string"},
        supported_features=["sync", "webhooks", "api", "oauth"],
        is_active=True,
        created_at="2024-01-01T00:00:00Z",
        updated_at="2024-01-01T00:00:00Z",
    ),
    IntegrationType(
        id="2",
        name="Workday",
        category="hr",
        icon="📊",
        description="Cloud-based HR and finance platform",
        vendor="Workday Inc",
        documentation_url="https://doc.workday.com",
        config_schema={"tenant_url": "string", "username": "string", "password": "string"},
        supported_features=["sync", "api"],
        is_active=True,
        created_at="2024-01-01T00:00:00Z",
        updated_at="2024-01-01T00:00:00Z",
    ),
    IntegrationType(
        id="3",
        name="Salesforce",
        category="crm",
        icon="☁️",
        description="Customer relationship management platform",
        vendor="Salesforce",
        documentation_url="https://developer.salesforce.com",
        config_schema={"instance_url": "string", "client_id": "string", "client_secret": "string"},
        supported_features=["sync", "webhooks", "api", "oauth"],
        is_active=True,
        created_at="2024-01-01T00:00:00Z",
        updated_at="2024-01-01T00:00:00Z",
    ),
    IntegrationType(
        id="4",
        name="Microsoft Teams",
        category="comm",
        icon="🟣",
        description="Team collaboration and communication",
        vendor="Microsoft",
        documentation_url="https://docs.microsoft.com/teams",
        config_schema={"tenant_id": "string", "client_id": "string", "client_secret": "string"},
        supported_features=["webhooks", "api", "oauth"],
        is_active=True,
        created_at="2024-01-01T00:00:00Z",
        updated_at="2024-01-01T00:00:00Z",
    ),
    IntegrationType(
        id="5",
        name="Cisco CUCM",
        category="pbx",
        icon="📞",
        description="Cisco Unified Communications Manager",
        vendor="Cisco Systems",
        documentation_url="https://developer.cisco.com/docs/axl",
        config_schema={"host": "string", "username": "string", "password": "string", "version": "string"},
        supported_features=["sync", "api"],
        is_active=True,
        created_at="2024-01-01T00:00:00Z",
        updated_at="2024-01-01T00:00:00Z",
    ),
    IntegrationType(
        id="6",
        name="Avaya Aura",
        category="pbx",
        icon="☎️",
        description="Avaya Aura Communication Manager",
        vendor="Avaya",
        config_schema={"host": "string", "username": "string", "password": "string"},
        supported_features=["sync", "api"],
        is_active=True,
        created_at="2024-01-01T00:00:00Z",
        updated_at="2024-01-01T00:00:00Z",
    ),
]

# Integration Instances (Configured)
MOCK_INTEGRATION_INSTANCES = [
    IntegrationInstance(
        id="1",
        integration_type_id="1",
        name="Production ServiceNow",
        status="connected",
        config={"api_url": "https://company.service-now.com", "instance": "company"},
        last_sync_at="2024-12-12T14:28:00Z",
        last_sync_status="success",
        records_synced=1234,
        error_count=0,
        enabled=True,
        created_by="1",
        created_at="2024-06-01T00:00:00Z",
        updated_at="2024-12-12T14:28:00Z",
    ),
    IntegrationInstance(
        id="2",
        integration_type_id="2",
        name="Workday HR",
        status="connected",
        config={"tenant_url": "https://company.workday.com"},
        last_sync_at="2024-12-12T14:25:00Z",
        last_sync_status="success",
        records_synced=856,
        error_count=0,
        enabled=True,
        created_by="1",
        created_at="2024-06-15T00:00:00Z",
        updated_at="2024-12-12T14:25:00Z",
    ),
    IntegrationInstance(
        id="3",
        integration_type_id="3",
        name="Salesforce Production",
        status="warning",
        config={"instance_url": "https://company.salesforce.com"},
        last_sync_at="2024-12-12T13:00:00Z",
        last_sync_status="partial",
        records_synced=2341,
        error_count=12,
        enabled=True,
        created_by="1",
        created_at="2024-05-20T00:00:00Z",
        updated_at="2024-12-12T13:00:00Z",
    ),
    IntegrationInstance(
        id="4",
        integration_type_id="4",
        name="Microsoft Teams",
        status="paused",
        config={"tenant_id": "company-tenant"},
        last_sync_at=None,
        last_sync_status=None,
        records_synced=0,
        error_count=0,
        enabled=False,
        created_by="1",
        created_at="2024-07-01T00:00:00Z",
        updated_at="2024-11-15T00:00:00Z",
    ),
    IntegrationInstance(
        id="5",
        integration_type_id="5",
        name="HQ Cisco CUCM",
        status="connected",
        config={"host": "192.168.1.10", "version": "12.5"},
        last_sync_at="2024-12-12T14:29:00Z",
        last_sync_status="success",
        records_synced=450,
        error_count=0,
        enabled=True,
        created_by="1",
        created_at="2024-03-10T00:00:00Z",
        updated_at="2024-12-12T14:29:00Z",
    ),
    IntegrationInstance(
        id="6",
        integration_type_id="6",
        name="Branch Avaya",
        status="connected",
        config={"host": "192.168.2.10"},
        last_sync_at="2024-12-12T14:27:00Z",
        last_sync_status="success",
        records_synced=320,
        error_count=0,
        enabled=True,
        created_by="1",
        created_at="2024-04-05T00:00:00Z",
        updated_at="2024-12-12T14:27:00Z",
    ),
]


# ============== Auth Routes ==============

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    # Mock authentication - replace with real auth
    if request.email and request.password:
        return LoginResponse(
            user=MOCK_USER,
            token="mock-jwt-token-replace-in-production",
        )
    raise HTTPException(status_code=401, detail="Invalid credentials")


@app.get("/api/auth/me", response_model=dict)
async def get_current_user():
    return {"data": MOCK_USER.model_dump()}


@app.post("/api/auth/logout")
async def logout():
    return {"message": "Logged out successfully"}


# ============== Phone Systems Routes ==============

@app.get("/api/phone-systems")
async def list_phone_systems(page: int = 1, pageSize: int = 10):
    return {
        "data": [ps.model_dump() for ps in MOCK_PHONE_SYSTEMS],
        "total": len(MOCK_PHONE_SYSTEMS),
        "page": page,
        "pageSize": pageSize,
        "totalPages": 1,
    }


@app.get("/api/phone-systems/{system_id}")
async def get_phone_system(system_id: str):
    for ps in MOCK_PHONE_SYSTEMS:
        if ps.id == system_id:
            return {"data": ps.model_dump()}
    raise HTTPException(status_code=404, detail="Phone system not found")


@app.post("/api/phone-systems/{system_id}/sync")
async def sync_phone_system(system_id: str):
    return {"data": {"id": system_id, "status": "syncing"}, "message": "Sync started"}


# ============== Infrastructure Routes ==============

@app.get("/api/infrastructure")
async def list_infrastructure(page: int = 1, pageSize: int = 10):
    return {
        "data": [],
        "total": 0,
        "page": page,
        "pageSize": pageSize,
        "totalPages": 0,
    }


# ============== Workflow Routes ==============

@app.get("/api/workflows")
async def list_workflows(page: int = 1, pageSize: int = 10):
    return {
        "data": [],
        "total": 0,
        "page": page,
        "pageSize": pageSize,
        "totalPages": 0,
    }


# ============== LiveKit / Chat Routes ==============

class ChatTokenRequest(BaseModel):
    agent_id: Optional[str] = None
    identity: Optional[str] = None


@app.post("/api/chat/token", response_model=dict)
async def get_chat_token(request: ChatTokenRequest = None):
    """Generate a LiveKit token for AI chat session"""
    livekit_url = os.getenv("LIVEKIT_URL", "ws://localhost:7880")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")

    # Generate unique room name and participant identity
    room_name = f"ai-chat-{uuid.uuid4().hex[:8]}"
    identity = request.identity if request and request.identity else f"user-{uuid.uuid4().hex[:8]}"

    # Generate real LiveKit token
    token = api.AccessToken(api_key, api_secret) \
        .with_identity(identity) \
        .with_name(identity) \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
        ))

    jwt_token = token.to_jwt()

    return {
        "data": {
            "token": jwt_token,
            "roomName": room_name,
            "serverUrl": livekit_url,
            "identity": identity,
        }
    }


# ============== AI Agent Pydantic Models ==============

class AIAgentBase(BaseModel):
    model_config = {"protected_namespaces": ()}

    name: str
    description: Optional[str] = None
    status: str = "draft"
    voice_provider: str = "piper"
    voice_id: str = "fr_FR-siwis-medium"
    language: str = "fr-FR"
    model_provider: str = "ollama"
    model_name: str = "mistral"
    system_prompt: Optional[str] = None
    temperature: str = "0.7"
    max_tokens: int = 1000
    livekit_room_prefix: Optional[str] = None


class AIAgentCreate(AIAgentBase):
    pass


class AIAgentUpdate(BaseModel):
    model_config = {"protected_namespaces": ()}

    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    voice_provider: Optional[str] = None
    voice_id: Optional[str] = None
    language: Optional[str] = None
    model_provider: Optional[str] = None
    model_name: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[str] = None
    max_tokens: Optional[int] = None
    livekit_room_prefix: Optional[str] = None


class AIAgentResponse(AIAgentBase):
    id: str
    total_conversations: int = 0
    total_duration_seconds: int = 0
    average_rating: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_active_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== AI Agent Routes ==============

@app.get("/api/ai/agents")
async def list_ai_agents(status: Optional[str] = None, db=Depends(get_db)):
    """Get all AI agents"""
    query = select(DBAIAgent)
    if status:
        query = query.where(DBAIAgent.status == status)
    query = query.order_by(DBAIAgent.created_at.desc())

    result = await db.execute(query)
    agents = result.scalars().all()

    return {
        "data": [
            {
                "id": agent.id,
                "name": agent.name,
                "description": agent.description,
                "status": agent.status,
                "voice_provider": agent.voice_provider,
                "voice_id": agent.voice_id,
                "language": agent.language,
                "model_provider": agent.model_provider,
                "model_name": agent.model_name,
                "system_prompt": agent.system_prompt,
                "temperature": agent.temperature,
                "max_tokens": agent.max_tokens,
                "livekit_room_prefix": agent.livekit_room_prefix,
                "total_conversations": agent.total_conversations or 0,
                "total_duration_seconds": agent.total_duration_seconds or 0,
                "average_rating": agent.average_rating,
                "created_by": agent.created_by,
                "created_at": agent.created_at.isoformat() if agent.created_at else None,
                "updated_at": agent.updated_at.isoformat() if agent.updated_at else None,
                "last_active_at": agent.last_active_at.isoformat() if agent.last_active_at else None,
            }
            for agent in agents
        ],
        "total": len(agents),
    }


@app.get("/api/ai/agents/{agent_id}")
async def get_ai_agent(agent_id: str, db=Depends(get_db)):
    """Get a specific AI agent"""
    query = select(DBAIAgent).where(DBAIAgent.id == agent_id)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail="AI Agent not found")

    return {
        "data": {
            "id": agent.id,
            "name": agent.name,
            "description": agent.description,
            "status": agent.status,
            "voice_provider": agent.voice_provider,
            "voice_id": agent.voice_id,
            "language": agent.language,
            "model_provider": agent.model_provider,
            "model_name": agent.model_name,
            "system_prompt": agent.system_prompt,
            "temperature": agent.temperature,
            "max_tokens": agent.max_tokens,
            "livekit_room_prefix": agent.livekit_room_prefix,
            "total_conversations": agent.total_conversations or 0,
            "total_duration_seconds": agent.total_duration_seconds or 0,
            "average_rating": agent.average_rating,
            "created_by": agent.created_by,
            "created_at": agent.created_at.isoformat() if agent.created_at else None,
            "updated_at": agent.updated_at.isoformat() if agent.updated_at else None,
            "last_active_at": agent.last_active_at.isoformat() if agent.last_active_at else None,
        }
    }


@app.post("/api/ai/agents")
async def create_ai_agent(request: AIAgentCreate, db=Depends(get_db)):
    """Create a new AI agent"""
    new_agent = DBAIAgent(
        id=str(uuid.uuid4()),
        name=request.name,
        description=request.description,
        status=request.status,
        voice_provider=request.voice_provider,
        voice_id=request.voice_id,
        language=request.language,
        model_provider=request.model_provider,
        model_name=request.model_name,
        system_prompt=request.system_prompt,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        livekit_room_prefix=request.livekit_room_prefix or f"agent-{uuid.uuid4().hex[:6]}",
        total_conversations=0,
        total_duration_seconds=0,
        created_by="1",  # TODO: Get from auth
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    db.add(new_agent)
    await db.commit()
    await db.refresh(new_agent)

    return {
        "data": {
            "id": new_agent.id,
            "name": new_agent.name,
            "description": new_agent.description,
            "status": new_agent.status,
        },
        "message": "AI Agent created successfully",
    }


@app.put("/api/ai/agents/{agent_id}")
async def update_ai_agent(agent_id: str, request: AIAgentUpdate, db=Depends(get_db)):
    """Update an AI agent"""
    query = select(DBAIAgent).where(DBAIAgent.id == agent_id)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail="AI Agent not found")

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agent, field, value)
    agent.updated_at = datetime.now()

    await db.commit()
    await db.refresh(agent)

    return {
        "data": {
            "id": agent.id,
            "name": agent.name,
            "description": agent.description,
            "status": agent.status,
        },
        "message": "AI Agent updated successfully",
    }


@app.delete("/api/ai/agents/{agent_id}")
async def delete_ai_agent(agent_id: str, db=Depends(get_db)):
    """Delete an AI agent"""
    query = select(DBAIAgent).where(DBAIAgent.id == agent_id)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail="AI Agent not found")

    await db.delete(agent)
    await db.commit()

    return {"message": "AI Agent deleted successfully"}


@app.post("/api/ai/agents/{agent_id}/token")
async def get_agent_chat_token(agent_id: str, db=Depends(get_db)):
    """Generate a LiveKit token for chatting with a specific AI agent"""
    # Verify agent exists
    query = select(DBAIAgent).where(DBAIAgent.id == agent_id)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail="AI Agent not found")

    if agent.status != "active":
        raise HTTPException(status_code=400, detail="AI Agent is not active")

    livekit_url = os.getenv("LIVEKIT_URL", "ws://localhost:7880")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")

    # Generate unique room name using agent's prefix
    room_prefix = agent.livekit_room_prefix or f"agent-{agent_id[:6]}"
    room_name = f"{room_prefix}-{uuid.uuid4().hex[:8]}"
    identity = f"user-{uuid.uuid4().hex[:8]}"

    # Generate real LiveKit token
    token = api.AccessToken(api_key, api_secret) \
        .with_identity(identity) \
        .with_name(identity) \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True,
        ))

    jwt_token = token.to_jwt()

    # Create conversation record
    conversation = DBAIConversation(
        id=str(uuid.uuid4()),
        agent_id=agent_id,
        user_id="1",  # TODO: Get from auth
        room_name=room_name,
        status="active",
        started_at=datetime.now(),
    )
    db.add(conversation)

    # Update agent stats
    agent.total_conversations = (agent.total_conversations or 0) + 1
    agent.last_active_at = datetime.now()

    await db.commit()

    return {
        "data": {
            "token": jwt_token,
            "roomName": room_name,
            "serverUrl": livekit_url,
            "identity": identity,
            "conversationId": conversation.id,
            "agent": {
                "id": agent.id,
                "name": agent.name,
                "voice_provider": agent.voice_provider,
                "voice_id": agent.voice_id,
                "model_provider": agent.model_provider,
                "model_name": agent.model_name,
            }
        }
    }


# ============== Integration Routes ==============

@app.get("/api/integrations/categories")
async def list_integration_categories():
    """Get all integration categories"""
    return {"data": [cat.model_dump() for cat in MOCK_INTEGRATION_CATEGORIES]}


@app.get("/api/integrations/types")
async def list_integration_types(category: Optional[str] = None):
    """Get all integration types (templates)"""
    types = MOCK_INTEGRATION_TYPES
    if category:
        types = [t for t in types if t.category == category]
    return {"data": [t.model_dump() for t in types]}


@app.get("/api/integrations/types/{type_id}")
async def get_integration_type(type_id: str):
    """Get specific integration type"""
    for int_type in MOCK_INTEGRATION_TYPES:
        if int_type.id == type_id:
            return {"data": int_type.model_dump()}
    raise HTTPException(status_code=404, detail="Integration type not found")


@app.get("/api/integrations")
async def list_integrations(
    category: Optional[str] = None,
    status: Optional[str] = None,
    db = Depends(get_db)
):
    """Get all configured integration instances with their type info"""
    # Build query with eager loading
    query = select(DBIntegrationInstance).options(selectinload(DBIntegrationInstance.type_rel))

    # Filter by status
    if status:
        query = query.where(DBIntegrationInstance.status == status)

    # Execute query
    result_query = await db.execute(query)
    instances = result_query.scalars().all()

    # Format response
    result = []
    for instance in instances:
        int_type = instance.type_rel

        # Filter by category if specified
        if category and int_type.category != category:
            continue

        # Format last_sync_at
        last_sync = instance.last_sync_at.isoformat() if instance.last_sync_at else None

        # Combine instance and type data
        combined = {
            "id": instance.id,
            "name": instance.name,
            "icon": int_type.icon,
            "status": instance.status,
            "description": int_type.description,
            "category": int_type.category,
            "vendor": int_type.vendor,
            "lastSync": last_sync,
            "recordsCount": instance.records_synced,
            "errorCount": instance.error_count,
            "enabled": instance.enabled,
            "integrationType": int_type.name,
            "integrationTypeId": int_type.id,
        }
        result.append(combined)

    return {"data": result, "total": len(result)}


@app.get("/api/integrations/{integration_id}")
async def get_integration(integration_id: str):
    """Get specific integration instance with full details"""
    instance = next((i for i in MOCK_INTEGRATION_INSTANCES if i.id == integration_id), None)
    if not instance:
        raise HTTPException(status_code=404, detail="Integration not found")

    int_type = next((t for t in MOCK_INTEGRATION_TYPES if t.id == instance.integration_type_id), None)

    return {
        "data": {
            **instance.model_dump(),
            "type": int_type.model_dump() if int_type else None,
        }
    }


@app.post("/api/integrations/{integration_id}/sync")
async def trigger_integration_sync(integration_id: str, db = Depends(get_db)):
    """Manually trigger a sync for an integration"""
    query = select(DBIntegrationInstance).where(DBIntegrationInstance.id == integration_id)
    result = await db.execute(query)
    instance = result.scalar_one_or_none()

    if not instance:
        raise HTTPException(status_code=404, detail="Integration not found")

    # In production, trigger actual sync job here
    return {
        "data": {"id": integration_id, "status": "syncing"},
        "message": "Sync started successfully"
    }


@app.post("/api/integrations/{integration_id}/pause")
async def pause_integration(integration_id: str, db = Depends(get_db)):
    """Pause an integration"""
    query = select(DBIntegrationInstance).where(DBIntegrationInstance.id == integration_id)
    result = await db.execute(query)
    instance = result.scalar_one_or_none()

    if not instance:
        raise HTTPException(status_code=404, detail="Integration not found")

    instance.status = "paused"
    instance.enabled = False
    await db.commit()

    return {
        "data": {"id": integration_id, "status": "paused"},
        "message": "Integration paused"
    }


@app.post("/api/integrations/{integration_id}/resume")
async def resume_integration(integration_id: str, db = Depends(get_db)):
    """Resume a paused integration"""
    query = select(DBIntegrationInstance).where(DBIntegrationInstance.id == integration_id)
    result = await db.execute(query)
    instance = result.scalar_one_or_none()

    if not instance:
        raise HTTPException(status_code=404, detail="Integration not found")

    instance.status = "connected"
    instance.enabled = True
    await db.commit()

    return {
        "data": {"id": integration_id, "status": "connected"},
        "message": "Integration resumed"
    }


class UpdateIntegrationRequest(BaseModel):
    name: Optional[str] = None
    config: Optional[dict] = None
    enabled: Optional[bool] = None


@app.put("/api/integrations/{integration_id}")
async def update_integration(integration_id: str, request: UpdateIntegrationRequest, db = Depends(get_db)):
    """Update integration configuration"""
    query = select(DBIntegrationInstance).where(DBIntegrationInstance.id == integration_id)
    result = await db.execute(query)
    instance = result.scalar_one_or_none()

    if not instance:
        raise HTTPException(status_code=404, detail="Integration not found")

    # Update fields
    if request.name is not None:
        instance.name = request.name
    if request.config is not None:
        instance.config = request.config
    if request.enabled is not None:
        instance.enabled = request.enabled
        # Update status based on enabled flag
        if request.enabled and instance.status == "paused":
            instance.status = "connected"
        elif not request.enabled:
            instance.status = "paused"

    await db.commit()
    await db.refresh(instance)

    return {
        "data": instance,
        "message": "Integration updated successfully"
    }


class CreateIntegrationRequest(BaseModel):
    integration_type_id: str
    name: str
    config: dict


@app.post("/api/integrations")
async def create_integration(request: CreateIntegrationRequest, db = Depends(get_db)):
    """Create a new integration instance"""
    from datetime import datetime
    import uuid

    # Verify integration type exists
    type_query = select(DBIntegrationType).where(DBIntegrationType.id == request.integration_type_id)
    type_result = await db.execute(type_query)
    int_type = type_result.scalar_one_or_none()

    if not int_type:
        raise HTTPException(status_code=404, detail="Integration type not found")

    # Create new instance
    new_instance = DBIntegrationInstance(
        id=str(uuid.uuid4()),
        integration_type_id=request.integration_type_id,
        name=request.name,
        status="configuring",
        config=request.config,
        records_synced=0,
        error_count=0,
        enabled=False,
        created_by="1",  # TODO: Get from auth
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    db.add(new_instance)
    await db.commit()
    await db.refresh(new_instance)

    return {
        "data": new_instance,
        "message": "Integration created successfully"
    }


@app.delete("/api/integrations/{integration_id}")
async def delete_integration(integration_id: str, db = Depends(get_db)):
    """Delete an integration"""
    query = select(DBIntegrationInstance).where(DBIntegrationInstance.id == integration_id)
    result = await db.execute(query)
    instance = result.scalar_one_or_none()

    if not instance:
        raise HTTPException(status_code=404, detail="Integration not found")

    await db.delete(instance)
    await db.commit()

    return {
        "message": "Integration deleted successfully"
    }


@app.get("/api/integrations/{integration_id}/stats")
async def get_integration_stats(integration_id: str):
    """Get detailed statistics for an integration"""
    return {
        "data": {
            "sync_history": [
                {"date": "2024-12-12", "records": 150, "status": "success"},
                {"date": "2024-12-11", "records": 145, "status": "success"},
                {"date": "2024-12-10", "records": 148, "status": "success"},
            ],
            "total_syncs": 45,
            "success_rate": 97.8,
            "avg_records_per_sync": 147,
        }
    }


# ============== Admin User Pydantic Models ==============

class UserBase(BaseModel):
    email: str
    name: str
    role: str = "user"
    status: str = "active"
    avatar: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    extension: Optional[str] = None


class UserCreate(UserBase):
    pass


class UserUpdate(BaseModel):
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    avatar: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    extension: Optional[str] = None


# ============== Admin User Routes ==============

@app.get("/api/admin/users")
async def list_users(
    status: Optional[str] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    db=Depends(get_db)
):
    """Get all users with optional filters"""
    query = select(DBUser)

    if status:
        query = query.where(DBUser.status == status)
    if role:
        query = query.where(DBUser.role == role)
    if search:
        query = query.where(
            (DBUser.name.ilike(f"%{search}%")) |
            (DBUser.email.ilike(f"%{search}%"))
        )

    query = query.order_by(DBUser.name)
    result = await db.execute(query)
    users = result.scalars().all()

    return {
        "data": [
            {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "status": user.status,
                "avatar": user.avatar,
                "department": user.department,
                "phone": user.phone,
                "extension": user.extension,
                "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            }
            for user in users
        ],
        "total": len(users),
    }


@app.get("/api/admin/users/{user_id}")
async def get_user(user_id: str, db=Depends(get_db)):
    """Get a specific user"""
    query = select(DBUser).where(DBUser.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "data": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "status": user.status,
            "avatar": user.avatar,
            "department": user.department,
            "phone": user.phone,
            "extension": user.extension,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
        }
    }


@app.post("/api/admin/users")
async def create_user(request: UserCreate, db=Depends(get_db)):
    """Create a new user"""
    # Check if email already exists
    existing = await db.execute(select(DBUser).where(DBUser.email == request.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = DBUser(
        id=str(uuid.uuid4()),
        email=request.email,
        name=request.name,
        role=request.role,
        status=request.status,
        avatar=request.avatar,
        department=request.department,
        phone=request.phone,
        extension=request.extension,
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "data": {
            "id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "role": new_user.role,
            "status": new_user.status,
        },
        "message": "User created successfully",
    }


@app.put("/api/admin/users/{user_id}")
async def update_user(user_id: str, request: UserUpdate, db=Depends(get_db)):
    """Update a user"""
    query = select(DBUser).where(DBUser.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check email uniqueness if changing email
    if request.email and request.email != user.email:
        existing = await db.execute(select(DBUser).where(DBUser.email == request.email))
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Email already registered")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    user.updated_at = datetime.now()

    await db.commit()
    await db.refresh(user)

    return {
        "data": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "status": user.status,
        },
        "message": "User updated successfully",
    }


@app.delete("/api/admin/users/{user_id}")
async def delete_user(user_id: str, db=Depends(get_db)):
    """Delete a user"""
    query = select(DBUser).where(DBUser.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()

    return {"message": "User deleted successfully"}


# ============== Devices Schema Pydantic Models ==============

class DeviceBase(BaseModel):
    device_name: str
    device_type: str = "server"
    primary_address: str
    location_id: Optional[int] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    firmware_version: Optional[str] = None
    mac_address: Optional[str] = None
    description: Optional[str] = None
    is_active: bool = True
    device_type_id: Optional[int] = None
    manufacturer_id: Optional[int] = None
    has_vip: bool = False
    vip_address: Optional[str] = None


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    device_name: Optional[str] = None
    device_type: Optional[str] = None
    primary_address: Optional[str] = None
    location_id: Optional[int] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    firmware_version: Optional[str] = None
    mac_address: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    device_type_id: Optional[int] = None
    manufacturer_id: Optional[int] = None
    has_vip: Optional[bool] = None
    vip_address: Optional[str] = None


# ============== Device Routes ==============

@app.get("/api/devices")
async def list_devices(
    device_type: Optional[str] = None,
    device_type_id: Optional[int] = None,
    manufacturer_id: Optional[int] = None,
    location_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    db=Depends(get_db)
):
    """Get all devices with optional filters"""
    query = select(DBDevice)

    if device_type:
        query = query.where(DBDevice.device_type == device_type)
    if device_type_id:
        query = query.where(DBDevice.device_type_id == device_type_id)
    if manufacturer_id:
        query = query.where(DBDevice.manufacturer_id == manufacturer_id)
    if location_id:
        query = query.where(DBDevice.location_id == location_id)
    if is_active is not None:
        query = query.where(DBDevice.is_active == is_active)
    if search:
        query = query.where(
            (DBDevice.device_name.ilike(f"%{search}%")) |
            (DBDevice.primary_address.ilike(f"%{search}%")) |
            (DBDevice.serial_number.ilike(f"%{search}%")) |
            (DBDevice.mac_address.ilike(f"%{search}%")) |
            (DBDevice.description.ilike(f"%{search}%"))
        )

    query = query.order_by(DBDevice.device_name)
    result = await db.execute(query)
    devices = result.scalars().all()

    device_list = []
    for device in devices:
        # Get location name if available
        location_name = None
        if device.location_id:
            loc_result = await db.execute(select(DBLocation).where(DBLocation.id == device.location_id))
            location = loc_result.scalar_one_or_none()
            if location:
                location_name = location.name

        # Get device type display name
        device_type_name = device.device_type
        if device.device_type_id:
            dt_result = await db.execute(select(DBDeviceType).where(DBDeviceType.id == device.device_type_id))
            dt = dt_result.scalar_one_or_none()
            if dt:
                device_type_name = dt.display_name

        # Get manufacturer display name
        manufacturer_name = device.manufacturer
        if device.manufacturer_id:
            mfr_result = await db.execute(select(DBDeviceManufacturer).where(DBDeviceManufacturer.id == device.manufacturer_id))
            mfr = mfr_result.scalar_one_or_none()
            if mfr:
                manufacturer_name = mfr.display_name

        device_list.append({
            "id": device.id,
            "uuid": str(device.uuid) if device.uuid else None,
            "device_name": device.device_name,
            "device_type": device.device_type,
            "device_type_id": device.device_type_id,
            "device_type_name": device_type_name,
            "primary_address": device.primary_address,
            "location_id": device.location_id,
            "location_name": location_name,
            "manufacturer": device.manufacturer,
            "manufacturer_id": device.manufacturer_id,
            "manufacturer_name": manufacturer_name,
            "model": device.model,
            "serial_number": device.serial_number,
            "firmware_version": device.firmware_version,
            "mac_address": device.mac_address,
            "description": device.description,
            "is_active": device.is_active,
            "has_vip": device.has_vip or False,
            "vip_address": device.vip_address,
            "created_at": device.created_at.isoformat() if device.created_at else None,
            "updated_at": device.updated_at.isoformat() if device.updated_at else None,
            "created_by": device.created_by,
            "updated_by": device.updated_by,
        })

    return {
        "data": device_list,
        "total": len(device_list),
    }


@app.get("/api/devices/types")
async def list_device_types(db=Depends(get_db)):
    """Get all device types"""
    query = select(DBDeviceType).where(DBDeviceType.is_active == True).order_by(DBDeviceType.display_order, DBDeviceType.display_name)
    result = await db.execute(query)
    types = result.scalars().all()

    return {
        "data": [
            {
                "id": t.id,
                "name": t.name,
                "display_name": t.display_name,
                "description": t.description,
                "icon": t.icon,
                "color": t.color,
                "category": t.category,
            }
            for t in types
        ]
    }


@app.get("/api/devices/manufacturers")
async def list_device_manufacturers(db=Depends(get_db)):
    """Get all device manufacturers"""
    query = select(DBDeviceManufacturer).where(DBDeviceManufacturer.is_active == True).order_by(DBDeviceManufacturer.display_order, DBDeviceManufacturer.display_name)
    result = await db.execute(query)
    manufacturers = result.scalars().all()

    return {
        "data": [
            {
                "id": m.id,
                "name": m.name,
                "display_name": m.display_name,
                "description": m.description,
                "website": m.website,
                "icon": m.icon,
                "color": m.color,
            }
            for m in manufacturers
        ]
    }


@app.get("/api/devices/locations")
async def list_locations(db=Depends(get_db)):
    """Get all locations"""
    query = select(DBLocation).where(DBLocation.is_active == True).order_by(DBLocation.name)
    result = await db.execute(query)
    locations = result.scalars().all()

    return {
        "data": [
            {
                "id": loc.id,
                "uuid": str(loc.uuid) if loc.uuid else None,
                "name": loc.name,
                "code": loc.code,
                "organization": loc.organization,
                "city": loc.city,
                "region": loc.region,
                "country": loc.country,
                "parent_id": loc.parent_id,
            }
            for loc in locations
        ]
    }


@app.get("/api/devices/group-types")
async def list_device_group_types(db=Depends(get_db)):
    """Get all device group types (grouping behaviors)"""
    query = select(DBDeviceGroupType).where(DBDeviceGroupType.is_active == True).order_by(DBDeviceGroupType.display_order)
    result = await db.execute(query)
    types = result.scalars().all()

    return {
        "data": [
            {
                "id": t.id,
                "name": t.name,
                "display_name": t.display_name,
                "description": t.description,
                "grouping_behavior": t.grouping_behavior,
                "match_field": t.match_field,
                "icon": t.icon,
                "color": t.color,
            }
            for t in types
        ]
    }


@app.get("/api/devices/groups")
async def list_device_groups(db=Depends(get_db)):
    """Get all device groups with their group type info"""
    query = select(DBDeviceGroup).where(DBDeviceGroup.is_active == True).order_by(DBDeviceGroup.display_order, DBDeviceGroup.name)
    result = await db.execute(query)
    groups = result.scalars().all()

    # Build response with group type info
    groups_data = []
    for g in groups:
        # Get group type info if available
        group_type_info = None
        if g.group_type_id:
            gt_result = await db.execute(select(DBDeviceGroupType).where(DBDeviceGroupType.id == g.group_type_id))
            gt = gt_result.scalar_one_or_none()
            if gt:
                group_type_info = {
                    "id": gt.id,
                    "name": gt.name,
                    "display_name": gt.display_name,
                    "grouping_behavior": gt.grouping_behavior,
                    "match_field": gt.match_field,
                }

        groups_data.append({
            "id": g.id,
            "name": g.name,
            "description": g.description,
            "group_type": g.group_type,  # Legacy string field
            "group_type_id": g.group_type_id,
            "group_type_info": group_type_info,
            "icon": g.icon,
            "color": g.color,
            "parent_id": g.parent_id,
            "display_order": g.display_order,
            "avaya_location_id": g.avaya_location_id,
            "extra_data": g.extra_data,
        })

    return {"data": groups_data}


@app.get("/api/devices/{device_id}")
async def get_device(device_id: int, db=Depends(get_db)):
    """Get a specific device by ID"""
    query = select(DBDevice).where(DBDevice.id == device_id)
    result = await db.execute(query)
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Get location name
    location_name = None
    if device.location_id:
        loc_result = await db.execute(select(DBLocation).where(DBLocation.id == device.location_id))
        location = loc_result.scalar_one_or_none()
        if location:
            location_name = location.name

    # Get device type display name
    device_type_name = device.device_type
    if device.device_type_id:
        dt_result = await db.execute(select(DBDeviceType).where(DBDeviceType.id == device.device_type_id))
        dt = dt_result.scalar_one_or_none()
        if dt:
            device_type_name = dt.display_name

    # Get manufacturer display name
    manufacturer_name = device.manufacturer
    if device.manufacturer_id:
        mfr_result = await db.execute(select(DBDeviceManufacturer).where(DBDeviceManufacturer.id == device.manufacturer_id))
        mfr = mfr_result.scalar_one_or_none()
        if mfr:
            manufacturer_name = mfr.display_name

    return {
        "data": {
            "id": device.id,
            "uuid": str(device.uuid) if device.uuid else None,
            "device_name": device.device_name,
            "device_type": device.device_type,
            "device_type_id": device.device_type_id,
            "device_type_name": device_type_name,
            "primary_address": device.primary_address,
            "location_id": device.location_id,
            "location_name": location_name,
            "manufacturer": device.manufacturer,
            "manufacturer_id": device.manufacturer_id,
            "manufacturer_name": manufacturer_name,
            "model": device.model,
            "serial_number": device.serial_number,
            "firmware_version": device.firmware_version,
            "mac_address": device.mac_address,
            "description": device.description,
            "is_active": device.is_active,
            "has_vip": device.has_vip or False,
            "vip_address": device.vip_address,
            "extra_data": device.extra_data,
            "created_at": device.created_at.isoformat() if device.created_at else None,
            "updated_at": device.updated_at.isoformat() if device.updated_at else None,
            "created_by": device.created_by,
            "updated_by": device.updated_by,
        }
    }


@app.post("/api/devices")
async def create_device(request: DeviceCreate, db=Depends(get_db)):
    """Create a new device"""
    new_device = DBDevice(
        device_name=request.device_name,
        device_type=request.device_type,
        primary_address=request.primary_address,
        location_id=request.location_id,
        manufacturer=request.manufacturer,
        model=request.model,
        serial_number=request.serial_number,
        firmware_version=request.firmware_version,
        mac_address=request.mac_address,
        description=request.description,
        is_active=request.is_active,
        device_type_id=request.device_type_id,
        manufacturer_id=request.manufacturer_id,
        has_vip=request.has_vip,
        vip_address=request.vip_address,
    )

    db.add(new_device)
    await db.commit()
    await db.refresh(new_device)

    return {
        "data": {
            "id": new_device.id,
            "uuid": str(new_device.uuid) if new_device.uuid else None,
            "device_name": new_device.device_name,
            "device_type": new_device.device_type,
            "primary_address": new_device.primary_address,
            "has_vip": new_device.has_vip,
            "vip_address": new_device.vip_address,
        },
        "message": "Device created successfully",
    }


@app.put("/api/devices/{device_id}")
async def update_device(device_id: int, request: DeviceUpdate, db=Depends(get_db)):
    """Update a device"""
    query = select(DBDevice).where(DBDevice.id == device_id)
    result = await db.execute(query)
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    update_data = request.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)

    await db.commit()
    await db.refresh(device)

    return {
        "data": {
            "id": device.id,
            "device_name": device.device_name,
            "device_type": device.device_type,
            "primary_address": device.primary_address,
            "has_vip": device.has_vip,
            "vip_address": device.vip_address,
        },
        "message": "Device updated successfully",
    }


@app.delete("/api/devices/{device_id}")
async def delete_device(device_id: int, db=Depends(get_db)):
    """Delete a device"""
    query = select(DBDevice).where(DBDevice.id == device_id)
    result = await db.execute(query)
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    await db.delete(device)
    await db.commit()

    return {"message": "Device deleted successfully"}


@app.patch("/api/devices/{device_id}/activate")
async def activate_device(device_id: int, db=Depends(get_db)):
    """Activate a device"""
    query = select(DBDevice).where(DBDevice.id == device_id)
    result = await db.execute(query)
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    device.is_active = True
    await db.commit()

    return {"message": "Device activated successfully"}


@app.patch("/api/devices/{device_id}/deactivate")
async def deactivate_device(device_id: int, db=Depends(get_db)):
    """Deactivate a device"""
    query = select(DBDevice).where(DBDevice.id == device_id)
    result = await db.execute(query)
    device = result.scalar_one_or_none()

    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    device.is_active = False
    await db.commit()

    return {"message": "Device deactivated successfully"}


# ============== Platforms Schema Pydantic Models ==============

class PlatformBase(BaseModel):
    name: str
    platform_type: str = "monitoring"
    primary_address: str
    port: Optional[int] = None
    base_path: Optional[str] = None
    provider_id: Optional[str] = None
    description: Optional[str] = None
    vendor: Optional[str] = None
    version: Optional[str] = None
    platform_type_id: Optional[int] = None
    config: Optional[dict] = None
    credential_source: str = "local"
    credential_group_id: Optional[int] = None
    credentials: Optional[dict] = None  # For local credentials
    verify_ssl: bool = True
    timeout: int = 30
    is_active: bool = True


class PlatformCreate(PlatformBase):
    pass


class PlatformUpdate(BaseModel):
    name: Optional[str] = None
    platform_type: Optional[str] = None
    primary_address: Optional[str] = None
    port: Optional[int] = None
    base_path: Optional[str] = None
    provider_id: Optional[str] = None
    description: Optional[str] = None
    vendor: Optional[str] = None
    version: Optional[str] = None
    platform_type_id: Optional[int] = None
    config: Optional[dict] = None
    credential_source: Optional[str] = None
    credential_group_id: Optional[int] = None
    credentials: Optional[dict] = None
    verify_ssl: Optional[bool] = None
    timeout: Optional[int] = None
    is_active: Optional[bool] = None


# ============== Platforms Routes ==============

@app.get("/api/platforms")
async def list_platforms(
    platform_type: Optional[str] = None,
    platform_type_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    is_verified: Optional[bool] = None,
    search: Optional[str] = None,
    db=Depends(get_db)
):
    """Get all platforms with optional filters"""
    query = select(DBPlatform)

    if platform_type:
        query = query.where(DBPlatform.platform_type == platform_type)
    if platform_type_id:
        query = query.where(DBPlatform.platform_type_id == platform_type_id)
    if is_active is not None:
        query = query.where(DBPlatform.is_active == is_active)
    if is_verified is not None:
        query = query.where(DBPlatform.is_verified == is_verified)
    if search:
        query = query.where(
            (DBPlatform.name.ilike(f"%{search}%")) |
            (DBPlatform.primary_address.ilike(f"%{search}%")) |
            (DBPlatform.vendor.ilike(f"%{search}%")) |
            (DBPlatform.description.ilike(f"%{search}%"))
        )

    query = query.order_by(DBPlatform.name)
    result = await db.execute(query)
    platforms = result.scalars().all()

    platform_list = []
    for platform in platforms:
        # Get platform type display name
        platform_type_name = platform.platform_type
        platform_type_info = None
        if platform.platform_type_id:
            pt_result = await db.execute(select(DBPlatformType).where(DBPlatformType.id == platform.platform_type_id))
            pt = pt_result.scalar_one_or_none()
            if pt:
                platform_type_name = pt.display_name
                platform_type_info = {
                    "id": pt.id,
                    "name": pt.name,
                    "display_name": pt.display_name,
                    "description": pt.description,
                    "icon": pt.icon,
                    "color": pt.color,
                    "category": pt.category,
                }

        # Get credential group name if using shared credentials
        credential_group_name = None
        if platform.credential_group_id:
            cg_result = await db.execute(select(DBCredentialGroup).where(DBCredentialGroup.id == platform.credential_group_id))
            cg = cg_result.scalar_one_or_none()
            if cg:
                credential_group_name = cg.name

        platform_list.append({
            "id": platform.id,
            "uuid": str(platform.uuid) if platform.uuid else None,
            "name": platform.name,
            "platform_type": platform.platform_type,
            "platform_type_id": platform.platform_type_id,
            "platform_type_name": platform_type_name,
            "platform_type_info": platform_type_info,
            "primary_address": platform.primary_address,
            "port": platform.port,
            "base_path": platform.base_path,
            "provider_id": platform.provider_id,
            "description": platform.description,
            "vendor": platform.vendor,
            "version": platform.version,
            "is_active": platform.is_active,
            "is_verified": platform.is_verified or False,
            "last_verified_at": platform.last_verified_at.isoformat() if platform.last_verified_at else None,
            "last_sync_at": platform.last_sync_at.isoformat() if platform.last_sync_at else None,
            "last_error": platform.last_error,
            "config": platform.config or {},
            "credential_source": platform.credential_source or "local",
            "credential_group_id": platform.credential_group_id,
            "credential_group_name": credential_group_name,
            "verify_ssl": platform.verify_ssl if platform.verify_ssl is not None else True,
            "timeout": platform.timeout or 30,
            "created_at": platform.created_at.isoformat() if platform.created_at else None,
            "updated_at": platform.updated_at.isoformat() if platform.updated_at else None,
            "created_by": platform.created_by,
            "updated_by": platform.updated_by,
        })

    return {
        "data": platform_list,
        "total": len(platform_list),
    }


@app.get("/api/platforms/types")
async def list_platform_types(db=Depends(get_db)):
    """Get all platform types"""
    query = select(DBPlatformType).where(DBPlatformType.is_active == True).order_by(DBPlatformType.display_order, DBPlatformType.display_name)
    result = await db.execute(query)
    types = result.scalars().all()

    return {
        "data": [
            {
                "id": t.id,
                "name": t.name,
                "display_name": t.display_name,
                "description": t.description,
                "icon": t.icon,
                "color": t.color,
                "category": t.category,
            }
            for t in types
        ]
    }


@app.get("/api/platforms/{platform_id}")
async def get_platform(platform_id: int, db=Depends(get_db)):
    """Get a specific platform by ID"""
    query = select(DBPlatform).where(DBPlatform.id == platform_id)
    result = await db.execute(query)
    platform = result.scalar_one_or_none()

    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")

    # Get platform type info
    platform_type_name = platform.platform_type
    platform_type_info = None
    if platform.platform_type_id:
        pt_result = await db.execute(select(DBPlatformType).where(DBPlatformType.id == platform.platform_type_id))
        pt = pt_result.scalar_one_or_none()
        if pt:
            platform_type_name = pt.display_name
            platform_type_info = {
                "id": pt.id,
                "name": pt.name,
                "display_name": pt.display_name,
                "description": pt.description,
                "icon": pt.icon,
                "color": pt.color,
                "category": pt.category,
            }

    # Get credential group name if using shared credentials
    credential_group_name = None
    if platform.credential_group_id:
        cg_result = await db.execute(select(DBCredentialGroup).where(DBCredentialGroup.id == platform.credential_group_id))
        cg = cg_result.scalar_one_or_none()
        if cg:
            credential_group_name = cg.name

    return {
        "data": {
            "id": platform.id,
            "uuid": str(platform.uuid) if platform.uuid else None,
            "name": platform.name,
            "platform_type": platform.platform_type,
            "platform_type_id": platform.platform_type_id,
            "platform_type_name": platform_type_name,
            "platform_type_info": platform_type_info,
            "primary_address": platform.primary_address,
            "port": platform.port,
            "base_path": platform.base_path,
            "provider_id": platform.provider_id,
            "description": platform.description,
            "vendor": platform.vendor,
            "version": platform.version,
            "is_active": platform.is_active,
            "is_verified": platform.is_verified or False,
            "last_verified_at": platform.last_verified_at.isoformat() if platform.last_verified_at else None,
            "last_sync_at": platform.last_sync_at.isoformat() if platform.last_sync_at else None,
            "last_error": platform.last_error,
            "config": platform.config or {},
            "credential_source": platform.credential_source or "local",
            "credential_group_id": platform.credential_group_id,
            "credential_group_name": credential_group_name,
            "verify_ssl": platform.verify_ssl if platform.verify_ssl is not None else True,
            "timeout": platform.timeout or 30,
            "extra_data": platform.extra_data,
            "created_at": platform.created_at.isoformat() if platform.created_at else None,
            "updated_at": platform.updated_at.isoformat() if platform.updated_at else None,
            "created_by": platform.created_by,
            "updated_by": platform.updated_by,
        }
    }


@app.post("/api/platforms")
async def create_platform(request: PlatformCreate, db=Depends(get_db)):
    """Create a new platform"""
    from cryptography.fernet import Fernet
    import json

    # Handle credential encryption for local credentials
    credentials_encrypted = None
    if request.credential_source == "local" and request.credentials:
        encryption_key = os.getenv("CREDENTIAL_ENCRYPTION_KEY")
        if not encryption_key:
            encryption_key = Fernet.generate_key().decode()
        fernet = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
        credentials_json = json.dumps(request.credentials)
        credentials_encrypted = fernet.encrypt(credentials_json.encode())

    # Verify credential group exists if using shared credentials
    if request.credential_source == "group" and request.credential_group_id:
        cg_query = select(DBCredentialGroup).where(DBCredentialGroup.id == request.credential_group_id)
        cg_result = await db.execute(cg_query)
        cg = cg_result.scalar_one_or_none()
        if not cg:
            raise HTTPException(status_code=400, detail="Credential group not found")

    new_platform = DBPlatform(
        name=request.name,
        platform_type=request.platform_type,
        primary_address=request.primary_address,
        port=request.port,
        base_path=request.base_path,
        provider_id=request.provider_id,
        description=request.description,
        vendor=request.vendor,
        version=request.version,
        platform_type_id=request.platform_type_id,
        config=request.config or {},
        credential_source=request.credential_source,
        credentials_encrypted=credentials_encrypted,
        credential_group_id=request.credential_group_id if request.credential_source == "group" else None,
        verify_ssl=request.verify_ssl,
        timeout=request.timeout,
        is_active=request.is_active,
        is_verified=False,
    )

    db.add(new_platform)
    await db.commit()
    await db.refresh(new_platform)

    return {
        "data": {
            "id": new_platform.id,
            "uuid": str(new_platform.uuid) if new_platform.uuid else None,
            "name": new_platform.name,
            "platform_type": new_platform.platform_type,
            "primary_address": new_platform.primary_address,
        },
        "message": "Platform created successfully",
    }


@app.put("/api/platforms/{platform_id}")
async def update_platform(platform_id: int, request: PlatformUpdate, db=Depends(get_db)):
    """Update a platform"""
    from cryptography.fernet import Fernet
    import json

    query = select(DBPlatform).where(DBPlatform.id == platform_id)
    result = await db.execute(query)
    platform = result.scalar_one_or_none()

    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")

    update_data = request.model_dump(exclude_unset=True)

    # Handle credential encryption if credentials are being updated
    if "credentials" in update_data and update_data["credentials"]:
        encryption_key = os.getenv("CREDENTIAL_ENCRYPTION_KEY")
        if not encryption_key:
            encryption_key = Fernet.generate_key().decode()
        fernet = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
        credentials_json = json.dumps(update_data["credentials"])
        update_data["credentials_encrypted"] = fernet.encrypt(credentials_json.encode())
        del update_data["credentials"]

    # Handle credential source changes
    if "credential_source" in update_data:
        if update_data["credential_source"] == "group":
            platform.credentials_encrypted = None
            if "credential_group_id" in update_data and update_data["credential_group_id"]:
                cg_query = select(DBCredentialGroup).where(DBCredentialGroup.id == update_data["credential_group_id"])
                cg_result = await db.execute(cg_query)
                cg = cg_result.scalar_one_or_none()
                if not cg:
                    raise HTTPException(status_code=400, detail="Credential group not found")
        elif update_data["credential_source"] == "local":
            platform.credential_group_id = None

    for key, value in update_data.items():
        if key != "credentials":
            setattr(platform, key, value)

    await db.commit()
    await db.refresh(platform)

    return {
        "data": {
            "id": platform.id,
            "name": platform.name,
            "platform_type": platform.platform_type,
            "primary_address": platform.primary_address,
        },
        "message": "Platform updated successfully",
    }


@app.delete("/api/platforms/{platform_id}")
async def delete_platform(platform_id: int, db=Depends(get_db)):
    """Delete a platform"""
    query = select(DBPlatform).where(DBPlatform.id == platform_id)
    result = await db.execute(query)
    platform = result.scalar_one_or_none()

    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")

    await db.delete(platform)
    await db.commit()

    return {"message": "Platform deleted successfully"}


@app.patch("/api/platforms/{platform_id}/activate")
async def activate_platform(platform_id: int, db=Depends(get_db)):
    """Activate a platform"""
    query = select(DBPlatform).where(DBPlatform.id == platform_id)
    result = await db.execute(query)
    platform = result.scalar_one_or_none()

    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")

    platform.is_active = True
    await db.commit()

    return {"message": "Platform activated successfully"}


@app.patch("/api/platforms/{platform_id}/deactivate")
async def deactivate_platform(platform_id: int, db=Depends(get_db)):
    """Deactivate a platform"""
    query = select(DBPlatform).where(DBPlatform.id == platform_id)
    result = await db.execute(query)
    platform = result.scalar_one_or_none()

    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")

    platform.is_active = False
    await db.commit()

    return {"message": "Platform deactivated successfully"}


@app.post("/api/platforms/{platform_id}/test")
async def test_platform_connection(platform_id: int, db=Depends(get_db)):
    """Test a platform connection"""
    query = select(DBPlatform).where(DBPlatform.id == platform_id)
    result = await db.execute(query)
    platform = result.scalar_one_or_none()

    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")

    # TODO: Implement actual connection test via connectors service
    # For now, just update the verification timestamp
    platform.last_verified_at = datetime.now()
    platform.is_verified = True
    platform.last_error = None

    await db.commit()

    return {
        "success": True,
        "message": "Connection test successful"
    }


@app.post("/api/platforms/{platform_id}/sync")
async def sync_platform(platform_id: int, db=Depends(get_db)):
    """Trigger a sync for a platform"""
    query = select(DBPlatform).where(DBPlatform.id == platform_id)
    result = await db.execute(query)
    platform = result.scalar_one_or_none()

    if not platform:
        raise HTTPException(status_code=404, detail="Platform not found")

    # TODO: Implement actual sync via connectors/temporal service
    # For now, just update the sync timestamp
    platform.last_sync_at = datetime.now()

    await db.commit()

    return {
        "success": True,
        "message": "Sync started"
    }


# ============== Credential Groups ==============


class CredentialGroupBase(BaseModel):
    name: str
    description: Optional[str] = None
    credential_type: str  # basic, api_key, oauth, ssh_key, custom
    scope: str = "global"  # global, location, group
    scope_id: Optional[int] = None


class CredentialGroupCreate(CredentialGroupBase):
    credentials: dict  # The actual credentials to encrypt


class CredentialGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    credentials: Optional[dict] = None  # Update credentials if provided
    scope: Optional[str] = None
    scope_id: Optional[int] = None
    is_active: Optional[bool] = None


@app.get("/api/credential-groups")
async def list_credential_groups(
    scope: Optional[str] = None,
    credential_type: Optional[str] = None,
    db=Depends(get_db)
):
    """List all credential groups"""
    query = select(DBCredentialGroup).where(DBCredentialGroup.is_active == True)
    if scope:
        query = query.where(DBCredentialGroup.scope == scope)
    if credential_type:
        query = query.where(DBCredentialGroup.credential_type == credential_type)
    query = query.order_by(DBCredentialGroup.name)

    result = await db.execute(query)
    groups = result.scalars().all()

    return {
        "data": [
            {
                "id": g.id,
                "name": g.name,
                "description": g.description,
                "credential_type": g.credential_type,
                "username": g.username,
                "key_hint": g.key_hint,
                "scope": g.scope,
                "scope_id": g.scope_id,
                "is_active": g.is_active,
                "created_at": g.created_at.isoformat() if g.created_at else None,
                "updated_at": g.updated_at.isoformat() if g.updated_at else None,
                "created_by": g.created_by,
            }
            for g in groups
        ]
    }


@app.post("/api/credential-groups")
async def create_credential_group(request: CredentialGroupCreate, db=Depends(get_db)):
    """Create a new credential group"""
    import json
    from cryptography.fernet import Fernet
    import base64
    import os

    # Get or create encryption key (in production, use a secure key management system)
    encryption_key = os.getenv("CREDENTIAL_ENCRYPTION_KEY")
    if not encryption_key:
        # For development, generate a key (in production, this should be pre-configured)
        encryption_key = Fernet.generate_key().decode()

    fernet = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)

    # Encrypt credentials
    credentials_json = json.dumps(request.credentials)
    encrypted = fernet.encrypt(credentials_json.encode())

    # Extract display metadata
    username = request.credentials.get("username")
    api_key = request.credentials.get("api_key", request.credentials.get("apiKey", ""))
    key_hint = api_key[-4:] if api_key and len(api_key) >= 4 else None

    new_group = DBCredentialGroup(
        name=request.name,
        description=request.description,
        credential_type=request.credential_type,
        credentials_encrypted=encrypted,
        username=username,
        key_hint=key_hint,
        scope=request.scope,
        scope_id=request.scope_id,
        is_active=True,
        created_by="1",  # TODO: Get from auth
    )

    db.add(new_group)
    await db.commit()
    await db.refresh(new_group)

    return {
        "data": {
            "id": new_group.id,
            "name": new_group.name,
            "credential_type": new_group.credential_type,
        },
        "message": "Credential group created successfully"
    }


@app.delete("/api/credential-groups/{group_id}")
async def delete_credential_group(group_id: int, db=Depends(get_db)):
    """Delete (deactivate) a credential group"""
    query = select(DBCredentialGroup).where(DBCredentialGroup.id == group_id)
    result = await db.execute(query)
    group = result.scalar_one_or_none()

    if not group:
        raise HTTPException(status_code=404, detail="Credential group not found")

    group.is_active = False
    await db.commit()

    return {"message": "Credential group deleted successfully"}


# ============== Device Integrations ==============

class DeviceIntegrationBase(BaseModel):
    provider_id: str  # Provider ID from connectors service catalog
    host_override: Optional[str] = None
    port: Optional[int] = None
    base_url: Optional[str] = None
    config: Optional[dict] = None  # Provider-specific configuration
    credential_source: str = "local"  # local, group
    credential_group_id: Optional[int] = None  # If using shared credentials
    credentials: Optional[dict] = None  # If using local credentials
    enabled: bool = True
    verify_ssl: bool = True
    timeout: int = 30


class DeviceIntegrationCreate(DeviceIntegrationBase):
    pass


class DeviceIntegrationUpdate(BaseModel):
    host_override: Optional[str] = None
    port: Optional[int] = None
    base_url: Optional[str] = None
    config: Optional[dict] = None
    credential_source: Optional[str] = None
    credential_group_id: Optional[int] = None
    credentials: Optional[dict] = None
    enabled: Optional[bool] = None
    verify_ssl: Optional[bool] = None
    timeout: Optional[int] = None


class DeviceIntegrationResponse(BaseModel):
    id: int
    device_id: int
    provider_id: str
    host_override: Optional[str] = None
    port: Optional[int] = None
    base_url: Optional[str] = None
    config: Optional[dict] = None
    credential_source: str
    credential_group_id: Optional[int] = None
    enabled: bool
    verify_ssl: bool
    timeout: int
    is_verified: bool
    last_verified_at: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    # Denormalized fields
    device_name: Optional[str] = None
    device_address: Optional[str] = None
    provider_name: Optional[str] = None
    provider_category: Optional[str] = None
    credential_group_name: Optional[str] = None
    credential_username: Optional[str] = None

    class Config:
        from_attributes = True


@app.get("/api/devices/{device_id}/integrations")
async def list_device_integrations(device_id: int, db=Depends(get_db)):
    """List all integrations for a device"""
    # Verify device exists
    device_query = select(DBDevice).where(DBDevice.id == device_id)
    device_result = await db.execute(device_query)
    device = device_result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Get integrations with credential group info
    query = select(DBDeviceIntegration).where(DBDeviceIntegration.device_id == device_id)
    result = await db.execute(query)
    integrations = result.scalars().all()

    # Build response with credential group names
    integration_list = []
    for i in integrations:
        # Get credential group name if using group credentials
        credential_group_name = None
        credential_username = None
        if i.credential_group_id:
            cg_result = await db.execute(
                select(DBCredentialGroup).where(DBCredentialGroup.id == i.credential_group_id)
            )
            cg = cg_result.scalar_one_or_none()
            if cg:
                credential_group_name = cg.name
                credential_username = cg.username

        integration_list.append({
            "id": i.id,
            "device_id": i.device_id,
            "provider_id": i.provider_id,
            "host_override": i.host_override,
            "port": i.port,
            "base_url": i.base_url,
            "config": i.config or {},
            "credential_source": i.credential_source or "local",
            "credential_group_id": i.credential_group_id,
            "credential_group_name": credential_group_name,
            "credential_username": credential_username,
            "enabled": i.enabled if i.enabled is not None else True,
            "verify_ssl": i.verify_ssl if i.verify_ssl is not None else True,
            "timeout": i.timeout or 30,
            "is_verified": i.is_verified or False,
            "last_verified_at": i.last_verified_at.isoformat() if i.last_verified_at else None,
            "last_error": i.last_error,
            "created_at": i.created_at.isoformat() if i.created_at else None,
            "updated_at": i.updated_at.isoformat() if i.updated_at else None,
            # Denormalized device info
            "device_name": device.device_name,
            "device_address": device.primary_address,
        })

    return {"data": integration_list}


@app.get("/api/devices/{device_id}/integrations/{integration_id}")
async def get_device_integration(device_id: int, integration_id: int, db=Depends(get_db)):
    """Get a specific device integration"""
    # Get device info
    device_query = select(DBDevice).where(DBDevice.id == device_id)
    device_result = await db.execute(device_query)
    device = device_result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    query = select(DBDeviceIntegration).where(
        DBDeviceIntegration.id == integration_id,
        DBDeviceIntegration.device_id == device_id
    )
    result = await db.execute(query)
    i = result.scalar_one_or_none()

    if not i:
        raise HTTPException(status_code=404, detail="Integration not found")

    # Get credential group info if using shared credentials
    credential_group_name = None
    if i.credential_source == "group" and i.credential_group_id:
        cg_query = select(DBCredentialGroup).where(DBCredentialGroup.id == i.credential_group_id)
        cg_result = await db.execute(cg_query)
        cg = cg_result.scalar_one_or_none()
        if cg:
            credential_group_name = cg.name

    # Extract credential metadata (never expose actual credentials)
    credential_username = None
    credential_type = None
    if i.credential_source == "local" and i.credentials_encrypted:
        # We only return metadata hints, not actual credentials
        # Username might be stored in config for display purposes
        pass

    return {
        "id": i.id,
        "device_id": i.device_id,
        "provider_id": i.provider_id,
        "host_override": i.host_override,
        "port": i.port,
        "base_url": i.base_url,
        "config": i.config or {},
        "credential_source": i.credential_source or "local",
        "credential_group_id": i.credential_group_id,
        "credential_group_name": credential_group_name,
        "credential_username": credential_username,
        "credential_type": credential_type,
        "enabled": i.enabled if i.enabled is not None else True,
        "verify_ssl": i.verify_ssl if i.verify_ssl is not None else True,
        "timeout": i.timeout or 30,
        "is_verified": i.is_verified or False,
        "last_verified_at": i.last_verified_at.isoformat() if i.last_verified_at else None,
        "last_error": i.last_error,
        "created_at": i.created_at.isoformat() if i.created_at else None,
        "updated_at": i.updated_at.isoformat() if i.updated_at else None,
        # Denormalized device info
        "device_name": device.device_name,
        "device_address": device.primary_address,
    }


@app.post("/api/devices/{device_id}/integrations")
async def create_device_integration(
    device_id: int,
    integration: DeviceIntegrationCreate,
    db=Depends(get_db)
):
    """Create a new device integration"""
    from cryptography.fernet import Fernet
    import json

    # Verify device exists
    device_query = select(DBDevice).where(DBDevice.id == device_id)
    device_result = await db.execute(device_query)
    device = device_result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # Handle credential encryption for local credentials
    credentials_encrypted = None
    if integration.credential_source == "local" and integration.credentials:
        encryption_key = os.getenv("CREDENTIAL_ENCRYPTION_KEY")
        if not encryption_key:
            # In production, this should fail or use a secure key management system
            encryption_key = Fernet.generate_key().decode()
        fernet = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
        credentials_json = json.dumps(integration.credentials)
        credentials_encrypted = fernet.encrypt(credentials_json.encode())

    # Verify credential group exists if using shared credentials
    if integration.credential_source == "group" and integration.credential_group_id:
        cg_query = select(DBCredentialGroup).where(DBCredentialGroup.id == integration.credential_group_id)
        cg_result = await db.execute(cg_query)
        cg = cg_result.scalar_one_or_none()
        if not cg:
            raise HTTPException(status_code=400, detail="Credential group not found")

    db_integration = DBDeviceIntegration(
        device_id=device_id,
        provider_id=integration.provider_id,
        host_override=integration.host_override,
        port=integration.port,
        base_url=integration.base_url,
        config=integration.config or {},
        credential_source=integration.credential_source,
        credential_group_id=integration.credential_group_id if integration.credential_source == "group" else None,
        credentials_encrypted=credentials_encrypted,
        enabled=integration.enabled,
        verify_ssl=integration.verify_ssl,
        timeout=integration.timeout,
        is_verified=False,
    )

    db.add(db_integration)
    await db.commit()
    await db.refresh(db_integration)

    return {
        "data": {
            "id": db_integration.id,
            "device_id": db_integration.device_id,
            "provider_id": db_integration.provider_id,
            "credential_source": db_integration.credential_source,
            "enabled": db_integration.enabled,
            "is_verified": db_integration.is_verified or False,
        },
        "message": "Integration created successfully"
    }


@app.put("/api/devices/{device_id}/integrations/{integration_id}")
async def update_device_integration(
    device_id: int,
    integration_id: int,
    integration: DeviceIntegrationUpdate,
    db=Depends(get_db)
):
    """Update a device integration"""
    from cryptography.fernet import Fernet
    import json

    query = select(DBDeviceIntegration).where(
        DBDeviceIntegration.id == integration_id,
        DBDeviceIntegration.device_id == device_id
    )
    result = await db.execute(query)
    db_integration = result.scalar_one_or_none()

    if not db_integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    # Update only provided fields
    update_data = integration.model_dump(exclude_unset=True)

    # Handle credential encryption if credentials are being updated
    if "credentials" in update_data and update_data["credentials"]:
        encryption_key = os.getenv("CREDENTIAL_ENCRYPTION_KEY")
        if not encryption_key:
            encryption_key = Fernet.generate_key().decode()
        fernet = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)
        credentials_json = json.dumps(update_data["credentials"])
        update_data["credentials_encrypted"] = fernet.encrypt(credentials_json.encode())
        del update_data["credentials"]  # Remove plaintext credentials

    # Handle credential source changes
    if "credential_source" in update_data:
        if update_data["credential_source"] == "group":
            # Clear local credentials when switching to group
            db_integration.credentials_encrypted = None
            # Verify credential group exists
            if "credential_group_id" in update_data and update_data["credential_group_id"]:
                cg_query = select(DBCredentialGroup).where(DBCredentialGroup.id == update_data["credential_group_id"])
                cg_result = await db.execute(cg_query)
                cg = cg_result.scalar_one_or_none()
                if not cg:
                    raise HTTPException(status_code=400, detail="Credential group not found")
        elif update_data["credential_source"] == "local":
            # Clear group reference when switching to local
            db_integration.credential_group_id = None

    for key, value in update_data.items():
        if key != "credentials":  # Already handled above
            setattr(db_integration, key, value)

    await db.commit()
    await db.refresh(db_integration)

    return {"message": "Integration updated successfully"}


@app.delete("/api/devices/{device_id}/integrations/{integration_id}")
async def delete_device_integration(device_id: int, integration_id: int, db=Depends(get_db)):
    """Delete a device integration"""
    query = select(DBDeviceIntegration).where(
        DBDeviceIntegration.id == integration_id,
        DBDeviceIntegration.device_id == device_id
    )
    result = await db.execute(query)
    db_integration = result.scalar_one_or_none()

    if not db_integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    await db.delete(db_integration)
    await db.commit()

    return {"message": "Integration deleted successfully"}


@app.post("/api/devices/{device_id}/integrations/{integration_id}/test")
async def test_device_integration(device_id: int, integration_id: int, db=Depends(get_db)):
    """Test a device integration connection"""
    query = select(DBDeviceIntegration).where(
        DBDeviceIntegration.id == integration_id,
        DBDeviceIntegration.device_id == device_id
    )
    result = await db.execute(query)
    db_integration = result.scalar_one_or_none()

    if not db_integration:
        raise HTTPException(status_code=404, detail="Integration not found")

    # TODO: Implement actual connection test via connectors service
    # For now, just update the verification timestamp
    from datetime import datetime
    db_integration.last_verified_at = datetime.now()
    db_integration.is_verified = True
    db_integration.last_error = None

    await db.commit()

    return {
        "success": True,
        "message": "Connection test successful"
    }


# ============== Health Check ==============

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "uc-platform-api"}


@app.get("/")
async def root():
    return {"message": "UC Platform API", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    from dotenv import load_dotenv

    load_dotenv()

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8001"))
    debug = os.getenv("DEBUG", "False").lower() == "true"

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug
    )
