# Docker/Portainer LLM Deployment Guide

Deploy and manage LLMs on remote Docker hosts using Portainer - just like AWS Spot instances but for Docker containers.

## Overview

The **Docker LLM Deployment** system allows you to:
- ✅ Deploy Ollama, vLLM, TGI, llama.cpp to remote Docker hosts
- ✅ Manage containers via Portainer API
- ✅ Auto-create LLM connections for LiveKit/MCP
- ✅ GPU support with NVIDIA Docker runtime
- ✅ Simple UI similar to AWS Spot launch

## Architecture

```
┌─────────────────┐
│  UMP Frontend   │
│  (Port 3000)    │
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│  AI Compute API │
│  (Port 8002)    │
└────────┬────────┘
         │
         │ Portainer API
         │
┌────────▼────────┐       ┌──────────────┐
│   Portainer     │───────│ Docker Host 1│
│  (Port 9000)    │       │ (Ollama GPU) │
└─────────────────┘       └──────────────┘
         │                ┌──────────────┐
         └────────────────│ Docker Host 2│
                          │ (vLLM GPU)   │
                          └──────────────┘
```

## Prerequisites

### 1. Install Portainer

**On main server:**
```bash
docker volume create portainer_data

docker run -d \
  -p 9000:9000 \
  -p 8000:8000 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

Access Portainer: http://localhost:9000

### 2. Add Docker Hosts to Portainer

**For each remote Docker host:**

```bash
# On remote host, install Portainer agent
docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest
```

**In Portainer UI:**
1. Go to Settings → Endpoints
2. Click "Add endpoint"
3. Select "Agent"
4. Enter endpoint name and URL: `remote-host:9001`
5. Save

### 3. Install NVIDIA Docker Runtime (for GPU support)

**On each GPU-enabled Docker host:**

```bash
# Install NVIDIA Docker runtime
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
    sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Configure Docker to use NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# Test GPU access
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

### 4. Get Portainer API Token

**In Portainer UI:**
1. Go to User Settings
2. Scroll to "Access tokens"
3. Click "Add access token"
4. Enter description: "UMP AI Compute"
5. Copy the token

### 5. Configure UMP AI Service

```bash
cd /home/ubuntu/vscode/ump/services/ai/api

# Add to .env
echo "PORTAINER_URL=http://localhost:9000" >> .env
echo "PORTAINER_API_TOKEN=ptr_your_token_here" >> .env
```

## Usage

### Access: `/ai-compute/docker`

### Deploy an LLM Container

1. **Select Docker Host**
   - Choose from configured Portainer endpoints
   - See host URL and status

2. **Choose Framework**
   - **Ollama** - Easy setup, pulls models on demand
   - **vLLM** - High performance, requires model name
   - **TGI** - HuggingFace models, optimized
   - **llama.cpp** - GGUF models, CPU/GPU flexible

3. **Configure**
   - Container name (e.g., "ollama-prod")
   - Model name (optional for Ollama, required for vLLM/TGI)
   - Port (auto-filled based on framework)
   - Enable GPU (if available on host)

4. **Integration**
   - ✅ Auto-create LLM connection
   - ✅ Use in LiveKit
   - ✅ Use in MCP

5. **Deploy**
   - Click "Deploy Container"
   - Container starts automatically
   - Connection created if enabled

### Manage Containers

**View All Containers:**
- See all deployed containers across hosts
- Status indicators (running, stopped, etc.)
- Framework and model info
- Connection URLs

**Container Actions:**
- ▶️ **Start** - Start stopped container
- ⏹️ **Stop** - Stop running container
- 🗑️ **Remove** - Delete container
- 🔄 **Refresh** - Update status

## Framework-Specific Deployment

### Ollama

```json
{
  "endpoint_id": 1,
  "name": "ollama-llama3",
  "framework": "ollama",
  "model_name": "llama3.2:3b",  // Optional, can pull later
  "gpu_enabled": true,
  "port": 11434,
  "auto_create_connection": true,
  "use_in_livekit": true
}
```

**Container Details:**
- Image: `ollama/ollama:latest`
- Port: 11434
- Auto-pulls model if specified
- GPU support via NVIDIA runtime

**After Deployment:**
```bash
# Pull additional models
docker exec ollama-llama3 ollama pull mistral:7b

# Test
curl http://host:11434/api/generate -d '{
  "model": "llama3.2:3b",
  "prompt": "Hello!"
}'
```

### vLLM

```json
{
  "endpoint_id": 1,
  "name": "vllm-llama-8b",
  "framework": "vllm",
  "model_name": "meta-llama/Llama-3.1-8B-Instruct",  // Required
  "gpu_enabled": true,
  "port": 8000,
  "hf_token": "hf_...",  // For gated models
  "auto_create_connection": true,
  "use_in_livekit": true
}
```

