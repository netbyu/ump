# AWS Spot Instance Launcher for LLM Testing

Automatically create and launch GPU spot instances for testing LLMs. Save 60-90% compared to on-demand pricing.

## Features

- 🚀 **One-command launch** - Spin up GPU instances in seconds
- 💰 **Cost optimized** - Spot instances at 60-90% discount
- 🤖 **Multiple frameworks** - Ollama, vLLM, TGI, llama.cpp
- 📊 **Price comparison** - Real-time spot pricing
- 🔧 **Auto-setup** - NVIDIA drivers, Docker, frameworks pre-installed
- 🔑 **SSH ready** - Auto-creates key pairs and security groups

## Quick Start

### 1. Install Dependencies

```bash
pip install boto3 typer rich
```

### 2. Configure AWS Credentials

```bash
aws configure
# Or set environment variables:
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_DEFAULT_REGION=us-east-1
```

### 3. Launch an Instance

```bash
# Launch with Ollama + Llama 3.2
python aws_spot_llm.py launch --instance-type g5.xlarge --model llama3.2:3b

# Launch with vLLM
python aws_spot_llm.py launch -i g5.2xlarge -f vllm -m meta-llama/Llama-3.2-3B-Instruct

# Launch bare instance (manual setup)
python aws_spot_llm.py launch -i g4dn.xlarge -f custom
```

## Commands

| Command | Description |
|---------|-------------|
| `launch` | Launch a new GPU spot instance |
| `list-instances` | List all running LLM test instances |
| `status <id>` | Get detailed instance status |
| `terminate <id>` | Terminate an instance |
| `ssh <id>` | SSH into an instance |
| `list-prices` | Show GPU instance pricing |
| `recommend <model>` | Get instance recommendation for a model |

## Instance Types & Pricing

| Instance | GPU | VRAM | Spot Est. | Best For |
|----------|-----|------|-----------|----------|
| g4dn.xlarge | 1x T4 | 16GB | ~$0.16/hr | Small models (1-3B) |
| g4dn.2xlarge | 1x T4 | 16GB | ~$0.23/hr | Small models + more RAM |
| g5.xlarge | 1x A10G | 24GB | ~$0.30/hr | Medium models (7-8B) ⭐ |
| g5.2xlarge | 1x A10G | 24GB | ~$0.36/hr | Medium models + RAM |
| g5.4xlarge | 1x A10G | 24GB | ~$0.49/hr | Medium models + CPU |
| g5.12xlarge | 4x A10G | 96GB | ~$1.70/hr | Large models (70B) |
| g5.48xlarge | 8x A10G | 192GB | ~$4.90/hr | Very large models |
| g6.xlarge | 1x L4 | 24GB | ~$0.24/hr | Efficient inference |
| p3.2xlarge | 1x V100 | 16GB | ~$0.92/hr | Training |
| p4d.24xlarge | 8x A100 | 320GB | ~$9.83/hr | 405B models |

## Examples

### Launch Ollama with Llama 3.1 8B

```bash
python aws_spot_llm.py launch \
    --instance-type g5.xlarge \
    --framework ollama \
    --model llama3.1:8b \
    --name my-llm-test
```

### Launch vLLM with HuggingFace Model

```bash
export HF_TOKEN=hf_xxxxx  # For gated models

python aws_spot_llm.py launch \
    --instance-type g5.2xlarge \
    --framework vllm \
    --model meta-llama/Llama-3.1-8B-Instruct \
    --name vllm-server
```

### Check Current Spot Prices

```bash
python aws_spot_llm.py list-prices
```

Output:
```
┏━━━━━━━━━━━━━━━━┳━━━━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━━┓
┃ Instance Type  ┃ GPU       ┃ GPU Memory ┃ On-Demand  ┃ Spot Now  ┃
┡━━━━━━━━━━━━━━━━╇━━━━━━━━━━━╇━━━━━━━━━━━━╇━━━━━━━━━━━━╇━━━━━━━━━━━┩
│ g5.xlarge      │ 1x A10G   │ 24GB       │ $1.006     │ $0.301    │
│ g5.2xlarge     │ 1x A10G   │ 24GB       │ $1.212     │ $0.363    │
│ g5.12xlarge    │ 4x A10G   │ 96GB       │ $5.672     │ $1.702    │
└────────────────┴───────────┴────────────┴────────────┴───────────┘
```

