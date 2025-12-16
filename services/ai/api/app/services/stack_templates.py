"""
Predefined Automation Stack Templates
"""
from typing import List, Optional

from ..models.stacks import (
    StackTemplate,
    StackComponent,
    StackResourceRequirements,
    StackAutoSetup,
    StackCategory,
    DeploymentTarget,
)


# =============================================================================
# LiveKit Voice Agent Stack (French)
# =============================================================================

LIVEKIT_VOICE_AGENT_STACK = StackTemplate(
    id="livekit-voice-agent",
    name="LiveKit Voice Agent",
    description="Complete voice AI agent with STT/LLM/TTS pipeline (multi-language support)",
    category=StackCategory.VOICE_AGENT,
    version="1.0.0",
    icon="🎙️",
    tags=["livekit", "voice", "multilingual", "ai-agent", "stt", "tts"],

    components=[
        StackComponent(
            name="livekit-server",
            display_name="LiveKit Server",
            description="WebRTC infrastructure server",
            image="livekit/livekit-server",
            tag="latest",
            ports=[
                {"host": 7880, "container": 7880},
                {"host": 7881, "container": 7881},
                {"host": 7882, "container": 7882},
            ],
            environment={
                "LIVEKIT_KEYS": "devkey:secret123456789012345678901234567890",
            },
            volumes=["/config/livekit.yaml:/etc/livekit.yaml:ro"],
        ),

        StackComponent(
            name="redis",
            display_name="Redis",
            description="Configuration and state storage",
            image="redis",
            tag="7-alpine",
            ports=[{"host": 6379, "container": 6379}],
            volumes=["redis_data:/data"],
        ),

        StackComponent(
            name="ollama",
            display_name="Ollama LLM",
            description="Local LLM server (Mistral for French)",
            image="ollama/ollama",
            tag="latest",
            ports=[{"host": 11434, "container": 11434}],
            volumes=["ollama_data:/root/.ollama"],
            gpu_required=True,
        ),

        StackComponent(
            name="whisper-stt",
            display_name="Whisper STT",
            description="Speech-to-text (French optimized)",
            image="fedirz/faster-whisper-server",
            tag="latest-cpu",
            ports=[{"host": 8001, "container": 8000}],
            environment={
                "WHISPER__MODEL": "large-v3",
                "WHISPER__DEVICE": "cuda",
                "WHISPER__COMPUTE_TYPE": "float16",
            },
            gpu_required=True,
        ),

        StackComponent(
            name="piper-tts",
            display_name="Piper TTS",
            description="Text-to-speech (French voice)",
            image="ump/piper-tts",  # Custom image
            tag="latest",
            ports=[{"host": 8002, "container": 5000}],
            environment={
                "PIPER_VOICE": "fr_FR-siwis-medium",
            },
            volumes=["./voices:/voices:ro"],
        ),

        StackComponent(
            name="voice-agent",
            display_name="Voice Agent",
            description="LiveKit Python agent",
            image="ump/french-voice-agent",  # Custom image
            tag="latest",
            environment={
                "LIVEKIT_URL": "ws://livekit:7880",
                "LIVEKIT_API_KEY": "devkey",
                "LIVEKIT_API_SECRET": "secret123456789012345678901234567890",
                "OLLAMA_BASE_URL": "http://ollama:11434",
                "WHISPER_URL": "http://whisper:8000",
                "PIPER_URL": "http://piper:5000",
                "REDIS_URL": "redis://redis:6379/0",
            },
            depends_on=["livekit", "ollama", "whisper", "piper", "redis"],
        ),

        StackComponent(
            name="web-ui",
            display_name="Web UI",
            description="Voice agent frontend",
            image="ump/voice-agent-web",  # Custom image
            tag="latest",
            ports=[{"host": 3001, "container": 3000}],
            environment={
                "LIVEKIT_URL": "ws://localhost:7880",
                "LIVEKIT_API_KEY": "devkey",
            },
            depends_on=["livekit"],
        ),
    ],

    deployment_targets=[DeploymentTarget.DOCKER, DeploymentTarget.AWS_SPOT],

    resources=StackResourceRequirements(
        min_ram_gb=16,
        min_vram_gb=24,
        min_cpu_cores=8,
        min_disk_gb=50,
        requires_gpu=True,
        recommended_instance_type="g5.xlarge",
    ),

    auto_setup=StackAutoSetup(
        create_llm_connections=True,
        configure_redis=True,
        run_database_migrations=False,
        pull_models=True,
        create_network=True,
        post_deploy_commands=[
            "docker exec ollama ollama pull mistral",
            "docker exec ollama ollama pull mistral:7b-instruct-q4_0",
        ],
        health_check_endpoints=[
            "http://{host}:7880/",
            "http://{host}:11434/api/tags",
            "http://{host}:3001/",
        ],
        max_startup_time_seconds=600,
    ),

    configurable_options=[
        {
            "id": "language",
            "label": "Language",
            "type": "select",
            "options": [
                {"value": "fr", "label": "French (Français)"},
                {"value": "en", "label": "English"},
                {"value": "es", "label": "Spanish (Español)"},
                {"value": "de", "label": "German (Deutsch)"},
            ],
            "default": "fr",
            "description": "Primary language for voice agent",
        },
        {
            "id": "llm_model",
            "label": "LLM Model",
            "type": "select",
            "options": [
                {"value": "mistral", "label": "Mistral 7B (French optimized)"},
                {"value": "mixtral", "label": "Mixtral 8x7B (Multilingual)"},
                {"value": "llama3.1:8b", "label": "Llama 3.1 8B (Multilingual)"},
                {"value": "llama3.2:3b", "label": "Llama 3.2 3B (Fast)"},
            ],
            "default": "mistral",
            "env_var": "OLLAMA_MODEL",
        },
        {
            "id": "whisper_model",
            "label": "Whisper STT Model",
            "type": "select",
            "options": [
                {"value": "large-v3", "label": "Large v3 (Best accuracy)"},
                {"value": "medium", "label": "Medium (Balanced)"},
                {"value": "small", "label": "Small (Fast)"},
            ],
            "default": "large-v3",
            "env_var": "WHISPER__MODEL",
        },
        {
            "id": "tts_voice",
            "label": "TTS Voice",
            "type": "select",
            "options": [
                {"value": "fr_FR-siwis-medium", "label": "🇫🇷 French (Female - Siwis)"},
                {"value": "fr_FR-upmc-medium", "label": "🇫🇷 French (Male - UPMC)"},
                {"value": "en_US-lessac-medium", "label": "🇺🇸 English (Female - Lessac)"},
                {"value": "en_GB-alan-medium", "label": "🇬🇧 English (Male - Alan)"},
                {"value": "es_ES-carlfm-x_low", "label": "🇪🇸 Spanish (Male)"},
                {"value": "de_DE-thorsten-medium", "label": "🇩🇪 German (Male)"},
            ],
            "default": "fr_FR-siwis-medium",
            "env_var": "PIPER_VOICE",
            "description": "Text-to-speech voice model",
        },
        {
            "id": "system_prompt",
            "label": "System Prompt",
            "type": "textarea",
            "default": "Tu es un assistant vocal professionnel et amical. Réponds en français de manière claire et concise.",
            "env_var": "SYSTEM_PROMPT",
            "description": "Custom instructions for the AI agent",
        },
    ],

    setup_instructions="""
1. Stack will deploy all required components
2. Ollama will download Mistral model (~4GB) on first start
3. Whisper model will download on first use (~3GB)
4. Access web UI at http://{host}:3001
5. LLM connection will be auto-created for future use
    """,

    usage_instructions="""
Access the voice agent:
1. Open http://{host}:3001
2. Click "Démarrer" to connect
3. Hold spacebar to talk
4. Release to hear agent response
    """
)


