# Casbin RBAC Implementation Guide

## Table of Contents

1. [Overview](#overview)
2. [Installation](#installation)
3. [Core Concepts](#core-concepts)
4. [Model Configuration](#model-configuration)
5. [Policy Management](#policy-management)
6. [FastAPI Integration](#fastapi-integration)
7. [Multi-Tenant RBAC](#multi-tenant-rbac)
8. [Database Adapter (PostgreSQL)](#database-adapter-postgresql)
9. [API Endpoints for RBAC Management](#api-endpoints-for-rbac-management)
10. [Testing](#testing)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Overview

Casbin is a powerful, efficient open-source access control library that supports various access control models including ACL, RBAC, RBAC with domains (multi-tenant), and ABAC.

**Why Casbin:**
- Model and policy separation (change access control without code changes)
- Multiple built-in models (ACL, RBAC, ABAC)
- Policy storage in files, databases, or custom adapters
- Role hierarchy support
- Fast performance with in-memory caching
- Language agnostic (same model works in Python, Go, Java, etc.)

**Official Resources:**
- Documentation: https://casbin.org/docs/overview
- Editor (test policies online): https://casbin.org/editor
- Python library: https://github.com/casbin/pycasbin

---

## Installation

```bash
# Core library
pip install casbin

# PostgreSQL adapter (recommended for production)
pip install casbin-sqlalchemy-adapter

# Async support (for FastAPI)
pip install casbin-async-sqlalchemy-adapter

# Optional: Redis adapter for distributed caching
pip install casbin-redis-adapter
```

**Requirements file addition:**
```txt
casbin>=1.36.0
casbin-sqlalchemy-adapter>=0.5.0
asyncpg>=0.29.0
```

---

## Core Concepts

### The Three Components

1. **Model (model.conf)** - Defines the access control structure
   - What does a request look like?
   - What does a policy look like?
   - How do we match them?

2. **Policy (policy.csv or database)** - The actual rules
   - Who has what role?
   - What can each role do?

3. **Enforcer** - The engine that evaluates requests against policies

### Request Flow

```
User Request → Enforcer.enforce(sub, obj, act) → Policy Check → Allow/Deny
                    ↓
              Model defines how to match
                    ↓
              Policy contains the rules
```

---

## Model Configuration

### Basic RBAC Model

Create `model.conf`:

```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

**Explanation:**
- `r = sub, obj, act` → Request has: subject (user), object (resource), action
- `p = sub, obj, act` → Policy has: subject (role), object (resource), action
- `g = _, _` → Grouping (user → role mapping)
- `e = some(where (p.eft == allow))` → Allow if any policy matches
- `m = ...` → Matcher: user must have role AND resource AND action must match

### RBAC with Resource Hierarchy

```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act

[role_definition]
g = _, _
g2 = _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub) && g2(r.obj, p.obj) && r.act == p.act
```

This allows resource grouping: `extensions` can be part of `telephony` resource group.

### RBAC with Domains (Multi-Tenant)

Create `model_multi_tenant.conf`:

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
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act
```

**Explanation:**
- `dom` = domain/tenant
- `g = _, _, _` → User has role within a specific tenant
- User can be admin in TenantA but only viewer in TenantB

### RBAC with Deny Override

```ini
[request_definition]
r = sub, obj, act

[policy_definition]
p = sub, obj, act, eft

[role_definition]
g = _, _

[policy_effect]
e = some(where (p.eft == allow)) && !some(where (p.eft == deny))

[matchers]
m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act
```

This allows explicit deny rules that override allows.

---

## Policy Management

### Policy File Format (CSV)

Create `policy.csv`:

```csv
# Policy rules: p, role, resource, action
p, admin, users, create
p, admin, users, read
p, admin, users, update
p, admin, users, delete
p, admin, extensions, create
p, admin, extensions, read
p, admin, extensions, update
p, admin, extensions, delete
p, admin, trunks, *
p, admin, reports, *

p, operator, extensions, read
p, operator, extensions, update
p, operator, users, read
p, operator, reports, read

p, viewer, extensions, read
p, viewer, users, read
p, viewer, reports, read

# Role assignments: g, user, role
g, eric, admin
g, john, operator
g, sarah, viewer

# Role hierarchy (operator inherits viewer permissions)
g, operator, viewer
```

### Multi-Tenant Policy

```csv
# Policy: p, role, tenant, resource, action
p, tenant_admin, *, users, *
p, tenant_admin, *, extensions, *
p, operator, *, extensions, read
p, operator, *, extensions, update

# Role assignments: g, user, role, tenant
g, eric, platform_admin, *
g, john, tenant_admin, tenant_acme
g, john, operator, tenant_globex
g, sarah, viewer, tenant_acme
```

### Wildcard Patterns

```csv
# Asterisk matches anything
p, admin, *, *                    # Admin can do anything to any resource
p, operator, extensions, *        # Operator can do anything to extensions
p, viewer, *, read                # Viewer can read any resource

# Regex patterns (if using KeyMatch or RegexMatch in model)
p, admin, /api/v1/*, *            # Match URL patterns
p, operator, /api/v1/extensions/*, read
```

---

## FastAPI Integration

### Project Structure

```
app/
├── main.py
├── auth/
│   ├── __init__.py
│   ├── casbin_config.py
│   ├── dependencies.py
│   ├── model.conf
│   └── policy.csv
├── routers/
│   ├── extensions.py
│   └── users.py
└── models/
    └── user.py
```

### Casbin Configuration

Create `app/auth/casbin_config.py`:

```python
import casbin
from casbin_sqlalchemy_adapter import Adapter
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent
MODEL_PATH = BASE_DIR / "model.conf"

# Database URL for policy storage
DATABASE_URL = "postgresql://user:pass@localhost/ucmp"


class CasbinEnforcer:
    _instance: casbin.Enforcer | None = None

    @classmethod
    def get_enforcer(cls) -> casbin.Enforcer:
        if cls._instance is None:
            # Use database adapter for production
            adapter = Adapter(DATABASE_URL)
            
            cls._instance = casbin.Enforcer(str(MODEL_PATH), adapter)
            
            # Enable auto-save (policy changes persist to DB)
            cls._instance.enable_auto_save(True)
            
            # Load policies from DB
            cls._instance.load_policy()
        
        return cls._instance

    @classmethod
    def reload_policy(cls):
        """Reload policies from database (call after external changes)"""
        if cls._instance:
            cls._instance.load_policy()


def get_enforcer() -> casbin.Enforcer:
    return CasbinEnforcer.get_enforcer()
```

### Async Version (Recommended for FastAPI)

```python
import casbin
from casbin_async_sqlalchemy_adapter import Adapter
from pathlib import Path
import asyncio

BASE_DIR = Path(__file__).parent
MODEL_PATH = BASE_DIR / "model.conf"
DATABASE_URL = "postgresql+asyncpg://user:pass@localhost/ucmp"


class AsyncCasbinEnforcer:
    _instance: casbin.AsyncEnforcer | None = None
    _lock = asyncio.Lock()

    @classmethod
    async def get_enforcer(cls) -> casbin.AsyncEnforcer:
        async with cls._lock:
            if cls._instance is None:
                adapter = Adapter(DATABASE_URL)
                await adapter.create_table()
                
                cls._instance = casbin.AsyncEnforcer(str(MODEL_PATH), adapter)
                await cls._instance.load_policy()
            
            return cls._instance

    @classmethod
    async def reload_policy(cls):
        if cls._instance:
            await cls._instance.load_policy()


async def get_enforcer() -> casbin.AsyncEnforcer:
    return await AsyncCasbinEnforcer.get_enforcer()
```

### Dependencies

Create `app/auth/dependencies.py`:

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from functools import wraps
from typing import Callable
import casbin

from .casbin_config import get_enforcer
from ..models.user import User, get_current_user

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


class PermissionChecker:
    """Dependency class for checking permissions"""
    
    def __init__(self, resource: str, action: str):
        self.resource = resource
        self.action = action

    def __call__(
        self,
        current_user: User = Depends(get_current_user),
        enforcer: casbin.Enforcer = Depends(get_enforcer)
    ) -> User:
        # Check permission
        if not enforcer.enforce(current_user.username, self.resource, self.action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.action} on {self.resource}"
            )
        return current_user


def require_permission(resource: str, action: str):
    """Decorator for route-level permission checks"""
    return Depends(PermissionChecker(resource, action))


# Async version
class AsyncPermissionChecker:
    def __init__(self, resource: str, action: str):
        self.resource = resource
        self.action = action

    async def __call__(
        self,
        current_user: User = Depends(get_current_user),
    ) -> User:
        enforcer = await get_enforcer()
        
        if not await enforcer.enforce(current_user.username, self.resource, self.action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.action} on {self.resource}"
            )
        return current_user
```

### Multi-Tenant Permission Checker

```python
class TenantPermissionChecker:
    """Check permissions within a specific tenant context"""
    
    def __init__(self, resource: str, action: str):
        self.resource = resource
        self.action = action

    async def __call__(
        self,
        tenant_id: str,  # From path parameter or header
        current_user: User = Depends(get_current_user),
    ) -> User:
        enforcer = await get_enforcer()
        
        # Check: can user do action on resource in this tenant?
        if not await enforcer.enforce(
            current_user.username,
            tenant_id,
            self.resource,
            self.action
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied in tenant {tenant_id}"
            )
        return current_user
```

### Router Example

Create `app/routers/extensions.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from typing import List

from ..auth.dependencies import require_permission, PermissionChecker
from ..models.extension import Extension, ExtensionCreate, ExtensionUpdate
from ..services.extension_service import ExtensionService

router = APIRouter(prefix="/extensions", tags=["Extensions"])


@router.get("/", response_model=List[Extension])
async def list_extensions(
    user = Depends(PermissionChecker("extensions", "read")),
    service: ExtensionService = Depends()
):
    """List all extensions (requires extensions:read)"""
    return await service.get_all()


@router.get("/{extension_id}", response_model=Extension)
async def get_extension(
    extension_id: int,
    user = Depends(PermissionChecker("extensions", "read")),
    service: ExtensionService = Depends()
):
    """Get single extension (requires extensions:read)"""
    return await service.get_by_id(extension_id)


@router.post("/", response_model=Extension, status_code=201)
async def create_extension(
    data: ExtensionCreate,
    user = Depends(PermissionChecker("extensions", "create")),
    service: ExtensionService = Depends()
):
    """Create extension (requires extensions:create)"""
    return await service.create(data)


@router.put("/{extension_id}", response_model=Extension)
async def update_extension(
    extension_id: int,
    data: ExtensionUpdate,
    user = Depends(PermissionChecker("extensions", "update")),
    service: ExtensionService = Depends()
):
    """Update extension (requires extensions:update)"""
    return await service.update(extension_id, data)


@router.delete("/{extension_id}", status_code=204)
async def delete_extension(
    extension_id: int,
    user = Depends(PermissionChecker("extensions", "delete")),
    service: ExtensionService = Depends()
):
    """Delete extension (requires extensions:delete)"""
    await service.delete(extension_id)
```

### Main Application

Create `app/main.py`:

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager

from .auth.casbin_config import AsyncCasbinEnforcer
from .routers import extensions, users, rbac


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Casbin enforcer on startup
    await AsyncCasbinEnforcer.get_enforcer()
    yield
    # Cleanup if needed


app = FastAPI(
    title="UCMP API",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(extensions.router)
app.include_router(users.router)
app.include_router(rbac.router)  # Admin endpoints for managing RBAC
```

---

## Multi-Tenant RBAC

### Model for Multi-Tenant

Create `model_multi_tenant.conf`:

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
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act
```

### Multi-Tenant Policy Examples

```csv
# Platform admin - all tenants
p, platform_admin, *, *, *

# Tenant admin - full access within their tenant
p, tenant_admin, tenant_acme, users, *
p, tenant_admin, tenant_acme, extensions, *
p, tenant_admin, tenant_acme, trunks, *
p, tenant_admin, tenant_acme, reports, *

# Operator role permissions
p, operator, tenant_acme, extensions, read
p, operator, tenant_acme, extensions, update
p, operator, tenant_acme, reports, read

# User-role-tenant assignments
g, eric, platform_admin, *
g, john, tenant_admin, tenant_acme
g, john, operator, tenant_globex
g, sarah, operator, tenant_acme
```

### Multi-Tenant Router

```python
from fastapi import APIRouter, Depends, Header

router = APIRouter(prefix="/tenants/{tenant_id}/extensions")


@router.get("/")
async def list_tenant_extensions(
    tenant_id: str,
    user = Depends(TenantPermissionChecker("extensions", "read"))
):
    """List extensions for a specific tenant"""
    return await extension_service.get_by_tenant(tenant_id)
```

### Extracting Tenant from JWT

```python
from fastapi import Depends, HTTPException
from jose import jwt, JWTError


async def get_current_tenant(
    token: str = Depends(oauth2_scheme)
) -> str:
    """Extract tenant_id from JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        tenant_id = payload.get("tenant_id")
        if not tenant_id:
            raise HTTPException(401, "No tenant in token")
        return tenant_id
    except JWTError:
        raise HTTPException(401, "Invalid token")
```

---

## Database Adapter (PostgreSQL)

### Automatic Table Creation

The SQLAlchemy adapter creates a `casbin_rule` table:

```sql
CREATE TABLE casbin_rule (
    id SERIAL PRIMARY KEY,
    ptype VARCHAR(255),  -- 'p' for policy, 'g' for grouping
    v0 VARCHAR(255),     -- subject/user
    v1 VARCHAR(255),     -- object/role/domain
    v2 VARCHAR(255),     -- action/resource
    v3 VARCHAR(255),     -- additional field
    v4 VARCHAR(255),
    v5 VARCHAR(255)
);

-- Index for performance
CREATE INDEX idx_casbin_rule_ptype ON casbin_rule(ptype);
CREATE INDEX idx_casbin_rule_v0 ON casbin_rule(v0);
CREATE INDEX idx_casbin_rule_v1 ON casbin_rule(v1);
```

### Seeding Initial Policies

Create `app/auth/seed_policies.py`:

```python
import casbin
from casbin_sqlalchemy_adapter import Adapter


def seed_rbac_policies(database_url: str, model_path: str):
    """Seed initial RBAC policies"""
    
    adapter = Adapter(database_url)
    enforcer = casbin.Enforcer(model_path, adapter)
    
    # Clear existing policies (careful in production!)
    # enforcer.clear_policy()
    
    # Define roles and permissions
    policies = [
        # Admin role
        ("admin", "users", "create"),
        ("admin", "users", "read"),
        ("admin", "users", "update"),
        ("admin", "users", "delete"),
        ("admin", "extensions", "*"),
        ("admin", "trunks", "*"),
        ("admin", "reports", "*"),
        ("admin", "settings", "*"),
        
        # Operator role
        ("operator", "extensions", "read"),
        ("operator", "extensions", "update"),
        ("operator", "users", "read"),
        ("operator", "reports", "read"),
        
        # Viewer role
        ("viewer", "extensions", "read"),
        ("viewer", "users", "read"),
        ("viewer", "reports", "read"),
    ]
    
    for policy in policies:
        if not enforcer.has_policy(*policy):
            enforcer.add_policy(*policy)
    
    # Role hierarchy (operator inherits viewer)
    if not enforcer.has_grouping_policy("operator", "viewer"):
        enforcer.add_grouping_policy("operator", "viewer")
    
    # Admin inherits operator (and transitively viewer)
    if not enforcer.has_grouping_policy("admin", "operator"):
        enforcer.add_grouping_policy("admin", "operator")
    
    # Assign initial users
    user_roles = [
        ("eric", "admin"),
        ("john", "operator"),
        ("sarah", "viewer"),
    ]
    
    for user, role in user_roles:
        if not enforcer.has_grouping_policy(user, role):
            enforcer.add_grouping_policy(user, role)
    
    enforcer.save_policy()
    print("RBAC policies seeded successfully")


if __name__ == "__main__":
    seed_rbac_policies(
        "postgresql://user:pass@localhost/ucmp",
        "model.conf"
    )
```

---

## API Endpoints for RBAC Management

Create `app/routers/rbac.py`:

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

from ..auth.dependencies import PermissionChecker
from ..auth.casbin_config import get_enforcer

router = APIRouter(prefix="/rbac", tags=["RBAC Management"])


# Pydantic models
class RoleAssignment(BaseModel):
    username: str
    role: str


class Permission(BaseModel):
    role: str
    resource: str
    action: str


class UserPermissions(BaseModel):
    username: str
    roles: List[str]
    permissions: List[dict]


# Endpoints

@router.get("/roles", response_model=List[str])
async def list_roles(
    user = Depends(PermissionChecker("rbac", "read")),
    enforcer = Depends(get_enforcer)
):
    """List all defined roles"""
    policies = enforcer.get_all_roles()
    return list(set(policies))


@router.get("/permissions", response_model=List[dict])
async def list_permissions(
    user = Depends(PermissionChecker("rbac", "read")),
    enforcer = Depends(get_enforcer)
):
    """List all policy rules"""
    policies = enforcer.get_policy()
    return [
        {"role": p[0], "resource": p[1], "action": p[2]}
        for p in policies
    ]


@router.get("/users/{username}/permissions", response_model=UserPermissions)
async def get_user_permissions(
    username: str,
    user = Depends(PermissionChecker("rbac", "read")),
    enforcer = Depends(get_enforcer)
):
    """Get all roles and permissions for a user"""
    roles = enforcer.get_roles_for_user(username)
    
    # Get implicit permissions (including inherited)
    permissions = []
    for role in roles:
        role_permissions = enforcer.get_permissions_for_user(role)
        for perm in role_permissions:
            permissions.append({
                "role": perm[0],
                "resource": perm[1],
                "action": perm[2]
            })
    
    return UserPermissions(
        username=username,
        roles=roles,
        permissions=permissions
    )


@router.post("/users/roles")
async def assign_role(
    assignment: RoleAssignment,
    user = Depends(PermissionChecker("rbac", "write")),
    enforcer = Depends(get_enforcer)
):
    """Assign a role to a user"""
    success = enforcer.add_grouping_policy(assignment.username, assignment.role)
    if not success:
        raise HTTPException(400, "Role assignment already exists")
    return {"message": f"Role '{assignment.role}' assigned to '{assignment.username}'"}


@router.delete("/users/{username}/roles/{role}")
async def remove_role(
    username: str,
    role: str,
    user = Depends(PermissionChecker("rbac", "write")),
    enforcer = Depends(get_enforcer)
):
    """Remove a role from a user"""
    success = enforcer.remove_grouping_policy(username, role)
    if not success:
        raise HTTPException(404, "Role assignment not found")
    return {"message": f"Role '{role}' removed from '{username}'"}


@router.post("/permissions")
async def add_permission(
    permission: Permission,
    user = Depends(PermissionChecker("rbac", "write")),
    enforcer = Depends(get_enforcer)
):
    """Add a permission to a role"""
    success = enforcer.add_policy(
        permission.role,
        permission.resource,
        permission.action
    )
    if not success:
        raise HTTPException(400, "Permission already exists")
    return {"message": "Permission added"}


@router.delete("/permissions")
async def remove_permission(
    permission: Permission,
    user = Depends(PermissionChecker("rbac", "write")),
    enforcer = Depends(get_enforcer)
):
    """Remove a permission from a role"""
    success = enforcer.remove_policy(
        permission.role,
        permission.resource,
        permission.action
    )
    if not success:
        raise HTTPException(404, "Permission not found")
    return {"message": "Permission removed"}


@router.get("/check")
async def check_permission(
    username: str,
    resource: str,
    action: str,
    user = Depends(PermissionChecker("rbac", "read")),
    enforcer = Depends(get_enforcer)
):
    """Check if a user has a specific permission"""
    allowed = enforcer.enforce(username, resource, action)
    return {
        "username": username,
        "resource": resource,
        "action": action,
        "allowed": allowed
    }


@router.post("/reload")
async def reload_policies(
    user = Depends(PermissionChecker("rbac", "admin")),
    enforcer = Depends(get_enforcer)
):
    """Reload policies from database"""
    enforcer.load_policy()
    return {"message": "Policies reloaded"}
```

---

## Testing

### Unit Tests

Create `tests/test_rbac.py`:

```python
import pytest
import casbin
from pathlib import Path


@pytest.fixture
def enforcer():
    """Create test enforcer with in-memory adapter"""
    model_path = Path(__file__).parent.parent / "app/auth/model.conf"
    e = casbin.Enforcer(str(model_path))
    
    # Add test policies
    e.add_policy("admin", "users", "create")
    e.add_policy("admin", "users", "read")
    e.add_policy("admin", "users", "update")
    e.add_policy("admin", "users", "delete")
    e.add_policy("operator", "users", "read")
    e.add_policy("viewer", "users", "read")
    
    # Add role assignments
    e.add_grouping_policy("alice", "admin")
    e.add_grouping_policy("bob", "operator")
    e.add_grouping_policy("charlie", "viewer")
    
    return e


class TestRBAC:
    def test_admin_can_create_users(self, enforcer):
        assert enforcer.enforce("alice", "users", "create") is True

    def test_admin_can_delete_users(self, enforcer):
        assert enforcer.enforce("alice", "users", "delete") is True

    def test_operator_can_read_users(self, enforcer):
        assert enforcer.enforce("bob", "users", "read") is True

    def test_operator_cannot_delete_users(self, enforcer):
        assert enforcer.enforce("bob", "users", "delete") is False

    def test_viewer_can_only_read(self, enforcer):
        assert enforcer.enforce("charlie", "users", "read") is True
        assert enforcer.enforce("charlie", "users", "create") is False
        assert enforcer.enforce("charlie", "users", "update") is False
        assert enforcer.enforce("charlie", "users", "delete") is False

    def test_unknown_user_denied(self, enforcer):
        assert enforcer.enforce("unknown", "users", "read") is False


class TestRoleHierarchy:
    def test_role_inheritance(self, enforcer):
        # Add hierarchy: admin inherits operator
        enforcer.add_grouping_policy("admin", "operator")
        enforcer.add_grouping_policy("operator", "viewer")
        
        # Add viewer-only permission
        enforcer.add_policy("viewer", "reports", "read")
        
        # Admin should inherit through chain
        assert enforcer.enforce("alice", "reports", "read") is True


class TestDynamicPolicyChanges:
    def test_add_and_remove_role(self, enforcer):
        # Initially denied
        assert enforcer.enforce("newuser", "users", "read") is False
        
        # Assign role
        enforcer.add_grouping_policy("newuser", "viewer")
        assert enforcer.enforce("newuser", "users", "read") is True
        
        # Remove role
        enforcer.remove_grouping_policy("newuser", "viewer")
        assert enforcer.enforce("newuser", "users", "read") is False
```

### Integration Tests

```python
import pytest
from httpx import AsyncClient
from app.main import app


@pytest.fixture
async def admin_client():
    """Client authenticated as admin"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Login as admin
        response = await client.post("/token", data={
            "username": "admin",
            "password": "adminpass"
        })
        token = response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"
        yield client


@pytest.fixture
async def viewer_client():
    """Client authenticated as viewer"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post("/token", data={
            "username": "viewer",
            "password": "viewerpass"
        })
        token = response.json()["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"
        yield client


class TestEndpointPermissions:
    async def test_admin_can_create_extension(self, admin_client):
        response = await admin_client.post("/extensions", json={
            "number": "1001",
            "name": "Test Extension"
        })
        assert response.status_code == 201

    async def test_viewer_cannot_create_extension(self, viewer_client):
        response = await viewer_client.post("/extensions", json={
            "number": "1001",
            "name": "Test Extension"
        })
        assert response.status_code == 403

    async def test_viewer_can_read_extensions(self, viewer_client):
        response = await viewer_client.get("/extensions")
        assert response.status_code == 200
```

---

## Best Practices

### 1. Use Role Hierarchy

```csv
# Instead of duplicating permissions
g, admin, operator
g, operator, viewer

# Now admin has all operator permissions
# Operator has all viewer permissions
```

### 2. Group Resources Logically

```python
RESOURCES = {
    "telephony": ["extensions", "trunks", "routes", "queues"],
    "users": ["users", "groups", "roles"],
    "reports": ["cdr", "analytics", "dashboards"],
    "system": ["settings", "integrations", "logs"]
}
```

### 3. Use Constants for Actions

```python
class Actions:
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXECUTE = "execute"  # For running reports, etc.
    ADMIN = "admin"      # Full control
```

### 4. Cache Enforcer Instance

```python
# DO THIS (singleton)
enforcer = CasbinEnforcer.get_enforcer()

# NOT THIS (creates new instance each request)
enforcer = casbin.Enforcer(model_path, adapter)
```

### 5. Reload Policies on Change

```python
# After external DB changes
enforcer.load_policy()

# Or use a watcher for automatic reload
from casbin_redis_watcher import RedisWatcher
watcher = RedisWatcher("redis://localhost:6379")
enforcer.set_watcher(watcher)
```

### 6. Audit Permission Checks

```python
import logging

logger = logging.getLogger("rbac")

def enforce_with_audit(enforcer, sub, obj, act):
    result = enforcer.enforce(sub, obj, act)
    logger.info(f"RBAC: {sub} -> {obj}:{act} = {'ALLOW' if result else 'DENY'}")
    return result
```

### 7. Handle Wildcards Carefully

```python
# Wildcard in policy
p, admin, *, *

# Check specific permission (not wildcard)
enforcer.enforce("alice", "users", "delete")  # ✓

# Don't check with wildcards in request
enforcer.enforce("alice", "*", "*")  # ✗ Bad practice
```

---

## Troubleshooting

### Common Issues

**1. Permission always denied**
```python
# Check if user has role
roles = enforcer.get_roles_for_user("username")
print(f"Roles: {roles}")

# Check if role has permission
perms = enforcer.get_permissions_for_user("role")
print(f"Permissions: {perms}")

# Check implicit permissions
implicit = enforcer.get_implicit_permissions_for_user("username")
print(f"Implicit: {implicit}")
```

**2. Policies not persisting**
```python
# Ensure auto-save is enabled
enforcer.enable_auto_save(True)

# Or manually save
enforcer.save_policy()
```

**3. Changes not reflected**
```python
# Reload from database
enforcer.load_policy()
```

**4. Model syntax errors**
```bash
# Validate model online
https://casbin.org/editor

# Common issues:
# - Missing newline between sections
# - Incorrect number of parameters in g = _, _
# - Typo in matcher
```

### Debug Mode

```python
# Enable Casbin logging
import logging
logging.getLogger("casbin").setLevel(logging.DEBUG)

# Custom debug function
def debug_enforce(enforcer, sub, obj, act):
    print(f"\n=== RBAC Debug ===")
    print(f"Request: {sub}, {obj}, {act}")
    print(f"User roles: {enforcer.get_roles_for_user(sub)}")
    print(f"All policies: {enforcer.get_policy()}")
    print(f"All groupings: {enforcer.get_grouping_policy()}")
    result = enforcer.enforce(sub, obj, act)
    print(f"Result: {result}")
    return result
```

---

## Quick Reference

### Enforcer Methods

```python
# Policy management
enforcer.add_policy(role, resource, action)
enforcer.remove_policy(role, resource, action)
enforcer.has_policy(role, resource, action)
enforcer.get_policy()

# Role assignment
enforcer.add_grouping_policy(user, role)
enforcer.remove_grouping_policy(user, role)
enforcer.get_roles_for_user(user)
enforcer.get_users_for_role(role)

# Permission check
enforcer.enforce(user, resource, action)
enforcer.get_permissions_for_user(user)
enforcer.get_implicit_permissions_for_user(user)

# Persistence
enforcer.save_policy()
enforcer.load_policy()
enforcer.enable_auto_save(True)
```

### Multi-Tenant Methods

```python
# With domains
enforcer.add_policy(role, tenant, resource, action)
enforcer.add_grouping_policy(user, role, tenant)
enforcer.enforce(user, tenant, resource, action)
enforcer.get_roles_for_user_in_domain(user, tenant)
```

---

## Resources

- **Official Docs**: https://casbin.org/docs/overview
- **Online Editor**: https://casbin.org/editor
- **Python Library**: https://github.com/casbin/pycasbin
- **SQLAlchemy Adapter**: https://github.com/pycasbin/sqlalchemy-adapter
- **Async Adapter**: https://github.com/pycasbin/async-sqlalchemy-adapter
- **Examples**: https://github.com/casbin/pycasbin/tree/master/examples