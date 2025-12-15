"""Docker deployment API routes for LLM frameworks"""
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from uuid import uuid4

from ..models.docker import (
    DockerDeploymentCreate,
    DockerDeploymentResponse,
    DockerContainerListResponse,
    ContainerStatus,
    DockerEndpoint,
)
from ..services.portainer_service import PortainerService, DockerLLMDeployer

router = APIRouter(prefix="/docker", tags=["docker"])


def get_portainer_service():
    """Get Portainer service instance"""
    try:
        return PortainerService()
    except ValueError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Portainer not configured: {str(e)}. Set PORTAINER_URL and PORTAINER_API_TOKEN."
        )


@router.get("/endpoints", response_model=List[DockerEndpoint])
async def list_endpoints():
    """List available Docker endpoints (hosts)"""
    try:
        portainer = get_portainer_service()
        endpoints = await portainer.get_endpoints()

        return [
            DockerEndpoint(
                id=ep["Id"],
                name=ep["Name"],
                type=ep["Type"],
                url=ep.get("URL", ""),
                public_url=ep.get("PublicURL"),
                status=ep.get("Status", 1),
            )
            for ep in endpoints
        ]

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list endpoints: {str(e)}"
        )


@router.post("/deploy", response_model=DockerDeploymentResponse)
async def deploy_llm(request: DockerDeploymentCreate):
    """Deploy an LLM framework to Docker"""
    try:
        portainer = get_portainer_service()
        deployer = DockerLLMDeployer(portainer)

        # Get endpoint ID
        endpoint_id = request.endpoint_id
        if request.endpoint_name and not endpoint_id:
            endpoint = await portainer.get_endpoint_by_name(request.endpoint_name)
            if not endpoint:
                raise HTTPException(
                    status_code=404, detail=f"Endpoint '{request.endpoint_name}' not found"
                )
            endpoint_id = endpoint["Id"]

        # Determine port based on framework
        port = request.port
        if not port:
            default_ports = {
                "ollama": 11434,
                "vllm": 8000,
                "tgi": 8080,
                "llama-cpp": 8080,
            }
            port = default_ports.get(request.framework.value, 8000)

        # Deploy container
        result = await deployer.deploy_llm(
            endpoint_id=endpoint_id,
            framework=request.framework.value,
            name=request.name,
            model=request.model_name,
            port=port,
            gpu=request.gpu_enabled,
            hf_token=request.hf_token,
        )

        # Get endpoint details
        endpoints = await portainer.get_endpoints()
        endpoint = next((e for e in endpoints if e["Id"] == endpoint_id), None)
        endpoint_name = endpoint.get("Name", "unknown") if endpoint else "unknown"

        # Get host IP from endpoint
        host_ip = None
        if endpoint:
            # Extract IP from URL or PublicURL
            url = endpoint.get("PublicURL") or endpoint.get("URL", "")
            if "://" in url:
                host_ip = url.split("://")[1].split(":")[0]

        # Build base URL
        base_url = f"http://{host_ip}:{port}" if host_ip else None

        response = DockerDeploymentResponse(
            id=result["container_id"],
            container_id=result["container_id"],
            name=request.name,
            framework=request.framework.value,
            model_name=request.model_name,
            endpoint_id=endpoint_id,
            endpoint_name=endpoint_name,
            host_ip=host_ip,
            host_port=port,
            container_port=port,
            status=ContainerStatus.RUNNING,
            created_at=datetime.now(),
            base_url=base_url,
        )

        # TODO: Auto-create LLM connection if requested
        if request.auto_create_connection and base_url:
            # Create LLM connection
            # connection_id = await create_llm_connection(...)
            # response.connection_id = connection_id
            pass

        return response

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to deploy container: {str(e)}"
        )