# =============================================================================
# Temporal Worker Stack
# =============================================================================

TEMPORAL_WORKER_STACK = StackTemplate(
    id="temporal-worker",
    name="Temporal Workflow Worker",
    description="Temporal worker with UMP workflows and activities",
    category=StackCategory.TEMPORAL,
    version="1.0.0",
    icon="⚙️",
    tags=["temporal", "workflows", "automation"],

    components=[
        StackComponent(
            name="temporal-worker",
            display_name="Temporal Worker",
            description="Executes workflows and activities",
            image="ump/temporal-worker",  # Custom image with our workflows
            tag="latest",
            environment={
                "TEMPORAL_ADDRESS": "temporal:7233",
                "TEMPORAL_NAMESPACE": "default",
                "TEMPORAL_TASK_QUEUE": "automation-workflows",
                "DATABASE_URL": "postgresql://...",  # From config
            },
        ),
    ],

    deployment_targets=[DeploymentTarget.DOCKER],

    resources=StackResourceRequirements(
        min_ram_gb=4,
        min_cpu_cores=2,
        min_disk_gb=10,
        requires_gpu=False,
    ),

    auto_setup=StackAutoSetup(
        create_llm_connections=False,
        configure_redis=False,
        run_database_migrations=True,
        pull_models=False,
        create_network=False,
        health_check_endpoints=[],
        max_startup_time_seconds=60,
    ),

    configurable_options=[
        {
            "id": "temporal_address",
            "label": "Temporal Server",
            "type": "text",
            "default": "localhost:7233",
            "env_var": "TEMPORAL_ADDRESS",
        },
        {
            "id": "task_queue",
            "label": "Task Queue",
            "type": "text",
            "default": "automation-workflows",
            "env_var": "TEMPORAL_TASK_QUEUE",
        },
    ],
)


