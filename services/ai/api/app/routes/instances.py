"""Instance management API routes"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime

from ..models.instance import (
    InstanceCreate,
    InstanceResponse,
    InstanceListResponse,
    Framework,
)
from ..services.aws_service import AWSSpotService

router = APIRouter(prefix="/instances", tags=["instances"])


# TODO: Replace with proper dependency injection with user credentials
def get_aws_service():
    """Get AWS service instance - temporary without auth"""
    return AWSSpotService()


@router.post("/launch", response_model=InstanceResponse)
async def launch_instance(request: InstanceCreate):
    """Launch a new GPU spot instance"""
    try:
        aws_service = get_aws_service()

        # Launch the instance
        result = aws_service.launch_instance(
            instance_type=request.instance_type,
            framework=Framework(request.framework),
            model=request.model,
            name=request.name,
            volume_size_gb=request.volume_size_gb,
            max_price=request.max_price,
            hf_token=request.hf_token,
        )

        # Calculate uptime and cost
        launch_time = datetime.now()
        uptime_hours = 0.0
        estimated_cost = 0.0

        # Build response
        response = InstanceResponse(
            id=result["instance_id"],  # Using AWS ID as ID for now (TODO: add DB)
            instance_id=result["instance_id"],
            name=request.name,
            instance_type=request.instance_type,
            framework=request.framework.value,
            model=request.model,
            region=aws_service.region,
            status=aws_service.map_aws_state_to_status("running"),
            public_ip=result.get("public_ip"),
            public_dns=result.get("public_dns"),
            private_ip=result.get("private_ip"),
            gpu=result.get("gpu"),
            gpu_memory=result.get("gpu_memory"),
            spot_price=result.get("spot_price"),
            max_price=result.get("max_price"),
            launched_at=launch_time,
            uptime_hours=uptime_hours,
            estimated_cost=estimated_cost,
            ssh_command=(
                f"ssh -i {result['key_file']} ubuntu@{result['public_ip']}"
                if result.get("key_file") and result.get("public_ip")
                else None
            ),
            ollama_endpoint=(
                f"http://{result['public_ip']}:11434"
                if request.framework == Framework.OLLAMA and result.get("public_ip")
                else None
            ),
            vllm_endpoint=(
                f"http://{result['public_ip']}:8000"
                if request.framework == Framework.VLLM and result.get("public_ip")
                else None
            ),
            tgi_endpoint=(
                f"http://{result['public_ip']}:8080"
                if request.framework == Framework.TGI and result.get("public_ip")
                else None
            ),
        )

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to launch instance: {str(e)}")


@router.get("", response_model=InstanceListResponse)
async def list_instances(
    status: Optional[str] = Query(None, description="Filter by status"),
):
    """List all LLM testing instances"""
    try:
        aws_service = get_aws_service()
        instances = aws_service.list_instances()

        instance_responses = []
        active_count = 0
        total_cost = 0.0

        for inst in instances:
            # Parse launch time
            try:
                launch_time = datetime.fromisoformat(inst["launch_time"])
            except:
                launch_time = datetime.now()

            # Calculate uptime and cost
            inst_status = aws_service.map_aws_state_to_status(inst["state"])
            uptime_hours = 0.0
            estimated_cost = 0.0

            if inst_status in [aws_service.map_aws_state_to_status("running")]:
                uptime_hours = aws_service.calculate_uptime_hours(launch_time)
                estimated_cost = aws_service.estimate_cost(
                    inst["instance_type"], uptime_hours, None
                )
                active_count += 1
                total_cost += estimated_cost

            instance_response = InstanceResponse(
                id=inst["instance_id"],
                instance_id=inst["instance_id"],
                name=inst.get("name", "N/A"),
                instance_type=inst["instance_type"],
                framework=inst.get("framework", "unknown"),
                model=inst.get("model"),
                region=aws_service.region,
                status=inst_status,
                public_ip=inst.get("public_ip"),
                public_dns=None,
                private_ip=None,
                launched_at=launch_time,
                uptime_hours=uptime_hours,
                estimated_cost=estimated_cost,
            )

            # Filter by status if provided
            if status and inst_status.value != status:
                continue

            instance_responses.append(instance_response)

        return InstanceListResponse(
            instances=instance_responses,
            total=len(instance_responses),
            active_count=active_count,
            total_cost_estimate=round(total_cost, 2),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list instances: {str(e)}")


@router.get("/{instance_id}", response_model=InstanceResponse)
async def get_instance(instance_id: str):
    """Get detailed information about a specific instance"""
    try:
        aws_service = get_aws_service()
        inst = aws_service.get_instance_status(instance_id)

        # Parse launch time
        try:
            launch_time = datetime.fromisoformat(inst["launch_time"]) if inst.get("launch_time") else datetime.now()
        except:
            launch_time = datetime.now()

        # Calculate uptime and cost
        inst_status = aws_service.map_aws_state_to_status(inst["state"])
        uptime_hours = 0.0
        estimated_cost = 0.0

        if inst_status == aws_service.map_aws_state_to_status("running"):
            uptime_hours = aws_service.calculate_uptime_hours(launch_time)
            estimated_cost = aws_service.estimate_cost(
                inst["instance_type"], uptime_hours, None
            )

        framework = inst.get("framework", "unknown")

        return InstanceResponse(
            id=instance_id,
            instance_id=instance_id,
            name=inst.get("name", "N/A"),
            instance_type=inst["instance_type"],
            framework=framework,
            model=inst.get("model"),
            region=aws_service.region,
            status=inst_status,
            public_ip=inst.get("public_ip"),
            public_dns=inst.get("public_dns"),
            private_ip=inst.get("private_ip"),
            launched_at=launch_time,
            uptime_hours=uptime_hours,
            estimated_cost=estimated_cost,
            ssh_command=(
                f"ssh -i ~/.ssh/llm-testing-key.pem ubuntu@{inst['public_ip']}"
                if inst.get("public_ip")
                else None
            ),
            ollama_endpoint=(
                f"http://{inst['public_ip']}:11434"
                if framework == "ollama" and inst.get("public_ip")
                else None
            ),
            vllm_endpoint=(
                f"http://{inst['public_ip']}:8000"
                if framework == "vllm" and inst.get("public_ip")
                else None
            ),
            tgi_endpoint=(
                f"http://{inst['public_ip']}:8080"
                if framework == "tgi" and inst.get("public_ip")
                else None
            ),
        )

    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Instance not found: {str(e)}")


@router.delete("/{instance_id}")
async def terminate_instance(instance_id: str):
    """Terminate an instance"""
    try:
        aws_service = get_aws_service()
        success = aws_service.terminate_instance(instance_id)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to terminate instance")

        return {"message": f"Instance {instance_id} terminated successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to terminate instance: {str(e)}")


@router.post("/{instance_id}/stop")
async def stop_instance(instance_id: str):
    """Stop an instance"""
    try:
        aws_service = get_aws_service()
        success = aws_service.stop_instance(instance_id)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to stop instance")

        return {"message": f"Instance {instance_id} stopped successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to stop instance: {str(e)}")


@router.post("/{instance_id}/start")
async def start_instance(instance_id: str):
    """Start a stopped instance"""
    try:
        aws_service = get_aws_service()
        success = aws_service.start_instance(instance_id)

        if not success:
            raise HTTPException(status_code=500, detail="Failed to start instance")

        return {"message": f"Instance {instance_id} started successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start instance: {str(e)}")
