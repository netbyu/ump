"""JWT token creation and validation."""
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import settings


class TokenData(BaseModel):
    """Data extracted from JWT token."""

    username: str
    tenant_id: Optional[str] = None
    exp: Optional[datetime] = None


def create_access_token(
    username: str,
    tenant_id: Optional[str] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a JWT access token.

    Args:
        username: The username to encode in the token
        tenant_id: Optional tenant ID for multi-tenant support
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token string
    """
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )

    to_encode = {
        "sub": username,
        "exp": expire,
    }

    if tenant_id:
        to_encode["tenant_id"] = tenant_id

    encoded_jwt = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm,
    )

    return encoded_jwt


def decode_access_token(token: str) -> Optional[TokenData]:
    """
    Decode and validate a JWT access token.

    Args:
        token: The JWT token string to decode

    Returns:
        TokenData if valid, None if invalid or expired
    """
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )

        username: str = payload.get("sub")
        if username is None:
            return None

        tenant_id: Optional[str] = payload.get("tenant_id")
        exp: Optional[datetime] = None

        if "exp" in payload:
            exp = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)

        return TokenData(username=username, tenant_id=tenant_id, exp=exp)

    except JWTError:
        return None


def verify_token(token: str) -> bool:
    """
    Verify if a token is valid without extracting data.

    Args:
        token: The JWT token string to verify

    Returns:
        True if valid, False otherwise
    """
    return decode_access_token(token) is not None
