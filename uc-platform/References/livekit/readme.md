# 🇫🇷 Agent Vocal Français - LiveKit Stack

Stack complète et prête à l'emploi pour déployer un agent conversationnel vocal en français.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Web UI (React)                           │
│                   http://localhost:3000                     │
└─────────────────────────────┬───────────────────────────────┘
                              │ WebRTC
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  LiveKit Server                             │
│                   ws://localhost:7880                       │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                French Voice Agent (Python)                  │
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ Whisper  │───▶│ Mistral  │───▶│  Piper   │             │
│  │  (STT)   │    │  (LLM)   │    │  (TTS)   │             │
│  └──────────┘    └──────────┘    └──────────┘             │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Composants

| Service | Port | Description |
|---------|------|-------------|
| **Web UI** | 3000 | Interface utilisateur |
| **LiveKit** | 7880 | Serveur WebRTC |
| **Ollama** | 11434 | LLM (Mistral) |
| **Whisper** | 8001 | Speech-to-Text |
| **Piper** | 8002 | Text-to-Speech |
| **Redis** | 6379 | Cache LiveKit |

## 🚀 Démarrage Rapide

### Prérequis

- Docker & Docker Compose
- 8GB+ RAM
- (Optionnel) GPU NVIDIA avec CUDA pour de meilleures performances

### Installation

```bash
# Clone ou copie le projet
cd livekit-french-voice-agent

# Rendre le script exécutable
chmod +x setup.sh

# Lancer l'installation
./setup.sh
```

### Démarrage

**Avec GPU NVIDIA:**
```bash
docker compose up -d
```

**Sans GPU (CPU only):**
```bash
docker compose -f docker-compose.cpu.yml up -d
```

### Vérification

```bash
# Voir les logs
docker compose logs -f

# Vérifier que tous les services sont up
docker compose ps
```

### Accès

Ouvrir http://localhost:3000 dans votre navigateur.

## 🎤 Utilisation

1. Cliquez sur **"Démarrer"** pour vous connecter
2. **Maintenez le bouton micro** (ou la barre espace) pour parler
3. Relâchez pour que l'agent réponde
4. La conversation apparaît dans le transcript

## ⚙️ Configuration

### Variables d'environnement

```bash
# LiveKit
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret123456789012345678901234567890

# Modèles
OLLAMA_MODEL=mistral           # ou mixtral, vigogne, etc.
WHISPER_MODEL=large-v3         # ou medium, small, base
PIPER_VOICE=fr_FR-siwis-medium # ou fr_FR-upmc-medium
```

### Changer de modèle LLM

```bash
# Se connecter au container Ollama
docker exec -it ollama bash

# Télécharger un autre modèle
ollama pull mixtral
ollama pull vigogne:13b
```

### Ajouter des voix Piper

```bash
# Télécharger une voix masculine
wget -O voices/fr_FR-upmc-medium.onnx \
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/upmc/medium/fr_FR-upmc-medium.onnx"
```

## 🔧 Développement

### Structure du projet

```
livekit-french-voice-agent/
├── docker-compose.yml          # Stack GPU
├── docker-compose.cpu.yml      # Stack CPU
├── setup.sh                    # Script d'installation
├── config/
│   ├── livekit.yaml           # Config LiveKit
│   ├── Dockerfile.piper       # Image Piper TTS
│   └── piper_server.py        # API Piper
├── agent/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── agent.py               # Agent principal
├── web/
│   ├── Dockerfile
│   ├── package.json
│   ├── server.js              # API tokens
│   └── public/
│       └── index.html         # UI
└── voices/                     # Modèles Piper
```

### Modifier l'agent

```python
# agent/agent.py

# Changer le system prompt
self.system_prompt = """Tu es un assistant spécialisé en support client.
Réponds en français de manière professionnelle mais amicale.
"""

# Changer la voix
PIPER_VOICE = "fr_FR-upmc-medium"  # Voix masculine
```

### Rebuilder après modifications

```bash
docker compose build voice-agent
docker compose up -d voice-agent
```

## 📊 Performances

| Config | STT Latency | LLM Latency | TTS Latency | Total |
|--------|-------------|-------------|-------------|-------|
| GPU (RTX 3080) | ~200ms | ~500ms | ~100ms | ~800ms |
| CPU (i7-12700) | ~2s | ~3s | ~200ms | ~5s |

## 🔒 Production

Pour un déploiement en production:

1. **Changer les secrets:**
```yaml
# config/livekit.yaml
keys:
  your-api-key: your-secure-secret-min-32-chars
```

2. **Configurer HTTPS:**
```yaml
# Ajouter un reverse proxy (nginx/traefik)
```

3. **Scaling:**
```bash
# Plusieurs agents
docker compose up -d --scale voice-agent=3
```

## 🐛 Troubleshooting

### "GPU not detected"
```bash
# Vérifier NVIDIA driver
nvidia-smi

# Vérifier Docker GPU support
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi
```

### "Ollama model not found"
```bash
# Télécharger manuellement
docker exec -it ollama ollama pull mistral
```

### "Audio not working"
- Vérifier les permissions micro dans le navigateur
- Utiliser Chrome ou Firefox (Safari a des limitations WebRTC)

## 📚 Ressources

- [LiveKit Documentation](https://docs.livekit.io/)
- [Ollama Models](https://ollama.ai/library)
- [Piper TTS Voices](https://github.com/rhasspy/piper)
- [Faster Whisper](https://github.com/guillaumekln/faster-whisper)

## 📄 Licence

MIT License - Libre d'utilisation et modification.