# =============================================================================
# Complete Automation Platform Stack
# =============================================================================

COMPLETE_AUTOMATION_STACK = StackTemplate(
    id="complete-automation-platform",
    name="Complete Automation Platform",
    description="LiveKit + Temporal + LLM - Full automation environment",
    category=StackCategory.COMPLETE,
    version="1.0.0",
    icon="🚀",
    tags=["complete", "livekit", "temporal", "automation", "production"],

    components=[
        # All LiveKit components
        *LIVEKIT_VOICE_AGENT_STACK.components,

        # Add Temporal worker
        StackComponent(
            name="temporal-worker",
            display_name="Temporal Worker",
            description="Workflow orchestration",
            image="ump/temporal-worker",
            tag="latest",
            environment={
                "TEMPORAL_ADDRESS": "temporal:7233",
                "TEMPORAL_TASK_QUEUE": "automation-workflows",
            },
        ),
    ],

    deployment_targets=[DeploymentTarget.AWS_SPOT],  # Requires powerful instance

    resources=StackResourceRequirements(
        min_ram_gb=32,
        min_vram_gb=24,
        min_cpu_cores=16,
        min_disk_gb=100,
        requires_gpu=True,
        recommended_instance_type="g5.2xlarge",
    ),

    auto_setup=StackAutoSetup(
        create_llm_connections=True,
        configure_redis=True,
        run_database_migrations=True,
        pull_models=True,
        create_network=True,
        post_deploy_commands=[
            "docker exec ollama ollama pull mistral",
            "docker exec ollama ollama pull llama3.1:8b",
        ],
        health_check_endpoints=[
            "http://{host}:7880/",
            "http://{host}:11434/api/tags",
            "http://{host}:3001/",
        ],
        max_startup_time_seconds=900,
    ),

    configurable_options=[
        *LIVEKIT_VOICE_AGENT_STACK.configurable_options,
        {
            "id": "temporal_address",
            "label": "Temporal Server",
            "type": "text",
            "default": "localhost:7233",
        },
    ],
)


# =============================================================================
# Infrastructure Stacks
# =============================================================================

