"""
Credential Manager
==================
Secure credential storage and retrieval with encryption.
Supports multiple backends (DB, Vault, environment).
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os
import json
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# Models
# =============================================================================

class StoredCredential(BaseModel):
    """Stored credential record"""
    id: str
    connector_id: str
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None
    name: str                               # User-friendly name for this credential set
    encrypted_data: str                     # Encrypted JSON of credentials
    auth_type: str
    
    # OAuth2 specific (stored separately for refresh handling)
    access_token_encrypted: Optional[str] = None
    refresh_token_encrypted: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    last_used_at: Optional[datetime] = None
    is_valid: bool = True                   # Set to False if auth fails


# =============================================================================
# Encryption Helper
# =============================================================================

class EncryptionHelper:
    """Handles encryption/decryption of credential data"""
    
    def __init__(self, secret_key: str, salt: bytes = None):
        """
        Initialize with a secret key.
        In production, this should come from a secure source (env var, Vault, etc.)
        """
        self.salt = salt or b'ucmp_connector_salt_v1'  # In prod, use unique salt per credential
        self._fernet = self._create_fernet(secret_key)
    
    def _create_fernet(self, secret_key: str) -> Fernet:
        """Derive a Fernet key from the secret"""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=self.salt,
            iterations=480000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret_key.encode()))
        return Fernet(key)
    
    def encrypt(self, data: Dict[str, Any]) -> str:
        """Encrypt a dictionary to a base64 string"""
        json_data = json.dumps(data)
        encrypted = self._fernet.encrypt(json_data.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    
    def decrypt(self, encrypted_data: str) -> Dict[str, Any]:
        """Decrypt a base64 string back to a dictionary"""
        encrypted = base64.urlsafe_b64decode(encrypted_data.encode())
        decrypted = self._fernet.decrypt(encrypted)
        return json.loads(decrypted.decode())


# =============================================================================
# Backend Interface
# =============================================================================

class CredentialBackend(ABC):
    """Abstract backend for credential storage"""
    
    @abstractmethod
    async def store(self, credential: StoredCredential) -> str:
        """Store a credential, return ID"""
        pass
    
    @abstractmethod
    async def retrieve(self, credential_id: str) -> Optional[StoredCredential]:
        """Retrieve a credential by ID"""
        pass
    
    @abstractmethod
    async def update(self, credential: StoredCredential) -> bool:
        """Update an existing credential"""
        pass
    
    @abstractmethod
    async def delete(self, credential_id: str) -> bool:
        """Delete a credential"""
        pass
    
    @abstractmethod
    async def list_for_user(
        self,
        user_id: str,
        tenant_id: Optional[str] = None,
        connector_id: Optional[str] = None
    ) -> List[StoredCredential]:
        """List credentials for a user"""
        pass
    
    @abstractmethod
    async def list_for_connector(
        self,
        connector_id: str,
        tenant_id: Optional[str] = None
    ) -> List[StoredCredential]:
        """List all credentials for a connector"""
        pass


# =============================================================================
# PostgreSQL Backend
# =============================================================================

class PostgresCredentialBackend(CredentialBackend):
    """PostgreSQL-backed credential storage"""
    
    def __init__(self, connection_pool):
        """
        Initialize with an asyncpg connection pool.
        
        Example:
            pool = await asyncpg.create_pool(dsn="postgresql://...")
            backend = PostgresCredentialBackend(pool)
        """
        self.pool = connection_pool
    
    async def store(self, credential: StoredCredential) -> str:
        """Store credential in PostgreSQL"""
        async with self.pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO connector_credentials (
                    id, connector_id, tenant_id, user_id, name,
                    encrypted_data, auth_type,
                    access_token_encrypted, refresh_token_encrypted, token_expires_at,
                    created_at, updated_at, last_used_at, is_valid
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                ON CONFLICT (id) DO UPDATE SET
                    encrypted_data = EXCLUDED.encrypted_data,
                    access_token_encrypted = EXCLUDED.access_token_encrypted,
                    refresh_token_encrypted = EXCLUDED.refresh_token_encrypted,
                    token_expires_at = EXCLUDED.token_expires_at,
                    updated_at = EXCLUDED.updated_at,
                    is_valid = EXCLUDED.is_valid
            """,
                credential.id, credential.connector_id, credential.tenant_id,
                credential.user_id, credential.name, credential.encrypted_data,
                credential.auth_type, credential.access_token_encrypted,
                credential.refresh_token_encrypted, credential.token_expires_at,
                credential.created_at, credential.updated_at,
                credential.last_used_at, credential.is_valid
            )
        return credential.id
    
    async def retrieve(self, credential_id: str) -> Optional[StoredCredential]:
        """Retrieve credential by ID"""
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM connector_credentials WHERE id = $1",
                credential_id
            )
            if row:
                return StoredCredential(**dict(row))
        return None
    
    async def update(self, credential: StoredCredential) -> bool:
        """Update credential"""
        credential.updated_at = datetime.utcnow()
        async with self.pool.acquire() as conn:
            result = await conn.execute("""
                UPDATE connector_credentials SET
                    name = $2, encrypted_data = $3, auth_type = $4,
                    access_token_encrypted = $5, refresh_token_encrypted = $6,
                    token_expires_at = $7, updated_at = $8, 
                    last_used_at = $9, is_valid = $10
                WHERE id = $1
            """,
                credential.id, credential.name, credential.encrypted_data,
                credential.auth_type, credential.access_token_encrypted,
                credential.refresh_token_encrypted, credential.token_expires_at,
                credential.updated_at, credential.last_used_at, credential.is_valid
            )
            return result == "UPDATE 1"
    
    async def delete(self, credential_id: str) -> bool:
        """Delete credential"""
        async with self.pool.acquire() as conn:
            result = await conn.execute(
                "DELETE FROM connector_credentials WHERE id = $1",
                credential_id
            )
            return result == "DELETE 1"
    
    async def list_for_user(
        self,
        user_id: str,
        tenant_id: Optional[str] = None,
        connector_id: Optional[str] = None
    ) -> List[StoredCredential]:
        """List credentials for a user"""
        query = "SELECT * FROM connector_credentials WHERE user_id = $1"
        params = [user_id]
        
        if tenant_id:
            params.append(tenant_id)
            query += f" AND tenant_id = ${len(params)}"
        if connector_id:
            params.append(connector_id)
            query += f" AND connector_id = ${len(params)}"
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
            return [StoredCredential(**dict(row)) for row in rows]
    
    async def list_for_connector(
        self,
        connector_id: str,
        tenant_id: Optional[str] = None
    ) -> List[StoredCredential]:
        """List all credentials for a connector"""
        if tenant_id:
            query = """
                SELECT * FROM connector_credentials 
                WHERE connector_id = $1 AND tenant_id = $2
            """
            params = [connector_id, tenant_id]
        else:
            query = "SELECT * FROM connector_credentials WHERE connector_id = $1"
            params = [connector_id]
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, *params)
            return [StoredCredential(**dict(row)) for row in rows]


