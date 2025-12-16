"""
Automation Stack deployment API routes
"""
from fastapi import APIRouter, HTTPException
from typing import Optional, List
from datetime import datetime

from ..models.stacks import (
    StackTemplate,
    StackDeploymentCreate,
    StackDeploymentResponse,
    StackListResponse,
    DeploymentTarget,
    StackStatus,
    DeployedComponent,
    ComponentStatus,
)
from ..services.stack_templates import get_stack_template, list_stack_templates
from ..services.stack_deployer import StackDeployer, StackRegistry
from ..services.portainer_service import PortainerService
from ..services.aws_service import AWSSpotService

router = APIRouter(prefix="/stacks", tags=["stacks"])


@router.get("/templates", response_model=List[StackTemplate])
async def list_templates(category: Optional[str] = None):
    """List available stack templates"""
    try:
        templates = list_stack_templates(category)
        return templates
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list templates: {str(e)}"
        )


@router.get("/templates/{stack_id}", response_model=StackTemplate)
async def get_template(stack_id: str):
    """Get a specific stack template"""
    try:
        template = get_stack_template(stack_id)
        return template
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get template: {str(e)}"
        )


@router.post("/deploy", response_model=StackDeploymentResponse)
async def deploy_stack(request: StackDeploymentCreate):
    """
    Deploy an automation stack
    Can deploy to Docker (Portainer) or AWS Spot instance
    """
    try:
        # Get stack template
        template = get_stack_template(request.stack_id)

        # Validate deployment target
        if request.deployment_target not in template.deployment_targets:
            raise HTTPException(
                status_code=400,
                detail=f"Stack {template.name} cannot be deployed to {request.deployment_target}"
            )

        deployment_id = str(datetime.now().timestamp())

        # ============================================================
        # Deploy to Docker via Portainer
        # ============================================================
        if request.deployment_target == DeploymentTarget.DOCKER:
            if not request.portainer_endpoint_id and not request.docker_host_id:
                raise HTTPException(
                    status_code=400,
                    detail="Docker deployment requires portainer_endpoint_id or docker_host_id"
                )

            portainer = PortainerService()
            deployer = StackDeployer(portainer)

            # Deploy stack
            result = await deployer.deploy_to_docker(
                stack=template,
                endpoint_id=request.portainer_endpoint_id,
                deployment_name=request.name,
                config_overrides=request.config_overrides
            )

            # Get deployment info
            components = [
                DeployedComponent(
                    name=comp["name"],
                    container_id=comp.get("container_id"),
                    status=ComponentStatus(comp.get("status", "starting")),
                    port_mappings=comp.get("port_mappings", {}),
                    error_message=comp.get("error_message")
                )
                for comp in result["components"]
            ]

            # Build access URLs
            # TODO: Get actual host IP from Portainer endpoint
            host_ip = "localhost"  # Replace with actual IP
            access_urls = {}
            for component in template.components:
                if component.ports:
                    first_port = component.ports[0]["host"]
                    access_urls[component.name] = f"http://{host_ip}:{first_port}"

            response = StackDeploymentResponse(
                id=result["deployment_id"],
                stack_id=template.id,
                name=request.name,
                description=request.description,
                deployment_target=DeploymentTarget.DOCKER,
                status=StackStatus.DEPLOYING,
                docker_host_id=request.docker_host_id,
                docker_host_name="Docker Host",  # TODO: Get actual name
                host_ip=host_ip,
                components=components,
                total_components=len(components),
                running_components=len([c for c in components if c.status == ComponentStatus.RUNNING]),
                access_urls=access_urls,
                deployed_at=datetime.now(),
                llm_connection_ids=[],
            )

            # Register deployment
            StackRegistry.register_deployment(result["deployment_id"], response.model_dump())

            return response

        # ============================================================
        # Deploy to AWS Spot
        # ============================================================
        elif request.deployment_target == DeploymentTarget.AWS_SPOT:
            if not request.aws_instance_type:
                request.aws_instance_type = template.resources.recommended_instance_type or "g5.xlarge"

            deployer = StackDeployer()

            # Generate user-data script with docker-compose
            user_data = deployer.generate_aws_user_data(
                stack=template,
                config_overrides=request.config_overrides
            )

            # Launch AWS instance
            aws_service = AWSSpotService(region=request.aws_region)
            instance_result = aws_service.launch_spot_instance(
                instance_type=request.aws_instance_type,
                name=f"stack-{request.name}",
                user_data=user_data,
                volume_size_gb=template.resources.min_disk_gb,
            )

            # Build component list (from template)
            components = [
                DeployedComponent(
                    name=comp.name,
                    status=ComponentStatus.PENDING,
                    port_mappings={p["host"]: p["container"] for p in comp.ports}
                )
                for comp in template.components
            ]

            # Build access URLs
            access_urls = {}
            if instance_result.get("public_ip"):
                for component in template.components:
                    if component.ports:
                        first_port = component.ports[0]["host"]
                        access_urls[component.name] = f"http://{instance_result['public_ip']}:{first_port}"

            response = StackDeploymentResponse(
                id=deployment_id,
                stack_id=template.id,
                name=request.name,
                description=request.description,
                deployment_target=DeploymentTarget.AWS_SPOT,
                status=StackStatus.DEPLOYING,
                aws_instance_id=instance_result.get("instance_id"),
                host_ip=instance_result.get("public_ip"),
                components=components,
                total_components=len(components),
                running_components=0,
                access_urls=access_urls,
                deployed_at=datetime.now(),
                llm_connection_ids=[],
            )

            # Register deployment
            StackRegistry.register_deployment(deployment_id, response.model_dump())

            return response

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported deployment target: {request.deployment_target}"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to deploy stack: {str(e)}"
        )


