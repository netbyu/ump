"""Portainer integration service for deploying LLMs to Docker"""
import os
from typing import List, Dict, Optional, Any
import httpx
from datetime import datetime


class PortainerService:
    """Service for managing Docker containers via Portainer API"""

    def __init__(
        self,
        portainer_url: Optional[str] = None,
        api_token: Optional[str] = None,
    ):
        """Initialize Portainer service"""
        self.portainer_url = portainer_url or os.environ.get(
            "PORTAINER_URL", "http://localhost:9000"
        )
        self.api_token = api_token or os.environ.get("PORTAINER_API_TOKEN")

        if not self.api_token:
            raise ValueError(
                "Portainer API token required. Set PORTAINER_API_TOKEN environment variable."
            )

        self.headers = {
            "X-API-Key": self.api_token,
            "Content-Type": "application/json",
        }

    async def get_endpoints(self) -> List[Dict[str, Any]]:
        """Get list of Docker endpoints (hosts)"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.portainer_url}/api/endpoints", headers=self.headers
            )
            response.raise_for_status()
            return response.json()

    async def get_endpoint_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Get endpoint by name"""
        endpoints = await self.get_endpoints()
        for endpoint in endpoints:
            if endpoint.get("Name", "").lower() == name.lower():
                return endpoint
        return None

    async def list_containers(self, endpoint_id: int) -> List[Dict[str, Any]]:
        """List containers on an endpoint"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.portainer_url}/api/endpoints/{endpoint_id}/docker/containers/json?all=1",
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    async def get_container(
        self, endpoint_id: int, container_id: str
    ) -> Dict[str, Any]:
        """Get container details"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.portainer_url}/api/endpoints/{endpoint_id}/docker/containers/{container_id}/json",
                headers=self.headers,
            )
            response.raise_for_status()
            return response.json()

    async def create_container(
        self, endpoint_id: int, container_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a new container"""
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{self.portainer_url}/api/endpoints/{endpoint_id}/docker/containers/create",
                headers=self.headers,
                json=container_config,
            )
            response.raise_for_status()
            return response.json()

    async def start_container(self, endpoint_id: int, container_id: str) -> bool:
        """Start a container"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.portainer_url}/api/endpoints/{endpoint_id}/docker/containers/{container_id}/start",
                headers=self.headers,
            )
            return response.status_code == 204

    async def stop_container(self, endpoint_id: int, container_id: str) -> bool:
        """Stop a container"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.portainer_url}/api/endpoints/{endpoint_id}/docker/containers/{container_id}/stop",
                headers=self.headers,
            )
            return response.status_code == 204

    async def remove_container(self, endpoint_id: int, container_id: str) -> bool:
        """Remove a container"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.delete(
                f"{self.portainer_url}/api/endpoints/{endpoint_id}/docker/containers/{container_id}?force=true",
                headers=self.headers,
            )
            return response.status_code == 204

    async def get_container_logs(
        self, endpoint_id: int, container_id: str, tail: int = 100
    ) -> str:
        """Get container logs"""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.portainer_url}/api/endpoints/{endpoint_id}/docker/containers/{container_id}/logs?stdout=1&stderr=1&tail={tail}",
                headers=self.headers,
            )
            response.raise_for_status()
            return response.text