**Container Details:**
- Image: `vllm/vllm-openai:latest`
- Port: 8000
- OpenAI-compatible API
- Requires model name
- GPU required

**Test:**
```bash
curl http://host:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-3.1-8B-Instruct",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Text Generation Inference (TGI)

```json
{
  "endpoint_id": 1,
  "name": "tgi-mistral",
  "framework": "tgi",
  "model_name": "mistralai/Mistral-7B-Instruct-v0.3",
  "gpu_enabled": true,
  "port": 8080,
  "hf_token": "hf_..."
}
```

**Container Details:**
- Image: `ghcr.io/huggingface/text-generation-inference:latest`
- Port: 8080
- HuggingFace optimized
- GPU recommended

### llama.cpp

```json
{
  "endpoint_id": 1,
  "name": "llamacpp-server",
  "framework": "llama-cpp",
  "gpu_enabled": false,  // Can run on CPU
  "port": 8080
}
```

**Container Details:**
- Image: `ghcr.io/ggerganov/llama.cpp:server`
- Port: 8080
- Supports GGUF models
- CPU or GPU

## Auto-Created LLM Connections

When **"Auto-create LLM connection"** is enabled, the system automatically:

1. **Creates connection** after container starts
2. **Populates endpoint** with host IP and port
3. **Sets integration flags** based on your selections
4. **Ready for use** in LiveKit, MCP, or Automation

**Example Connection Created:**
```
Name: ollama-llama3 (Docker)
Type: Remote
Base URL: http://192.168.1.100:11434
Model: llama3.2:3b
Status: Active
Integrations: LiveKit ✓, MCP ✓
```

## Comparison: AWS Spot vs Docker

| Feature | AWS Spot | Docker/Portainer |
|---------|----------|------------------|
| **Setup** | Auto-provisioned | Use existing hosts |
| **Cost** | Pay per hour | Free (use your hardware) |
| **GPU** | Always available | Requires GPU hosts |
| **Scaling** | Launch new instances | Deploy to multiple hosts |
| **Management** | AWS Console | Portainer |
| **Best For** | Testing, burst workloads | Production, always-on |

## Use Cases

### Development Environment
```
┌─────────────────────────────────┐
│ Docker Host: dev-machine        │
│ ├── ollama-dev (llama3.2:3b)   │
│ └── vllm-test (mistral:7b)     │
└─────────────────────────────────┘
```

### Production Environment
```
┌─────────────────────────────────┐
│ Docker Host: prod-gpu-1         │
│ ├── ollama-prod (llama3.1:70b) │
│ └── vllm-prod (custom-model)   │
├─────────────────────────────────┤
│ Docker Host: prod-gpu-2         │
│ └── tgi-prod (gated-model)     │
└─────────────────────────────────┘
```

### Hybrid Setup
```
AWS Spot: Quick testing, burst capacity
  ├── g5.xlarge (test-instance-1)
  └── g5.2xlarge (test-instance-2)

Docker: Always-on production
  ├── prod-gpu-1 (vllm-main)
  └── prod-gpu-2 (ollama-backup)
```

## Integration Examples

### LiveKit Voice Agent

After deploying Docker LLM with LiveKit enabled:

```python
# LiveKit agent automatically sees the connection
from ump_llm_connections import get_connections

# Get Docker-deployed LLMs available for LiveKit
llms = await get_connections(
    connection_type="remote",
    use_in_livekit=True
)

# Use in voice assistant
assistant = VoiceAssistant(llm=llms[0])
```

### MCP Server

```python
# MCP server lists Docker-deployed LLMs as tools
from ump_llm_connections import get_connections

mcp_llms = await get_connections(use_in_mcp=True)

# Expose as MCP tools
for llm in mcp_llms:
    @server.tool(f"query_{llm.name}")
    async def query(prompt: str):
        return await llm.generate(prompt)
```

## API Endpoints

### Docker Management

- `GET /api/docker/endpoints` - List Docker hosts
- `POST /api/docker/deploy` - Deploy LLM container
- `GET /api/docker/containers` - List all containers
- `GET /api/docker/containers/{id}` - Get container details
- `POST /api/docker/containers/{id}/start` - Start container
- `POST /api/docker/containers/{id}/stop` - Stop container
- `DELETE /api/docker/containers/{id}` - Remove container
- `GET /api/docker/containers/{id}/logs` - View logs

## Troubleshooting

### Portainer Connection Failed

```bash
# Verify Portainer is running
curl http://localhost:9000/api/status

# Check API token
curl http://localhost:9000/api/endpoints \
  -H "X-API-Key: ptr_your_token"
