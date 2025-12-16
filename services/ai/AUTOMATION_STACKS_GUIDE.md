# Automation Stack Deployment - Complete Guide

Deploy entire automation environments with one click using Portainer or AWS.

## 🎯 What Are Automation Stacks?

**Pre-configured bundles** of services that work together:
- 🎙️ **LiveKit Voice Agent** - Complete voice AI with STT/LLM/TTS
- ⚙️ **Temporal Worker** - Workflow orchestration
- 🚀 **Complete Platform** - Everything combined

**Instead of manually deploying 7+ containers, just:**
1. Select a stack template
2. Choose deployment target (Docker or AWS)
3. Click "Deploy Stack"
4. Everything auto-configures and connects!

---

## 📦 Available Stack Templates

### 1. **LiveKit Voice Agent (French)** 🎙️

**What it deploys:**
```
7 Containers:
├── LiveKit Server (WebRTC) - Port 7880
├── Redis (Config storage) - Port 6379
├── Ollama (Mistral LLM) - Port 11434
├── Whisper (French STT) - Port 8001
├── Piper (French TTS) - Port 8002
├── Voice Agent (Python) - Background
└── Web UI (Frontend) - Port 3001
```

**Requirements:**
- 16GB RAM
- 24GB VRAM (GPU)
- 8 CPU cores
- 50GB disk

**Best For:**
- Voice AI applications
- French language support
- Customer service bots
- Voice assistants

**Deployment Options:**
- ✅ Docker/Portainer (your GPU server)
- ✅ AWS Spot (g5.xlarge ~$0.30/hr)

### 2. **Temporal Worker** ⚙️

**What it deploys:**
```
1 Container:
└── Temporal Worker
    ├── Your workflows registered
    ├── Activity implementations
    └── Connects to existing Temporal server
```

**Requirements:**
- 4GB RAM
- 2 CPU cores
- 10GB disk
- No GPU needed

**Best For:**
- Workflow automation
- Adding workers to existing Temporal
- Scaling workflow execution

**Deployment Options:**
- ✅ Docker/Portainer only

### 3. **Complete Automation Platform** 🚀

**What it deploys:**
```
All LiveKit components + Temporal Worker
├── Complete voice AI stack (7 containers)
└── Temporal worker

Total: 8 containers, fully integrated
```

**Requirements:**
- 32GB RAM
- 24GB VRAM (GPU)
- 16 CPU cores
- 100GB disk

**Best For:**
- Production deployments
- All-in-one automation
- High-traffic applications

**Deployment Options:**
- ✅ AWS Spot only (g5.2xlarge ~$0.36/hr)

---

## 🚀 Deployment Flow

### **Example: Deploy LiveKit Voice Agent to Docker**

```
1. Go to /ai-compute/stacks

2. See available templates:
   ┌──────────────────────────────────┐
   │ 🎙️ LiveKit Voice Agent (French) │
   │ Complete voice AI with STT/LLM   │
   │                                  │
   │ Components: 7                    │
   │ Requires: 16GB RAM, 24GB VRAM    │
   │ [🚀 Deploy Stack]                │
   └──────────────────────────────────┘

3. Click "Deploy Stack"

4. Configure deployment:
   ┌──────────────────────────────────┐
   │ Deploy: LiveKit Voice Agent      │
   ├──────────────────────────────────┤
   │ Name: [Production Voice Bot]     │
   │                                  │
   │ Deploy To:                       │
   │ (•) Docker/Portainer             │
   │     └─ [prod-gpu-1 ▼]           │
   │ ( ) AWS Spot Instance            │
   │                                  │
   │ Configuration:                   │
   │ LLM Model: [mistral ▼]          │
   │ Whisper: [large-v3 ▼]           │
   │ Voice: [fr_FR-siwis ▼]          │
   │                                  │
   │ [🚀 Deploy Stack]                │
   └──────────────────────────────────┘

5. System deploys:
   ⏳ Creating Docker network
   ⏳ Pulling images (7 images)
   ⏳ Creating containers
   ⏳ Starting services
   ⏳ Pulling Mistral model (4GB)
   ⏳ Configuring Redis
   ⏳ Running health checks
   ✓ All services healthy!

6. Stack is ready:
   ┌──────────────────────────────────┐
   │ Production Voice Bot   ✓ Running │
   │                                  │
   │ Components: 7/7 running          │
   │ Host: 192.168.1.100              │
   │                                  │
   │ Access URLs:                     │
   │ • LiveKit: http://....:7880      │
   │ • Ollama: http://....:11434      │
   │ • Web UI: http://....:3001       │
   │                                  │
   │ LLM Connection Created:          │
   │ • "Production Voice Bot (Ollama)"│
   │   use_in_livekit: ✓              │
   └──────────────────────────────────┘

7. Use it:
   - Open Web UI: http://192.168.1.100:3001
   - Start talking to French voice agent
   - Or use LLM connection in other apps
```

