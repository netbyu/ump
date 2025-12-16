"""
Phone Provisioning Models
"""
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class PhoneVendor(str, Enum):
    """Supported phone vendors"""
    YEALINK = "yealink"
    POLYCOM = "polycom"
    CISCO = "cisco"
    GRANDSTREAM = "grandstream"
    FANVIL = "fanvil"
    SNOM = "snom"
    PANASONIC = "panasonic"
    AASTRA = "aastra"
    MITEL = "mitel"
    OTHER = "other"


class ProvisioningProtocol(str, Enum):
    """Provisioning protocols"""
    TFTP = "tftp"
    HTTP = "http"
    HTTPS = "https"
    FTP = "ftp"


class ProvisioningStatus(str, Enum):
    """Provisioning status"""
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    IN_PROGRESS = "in_progress"


class PhoneModel(BaseModel):
    """Phone model/hardware definition"""
    id: str
    vendor: PhoneVendor
    model_name: str
    display_name: str
    description: Optional[str] = None

    # Hardware specs
    line_count: int = 1
    has_color_display: bool = False
    has_bluetooth: bool = False
    has_wifi: bool = False

    # Provisioning
    provisioning_protocol: ProvisioningProtocol = ProvisioningProtocol.TFTP
    config_file_pattern: str  # e.g., "{mac}.cfg"
    firmware_pattern: Optional[str] = None

    is_active: bool = True


class PhoneTemplate(BaseModel):
    """Configuration template"""
    id: str
    name: str
    description: Optional[str]
    vendor: PhoneVendor
    model_pattern: Optional[str] = None

    template_content: str  # Jinja2 template
    required_variables: List[str] = []
    optional_variables: Dict[str, Any] = {}
    features: Dict[str, bool] = {}

    is_active: bool = True


class PhoneAssignmentCreate(BaseModel):
    """Create phone assignment"""
    mac_address: str = Field(..., pattern=r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$")
    phone_model_id: str
    extension: str
    extension_name: Optional[str] = None
    sip_password: str

    # PBX info
    pbx_node_id: Optional[str] = None
    pbx_server_ip: str
    pbx_domain: Optional[str] = None

    # Template
    template_id: Optional[str] = None

    # Network (optional)
    static_ip: Optional[str] = None
    subnet_mask: Optional[str] = None
    gateway: Optional[str] = None
    vlan_id: Optional[int] = None

    # Location
    location_id: Optional[str] = None
    physical_location: Optional[str] = None

    # Custom config
    custom_config: Dict[str, Any] = {}
    notes: Optional[str] = None


class PhoneAssignment(BaseModel):
    """Phone assignment with all details"""
    id: str
    mac_address: str
    phone_model_id: str
    vendor: PhoneVendor
    extension: str
    extension_name: Optional[str]

    # PBX
    pbx_node_id: Optional[str]
    pbx_server_ip: str
    pbx_domain: Optional[str]

    # Template
    template_id: Optional[str]

    # Status
    is_active: bool
    is_provisioned: bool
    provisioning_status: ProvisioningStatus
    last_provisioned_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None

    # Network
    ip_address: Optional[str] = None
    static_ip: Optional[str] = None
    firmware_version: Optional[str] = None

    # Location
    physical_location: Optional[str] = None

    created_at: datetime


class ProvisioningRequest(BaseModel):
    """Request to provision a phone"""
    mac_address: str


class ProvisioningResponse(BaseModel):
    """Response with generated config"""
    success: bool
    config_content: Optional[str] = None
    config_file_path: Optional[str] = None
    error: Optional[str] = None


class PhoneListResponse(BaseModel):
    """List of phone assignments"""
    items: List[PhoneAssignment]
    total: int
    provisioned: int
    pending: int
