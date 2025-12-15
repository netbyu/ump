"""LLM Connection management API routes"""
from typing import List, Optional
from datetime import datetime
import time
import httpx
from fastapi import APIRouter, HTTPException, Query
from uuid import uuid4

from ..models.connections import (
    LLMConnectionCreate,
    LLMConnectionUpdate,
    LLMConnectionResponse,
    LLMConnectionListResponse,
    ConnectionTestRequest,
    ConnectionTestResponse,
    ConnectionType,
    ConnectionStatus,
)

router = APIRouter(prefix="/connections", tags=["connections"])

# Temporary in-memory storage (TODO: Replace with database)
_connections_store: dict[str, dict] = {}


def mask_api_key(api_key: Optional[str]) -> Optional[str]:
    """Mask API key for display"""
    if not api_key:
        return None
    if len(api_key) <= 8:
        return "***"
    return f"{api_key[:4]}...{api_key[-4:]}"


@router.post("", response_model=LLMConnectionResponse)
async def create_connection(request: LLMConnectionCreate):
    """Create a new LLM connection"""
    try:
        connection_id = str(uuid4())
        now = datetime.now()

        connection = {
            "id": connection_id,
            "user_id": None,  # TODO: Get from auth
            "name": request.name,
            "connection_type": request.connection_type,
            "description": request.description,
            "base_url": request.base_url,
            "model_name": request.model_name,
            "api_key": request.api_key,  # TODO: Encrypt
            "organization_id": request.organization_id,
            "status": ConnectionStatus.INACTIVE,
            "timeout": request.timeout,
            "max_retries": request.max_retries,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "extra_config": request.extra_config,
            "tags": request.tags,
            "is_active": request.is_active,
            "use_in_livekit": request.use_in_livekit,
            "use_in_mcp": request.use_in_mcp,
            "use_in_automation": request.use_in_automation,
            "created_at": now,
            "updated_at": now,
            "last_tested_at": None,
            "last_used_at": None,
            "aws_instance_id": None,
            "aws_public_ip": None,
        }

        _connections_store[connection_id] = connection

        # Return response with masked API key
        return LLMConnectionResponse(
            **{**connection, "api_key_masked": mask_api_key(request.api_key)}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create connection: {str(e)}")


@router.get("", response_model=LLMConnectionListResponse)
async def list_connections(
    connection_type: Optional[ConnectionType] = Query(None, description="Filter by type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    use_in_livekit: Optional[bool] = Query(None, description="Filter by LiveKit availability"),
    use_in_mcp: Optional[bool] = Query(None, description="Filter by MCP availability"),
):
    """List all LLM connections"""
    try:
        connections = list(_connections_store.values())

        # Apply filters
        if connection_type:
            connections = [c for c in connections if c["connection_type"] == connection_type]
        if is_active is not None:
            connections = [c for c in connections if c["is_active"] == is_active]
        if use_in_livekit is not None:
            connections = [c for c in connections if c["use_in_livekit"] == use_in_livekit]
        if use_in_mcp is not None:
            connections = [c for c in connections if c["use_in_mcp"] == use_in_mcp]

        # Count by type
        by_type = {}
        active_count = 0
        for conn in _connections_store.values():
            conn_type = conn["connection_type"]
            by_type[conn_type] = by_type.get(conn_type, 0) + 1
            if conn["is_active"] and conn["status"] == ConnectionStatus.ACTIVE:
                active_count += 1

        # Build responses
        connection_responses = [
            LLMConnectionResponse(**{**c, "api_key_masked": mask_api_key(c.get("api_key"))})
            for c in connections
        ]

        return LLMConnectionListResponse(
            connections=connection_responses,
            total=len(connection_responses),
            by_type=by_type,
            active_count=active_count,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list connections: {str(e)}")


@router.get("/{connection_id}", response_model=LLMConnectionResponse)
async def get_connection(connection_id: str):
    """Get a specific LLM connection"""
    connection = _connections_store.get(connection_id)

    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    return LLMConnectionResponse(
        **{**connection, "api_key_masked": mask_api_key(connection.get("api_key"))}
    )


@router.patch("/{connection_id}", response_model=LLMConnectionResponse)
async def update_connection(connection_id: str, request: LLMConnectionUpdate):
    """Update an LLM connection"""
    connection = _connections_store.get(connection_id)

    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    # Update fields
    update_data = request.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if value is not None:
            connection[key] = value

    connection["updated_at"] = datetime.now()
    _connections_store[connection_id] = connection

    return LLMConnectionResponse(
        **{**connection, "api_key_masked": mask_api_key(connection.get("api_key"))}
    )


@router.delete("/{connection_id}")
async def delete_connection(connection_id: str):
    """Delete an LLM connection"""
    if connection_id not in _connections_store:
        raise HTTPException(status_code=404, detail="Connection not found")

    del _connections_store[connection_id]
    return {"message": f"Connection {connection_id} deleted successfully"}


@router.post("/{connection_id}/test", response_model=ConnectionTestResponse)
async def test_connection(connection_id: str, request: ConnectionTestRequest):
    """Test an LLM connection"""
    connection = _connections_store.get(connection_id)

    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    start_time = time.time()

    try:
        connection_type = connection["connection_type"]
        base_url = connection.get("base_url")
        api_key = connection.get("api_key")
        model_name = connection.get("model_name", "gpt-3.5-turbo")

        # Update status to testing
        connection["status"] = ConnectionStatus.TESTING
        _connections_store[connection_id] = connection

        async with httpx.AsyncClient(timeout=connection.get("timeout", 30)) as client:
            # Test based on connection type
            if connection_type == ConnectionType.LOCAL:
                # Test Ollama-style API
                if not base_url:
                    raise ValueError("Base URL required for local connection")

                response = await client.post(
                    f"{base_url}/api/generate",
                    json={
                        "model": model_name,
                        "prompt": request.prompt,
                        "stream": False,
                    },
                )
                response.raise_for_status()
                data = response.json()
                response_text = data.get("response", "")

            elif connection_type in [
                ConnectionType.OPENAI,
                ConnectionType.AZURE,
                ConnectionType.GROQ,
                ConnectionType.TOGETHER,
                ConnectionType.REMOTE,
            ]:
                # Test OpenAI-compatible API
                if not base_url:
                    raise ValueError("Base URL required")

                headers = {"Content-Type": "application/json"}
                if api_key:
                    headers["Authorization"] = f"Bearer {api_key}"
                if connection.get("organization_id"):
                    headers["OpenAI-Organization"] = connection["organization_id"]

                response = await client.post(
                    f"{base_url}/chat/completions"
                    if "/chat/completions" not in base_url
                    else base_url,
                    headers=headers,
                    json={
                        "model": model_name,
                        "messages": [{"role": "user", "content": request.prompt}],
                        "max_tokens": request.max_tokens,
                    },
                )
                response.raise_for_status()
                data = response.json()
                response_text = data["choices"][0]["message"]["content"]

            elif connection_type == ConnectionType.ANTHROPIC:
                # Test Anthropic API
                if not api_key:
                    raise ValueError("API key required for Anthropic")

                response = await client.post(
                    base_url or "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": api_key,
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": model_name or "claude-3-5-sonnet-20241022",
                        "max_tokens": request.max_tokens,
                        "messages": [{"role": "user", "content": request.prompt}],
                    },
                )
                response.raise_for_status()
                data = response.json()
                response_text = data["content"][0]["text"]

            else:
                raise ValueError(f"Unsupported connection type: {connection_type}")

        latency_ms = (time.time() - start_time) * 1000

        # Update connection status
        connection["status"] = ConnectionStatus.ACTIVE
        connection["last_tested_at"] = datetime.now()
        connection["health_check_failures"] = 0
        _connections_store[connection_id] = connection

        return ConnectionTestResponse(
            success=True,
            response_text=response_text[:200] if response_text else None,
            latency_ms=round(latency_ms, 2),
            model_used=model_name,
        )

    except httpx.TimeoutException:
        connection["status"] = ConnectionStatus.ERROR
        connection["health_check_failures"] = connection.get("health_check_failures", 0) + 1
        _connections_store[connection_id] = connection

        return ConnectionTestResponse(
            success=False,
            error="Connection timeout",
        )

    except Exception as e:
        connection["status"] = ConnectionStatus.ERROR
        connection["health_check_failures"] = connection.get("health_check_failures", 0) + 1
        _connections_store[connection_id] = connection

        return ConnectionTestResponse(
            success=False,
            error=str(e),
        )


@router.post("/{connection_id}/activate")
async def activate_connection(connection_id: str):
    """Activate a connection"""
    connection = _connections_store.get(connection_id)

    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    connection["is_active"] = True
    connection["updated_at"] = datetime.now()
    _connections_store[connection_id] = connection

    return {"message": "Connection activated"}


@router.post("/{connection_id}/deactivate")
async def deactivate_connection(connection_id: str):
    """Deactivate a connection"""
    connection = _connections_store.get(connection_id)

    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")

    connection["is_active"] = False
    connection["updated_at"] = datetime.now()
    _connections_store[connection_id] = connection

    return {"message": "Connection deactivated"}
