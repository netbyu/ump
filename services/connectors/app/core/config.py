"""
Application Configuration
=========================
Settings management using pydantic-settings
"""

import os
from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # App
    APP_NAME: str = "UCMP Connectors"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # API
    API_PREFIX: str = "/api"

    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Database (optional - for PostgreSQL credential storage)
    DATABASE_URL: Optional[str] = None

    # Security
    CREDENTIAL_ENCRYPTION_KEY: str = "dev-key-change-in-prod-32chars!"

    # Connectors
    MANIFESTS_DIR: str = "app/connectors/manifests"

    # Temporal (optional)
    TEMPORAL_HOST: Optional[str] = None
    TEMPORAL_NAMESPACE: str = "default"
    TEMPORAL_TASK_QUEUE: str = "connectors"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
