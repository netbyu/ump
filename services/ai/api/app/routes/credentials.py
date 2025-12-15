"""AWS credentials management routes"""
import os
import subprocess
from fastapi import APIRouter, HTTPException

from ..models.credentials import AWSCredentialsCreate, AWSCredentialsResponse

router = APIRouter(prefix="/credentials", tags=["credentials"])


@router.post("", response_model=AWSCredentialsResponse)
async def store_credentials(request: AWSCredentialsCreate):
    """Store AWS credentials (TODO: Implement with database and encryption)"""
    # TODO: Implement proper credential storage with encryption
    # For now, return a placeholder response
    raise HTTPException(
        status_code=501,
        detail="Credential storage not yet implemented. Use environment variables for now.",
    )


@router.get("", response_model=AWSCredentialsResponse)
async def get_credentials():
    """Get stored AWS credentials (TODO: Implement with database)"""
    # TODO: Implement credential retrieval from database
    raise HTTPException(
        status_code=501,
        detail="Credential retrieval not yet implemented. Use environment variables for now.",
    )


@router.delete("/{credential_id}")
async def delete_credentials(credential_id: str):
    """Delete stored AWS credentials (TODO: Implement with database)"""
    # TODO: Implement credential deletion
    raise HTTPException(
        status_code=501,
        detail="Credential deletion not yet implemented.",
    )


@router.get("/status")
async def check_credentials_status():
    """Check AWS CLI installation and credential configuration status"""
    status = {
        "aws_cli_installed": False,
        "credentials_configured": False,
        "configuration_method": "",
        "default_region": None,
    }

    # Check if AWS CLI is installed
    try:
        result = subprocess.run(
            ["aws", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            status["aws_cli_installed"] = True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        status["aws_cli_installed"] = False

    # Check for credentials in different locations
    # Priority: Environment Variables > AWS CLI Config > .env file

    # 1. Check environment variables
    if os.getenv("AWS_ACCESS_KEY_ID") and os.getenv("AWS_SECRET_ACCESS_KEY"):
        status["credentials_configured"] = True
        status["configuration_method"] = "Environment Variables"
        status["default_region"] = os.getenv("AWS_DEFAULT_REGION", "ca-central-1")

    # 2. Check AWS CLI configuration
    elif status["aws_cli_installed"]:
        try:
            # Try to get caller identity (this will fail if credentials aren't configured)
            result = subprocess.run(
                ["aws", "sts", "get-caller-identity"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                status["credentials_configured"] = True
                status["configuration_method"] = "AWS CLI (~/.aws/credentials)"

                # Get default region from AWS CLI config
                region_result = subprocess.run(
                    ["aws", "configure", "get", "region"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if region_result.returncode == 0:
                    status["default_region"] = region_result.stdout.strip()
        except (subprocess.TimeoutExpired, Exception):
            pass

    # 3. Check .env file (for development)
    if not status["credentials_configured"]:
        # Try to load from .env if it exists
        from pathlib import Path
        env_file = Path(__file__).parent.parent.parent / ".env"
        if env_file.exists():
            with open(env_file, "r") as f:
                content = f.read()
                if "AWS_ACCESS_KEY_ID" in content and "AWS_SECRET_ACCESS_KEY" in content:
                    status["credentials_configured"] = True
                    status["configuration_method"] = ".env File"
                    # Try to extract region from .env
                    for line in content.split("\n"):
                        if line.startswith("AWS_DEFAULT_REGION"):
                            status["default_region"] = line.split("=")[1].strip()

    return status