PORTAINER_STACK = StackTemplate(
    id="portainer",
    name="Portainer CE",
    description="Docker management UI - manage containers, images, volumes, and networks",
    category=StackCategory.INFRASTRUCTURE,
    version="2.19.0",
    icon="🐳",
    tags=["docker", "management", "containers", "devops", "infrastructure"],

    components=[
        StackComponent(
            name="portainer",
            display_name="Portainer CE",
            description="Docker container management platform",
            image="portainer/portainer-ce",
            tag="2.19.4",
            ports=[
                {"host": 9000, "container": 9000},
                {"host": 9443, "container": 9443},
            ],
            volumes=[
                "/var/run/docker.sock:/var/run/docker.sock",
                "portainer_data:/data",
            ],
            environment={},
            command="",
            health_check={
                "test": ["CMD", "wget", "--spider", "-q", "http://localhost:9000/api/status"],
                "interval": "30s",
                "timeout": "10s",
                "retries": 3,
            },
        ),
    ],

    deployment_targets=[DeploymentTarget.DOCKER],

    resources=StackResourceRequirements(
        min_ram_gb=1,
        min_cpu_cores=1,
        min_disk_gb=5,
        requires_gpu=False,
    ),

    auto_setup=StackAutoSetup(
        create_llm_connections=False,
        configure_redis=False,
        run_database_migrations=False,
        pull_models=False,
        create_network=True,
        health_check_endpoints=[
            "http://{host}:9000/api/status",
        ],
        max_startup_time_seconds=120,
    ),

    configurable_options=[
        {
            "id": "http_port",
            "label": "HTTP Port",
            "type": "number",
            "default": 9000,
            "description": "Port for Portainer web UI",
        },
        {
            "id": "https_port",
            "label": "HTTPS Port",
            "type": "number",
            "default": 9443,
            "description": "Port for Portainer secure web UI",
        },
    ],

    setup_instructions="""
## Portainer Setup

1. Access the web UI at http://{host}:9000
2. Create an admin user on first access
3. Connect to local Docker environment or add remote endpoints

## Features
- Container management (start, stop, restart, logs)
- Image management (pull, build, remove)
- Volume and network management
- Stack deployment via docker-compose
- User management and access control
""",
)