---

## 🎨 Complete UI Flow

### **AI Compute Dashboard:**

```
┌─────────────────────────────────────────────────┐
│ AI Compute                                      │
├─────────────────────────────────────────────────┤
│ [Stats: Active Instances, Cost, GPU Hours]     │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ LLM Deployment                              │ │
│ │ ├─ AWS Spot Instances                       │ │
│ │ └─ Docker/Portainer                         │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────┐ │
│ │ 🆕 Automation Stacks                        │ │
│ │                                             │ │
│ │ Deploy complete automation environments     │ │
│ │                                             │ │
│ │ [🎙️ LiveKit] [⚙️ Temporal] [🚀 Complete]   │ │
│ │                                             │ │
│ │ [Browse Stacks →]                           │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ [LLM Connections] [General Settings]           │
└─────────────────────────────────────────────────┘
```

---

## 🔧 What Happens During Deployment

### **Docker Deployment (via Portainer):**

```python
1. Generate docker-compose.yml from template
2. Apply user config overrides
3. Create Docker network
4. Deploy each container via Portainer API:
   - Pull images
   - Create containers with proper config
   - Set up port mappings
   - Configure environment variables
   - Add GPU support (if needed)
   - Set restart policies
5. Start all containers
6. Run post-deploy commands:
   - Pull LLM models
   - Initialize databases
   - Configure services
7. Create LLM connections
8. Run health checks
9. Mark as deployed!
```

### **AWS Deployment:**

```python
1. Generate docker-compose.yml
2. Generate AWS user-data script:
   - Install Docker
   - Install Docker Compose
   - Install NVIDIA drivers (if GPU)
   - Write docker-compose.yml to /opt/
   - Pull images and start
3. Launch AWS Spot instance
4. User-data runs on boot
5. All containers start automatically
6. Create LLM connections
7. Return access URLs
```

---

## 💡 Auto-Configuration Features

### **Auto-Created LLM Connections:**

When stack deploys, system automatically creates:

```
LLM Connection: "Production Voice Bot (Ollama)"
├── Type: Remote
├── Base URL: http://192.168.1.100:11434
├── Model: mistral
├── Status: Active
├── use_in_livekit: ✓
├── use_in_mcp: ✓
└── use_in_automation: ✓

Now available in:
✓ LiveKit agents (can use this LLM)
✓ MCP servers (as a tool)
✓ Automation workflows (as an action)
```

### **Auto-Configuration:**

```
✓ Docker network created
✓ Port mappings configured
✓ Environment variables set
✓ Volume mounts created
✓ Dependencies ordered (depends_on)
✓ GPU access configured
✓ Health checks enabled
✓ Restart policies set
```

---

## 📊 Stack Management

### **View Deployed Stacks:**

```
/ai-compute/stacks → "Deployed" tab

┌──────────────────────────────────────────────┐
│ Production Voice Bot              ✓ Running  │
│                                              │
│ Target: Docker (prod-gpu-1)                  │
│ Components: 7/7 running                      │
│ Deployed: Dec 15, 2025                       │
│                                              │
│ Access URLs:                                 │
│ • livekit: http://192.168.1.100:7880        │
│ • web: http://192.168.1.100:3001            │
│ • ollama: http://192.168.1.100:11434        │
│                                              │
│ [▶️] [⏹️] [🗑️]                                │
└──────────────────────────────────────────────┘
```

---

## 🎯 Use Cases

### **Use Case 1: Quick Voice Agent Testing**

