"""
Initialize database tables and seed with sample data
"""
import asyncio
from sqlalchemy import text
from database import engine, Base, async_session_maker
from models import IntegrationCategory, IntegrationType, IntegrationInstance
from datetime import datetime


async def init_database():
    """Create all tables"""
    print("Creating integrations schema and tables...")
    async with engine.begin() as conn:
        # Create schema if it doesn't exist
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS integrations"))
        # Drop all tables (careful in production!)
        await conn.run_sync(Base.metadata.drop_all)
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Schema and tables created successfully")


async def seed_data():
    """Seed database with sample data"""
    print("\nSeeding database with sample data...")

    async with async_session_maker() as session:
        # 1. Create Categories
        categories = [
            IntegrationCategory(
                id="1", key="itsm", label="🎫 ITSM / Ticketing", icon="🎫",
                description="IT Service Management and ticketing systems", display_order=1
            ),
            IntegrationCategory(
                id="2", key="hr", label="👔 HR Systems", icon="👔",
                description="Human Resources and employee management", display_order=2
            ),
            IntegrationCategory(
                id="3", key="crm", label="💼 CRM", icon="💼",
                description="Customer Relationship Management", display_order=3
            ),
            IntegrationCategory(
                id="4", key="comm", label="💬 Communication", icon="💬",
                description="Team communication platforms", display_order=4
            ),
            IntegrationCategory(
                id="5", key="pbx", label="📞 PBX Systems", icon="📞",
                description="Phone systems and telephony", display_order=5
            ),
            IntegrationCategory(
                id="6", key="analytics", label="📊 Analytics", icon="📊",
                description="Analytics and reporting platforms", display_order=6
            ),
            IntegrationCategory(
                id="7", key="custom", label="🔧 Custom / Webhooks", icon="🔧",
                description="Custom integrations and webhooks", display_order=7
            ),
        ]
        session.add_all(categories)
        await session.flush()
        print(f"✓ Created {len(categories)} categories")

        # 2. Create Integration Types
        types = [
            IntegrationType(
                id="1", name="ServiceNow", category="itsm", icon="❄️",
                description="Enterprise IT service management platform",
                vendor="ServiceNow Inc",
                documentation_url="https://docs.servicenow.com",
                config_schema={"api_url": "string", "api_key": "string", "instance": "string"},
                supported_features=["sync", "webhooks", "api", "oauth"],
                is_active=True,
                created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationType(
                id="2", name="Workday", category="hr", icon="📊",
                description="Cloud-based HR and finance platform",
                vendor="Workday Inc",
                documentation_url="https://doc.workday.com",
                config_schema={"tenant_url": "string", "username": "string", "password": "string"},
                supported_features=["sync", "api"],
                is_active=True,
                created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationType(
                id="3", name="Salesforce", category="crm", icon="☁️",
                description="Customer relationship management platform",
                vendor="Salesforce",
                documentation_url="https://developer.salesforce.com",
                config_schema={"instance_url": "string", "client_id": "string", "client_secret": "string"},
                supported_features=["sync", "webhooks", "api", "oauth"],
                is_active=True,
                created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationType(
                id="4", name="Microsoft Teams", category="comm", icon="🟣",
                description="Team collaboration and communication",
                vendor="Microsoft",
                documentation_url="https://docs.microsoft.com/teams",
                config_schema={"tenant_id": "string", "client_id": "string", "client_secret": "string"},
                supported_features=["webhooks", "api", "oauth"],
                is_active=True,
                created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationType(
                id="5", name="Cisco CUCM", category="pbx", icon="📞",
                description="Cisco Unified Communications Manager",
                vendor="Cisco Systems",
                documentation_url="https://developer.cisco.com/docs/axl",
                config_schema={"host": "string", "username": "string", "password": "string", "version": "string"},
                supported_features=["sync", "api"],
                is_active=True,
                created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationType(
                id="6", name="Avaya Aura", category="pbx", icon="☎️",
                description="Avaya Aura Communication Manager",
                vendor="Avaya",
                config_schema={"host": "string", "username": "string", "password": "string"},
                supported_features=["sync", "api"],
                is_active=True,
                created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationType(
                id="7", name="Zendesk", category="itsm", icon="🎫",
                description="Customer support and ticketing platform",
                vendor="Zendesk",
                config_schema={"subdomain": "string", "api_token": "string"},
                supported_features=["sync", "webhooks", "api"],
                is_active=True,
                created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationType(
                id="8", name="Slack", category="comm", icon="💬",
                description="Team messaging and collaboration",
                vendor="Slack Technologies",
                config_schema={"workspace_url": "string", "bot_token": "string"},
                supported_features=["webhooks", "api", "oauth"],
                is_active=True,
                created_at=datetime.now(), updated_at=datetime.now()
            ),
        ]
        session.add_all(types)
        await session.flush()
        print(f"✓ Created {len(types)} integration types")

        # 3. Create Integration Instances
        instances = [
            IntegrationInstance(
                id="1", integration_type_id="1", name="Production ServiceNow",
                status="connected",
                config={"api_url": "https://company.service-now.com", "instance": "company"},
                last_sync_at=datetime.now(), last_sync_status="success",
                records_synced=1234, error_count=0, enabled=True,
                created_by="1", created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationInstance(
                id="2", integration_type_id="2", name="Workday HR",
                status="connected",
                config={"tenant_url": "https://company.workday.com"},
                last_sync_at=datetime.now(), last_sync_status="success",
                records_synced=856, error_count=0, enabled=True,
                created_by="1", created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationInstance(
                id="3", integration_type_id="3", name="Salesforce Production",
                status="warning",
                config={"instance_url": "https://company.salesforce.com"},
                last_sync_at=datetime.now(), last_sync_status="partial",
                records_synced=2341, error_count=12, enabled=True,
                created_by="1", created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationInstance(
                id="4", integration_type_id="4", name="Microsoft Teams",
                status="paused",
                config={"tenant_id": "company-tenant"},
                last_sync_at=None, last_sync_status=None,
                records_synced=0, error_count=0, enabled=False,
                created_by="1", created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationInstance(
                id="5", integration_type_id="5", name="HQ Cisco CUCM",
                status="connected",
                config={"host": "192.168.1.10", "version": "12.5"},
                last_sync_at=datetime.now(), last_sync_status="success",
                records_synced=450, error_count=0, enabled=True,
                created_by="1", created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationInstance(
                id="6", integration_type_id="6", name="Branch Avaya",
                status="connected",
                config={"host": "192.168.2.10"},
                last_sync_at=datetime.now(), last_sync_status="success",
                records_synced=320, error_count=0, enabled=True,
                created_by="1", created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationInstance(
                id="7", integration_type_id="7", name="Zendesk Support",
                status="connected",
                config={"subdomain": "company"},
                last_sync_at=datetime.now(), last_sync_status="success",
                records_synced=678, error_count=0, enabled=True,
                created_by="1", created_at=datetime.now(), updated_at=datetime.now()
            ),
            IntegrationInstance(
                id="8", integration_type_id="8", name="Slack Workspace",
                status="connected",
                config={"workspace_url": "company.slack.com"},
                last_sync_at=datetime.now(), last_sync_status="success",
                records_synced=5621, error_count=0, enabled=True,
                created_by="1", created_at=datetime.now(), updated_at=datetime.now()
            ),
        ]
        session.add_all(instances)
        await session.commit()
        print(f"✓ Created {len(instances)} integration instances")

    print("\n✅ Database seeded successfully!")


async def main():
    try:
        await init_database()
        await seed_data()
        print("\n🎉 Database initialization complete!")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
