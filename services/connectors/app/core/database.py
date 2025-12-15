"""
Database Configuration
======================
PostgreSQL connection for credential storage (optional)
"""

from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Database pool (initialized on startup if DATABASE_URL is set)
db_pool = None


async def init_db(database_url: Optional[str] = None):
    """Initialize database connection pool"""
    global db_pool

    if not database_url:
        logger.info("No DATABASE_URL configured, using in-memory credential storage")
        return None

    try:
        import asyncpg
        db_pool = await asyncpg.create_pool(dsn=database_url)
        logger.info("Database connection pool initialized")
        return db_pool
    except ImportError:
        logger.warning("asyncpg not installed, using in-memory credential storage")
        return None
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        return None


async def close_db():
    """Close database connection pool"""
    global db_pool
    if db_pool:
        await db_pool.close()
        db_pool = None
        logger.info("Database connection pool closed")


def get_db_pool():
    """Get database pool"""
    return db_pool
