"""
Initialize admin database tables and seed with sample users
"""
import asyncio
from sqlalchemy import text
from database import engine, Base, async_session_maker
from models import User
from datetime import datetime, timedelta
import uuid


async def init_admin_schema():
    """Create admin schema and tables"""
    print("Creating admin schema and tables...")
    async with engine.begin() as conn:
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS admin"))
        await conn.run_sync(Base.metadata.create_all)
    print("Admin schema and tables created successfully")


async def seed_users():
    """Seed database with sample users"""
    print("\nSeeding admin users...")

    async with async_session_maker() as session:
        # Check if users already exist
        result = await session.execute(text("SELECT COUNT(*) FROM admin.users"))
        count = result.scalar()
        if count > 0:
            print(f"Found {count} existing users. Skipping seed.")
            return

        # Create sample users
        users = [
            User(
                id=str(uuid.uuid4()),
                email="admin@ucplatform.com",
                name="System Administrator",
                role="admin",
                status="active",
                department="IT",
                phone="+1-555-0100",
                extension="100",
                last_login_at=datetime.now() - timedelta(hours=2),
                created_at=datetime.now() - timedelta(days=365),
                updated_at=datetime.now(),
            ),
            User(
                id=str(uuid.uuid4()),
                email="jsmith@ucplatform.com",
                name="John Smith",
                role="manager",
                status="active",
                department="Sales",
                phone="+1-555-0101",
                extension="101",
                last_login_at=datetime.now() - timedelta(hours=5),
                created_at=datetime.now() - timedelta(days=180),
                updated_at=datetime.now(),
            ),
            User(
                id=str(uuid.uuid4()),
                email="mjohnson@ucplatform.com",
                name="Mary Johnson",
                role="user",
                status="active",
                department="Support",
                phone="+1-555-0102",
                extension="102",
                last_login_at=datetime.now() - timedelta(hours=1),
                created_at=datetime.now() - timedelta(days=90),
                updated_at=datetime.now(),
            ),
            User(
                id=str(uuid.uuid4()),
                email="rwilliams@ucplatform.com",
                name="Robert Williams",
                role="user",
                status="active",
                department="Engineering",
                phone="+1-555-0103",
                extension="103",
                last_login_at=datetime.now() - timedelta(days=1),
                created_at=datetime.now() - timedelta(days=60),
                updated_at=datetime.now(),
            ),
            User(
                id=str(uuid.uuid4()),
                email="sbrown@ucplatform.com",
                name="Sarah Brown",
                role="user",
                status="inactive",
                department="Marketing",
                phone="+1-555-0104",
                extension="104",
                last_login_at=datetime.now() - timedelta(days=30),
                created_at=datetime.now() - timedelta(days=120),
                updated_at=datetime.now(),
            ),
            User(
                id=str(uuid.uuid4()),
                email="mdavis@ucplatform.com",
                name="Michael Davis",
                role="viewer",
                status="active",
                department="Finance",
                phone="+1-555-0105",
                extension="105",
                last_login_at=datetime.now() - timedelta(hours=12),
                created_at=datetime.now() - timedelta(days=45),
                updated_at=datetime.now(),
            ),
        ]

        session.add_all(users)
        await session.commit()
        print(f"Created {len(users)} users")

    print("\nAdmin database seeded successfully!")


async def main():
    try:
        await init_admin_schema()
        await seed_users()
        print("\nAdmin database initialization complete!")
    except Exception as e:
        print(f"\nError: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