@router.get("/containers", response_model=DockerContainerListResponse)
async def list_containers(
    endpoint_id: Optional[int] = Query(None, description="Filter by endpoint ID"),
    framework: Optional[str] = Query(None, description="Filter by framework"),
):
    """List all LLM containers across endpoints"""
    try:
        portainer = get_portainer_service()
        endpoints = await portainer.get_endpoints()

        all_containers = []
        running_count = 0
        by_framework = {}

        # Get containers from each endpoint
        for endpoint in endpoints:
            ep_id = endpoint["Id"]

            # Skip if filtering by endpoint
            if endpoint_id and ep_id != endpoint_id:
                continue

            try:
                containers = await portainer.list_containers(ep_id)

                # Filter for LLM containers
                for container in containers:
                    labels = container.get("Labels", {})

                    # Check if managed by our system
                    if labels.get("managed_by") != "ump-ai-compute":
                        continue

                    container_framework = labels.get("framework", "unknown")

                    # Filter by framework if specified
                    if framework and container_framework != framework:
                        continue

                    # Parse port bindings
                    ports = container.get("Ports", [])
                    host_port = ports[0].get("PublicPort") if ports else None
                    container_port = ports[0].get("PrivatePort") if ports else None

                    # Get host IP
                    host_ip = endpoint.get("PublicURL") or endpoint.get("URL", "")
                    if "://" in host_ip:
                        host_ip = host_ip.split("://")[1].split(":")[0]

                    status_str = container.get("State", "unknown")
                    try:
                        status = ContainerStatus(status_str)
                    except ValueError:
                        status = ContainerStatus.EXITED

                    if status == ContainerStatus.RUNNING:
                        running_count += 1

                    # Count by framework
                    by_framework[container_framework] = (
                        by_framework.get(container_framework, 0) + 1
                    )

                    # Build base URL
                    base_url = None
                    if host_ip and host_port:
                        base_url = f"http://{host_ip}:{host_port}"

                    all_containers.append(
                        DockerDeploymentResponse(
                            id=container["Id"],
                            container_id=container["Id"],
                            name=container.get("Names", ["unknown"])[0].lstrip("/"),
                            framework=container_framework,
                            model_name=labels.get("model"),
                            endpoint_id=ep_id,
                            endpoint_name=endpoint["Name"],
                            host_ip=host_ip,
                            host_port=host_port,
                            container_port=container_port or 0,
                            status=status,
                            created_at=datetime.fromtimestamp(container.get("Created", 0)),
                            base_url=base_url,
                        )
                    )

            except Exception as e:
                # Skip endpoints that fail
                print(f"Error listing containers on endpoint {ep_id}: {e}")
                continue

        return DockerContainerListResponse(
            containers=all_containers,
            total=len(all_containers),
            running_count=running_count,
            by_framework=by_framework,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list containers: {str(e)}"
        )


@router.get("/containers/{container_id}")
async def get_container(
    container_id: str,
    endpoint_id: int = Query(..., description="Endpoint ID"),
):
    """Get container details"""
    try:
        portainer = get_portainer_service()
        container = await portainer.get_container(endpoint_id, container_id)

        return {
            "container_id": container_id,
            "name": container.get("Name", "").lstrip("/"),
            "status": container.get("State", {}).get("Status", "unknown"),
            "image": container.get("Config", {}).get("Image", "unknown"),
            "created": container.get("Created"),
            "ports": container.get("NetworkSettings", {}).get("Ports", {}),
            "labels": container.get("Config", {}).get("Labels", {}),
        }

    except Exception as e:
        raise HTTPException(
            status_code=404, detail=f"Container not found: {str(e)}"
        )


@router.post("/containers/{container_id}/start")
async def start_container(
    container_id: str,
    endpoint_id: int = Query(..., description="Endpoint ID"),
):
    """Start a container"""
    try:
        portainer = get_portainer_service()
        success = await portainer.start_container(endpoint_id, container_id)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to start container")

        return {"message": "Container started successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start container: {str(e)}")


@router.post("/containers/{container_id}/stop")
async def stop_container(
    container_id: str,
    endpoint_id: int = Query(..., description="Endpoint ID"),
):
    """Stop a container"""
    try:
        portainer = get_portainer_service()
        success = await portainer.stop_container(endpoint_id, container_id)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to stop container")

        return {"message": "Container stopped successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop container: {str(e)}")


@router.delete("/containers/{container_id}")
async def remove_container(
    container_id: str,
    endpoint_id: int = Query(..., description="Endpoint ID"),
):
    """Remove a container"""
    try:
        portainer = get_portainer_service()
        success = await portainer.remove_container(endpoint_id, container_id)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to remove container")

        return {"message": "Container removed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove container: {str(e)}")


@router.get("/containers/{container_id}/logs")
async def get_container_logs(
    container_id: str,
    endpoint_id: int = Query(..., description="Endpoint ID"),
    tail: int = Query(100, ge=1, le=1000, description="Number of lines"),
):
    """Get container logs"""
    try:
        portainer = get_portainer_service()
        logs = await portainer.get_container_logs(endpoint_id, container_id, tail)

        return {"logs": logs}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get logs: {str(e)}"
        )
