#!/usr/bin/env python3
"""
AWS Spot Instance Launcher for LLM Testing

Automatically creates and launches GPU spot instances optimized for LLM inference/testing.
Supports multiple instance types, automatic setup, and cost optimization.

Usage:
    python aws_spot_llm.py launch --instance-type g5.xlarge --model llama3.2
    python aws_spot_llm.py launch --instance-type g5.2xlarge --framework vllm --model meta-llama/Llama-3.2-3B
    python aws_spot_llm.py list-prices
    python aws_spot_llm.py status
    python aws_spot_llm.py terminate <instance-id>
    python aws_spot_llm.py ssh <instance-id>

Requirements:
    pip install boto3 rich typer
    
AWS Credentials:
    Configure via: aws configure
    Or set environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
"""

import os
import sys
import json
import time
import base64
import subprocess
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field, asdict
from enum import Enum

try:
    import boto3
    from botocore.exceptions import ClientError
except ImportError:
    print("Please install boto3: pip install boto3")
    sys.exit(1)

try:
    import typer
    from rich.console import Console
    from rich.table import Table
    from rich.progress import Progress, SpinnerColumn, TextColumn
    from rich.panel import Panel
    from rich import print as rprint
except ImportError:
    print("Please install required packages: pip install typer rich")
    sys.exit(1)


# =============================================================================
# Configuration
# =============================================================================

class Framework(str, Enum):
    """Supported LLM frameworks"""
    OLLAMA = "ollama"
    VLLM = "vllm"
    TGI = "tgi"  # Text Generation Inference
    LLAMA_CPP = "llama-cpp"
    CUSTOM = "custom"


class InstanceFamily(str, Enum):
    """GPU instance families"""
    G4DN = "g4dn"   # NVIDIA T4 - Budget option
    G5 = "g5"       # NVIDIA A10G - Best price/performance
    G6 = "g6"       # NVIDIA L4 - Newer, efficient
    P3 = "p3"       # NVIDIA V100 - Older but capable
    P4D = "p4d"     # NVIDIA A100 - High end
    P5 = "p5"       # NVIDIA H100 - Top tier


@dataclass
class InstanceConfig:
    """GPU Instance configuration"""
    instance_type: str
    gpu_count: int
    gpu_memory_gb: int
    gpu_model: str
    vcpus: int
    memory_gb: int
    storage_gb: int
    network_gbps: int
    on_demand_price: float  # USD/hour (approximate)
    spot_price_estimate: float  # USD/hour (approximate)
    recommended_models: List[str] = field(default_factory=list)