@router.get("", response_model=StackListResponse)
async def list_deployed_stacks():
    """List all deployed stacks"""
    try:
        deployments = StackRegistry.list_deployments()

        # Count by status and category
        by_status = {}
        by_category = {}

        for dep in deployments:
            status = dep.get("status", "unknown")
            by_status[status] = by_status.get(status, 0) + 1

            # Get template for category
            try:
                template = get_stack_template(dep["stack_id"])
                cat = template.category
                by_category[cat] = by_category.get(cat, 0) + 1
            except:
                pass

        return StackListResponse(
            stacks=[StackDeploymentResponse(**dep) for dep in deployments],
            total=len(deployments),
            by_status=by_status,
            by_category=by_category,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to list deployments: {str(e)}"
        )


@router.get("/{deployment_id}", response_model=StackDeploymentResponse)
async def get_deployment(deployment_id: str):
    """Get deployed stack details"""
    deployment = StackRegistry.get_deployment(deployment_id)

    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    return StackDeploymentResponse(**deployment)


@router.delete("/{deployment_id}")
async def terminate_stack(deployment_id: str):
    """Terminate a deployed stack (stops all components)"""
    try:
        deployment = StackRegistry.get_deployment(deployment_id)

        if not deployment:
            raise HTTPException(status_code=404, detail="Deployment not found")

        # TODO: Implement actual termination
        # If Docker: Stop/remove all containers
        # If AWS: Terminate instance

        return {"message": f"Stack {deployment_id} terminated"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to terminate stack: {str(e)}"
        )


@router.get("/{deployment_id}/docker-compose")
async def get_docker_compose(deployment_id: str):
    """Get the docker-compose.yml for a deployed stack"""
    deployment = StackRegistry.get_deployment(deployment_id)

    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    template = get_stack_template(deployment["stack_id"])
    deployer = StackDeployer()

    compose_yml = deployer.generate_docker_compose(template)

    return {
        "deployment_id": deployment_id,
        "docker_compose": compose_yml
    }
