"""Authentication API endpoints."""
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_password
from app.models.user import User
from app.schemas.auth import Token, AuthResponse, UserBasic
from app.schemas.rbac import PermissionInfo, RoleInfo
from app.auth.dependencies import get_current_user
from app.auth.jwt import create_access_token
from app.auth.casbin_config import get_enforcer
from app.auth.constants import WILDCARD_DOMAIN

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=AuthResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate user and return JWT token.

    - **username**: User's username
    - **password**: User's password

    Returns access token and basic user info.
    """
    # Find user by username
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    # Create access token
    access_token = create_access_token(
        username=user.username,
        tenant_id=user.tenant_id,
    )

    return AuthResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserBasic(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            tenant_id=user.tenant_id,
            is_superuser=user.is_superuser,
        ),
    )


@router.get("/me", response_model=UserBasic)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """
    Get current authenticated user's information.

    Returns basic user info from JWT token.
    """
    return UserBasic(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        tenant_id=current_user.tenant_id,
        is_superuser=current_user.is_superuser,
    )


@router.get("/me/permissions", response_model=dict)
async def get_current_user_permissions(
    current_user: User = Depends(get_current_user),
):
    """
    Get current user's roles and permissions.

    Returns roles and effective permissions for the authenticated user.
    """
    enforcer = await get_enforcer()

    # Get user's roles
    groupings = enforcer.get_grouping_policy()
    user_roles = [
        RoleInfo(role=g[1], tenant_id=g[2])
        for g in groupings
        if g[0] == current_user.username
    ]

    # Get permissions across all domains
    all_permissions: List[PermissionInfo] = []
    seen_permissions = set()

    for role_info in user_roles:
        try:
            perms = await enforcer.get_implicit_permissions_for_user(
                current_user.username, role_info.tenant_id
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

    # Also check wildcard domain permissions
    if current_user.is_superuser or any(r.tenant_id == WILDCARD_DOMAIN for r in user_roles):
        try:
            perms = await enforcer.get_implicit_permissions_for_user(
                current_user.username, WILDCARD_DOMAIN
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
            pass

    return {
        "username": current_user.username,
        "tenant_id": current_user.tenant_id,
        "is_superuser": current_user.is_superuser,
        "roles": [{"role": r.role, "tenant_id": r.tenant_id} for r in user_roles],
        "permissions": [
            {
                "role": p.role,
                "tenant_id": p.tenant_id,
                "resource": p.resource,
                "action": p.action,
            }
            for p in all_permissions
        ],
    }


@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: User = Depends(get_current_user),
):
    """
    Refresh the access token.

    Returns a new access token for the authenticated user.
    """
    access_token = create_access_token(
        username=current_user.username,
        tenant_id=current_user.tenant_id,
    )

    return Token(access_token=access_token, token_type="bearer")
