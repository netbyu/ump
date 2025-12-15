# Multi-Host Docker Management Guide

Manage multiple Docker servers with individual settings for LLM deployment.

## Overview

The **Multi-Host Docker Management** system allows you to:
- ✅ Configure multiple Docker servers (unlimited)
- ✅ Each host has its own settings and preferences
- ✅ Deploy to specific hosts based on requirements
- ✅ Separate production, staging, and dev environments
- ✅ Different default frameworks per host
- ✅ GPU/CPU server separation

## Architecture

```
UMP AI Compute
│
└── Docker/Portainer
    │
    ├── Production GPU Server 1 (Host Settings)
    │   ├── Default: Ollama
    │   ├── GPU: Enabled
    │   ├── Max Containers: 10
    │   └── Deployed: [ollama-prod-1, ollama-prod-2, vllm-main]
    │
    ├── Development Server (Host Settings)
    │   ├── Default: vLLM
    │   ├── GPU: Enabled
    │   ├── Max Containers: 5
    │   └── Deployed: [vllm-test, ollama-dev]
    │
    └── CPU Inference Server (Host Settings)
        ├── Default: llama.cpp
        ├── GPU: Disabled
        ├── Max Containers: 3
        └── Deployed: [llamacpp-cpu-1]
```

## Navigation Structure

```
/ai-compute/docker/
├── page.tsx                      # Deploy & manage containers
├── hosts/
│   ├── page.tsx                  # List all configured hosts
│   └── [id]/
│       └── page.tsx              # Per-host settings
└── settings/
    └── page.tsx                  # Global Portainer configuration
```

## Host Configuration

### Access: `/ai-compute/docker/hosts`

### Configure a New Host:

1. **Click "Add Docker Host"**
2. **Fill in Host Details:**
   ```
   Name: Production GPU Server 1
   Description: 4x NVIDIA A100 GPUs, 128GB RAM
   Portainer Endpoint: prod-gpu-1 (from dropdown)
   Host URL: 192.168.1.100
   ```

3. **Set Default Deployment Settings:**
   ```
   Default Framework: Ollama
   GPU Enabled by Default: ✓
   Auto-create LLM Connections: ✓
   Port Range Start: 11434
   Max Containers: 10
   ```

4. **Click "Add Host"**

### Host-Specific Settings

Each host stores:

#### **Deployment Defaults:**
- **Default Framework** - What framework to pre-select when deploying to this host
- **GPU Enabled** - Whether to enable GPU by default for this host
- **Auto-create Connection** - Auto-create LLM connections for deployments
- **Port Range Start** - Starting port for sequential allocation

#### **Resource Limits:**
- **Max Containers** - Maximum LLM containers allowed on this host
- **CPU Limit** - Per-container CPU limit (optional)
- **Memory Limit** - Per-container memory limit (optional)

#### **Metadata:**
- **Name** - Human-readable host name
- **Description** - Notes about hardware, purpose, etc.
- **Host URL** - Public IP or hostname for accessing containers
- **Tags** - Organize hosts (e.g., "production", "gpu", "us-east")

## Example Configurations

### Production GPU Server

```json
{
  "name": "Production GPU Server 1",
  "description": "4x NVIDIA A100 80GB, 128GB RAM, NVMe storage",
  "portainer_endpoint_id": 1,
  "host_url": "192.168.1.100",
  "default_framework": "ollama",
  "default_gpu_enabled": true,
  "auto_create_connection": true,
  "default_port_range_start": 11434,
  "max_containers": 10,
  "tags": ["production", "gpu", "high-performance"]
}
```

**Use Cases:**
- Production Ollama deployments
- Large models (70B+)
- High availability
- Always-on services

### Development Server

```json
{
  "name": "Development GPU Server",
  "description": "2x NVIDIA RTX 4090, 64GB RAM",
  "portainer_endpoint_id": 2,
  "host_url": "192.168.1.101",
  "default_framework": "vllm",
  "default_gpu_enabled": true,
  "auto_create_connection": false,
  "default_port_range_start": 8000,
  "max_containers": 5,
  "tags": ["development", "testing"]
}
```

**Use Cases:**
- Testing new models
- vLLM experiments
- Limited containers for testing
- Manual connection management

### CPU Inference Server

```json
{
  "name": "CPU Inference Server",
  "description": "32-core AMD EPYC, 128GB RAM",
  "portainer_endpoint_id": 3,
  "host_url": "192.168.1.102",
  "default_framework": "llama-cpp",
  "default_gpu_enabled": false,
  "auto_create_connection": true,
  "default_port_range_start": 8080,
  "max_containers": 3,
  "tags": ["cpu-only", "cost-effective"]
}
```

**Use Cases:**
- GGUF quantized models
- Cost-effective inference
- CPU-only workloads
- Backup/failover

## Deployment Flow with Multiple Hosts

### Step 1: User Goes to Deploy

**URL:** `/ai-compute/docker`

### Step 2: Select Host