### Get Model Recommendations

```bash
python aws_spot_llm.py recommend "llama3.1:70b"
```

### List Running Instances

```bash
python aws_spot_llm.py list-instances
```

### SSH into Instance

```bash
python aws_spot_llm.py ssh i-0abc123def456
```

### Terminate Instance

```bash
python aws_spot_llm.py terminate i-0abc123def456
```

## Connecting to Your Instance

After launch, you'll see connection info:

```
╭─────────────── Connection Info ───────────────╮
│ SSH:                                          │
│ ssh -i ~/.ssh/llm-testing-key.pem ubuntu@... │
│                                               │
│ Ollama API:                                   │
│ http://54.xx.xx.xx:11434                     │
│                                               │
│ vLLM API:                                     │
│ http://54.xx.xx.xx:8000                      │
╰───────────────────────────────────────────────╯
```

### Using Ollama

```bash
# SSH in and run models
ssh -i ~/.ssh/llm-testing-key.pem ubuntu@<ip>

# Check setup progress
sudo tail -f /var/log/user-data.log

# Run a model
ollama run llama3.2:3b

# API call
curl http://localhost:11434/api/generate -d '{
  "model": "llama3.2:3b",
  "prompt": "Hello!"
}'
```

### Using vLLM (OpenAI-compatible API)

```bash
# From your local machine
curl http://<ip>:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-3.2-3B-Instruct",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Framework Comparison

| Framework | Best For | API Style | Multi-GPU |
|-----------|----------|-----------|-----------|
| **Ollama** | Quick testing, easy setup | Custom | Limited |
| **vLLM** | Production, high throughput | OpenAI-compatible | ✅ |
| **TGI** | HuggingFace models | OpenAI-compatible | ✅ |
| **llama.cpp** | CPU/low-VRAM, GGUF models | Custom | ❌ |

## Cost Management

### Spot Instance Tips

1. **Use spot for testing** - Save 60-90% vs on-demand
2. **Set max price** - Limit with `--max-price 0.50`
3. **Terminate when done** - Spot instances bill per second
4. **Check pricing** - Use `list-prices` before launching

### Example Cost Comparison

| Instance | On-Demand | Spot | Savings |
|----------|-----------|------|---------|
| g5.xlarge (1hr) | $1.01 | $0.30 | 70% |
| g5.xlarge (8hr) | $8.05 | $2.40 | 70% |
| g5.12xlarge (1hr) | $5.67 | $1.70 | 70% |

## Troubleshooting

### Instance Won't Launch

```bash
# Check your AWS credentials
aws sts get-caller-identity

# Check spot capacity in region
python aws_spot_llm.py list-prices --region us-west-2
```

### Setup Not Complete

```bash
# SSH in and check logs
sudo tail -f /var/log/user-data.log

# Check if setup finished
cat /opt/llm/setup_status
```

### GPU Not Detected

```bash
# Check NVIDIA driver
nvidia-smi

# Reinstall if needed
sudo apt install nvidia-driver-535
```

### Model Won't Load (OOM)

Try a smaller model or larger instance:
```bash
# Use quantized model
ollama run llama3.1:8b-q4_0

# Or larger instance
python aws_spot_llm.py launch -i g5.2xlarge -m llama3.1:8b
```

## Security Notes

- Security group opens ports: 22 (SSH), 8000, 8080, 11434
- Consider restricting IPs in production
- SSH key saved to `~/.ssh/llm-testing-key.pem`
- Instances tagged for easy identification

## Model Size Guide

| Model Size | Min VRAM | Recommended Instance |
|------------|----------|---------------------|
| 1-3B | 8GB | g4dn.xlarge, g5.xlarge |
| 7-8B | 16GB | g5.xlarge, g5.2xlarge |
| 13B | 24GB | g5.2xlarge |
| 34B | 48GB | g5.12xlarge (multi-GPU) |
| 70B | 80GB+ | g5.12xlarge, g5.48xlarge |
| 70B (Q4) | 40GB | g5.12xlarge |

## License

MIT
