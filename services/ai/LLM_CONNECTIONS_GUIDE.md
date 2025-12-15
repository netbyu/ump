# LLM Connections Management Guide

Complete guide for managing and integrating LLM connections in the UMP platform.

## Overview

The **LLM Connections** system provides a unified interface to manage all types of LLM connections:

1. **Local** - Ollama, llama.cpp running on local machine
2. **Remote** - Custom OpenAI-compatible endpoints
3. **AWS Spot** - GPU instances launched via AI Compute
4. **Third-Party** - OpenAI, Anthropic, Google, Groq, Together AI, Azure

These connections can be used across the platform in:
- **LiveKit** - Real-time AI voice/chat
- **MCP Servers** - Model Context Protocol integrations
- **Automation Workflows** - Automated tasks and triggers

## Connection Types

### 1. Local Connections 💻

**Use Case:** Models running on your local machine or server

**Examples:**
- **Ollama** - `http://localhost:11434`
- **llama.cpp** - `http://localhost:8080`
- **Text Generation WebUI** - `http://localhost:5000`

**Setup:**
```json
{
  "name": "Local Ollama",
  "connection_type": "local",
  "base_url": "http://localhost:11434",
  "model_name": "llama3.2:3b",
  "use_in_livekit": true,
  "use_in_mcp": true
}
```

### 2. Remote Connections 🌐

**Use Case:** Self-hosted LLM servers (OpenAI-compatible)

**Examples:**
- **vLLM Server** - `http://your-server:8000`
- **TGI** - `http://your-server:8080`
- **LiteLLM Proxy** - `http://your-server:4000`

**Setup:**
```json
{
  "name": "Production vLLM",
  "connection_type": "remote",
  "base_url": "http://192.168.1.100:8000/v1",
  "model_name": "meta-llama/Llama-3.1-8B-Instruct",
  "timeout": 60,
  "use_in_livekit": true
}
```

### 3. AWS Spot Connections ☁️

**Use Case:** GPU instances launched through AI Compute

**Auto-Created:** When you launch an AWS Spot instance, a connection is automatically created

**Features:**
- Linked to AWS instance lifecycle
- Auto-populated with instance IP and endpoint
- Auto-deactivated when instance terminates

### 4. Third-Party APIs 🔌

#### OpenAI
```json
{
  "name": "OpenAI GPT-4",
  "connection_type": "openai",
  "base_url": "https://api.openai.com/v1",
  "model_name": "gpt-4",
  "api_key": "sk-...",
  "organization_id": "org-...",
  "use_in_livekit": true,
  "use_in_mcp": true
}
```

#### Anthropic (Claude)
```json
{
  "name": "Claude Sonnet",
  "connection_type": "anthropic",
  "base_url": "https://api.anthropic.com/v1",
  "model_name": "claude-3-5-sonnet-20241022",
  "api_key": "sk-ant-...",
  "use_in_livekit": true,
  "use_in_mcp": true
}
```

#### Google (Gemini)
```json
{
  "name": "Gemini Pro",
  "connection_type": "google",
  "base_url": "https://generativelanguage.googleapis.com/v1",
  "model_name": "gemini-pro",
  "api_key": "...",
  "use_in_automation": true
}
```

#### Groq
```json
{
  "name": "Groq Llama",
  "connection_type": "groq",
  "base_url": "https://api.groq.com/openai/v1",
  "model_name": "llama-3.1-70b-versatile",
  "api_key": "gsk_...",
  "use_in_livekit": true
}
```

#### Together AI
```json
{
  "name": "Together AI",
  "connection_type": "together",
  "base_url": "https://api.together.xyz/v1",
  "model_name": "meta-llama/Llama-3-70b-chat-hf",
  "api_key": "...",
  "use_in_automation": true
}
```

## Integration with LiveKit

### Enable for LiveKit

When creating/editing a connection, enable **"Use in LiveKit"** to make it available for real-time AI chat.

### Usage in LiveKit Agent

```python
# In your LiveKit agent code
from ump_llm_connections import get_connection

# Get connection by name or ID
connection = await get_connection("Local Ollama")

# Use in LiveKit agent
llm = connection.create_llm_instance()

# Chat function
async def chat(text: str):
    response = await llm.generate(
        prompt=text,
        temperature=connection.temperature,
        max_tokens=connection.max_tokens
    )
    return response.text
```

### LiveKit Agent Example

```python
# apps/livekit-agent/agent.py
import os
from livekit.agents import JobContext, WorkerOptions, cli
from livekit.plugins import openai, anthropic
from ump_llm_connections import ConnectionManager

# Initialize connection manager
conn_manager = ConnectionManager()

async def entrypoint(ctx: JobContext):
    # Get available LLM connections for LiveKit
    connections = await conn_manager.get_connections(use_in_livekit=True)

    # Use first available connection
    if connections:
        llm_conn = connections[0]
        llm = llm_conn.create_llm_instance()

        # Use in LiveKit voice assistant
        assistant = VoiceAssistant(
            llm=llm,
            # ... other config
        )

        await assistant.start(ctx.room)
```

