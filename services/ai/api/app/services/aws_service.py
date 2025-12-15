"""AWS Spot Instance management service - wraps aws_spot_llm.py functionality"""
import os
import sys
from typing import List, Dict, Optional, Any
from datetime import datetime
from pathlib import Path

# Add parent directory to path to import aws_spot_llm module
parent_dir = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(parent_dir))

from aws_spot_llm import (
    AWSSpotLauncher,
    Framework,
    INSTANCE_CONFIGS,
    InstanceConfig,
)

from ..models.instance import InstanceStatus


class AWSSpotService:
    """Service for managing AWS Spot instances"""

    def __init__(
        self,
        access_key_id: Optional[str] = None,
        secret_access_key: Optional[str] = None,
        region: Optional[str] = None,
    ):
        """Initialize AWS service with credentials"""
        # Set AWS credentials in environment if provided
        if access_key_id:
            os.environ["AWS_ACCESS_KEY_ID"] = access_key_id
        if secret_access_key:
            os.environ["AWS_SECRET_ACCESS_KEY"] = secret_access_key

        self.region = region or os.environ.get("AWS_DEFAULT_REGION", "ca-central-1")
        self.launcher = AWSSpotLauncher(region=self.region)

    def launch_instance(
        self,
        instance_type: str,
        framework: Framework,
        model: Optional[str] = None,
        name: str = "llm-test",
        volume_size_gb: int = 100,
        max_price: Optional[float] = None,
        hf_token: Optional[str] = None,
        key_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Launch a new spot instance"""
        result = self.launcher.launch_spot_instance(
            instance_type=instance_type,
            framework=framework,
            model=model,
            hf_token=hf_token,
            max_price=max_price,
            key_name=key_name,
            name=name,
            volume_size_gb=volume_size_gb,
        )
        return result

    def list_instances(self) -> List[Dict[str, Any]]:
        """List all LLM testing instances"""
        return self.launcher.list_instances()

    def get_instance_status(self, instance_id: str) -> Dict[str, Any]:
        """Get detailed status of an instance"""
        return self.launcher.get_instance_status(instance_id)

    def terminate_instance(self, instance_id: str) -> bool:
        """Terminate an instance"""
        return self.launcher.terminate_instance(instance_id)

    def stop_instance(self, instance_id: str) -> bool:
        """Stop an instance"""
        return self.launcher.stop_instance(instance_id)

    def start_instance(self, instance_id: str) -> bool:
        """Start a stopped instance"""
        return self.launcher.start_instance(instance_id)

    def get_spot_price(self, instance_type: str) -> Optional[float]:
        """Get current spot price for instance type"""
        return self.launcher.get_spot_price(instance_type)

    def get_all_pricing(self) -> List[Dict[str, Any]]:
        """Get pricing for all instance types"""
        pricing_data = []

        for instance_type, config in INSTANCE_CONFIGS.items():
            current_spot = self.get_spot_price(instance_type)

            savings = None
            if current_spot and config.on_demand_price > 0:
                savings = round(
                    ((config.on_demand_price - current_spot) / config.on_demand_price)
                    * 100,
                    1,
                )

            pricing_data.append(
                {
                    "instance_type": instance_type,
                    "gpu_count": config.gpu_count,
                    "gpu_model": config.gpu_model,
                    "gpu_memory_gb": config.gpu_memory_gb,
                    "vcpus": config.vcpus,
                    "memory_gb": config.memory_gb,
                    "storage_gb": config.storage_gb,
                    "network_gbps": config.network_gbps,
                    "on_demand_price": config.on_demand_price,
                    "spot_price_estimate": config.spot_price_estimate,
                    "current_spot_price": current_spot,
                    "savings_percentage": savings,
                    "recommended_models": config.recommended_models,
                }
            )

        return pricing_data

    def get_instance_config(self, instance_type: str) -> Optional[InstanceConfig]:
        """Get configuration for a specific instance type"""
        return INSTANCE_CONFIGS.get(instance_type)

    def recommend_instance(self, model_name: str) -> List[Dict[str, Any]]:
        """Recommend instance types for a model"""
        model_lower = model_name.lower()
        recommendations = []

        # Check for direct or family matches
        for instance_type, config in INSTANCE_CONFIGS.items():
            # Direct match
            if model_lower in [m.lower() for m in config.recommended_models]:
                match_type = "direct"
            # Family match (e.g., "llama3.1" matches "llama3.1:8b")
            elif any(
                model_lower.split(":")[0] in m.lower()
                for m in config.recommended_models
            ):
                match_type = "family"
            else:
                continue

            current_spot = self.get_spot_price(instance_type)
            recommendations.append(
                {
                    "instance_type": instance_type,
                    "match_type": match_type,
                    "gpu_count": config.gpu_count,
                    "gpu_model": config.gpu_model,
                    "gpu_memory_gb": config.gpu_memory_gb,
                    "vcpus": config.vcpus,
                    "memory_gb": config.memory_gb,
                    "storage_gb": config.storage_gb,
                    "network_gbps": config.network_gbps,
                    "on_demand_price": config.on_demand_price,
                    "spot_price_estimate": config.spot_price_estimate,
                    "current_spot_price": current_spot,
                    "recommended_models": config.recommended_models,
                }
            )

        # Fallback: infer from model name
        if not recommendations:
            if "70b" in model_lower or "65b" in model_lower:
                recommended_types = ["g5.12xlarge", "g5.48xlarge", "p4d.24xlarge"]
            elif "13b" in model_lower or "8b" in model_lower:
                recommended_types = ["g5.xlarge", "g5.2xlarge", "g6.xlarge"]
            else:
                recommended_types = ["g4dn.xlarge", "g5.xlarge", "g6.xlarge"]

            for instance_type in recommended_types:
                config = INSTANCE_CONFIGS.get(instance_type)
                if config:
                    current_spot = self.get_spot_price(instance_type)
                    recommendations.append(
                        {
                            "instance_type": instance_type,
                            "match_type": "inferred",
                            "gpu_count": config.gpu_count,
                            "gpu_model": config.gpu_model,
                            "gpu_memory_gb": config.gpu_memory_gb,
                            "vcpus": config.vcpus,
                            "memory_gb": config.memory_gb,
                            "storage_gb": config.storage_gb,
                            "network_gbps": config.network_gbps,
                            "on_demand_price": config.on_demand_price,
                            "spot_price_estimate": config.spot_price_estimate,
                            "current_spot_price": current_spot,
                            "recommended_models": config.recommended_models,
                        }
                    )

        return recommendations

    @staticmethod
    def map_aws_state_to_status(aws_state: str) -> InstanceStatus:
        """Map AWS instance state to our InstanceStatus enum"""
        state_map = {
            "pending": InstanceStatus.PENDING,
            "running": InstanceStatus.RUNNING,
            "stopping": InstanceStatus.STOPPING,
            "stopped": InstanceStatus.STOPPED,
            "shutting-down": InstanceStatus.TERMINATED,
            "terminated": InstanceStatus.TERMINATED,
        }
        return state_map.get(aws_state.lower(), InstanceStatus.UNKNOWN)

    def calculate_uptime_hours(self, launch_time: datetime) -> float:
        """Calculate uptime in hours"""
        if not launch_time:
            return 0.0
        uptime = datetime.now(launch_time.tzinfo) - launch_time
        return round(uptime.total_seconds() / 3600, 2)

    def estimate_cost(
        self, instance_type: str, uptime_hours: float, spot_price: Optional[float]
    ) -> float:
        """Estimate cost for an instance"""
        if spot_price:
            return round(uptime_hours * spot_price, 2)

        # Fallback to estimate
        config = self.get_instance_config(instance_type)
        if config:
            return round(uptime_hours * config.spot_price_estimate, 2)

        return 0.0