class DockerLLMDeployer:
    """Deploy LLM frameworks to Docker via Portainer"""

    def __init__(self, portainer_service: PortainerService):
        self.portainer = portainer_service

    def get_ollama_config(
        self,
        name: str,
        model: Optional[str] = None,
        gpu: bool = True,
        port: int = 11434,
        volumes: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Get Ollama container configuration"""
        config = {
            "Image": "ollama/ollama:latest",
            "name": name,
            "Env": [],
            "ExposedPorts": {f"{port}/tcp": {}},
            "HostConfig": {
                "PortBindings": {f"{port}/tcp": [{"HostPort": str(port)}]},
                "RestartPolicy": {"Name": "unless-stopped"},
                "Binds": volumes or ["ollama-data:/root/.ollama"],
            },
            "Labels": {
                "managed_by": "ump-ai-compute",
                "framework": "ollama",
                "model": model or "none",
                "created_at": datetime.now().isoformat(),
            },
        }

        # Add GPU support if requested
        if gpu:
            config["HostConfig"]["DeviceRequests"] = [
                {
                    "Driver": "nvidia",
                    "Count": -1,  # All GPUs
                    "Capabilities": [["gpu"]],
                }
            ]

        # Add model pull command if specified
        if model:
            config["Cmd"] = ["run", model]

        return config

    def get_vllm_config(
        self,
        name: str,
        model: str,
        gpu: bool = True,
        port: int = 8000,
        hf_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get vLLM container configuration"""
        env = []
        if hf_token:
            env.append(f"HF_TOKEN={hf_token}")

        config = {
            "Image": "vllm/vllm-openai:latest",
            "name": name,
            "Env": env,
            "Cmd": [
                "--model",
                model,
                "--host",
                "0.0.0.0",
                "--port",
                str(port),
                "--trust-remote-code",
            ],
            "ExposedPorts": {f"{port}/tcp": {}},
            "HostConfig": {
                "PortBindings": {f"{port}/tcp": [{"HostPort": str(port)}]},
                "RestartPolicy": {"Name": "unless-stopped"},
                "ShmSize": 2 * 1024 * 1024 * 1024,  # 2GB shared memory
            },
            "Labels": {
                "managed_by": "ump-ai-compute",
                "framework": "vllm",
                "model": model,
                "created_at": datetime.now().isoformat(),
            },
        }

        # Add GPU support
        if gpu:
            config["HostConfig"]["DeviceRequests"] = [
                {
                    "Driver": "nvidia",
                    "Count": -1,
                    "Capabilities": [["gpu"]],
                }
            ]

        return config

    def get_tgi_config(
        self,
        name: str,
        model: str,
        gpu: bool = True,
        port: int = 8080,
        hf_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get Text Generation Inference container configuration"""
        env = [f"MODEL_ID={model}"]
        if hf_token:
            env.append(f"HUGGING_FACE_HUB_TOKEN={hf_token}")

        config = {
            "Image": "ghcr.io/huggingface/text-generation-inference:latest",
            "name": name,
            "Env": env,
            "ExposedPorts": {"80/tcp": {}},
            "HostConfig": {
                "PortBindings": {"80/tcp": [{"HostPort": str(port)}]},
                "RestartPolicy": {"Name": "unless-stopped"},
                "ShmSize": 1 * 1024 * 1024 * 1024,  # 1GB shared memory
            },
            "Labels": {
                "managed_by": "ump-ai-compute",
                "framework": "tgi",
                "model": model,
                "created_at": datetime.now().isoformat(),
            },
        }

        # Add GPU support
        if gpu:
            config["HostConfig"]["DeviceRequests"] = [
                {
                    "Driver": "nvidia",
                    "Count": -1,
                    "Capabilities": [["gpu"]],
                }
            ]

        return config

    def get_llamacpp_config(
        self,
        name: str,
        model_url: Optional[str] = None,
        gpu: bool = False,
        port: int = 8080,
    ) -> Dict[str, Any]:
        """Get llama.cpp server container configuration"""
        cmd = ["--host", "0.0.0.0", "--port", str(port)]

        if model_url:
            cmd.extend(["--model", "/models/model.gguf"])

        config = {
            "Image": "ghcr.io/ggerganov/llama.cpp:server",
            "name": name,
            "Cmd": cmd,
            "ExposedPorts": {f"{port}/tcp": {}},
            "HostConfig": {
                "PortBindings": {f"{port}/tcp": [{"HostPort": str(port)}]},
                "RestartPolicy": {"Name": "unless-stopped"},
            },
            "Labels": {
                "managed_by": "ump-ai-compute",
                "framework": "llama-cpp",
                "model": model_url or "none",
                "created_at": datetime.now().isoformat(),
            },
        }

        # Add GPU support if requested
        if gpu:
            config["HostConfig"]["DeviceRequests"] = [
                {
                    "Driver": "nvidia",
                    "Count": -1,
                    "Capabilities": [["gpu"]],
                }
            ]

        return config

    async def deploy_llm(
        self,
        endpoint_id: int,
        framework: str,
        name: str,
        model: Optional[str] = None,
        port: Optional[int] = None,
        gpu: bool = True,
        hf_token: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Deploy an LLM framework to Docker"""

        # Get framework-specific configuration
        if framework == "ollama":
            container_config = self.get_ollama_config(
                name=name, model=model, gpu=gpu, port=port or 11434
            )
        elif framework == "vllm":
            if not model:
                raise ValueError("Model required for vLLM")
            container_config = self.get_vllm_config(
                name=name, model=model, gpu=gpu, port=port or 8000, hf_token=hf_token
            )
        elif framework == "tgi":
            if not model:
                raise ValueError("Model required for TGI")
            container_config = self.get_tgi_config(
                name=name, model=model, gpu=gpu, port=port or 8080, hf_token=hf_token
            )
        elif framework == "llama-cpp":
            container_config = self.get_llamacpp_config(
                name=name, model_url=model, gpu=gpu, port=port or 8080
            )
        else:
            raise ValueError(f"Unsupported framework: {framework}")

        # Create container
        result = await self.portainer.create_container(endpoint_id, container_config)

        # Start container
        container_id = result["Id"]
        await self.portainer.start_container(endpoint_id, container_id)

        # Get container details
        container = await self.portainer.get_container(endpoint_id, container_id)

        return {
            "container_id": container_id,
            "name": name,
            "framework": framework,
            "model": model,
            "port": port,
            "endpoint_id": endpoint_id,
            "status": container.get("State", {}).get("Status", "unknown"),
        }