# Instance configurations (prices are approximate, actual spot prices vary)
INSTANCE_CONFIGS: Dict[str, InstanceConfig] = {
    # G4DN - NVIDIA T4 (16GB) - Budget friendly
    "g4dn.xlarge": InstanceConfig(
        instance_type="g4dn.xlarge",
        gpu_count=1, gpu_memory_gb=16, gpu_model="T4",
        vcpus=4, memory_gb=16, storage_gb=125, network_gbps=25,
        on_demand_price=0.526, spot_price_estimate=0.16,
        recommended_models=["llama3.2:1b", "llama3.2:3b", "phi3", "gemma2:2b", "qwen2.5:3b"]
    ),
    "g4dn.2xlarge": InstanceConfig(
        instance_type="g4dn.2xlarge",
        gpu_count=1, gpu_memory_gb=16, gpu_model="T4",
        vcpus=8, memory_gb=32, storage_gb=225, network_gbps=25,
        on_demand_price=0.752, spot_price_estimate=0.23,
        recommended_models=["llama3.2:3b", "mistral:7b", "gemma2:9b", "qwen2.5:7b"]
    ),
    "g4dn.12xlarge": InstanceConfig(
        instance_type="g4dn.12xlarge",
        gpu_count=4, gpu_memory_gb=64, gpu_model="T4",
        vcpus=48, memory_gb=192, storage_gb=900, network_gbps=50,
        on_demand_price=3.912, spot_price_estimate=1.17,
        recommended_models=["llama3.1:70b-q4", "mixtral:8x7b", "command-r"]
    ),
    
    # G5 - NVIDIA A10G (24GB) - Best price/performance for LLMs
    "g5.xlarge": InstanceConfig(
        instance_type="g5.xlarge",
        gpu_count=1, gpu_memory_gb=24, gpu_model="A10G",
        vcpus=4, memory_gb=16, storage_gb=250, network_gbps=10,
        on_demand_price=1.006, spot_price_estimate=0.30,
        recommended_models=["llama3.2:3b", "llama3.1:8b", "mistral:7b", "gemma2:9b", "qwen2.5:7b"]
    ),
    "g5.2xlarge": InstanceConfig(
        instance_type="g5.2xlarge",
        gpu_count=1, gpu_memory_gb=24, gpu_model="A10G",
        vcpus=8, memory_gb=32, storage_gb=450, network_gbps=10,
        on_demand_price=1.212, spot_price_estimate=0.36,
        recommended_models=["llama3.1:8b", "mistral:7b", "codellama:13b", "gemma2:27b-q4"]
    ),
    "g5.4xlarge": InstanceConfig(
        instance_type="g5.4xlarge",
        gpu_count=1, gpu_memory_gb=24, gpu_model="A10G",
        vcpus=16, memory_gb=64, storage_gb=600, network_gbps=25,
        on_demand_price=1.624, spot_price_estimate=0.49,
        recommended_models=["llama3.1:8b", "codellama:34b-q4", "mixtral:8x7b-q4"]
    ),
    "g5.12xlarge": InstanceConfig(
        instance_type="g5.12xlarge",
        gpu_count=4, gpu_memory_gb=96, gpu_model="A10G",
        vcpus=48, memory_gb=192, storage_gb=3800, network_gbps=40,
        on_demand_price=5.672, spot_price_estimate=1.70,
        recommended_models=["llama3.1:70b", "mixtral:8x7b", "command-r:35b", "codellama:70b"]
    ),
    "g5.48xlarge": InstanceConfig(
        instance_type="g5.48xlarge",
        gpu_count=8, gpu_memory_gb=192, gpu_model="A10G",
        vcpus=192, memory_gb=768, storage_gb=7600, network_gbps=100,
        on_demand_price=16.288, spot_price_estimate=4.90,
        recommended_models=["llama3.1:70b", "llama3.1:405b-q4", "mixtral:8x22b"]
    ),
    
    # G6 - NVIDIA L4 (24GB) - Newer, efficient
    "g6.xlarge": InstanceConfig(
        instance_type="g6.xlarge",
        gpu_count=1, gpu_memory_gb=24, gpu_model="L4",
        vcpus=4, memory_gb=16, storage_gb=250, network_gbps=10,
        on_demand_price=0.805, spot_price_estimate=0.24,
        recommended_models=["llama3.2:3b", "llama3.1:8b", "mistral:7b", "gemma2:9b"]
    ),
    "g6.2xlarge": InstanceConfig(
        instance_type="g6.2xlarge",
        gpu_count=1, gpu_memory_gb=24, gpu_model="L4",
        vcpus=8, memory_gb=32, storage_gb=450, network_gbps=10,
        on_demand_price=0.978, spot_price_estimate=0.29,
        recommended_models=["llama3.1:8b", "mistral:7b", "codellama:13b"]
    ),
    
    # P3 - NVIDIA V100 (16GB) - Older but good for training
    "p3.2xlarge": InstanceConfig(
        instance_type="p3.2xlarge",
        gpu_count=1, gpu_memory_gb=16, gpu_model="V100",
        vcpus=8, memory_gb=61, storage_gb=0, network_gbps=10,
        on_demand_price=3.06, spot_price_estimate=0.92,
        recommended_models=["llama3.1:8b-q4", "mistral:7b", "codellama:7b"]
    ),
    "p3.8xlarge": InstanceConfig(
        instance_type="p3.8xlarge",
        gpu_count=4, gpu_memory_gb=64, gpu_model="V100",
        vcpus=32, memory_gb=244, storage_gb=0, network_gbps=10,
        on_demand_price=12.24, spot_price_estimate=3.67,
        recommended_models=["llama3.1:70b-q4", "mixtral:8x7b"]
    ),
    
    # P4D - NVIDIA A100 (40GB) - High performance
    "p4d.24xlarge": InstanceConfig(
        instance_type="p4d.24xlarge",
        gpu_count=8, gpu_memory_gb=320, gpu_model="A100",
        vcpus=96, memory_gb=1152, storage_gb=8000, network_gbps=400,
        on_demand_price=32.77, spot_price_estimate=9.83,
        recommended_models=["llama3.1:70b", "llama3.1:405b", "mixtral:8x22b"]
    ),
}


# =============================================================================
# User Data Scripts (cloud-init)
# =============================================================================

