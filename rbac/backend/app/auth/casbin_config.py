"""Casbin RBAC Configuration and Enforcer Management."""
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
    async def initialize(cls, database_url: Optional[str] = None) -> casbin.AsyncEnforcer:
        """
        Initialize the Casbin enforcer with database adapter.

        Should be called once during application startup.

        Args:
            database_url: PostgreSQL connection string with asyncpg driver.
                         If not provided, uses settings.database_url.

        Returns:
            Initialized AsyncEnforcer instance
        """
        async with cls._lock:
            if cls._initialized:
                return cls._instance

            logger.info("Initializing Casbin RBAC enforcer...")

            db_url = database_url or settings.database_url

            # Create async engine for adapter
            engine = create_async_engine(
                db_url,
                pool_pre_ping=True,
                pool_size=5,
                max_overflow=10,
            )

            # Initialize adapter (creates casbin_rule table if not exists)
            cls._adapter = Adapter(engine)
            await cls._adapter.create_table()

            # Create enforcer with model and adapter
            cls._instance = casbin.AsyncEnforcer(str(MODEL_PATH), cls._adapter)

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
        """Cleanup resources on application shutdown."""
        cls._instance = None
        cls._adapter = None
        cls._initialized = False
        logger.info("Casbin RBAC enforcer shutdown complete")

    @classmethod
    def is_initialized(cls) -> bool:
        """Check if enforcer is initialized."""
        return cls._initialized


async def get_enforcer() -> casbin.AsyncEnforcer:
    """FastAPI dependency to get the Casbin enforcer."""
    return await AsyncCasbinEnforcer.get_enforcer()