# =============================================================================
# In-Memory Backend (for testing)
# =============================================================================

class InMemoryCredentialBackend(CredentialBackend):
    """In-memory credential storage for testing"""
    
    def __init__(self):
        self._credentials: Dict[str, StoredCredential] = {}
    
    async def store(self, credential: StoredCredential) -> str:
        self._credentials[credential.id] = credential
        return credential.id
    
    async def retrieve(self, credential_id: str) -> Optional[StoredCredential]:
        return self._credentials.get(credential_id)
    
    async def update(self, credential: StoredCredential) -> bool:
        if credential.id in self._credentials:
            credential.updated_at = datetime.utcnow()
            self._credentials[credential.id] = credential
            return True
        return False
    
    async def delete(self, credential_id: str) -> bool:
        if credential_id in self._credentials:
            del self._credentials[credential_id]
            return True
        return False
    
    async def list_for_user(
        self,
        user_id: str,
        tenant_id: Optional[str] = None,
        connector_id: Optional[str] = None
    ) -> List[StoredCredential]:
        results = []
        for cred in self._credentials.values():
            if cred.user_id != user_id:
                continue
            if tenant_id and cred.tenant_id != tenant_id:
                continue
            if connector_id and cred.connector_id != connector_id:
                continue
            results.append(cred)
        return results
    
    async def list_for_connector(
        self,
        connector_id: str,
        tenant_id: Optional[str] = None
    ) -> List[StoredCredential]:
        results = []
        for cred in self._credentials.values():
            if cred.connector_id != connector_id:
                continue
            if tenant_id and cred.tenant_id != tenant_id:
                continue
            results.append(cred)
        return results


# =============================================================================
# Credential Manager
# =============================================================================