def get_user_data_script(
    framework: Framework,
    model: Optional[str] = None,
    hf_token: Optional[str] = None,
    additional_setup: str = ""
) -> str:
    """Generate cloud-init user data script for instance setup"""
    
    base_script = '''#!/bin/bash
set -e

# Log everything
exec > >(tee /var/log/user-data.log) 2>&1
echo "=== Starting LLM instance setup at $(date) ==="

# Update system
apt-get update -y
apt-get install -y curl wget git htop nvtop tmux jq unzip

# Install NVIDIA drivers if not present (Deep Learning AMI should have them)
if ! command -v nvidia-smi &> /dev/null; then
    echo "Installing NVIDIA drivers..."
    apt-get install -y nvidia-driver-535 nvidia-utils-535
fi

# Verify GPU
echo "=== GPU Status ==="
nvidia-smi

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Install NVIDIA Container Toolkit
if ! dpkg -l | grep -q nvidia-container-toolkit; then
    echo "Installing NVIDIA Container Toolkit..."
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
    curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
        sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
        tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
    apt-get update -y
    apt-get install -y nvidia-container-toolkit
    nvidia-ctk runtime configure --runtime=docker
    systemctl restart docker
fi

# Create working directory
mkdir -p /opt/llm
cd /opt/llm

# Set HuggingFace token if provided
{hf_token_setup}

'''

    hf_token_setup = ""
    if hf_token:
        hf_token_setup = f'''
export HF_TOKEN="{hf_token}"
echo 'export HF_TOKEN="{hf_token}"' >> /etc/environment
mkdir -p /root/.cache/huggingface
echo '{hf_token}' > /root/.cache/huggingface/token
'''

    # Framework-specific setup
    framework_scripts = {
        Framework.OLLAMA: '''
# Install Ollama
echo "=== Installing Ollama ==="
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service
systemctl enable ollama
systemctl start ollama

# Wait for Ollama to be ready
sleep 5

# Pull model if specified
{model_pull}

# Create helpful aliases
cat >> /etc/profile.d/llm-aliases.sh << 'EOF'
alias ollama-models='ollama list'
alias ollama-run='ollama run'
alias ollama-pull='ollama pull'
alias gpu-status='nvidia-smi'
alias gpu-watch='watch -n 1 nvidia-smi'
EOF

echo "=== Ollama setup complete ==="
echo "Access Ollama at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):11434"
''',
        
        Framework.VLLM: '''
# Install vLLM
echo "=== Installing vLLM ==="

# Install Python and pip
apt-get install -y python3-pip python3-venv

# Create virtual environment
python3 -m venv /opt/llm/venv
source /opt/llm/venv/bin/activate

# Install vLLM
pip install vllm

# Create systemd service for vLLM
cat > /etc/systemd/system/vllm.service << EOF
[Unit]
Description=vLLM Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/llm
Environment="PATH=/opt/llm/venv/bin:/usr/local/bin:/usr/bin:/bin"
{hf_env}
ExecStart=/opt/llm/venv/bin/python -m vllm.entrypoints.openai.api_server \\
    --model {model} \\
    --host 0.0.0.0 \\
    --port 8000 \\
    --trust-remote-code
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable vllm
systemctl start vllm

echo "=== vLLM setup complete ==="
echo "Access vLLM API at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8000"
''',
        
        Framework.TGI: '''
# Install Text Generation Inference
echo "=== Installing TGI ==="

# Run TGI in Docker
docker run -d --gpus all \\
    --name tgi \\
    -p 8080:80 \\
    -v /opt/llm/models:/data \\
    {hf_env_docker} \\
    ghcr.io/huggingface/text-generation-inference:latest \\
    --model-id {model} \\
    --max-input-length 4096 \\
    --max-total-tokens 8192

echo "=== TGI setup complete ==="
echo "Access TGI API at: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8080"
''',
        
        Framework.LLAMA_CPP: '''
# Install llama.cpp
echo "=== Installing llama.cpp ==="

apt-get install -y build-essential cmake

cd /opt/llm
git clone https://github.com/ggerganov/llama.cpp.git
cd llama.cpp

# Build with CUDA support
mkdir build && cd build
cmake .. -DGGML_CUDA=ON
cmake --build . --config Release -j$(nproc)

# Install Python bindings
pip install llama-cpp-python --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cu121

echo "=== llama.cpp setup complete ==="
''',
        
        Framework.CUSTOM: '''
# Custom setup - minimal installation
echo "=== Custom setup ==="

# Install Python and common ML libraries
apt-get install -y python3-pip python3-venv
pip install torch transformers accelerate bitsandbytes sentencepiece

echo "=== Custom setup complete ==="
'''
    }
    
    # Get framework script
    framework_script = framework_scripts.get(framework, framework_scripts[Framework.CUSTOM])
    
    # Handle model pulling for Ollama
    model_pull = ""
    if model and framework == Framework.OLLAMA:
        model_pull = f'ollama pull {model}'
    
    # Handle HuggingFace environment for vLLM/TGI
    hf_env = f'Environment="HF_TOKEN={hf_token}"' if hf_token else ""
    hf_env_docker = f'-e HF_TOKEN={hf_token}' if hf_token else ""
    
    # Format the script
    framework_script = framework_script.format(
        model=model or "meta-llama/Llama-3.2-3B-Instruct",
        model_pull=model_pull,
        hf_env=hf_env,
        hf_env_docker=hf_env_docker
    )
    
    # Combine scripts
    full_script = base_script.format(hf_token_setup=hf_token_setup) + framework_script + additional_setup
    
    # Add completion marker
    full_script += '''
# Mark setup as complete
echo "SETUP_COMPLETE" > /opt/llm/setup_status
echo "=== LLM instance setup complete at $(date) ==="

# Display connection info
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo ""
echo "=========================================="
echo "Instance is ready!"
echo "SSH: ssh -i your-key.pem ubuntu@$PUBLIC_IP"
echo "=========================================="
'''
    
    return full_script


# =============================================================================
# AWS Operations
# =============================================================================