**Dropdown shows:**
```
┌─────────────────────────────────────────┐
│ Select Docker Host ▼                     │
├─────────────────────────────────────────┤
│ Production GPU Server 1                 │
│ 4x A100 • Default: Ollama • GPU ✓      │
│ 192.168.1.100                           │
├─────────────────────────────────────────┤
│ Development GPU Server                  │
│ 2x RTX 4090 • Default: vLLM • GPU ✓    │
│ 192.168.1.101                           │
├─────────────────────────────────────────┤
│ CPU Inference Server                    │
│ 32-core EPYC • Default: llama.cpp       │
│ 192.168.1.102                           │
└─────────────────────────────────────────┘
```

### Step 3: Form Pre-fills with Host Defaults

When host selected, form automatically sets:
- Framework → Host's default framework
- GPU Enabled → Host's default GPU setting
- Auto-create Connection → Host's preference
- Port → Next available in host's port range

### Step 4: Deploy

Container deployed with host-specific settings!

## Per-Host Settings Page

### Access: `/ai-compute/docker/hosts/[host-id]`

### **3 Tabs:**

#### 1️⃣ **Deployment Tab**
```
Default Deployment Settings

Default Framework
[Ollama ▼]

GPU Enabled by Default          ✓
Use GPU for new containers

Auto-create LLM Connections     ✓
Create connections automatically

Port Range Start
[11434           ]

[💾 Save Settings]
```

#### 2️⃣ **Resources Tab**
```
Resource Limits

Max Containers
[10              ]
Maximum LLM containers on this host

CPU Limit per Container (optional)
[4.0             ] cores

Memory Limit per Container (optional)
[8g              ]

[💾 Save Settings]
```

#### 3️⃣ **Host Info Tab**
```
Host Information

Portainer Endpoint ID:  1
Host URL:               192.168.1.100
Status:                 ✓ Online
Created:                Dec 15, 2025
Description:            4x NVIDIA A100 GPUs, 128GB RAM
```

## Host Management Features

### From Hosts List Page:

**For Each Host:**
- ⚙️ **Settings** - Go to per-host settings page
- ✏️ **Edit** - Modify host configuration
- 🗑️ **Delete** - Remove host (with confirmation)
- 📊 **View Details** - See host information

**Bulk Actions:**
- Filter by tags
- Sort by status, name, or creation date
- Search hosts by name

## Use Case Examples

### Multi-Environment Setup

```yaml
Production Environment:
  Host: prod-gpu-1 (192.168.1.100)
  Settings:
    - Framework: Ollama
    - GPU: Enabled
    - Max Containers: 10
    - Auto-create: Yes
    - Port Range: 11434+
  Deployments:
    - ollama-prod-main (llama3.1:70b)
    - ollama-prod-backup (mistral:7b)
    - vllm-prod-api (Llama-3.1-8B)

Staging Environment:
  Host: staging-gpu (192.168.1.101)
  Settings:
    - Framework: vLLM
    - GPU: Enabled
    - Max Containers: 5
    - Auto-create: No (manual testing)
    - Port Range: 8000+
  Deployments:
    - vllm-staging-test
    - ollama-staging-preview

Development Environment:
  Host: dev-local (localhost)
  Settings:
    - Framework: llama.cpp
    - GPU: Disabled (CPU only)
    - Max Containers: 3
    - Auto-create: Yes
    - Port Range: 8080+
  Deployments:
    - llamacpp-dev-small
```

### Geographic Distribution

```yaml
US East Server:
  Host: us-east-gpu
  URL: us-gpu.example.com
  Settings: vLLM, GPU, Low latency for US users

Europe Server:
  Host: eu-west-gpu
  URL: eu-gpu.example.com
  Settings: Ollama, GPU, GDPR-compliant region

Asia Pacific Server:
  Host: ap-south-gpu
  URL: ap-gpu.example.com
  Settings: TGI, GPU, Low latency for APAC
```

### Specialized Hosts

```yaml
Large Model Host:
  Hardware: 8x A100 80GB
  Framework: vLLM (optimized for large models)
  Max Containers: 2 (resource-intensive)
  Models: 70B+ only

Medium Model Host:
  Hardware: 4x A10G 24GB
  Framework: Ollama (versatile)
  Max Containers: 8
  Models: 7B-13B range

Small Model Host:
  Hardware: 2x RTX 4090
  Framework: llama.cpp (efficient)
  Max Containers: 12
  Models: 1B-3B, quantized
```

## Smart Host Selection

When deploying, the UI can suggest best host based on:

1. **Model Size**
   - 70B+ → Large model host
   - 7-13B → Medium model host
   - <3B → Small model host

2. **Framework**
   - vLLM → vLLM-optimized host
   - Ollama → General-purpose host
   - llama.cpp → CPU-capable host

3. **Availability**
   - Check current container count vs max
   - Prefer hosts with free capacity
   - Show warning if near limit

## Host Status Monitoring

### Automatic Status Detection:

The system checks:
- ✅ Portainer endpoint reachability
- ✅ Container count vs limit
- ✅ Available resources
- ⚠️ Warning when approaching limits

### Status Indicators:

- 🟢 **Online** - Host reachable and healthy
- 🔴 **Offline** - Host unreachable
- 🟡 **Warning** - Near capacity limits
- ⚪ **Inactive** - Disabled in configuration

## Best Practices

### 1. Naming Convention
```
Environment-Purpose-Number
  - prod-gpu-1
  - staging-cpu-1
  - dev-local
```

### 2. Descriptions
Include key details:
```
"4x A100 80GB, 128GB RAM, 2TB NVMe, US-East"
"2x RTX 4090, 64GB RAM, Development only"
"32-core EPYC, 128GB RAM, CPU inference"
```

### 3. Port Ranges
Separate by host to avoid conflicts:
```
Production:  11434-11444 (Ollama)
Staging:     8000-8010   (vLLM)
Development: 8080-8090   (llama.cpp)
```

### 4. Resource Limits
Set appropriate maximums:
```
High-end GPU: 10-20 containers
Mid-range GPU: 5-10 containers
CPU-only: 3-5 containers
```

### 5. Tags for Organization
```
["production", "gpu", "high-availability"]
["staging", "testing", "us-east"]
["development", "cpu", "cost-effective"]
```

## Troubleshooting

### Host Shows Offline

1. Check Portainer endpoint status
2. Verify host network connectivity
3. Check Docker service running
4. Refresh host status

### Cannot Deploy to Host

1. Check max container limit
2. Verify host is active
3. Check port availability
4. Review host settings

### Settings Not Applied

1. Ensure settings are saved
2. Try deploying new container
3. Check host defaults in deployment form
4. Verify host is selected

## Migration from Single Host

If you previously used a single Docker configuration:

1. **Create host entry** for your existing server
2. **Import settings** from global preferences
3. **Deploy new containers** using host selection
4. **Existing containers** continue to work
5. **Optionally** add more hosts

## API Support

### Backend Endpoints (Future):

```
GET    /api/docker/hosts           List configured hosts
POST   /api/docker/hosts           Add new host
GET    /api/docker/hosts/{id}      Get host details
PATCH  /api/docker/hosts/{id}      Update host
DELETE /api/docker/hosts/{id}      Remove host
GET    /api/docker/hosts/{id}/containers  List containers on host
```

### Current Implementation:

- Hosts stored in localStorage (frontend)
- TODO: Move to database for persistence
- TODO: Add backend validation
- TODO: Add host health monitoring

## Complete Setup Example

### Scenario: 3-Server Setup

**Setup:**
```bash
# 1. Install Portainer on each server
# 2. Add each server as Portainer endpoint
# 3. Configure hosts in UMP
```

**Host 1 - Production:**
```
Name: prod-gpu-1
Endpoint: production-gpu (Portainer)
URL: 192.168.1.100
Framework: Ollama (stable, versatile)
GPU: Yes
Max: 10 containers
Ports: 11434-11444
```

**Host 2 - Staging:**
```
Name: staging-gpu
Endpoint: staging-server (Portainer)
URL: 192.168.1.101
Framework: vLLM (testing new models)
GPU: Yes
Max: 5 containers
Ports: 8000-8005
```

**Host 3 - Dev:**
```
Name: dev-local
Endpoint: local (Portainer)
URL: localhost
Framework: llama.cpp (quick testing)
GPU: No (CPU only)
Max: 3 containers
Ports: 8080-8083
```

**Deploy Workflow:**
```
1. Select host based on need:
   - Large model → prod-gpu-1
   - Testing → staging-gpu
   - Quick test → dev-local

2. Form pre-fills with host defaults

3. Deploy with one click

4. Container uses host-specific settings
```

## Benefits of Per-Host Settings

### ✅ Environment Separation
- Production hosts for stable deployments
- Staging hosts for testing
- Development hosts for experiments

### ✅ Resource Optimization
- GPU hosts for large models
- CPU hosts for small/quantized models
- Specialized hosts for specific frameworks

### ✅ Cost Management
- Expensive GPU hosts: Limited containers
- Cheaper CPU hosts: More containers
- Track deployment costs per host

### ✅ Simplified Deployment
- Defaults pre-filled based on host
- Less configuration required
- Consistent settings per environment

### ✅ Scalability
- Add new hosts as needed
- Distribute load across hosts
- Easy to expand infrastructure

## Future Enhancements

- [ ] Host health monitoring dashboard
- [ ] Automatic host selection based on model size
- [ ] Load balancing across hosts
- [ ] Host groups (e.g., "Production Pool")
- [ ] Resource usage charts per host
- [ ] Cost tracking per host
- [ ] Container migration between hosts
- [ ] Host templates for quick setup
- [ ] Automatic failover configuration

## Summary

With multi-host Docker management, you can:
1. **Configure multiple Docker servers** with individual settings
2. **Deploy to specific hosts** based on requirements
3. **Separate environments** (prod/staging/dev)
4. **Optimize resources** (GPU vs CPU hosts)
5. **Scale easily** by adding more hosts

Each host maintains its own preferences while sharing the unified LLM connection management system! 🚀