ZABBIX_STACK = StackTemplate(
    id="zabbix",
    name="Zabbix Monitoring",
    description="Enterprise-class open source monitoring solution for networks and applications",
    category=StackCategory.MONITORING,
    version="6.4",
    icon="📊",
    tags=["monitoring", "alerting", "metrics", "infrastructure", "network"],

    components=[
        StackComponent(
            name="postgres",
            display_name="PostgreSQL Database",
            description="Database for Zabbix",
            image="postgres",
            tag="15-alpine",
            ports=[],
            environment={
                "POSTGRES_USER": "zabbix",
                "POSTGRES_PASSWORD": "zabbix_pwd",
                "POSTGRES_DB": "zabbix",
            },
            volumes=[
                "zabbix_postgres_data:/var/lib/postgresql/data",
            ],
            health_check={
                "test": ["CMD-SHELL", "pg_isready -U zabbix"],
                "interval": "10s",
                "timeout": "5s",
                "retries": 5,
            },
        ),
        StackComponent(
            name="zabbix-server",
            display_name="Zabbix Server",
            description="Zabbix monitoring server",
            image="zabbix/zabbix-server-pgsql",
            tag="alpine-6.4-latest",
            ports=[
                {"host": 10051, "container": 10051},
            ],
            environment={
                "DB_SERVER_HOST": "postgres",
                "POSTGRES_USER": "zabbix",
                "POSTGRES_PASSWORD": "zabbix_pwd",
                "POSTGRES_DB": "zabbix",
                "ZBX_CACHESIZE": "128M",
                "ZBX_HISTORYCACHESIZE": "64M",
            },
            depends_on=["postgres"],
            volumes=[
                "zabbix_alertscripts:/usr/lib/zabbix/alertscripts",
                "zabbix_externalscripts:/usr/lib/zabbix/externalscripts",
            ],
        ),
        StackComponent(
            name="zabbix-web",
            display_name="Zabbix Web Frontend",
            description="Zabbix web interface (Nginx)",
            image="zabbix/zabbix-web-nginx-pgsql",
            tag="alpine-6.4-latest",
            ports=[
                {"host": 8080, "container": 8080},
                {"host": 8443, "container": 8443},
            ],
            environment={
                "ZBX_SERVER_HOST": "zabbix-server",
                "DB_SERVER_HOST": "postgres",
                "POSTGRES_USER": "zabbix",
                "POSTGRES_PASSWORD": "zabbix_pwd",
                "POSTGRES_DB": "zabbix",
                "PHP_TZ": "America/New_York",
            },
            depends_on=["zabbix-server", "postgres"],
            health_check={
                "test": ["CMD", "curl", "-f", "http://localhost:8080/"],
                "interval": "30s",
                "timeout": "10s",
                "retries": 3,
            },
        ),
        StackComponent(
            name="zabbix-agent",
            display_name="Zabbix Agent",
            description="Agent for monitoring the host",
            image="zabbix/zabbix-agent",
            tag="alpine-6.4-latest",
            ports=[
                {"host": 10050, "container": 10050},
            ],
            environment={
                "ZBX_SERVER_HOST": "zabbix-server",
                "ZBX_HOSTNAME": "zabbix-agent",
                "ZBX_ACTIVE_ALLOW": "true",
            },
            depends_on=["zabbix-server"],
        ),
    ],

    deployment_targets=[DeploymentTarget.DOCKER],

    resources=StackResourceRequirements(
        min_ram_gb=4,
        min_cpu_cores=2,
        min_disk_gb=20,
        requires_gpu=False,
    ),

    auto_setup=StackAutoSetup(
        create_llm_connections=False,
        configure_redis=False,
        run_database_migrations=False,
        pull_models=False,
        create_network=True,
        health_check_endpoints=[
            "http://{host}:8080/",
        ],
        max_startup_time_seconds=300,
    ),

    configurable_options=[
        {
            "id": "web_port",
            "label": "Web UI Port",
            "type": "number",
            "default": 8080,
            "description": "Port for Zabbix web interface",
        },
        {
            "id": "db_password",
            "label": "Database Password",
            "type": "password",
            "default": "zabbix_pwd",
            "description": "PostgreSQL database password",
        },
        {
            "id": "timezone",
            "label": "Timezone",
            "type": "text",
            "default": "America/New_York",
            "description": "Server timezone (e.g., America/New_York, Europe/London)",
        },
    ],

    setup_instructions="""
## Zabbix Setup

1. Access the web UI at http://{host}:8080
2. Default credentials: Admin / zabbix
3. **Change the default password immediately!**

## Initial Configuration
1. Go to Configuration > Hosts
2. Add hosts to monitor
3. Configure templates and triggers
4. Set up notifications (email, Slack, etc.)

## Features
- Network monitoring (SNMP, ICMP, TCP)
- Server monitoring (agents)
- Application monitoring
- SLA reporting
- Alerting and notifications
""",
)