class AWSSpotLauncher:
    """AWS Spot Instance launcher for LLM testing"""
    
    def __init__(self, region: Optional[str] = None):
        self.region = region or os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')
        self.ec2 = boto3.client('ec2', region_name=self.region)
        self.ec2_resource = boto3.resource('ec2', region_name=self.region)
        self.console = Console()
        
        # Default tags for all resources
        self.default_tags = [
            {'Key': 'Project', 'Value': 'LLM-Testing'},
            {'Key': 'ManagedBy', 'Value': 'aws-spot-llm-script'},
            {'Key': 'CreatedAt', 'Value': datetime.now().isoformat()},
        ]
    
    def get_latest_deep_learning_ami(self, gpu: bool = True) -> str:
        """Get the latest Deep Learning AMI ID"""
        
        # Search for Deep Learning AMI
        if gpu:
            ami_name_pattern = "Deep Learning AMI GPU PyTorch * (Ubuntu 22.04) *"
        else:
            ami_name_pattern = "Deep Learning AMI (Ubuntu 22.04) *"
        
        try:
            response = self.ec2.describe_images(
                Owners=['amazon'],
                Filters=[
                    {'Name': 'name', 'Values': [ami_name_pattern]},
                    {'Name': 'state', 'Values': ['available']},
                    {'Name': 'architecture', 'Values': ['x86_64']},
                ],
            )
            
            # Sort by creation date and get the latest
            images = sorted(
                response['Images'],
                key=lambda x: x['CreationDate'],
                reverse=True
            )
            
            if images:
                return images[0]['ImageId']
            
        except ClientError as e:
            self.console.print(f"[yellow]Warning: Could not find Deep Learning AMI: {e}[/yellow]")
        
        # Fallback to Ubuntu 22.04 LTS
        self.console.print("[yellow]Falling back to Ubuntu 22.04 LTS AMI[/yellow]")
        response = self.ec2.describe_images(
            Owners=['099720109477'],  # Canonical
            Filters=[
                {'Name': 'name', 'Values': ['ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*']},
                {'Name': 'state', 'Values': ['available']},
            ],
        )
        
        images = sorted(response['Images'], key=lambda x: x['CreationDate'], reverse=True)
        if images:
            return images[0]['ImageId']
        
        raise Exception("Could not find suitable AMI")
    
    def get_or_create_security_group(self, name: str = "llm-testing-sg") -> str:
        """Get or create security group for LLM testing"""
        
        try:
            # Check if security group exists
            response = self.ec2.describe_security_groups(
                Filters=[{'Name': 'group-name', 'Values': [name]}]
            )
            
            if response['SecurityGroups']:
                return response['SecurityGroups'][0]['GroupId']
            
        except ClientError:
            pass
        
        # Create new security group
        self.console.print(f"[cyan]Creating security group: {name}[/cyan]")
        
        # Get default VPC
        vpcs = self.ec2.describe_vpcs(Filters=[{'Name': 'is-default', 'Values': ['true']}])
        vpc_id = vpcs['Vpcs'][0]['VpcId'] if vpcs['Vpcs'] else None
        
        response = self.ec2.create_security_group(
            GroupName=name,
            Description="Security group for LLM testing instances",
            VpcId=vpc_id,
            TagSpecifications=[{
                'ResourceType': 'security-group',
                'Tags': self.default_tags + [{'Key': 'Name', 'Value': name}]
            }]
        )
        
        sg_id = response['GroupId']
        
        # Add ingress rules
        self.ec2.authorize_security_group_ingress(
            GroupId=sg_id,
            IpPermissions=[
                # SSH
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 22,
                    'ToPort': 22,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': 'SSH access'}]
                },
                # Ollama API
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 11434,
                    'ToPort': 11434,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': 'Ollama API'}]
                },
                # vLLM / Generic API
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 8000,
                    'ToPort': 8000,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': 'vLLM API'}]
                },
                # TGI
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 8080,
                    'ToPort': 8080,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': 'TGI API'}]
                },
                # Jupyter
                {
                    'IpProtocol': 'tcp',
                    'FromPort': 8888,
                    'ToPort': 8888,
                    'IpRanges': [{'CidrIp': '0.0.0.0/0', 'Description': 'Jupyter'}]
                },
            ]
        )
        
        return sg_id
    
    def get_or_create_key_pair(self, name: str = "llm-testing-key") -> tuple[str, Optional[str]]:
        """Get or create SSH key pair"""
        
        key_file = Path.home() / ".ssh" / f"{name}.pem"
        
        try:
            # Check if key pair exists
            self.ec2.describe_key_pairs(KeyNames=[name])
            
            if key_file.exists():
                return name, str(key_file)
            else:
                self.console.print(f"[yellow]Key pair '{name}' exists but local file not found at {key_file}[/yellow]")
                return name, None
                
        except ClientError:
            pass
        
        # Create new key pair
        self.console.print(f"[cyan]Creating key pair: {name}[/cyan]")
        
        response = self.ec2.create_key_pair(
            KeyName=name,
            TagSpecifications=[{
                'ResourceType': 'key-pair',
                'Tags': self.default_tags + [{'Key': 'Name', 'Value': name}]
            }]
        )
        
        # Save private key
        key_file.parent.mkdir(parents=True, exist_ok=True)
        key_file.write_text(response['KeyMaterial'])
        key_file.chmod(0o400)
        
        self.console.print(f"[green]Private key saved to: {key_file}[/green]")
        
        return name, str(key_file)
    
    def get_spot_price(self, instance_type: str) -> Optional[float]:
        """Get current spot price for instance type"""
        
        try:
            response = self.ec2.describe_spot_price_history(
                InstanceTypes=[instance_type],
                ProductDescriptions=['Linux/UNIX'],
                MaxResults=1,
            )
            
            if response['SpotPriceHistory']:
                return float(response['SpotPriceHistory'][0]['SpotPrice'])
                
        except ClientError:
            pass
        
        return None
    
    def launch_spot_instance(
        self,
        instance_type: str,
        framework: Framework = Framework.OLLAMA,
        model: Optional[str] = None,
        hf_token: Optional[str] = None,
        max_price: Optional[float] = None,
        key_name: Optional[str] = None,
        name: str = "llm-test",
        volume_size_gb: int = 100,
        spot_type: str = "one-time",  # one-time or persistent
    ) -> dict:
        """Launch a spot instance for LLM testing"""
        
        # Validate instance type
        if instance_type not in INSTANCE_CONFIGS:
            available = ", ".join(INSTANCE_CONFIGS.keys())
            raise ValueError(f"Unknown instance type: {instance_type}. Available: {available}")
        
        config = INSTANCE_CONFIGS[instance_type]
        
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=self.console,
        ) as progress:
            
            # Get AMI
            task = progress.add_task("Finding Deep Learning AMI...", total=None)
            ami_id = self.get_latest_deep_learning_ami(gpu=True)
            progress.update(task, description=f"Found AMI: {ami_id}")
            
            # Get/create security group
            progress.update(task, description="Setting up security group...")
            sg_id = self.get_or_create_security_group()
            
            # Get/create key pair
            progress.update(task, description="Setting up SSH key pair...")
            if key_name:
                key_pair_name = key_name
                key_file = None
            else:
                key_pair_name, key_file = self.get_or_create_key_pair()
            
            # Get current spot price
            progress.update(task, description="Checking spot prices...")
            current_spot_price = self.get_spot_price(instance_type)
            
            # Set max price (default: 50% above current spot price, or on-demand price)
            if max_price is None:
                if current_spot_price:
                    max_price = min(current_spot_price * 1.5, config.on_demand_price)
                else:
                    max_price = config.on_demand_price * 0.7
            
            # Generate user data script
            progress.update(task, description="Generating setup script...")
            user_data = get_user_data_script(
                framework=framework,
                model=model,
                hf_token=hf_token,
            )
            
            # Prepare launch specification
            progress.update(task, description="Launching spot instance...")
            
            # Create spot instance request
            launch_spec = {
                'ImageId': ami_id,
                'InstanceType': instance_type,
                'KeyName': key_pair_name,
                'SecurityGroupIds': [sg_id],
                'UserData': base64.b64encode(user_data.encode()).decode(),
                'BlockDeviceMappings': [
                    {
                        'DeviceName': '/dev/sda1',
                        'Ebs': {
                            'VolumeSize': volume_size_gb,
                            'VolumeType': 'gp3',
                            'DeleteOnTermination': True,
                        }
                    }
                ],
                'TagSpecifications': [
                    {
                        'ResourceType': 'instance',
                        'Tags': self.default_tags + [
                            {'Key': 'Name', 'Value': name},
                            {'Key': 'Framework', 'Value': framework.value},
                            {'Key': 'Model', 'Value': model or 'none'},
                        ]
                    }
                ],
            }
            
            # Request spot instance
            response = self.ec2.run_instances(
                **launch_spec,
                MinCount=1,
                MaxCount=1,
                InstanceMarketOptions={
                    'MarketType': 'spot',
                    'SpotOptions': {
                        'MaxPrice': str(max_price),
                        'SpotInstanceType': spot_type,
                        'InstanceInterruptionBehavior': 'terminate',
                    }
                }
            )
            
            instance_id = response['Instances'][0]['InstanceId']
            progress.update(task, description=f"Instance launched: {instance_id}")
            
            # Wait for instance to be running
            progress.update(task, description="Waiting for instance to start...")
            waiter = self.ec2.get_waiter('instance_running')
            waiter.wait(InstanceIds=[instance_id])
            
            # Get instance details
            progress.update(task, description="Getting instance details...")
            instance = self.ec2_resource.Instance(instance_id)
            instance.reload()
            
            progress.update(task, description="✓ Instance ready!")
        
        result = {
            'instance_id': instance_id,
            'public_ip': instance.public_ip_address,
            'public_dns': instance.public_dns_name,
            'private_ip': instance.private_ip_address,
            'instance_type': instance_type,
            'framework': framework.value,
            'model': model,
            'ami_id': ami_id,
            'key_name': key_pair_name,
            'key_file': key_file,
            'spot_price': current_spot_price,
            'max_price': max_price,
            'gpu': config.gpu_model,
            'gpu_memory': f"{config.gpu_memory_gb}GB",
        }
        
        return result
    
    def list_instances(self) -> List[dict]:
        """List all LLM testing instances"""
        
        response = self.ec2.describe_instances(
            Filters=[
                {'Name': 'tag:ManagedBy', 'Values': ['aws-spot-llm-script']},
                {'Name': 'instance-state-name', 'Values': ['pending', 'running', 'stopping', 'stopped']},
            ]
        )
        
        instances = []
        for reservation in response['Reservations']:
            for instance in reservation['Instances']:
                tags = {t['Key']: t['Value'] for t in instance.get('Tags', [])}
                instances.append({
                    'instance_id': instance['InstanceId'],
                    'instance_type': instance['InstanceType'],
                    'state': instance['State']['Name'],
                    'public_ip': instance.get('PublicIpAddress', 'N/A'),
                    'launch_time': instance['LaunchTime'].isoformat(),
                    'name': tags.get('Name', 'N/A'),
                    'framework': tags.get('Framework', 'N/A'),
                    'model': tags.get('Model', 'N/A'),
                })
        
        return instances
    
    def get_instance_status(self, instance_id: str) -> dict:
        """Get detailed status of an instance"""
        
        instance = self.ec2_resource.Instance(instance_id)
        instance.reload()
        
        tags = {t['Key']: t['Value'] for t in instance.tags or []}
        
        return {
            'instance_id': instance_id,
            'state': instance.state['Name'],
            'instance_type': instance.instance_type,
            'public_ip': instance.public_ip_address,
            'public_dns': instance.public_dns_name,
            'private_ip': instance.private_ip_address,
            'launch_time': instance.launch_time.isoformat() if instance.launch_time else None,
            'name': tags.get('Name', 'N/A'),
            'framework': tags.get('Framework', 'N/A'),
            'model': tags.get('Model', 'N/A'),
        }
    
    def terminate_instance(self, instance_id: str) -> bool:
        """Terminate an instance"""
        
        try:
            self.ec2.terminate_instances(InstanceIds=[instance_id])
            return True
        except ClientError as e:
            self.console.print(f"[red]Error terminating instance: {e}[/red]")
            return False
    
    def stop_instance(self, instance_id: str) -> bool:
        """Stop an instance (only works for non-spot or persistent spot)"""
        
        try:
            self.ec2.stop_instances(InstanceIds=[instance_id])
            return True
        except ClientError as e:
            self.console.print(f"[red]Error stopping instance: {e}[/red]")
            return False
    
    def start_instance(self, instance_id: str) -> bool:
        """Start a stopped instance"""
        
        try:
            self.ec2.start_instances(InstanceIds=[instance_id])
            return True
        except ClientError as e:
            self.console.print(f"[red]Error starting instance: {e}[/red]")
            return False


