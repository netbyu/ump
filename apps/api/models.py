"""
Database ORM Models
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, JSON, Text, Numeric
from sqlalchemy.dialects.postgresql import UUID, JSONB, BYTEA
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class IntegrationCategory(Base):
    __tablename__ = "integration_categories"
    __table_args__ = {"schema": "integrations"}

    id = Column(String, primary_key=True)
    key = Column(String, unique=True, nullable=False, index=True)
    label = Column(String, nullable=False)
    icon = Column(String)
    description = Column(Text)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    integration_types = relationship("IntegrationType", back_populates="category_rel")


class IntegrationType(Base):
    __tablename__ = "integration_types"
    __table_args__ = {"schema": "integrations"}

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    category = Column(String, ForeignKey("integrations.integration_categories.key"), nullable=False)
    icon = Column(String)
    description = Column(Text)
    vendor = Column(String)
    documentation_url = Column(String)
    config_schema = Column(JSON, nullable=False, default={})
    supported_features = Column(JSON, nullable=False, default=[])
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    category_rel = relationship("IntegrationCategory", back_populates="integration_types")
    instances = relationship("IntegrationInstance", back_populates="type_rel")


class IntegrationInstance(Base):
    __tablename__ = "integration_instances"
    __table_args__ = {"schema": "integrations"}

    id = Column(String, primary_key=True)
    integration_type_id = Column(String, ForeignKey("integrations.integration_types.id"), nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False, default="configuring")  # connected, warning, paused, disconnected, configuring
    config = Column(JSON, nullable=False, default={})
    last_sync_at = Column(DateTime(timezone=True))
    last_sync_status = Column(String)  # success, failed, partial
    records_synced = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    enabled = Column(Boolean, default=True)
    created_by = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    type_rel = relationship("IntegrationType", back_populates="instances")


class IntegrationSyncLog(Base):
    __tablename__ = "integration_sync_logs"
    __table_args__ = {"schema": "integrations"}

    id = Column(String, primary_key=True)
    integration_instance_id = Column(String, ForeignKey("integrations.integration_instances.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True))
    status = Column(String, nullable=False)  # running, success, failed
    records_processed = Column(Integer, default=0)
    records_created = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    records_failed = Column(Integer, default=0)
    error_message = Column(Text)
    duration_seconds = Column(Integer)


class AIAgent(Base):
    __tablename__ = "ai_agents"
    __table_args__ = {"schema": "ai"}

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    status = Column(String, nullable=False, default="draft")  # draft, active, inactive

    # Voice Configuration
    voice_provider = Column(String, default="piper")  # piper, elevenlabs, openai
    voice_id = Column(String, default="fr_FR-siwis-medium")
    language = Column(String, default="fr-FR")

    # Model Configuration
    model_provider = Column(String, default="ollama")  # ollama, openai, anthropic
    model_name = Column(String, default="mistral")
    system_prompt = Column(Text)
    temperature = Column(String, default="0.7")
    max_tokens = Column(Integer, default=1000)

    # LiveKit Configuration
    livekit_room_prefix = Column(String)

    # Statistics
    total_conversations = Column(Integer, default=0)
    total_duration_seconds = Column(Integer, default=0)
    average_rating = Column(String)

    # Metadata
    created_by = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_active_at = Column(DateTime(timezone=True))


class AIConversation(Base):
    __tablename__ = "ai_conversations"
    __table_args__ = {"schema": "ai"}

    id = Column(String, primary_key=True)
    agent_id = Column(String, ForeignKey("ai.ai_agents.id"), nullable=False)
    user_id = Column(String)
    room_name = Column(String, nullable=False)
    status = Column(String, nullable=False)  # active, completed, error
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True))
    duration_seconds = Column(Integer)
    message_count = Column(Integer, default=0)
    user_rating = Column(Integer)  # 1-5 stars
    user_feedback = Column(Text)


# ============== Admin Schema Models ==============

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "admin"}

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="user")  # admin, manager, user, viewer
    status = Column(String, nullable=False, default="active")  # active, inactive, suspended
    avatar = Column(String)
    department = Column(String)
    phone = Column(String)
    extension = Column(String)
    last_login_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ============== Devices Schema Models ==============

class DeviceType(Base):
    """Lookup table for device types"""
    __tablename__ = "device_types"
    __table_args__ = {"schema": "devices"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)  # server, gateway, phone, softphone, etc.
    display_name = Column(String, nullable=False)
    description = Column(Text)
    icon = Column(String)
    color = Column(String)
    category = Column(String)  # server, telephony, endpoint, network, other
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer)
    extra_data = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    devices = relationship("Device", back_populates="device_type_rel")


class DeviceManufacturer(Base):
    """Lookup table for device manufacturers"""
    __tablename__ = "device_manufacturers"
    __table_args__ = {"schema": "devices"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)  # avaya, cisco, microsoft, etc.
    display_name = Column(String, nullable=False)
    description = Column(Text)
    website = Column(String)
    logo_url = Column(String)
    icon = Column(String)
    color = Column(String)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer)
    extra_data = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    devices = relationship("Device", back_populates="manufacturer_rel")


class Location(Base):
    """Hierarchical locations for devices"""
    __tablename__ = "locations"
    __table_args__ = {"schema": "devices"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID, nullable=False, server_default=func.gen_random_uuid())
    name = Column(String, nullable=False)
    code = Column(String)
    organization = Column(String)
    organization_full = Column(String)
    avaya_location_id = Column(Integer)
    avaya_smgr_id = Column(Integer)
    address = Column(Text)
    city = Column(String)
    region = Column(String)
    postal_code = Column(String)
    country = Column(String)
    latitude = Column(Numeric)
    longitude = Column(Numeric)
    timezone = Column(String)
    description = Column(Text)
    parent_id = Column(Integer, ForeignKey("devices.locations.id"))
    is_active = Column(Boolean, default=True)
    extra_data = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)

    # Relationships
    parent = relationship("Location", remote_side=[id], backref="children")
    devices = relationship("Device", back_populates="location_rel")


class DeviceGroupType(Base):
    """Lookup table for device group types and their behaviors"""
    __tablename__ = "device_group_types"
    __table_args__ = {"schema": "devices"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(50), nullable=False, unique=True)
    display_name = Column(String(100), nullable=False)
    description = Column(Text)
    grouping_behavior = Column(Text, nullable=False)  # Description of how devices are grouped
    match_field = Column(String(100))  # Field to match on (e.g., 'device_group_id', 'location_id')
    icon = Column(String(50))
    color = Column(String(20))
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    groups = relationship("DeviceGroup", back_populates="group_type_rel")


class DeviceGroup(Base):
    """Hierarchical groups for devices"""
    __tablename__ = "device_groups"
    __table_args__ = {"schema": "devices"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    parent_id = Column(Integer, ForeignKey("devices.device_groups.id"))
    description = Column(Text)
    group_type = Column(String)  # Legacy string field
    group_type_id = Column(Integer, ForeignKey("devices.device_group_types.id"))
    icon = Column(String)
    color = Column(String)
    display_order = Column(Integer)
    is_active = Column(Boolean, default=True)
    avaya_location_id = Column(Integer)
    extra_data = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)

    # Relationships
    parent = relationship("DeviceGroup", remote_side=[id], backref="children")
    group_type_rel = relationship("DeviceGroupType", back_populates="groups")
    memberships = relationship("DeviceGroupMembership", back_populates="group")


class Device(Base):
    """Main devices table"""
    __tablename__ = "devices"
    __table_args__ = {"schema": "devices"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    uuid = Column(UUID, nullable=False, server_default=func.gen_random_uuid())
    device_name = Column(String, nullable=False)
    device_type = Column(String, nullable=False, default="server")
    primary_address = Column(String, nullable=False)  # hostname or IP
    location_id = Column(Integer, ForeignKey("devices.locations.id"))
    manufacturer = Column(String)
    model = Column(String)
    serial_number = Column(String)
    firmware_version = Column(String)
    mac_address = Column(String)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    has_vip = Column(Boolean, default=False)
    vip_address = Column(String)
    extra_data = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(String)
    updated_by = Column(String)
    device_type_id = Column(Integer, ForeignKey("devices.device_types.id"))
    manufacturer_id = Column(Integer, ForeignKey("devices.device_manufacturers.id"))

    # Relationships
    location_rel = relationship("Location", back_populates="devices")
    device_type_rel = relationship("DeviceType", back_populates="devices")
    manufacturer_rel = relationship("DeviceManufacturer", back_populates="devices")
    group_memberships = relationship("DeviceGroupMembership", back_populates="device")
    integrations = relationship("DeviceIntegration", back_populates="device")


class DeviceGroupMembership(Base):
    """Many-to-many relationship between devices and groups"""
    __tablename__ = "device_group_memberships"
    __table_args__ = {"schema": "devices"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.devices.id"))
    group_id = Column(Integer, ForeignKey("devices.device_groups.id"))
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    added_by = Column(String)
    is_primary = Column(Boolean, default=False)
    notes = Column(Text)

    # Relationships
    device = relationship("Device", back_populates="group_memberships")
    group = relationship("DeviceGroup", back_populates="memberships")


class DeviceIntegration(Base):
    """Connection configuration for devices"""
    __tablename__ = "device_integrations"
    __table_args__ = {"schema": "devices"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(Integer, ForeignKey("devices.devices.id"))
    integration_id = Column(Integer)  # Reference to integrations schema
    host = Column(String)
    port = Column(Integer)
    base_url = Column(String)
    enabled = Column(Boolean, default=True)
    verify_ssl = Column(Boolean, default=True)
    timeout = Column(Integer, default=30)
    config_extra = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    device = relationship("Device", back_populates="integrations")
    credentials = relationship("DeviceCredential", back_populates="device_integration")
    ssh_config = relationship("DeviceSSHConfig", back_populates="device_integration", uselist=False)


class DeviceCredential(Base):
    """Encrypted credentials for device access"""
    __tablename__ = "credentials"
    __table_args__ = {"schema": "devices"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_integration_id = Column(Integer, ForeignKey("devices.device_integrations.id"))
    credential_type = Column(String, nullable=False)  # basic, api_key, oauth, ssh_key
    username = Column(String)
    password_encrypted = Column(BYTEA)
    api_key_encrypted = Column(BYTEA)
    client_id = Column(String)
    client_secret_encrypted = Column(BYTEA)
    ssh_key_encrypted = Column(BYTEA)
    extra_encrypted = Column(BYTEA)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    device_integration = relationship("DeviceIntegration", back_populates="credentials")


class DeviceSSHConfig(Base):
    """SSH connection configuration"""
    __tablename__ = "ssh_configs"
    __table_args__ = {"schema": "devices"}

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_integration_id = Column(Integer, ForeignKey("devices.device_integrations.id"))
    enabled = Column(Boolean, default=False)
    ssh_host = Column(String)
    ssh_port = Column(Integer, default=22)
    ssh_username = Column(String)
    ssh_password_encrypted = Column(BYTEA)
    ssh_key_encrypted = Column(BYTEA)
    config_path = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    device_integration = relationship("DeviceIntegration", back_populates="ssh_config")