## Integration with MCP Servers

### Enable for MCP

Enable **"Use in MCP"** to expose the connection to MCP servers.

### MCP Server Configuration

```json
// mcp-config.json
{
  "mcpServers": {
    "llm": {
      "command": "python",
      "args": ["-m", "ump_mcp_llm_server"],
      "env": {
        "UMP_AI_API_URL": "http://localhost:8002/api"
      }
    }
  }
}
```

### MCP Server Implementation

```python
# services/mcp/llm_server.py
from mcp.server import Server
from ump_llm_connections import ConnectionManager

server = Server("ump-llm")
conn_manager = ConnectionManager()

@server.list_tools()
async def list_tools():
    """List available LLM tools"""
    connections = await conn_manager.get_connections(use_in_mcp=True)

    return [
        {
            "name": f"query_{conn.name.lower().replace(' ', '_')}",
            "description": f"Query {conn.name} ({conn.model_name})",
            "parameters": {
                "prompt": {"type": "string", "description": "The prompt to send"},
                "max_tokens": {"type": "integer", "optional": True}
            }
        }
        for conn in connections
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    """Execute LLM query"""
    # Extract connection from tool name
    conn_name = name.replace("query_", "").replace("_", " ").title()
    connection = await conn_manager.get_connection(name=conn_name)

    # Generate response
    response = await connection.generate(
        prompt=arguments["prompt"],
        max_tokens=arguments.get("max_tokens")
    )

    return {"content": [{"type": "text", "text": response.text}]}
```

## Usage in Automation Workflows

### Enable for Automation

Enable **"Use in Automation"** to make the connection available in workflow builder.

### Example Workflow

```python
# In automation workflow
from ump_llm_connections import get_connection

async def process_ticket(ticket_id: str):
    # Get LLM connection
    llm = await get_connection("Claude Sonnet", use_in_automation=True)

    # Analyze ticket
    ticket_data = await get_ticket(ticket_id)

    response = await llm.generate(
        prompt=f"Analyze this support ticket and suggest a solution:\n{ticket_data}",
        max_tokens=1000
    )

    # Update ticket with AI suggestion
    await update_ticket(ticket_id, ai_suggestion=response.text)
```

## Connection Management UI

### Access: `/ai-compute/connections`

**Features:**
- ✅ Create/Edit/Delete connections
- ✅ Test connection (sends test prompt)
- ✅ View status (active, error, testing)
- ✅ Enable/disable for LiveKit, MCP, Automation
- ✅ Tag and organize connections
- ✅ Monitor usage and performance

### UI Sections:

1. **Summary Cards**
   - Total connections
   - Active connections
   - LiveKit-ready count
   - MCP-ready count

2. **Connection List**
   - Status badges
   - Integration badges (LiveKit, MCP, Automation)
   - Test button
   - Delete button

3. **Add Connection Dialog**
   - Connection type selector
   - Endpoint configuration
   - Authentication fields
   - Integration toggles
   - Advanced options (timeout, retries, temperature, max_tokens)

## Connection Testing

### Manual Testing

Click the **Test** button on any connection to:
1. Send a test prompt ("Hello, how are you?")
2. Measure latency
3. Verify authentication
4. Update connection status

### Health Monitoring

The system automatically:
- Tracks test history
- Records latency metrics
- Logs failures
- Updates connection status

## API Endpoints

### Connections CRUD

- `POST /api/connections` - Create new connection
- `GET /api/connections` - List all connections
- `GET /api/connections/{id}` - Get connection details
- `PATCH /api/connections/{id}` - Update connection
- `DELETE /api/connections/{id}` - Delete connection

### Connection Operations

- `POST /api/connections/{id}/test` - Test connection
- `POST /api/connections/{id}/activate` - Activate connection
- `POST /api/connections/{id}/deactivate` - Deactivate connection

### Filtering

```bash
# Filter by type
GET /api/connections?connection_type=local

# Filter by LiveKit availability
GET /api/connections?use_in_livekit=true

# Filter by MCP availability
GET /api/connections?use_in_mcp=true

# Filter by active status
GET /api/connections?is_active=true
```

## Database Schema

### Tables Created:

1. **`llm_connections`** - Main connections table
2. **`llm_connection_usage`** - Usage logging and analytics
3. **`llm_connection_health_checks`** - Health check history

### Key Fields:

- Connection metadata (name, type, description)
- Endpoint configuration (base_url, model_name)
- Authentication (encrypted api_key)
- Integration flags (use_in_livekit, use_in_mcp, use_in_automation)
- Status and health tracking
- Performance metrics

## Quick Start Examples

### Add Local Ollama

1. Go to `/ai-compute/connections`
2. Click "Add Connection"
3. Fill in:
   - Name: "Local Ollama"
   - Type: Local
   - Base URL: `http://localhost:11434`
   - Model: `llama3.2:3b`