# =============================================================================
# CLI Application
# =============================================================================

app = typer.Typer(
    name="aws-spot-llm",
    help="AWS Spot Instance Launcher for LLM Testing",
    add_completion=False,
)
console = Console()


@app.command()
def launch(
    instance_type: str = typer.Option(
        "g5.xlarge",
        "--instance-type", "-i",
        help="EC2 instance type (e.g., g5.xlarge, g5.2xlarge, g4dn.xlarge)"
    ),
    framework: Framework = typer.Option(
        Framework.OLLAMA,
        "--framework", "-f",
        help="LLM framework to install"
    ),
    model: Optional[str] = typer.Option(
        None,
        "--model", "-m",
        help="Model to pull/load (e.g., llama3.2:3b, meta-llama/Llama-3.2-3B)"
    ),
    hf_token: Optional[str] = typer.Option(
        None,
        "--hf-token",
        envvar="HF_TOKEN",
        help="HuggingFace token for gated models"
    ),
    max_price: Optional[float] = typer.Option(
        None,
        "--max-price",
        help="Maximum spot price (USD/hour)"
    ),
    name: str = typer.Option(
        "llm-test",
        "--name", "-n",
        help="Instance name tag"
    ),
    volume_size: int = typer.Option(
        100,
        "--volume-size",
        help="Root volume size in GB"
    ),
    region: Optional[str] = typer.Option(
        None,
        "--region", "-r",
        help="AWS region"
    ),
    key_name: Optional[str] = typer.Option(
        None,
        "--key-name", "-k",
        help="Existing SSH key pair name"
    ),
):
    """Launch a GPU spot instance for LLM testing"""
    
    launcher = AWSSpotLauncher(region=region)
    config = INSTANCE_CONFIGS.get(instance_type)
    
    if not config:
        console.print(f"[red]Unknown instance type: {instance_type}[/red]")
        console.print(f"Available types: {', '.join(INSTANCE_CONFIGS.keys())}")
        raise typer.Exit(1)
    
    # Show instance info
    console.print(Panel(
        f"[bold]Instance:[/bold] {instance_type}\n"
        f"[bold]GPU:[/bold] {config.gpu_count}x {config.gpu_model} ({config.gpu_memory_gb}GB)\n"
        f"[bold]vCPUs:[/bold] {config.vcpus}\n"
        f"[bold]Memory:[/bold] {config.memory_gb}GB\n"
        f"[bold]On-Demand Price:[/bold] ${config.on_demand_price:.3f}/hr\n"
        f"[bold]Est. Spot Price:[/bold] ${config.spot_price_estimate:.3f}/hr\n"
        f"[bold]Framework:[/bold] {framework.value}\n"
        f"[bold]Model:[/bold] {model or 'None (manual)'}\n",
        title="Launch Configuration",
        border_style="cyan"
    ))
    
    if not typer.confirm("Proceed with launch?"):
        raise typer.Exit(0)
    
    try:
        result = launcher.launch_spot_instance(
            instance_type=instance_type,
            framework=framework,
            model=model,
            hf_token=hf_token,
            max_price=max_price,
            key_name=key_name,
            name=name,
            volume_size_gb=volume_size,
        )
        
        # Display results
        console.print("\n")
        console.print(Panel(
            f"[bold green]Instance launched successfully![/bold green]\n\n"
            f"[bold]Instance ID:[/bold] {result['instance_id']}\n"
            f"[bold]Public IP:[/bold] {result['public_ip']}\n"
            f"[bold]Public DNS:[/bold] {result['public_dns']}\n"
            f"[bold]GPU:[/bold] {result['gpu']} ({result['gpu_memory']})\n"
            f"[bold]Spot Price:[/bold] ${result['spot_price']:.4f}/hr\n"
            f"[bold]Max Price:[/bold] ${result['max_price']:.4f}/hr\n",
            title="Instance Details",
            border_style="green"
        ))
        
        # SSH command
        key_opt = f"-i {result['key_file']}" if result['key_file'] else f"-i ~/.ssh/{result['key_name']}.pem"
        ssh_cmd = f"ssh {key_opt} ubuntu@{result['public_ip']}"
        
        console.print(Panel(
            f"[bold]SSH:[/bold]\n{ssh_cmd}\n\n"
            f"[bold]Ollama API:[/bold]\nhttp://{result['public_ip']}:11434\n\n"
            f"[bold]vLLM API:[/bold]\nhttp://{result['public_ip']}:8000\n\n"
            f"[bold]Setup logs:[/bold]\nsudo tail -f /var/log/user-data.log\n\n"
            f"[bold]Check GPU:[/bold]\nnvidia-smi",
            title="Connection Info",
            border_style="cyan"
        ))
        
    except Exception as e:
        console.print(f"[red]Error launching instance: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def list_instances(
    region: Optional[str] = typer.Option(None, "--region", "-r", help="AWS region"),
):
    """List all LLM testing instances"""
    
    launcher = AWSSpotLauncher(region=region)
    instances = launcher.list_instances()
    
    if not instances:
        console.print("[yellow]No LLM testing instances found[/yellow]")
        return
    
    table = Table(title="LLM Testing Instances")
    table.add_column("Instance ID", style="cyan")
    table.add_column("Name")
    table.add_column("Type")
    table.add_column("State")
    table.add_column("Public IP")
    table.add_column("Framework")
    table.add_column("Model")
    
    for inst in instances:
        state_style = "green" if inst['state'] == 'running' else "yellow"
        table.add_row(
            inst['instance_id'],
            inst['name'],
            inst['instance_type'],
            f"[{state_style}]{inst['state']}[/{state_style}]",
            inst['public_ip'],
            inst['framework'],
            inst['model'][:20] + "..." if len(inst['model']) > 20 else inst['model'],
        )
    
    console.print(table)


