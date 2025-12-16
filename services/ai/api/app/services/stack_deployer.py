"""
Stack Deployment Service
Deploys complete automation stacks to Docker or AWS
"""
import yaml
import json
from typing import Dict, Any, List
from datetime import datetime
from uuid import uuid4

from ..models.stacks import (
    StackTemplate,
    StackComponent,
    StackDeploymentResponse,
    DeployedComponent,
    ComponentStatus,
    StackStatus,
    DeploymentTarget,
)
from .portainer_service import PortainerService, DockerLLMDeployer


class StackDeployer:
    """Deploys automation stacks to various targets"""

    def __init__(self, portainer_service: PortainerService = None):
        self.portainer = portainer_service

    def generate_docker_compose(
        self,
        stack: StackTemplate,
        config_overrides: Dict[str, Any] = None
    ) -> str:
        """
        Generate docker-compose.yml for a stack
        """
        config_overrides = config_overrides or {}

        compose = {
            "version": "3.8",
            "services": {},
            "volumes": {},
            "networks": {
                f"{stack.id}-network": {"driver": "bridge"}
            }
        }

        # Generate service definitions
        for component in stack.components:
            service = {
                "image": f"{component.image}:{component.tag}",
                "container_name": f"{stack.id}-{component.name}",
                "restart": "unless-stopped",
                "networks": [f"{stack.id}-network"],
            }

            # Ports
            if component.ports:
                service["ports"] = [
                    f"{p['host']}:{p['container']}" for p in component.ports
                ]

            # Environment variables (with overrides)
            if component.environment:
                env = component.environment.copy()

                # Apply config overrides
                for opt in stack.configurable_options:
                    opt_id = opt['id']
                    if opt_id in config_overrides:
                        env_var = opt.get('env_var')
                        if env_var:
                            env[env_var] = str(config_overrides[opt_id])

                service["environment"] = env

            # Volumes
            if component.volumes:
                service["volumes"] = component.volumes

                # Add volumes to top-level volumes section
                for vol in component.volumes:
                    vol_name = vol.split(":")[0]
                    if "/" not in vol_name:  # Named volume
                        compose["volumes"][vol_name] = None

            # Command
            if component.command:
                service["command"] = component.command

            # Dependencies
            if component.depends_on:
                service["depends_on"] = component.depends_on

            # GPU support
            if component.gpu_required:
                service["deploy"] = {
                    "resources": {
                        "reservations": {
                            "devices": [
                                {
                                    "driver": "nvidia",
                                    "count": "all",
                                    "capabilities": ["gpu"]
                                }
                            ]
                        }
                    }
                }

            # Resource limits
            if component.cpu_limit or component.memory_limit:
                if "deploy" not in service:
                    service["deploy"] = {"resources": {}}
                if "limits" not in service["deploy"]["resources"]:
                    service["deploy"]["resources"]["limits"] = {}

                if component.cpu_limit:
                    service["deploy"]["resources"]["limits"]["cpus"] = str(component.cpu_limit)
                if component.memory_limit:
                    service["deploy"]["resources"]["limits"]["memory"] = component.memory_limit

            compose["services"][component.name] = service

        return yaml.dump(compose, default_flow_style=False, sort_keys=False)

    async def deploy_to_docker(
        self,
        stack: StackTemplate,
        endpoint_id: int,
        deployment_name: str,
        config_overrides: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Deploy stack to Docker via Portainer
        Creates all containers based on stack definition
        """
        if not self.portainer:
            raise ValueError("Portainer service not configured")

        deployed_components = []
        deployment_id = str(uuid4())

        # Generate unique network name
        network_name = f"{stack.id}-{deployment_id[:8]}"

        # Create Docker network
        if stack.auto_setup.create_network:
            try:
                # Create network via Portainer
                # await self.portainer.create_network(endpoint_id, network_name)
                pass
            except Exception as e:
                print(f"Failed to create network: {e}")

        # Deploy each component
        for component in stack.components:
            try:
                # Build container config
                container_config = {
                    "Image": f"{component.image}:{component.tag}",
                    "name": f"{deployment_name}-{component.name}",
                    "Env": [
                        f"{k}={v}" for k, v in component.environment.items()
                    ],
                    "ExposedPorts": {
                        f"{p['container']}/tcp": {} for p in component.ports
                    },
                    "HostConfig": {
                        "PortBindings": {
                            f"{p['container']}/tcp": [{"HostPort": str(p['host'])}]
                            for p in component.ports
                        },
                        "RestartPolicy": {"Name": "unless-stopped"},
                        "NetworkMode": network_name,
                    },
                    "Labels": {
                        "stack_id": stack.id,
                        "stack_deployment_id": deployment_id,
                        "component_name": component.name,
                        "managed_by": "ump-ai-compute",
                    },
                }

                # Add GPU support
                if component.gpu_required:
                    container_config["HostConfig"]["DeviceRequests"] = [
                        {
                            "Driver": "nvidia",
                            "Count": -1,
                            "Capabilities": [["gpu"]],
                        }
                    ]

                # Create container
                result = await self.portainer.create_container(
                    endpoint_id, container_config
                )
                container_id = result["Id"]

                # Start container
                await self.portainer.start_container(endpoint_id, container_id)

                deployed_components.append({
                    "name": component.name,
                    "container_id": container_id,
                    "status": "starting",
                    "port_mappings": {p["host"]: p["container"] for p in component.ports},
                })

            except Exception as e:
                deployed_components.append({
                    "name": component.name,
                    "status": "error",
                    "error_message": str(e),
                })

        return {
            "deployment_id": deployment_id,
            "stack_id": stack.id,
            "name": deployment_name,
            "components": deployed_components,
            "deployed_at": datetime.now().isoformat(),
        }

    def generate_aws_user_data(
        self,
        stack: StackTemplate,
        config_overrides: Dict[str, Any] = None
    ) -> str:
        """
        Generate AWS user-data script to deploy stack on EC2
        Installs Docker Compose and runs the stack
        """
        docker_compose = self.generate_docker_compose(stack, config_overrides)

        user_data = f'''#!/bin/bash
set -e

# Log everything
exec > >(tee /var/log/stack-deployment.log) 2>&1
echo "=== Starting {stack.name} deployment at $(date) ==="

# Install Docker if needed
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Install NVIDIA Docker (if GPU required)
{self._generate_gpu_setup_script() if stack.resources.requires_gpu else "# No GPU required"}

# Create deployment directory
mkdir -p /opt/automation-stack
cd /opt/automation-stack

# Write docker-compose.yml
cat > docker-compose.yml << 'COMPOSE_EOF'
{docker_compose}
COMPOSE_EOF

# Pull images
docker-compose pull

# Start stack
docker-compose up -d

# Wait for services to be healthy
sleep 30

# Run post-deploy commands
{self._generate_post_deploy_script(stack.auto_setup.post_deploy_commands)}

echo "=== {stack.name} deployment complete at $(date) ==="
echo "Stack is ready!"
'''

        return user_data

    def _generate_gpu_setup_script(self) -> str:
        """Generate GPU setup portion of user-data"""
        return '''
# Install NVIDIA Docker runtime
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \\
    sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \\
    tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
apt-get update
apt-get install -y nvidia-container-toolkit
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker
'''

    def _generate_post_deploy_script(self, commands: List[str]) -> str:
        """Generate post-deployment commands"""
        if not commands:
            return "# No post-deploy commands"

        script_lines = []
        for cmd in commands:
            script_lines.append(f"echo 'Running: {cmd}'")
            script_lines.append(cmd)
            script_lines.append("sleep 2")

        return "\n".join(script_lines)


# =============================================================================
# Stack Registry
# =============================================================================

class StackRegistry:
    """Manages stack templates and deployments"""

    _deployed_stacks: Dict[str, Dict] = {}  # In-memory for now, TODO: PostgreSQL

    @classmethod
    def get_template(cls, stack_id: str) -> StackTemplate:
        """Get stack template by ID"""
        from .stack_templates import get_stack_template
        return get_stack_template(stack_id)

    @classmethod
    def list_templates(cls, category: str = None) -> List[StackTemplate]:
        """List all stack templates"""
        from .stack_templates import list_stack_templates
        return list_stack_templates(category)

    @classmethod
    def register_deployment(cls, deployment_id: str, deployment_data: Dict):
        """Register a deployed stack"""
        cls._deployed_stacks[deployment_id] = deployment_data

    @classmethod
    def get_deployment(cls, deployment_id: str) -> Dict:
        """Get deployed stack info"""
        return cls._deployed_stacks.get(deployment_id)

    @classmethod
    def list_deployments(cls) -> List[Dict]:
        """List all deployed stacks"""
        return list(cls._deployed_stacks.values())
