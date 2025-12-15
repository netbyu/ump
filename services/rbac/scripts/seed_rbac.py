"""Seed initial RBAC policies and admin user for production deployment."""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import casbin
from casbin_async_sqlalchemy_adapter import Adapter
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.core.config import settings
from app.core.database import Base
from app.core.security import get_password_hash
from app.models.user import User
from app.auth.constants import (
    DefaultRoles,
    Resources,
    Actions,
    WILDCARD_DOMAIN,
    DEFAULT_ROLE_PERMISSIONS,
)


async def seed_admin_user(session: AsyncSession) -> None:
    """Create initial admin user if not exists."""
    result = await session.execute(select(User).where(User.username == "admin"))
    existing_admin = result.scalar_one_or_none()

    if existing_admin:
        print("Admin user already exists, skipping...")
        return

    admin = User(
        username="admin",
        email="admin@ucmp.local",
        full_name="Platform Administrator",
        hashed_password=get_password_hash("admin123"),
        is_active=True,
        is_superuser=True,
        tenant_id=None,  # Platform admin has no specific tenant
    )

    session.add(admin)
    await session.commit()
    print("Created admin user (username: admin, password: admin123)")
    print("WARNING: Change the admin password immediately in production!")


async def seed_policies(database_url: str, model_path: str) -> None:
    """Seed initial RBAC policies."""
    engine = create_async_engine(database_url)
    adapter = Adapter(engine)
    await adapter.create_table()

    enforcer = casbin.AsyncEnforcer(model_path, adapter)
    await enforcer.load_policy()

    # =========================================================================
    # Default Role Permissions
    # =========================================================================

    print("\nSeeding role permissions...")

    default_policies = [
        # Platform Admin - Full access
        ("platform_admin", "*", "*", "*"),
        # Tenant Admin - Full access within tenant (using * as placeholder)
        ("tenant_admin", "*", "users", "*"),
        ("tenant_admin", "*", "extensions", "*"),
        ("tenant_admin", "*", "trunks", "*"),
        ("tenant_admin", "*", "queues", "*"),
        ("tenant_admin", "*", "routes", "*"),
        ("tenant_admin", "*", "reports", "*"),
        ("tenant_admin", "*", "devices", "*"),
        ("tenant_admin", "*", "integrations", "*"),
        ("tenant_admin", "*", "agents", "*"),
        ("tenant_admin", "*", "automation", "*"),
        ("tenant_admin", "*", "monitoring", "read"),
        ("tenant_admin", "*", "settings", "read"),
        ("tenant_admin", "*", "settings", "update"),
        ("tenant_admin", "*", "rbac", "read"),
        ("tenant_admin", "*", "ivr", "*"),
        ("tenant_admin", "*", "fax", "*"),
        ("tenant_admin", "*", "itsm", "*"),
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
        ("operator", "*", "devices", "read"),
        ("operator", "*", "devices", "update"),
        ("operator", "*", "monitoring", "read"),
        ("operator", "*", "integrations", "read"),
        ("operator", "*", "itsm", "read"),
        ("operator", "*", "itsm", "create"),
        ("operator", "*", "itsm", "update"),
        # Viewer - Read-only access
        ("viewer", "*", "extensions", "read"),
        ("viewer", "*", "trunks", "read"),
        ("viewer", "*", "queues", "read"),
        ("viewer", "*", "routes", "read"),
        ("viewer", "*", "reports", "read"),
        ("viewer", "*", "users", "read"),
        ("viewer", "*", "devices", "read"),
        ("viewer", "*", "monitoring", "read"),
        ("viewer", "*", "integrations", "read"),
        ("viewer", "*", "itsm", "read"),
    ]

    for policy in default_policies:
        if not await enforcer.has_policy(*policy):
            await enforcer.add_policy(*policy)
            print(f"  Added policy: {policy}")
        else:
            print(f"  Policy exists: {policy}")

    # =========================================================================
    # Role Hierarchy
    # =========================================================================

    print("\nSeeding role hierarchy...")

    role_hierarchy = [
        ("tenant_admin", "operator", "*"),
        ("operator", "viewer", "*"),
    ]

    for hierarchy in role_hierarchy:
        if not await enforcer.has_grouping_policy(*hierarchy):
            await enforcer.add_grouping_policy(*hierarchy)
            print(f"  Added hierarchy: {hierarchy}")
        else:
            print(f"  Hierarchy exists: {hierarchy}")

    # =========================================================================
    # Initial Platform Admin Assignment
    # =========================================================================

    print("\nAssigning platform admin role...")

    initial_admin = ("admin", "platform_admin", "*")
    if not await enforcer.has_grouping_policy(*initial_admin):
        await enforcer.add_grouping_policy(*initial_admin)
        print(f"  Assigned: {initial_admin}")
    else:
        print(f"  Assignment exists: {initial_admin}")

    await enforcer.save_policy()
    print("\nRBAC policies seeded successfully!")


async def main():
    """Main entry point for seeding."""
    print("=" * 60)
    print("UCMP RBAC Seed Script")
    print("=" * 60)

    database_url = settings.database_url
    model_path = str(Path(__file__).parent.parent / "app" / "auth" / "model.conf")

    print(f"\nDatabase: {database_url.split('@')[-1]}")  # Hide credentials
    print(f"Model: {model_path}")

    # Create database tables
    print("\nCreating database tables...")
    engine = create_async_engine(database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created/verified")

    # Create session for user seeding
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Seed admin user
        print("\nSeeding admin user...")
        await seed_admin_user(session)

    # Seed RBAC policies
    await seed_policies(database_url, model_path)

    print("\n" + "=" * 60)
    print("Seeding complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Start the server: uvicorn app.main:app --reload")
    print("2. Login at: POST /auth/login")
    print("   - username: admin")
    print("   - password: admin123")
    print("3. CHANGE THE ADMIN PASSWORD!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