```

### Container Won't Start

```bash
# Check logs in Portainer UI
# Or via API:
curl "http://localhost:8002/api/docker/containers/{id}/logs?endpoint_id=1"

# Common issues:
# - GPU not available (disable GPU or install NVIDIA runtime)
# - Port already in use (change port)
# - Model download failed (check network, HF token)
```

### GPU Not Detected

```bash
# On Docker host, test GPU:
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi

# If fails, reinstall NVIDIA Docker runtime
```

### Model Download Slow

```bash
# For large models, download can take 10-30 minutes
# Check container logs for progress

# For vLLM/TGI: Model downloads on first start
# For Ollama: Model pulled in background
```

## Best Practices

### 1. Resource Planning
- **Small models (1-3B):** 8GB RAM, 1 GPU or CPU
- **Medium models (7-8B):** 16GB RAM, 1 GPU (16GB VRAM)
- **Large models (70B):** 64GB+ RAM, 4 GPUs (96GB VRAM)

### 2. Networking
- Use consistent ports across hosts
- Configure firewall rules
- Use reverse proxy for production

### 3. Persistence
- Mount volumes for Ollama models: `-v ollama-data:/root/.ollama`
- Mount HuggingFace cache: `-v hf-cache:/root/.cache/huggingface`

### 4. Monitoring
- Enable Portainer logging
- Monitor GPU usage: `nvidia-smi -l 1`
- Check container health regularly

### 5. Security
- Use private Docker registries
- Secure Portainer with HTTPS
- Rotate API tokens regularly
- Use encrypted HF tokens

## Quick Start Example

### Deploy Ollama to Local Docker

1. Go to `/ai-compute/docker`
2. Click "Deploy New" tab
3. Fill in:
   - Docker Host: "local"
   - Name: "ollama-dev"
   - Framework: Ollama
   - Model: "llama3.2:3b" (optional)
   - GPU: Enabled (if available)
   - Port: 11434
   - Auto-create connection: ✓
   - Use in LiveKit: ✓
4. Click "Deploy Container"
5. Wait for deployment (1-2 minutes)
6. Container appears in "Manage Containers"
7. LLM Connection auto-created
8. Ready to use in LiveKit!

## Advanced Configuration

### Custom Environment Variables

```json
{
  "env_vars": {
    "OLLAMA_NUM_PARALLEL": "4",
    "OLLAMA_MAX_LOADED_MODELS": "2",
    "VLLM_ATTENTION_BACKEND": "FLASHINFER"
  }
}
```

### Volume Mounts

```json
{
  "volumes": [
    "ollama-models:/root/.ollama",
    "/mnt/models:/models:ro"
  ]
}
```

### Resource Limits

```json
{
  "cpu_limit": 4.0,  // 4 CPU cores
  "memory_limit": "8g"  // 8GB RAM
}
```

## Container Templates

### Development Stack
```yaml
ollama-dev:
  framework: ollama
  gpu: false
  port: 11434
  model: llama3.2:1b

vllm-test:
  framework: vllm
  gpu: true
  port: 8000
  model: meta-llama/Llama-3.1-8B-Instruct
```

### Production Stack
```yaml
ollama-prod:
  framework: ollama
  gpu: true
  port: 11434
  models:
    - llama3.1:70b
    - codellama:34b

vllm-primary:
  framework: vllm
  gpu: true
  port: 8000
  model: meta-llama/Llama-3.1-70B-Instruct
  memory: 64g
```

## Monitoring & Logs

### View Container Logs

```bash
# Via API
curl "http://localhost:8002/api/docker/containers/{id}/logs?endpoint_id=1&tail=100"

# Via Portainer UI
# Go to Containers → Select container → Logs
```

### Monitor GPU Usage

```bash
# SSH into Docker host
ssh user@docker-host

# Watch GPU usage
watch -n 1 nvidia-smi
```

## Next Steps

1. **Deploy your first container** - Start with Ollama on local Docker
2. **Test the connection** - Use the test button
3. **Use in LiveKit** - Connection is ready for real-time chat
4. **Scale up** - Add more Docker hosts and deploy multiple LLMs

## Differences from AWS Spot

**AWS Spot:**
- ✅ Managed instances
- ✅ Pay per hour
- ✅ Auto-setup (drivers, Docker, frameworks)
- ⚠️ Can be interrupted
- 💰 ~$0.30-$5/hour

**Docker/Portainer:**
- ✅ Your own hardware
- ✅ Free (after hardware cost)
- ✅ Full control
- ✅ Always available
- ⚙️ Manual setup required

## Support

- **Portainer Docs:** https://docs.portainer.io
- **API Docs:** http://localhost:8002/docs
- **Docker Docs:** https://docs.docker.com
