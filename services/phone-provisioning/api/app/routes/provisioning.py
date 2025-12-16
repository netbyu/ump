"""
Phone Provisioning API Routes
"""
from fastapi import APIRouter, HTTPException, Response
from typing import Optional

from ..models.phone import (
    PhoneAssignmentCreate,
    PhoneAssignment,
    ProvisioningRequest,
    ProvisioningResponse,
    PhoneListResponse,
)
from ..services.provisioning_service import PhoneProvisioningService
from ..services.config_generator import (
    YEALINK_DEFAULT_TEMPLATE,
    POLYCOM_DEFAULT_TEMPLATE,
    CISCO_DEFAULT_TEMPLATE,
    GRANDSTREAM_DEFAULT_TEMPLATE,
)

router = APIRouter(prefix="/provisioning", tags=["provisioning"])

# Initialize provisioning service
provisioning_service = PhoneProvisioningService()

# In-memory storage (TODO: Replace with database)
_phone_assignments = {}
_phone_models = {
    "yealink-t46s": {
        "id": "yealink-t46s",
        "vendor": "yealink",
        "model_name": "T46S",
        "display_name": "Yealink T46S",
        "config_file_pattern": "y{mac}.cfg",
        "line_count": 16,
    },
    "polycom-vvx450": {
        "id": "polycom-vvx450",
        "vendor": "polycom",
        "model_name": "VVX450",
        "display_name": "Polycom VVX 450",
        "config_file_pattern": "{mac}.cfg",
        "line_count": 12,
    },
}


@router.post("/assignments")
async def create_phone_assignment(assignment: PhoneAssignmentCreate):
    """
    Assign a phone to an extension

    Creates the assignment and immediately generates the config file
    """
    try:
        # Get phone model
        phone_model = _phone_models.get(assignment.phone_model_id)
        if not phone_model:
            raise HTTPException(status_code=404, detail="Phone model not found")

        # Create assignment
        assignment_data = {
            **assignment.model_dump(),
            "id": f"assign-{len(_phone_assignments)}",
            "is_provisioned": False,
            "provisioning_status": "pending",
            "created_at": datetime.now(),
        }

        # Get template
        template_map = {
            "yealink": YEALINK_DEFAULT_TEMPLATE,
            "polycom": POLYCOM_DEFAULT_TEMPLATE,
            "cisco": CISCO_DEFAULT_TEMPLATE,
            "grandstream": GRANDSTREAM_DEFAULT_TEMPLATE,
        }
        template = template_map.get(phone_model["vendor"], YEALINK_DEFAULT_TEMPLATE)

        # Generate config
        result = await provisioning_service.provision_phone(
            mac_address=assignment.mac_address,
            assignment=PhoneAssignment(**assignment_data),
            template_content=template,
            phone_model=phone_model
        )

        if result.success:
            assignment_data["is_provisioned"] = True
            assignment_data["provisioning_status"] = "success"

        _phone_assignments[assignment.mac_address] = assignment_data

        return {
            "id": assignment_data["id"],
            "mac_address": assignment.mac_address,
            "extension": assignment.extension,
            "provisioning_status": assignment_data["provisioning_status"],
            "config_generated": result.success,
            "message": "Phone assignment created and config generated"
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create assignment: {str(e)}"
        )


@router.get("/assignments")
async def list_phone_assignments():
    """List all phone assignments"""
    return {
        "items": list(_phone_assignments.values()),
        "total": len(_phone_assignments),
        "provisioned": len([a for a in _phone_assignments.values() if a.get("is_provisioned")]),
        "pending": len([a for a in _phone_assignments.values() if a.get("provisioning_status") == "pending"]),
    }


@router.get("/assignments/{mac_address}")
async def get_phone_assignment(mac_address: str):
    """Get phone assignment by MAC"""
    assignment = _phone_assignments.get(mac_address)
    if not assignment:
        raise HTTPException(status_code=404, detail="Phone assignment not found")
    return assignment


@router.delete("/assignments/{mac_address}")
async def delete_phone_assignment(mac_address: str):
    """Remove phone assignment"""
    if mac_address not in _phone_assignments:
        raise HTTPException(status_code=404, detail="Phone assignment not found")

    del _phone_assignments[mac_address]
    return {"message": "Phone assignment deleted"}


@router.get("/config/{mac_address}")
async def get_phone_config(mac_address: str):
    """
    Get config file for a phone (used by TFTP/HTTP requests)

    This endpoint is called when a phone boots and requests its config
    """
    try:
        config_content = await provisioning_service.get_config_by_mac(mac_address)

        if not config_content:
            raise HTTPException(
                status_code=404,
                detail=f"No config found for MAC: {mac_address}"
            )

        # Return as plain text (phone expects raw config)
        return Response(content=config_content, media_type="text/plain")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get config: {str(e)}"
        )


@router.post("/regenerate/{mac_address}")
async def regenerate_config(mac_address: str):
    """Regenerate config for a specific phone"""
    try:
        assignment = _phone_assignments.get(mac_address)
        if not assignment:
            raise HTTPException(status_code=404, detail="Phone assignment not found")

        phone_model = _phone_models.get(assignment["phone_model_id"])
        if not phone_model:
            raise HTTPException(status_code=404, detail="Phone model not found")

        # Get template
        template_map = {
            "yealink": YEALINK_DEFAULT_TEMPLATE,
            "polycom": POLYCOM_DEFAULT_TEMPLATE,
            "cisco": CISCO_DEFAULT_TEMPLATE,
            "grandstream": GRANDSTREAM_DEFAULT_TEMPLATE,
        }
        template = template_map.get(phone_model["vendor"], YEALINK_DEFAULT_TEMPLATE)

        # Regenerate
        result = await provisioning_service.provision_phone(
            mac_address=mac_address,
            assignment=PhoneAssignment(**assignment),
            template_content=template,
            phone_model=phone_model
        )

        return {
            "success": result.success,
            "mac_address": mac_address,
            "message": "Config regenerated" if result.success else "Failed to regenerate",
            "error": result.error
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to regenerate config: {str(e)}"
        )


@router.get("/models")
async def list_phone_models():
    """List supported phone models"""
    return {"items": list(_phone_models.values()), "total": len(_phone_models)}
