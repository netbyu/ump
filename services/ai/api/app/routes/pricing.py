"""Pricing and recommendations API routes"""
from typing import List
from fastapi import APIRouter, HTTPException
from datetime import datetime

from ..models.pricing import (
    PricingResponse,
    InstanceTypeInfo,
    RecommendationRequest,
    RecommendationResponse,
)
from ..services.aws_service import AWSSpotService

router = APIRouter(prefix="/pricing", tags=["pricing"])


def get_aws_service():
    """Get AWS service instance"""
    return AWSSpotService()


@router.get("", response_model=PricingResponse)
async def get_pricing():
    """Get current pricing for all GPU instance types"""
    try:
        aws_service = get_aws_service()
        pricing_data = aws_service.get_all_pricing()

        instance_types = [
            InstanceTypeInfo(**data) for data in pricing_data
        ]

        return PricingResponse(
            region=aws_service.region,
            instance_types=instance_types,
            updated_at=datetime.now().isoformat(),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pricing: {str(e)}")


@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(request: RecommendationRequest):
    """Get instance type recommendations for a specific model"""
    try:
        aws_service = get_aws_service()
        recommendations = aws_service.recommend_instance(request.model_name)

        instance_types = [
            InstanceTypeInfo(**rec) for rec in recommendations
        ]

        return RecommendationResponse(
            model_name=request.model_name,
            recommendations=instance_types,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get recommendations: {str(e)}"
        )


@router.get("/spot/{instance_type}")
async def get_spot_price(instance_type: str):
    """Get current spot price for a specific instance type"""
    try:
        aws_service = get_aws_service()
        spot_price = aws_service.get_spot_price(instance_type)

        if spot_price is None:
            raise HTTPException(
                status_code=404,
                detail=f"Spot price not available for {instance_type}",
            )

        config = aws_service.get_instance_config(instance_type)
        savings = None
        if config and spot_price:
            savings = round(
                ((config.on_demand_price - spot_price) / config.on_demand_price) * 100,
                1,
            )

        return {
            "instance_type": instance_type,
            "current_spot_price": spot_price,
            "on_demand_price": config.on_demand_price if config else None,
            "savings_percentage": savings,
            "timestamp": datetime.now().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get spot price: {str(e)}"
        )
