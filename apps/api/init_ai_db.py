"""
Initialize AI database tables and seed with sample agents
"""
import asyncio
from sqlalchemy import text
from database import engine, Base, async_session_maker
from models import AIAgent, AIConversation
from datetime import datetime
import uuid


async def init_ai_schema():
    """Create AI schema and tables"""
    print("Creating AI schema and tables...")
    async with engine.begin() as conn:
        # Create schema if it doesn't exist
        await conn.execute(text("CREATE SCHEMA IF NOT EXISTS ai"))
        # Create all tables (this will include AI tables)
        await conn.run_sync(Base.metadata.create_all)
    print("AI schema and tables created successfully")


async def seed_ai_agents():
    """Seed database with sample AI agents"""
    print("\nSeeding AI agents...")

    async with async_session_maker() as session:
        # Check if agents already exist
        result = await session.execute(text("SELECT COUNT(*) FROM ai.ai_agents"))
        count = result.scalar()
        if count > 0:
            print(f"Found {count} existing agents. Skipping seed.")
            return

        agents = [
            AIAgent(
                id=str(uuid.uuid4()),
                name="Customer Support Agent",
                description="AI-powered customer support agent that handles general inquiries, FAQs, and basic troubleshooting.",
                status="active",
                voice_provider="piper",
                voice_id="en_US-amy-medium",
                language="en-US",
                model_provider="ollama",
                model_name="mistral",
                system_prompt="""You are a helpful customer support agent for a unified communications platform.
Be friendly, professional, and concise. Help users with:
- Account questions
- Technical issues
- Feature explanations
- Billing inquiries
If you don't know something, offer to escalate to a human agent.""",
                temperature="0.7",
                max_tokens=1000,
                livekit_room_prefix="support",
                total_conversations=1234,
                total_duration_seconds=45600,
                average_rating="4.5",
                created_by="1",
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ),
            AIAgent(
                id=str(uuid.uuid4()),
                name="IT Helpdesk Agent",
                description="Technical support agent specialized in IT infrastructure, networking, and system administration.",
                status="active",
                voice_provider="piper",
                voice_id="en_US-ryan-medium",
                language="en-US",
                model_provider="ollama",
                model_name="mistral",
                system_prompt="""You are an IT helpdesk agent specialized in technical support.
Help users with:
- Password resets and account access
- VPN and network connectivity
- Software installation and updates
- Hardware troubleshooting
- Phone system configuration
Provide step-by-step instructions when needed. Use technical terms appropriately.""",
                temperature="0.5",
                max_tokens=1500,
                livekit_room_prefix="helpdesk",
                total_conversations=856,
                total_duration_seconds=32100,
                average_rating="4.7",
                created_by="1",
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ),
            AIAgent(
                id=str(uuid.uuid4()),
                name="Sales Assistant",
                description="Sales-focused agent that provides product information, pricing, and helps qualify leads.",
                status="active",
                voice_provider="piper",
                voice_id="en_US-kusal-medium",
                language="en-US",
                model_provider="ollama",
                model_name="mistral",
                system_prompt="""You are a sales assistant for a unified communications platform.
Your goals:
- Understand customer needs and pain points
- Explain product features and benefits
- Provide pricing information when asked
- Qualify leads by gathering key information
- Schedule demos with the sales team
Be enthusiastic but not pushy. Focus on solving customer problems.""",
                temperature="0.8",
                max_tokens=1200,
                livekit_room_prefix="sales",
                total_conversations=432,
                total_duration_seconds=18900,
                average_rating="4.3",
                created_by="1",
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ),
            AIAgent(
                id=str(uuid.uuid4()),
                name="French Support Agent",
                description="Agent de support client francophone pour les utilisateurs francophones.",
                status="active",
                voice_provider="piper",
                voice_id="fr_FR-siwis-medium",
                language="fr-FR",
                model_provider="ollama",
                model_name="mistral",
                system_prompt="""Vous etes un agent de support client francophone pour une plateforme de communications unifiees.
Soyez amical, professionnel et concis. Aidez les utilisateurs avec:
- Questions sur le compte
- Problemes techniques
- Explications des fonctionnalites
- Questions de facturation
Si vous ne savez pas quelque chose, proposez de transferer a un agent humain.""",
                temperature="0.7",
                max_tokens=1000,
                livekit_room_prefix="support-fr",
                total_conversations=245,
                total_duration_seconds=9800,
                average_rating="4.6",
                created_by="1",
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ),
            AIAgent(
                id=str(uuid.uuid4()),
                name="Onboarding Assistant",
                description="Helps new users get started with the platform through guided setup and tutorials.",
                status="draft",
                voice_provider="piper",
                voice_id="en_US-amy-medium",
                language="en-US",
                model_provider="ollama",
                model_name="mistral",
                system_prompt="""You are an onboarding assistant helping new users get started.
Guide users through:
- Initial account setup
- Profile configuration
- Key feature tutorials
- Integration setup
- Best practices
Be patient and encouraging. Celebrate small wins with users.""",
                temperature="0.6",
                max_tokens=1000,
                livekit_room_prefix="onboard",
                total_conversations=0,
                total_duration_seconds=0,
                created_by="1",
                created_at=datetime.now(),
                updated_at=datetime.now(),
            ),
        ]

        session.add_all(agents)
        await session.commit()
        print(f"Created {len(agents)} AI agents")

    print("\nAI database seeded successfully!")


async def main():
    try:
        await init_ai_schema()
        await seed_ai_agents()
        print("\nAI database initialization complete!")
    except Exception as e:
        print(f"\nError: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())
