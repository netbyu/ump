"""HuggingFace model browser API routes"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
import httpx

router = APIRouter(prefix="/models", tags=["models"])

# Popular LLM models organized by framework
CURATED_MODELS = {
    "ollama": [
        {"name": "llama3.2:1b", "description": "Llama 3.2 1B - Ultra lightweight", "size": "1B", "vram": "2GB"},
        {"name": "llama3.2:3b", "description": "Llama 3.2 3B - Fast and efficient", "size": "3B", "vram": "4GB"},
        {"name": "llama3.1:8b", "description": "Llama 3.1 8B - Great balance", "size": "8B", "vram": "8GB"},
        {"name": "llama3.1:70b", "description": "Llama 3.1 70B - Powerful", "size": "70B", "vram": "48GB"},
        {"name": "mistral:7b", "description": "Mistral 7B - Efficient", "size": "7B", "vram": "8GB"},
        {"name": "mixtral:8x7b", "description": "Mixtral 8x7B - MoE model", "size": "47B", "vram": "32GB"},
        {"name": "gemma2:2b", "description": "Gemma 2 2B - Google's small model", "size": "2B", "vram": "3GB"},
        {"name": "gemma2:9b", "description": "Gemma 2 9B - Google's efficient model", "size": "9B", "vram": "10GB"},
        {"name": "qwen2.5:3b", "description": "Qwen 2.5 3B - Alibaba's model", "size": "3B", "vram": "4GB"},
        {"name": "qwen2.5:7b", "description": "Qwen 2.5 7B - Strong performer", "size": "7B", "vram": "8GB"},
        {"name": "phi3", "description": "Phi-3 - Microsoft's efficient model", "size": "3.8B", "vram": "4GB"},
        {"name": "codellama:7b", "description": "Code Llama 7B - Code generation", "size": "7B", "vram": "8GB"},
        {"name": "codellama:13b", "description": "Code Llama 13B - Advanced coding", "size": "13B", "vram": "16GB"},
    ],
    "vllm": [
        {"name": "meta-llama/Llama-3.2-1B-Instruct", "description": "Llama 3.2 1B Instruct", "size": "1B", "vram": "2GB"},
        {"name": "meta-llama/Llama-3.2-3B-Instruct", "description": "Llama 3.2 3B Instruct", "size": "3B", "vram": "4GB"},
        {"name": "meta-llama/Llama-3.1-8B-Instruct", "description": "Llama 3.1 8B Instruct", "size": "8B", "vram": "10GB"},
        {"name": "meta-llama/Llama-3.1-70B-Instruct", "description": "Llama 3.1 70B Instruct", "size": "70B", "vram": "48GB"},
        {"name": "mistralai/Mistral-7B-Instruct-v0.3", "description": "Mistral 7B Instruct v0.3", "size": "7B", "vram": "8GB"},
        {"name": "mistralai/Mixtral-8x7B-Instruct-v0.1", "description": "Mixtral 8x7B Instruct", "size": "47B", "vram": "32GB"},
        {"name": "google/gemma-2-2b-it", "description": "Gemma 2 2B IT", "size": "2B", "vram": "3GB"},
        {"name": "google/gemma-2-9b-it", "description": "Gemma 2 9B IT", "size": "9B", "vram": "10GB"},
        {"name": "Qwen/Qwen2.5-3B-Instruct", "description": "Qwen 2.5 3B Instruct", "size": "3B", "vram": "4GB"},
        {"name": "Qwen/Qwen2.5-7B-Instruct", "description": "Qwen 2.5 7B Instruct", "size": "7B", "vram": "8GB"},
        {"name": "microsoft/Phi-3-mini-4k-instruct", "description": "Phi-3 Mini 4K", "size": "3.8B", "vram": "4GB"},
        {"name": "deepseek-ai/deepseek-coder-6.7b-instruct", "description": "DeepSeek Coder 6.7B", "size": "6.7B", "vram": "8GB"},
    ],
    "tgi": [
        {"name": "meta-llama/Llama-3.1-8B-Instruct", "description": "Llama 3.1 8B Instruct", "size": "8B", "vram": "10GB"},
        {"name": "mistralai/Mistral-7B-Instruct-v0.3", "description": "Mistral 7B Instruct v0.3", "size": "7B", "vram": "8GB"},
        {"name": "google/gemma-2-9b-it", "description": "Gemma 2 9B IT", "size": "9B", "vram": "10GB"},
        {"name": "Qwen/Qwen2.5-7B-Instruct", "description": "Qwen 2.5 7B Instruct", "size": "7B", "vram": "8GB"},
        {"name": "HuggingFaceH4/zephyr-7b-beta", "description": "Zephyr 7B Beta", "size": "7B", "vram": "8GB"},
    ],
}


@router.get("/curated")
async def get_curated_models(
    framework: Optional[str] = Query(None, description="Filter by framework (ollama, vllm, tgi)")
):
    """Get curated list of popular models"""
    if framework:
        if framework not in CURATED_MODELS:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown framework: {framework}. Available: {list(CURATED_MODELS.keys())}"
            )
        return {
            "framework": framework,
            "models": CURATED_MODELS[framework]
        }

    return {
        "frameworks": CURATED_MODELS
    }


@router.get("/search")
async def search_huggingface_models(
    query: str = Query(..., description="Search query"),
    task: str = Query("text-generation", description="Model task filter"),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
):
    """Search HuggingFace models"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            params = {
                "search": query,
                "filter": task,
                "limit": limit,
                "sort": "downloads",
                "direction": -1,
            }

            response = await client.get(
                "https://huggingface.co/api/models",
                params=params
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to fetch models from HuggingFace"
                )

            models = response.json()

            # Format the response
            formatted_models = []
            for model in models:
                formatted_models.append({
                    "id": model.get("id", ""),
                    "name": model.get("id", ""),
                    "author": model.get("author", ""),
                    "downloads": model.get("downloads", 0),
                    "likes": model.get("likes", 0),
                    "tags": model.get("tags", []),
                    "pipeline_tag": model.get("pipeline_tag", ""),
                    "description": model.get("cardData", {}).get("description", ""),
                    "gated": model.get("gated", False),
                })

            return {
                "query": query,
                "task": task,
                "count": len(formatted_models),
                "models": formatted_models
            }

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request to HuggingFace timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search models: {str(e)}"
        )


@router.get("/trending")
async def get_trending_models(
    task: str = Query("text-generation", description="Model task filter"),
    limit: int = Query(20, ge=1, le=100, description="Number of results"),
):
    """Get trending models from HuggingFace"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            params = {
                "filter": task,
                "limit": limit,
                "sort": "trending",
                "direction": -1,
            }

            response = await client.get(
                "https://huggingface.co/api/models",
                params=params
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="Failed to fetch trending models from HuggingFace"
                )

            models = response.json()

            # Format the response
            formatted_models = []
            for model in models:
                formatted_models.append({
                    "id": model.get("id", ""),
                    "name": model.get("id", ""),
                    "author": model.get("author", ""),
                    "downloads": model.get("downloads", 0),
                    "likes": model.get("likes", 0),
                    "tags": model.get("tags", []),
                    "pipeline_tag": model.get("pipeline_tag", ""),
                    "gated": model.get("gated", False),
                })

            return {
                "task": task,
                "count": len(formatted_models),
                "models": formatted_models
            }

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request to HuggingFace timed out"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch trending models: {str(e)}"
        )