@app.command()
def status(
    instance_id: str = typer.Argument(..., help="Instance ID"),
    region: Optional[str] = typer.Option(None, "--region", "-r", help="AWS region"),
):
    """Get status of an instance"""
    
    launcher = AWSSpotLauncher(region=region)
    
    try:
        status = launcher.get_instance_status(instance_id)
        
        console.print(Panel(
            f"[bold]Instance ID:[/bold] {status['instance_id']}\n"
            f"[bold]State:[/bold] {status['state']}\n"
            f"[bold]Type:[/bold] {status['instance_type']}\n"
            f"[bold]Public IP:[/bold] {status['public_ip'] or 'N/A'}\n"
            f"[bold]Private IP:[/bold] {status['private_ip'] or 'N/A'}\n"
            f"[bold]Framework:[/bold] {status['framework']}\n"
            f"[bold]Model:[/bold] {status['model']}\n"
            f"[bold]Launch Time:[/bold] {status['launch_time']}",
            title=f"Instance Status: {status['name']}",
            border_style="cyan"
        ))
        
    except Exception as e:
        console.print(f"[red]Error getting status: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def terminate(
    instance_id: str = typer.Argument(..., help="Instance ID to terminate"),
    region: Optional[str] = typer.Option(None, "--region", "-r", help="AWS region"),
    force: bool = typer.Option(False, "--force", "-f", help="Skip confirmation"),
):
    """Terminate an instance"""
    
    launcher = AWSSpotLauncher(region=region)
    
    if not force:
        if not typer.confirm(f"Terminate instance {instance_id}?"):
            raise typer.Exit(0)
    
    if launcher.terminate_instance(instance_id):
        console.print(f"[green]Instance {instance_id} terminated[/green]")
    else:
        raise typer.Exit(1)


