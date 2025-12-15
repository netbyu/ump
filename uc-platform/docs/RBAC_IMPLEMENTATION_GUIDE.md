# RBAC Implementation Guide for UC Management Platform

## Document Information

| Field | Value |
|-------|-------|
| **Version** | 1.0 |
| **Created** | December 2024 |
| **Status** | Baseline Specification |
| **Target Audience** | Implementation Team |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [Data Model](#4-data-model)
5. [Implementation Phases](#5-implementation-phases)
6. [Core Components](#6-core-components)
7. [API Specification](#7-api-specification)
8. [Multi-Tenant Support](#8-multi-tenant-support)
9. [Integration Points](#9-integration-points)
10. [Testing Strategy](#10-testing-strategy)
11. [Security Considerations](#11-security-considerations)
12. [Deployment & Migration](#12-deployment--migration)
13. [Appendices](#13-appendices)

---

## 1. Executive Summary

### 1.1 Purpose

This document serves as the comprehensive baseline specification for implementing Role-Based Access Control (RBAC) in the UC Management Platform. It provides the implementation team with all necessary technical details, architectural decisions, and code patterns required to build a production-ready RBAC system.

### 1.2 Scope

The RBAC implementation covers:
- User role management
- Permission enforcement at API endpoints
- Multi-tenant access control
- Administrative interfaces for RBAC management
- Audit logging for permission checks

### 1.3 Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **RBAC Framework** | Casbin | Mature, well-documented, supports multiple models, database persistence |
| **Storage** | PostgreSQL | Already in use, supports async operations with asyncpg |
| **Model Type** | RBAC with Domains | Enables multi-tenant support from day one |
| **API Framework** | FastAPI | Already in use, excellent async support |

---

## 2. Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway / Nginx                         │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FastAPI Application                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Authentication Layer                       │   │
│  │              (JWT Token Validation)                          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Authorization Layer                        │   │
│  │              (Casbin RBAC Enforcer)                          │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │  Request: (user, tenant, resource, action)          │    │   │
│  │  │      ↓                                               │    │   │
│  │  │  Policy Check → casbin_rule table                   │    │   │
│  │  │      ↓                                               │    │   │
│  │  │  Decision: ALLOW / DENY                              │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                │                                    │
│                                ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   Business Logic Layer                       │   │
│  │              (Services & Controllers)                        │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Database                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐   │
│  │   casbin_rule    │  │      users       │  │    tenants      │   │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Request Flow

```
1. User Request
       │
       ▼
2. JWT Token Extraction & Validation
       │
       ▼
3. Extract: username, tenant_id from token
       │
       ▼
4. PermissionChecker Dependency
       │
       ▼
5. Casbin Enforcer.enforce(username, tenant_id, resource, action)
       │
       ├── ALLOW → Continue to Business Logic
       │
       └── DENY → Return 403 Forbidden
```

### 2.3 Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        app/auth/                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │ casbin_config.py│  │ dependencies.py │  │   model.conf   │  │
│  │                 │  │                 │  │                │  │
│  │ - Enforcer      │  │ - Permission    │  │ - Request def  │  │
│  │   singleton     │  │   Checker       │  │ - Policy def   │  │
│  │ - DB adapter    │  │ - Tenant        │  │ - Role def     │  │
│  │ - Policy reload │  │   Permission    │  │ - Matchers     │  │
│  └─────────────────┘  │   Checker       │  └────────────────┘  │
│                       └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       app/routers/                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │  extensions.py  │  │    users.py     │  │    rbac.py     │  │
│  │                 │  │                 │  │                │  │
│  │ Protected with  │  │ Protected with  │  │ RBAC admin     │  │
│  │ PermissionCheck │  │ PermissionCheck │  │ endpoints      │  │
│  └─────────────────┘  └─────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack

### 3.1 Required Dependencies

Add to `requirements.txt`:

```txt
# RBAC Core
casbin>=1.36.0
casbin-async-sqlalchemy-adapter>=1.0.0

# Already present (verify versions)
asyncpg>=0.29.0
SQLAlchemy>=2.0.0
fastapi>=0.104.0
python-jose[cryptography]>=3.3.0

# Optional: Distributed caching
casbin-redis-watcher>=1.0.0
redis>=5.0.0
```

### 3.2 Installation

```bash
pip install casbin casbin-async-sqlalchemy-adapter
```

### 3.3 Environment Variables

Add to `.env`:

```env
# RBAC Configuration
RBAC_MODEL_PATH=app/auth/model.conf
RBAC_AUTO_SAVE=true
RBAC_CACHE_ENABLED=true

# Optional: Redis for distributed policy sync
RBAC_REDIS_URL=redis://localhost:6379/0
```

---

## 4. Data Model

### 4.1 Database Schema

The Casbin adapter automatically creates the `casbin_rule` table:

```sql
-- Casbin policies table (auto-created by adapter)
CREATE TABLE IF NOT EXISTS casbin_rule (
    id SERIAL PRIMARY KEY,
    ptype VARCHAR(255) NOT NULL,     -- 'p' for policy, 'g' for grouping
    v0 VARCHAR(255) DEFAULT '',       -- subject/user
    v1 VARCHAR(255) DEFAULT '',       -- domain/tenant (or role for grouping)
    v2 VARCHAR(255) DEFAULT '',       -- object/resource
    v3 VARCHAR(255) DEFAULT '',       -- action
    v4 VARCHAR(255) DEFAULT '',       -- effect (optional)
    v5 VARCHAR(255) DEFAULT ''        -- reserved
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_casbin_rule_ptype ON casbin_rule(ptype);
CREATE INDEX IF NOT EXISTS idx_casbin_rule_v0 ON casbin_rule(v0);
CREATE INDEX IF NOT EXISTS idx_casbin_rule_v1 ON casbin_rule(v1);
CREATE INDEX IF NOT EXISTS idx_casbin_rule_v0_v1 ON casbin_rule(v0, v1);
```

### 4.2 Policy Data Structure

#### Policy Rules (ptype = 'p')

| ptype | v0 (role) | v1 (domain) | v2 (resource) | v3 (action) |
|-------|-----------|-------------|---------------|-------------|
| p | admin | * | * | * |
| p | tenant_admin | tenant_acme | users | * |
| p | operator | tenant_acme | extensions | read |
| p | operator | tenant_acme | extensions | update |
| p | viewer | tenant_acme | extensions | read |

#### Grouping Rules (ptype = 'g')

| ptype | v0 (user) | v1 (role) | v2 (domain) |
|-------|-----------|-----------|-------------|
| g | eric | platform_admin | * |
| g | john | tenant_admin | tenant_acme |
| g | john | operator | tenant_globex |
| g | sarah | viewer | tenant_acme |

### 4.3 Role Hierarchy

```
                    ┌──────────────────┐
                    │ platform_admin   │
                    │ (all tenants)    │
                    └────────┬─────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐         ┌─────────▼─────────┐
    │   tenant_admin    │         │   tenant_admin    │
    │  (tenant_acme)    │         │  (tenant_globex)  │
    └─────────┬─────────┘         └─────────┬─────────┘
              │                             │
    ┌─────────▼─────────┐         ┌─────────▼─────────┐
    │     operator      │         │     operator      │
    │  (tenant_acme)    │         │  (tenant_globex)  │
    └─────────┬─────────┘         └─────────┬─────────┘
              │                             │
    ┌─────────▼─────────┐         ┌─────────▼─────────┐
    │      viewer       │         │      viewer       │
    │  (tenant_acme)    │         │  (tenant_globex)  │
    └───────────────────┘         └───────────────────┘
```

### 4.4 Resource & Action Definitions

#### Resources

| Resource | Description |
|----------|-------------|
| `users` | User management |
| `extensions` | Telephony extensions |
| `trunks` | SIP trunks configuration |
| `queues` | Call queues |
| `routes` | Call routing rules |
| `reports` | CDR and analytics |
| `settings` | System configuration |
| `rbac` | RBAC administration |
| `tenants` | Tenant management (platform admin only) |

#### Actions

| Action | Description |
|--------|-------------|
| `create` | Create new resource |
| `read` | View/list resources |
| `update` | Modify existing resource |
| `delete` | Remove resource |
| `execute` | Run operations (e.g., reports) |
| `admin` | Full control (equivalent to *) |

---

## 5. Implementation Phases

### Phase 1: Foundation (Week 1-2)

#### Deliverables
- [ ] Project structure setup
- [ ] Casbin model configuration
- [ ] Database adapter integration
- [ ] Basic enforcer singleton

#### Files to Create
```
app/
├── auth/
│   ├── __init__.py
│   ├── casbin_config.py
│   ├── model.conf
│   ├── constants.py
│   └── dependencies.py
```

### Phase 2: Core Integration (Week 2-3)

#### Deliverables
- [ ] Permission checker dependencies
- [ ] Multi-tenant permission checker
- [ ] Integration with existing JWT auth
- [ ] Protect all existing endpoints

#### Files to Modify
```
app/
├── main.py              # Add enforcer initialization
├── routers/
│   ├── extensions.py    # Add permission checks
│   ├── users.py         # Add permission checks
│   └── ...
```

### Phase 3: Admin API (Week 3-4)

#### Deliverables
- [ ] RBAC management router
- [ ] Role assignment endpoints
- [ ] Permission management endpoints
- [ ] User permission query endpoints

#### Files to Create
```
app/
├── routers/
│   └── rbac.py          # RBAC admin endpoints
├── schemas/
│   └── rbac.py          # Pydantic models
```

### Phase 4: Testing & Documentation (Week 4-5)

#### Deliverables
- [ ] Unit tests for RBAC logic
- [ ] Integration tests for endpoints
- [ ] Policy seeding scripts
- [ ] API documentation

#### Files to Create
```
tests/
├── test_rbac_unit.py
├── test_rbac_integration.py
└── fixtures/
    └── rbac_fixtures.py

scripts/
├── seed_rbac_policies.py
└── migrate_existing_users.py
```

---

## 6. Core Components

### 6.1 Casbin Model Configuration

Create `app/auth/model.conf`:

```ini
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub, r.dom) && (r.dom == p.dom || p.dom == "*") && (r.obj == p.obj || p.obj == "*") && (r.act == p.act || p.act == "*")
```

**Explanation:**

| Section | Definition | Purpose |
|---------|------------|---------|
| `request_definition` | `r = sub, dom, obj, act` | Request format: subject, domain, object, action |
| `policy_definition` | `p = sub, dom, obj, act` | Policy format: role, domain, resource, action |
| `role_definition` | `g = _, _, _` | Grouping with 3 params: user, role, domain |
| `policy_effect` | `e = some(...)` | Allow if any policy matches |
| `matchers` | `m = g(...) && ...` | Match logic with wildcard support |

### 6.2 Constants Definition

Create `app/auth/constants.py`:

```python
"""RBAC Constants and Enumerations"""
from enum import Enum


class Resources(str, Enum):
    """Available resources for permission checks"""
    USERS = "users"
    EXTENSIONS = "extensions"
    TRUNKS = "trunks"
    QUEUES = "queues"
    ROUTES = "routes"
    REPORTS = "reports"
    SETTINGS = "settings"
    RBAC = "rbac"
    TENANTS = "tenants"


class Actions(str, Enum):
    """Available actions for permission checks"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXECUTE = "execute"
    ADMIN = "admin"


class DefaultRoles(str, Enum):
    """System default roles"""
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
    ],
    "administration": [
        Resources.USERS,
        Resources.SETTINGS,
        Resources.RBAC,
    ],
    "reporting": [
        Resources.REPORTS,
    ],
}
```

### 6.3 Casbin Configuration

Create `app/auth/casbin_config.py`:

```python
"""Casbin RBAC Configuration and Enforcer Management"""
import asyncio
import logging
from pathlib import Path
from typing import Optional

import casbin
from casbin_async_sqlalchemy_adapter import Adapter
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings

logger = logging.getLogger(__name__)

# Paths
BASE_DIR = Path(__file__).parent
MODEL_PATH = BASE_DIR / "model.conf"


class AsyncCasbinEnforcer:
    """
    Singleton manager for Casbin AsyncEnforcer.

    Ensures only one enforcer instance exists and provides
    thread-safe access for policy operations.
    """

    _instance: Optional[casbin.AsyncEnforcer] = None
    _adapter: Optional[Adapter] = None
    _lock = asyncio.Lock()
    _initialized = False

    @classmethod
    async def initialize(cls, database_url: str) -> casbin.AsyncEnforcer:
        """
        Initialize the Casbin enforcer with database adapter.

        Should be called once during application startup.

        Args:
            database_url: PostgreSQL connection string with asyncpg driver

        Returns:
            Initialized AsyncEnforcer instance
        """
        async with cls._lock:
            if cls._initialized:
                return cls._instance

            logger.info("Initializing Casbin RBAC enforcer...")

            # Create async engine for adapter
            engine = create_async_engine(
                database_url,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
            )

            # Initialize adapter (creates casbin_rule table if not exists)
            cls._adapter = Adapter(engine)
            await cls._adapter.create_table()

            # Create enforcer with model and adapter
            cls._instance = casbin.AsyncEnforcer(
                str(MODEL_PATH),
                cls._adapter
            )

            # Load policies from database
            await cls._instance.load_policy()

            cls._initialized = True
            logger.info("Casbin RBAC enforcer initialized successfully")

            return cls._instance

    @classmethod
    async def get_enforcer(cls) -> casbin.AsyncEnforcer:
        """
        Get the singleton enforcer instance.

        Raises:
            RuntimeError: If enforcer not initialized

        Returns:
            AsyncEnforcer instance
        """
        if not cls._initialized or cls._instance is None:
            raise RuntimeError(
                "Casbin enforcer not initialized. "
                "Call AsyncCasbinEnforcer.initialize() first."
            )
        return cls._instance

    @classmethod
    async def reload_policy(cls) -> None:
        """
        Reload policies from database.

        Call this after external policy changes.
        """
        if cls._instance:
            await cls._instance.load_policy()
            logger.info("RBAC policies reloaded from database")

    @classmethod
    async def shutdown(cls) -> None:
        """
        Cleanup resources on application shutdown.
        """
        if cls._adapter:
            # Close adapter connections if needed
            pass
        cls._instance = None
        cls._adapter = None
        cls._initialized = False
        logger.info("Casbin RBAC enforcer shutdown complete")


# Dependency function for FastAPI
async def get_enforcer() -> casbin.AsyncEnforcer:
    """FastAPI dependency to get the Casbin enforcer."""
    return await AsyncCasbinEnforcer.get_enforcer()
```

### 6.4 Permission Checker Dependencies

Create `app/auth/dependencies.py`:

```python
"""FastAPI Dependencies for RBAC Permission Checking"""
import logging
from typing import Optional

from fastapi import Depends, HTTPException, status

from app.auth.jwt import get_current_user
from app.auth.casbin_config import get_enforcer
from app.auth.constants import Resources, Actions, WILDCARD_DOMAIN
from app.models import User

logger = logging.getLogger(__name__)


class PermissionChecker:
    """
    FastAPI dependency for checking permissions on API endpoints.

    Usage:
        @router.get("/extensions")
        async def list_extensions(
            user = Depends(PermissionChecker(Resources.EXTENSIONS, Actions.READ))
        ):
            ...
    """

    def __init__(
        self,
        resource: Resources | str,
        action: Actions | str,
        require_tenant: bool = True
    ):
        """
        Initialize permission checker.

        Args:
            resource: The resource being accessed
            action: The action being performed
            require_tenant: If True, tenant context is required
        """
        self.resource = resource.value if isinstance(resource, Resources) else resource
        self.action = action.value if isinstance(action, Actions) else action
        self.require_tenant = require_tenant

    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
    ) -> User:
        """
        Check if the current user has permission.

        Args:
            current_user: User from JWT token

        Returns:
            User if permission granted

        Raises:
            HTTPException: 403 if permission denied
        """
        enforcer = await get_enforcer()

        # Get tenant from user (could be from JWT claims)
        tenant_id = getattr(current_user, 'tenant_id', None)

        if self.require_tenant and not tenant_id:
            # For platform admins, check with wildcard domain
            tenant_id = WILDCARD_DOMAIN

        # Perform permission check
        allowed = await enforcer.enforce(
            current_user.username,
            tenant_id or WILDCARD_DOMAIN,
            self.resource,
            self.action
        )

        # Audit log
        logger.info(
            f"RBAC: user={current_user.username} tenant={tenant_id} "
            f"resource={self.resource} action={self.action} "
            f"result={'ALLOW' if allowed else 'DENY'}"
        )

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.action} on {self.resource}"
            )

        return current_user


class TenantPermissionChecker:
    """
    Permission checker that extracts tenant from path parameter.

    Usage:
        @router.get("/tenants/{tenant_id}/extensions")
        async def list_tenant_extensions(
            tenant_id: str,
            user = Depends(TenantPermissionChecker(Resources.EXTENSIONS, Actions.READ))
        ):
            ...
    """

    def __init__(self, resource: Resources | str, action: Actions | str):
        self.resource = resource.value if isinstance(resource, Resources) else resource
        self.action = action.value if isinstance(action, Actions) else action

    async def __call__(
        self,
        tenant_id: str,
        current_user: User = Depends(get_current_user),
    ) -> User:
        """
        Check permission within specific tenant context.

        Args:
            tenant_id: Tenant ID from path parameter
            current_user: User from JWT token

        Returns:
            User if permission granted

        Raises:
            HTTPException: 403 if permission denied
        """
        enforcer = await get_enforcer()

        allowed = await enforcer.enforce(
            current_user.username,
            tenant_id,
            self.resource,
            self.action
        )

        logger.info(
            f"RBAC: user={current_user.username} tenant={tenant_id} "
            f"resource={self.resource} action={self.action} "
            f"result={'ALLOW' if allowed else 'DENY'}"
        )

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied in tenant {tenant_id}"
            )

        return current_user


def require_permission(
    resource: Resources | str,
    action: Actions | str,
    require_tenant: bool = True
):
    """
    Shorthand decorator for permission checking.

    Usage:
        @router.get("/extensions")
        async def list_extensions(
            user = require_permission(Resources.EXTENSIONS, Actions.READ)
        ):
            ...
    """
    return Depends(PermissionChecker(resource, action, require_tenant))


def require_tenant_permission(resource: Resources | str, action: Actions | str):
    """
    Shorthand decorator for tenant-scoped permission checking.

    Usage:
        @router.get("/tenants/{tenant_id}/extensions")
        async def list_tenant_extensions(
            tenant_id: str,
            user = require_tenant_permission(Resources.EXTENSIONS, Actions.READ)
        ):
            ...
    """
    return Depends(TenantPermissionChecker(resource, action))
```

### 6.5 Application Integration

Update `app/main.py`:

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.auth.casbin_config import AsyncCasbinEnforcer
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    # Startup
    await AsyncCasbinEnforcer.initialize(settings.DATABASE_URL)

    yield

    # Shutdown
    await AsyncCasbinEnforcer.shutdown()


app = FastAPI(
    title="UC Management Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Include routers...
```

---

## 7. API Specification

### 7.1 RBAC Management Endpoints

Create `app/routers/rbac.py`:

```python
"""RBAC Management API Endpoints"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth.dependencies import PermissionChecker
from app.auth.casbin_config import get_enforcer
from app.auth.constants import Resources, Actions

router = APIRouter(prefix="/rbac", tags=["RBAC Management"])


# ============================================================================
# Pydantic Schemas
# ============================================================================

class RoleAssignment(BaseModel):
    """Schema for assigning a role to a user"""
    username: str = Field(..., description="Username to assign role to")
    role: str = Field(..., description="Role name to assign")
    tenant_id: str = Field(..., description="Tenant ID (* for platform-wide)")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "john.doe",
                "role": "operator",
                "tenant_id": "tenant_acme"
            }
        }


class Permission(BaseModel):
    """Schema for a permission rule"""
    role: str = Field(..., description="Role this permission applies to")
    tenant_id: str = Field(..., description="Tenant ID (* for all tenants)")
    resource: str = Field(..., description="Resource name")
    action: str = Field(..., description="Action (create, read, update, delete, *)")

    class Config:
        json_schema_extra = {
            "example": {
                "role": "operator",
                "tenant_id": "tenant_acme",
                "resource": "extensions",
                "action": "update"
            }
        }


class UserPermissionsResponse(BaseModel):
    """Response schema for user permissions query"""
    username: str
    roles: List[dict] = Field(..., description="List of role assignments with tenants")
    permissions: List[dict] = Field(..., description="List of effective permissions")


class PermissionCheckRequest(BaseModel):
    """Request schema for permission check"""
    username: str
    tenant_id: str
    resource: str
    action: str


class PermissionCheckResponse(BaseModel):
    """Response schema for permission check"""
    username: str
    tenant_id: str
    resource: str
    action: str
    allowed: bool


# ============================================================================
# Role Management Endpoints
# ============================================================================

@router.get("/roles", response_model=List[str])
async def list_roles(
    user = Depends(PermissionChecker(Resources.RBAC, Actions.READ)),
):
    """
    List all defined roles in the system.

    Requires: rbac:read permission
    """
    enforcer = await get_enforcer()
    roles = enforcer.get_all_roles()
    return list(set(roles))


@router.get("/roles/{role}/permissions", response_model=List[dict])
async def get_role_permissions(
    role: str,
    user = Depends(PermissionChecker(Resources.RBAC, Actions.READ)),
):
    """
    Get all permissions assigned to a specific role.

    Requires: rbac:read permission
    """
    enforcer = await get_enforcer()
    permissions = await enforcer.get_permissions_for_user(role)
    return [
        {
            "role": p[0],
            "tenant_id": p[1],
            "resource": p[2],
            "action": p[3]
        }
        for p in permissions
    ]


# ============================================================================
# User Role Assignment Endpoints
# ============================================================================

@router.get("/users/{username}/roles", response_model=List[dict])
async def get_user_roles(
    username: str,
    tenant_id: Optional[str] = None,
    user = Depends(PermissionChecker(Resources.RBAC, Actions.READ)),
):
    """
    Get all roles assigned to a user, optionally filtered by tenant.

    Requires: rbac:read permission
    """
    enforcer = await get_enforcer()

    if tenant_id:
        roles = await enforcer.get_roles_for_user_in_domain(username, tenant_id)
        return [{"role": r, "tenant_id": tenant_id} for r in roles]
    else:
        # Get grouping policies for user
        groupings = enforcer.get_grouping_policy()
        user_roles = [
            {"role": g[1], "tenant_id": g[2]}
            for g in groupings if g[0] == username
        ]
        return user_roles


@router.post("/users/roles", status_code=status.HTTP_201_CREATED)
async def assign_role_to_user(
    assignment: RoleAssignment,
    user = Depends(PermissionChecker(Resources.RBAC, Actions.UPDATE)),
):
    """
    Assign a role to a user within a tenant.

    Requires: rbac:update permission
    """
    enforcer = await get_enforcer()

    # Check if assignment already exists
    if await enforcer.has_grouping_policy(
        assignment.username,
        assignment.role,
        assignment.tenant_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role assignment already exists"
        )

    success = await enforcer.add_grouping_policy(
        assignment.username,
        assignment.role,
        assignment.tenant_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign role"
        )

    return {
        "message": f"Role '{assignment.role}' assigned to '{assignment.username}' in tenant '{assignment.tenant_id}'"
    }


@router.delete("/users/{username}/roles/{role}")
async def remove_role_from_user(
    username: str,
    role: str,
    tenant_id: str,
    user = Depends(PermissionChecker(Resources.RBAC, Actions.DELETE)),
):
    """
    Remove a role from a user within a tenant.

    Requires: rbac:delete permission
    """
    enforcer = await get_enforcer()

    success = await enforcer.remove_grouping_policy(username, role, tenant_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role assignment not found"
        )

    return {"message": f"Role '{role}' removed from '{username}' in tenant '{tenant_id}'"}


# ============================================================================
# Permission Management Endpoints
# ============================================================================

@router.get("/permissions", response_model=List[dict])
async def list_all_permissions(
    role: Optional[str] = None,
    tenant_id: Optional[str] = None,
    user = Depends(PermissionChecker(Resources.RBAC, Actions.READ)),
):
    """
    List all permission policies, optionally filtered by role or tenant.

    Requires: rbac:read permission
    """
    enforcer = await get_enforcer()
    policies = enforcer.get_policy()

    result = []
    for p in policies:
        if role and p[0] != role:
            continue
        if tenant_id and p[1] != tenant_id:
            continue
        result.append({
            "role": p[0],
            "tenant_id": p[1],
            "resource": p[2],
            "action": p[3]
        })

    return result


@router.post("/permissions", status_code=status.HTTP_201_CREATED)
async def add_permission(
    permission: Permission,
    user = Depends(PermissionChecker(Resources.RBAC, Actions.UPDATE)),
):
    """
    Add a new permission policy.

    Requires: rbac:update permission
    """
    enforcer = await get_enforcer()

    success = await enforcer.add_policy(
        permission.role,
        permission.tenant_id,
        permission.resource,
        permission.action
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission already exists"
        )

    return {"message": "Permission added successfully"}


@router.delete("/permissions")
async def remove_permission(
    permission: Permission,
    user = Depends(PermissionChecker(Resources.RBAC, Actions.DELETE)),
):
    """
    Remove a permission policy.

    Requires: rbac:delete permission
    """
    enforcer = await get_enforcer()

    success = await enforcer.remove_policy(
        permission.role,
        permission.tenant_id,
        permission.resource,
        permission.action
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found"
        )

    return {"message": "Permission removed successfully"}


# ============================================================================
# User Permissions Query Endpoints
# ============================================================================

@router.get("/users/{username}/permissions", response_model=UserPermissionsResponse)
async def get_user_permissions(
    username: str,
    tenant_id: Optional[str] = None,
    user = Depends(PermissionChecker(Resources.RBAC, Actions.READ)),
):
    """
    Get all effective permissions for a user.

    Returns both explicit and inherited permissions.

    Requires: rbac:read permission
    """
    enforcer = await get_enforcer()

    # Get user's roles
    groupings = enforcer.get_grouping_policy()
    user_roles = [
        {"role": g[1], "tenant_id": g[2]}
        for g in groupings if g[0] == username
    ]

    # Filter by tenant if specified
    if tenant_id:
        user_roles = [r for r in user_roles if r["tenant_id"] in [tenant_id, "*"]]

    # Get implicit permissions (including inherited)
    if tenant_id:
        implicit_perms = await enforcer.get_implicit_permissions_for_user(username, tenant_id)
    else:
        # Get permissions across all domains
        implicit_perms = []
        for role_info in user_roles:
            perms = await enforcer.get_implicit_permissions_for_user(
                username,
                role_info["tenant_id"]
            )
            implicit_perms.extend(perms)

    permissions = [
        {
            "role": p[0],
            "tenant_id": p[1],
            "resource": p[2],
            "action": p[3]
        }
        for p in implicit_perms
    ]

    return UserPermissionsResponse(
        username=username,
        roles=user_roles,
        permissions=permissions
    )


# ============================================================================
# Permission Check Endpoint
# ============================================================================

@router.post("/check", response_model=PermissionCheckResponse)
async def check_permission(
    request: PermissionCheckRequest,
    user = Depends(PermissionChecker(Resources.RBAC, Actions.READ)),
):
    """
    Check if a user has a specific permission.

    Useful for debugging and UI permission checks.

    Requires: rbac:read permission
    """
    enforcer = await get_enforcer()

    allowed = await enforcer.enforce(
        request.username,
        request.tenant_id,
        request.resource,
        request.action
    )

    return PermissionCheckResponse(
        username=request.username,
        tenant_id=request.tenant_id,
        resource=request.resource,
        action=request.action,
        allowed=allowed
    )


# ============================================================================
# Policy Reload Endpoint
# ============================================================================

@router.post("/reload")
async def reload_policies(
    user = Depends(PermissionChecker(Resources.RBAC, Actions.ADMIN)),
):
    """
    Reload all policies from database.

    Use after direct database modifications.

    Requires: rbac:admin permission
    """
    enforcer = await get_enforcer()
    await enforcer.load_policy()
    return {"message": "Policies reloaded successfully"}
```

### 7.2 API Summary Table

| Method | Endpoint | Permission Required | Description |
|--------|----------|---------------------|-------------|
| GET | `/rbac/roles` | rbac:read | List all roles |
| GET | `/rbac/roles/{role}/permissions` | rbac:read | Get role permissions |
| GET | `/rbac/users/{username}/roles` | rbac:read | Get user's roles |
| POST | `/rbac/users/roles` | rbac:update | Assign role to user |
| DELETE | `/rbac/users/{username}/roles/{role}` | rbac:delete | Remove role from user |
| GET | `/rbac/permissions` | rbac:read | List all permissions |
| POST | `/rbac/permissions` | rbac:update | Add permission |
| DELETE | `/rbac/permissions` | rbac:delete | Remove permission |
| GET | `/rbac/users/{username}/permissions` | rbac:read | Get user's effective permissions |
| POST | `/rbac/check` | rbac:read | Check specific permission |
| POST | `/rbac/reload` | rbac:admin | Reload policies from DB |

---

## 8. Multi-Tenant Support

### 8.1 Tenant Context

The system supports multi-tenant RBAC where:
- Users can have different roles in different tenants
- Platform administrators have access across all tenants
- Tenant administrators are scoped to their tenant

### 8.2 Tenant-Aware Permission Checks

```python
# Platform-wide endpoint (checks user's default tenant or *)
@router.get("/dashboard")
async def get_dashboard(
    user = Depends(PermissionChecker(Resources.REPORTS, Actions.READ))
):
    ...

# Tenant-specific endpoint (tenant from path)
@router.get("/tenants/{tenant_id}/extensions")
async def list_tenant_extensions(
    tenant_id: str,
    user = Depends(TenantPermissionChecker(Resources.EXTENSIONS, Actions.READ))
):
    ...
```

### 8.3 JWT Token Structure

```json
{
  "sub": "john.doe",
  "tenant_id": "tenant_acme",
  "exp": 1702500000,
  "iat": 1702496400
}
```

### 8.4 Cross-Tenant Access

Platform admins can access any tenant:

```csv
# Platform admin policy (wildcard domain)
p, platform_admin, *, *, *

# User assignment
g, superadmin, platform_admin, *
```

---

## 9. Integration Points

### 9.1 Existing Authentication

The RBAC system integrates with the existing JWT authentication:

```python
# Existing: app/auth/jwt.py
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Extract and validate user from JWT token."""
    # ... existing implementation ...
    return user

# New: Permission check uses the same user
class PermissionChecker:
    async def __call__(
        self,
        current_user: User = Depends(get_current_user),  # Uses existing auth
    ) -> User:
        # ... permission check ...
```

### 9.2 Protecting Existing Endpoints

Example migration for existing endpoint:

**Before:**
```python
@router.get("/extensions")
async def list_extensions(
    current_user: User = Depends(get_current_user)
):
    return await extension_service.get_all()
```

**After:**
```python
@router.get("/extensions")
async def list_extensions(
    current_user: User = Depends(PermissionChecker(Resources.EXTENSIONS, Actions.READ))
):
    return await extension_service.get_all()
```

### 9.3 Frontend Integration

The frontend should:

1. **Store user permissions** after login:
```typescript
// After login, fetch permissions
const permissions = await api.get('/rbac/users/me/permissions');
localStorage.setItem('userPermissions', JSON.stringify(permissions));
```

2. **Check permissions before rendering UI elements**:
```typescript
function hasPermission(resource: string, action: string): boolean {
  const permissions = JSON.parse(localStorage.getItem('userPermissions'));
  return permissions.some(p =>
    (p.resource === resource || p.resource === '*') &&
    (p.action === action || p.action === '*')
  );
}

// Usage in component
{hasPermission('extensions', 'create') && (
  <Button onClick={handleCreate}>Create Extension</Button>
)}
```

---

## 10. Testing Strategy

### 10.1 Unit Tests

Create `tests/test_rbac_unit.py`:

```python
"""Unit tests for RBAC logic"""
import pytest
import casbin
from pathlib import Path


@pytest.fixture
def enforcer():
    """Create test enforcer with in-memory policies."""
    model_path = Path(__file__).parent.parent / "app/auth/model.conf"
    e = casbin.Enforcer(str(model_path))

    # Add test policies
    # Admin can do everything
    e.add_policy("admin", "*", "*", "*")

    # Operator permissions
    e.add_policy("operator", "tenant_acme", "extensions", "read")
    e.add_policy("operator", "tenant_acme", "extensions", "update")

    # Viewer permissions
    e.add_policy("viewer", "tenant_acme", "extensions", "read")

    # Role assignments
    e.add_grouping_policy("alice", "admin", "*")
    e.add_grouping_policy("bob", "operator", "tenant_acme")
    e.add_grouping_policy("charlie", "viewer", "tenant_acme")

    return e


class TestPlatformAdmin:
    """Tests for platform administrator permissions."""

    def test_admin_can_access_any_tenant(self, enforcer):
        assert enforcer.enforce("alice", "tenant_acme", "extensions", "delete")
        assert enforcer.enforce("alice", "tenant_globex", "users", "create")

    def test_admin_can_do_any_action(self, enforcer):
        for action in ["create", "read", "update", "delete", "admin"]:
            assert enforcer.enforce("alice", "*", "extensions", action)


class TestOperator:
    """Tests for operator role permissions."""

    def test_operator_can_read_extensions(self, enforcer):
        assert enforcer.enforce("bob", "tenant_acme", "extensions", "read")

    def test_operator_can_update_extensions(self, enforcer):
        assert enforcer.enforce("bob", "tenant_acme", "extensions", "update")

    def test_operator_cannot_delete_extensions(self, enforcer):
        assert not enforcer.enforce("bob", "tenant_acme", "extensions", "delete")

    def test_operator_cannot_access_other_tenant(self, enforcer):
        assert not enforcer.enforce("bob", "tenant_globex", "extensions", "read")


class TestViewer:
    """Tests for viewer role permissions."""

    def test_viewer_can_read_extensions(self, enforcer):
        assert enforcer.enforce("charlie", "tenant_acme", "extensions", "read")

    def test_viewer_cannot_modify_extensions(self, enforcer):
        assert not enforcer.enforce("charlie", "tenant_acme", "extensions", "update")
        assert not enforcer.enforce("charlie", "tenant_acme", "extensions", "create")
        assert not enforcer.enforce("charlie", "tenant_acme", "extensions", "delete")


class TestUnknownUser:
    """Tests for unauthenticated/unknown users."""

    def test_unknown_user_denied(self, enforcer):
        assert not enforcer.enforce("unknown", "tenant_acme", "extensions", "read")


class TestDynamicPolicyChanges:
    """Tests for runtime policy modifications."""

    def test_add_role_grants_permission(self, enforcer):
        # Initially denied
        assert not enforcer.enforce("newuser", "tenant_acme", "extensions", "read")

        # Assign role
        enforcer.add_grouping_policy("newuser", "viewer", "tenant_acme")

        # Now allowed
        assert enforcer.enforce("newuser", "tenant_acme", "extensions", "read")

    def test_remove_role_revokes_permission(self, enforcer):
        # Initially allowed
        assert enforcer.enforce("charlie", "tenant_acme", "extensions", "read")

        # Remove role
        enforcer.remove_grouping_policy("charlie", "viewer", "tenant_acme")

        # Now denied
        assert not enforcer.enforce("charlie", "tenant_acme", "extensions", "read")
```

### 10.2 Integration Tests

Create `tests/test_rbac_integration.py`:

```python
"""Integration tests for RBAC API endpoints"""
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.fixture
async def admin_client():
    """HTTP client authenticated as admin."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/auth/token", data={
            "username": "admin",
            "password": "adminpass"
        })
        token = response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"
        yield client


@pytest.fixture
async def viewer_client():
    """HTTP client authenticated as viewer."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/auth/token", data={
            "username": "viewer",
            "password": "viewerpass"
        })
        token = response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"
        yield client


class TestExtensionsPermissions:
    """Test permission enforcement on extensions endpoints."""

    async def test_admin_can_create_extension(self, admin_client):
        response = await admin_client.post("/extensions", json={
            "number": "1001",
            "name": "Test Extension"
        })
        assert response.status_code == 201

    async def test_viewer_cannot_create_extension(self, viewer_client):
        response = await viewer_client.post("/extensions", json={
            "number": "1002",
            "name": "Test Extension 2"
        })
        assert response.status_code == 403

    async def test_viewer_can_read_extensions(self, viewer_client):
        response = await viewer_client.get("/extensions")
        assert response.status_code == 200


class TestRBACManagement:
    """Test RBAC management endpoints."""

    async def test_admin_can_list_roles(self, admin_client):
        response = await admin_client.get("/rbac/roles")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_viewer_cannot_modify_roles(self, viewer_client):
        response = await viewer_client.post("/rbac/users/roles", json={
            "username": "newuser",
            "role": "admin",
            "tenant_id": "*"
        })
        assert response.status_code == 403
```

### 10.3 Test Coverage Matrix

| Component | Unit Tests | Integration Tests |
|-----------|------------|-------------------|
| Casbin Model | ✓ | - |
| Permission Checker | ✓ | ✓ |
| Role Assignment | ✓ | ✓ |
| Policy CRUD | ✓ | ✓ |
| Multi-tenant | ✓ | ✓ |
| Role Hierarchy | ✓ | - |

---

## 11. Security Considerations

### 11.1 Audit Logging

All permission checks should be logged:

```python
logger.info(
    f"RBAC_AUDIT: timestamp={datetime.utcnow().isoformat()} "
    f"user={username} tenant={tenant_id} "
    f"resource={resource} action={action} "
    f"result={result} ip={request.client.host}"
)
```

### 11.2 Principle of Least Privilege

- New users start with no roles (must be explicitly assigned)
- Use specific permissions over wildcards where possible
- Regular audit of role assignments

### 11.3 Role Escalation Prevention

- Users cannot assign roles they don't possess
- Add validation in role assignment:

```python
async def assign_role_to_user(assignment: RoleAssignment, user: User):
    # Check if current user can grant this role
    enforcer = await get_enforcer()
    can_grant = await enforcer.enforce(
        user.username,
        assignment.tenant_id,
        "rbac",
        "admin"
    )
    if not can_grant:
        raise HTTPException(403, "Cannot assign roles you don't have admin rights for")
```

### 11.4 Database Security

- Use parameterized queries (handled by Casbin adapter)
- Restrict direct database access to RBAC tables
- Backup policies before migrations

---

## 12. Deployment & Migration

### 12.1 Initial Setup Script

Create `scripts/seed_rbac_policies.py`:

```python
"""Seed initial RBAC policies for production deployment."""
import asyncio
import casbin
from casbin_async_sqlalchemy_adapter import Adapter
from sqlalchemy.ext.asyncio import create_async_engine


async def seed_policies(database_url: str, model_path: str):
    """Seed initial RBAC policies."""

    engine = create_async_engine(database_url)
    adapter = Adapter(engine)
    await adapter.create_table()

    enforcer = casbin.AsyncEnforcer(model_path, adapter)
    await enforcer.load_policy()

    # =========================================================================
    # Default Role Permissions
    # =========================================================================

    default_policies = [
        # Platform Admin - Full access
        ("platform_admin", "*", "*", "*"),

        # Tenant Admin - Full access within tenant
        ("tenant_admin", "*", "users", "*"),
        ("tenant_admin", "*", "extensions", "*"),
        ("tenant_admin", "*", "trunks", "*"),
        ("tenant_admin", "*", "queues", "*"),
        ("tenant_admin", "*", "routes", "*"),
        ("tenant_admin", "*", "reports", "*"),
        ("tenant_admin", "*", "settings", "read"),
        ("tenant_admin", "*", "settings", "update"),
        ("tenant_admin", "*", "rbac", "read"),

        # Operator - Manage telephony resources
        ("operator", "*", "extensions", "read"),
        ("operator", "*", "extensions", "update"),
        ("operator", "*", "extensions", "create"),
        ("operator", "*", "trunks", "read"),
        ("operator", "*", "queues", "read"),
        ("operator", "*", "queues", "update"),
        ("operator", "*", "routes", "read"),
        ("operator", "*", "reports", "read"),
        ("operator", "*", "reports", "execute"),
        ("operator", "*", "users", "read"),

        # Viewer - Read-only access
        ("viewer", "*", "extensions", "read"),
        ("viewer", "*", "trunks", "read"),
        ("viewer", "*", "queues", "read"),
        ("viewer", "*", "routes", "read"),
        ("viewer", "*", "reports", "read"),
        ("viewer", "*", "users", "read"),
    ]

    for policy in default_policies:
        if not await enforcer.has_policy(*policy):
            await enforcer.add_policy(*policy)
            print(f"Added policy: {policy}")

    # =========================================================================
    # Role Hierarchy
    # =========================================================================

    role_hierarchy = [
        ("tenant_admin", "operator", "*"),
        ("operator", "viewer", "*"),
    ]

    for hierarchy in role_hierarchy:
        if not await enforcer.has_grouping_policy(*hierarchy):
            await enforcer.add_grouping_policy(*hierarchy)
            print(f"Added hierarchy: {hierarchy}")

    # =========================================================================
    # Initial Platform Admin
    # =========================================================================

    initial_admin = ("admin", "platform_admin", "*")
    if not await enforcer.has_grouping_policy(*initial_admin):
        await enforcer.add_grouping_policy(*initial_admin)
        print(f"Added initial admin: {initial_admin}")

    await enforcer.save_policy()
    print("\nRBAC policies seeded successfully!")


if __name__ == "__main__":
    import os

    DATABASE_URL = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:password@localhost:5432/ucmp"
    )
    MODEL_PATH = "app/auth/model.conf"

    asyncio.run(seed_policies(DATABASE_URL, MODEL_PATH))
```

### 12.2 Migration from Existing Users

If users already exist without roles:

```python
"""Migrate existing users to RBAC system."""
import asyncio


async def migrate_users(database_url: str, model_path: str):
    """Assign default roles to existing users."""

    # Get existing users from your user table
    # ... query users ...

    enforcer = await get_enforcer()

    for user in existing_users:
        # Assign default viewer role
        if not await enforcer.has_grouping_policy(
            user.username, "viewer", user.tenant_id
        ):
            await enforcer.add_grouping_policy(
                user.username, "viewer", user.tenant_id
            )
            print(f"Assigned viewer role to {user.username}")

    await enforcer.save_policy()
```

### 12.3 Deployment Checklist

- [ ] Install required packages
- [ ] Create `model.conf` file
- [ ] Run database migrations (casbin_rule table)
- [ ] Execute policy seeding script
- [ ] Verify initial admin can login
- [ ] Update all protected endpoints
- [ ] Test permission enforcement
- [ ] Enable audit logging
- [ ] Update API documentation
- [ ] Train admin users

---

## 13. Appendices

### Appendix A: Complete File Structure

```
app/
├── auth/
│   ├── __init__.py
│   ├── casbin_config.py      # Enforcer singleton
│   ├── constants.py          # Resources, Actions enums
│   ├── dependencies.py       # Permission checkers
│   ├── jwt.py               # Existing JWT auth
│   └── model.conf           # Casbin model
├── routers/
│   ├── rbac.py              # RBAC management endpoints
│   ├── extensions.py        # Protected with permissions
│   ├── users.py             # Protected with permissions
│   └── ...
├── schemas/
│   └── rbac.py              # Pydantic models
└── main.py                  # App with lifespan

scripts/
├── seed_rbac_policies.py    # Initial policy setup
└── migrate_users.py         # User migration

tests/
├── test_rbac_unit.py
├── test_rbac_integration.py
└── fixtures/
    └── rbac_fixtures.py
```

### Appendix B: Casbin Enforcer Method Reference

| Method | Description |
|--------|-------------|
| `enforce(sub, dom, obj, act)` | Check permission |
| `add_policy(sub, dom, obj, act)` | Add permission |
| `remove_policy(sub, dom, obj, act)` | Remove permission |
| `has_policy(sub, dom, obj, act)` | Check if policy exists |
| `get_policy()` | Get all policies |
| `add_grouping_policy(user, role, dom)` | Assign role |
| `remove_grouping_policy(user, role, dom)` | Remove role |
| `get_roles_for_user(user)` | Get user's roles |
| `get_roles_for_user_in_domain(user, dom)` | Get user's roles in domain |
| `get_users_for_role(role)` | Get users with role |
| `get_implicit_permissions_for_user(user, dom)` | Get inherited permissions |
| `load_policy()` | Reload from database |
| `save_policy()` | Save to database |

### Appendix C: Default Role Permissions Matrix

| Resource | Action | platform_admin | tenant_admin | operator | viewer |
|----------|--------|----------------|--------------|----------|--------|
| users | create | ✓ | ✓ | - | - |
| users | read | ✓ | ✓ | ✓ | ✓ |
| users | update | ✓ | ✓ | - | - |
| users | delete | ✓ | ✓ | - | - |
| extensions | create | ✓ | ✓ | ✓ | - |
| extensions | read | ✓ | ✓ | ✓ | ✓ |
| extensions | update | ✓ | ✓ | ✓ | - |
| extensions | delete | ✓ | ✓ | - | - |
| trunks | * | ✓ | ✓ | read | read |
| queues | * | ✓ | ✓ | read/update | read |
| routes | * | ✓ | ✓ | read | read |
| reports | * | ✓ | ✓ | read/execute | read |
| settings | * | ✓ | read/update | - | - |
| rbac | * | ✓ | read | - | - |
| tenants | * | ✓ | - | - | - |

### Appendix D: Troubleshooting Guide

| Issue | Cause | Solution |
|-------|-------|----------|
| Permission always denied | Missing role assignment | Check `get_roles_for_user()` |
| Policy not saving | Auto-save disabled | Call `enforcer.save_policy()` |
| Changes not reflected | Policy not reloaded | Call `enforcer.load_policy()` |
| Model syntax error | Invalid model.conf | Validate at https://casbin.org/editor |
| Database connection error | Wrong connection string | Verify asyncpg URL format |
| Role inheritance not working | Missing hierarchy policy | Add grouping policy for inheritance |

### Appendix E: Resources

- **Casbin Documentation**: https://casbin.org/docs/overview
- **Online Model Editor**: https://casbin.org/editor
- **Python Library**: https://github.com/casbin/pycasbin
- **Async SQLAlchemy Adapter**: https://github.com/pycasbin/async-sqlalchemy-adapter
- **FastAPI Security**: https://fastapi.tiangolo.com/tutorial/security/

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | December 2024 | - | Initial baseline specification |

---

*This document serves as the comprehensive baseline for RBAC implementation. All implementation decisions should reference this document. Contact the architecture team for clarifications or proposed changes.*
