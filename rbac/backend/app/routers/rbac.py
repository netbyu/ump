"""RBAC Management API Endpoints."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.dependencies import PermissionChecker
from app.auth.casbin_config import get_enforcer
from app.auth.constants import Resources, Actions
from app.schemas.rbac import (
    RoleAssignment,
    Permission,
    UserPermissionsResponse,
    PermissionCheckRequest,
    PermissionCheckResponse,
    RoleInfo,
    PermissionInfo,
)

router = APIRouter(prefix="/rbac", tags=["RBAC Management"])


# ============================================================================
# Role Management Endpoints
# ============================================================================


@router.get("/roles", response_model=List[str])
async def list_roles(
    user=Depends(PermissionChecker(Resources.RBAC, Actions.READ)),
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
    user=Depends(PermissionChecker(Resources.RBAC, Actions.READ)),
):
    """
    Get all permissions assigned to a specific role.

    Requires: rbac:read permission
    """
    enforcer = await get_enforcer()
    permissions = await enforcer.get_permissions_for_user(role)
    return [
        {"role": p[0], "tenant_id": p[1], "resource": p[2], "action": p[3]}
        for p in permissions
    ]


# ============================================================================
# User Role Assignment Endpoints
# ============================================================================


@router.get("/users/{username}/roles", response_model=List[dict])
async def get_user_roles(
    username: str,
    tenant_id: Optional[str] = None,
    user=Depends(PermissionChecker(Resources.RBAC, Actions.READ)),
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
            {"role": g[1], "tenant_id": g[2]} for g in groupings if g[0] == username
        ]
        return user_roles


@router.post("/users/roles", status_code=status.HTTP_201_CREATED)
async def assign_role_to_user(
    assignment: RoleAssignment,
    user=Depends(PermissionChecker(Resources.RBAC, Actions.UPDATE)),
):
    """
    Assign a role to a user within a tenant.

    Requires: rbac:update permission
    """
    enforcer = await get_enforcer()

    # Check if assignment already exists
    if await enforcer.has_grouping_policy(
        assignment.username, assignment.role, assignment.tenant_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role assignment already exists",
        )

    success = await enforcer.add_grouping_policy(
        assignment.username, assignment.role, assignment.tenant_id
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign role",
        )

    return {
        "message": f"Role '{assignment.role}' assigned to '{assignment.username}' in tenant '{assignment.tenant_id}'"
    }


@router.delete("/users/{username}/roles/{role}")
async def remove_role_from_user(
    username: str,
    role: str,
    tenant_id: str,
    user=Depends(PermissionChecker(Resources.RBAC, Actions.DELETE)),
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
            detail="Role assignment not found",
        )

    return {"message": f"Role '{role}' removed from '{username}' in tenant '{tenant_id}'"}


# ============================================================================
# Permission Management Endpoints
# ============================================================================


@router.get("/permissions", response_model=List[dict])
async def list_all_permissions(
    role: Optional[str] = None,
    tenant_id: Optional[str] = None,
    user=Depends(PermissionChecker(Resources.RBAC, Actions.READ)),
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
        result.append(
            {"role": p[0], "tenant_id": p[1], "resource": p[2], "action": p[3]}
        )

    return result


@router.post("/permissions", status_code=status.HTTP_201_CREATED)
async def add_permission(
    permission: Permission,
    user=Depends(PermissionChecker(Resources.RBAC, Actions.UPDATE)),
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
        permission.action,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Permission already exists",
        )

    return {"message": "Permission added successfully"}


@router.delete("/permissions")
async def remove_permission(
    permission: Permission,
    user=Depends(PermissionChecker(Resources.RBAC, Actions.DELETE)),
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
        permission.action,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Permission not found",
        )

    return {"message": "Permission removed successfully"}


# ============================================================================
# User Permissions Query Endpoints
# ============================================================================


@router.get("/users/{username}/permissions", response_model=UserPermissionsResponse)
async def get_user_permissions(
    username: str,
    tenant_id: Optional[str] = None,
    user=Depends(PermissionChecker(Resources.RBAC, Actions.READ)),
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
        RoleInfo(role=g[1], tenant_id=g[2]) for g in groupings if g[0] == username
    ]

    # Filter by tenant if specified
    if tenant_id:
        user_roles = [r for r in user_roles if r.tenant_id in [tenant_id, "*"]]

    # Get implicit permissions (including inherited)
    all_permissions: List[PermissionInfo] = []
    seen_permissions = set()

    for role_info in user_roles:
        try:
            perms = await enforcer.get_implicit_permissions_for_user(
                username, role_info.tenant_id
            )
            for p in perms:
                perm_key = (p[0], p[1], p[2], p[3])
                if perm_key not in seen_permissions:
                    seen_permissions.add(perm_key)
                    all_permissions.append(
                        PermissionInfo(
                            role=p[0], tenant_id=p[1], resource=p[2], action=p[3]
                        )
                    )
        except Exception:
            continue

    return UserPermissionsResponse(
        username=username,
        roles=user_roles,
        permissions=all_permissions,
    )


# ============================================================================
# Permission Check Endpoint
# ============================================================================


@router.post("/check", response_model=PermissionCheckResponse)
async def check_permission(
    request: PermissionCheckRequest,
    user=Depends(PermissionChecker(Resources.RBAC, Actions.READ)),
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
        request.action,
    )

    return PermissionCheckResponse(
        username=request.username,
        tenant_id=request.tenant_id,
        resource=request.resource,
        action=request.action,
        allowed=allowed,
    )


# ============================================================================
# Policy Reload Endpoint
# ============================================================================


@router.post("/reload")
async def reload_policies(
    user=Depends(PermissionChecker(Resources.RBAC, Actions.ADMIN)),
):
    """
    Reload all policies from database.

    Use after direct database modifications.

    Requires: rbac:admin permission
    """
    enforcer = await get_enforcer()
    await enforcer.load_policy()
    return {"message": "Policies reloaded successfully"}
