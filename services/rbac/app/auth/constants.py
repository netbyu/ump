"""RBAC Constants and Enumerations."""
from enum import Enum


class Resources(str, Enum):
    """Available resources for permission checks."""

    USERS = "users"
    EXTENSIONS = "extensions"
    TRUNKS = "trunks"
    QUEUES = "queues"
    ROUTES = "routes"
    REPORTS = "reports"
    SETTINGS = "settings"
    RBAC = "rbac"
    TENANTS = "tenants"
    DEVICES = "devices"
    INTEGRATIONS = "integrations"
    AGENTS = "agents"
    AUTOMATION = "automation"
    MONITORING = "monitoring"
    ITSM = "itsm"
    IVR = "ivr"
    FAX = "fax"


class Actions(str, Enum):
    """Available actions for permission checks."""

    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXECUTE = "execute"
    ADMIN = "admin"


class DefaultRoles(str, Enum):
    """System default roles."""

    PLATFORM_ADMIN = "platform_admin"
    TENANT_ADMIN = "tenant_admin"
    OPERATOR = "operator"
    VIEWER = "viewer"


# Wildcard for platform-wide access
WILDCARD_DOMAIN = "*"

# Resource groupings for convenience
RESOURCE_GROUPS = {
    "telephony": [
        Resources.EXTENSIONS,
        Resources.TRUNKS,
        Resources.QUEUES,
        Resources.ROUTES,
        Resources.IVR,
    ],
    "administration": [
        Resources.USERS,
        Resources.SETTINGS,
        Resources.RBAC,
        Resources.TENANTS,
    ],
    "reporting": [
        Resources.REPORTS,
        Resources.MONITORING,
    ],
    "integrations": [
        Resources.INTEGRATIONS,
        Resources.ITSM,
    ],
    "ai": [
        Resources.AGENTS,
        Resources.AUTOMATION,
    ],
}

# Default permissions for each role
DEFAULT_ROLE_PERMISSIONS = {
    DefaultRoles.PLATFORM_ADMIN: [
        # Full access to everything
        (WILDCARD_DOMAIN, "*", "*"),
    ],
    DefaultRoles.TENANT_ADMIN: [
        # Full access within tenant
        ("*", Resources.USERS, "*"),
        ("*", Resources.EXTENSIONS, "*"),
        ("*", Resources.TRUNKS, "*"),
        ("*", Resources.QUEUES, "*"),
        ("*", Resources.ROUTES, "*"),
        ("*", Resources.REPORTS, "*"),
        ("*", Resources.DEVICES, "*"),
        ("*", Resources.INTEGRATIONS, "*"),
        ("*", Resources.AGENTS, "*"),
        ("*", Resources.AUTOMATION, "*"),
        ("*", Resources.MONITORING, Actions.READ),
        ("*", Resources.SETTINGS, Actions.READ),
        ("*", Resources.SETTINGS, Actions.UPDATE),
        ("*", Resources.RBAC, Actions.READ),
        ("*", Resources.IVR, "*"),
        ("*", Resources.FAX, "*"),
        ("*", Resources.ITSM, "*"),
    ],
    DefaultRoles.OPERATOR: [
        # Manage telephony and view users
        ("*", Resources.EXTENSIONS, Actions.READ),
        ("*", Resources.EXTENSIONS, Actions.UPDATE),
        ("*", Resources.EXTENSIONS, Actions.CREATE),
        ("*", Resources.TRUNKS, Actions.READ),
        ("*", Resources.QUEUES, Actions.READ),
        ("*", Resources.QUEUES, Actions.UPDATE),
        ("*", Resources.ROUTES, Actions.READ),
        ("*", Resources.REPORTS, Actions.READ),
        ("*", Resources.REPORTS, Actions.EXECUTE),
        ("*", Resources.USERS, Actions.READ),
        ("*", Resources.DEVICES, Actions.READ),
        ("*", Resources.DEVICES, Actions.UPDATE),
        ("*", Resources.MONITORING, Actions.READ),
        ("*", Resources.INTEGRATIONS, Actions.READ),
        ("*", Resources.ITSM, Actions.READ),
        ("*", Resources.ITSM, Actions.CREATE),
        ("*", Resources.ITSM, Actions.UPDATE),
    ],
    DefaultRoles.VIEWER: [
        # Read-only access
        ("*", Resources.EXTENSIONS, Actions.READ),
        ("*", Resources.TRUNKS, Actions.READ),
        ("*", Resources.QUEUES, Actions.READ),
        ("*", Resources.ROUTES, Actions.READ),
        ("*", Resources.REPORTS, Actions.READ),
        ("*", Resources.USERS, Actions.READ),
        ("*", Resources.DEVICES, Actions.READ),
        ("*", Resources.MONITORING, Actions.READ),
        ("*", Resources.INTEGRATIONS, Actions.READ),
        ("*", Resources.ITSM, Actions.READ),
    ],
}