GLPI_STACK = StackTemplate(
    id="glpi",
    name="GLPI IT Management",
    description="Open source IT asset management, issue tracking, and service desk solution",
    category=StackCategory.ITSM,
    version="10.0",
    icon="🎫",
    tags=["itsm", "helpdesk", "asset-management", "tickets", "inventory"],

    components=[
        StackComponent(
            name="mariadb",
            display_name="MariaDB Database",
            description="Database for GLPI",
            image="mariadb",
            tag="10.11",
            ports=[],
            environment={
                "MARIADB_ROOT_PASSWORD": "glpi_root_pwd",
                "MARIADB_DATABASE": "glpi",
                "MARIADB_USER": "glpi",
                "MARIADB_PASSWORD": "glpi_pwd",
            },
            volumes=[
                "glpi_mariadb_data:/var/lib/mysql",
            ],
            health_check={
                "test": ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"],
                "interval": "10s",
                "timeout": "5s",
                "retries": 5,
            },
        ),
        StackComponent(
            name="glpi",
            display_name="GLPI Application",
            description="GLPI IT Management application",
            image="diouxx/glpi",
            tag="latest",
            ports=[
                {"host": 80, "container": 80},
            ],
            environment={
                "TIMEZONE": "America/New_York",
                "MARIADB_HOST": "mariadb",
                "MARIADB_PORT": "3306",
                "MARIADB_DATABASE": "glpi",
                "MARIADB_USER": "glpi",
                "MARIADB_PASSWORD": "glpi_pwd",
            },
            depends_on=["mariadb"],
            volumes=[
                "glpi_data:/var/www/html/glpi",
                "glpi_plugins:/var/www/html/glpi/plugins",
                "glpi_files:/var/www/html/glpi/files",
            ],
            health_check={
                "test": ["CMD", "curl", "-f", "http://localhost/"],
                "interval": "30s",
                "timeout": "10s",
                "retries": 3,
            },
        ),
    ],

    deployment_targets=[DeploymentTarget.DOCKER],

    resources=StackResourceRequirements(
        min_ram_gb=2,
        min_cpu_cores=2,
        min_disk_gb=20,
        requires_gpu=False,
    ),

    auto_setup=StackAutoSetup(
        create_llm_connections=False,
        configure_redis=False,
        run_database_migrations=False,
        pull_models=False,
        create_network=True,
        health_check_endpoints=[
            "http://{host}/",
        ],
        max_startup_time_seconds=300,
    ),

    configurable_options=[
        {
            "id": "web_port",
            "label": "Web UI Port",
            "type": "number",
            "default": 80,
            "description": "Port for GLPI web interface",
        },
        {
            "id": "db_password",
            "label": "Database Password",
            "type": "password",
            "default": "glpi_pwd",
            "description": "MariaDB database password",
        },
        {
            "id": "db_root_password",
            "label": "Database Root Password",
            "type": "password",
            "default": "glpi_root_pwd",
            "description": "MariaDB root password",
        },
        {
            "id": "timezone",
            "label": "Timezone",
            "type": "text",
            "default": "America/New_York",
            "description": "Server timezone",
        },
    ],

    setup_instructions="""
## GLPI Setup

1. Access the web UI at http://{host}/
2. Follow the installation wizard
3. Default credentials after install: glpi / glpi

## Default Users
- glpi / glpi (super-admin)
- tech / tech (technician)
- normal / normal (normal user)
- post-only / postonly (post-only user)

**Change all default passwords after installation!**

## Features
- IT Asset Management
- Helpdesk / Ticketing
- License Management
- Contract Management
- Knowledge Base
- Inventory (with FusionInventory agent)
""",
)


# =============================================================================
# Stack Registry
# =============================================================================

STACK_TEMPLATES = {
    "livekit-voice-agent": LIVEKIT_VOICE_AGENT_STACK,
    "temporal-worker": TEMPORAL_WORKER_STACK,
    "complete-automation-platform": COMPLETE_AUTOMATION_STACK,
    "portainer": PORTAINER_STACK,
    "zabbix": ZABBIX_STACK,
    "glpi": GLPI_STACK,
}


def get_stack_template(stack_id: str) -> StackTemplate:
    """Get a stack template by ID"""
    template = STACK_TEMPLATES.get(stack_id)
    if not template:
        raise ValueError(f"Stack template not found: {stack_id}")
    return template


def list_stack_templates(category: Optional[str] = None) -> List[StackTemplate]:
    """List all available stack templates"""
    templates = list(STACK_TEMPLATES.values())

    if category:
        templates = [t for t in templates if t.category == category]

    return templates