4. Enable "Use in LiveKit" and "Use in MCP"
5. Click "Create Connection"
6. Click "Test" to verify

### Add OpenAI

1. Click "Add Connection"
2. Fill in:
   - Name: "OpenAI GPT-4"
   - Type: OpenAI
   - Base URL: `https://api.openai.com/v1`
   - Model: `gpt-4`
   - API Key: Your OpenAI key
3. Enable integrations as needed
4. Create and test

### Add AWS Spot Instance Connection

This is automatic! When you launch an AWS Spot instance:
1. Instance starts
2. Connection is auto-created
3. Endpoint is auto-populated
4. Ready for LiveKit/MCP

## Security Notes

### Current Implementation (Development)
- ⚠️ API keys stored in memory (not persisted)
- ⚠️ No encryption at rest
- ⚠️ TODO: Implement database persistence with encryption

### Production Recommendations
1. **Encryption:**
   - Encrypt API keys at rest
   - Use application-level encryption
   - Store in secure key vault

2. **Access Control:**
   - Integrate with RBAC service
   - User-specific connections
   - Team sharing with permissions

3. **Secrets Management:**
   - Use environment variables for service keys
   - Implement credential rotation
   - Audit access logs

## Connection Presets

### Popular Presets (Coming Soon):

- **Local Dev Stack**
  - Ollama (localhost:11434)
  - llama.cpp (localhost:8080)

- **Production Stack**
  - Primary: Claude Sonnet (Anthropic)
  - Fallback: GPT-4 (OpenAI)
  - Cost-effective: Groq Llama

- **Multi-Cloud**
  - OpenAI GPT-4
  - Anthropic Claude
  - Google Gemini
  - AWS Bedrock

## Monitoring and Analytics

### Usage Tracking

The system tracks:
- Request count per connection
- Token usage (prompt + completion)
- Latency metrics
- Success/failure rates
- Last used timestamp

### Health Checks

Automatic health monitoring:
- Test response time
- Error rate tracking
- Failure threshold alerts
- Auto-deactivation on repeated failures

## Best Practices

### 1. Naming Conventions
- Use descriptive names: "Production Claude", "Local Ollama Dev"
- Include environment: "Staging GPT-4", "Prod Llama 70B"

### 2. Tagging
- Use tags for organization: `["production", "fast"]`, `["dev", "local"]`
- Filter by tags in UI and API

### 3. Integration Flags
- Only enable integrations you actually use
- LiveKit: For real-time chat/voice
- MCP: For agent tooling
- Automation: For workflows

### 4. Testing
- Test connections after creation
- Re-test periodically
- Monitor latency trends

### 5. Fallbacks
- Configure multiple connections for redundancy
- Use priority ordering
- Implement failover logic

## Troubleshooting

### Connection Test Fails

```bash
# Check if service is running
curl http://localhost:11434/api/tags  # For Ollama

# Check if API key is valid
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check network connectivity
ping api.openai.com
```

### LiveKit Integration Not Working

1. Verify connection has `use_in_livekit: true`
2. Check connection status is "active"
3. Test connection manually first
4. Check LiveKit agent logs

### MCP Integration Not Working

1. Verify connection has `use_in_mcp: true`
2. Restart MCP server
3. Check MCP server logs
4. Verify API URL in MCP config

## Next Steps

1. **Create your first connection** - Start with local Ollama or a third-party API
2. **Test it** - Use the test button to verify
3. **Enable integrations** - Turn on LiveKit and/or MCP
4. **Use in your app** - Access from LiveKit agents or MCP servers

## API Examples

### Create Connection (cURL)

```bash
curl -X POST http://localhost:8002/api/connections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Local Ollama",
    "connection_type": "local",
    "base_url": "http://localhost:11434",
    "model_name": "llama3.2:3b",
    "use_in_livekit": true,
    "use_in_mcp": true,
    "is_active": true
  }'
```

### List LiveKit-Ready Connections

```bash
curl "http://localhost:8002/api/connections?use_in_livekit=true"
```

### Test Connection

```bash
curl -X POST "http://localhost:8002/api/connections/{id}/test" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, how are you?",
    "max_tokens": 50
  }'
```

## Database Schema Location

- Main schema: `services/ai/api/llm_connections_schema.sql`
- Run with: `psql -U postgres -d ump -f llm_connections_schema.sql`

## Future Enhancements

- [ ] Connection templates/presets
- [ ] Automatic failover and load balancing
- [ ] Cost tracking per connection
- [ ] Rate limiting per connection
- [ ] Connection groups/pools
- [ ] A/B testing between connections
- [ ] Advanced analytics dashboard
- [ ] Connection sharing between users
- [ ] Webhooks for connection events

## Support

For questions or issues:
- Check API docs: http://localhost:8002/docs
- View connection logs in the UI
- Test connections manually before integration