class CredentialManager:
    """
    High-level credential management.
    Handles encryption, storage, and retrieval of credentials.
    """
    
    def __init__(
        self,
        backend: CredentialBackend,
        encryption_key: str = None
    ):
        """
        Initialize credential manager.
        
        Args:
            backend: Storage backend (PostgreSQL, in-memory, etc.)
            encryption_key: Key for encrypting credentials. 
                           Defaults to UCMP_CREDENTIAL_KEY env var.
        """
        self.backend = backend
        
        # Get encryption key
        key = encryption_key or os.environ.get("UCMP_CREDENTIAL_KEY")
        if not key:
            logger.warning(
                "No encryption key provided. Using default (INSECURE for production!)"
            )
            key = "default-dev-key-change-in-production"
        
        self.encryption = EncryptionHelper(key)
    
    async def store_credentials(
        self,
        connector_id: str,
        credentials: Dict[str, Any],
        name: str,
        auth_type: str,
        user_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        credential_id: Optional[str] = None
    ) -> str:
        """
        Store credentials securely.
        
        Args:
            connector_id: ID of the connector these credentials are for
            credentials: Dictionary of credential values (api_key, username, etc.)
            name: User-friendly name for this credential set
            auth_type: Type of authentication
            user_id: Optional user ID
            tenant_id: Optional tenant ID for multi-tenancy
            credential_id: Optional ID (generated if not provided)
            
        Returns:
            Credential ID
        """
        import uuid
        
        cred_id = credential_id or str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Encrypt the credentials
        encrypted_data = self.encryption.encrypt(credentials)
        
        stored = StoredCredential(
            id=cred_id,
            connector_id=connector_id,
            tenant_id=tenant_id,
            user_id=user_id,
            name=name,
            encrypted_data=encrypted_data,
            auth_type=auth_type,
            created_at=now,
            updated_at=now
        )
        
        await self.backend.store(stored)
        logger.info(f"Stored credentials {cred_id} for connector {connector_id}")
        
        return cred_id
    
    async def get_credentials(
        self,
        credential_id: str,
        update_last_used: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve and decrypt credentials.
        
        Args:
            credential_id: ID of credentials to retrieve
            update_last_used: Whether to update last_used_at timestamp
            
        Returns:
            Decrypted credentials dictionary, or None if not found
        """
        stored = await self.backend.retrieve(credential_id)
        if not stored:
            return None
        
        # Update last used timestamp
        if update_last_used:
            stored.last_used_at = datetime.utcnow()
            await self.backend.update(stored)
        
        # Decrypt and return
        return self.encryption.decrypt(stored.encrypted_data)
    
    async def get_auth_config(
        self,
        credential_id: str
    ) -> Optional["AuthConfig"]:
        """
        Get a full AuthConfig object from stored credentials.
        Useful for passing directly to connector initialization.
        """
        from .base import AuthConfig, AuthType
        
        stored = await self.backend.retrieve(credential_id)
        if not stored:
            return None
        
        credentials = self.encryption.decrypt(stored.encrypted_data)
        
        # Handle OAuth2 tokens
        access_token = None
        refresh_token = None
        if stored.access_token_encrypted:
            access_token = self.encryption.decrypt(stored.access_token_encrypted).get("token")
        if stored.refresh_token_encrypted:
            refresh_token = self.encryption.decrypt(stored.refresh_token_encrypted).get("token")
        
        return AuthConfig(
            auth_type=AuthType(stored.auth_type),
            credentials=credentials,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=stored.token_expires_at
        )
    
    async def update_oauth_tokens(
        self,
        credential_id: str,
        access_token: str,
        refresh_token: Optional[str] = None,
        expires_at: Optional[datetime] = None
    ) -> bool:
        """Update OAuth2 tokens for a credential"""
        stored = await self.backend.retrieve(credential_id)
        if not stored:
            return False
        
        stored.access_token_encrypted = self.encryption.encrypt({"token": access_token})
        if refresh_token:
            stored.refresh_token_encrypted = self.encryption.encrypt({"token": refresh_token})
        stored.token_expires_at = expires_at
        stored.updated_at = datetime.utcnow()
        
        return await self.backend.update(stored)
    
    async def mark_invalid(self, credential_id: str) -> bool:
        """Mark credentials as invalid (e.g., after auth failure)"""
        stored = await self.backend.retrieve(credential_id)
        if not stored:
            return False
        
        stored.is_valid = False
        stored.updated_at = datetime.utcnow()
        return await self.backend.update(stored)
    
    async def delete_credentials(self, credential_id: str) -> bool:
        """Delete credentials"""
        return await self.backend.delete(credential_id)
    
    async def list_user_credentials(
        self,
        user_id: str,
        tenant_id: Optional[str] = None,
        connector_id: Optional[str] = None,
        include_invalid: bool = False
    ) -> List[Dict[str, Any]]:
        """
        List credentials for a user (without decrypting sensitive data).
        Returns safe metadata only.
        """
        credentials = await self.backend.list_for_user(user_id, tenant_id, connector_id)
        
        results = []
        for cred in credentials:
            if not include_invalid and not cred.is_valid:
                continue
            
            results.append({
                "id": cred.id,
                "connector_id": cred.connector_id,
                "name": cred.name,
                "auth_type": cred.auth_type,
                "is_valid": cred.is_valid,
                "created_at": cred.created_at.isoformat(),
                "updated_at": cred.updated_at.isoformat(),
                "last_used_at": cred.last_used_at.isoformat() if cred.last_used_at else None
            })
        
        return results