```
Problem: Need to test French voice agent quickly

Solution:
1. Deploy "LiveKit Voice Agent" to local Docker
2. Select "medium" models for speed
3. Deploy in 5 minutes
4. Test immediately at http://localhost:3001
5. Terminate when done
```

### **Use Case 2: Production Voice Agent**

```
Problem: Need production-ready voice agent

Solution:
1. Deploy "LiveKit Voice Agent" to AWS g5.xlarge
2. Select "large-v3" for accuracy
3. Auto-configures everything
4. Access at public IP
5. Auto-creates LLM connection
6. Use connection in other apps too!
```

### **Use Case 3: Temporal Worker for Workflows**

```
Problem: Need to run Temporal workflows

Solution:
1. Deploy "Temporal Worker" to Docker
2. Configure Temporal server address
3. Worker registers your workflows
4. Start executing workflows
5. Visual timeline shows approvals
```

### **Use Case 4: Complete Platform on AWS**

```
Problem: Need everything for automation

Solution:
1. Deploy "Complete Automation Platform"
2. Select AWS g5.2xlarge (powerful instance)
3. Everything deploys: LiveKit + Temporal + LLM
4. Full automation environment ready
5. Pay ~$0.36/hour, terminate when done
```

---

## 📁 Files Created:

```
Backend:
services/ai/api/app/
├── models/
│   └── stacks.py                    ✨ Stack models
├── services/
│   ├── stack_templates.py           ✨ Pre-built templates
│   └── stack_deployer.py            ✨ Deployment logic
└── routes/
    └── stacks.py                    ✨ API endpoints

Frontend:
apps/web/app/(dashboard)/ai-compute/
└── stacks/
    └── page.tsx                     ✨ Stack browser & deployer

Documentation:
services/ai/
└── AUTOMATION_STACKS_GUIDE.md       ✨ This file
```

---

## 🔌 API Endpoints

```
GET    /api/stacks/templates              List available templates
GET    /api/stacks/templates/{id}         Get template details
POST   /api/stacks/deploy                 Deploy a stack
GET    /api/stacks                        List deployed stacks
GET    /api/stacks/{id}                   Get deployment details
DELETE /api/stacks/{id}                   Terminate stack
GET    /api/stacks/{id}/docker-compose    Get docker-compose.yml
```

---

## 🎨 Complete System Navigation

```
AI Compute
│
├── LLM Deployment
│   ├── AWS Spot Instances
│   └── Docker/Portainer
│
├── 🆕 Automation Stacks
│   ├── Available Stacks
│   │   ├── LiveKit Voice Agent
│   │   ├── Temporal Worker
│   │   └── Complete Platform
│   └── Deployed Stacks
│       └── Manage running stacks
│
├── LLM Connections
│   └── (Auto-created by stacks!)
│
└── Settings
```

---

## ✨ Key Benefits

✅ **One-Click Deployment** - No manual Docker/AWS setup
✅ **Pre-Configured** - Everything works together out of the box
✅ **Auto-Integration** - LLM connections created automatically
✅ **Flexible** - Deploy to Docker or AWS
✅ **Customizable** - Override models, voices, settings
✅ **Production-Ready** - Includes health checks, restart policies
✅ **Cost-Effective** - Use Docker (free) or AWS Spot (cheap)

---

## 🚀 Quick Start

### **1. Access Stacks Page:**
```
http://localhost:3000/ai-compute/stacks
```

### **2. Deploy Your First Stack:**
- Click on "LiveKit Voice Agent (French)"
- Choose Docker or AWS
- Configure settings
- Click "Deploy Stack"
- Wait 5-10 minutes
- Access web UI and start talking!

### **3. Use the LLM Connection:**
The deployed Ollama is now available as an LLM connection:
- Use in LiveKit agents
- Use in MCP servers
- Use in automation workflows

---

## 🎯 Perfect For:

✅ **Quick Testing** - Deploy stack, test, terminate
✅ **Development** - Local Docker deployments
✅ **Production** - AWS with auto-scaling
✅ **Demos** - Show working system in minutes
✅ **Learning** - See how components connect

---

Your automation infrastructure deployment is now as easy as deploying a single LLM! 🎉
