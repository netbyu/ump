"""FastAPI Dependencies for Authentication and RBAC Permission Checking."""
import logging
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.auth.jwt import decode_access_token
from app.auth.casbin_config import get_enforcer
from app.auth.constants import Resources, Actions, WILDCARD_DOMAIN

logger = logging.getLogger(__name__)

# OAuth2 scheme for token extraction from Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get the current authenticated user from JWT token.

    Args:
        token: JWT token from Authorization header
        db: Database session

    Returns:
        User object

    Raises:
        HTTPException: 401 if token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token_data = decode_access_token(token)
    if token_data is None:
        raise credentials_exception

    # Query user from database
    result = await db.execute(
        select(User).where(User.username == token_data.username)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get the current active user.

    Args:
        current_user: User from get_current_user dependency

    Returns:
        User object if active

    Raises:
        HTTPException: 403 if user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


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
        require_tenant: bool = True,
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

        # Get tenant from user
        tenant_id = current_user.tenant_id

        if self.require_tenant and not tenant_id:
            # For platform admins or users without tenant, check with wildcard domain
            tenant_id = WILDCARD_DOMAIN

        # Perform permission check
        allowed = await enforcer.enforce(
            current_user.username,
            tenant_id or WILDCARD_DOMAIN,
            self.resource,
            self.action,
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
                detail=f"Permission denied: {self.action} on {self.resource}",
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
            self.action,
        )

        logger.info(
            f"RBAC: user={current_user.username} tenant={tenant_id} "
            f"resource={self.resource} action={self.action} "
            f"result={'ALLOW' if allowed else 'DENY'}"
        )

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied in tenant {tenant_id}",
            )

        return current_user


def require_permission(
    resource: Resources | str,
    action: Actions | str,
    require_tenant: bool = True,
):
    """
    Shorthand for permission checking dependency.

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
    Shorthand for tenant-scoped permission checking dependency.

    Usage:
        @router.get("/tenants/{tenant_id}/extensions")
        async def list_tenant_extensions(
            tenant_id: str,
            user = require_tenant_permission(Resources.EXTENSIONS, Actions.READ)
        ):
            ...
    """
    return Depends(TenantPermissionChecker(resource, action))
