"""AWS Service Quotas API routes"""
import os
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Query
import boto3
from botocore.exceptions import ClientError

router = APIRouter(prefix="/quotas", tags=["quotas"])


def get_aws_service():
    """Get AWS clients"""
    region = os.environ.get("AWS_DEFAULT_REGION", "ca-central-1")
    try:
        ec2_client = boto3.client("ec2", region_name=region)
        service_quotas_client = boto3.client("service-quotas", region_name=region)
        return ec2_client, service_quotas_client, region
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initialize AWS clients: {str(e)}"
        )


@router.get("/spot-capacity")
async def get_spot_capacity(
    region: Optional[str] = Query(None, description="AWS region to check")
):
    """Get spot instance capacity and limits"""
    try:
        target_region = region or os.environ.get("AWS_DEFAULT_REGION", "ca-central-1")
        ec2_client = boto3.client("ec2", region_name=target_region)
        service_quotas_client = boto3.client("service-quotas", region_name=target_region)

        result = {
            "region": target_region,
            "vcpu_limit": None,
            "vcpu_used": 0,
            "vcpu_available": None,
            "instance_limits": {},
            "spot_availability": {},
        }

        # Get vCPU limit for spot instances
        try:
            quota_response = service_quotas_client.get_service_quota(
                ServiceCode="ec2",
                QuotaCode="L-34B43A08"  # All Standard Spot Instance Requests vCPU limit
            )
            result["vcpu_limit"] = int(quota_response["Quota"]["Value"])
        except ClientError as e:
            # If quota API fails, use default or estimated limit
            result["vcpu_limit"] = 128  # Common default

        # Get running spot instances to calculate used vCPUs
        try:
            instances_response = ec2_client.describe_instances(
                Filters=[
                    {"Name": "instance-lifecycle", "Values": ["spot"]},
                    {"Name": "instance-state-name", "Values": ["running", "pending"]},
                ]
            )

            vcpu_used = 0
            instance_counts = {}

            for reservation in instances_response["Reservations"]:
                for instance in reservation["Instances"]:
                    instance_type = instance["InstanceType"]

                    # Get vCPU count for this instance type
                    try:
                        type_info = ec2_client.describe_instance_types(
                            InstanceTypes=[instance_type]
                        )
                        vcpus = type_info["InstanceTypes"][0]["VCpuInfo"]["DefaultVCpus"]
                        vcpu_used += vcpus

                        # Track instance counts
                        instance_counts[instance_type] = instance_counts.get(instance_type, 0) + 1
                    except:
                        pass

            result["vcpu_used"] = vcpu_used
            result["vcpu_available"] = result["vcpu_limit"] - vcpu_used
            result["running_instances"] = instance_counts

        except ClientError:
            pass

        # Check spot instance availability for common GPU instance types
        gpu_instance_types = [
            "g4dn.xlarge", "g4dn.2xlarge", "g4dn.12xlarge",
            "g5.xlarge", "g5.2xlarge", "g5.4xlarge", "g5.12xlarge", "g5.48xlarge",
            "g6.xlarge", "g6.2xlarge",
            "p3.2xlarge", "p3.8xlarge",
            "p4d.24xlarge"
        ]

        # Get instance type details and vCPU info
        try:
            type_response = ec2_client.describe_instance_types(
                InstanceTypes=gpu_instance_types
            )

            for instance_type_info in type_response["InstanceTypes"]:
                instance_type = instance_type_info["InstanceType"]
                vcpus = instance_type_info["VCpuInfo"]["DefaultVCpus"]

                # Calculate how many instances can be launched
                if result["vcpu_available"] is not None:
                    max_instances = result["vcpu_available"] // vcpus
                else:
                    max_instances = None

                result["instance_limits"][instance_type] = {
                    "vcpus": vcpus,
                    "max_instances": max_instances,
                    "sufficient_quota": max_instances > 0 if max_instances is not None else True,
                }

        except ClientError:
            pass

        # Check spot price history to infer availability
        try:
            now = ec2_client.describe_spot_price_history(
                InstanceTypes=gpu_instance_types,
                MaxResults=len(gpu_instance_types),
                ProductDescriptions=["Linux/UNIX"],
            )

            for price_info in now["SpotPriceHistory"]:
                instance_type = price_info["InstanceType"]
                availability_zone = price_info["AvailabilityZone"]

                if instance_type not in result["spot_availability"]:
                    result["spot_availability"][instance_type] = {
                        "available": True,
                        "availability_zones": []
                    }

                result["spot_availability"][instance_type]["availability_zones"].append(
                    availability_zone
                )

        except ClientError:
            pass

        return result

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch spot capacity: {str(e)}"
        )


@router.get("/service-quotas")
async def get_service_quotas(
    region: Optional[str] = Query(None, description="AWS region to check")
):
    """Get EC2 service quotas"""
    try:
        target_region = region or os.environ.get("AWS_DEFAULT_REGION", "ca-central-1")
        service_quotas_client = boto3.client("service-quotas", region_name=target_region)

        quotas = {}

        # Key quotas to check
        quota_codes = {
            "L-34B43A08": "All Standard Spot Instance Requests (vCPUs)",
            "L-7212CCBC": "All G and VT Spot Instance Requests (vCPUs)",
            "L-417A185B": "All P Spot Instance Requests (vCPUs)",
        }

        for code, description in quota_codes.items():
            try:
                response = service_quotas_client.get_service_quota(
                    ServiceCode="ec2",
                    QuotaCode=code
                )
                quotas[description] = {
                    "value": int(response["Quota"]["Value"]),
                    "adjustable": response["Quota"].get("Adjustable", False),
                    "unit": response["Quota"].get("Unit", "None"),
                }
            except ClientError:
                # Quota might not be available in all regions
                quotas[description] = {
                    "value": None,
                    "adjustable": False,
                    "unit": "None",
                    "error": "Not available in this region"
                }

        return {
            "region": target_region,
            "quotas": quotas
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch service quotas: {str(e)}"
        )