@app.command()
def ssh(
    instance_id: str = typer.Argument(..., help="Instance ID"),
    region: Optional[str] = typer.Option(None, "--region", "-r", help="AWS region"),
    key_file: Optional[str] = typer.Option(None, "--key", "-k", help="SSH key file path"),
):
    """SSH into an instance"""
    
    launcher = AWSSpotLauncher(region=region)
    
    try:
        status = launcher.get_instance_status(instance_id)
        
        if status['state'] != 'running':
            console.print(f"[yellow]Instance is not running (state: {status['state']})[/yellow]")
            raise typer.Exit(1)
        
        if not status['public_ip']:
            console.print("[red]Instance has no public IP[/red]")
            raise typer.Exit(1)
        
        # Determine key file
        if not key_file:
            key_file = str(Path.home() / ".ssh" / "llm-testing-key.pem")
        
        ssh_cmd = ["ssh", "-i", key_file, "-o", "StrictHostKeyChecking=no", f"ubuntu@{status['public_ip']}"]
        
        console.print(f"[cyan]Connecting to {status['public_ip']}...[/cyan]")
        subprocess.run(ssh_cmd)
        
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise typer.Exit(1)


@app.command()
def list_prices(
    region: Optional[str] = typer.Option(None, "--region", "-r", help="AWS region"),
):
    """List GPU instance types and prices"""
    
    launcher = AWSSpotLauncher(region=region)
    
    table = Table(title=f"GPU Instance Pricing ({launcher.region})")
    table.add_column("Instance Type", style="cyan")
    table.add_column("GPU")
    table.add_column("GPU Memory")
    table.add_column("vCPUs")
    table.add_column("Memory")
    table.add_column("On-Demand", justify="right")
    table.add_column("Spot Est.", justify="right")
    table.add_column("Spot Now", justify="right")
    table.add_column("Recommended Models")
    
    for instance_type, config in INSTANCE_CONFIGS.items():
        # Get current spot price
        current_spot = launcher.get_spot_price(instance_type)
        spot_str = f"${current_spot:.3f}" if current_spot else "N/A"
        
        models = ", ".join(config.recommended_models[:3])
        if len(config.recommended_models) > 3:
            models += "..."
        
        table.add_row(
            instance_type,
            f"{config.gpu_count}x {config.gpu_model}",
            f"{config.gpu_memory_gb}GB",
            str(config.vcpus),
            f"{config.memory_gb}GB",
            f"${config.on_demand_price:.3f}",
            f"${config.spot_price_estimate:.3f}",
            spot_str,
            models,
        )
    
    console.print(table)
    console.print("\n[dim]Spot prices vary by availability zone and time. Estimates are approximate.[/dim]")


@app.command()
def recommend(
    model: str = typer.Argument(..., help="Model name (e.g., llama3.1:70b, mistral:7b)"),
):
    """Recommend instance type for a model"""
    
    # Parse model size from name
    model_lower = model.lower()
    
    recommendations = []
    
    for instance_type, config in INSTANCE_CONFIGS.items():
        if model_lower in [m.lower() for m in config.recommended_models]:
            recommendations.append((instance_type, config, "direct"))
        elif any(model_lower.split(":")[0] in m.lower() for m in config.recommended_models):
            recommendations.append((instance_type, config, "family"))
    
    if not recommendations:
        # Try to infer from model name
        if "70b" in model_lower or "65b" in model_lower:
            console.print("[cyan]Large model detected (65-70B). Recommended instances:[/cyan]")
            for it in ["g5.12xlarge", "g5.48xlarge", "p4d.24xlarge"]:
                config = INSTANCE_CONFIGS[it]
                console.print(f"  • {it}: {config.gpu_count}x {config.gpu_model} ({config.gpu_memory_gb}GB) - ${config.spot_price_estimate:.2f}/hr spot")
        elif "13b" in model_lower or "8b" in model_lower:
            console.print("[cyan]Medium model detected (8-13B). Recommended instances:[/cyan]")
            for it in ["g5.xlarge", "g5.2xlarge", "g6.xlarge"]:
                config = INSTANCE_CONFIGS[it]
                console.print(f"  • {it}: {config.gpu_count}x {config.gpu_model} ({config.gpu_memory_gb}GB) - ${config.spot_price_estimate:.2f}/hr spot")
        else:
            console.print("[cyan]Small/unknown model. Recommended instances:[/cyan]")
            for it in ["g4dn.xlarge", "g5.xlarge", "g6.xlarge"]:
                config = INSTANCE_CONFIGS[it]
                console.print(f"  • {it}: {config.gpu_count}x {config.gpu_model} ({config.gpu_memory_gb}GB) - ${config.spot_price_estimate:.2f}/hr spot")
        return
    
    console.print(f"[green]Recommended instances for {model}:[/green]\n")
    
    for instance_type, config, match_type in recommendations:
        match_label = "✓ Direct match" if match_type == "direct" else "~ Family match"
        console.print(f"  [cyan]{instance_type}[/cyan] {match_label}")
        console.print(f"    GPU: {config.gpu_count}x {config.gpu_model} ({config.gpu_memory_gb}GB)")
        console.print(f"    Price: ~${config.spot_price_estimate:.2f}/hr (spot)")
        console.print()


if __name__ == "__main__":
    app()
