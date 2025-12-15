"""
Portainer Connector
===================
Native connector for Portainer container management platform.
Uses REST API with JWT or API Key authentication.
"""

from typing import Dict, Any, List, Optional
import logging
import httpx

from .base import (
    ProviderBase,
    ProviderMetadata,
    AuthConfig,
    AuthType,
    AuthSchemaDefinition,
    ActionDefinition,
    TriggerDefinition,
    TriggerType,
    FieldDefinition,
    FieldType,
    ProtocolType,
    ExecutionContext,
    ExecutionResult,
    AuthenticationError,
)
from .registry import register_provider

logger = logging.getLogger(__name__)


@register_provider
class PortainerConnector(ProviderBase):
    """
    Portainer container management connector.

    Supports:
    - Endpoint (environment) management
    - Container management (list, start, stop, restart, remove)
    - Stack management (deploy, update, start, stop, remove)
    - Image management
    - Volume management
    - Network management
    - User and team management
    - Dashboard statistics
    """

    def __init__(self, auth_config: Optional[AuthConfig] = None):
        super().__init__(auth_config)
        self._base_url: Optional[str] = None
        self._token: Optional[str] = None
        self._client: Optional[httpx.AsyncClient] = None

    @classmethod
    def get_metadata(cls) -> ProviderMetadata:
        return ProviderMetadata(
            id="portainer",
            name="Portainer",
            description="Container management platform for Docker, Swarm, Kubernetes and ACI environments",
            version="1.0.0",
            icon_url="https://www.portainer.io/hubfs/portainer-logo-black.svg",
            documentation_url="https://docs.portainer.io/api/docs",
            categories=["devops", "containers", "infrastructure"],
            tags=["docker", "kubernetes", "containers", "swarm", "devops", "orchestration"],
            protocol=ProtocolType.REST,
            auth_schema=AuthSchemaDefinition(
                auth_type=AuthType.CUSTOM,
                fields=[
                    FieldDefinition(
                        name="url",
                        label="Portainer URL",
                        type=FieldType.URL,
                        required=True,
                        description="URL to your Portainer instance",
                        placeholder="https://portainer.example.com"
                    ),
                    FieldDefinition(
                        name="auth_method",
                        label="Authentication Method",
                        type=FieldType.SELECT,
                        required=True,
                        default="api_key",
                        description="API Key (recommended) or Username/Password",
                        options=[
                            {"value": "api_key", "label": "API Key (Recommended)"},
                            {"value": "password", "label": "Username/Password"},
                        ]
                    ),
                    FieldDefinition(
                        name="api_key",
                        label="API Key",
                        type=FieldType.PASSWORD,
                        required=False,
                        secret=True,
                        description="Portainer API access token"
                    ),
                    FieldDefinition(
                        name="username",
                        label="Username",
                        type=FieldType.STRING,
                        required=False,
                        description="Portainer username"
                    ),
                    FieldDefinition(
                        name="password",
                        label="Password",
                        type=FieldType.PASSWORD,
                        required=False,
                        secret=True,
                        description="Portainer password"
                    ),
                ]
            ),
            supports_webhooks=True,
            base_url="https://portainer.example.com"
        )

    def get_actions(self) -> List[ActionDefinition]:
        return [
            # =====================================================================
            # Endpoint (Environment) Actions
            # =====================================================================
            ActionDefinition(
                id="list_endpoints",
                name="List Endpoints",
                description="List all Docker/Kubernetes environments",
                category="Endpoints",
                inputs=[
                    FieldDefinition(
                        name="limit",
                        label="Limit",
                        type=FieldType.INTEGER,
                        default=100
                    ),
                ],
                outputs=[
                    FieldDefinition(name="endpoints", label="Endpoints", type=FieldType.ARRAY),
                    FieldDefinition(name="total", label="Total", type=FieldType.INTEGER),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="get_endpoint",
                name="Get Endpoint",
                description="Get details of a specific endpoint",
                category="Endpoints",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="endpoint", label="Endpoint", type=FieldType.OBJECT),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="get_dashboard",
                name="Get Dashboard",
                description="Get dashboard statistics for an endpoint",
                category="Endpoints",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="containers", label="Container Stats", type=FieldType.OBJECT),
                    FieldDefinition(name="images", label="Image Stats", type=FieldType.OBJECT),
                    FieldDefinition(name="volumes", label="Volumes Count", type=FieldType.INTEGER),
                    FieldDefinition(name="networks", label="Networks Count", type=FieldType.INTEGER),
                    FieldDefinition(name="stacks", label="Stacks Count", type=FieldType.INTEGER),
                ],
                is_idempotent=True
            ),

            # =====================================================================
            # Container Actions
            # =====================================================================
            ActionDefinition(
                id="list_containers",
                name="List Containers",
                description="List all containers in an endpoint",
                category="Containers",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                    FieldDefinition(
                        name="all",
                        label="Include Stopped",
                        type=FieldType.BOOLEAN,
                        default=True,
                        description="Include stopped containers"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="containers", label="Containers", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="get_container",
                name="Get Container",
                description="Get details of a specific container",
                category="Containers",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                    FieldDefinition(
                        name="container_id",
                        label="Container ID",
                        type=FieldType.STRING,
                        required=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="container", label="Container", type=FieldType.OBJECT),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="start_container",
                name="Start Container",
                description="Start a stopped container",
                category="Containers",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                    FieldDefinition(
                        name="container_id",
                        label="Container ID",
                        type=FieldType.STRING,
                        required=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="success", label="Success", type=FieldType.BOOLEAN),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="stop_container",
                name="Stop Container",
                description="Stop a running container",
                category="Containers",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                    FieldDefinition(
                        name="container_id",
                        label="Container ID",
                        type=FieldType.STRING,
                        required=True
                    ),
                    FieldDefinition(
                        name="timeout",
                        label="Timeout (seconds)",
                        type=FieldType.INTEGER,
                        default=10,
                        description="Seconds to wait before killing the container"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="success", label="Success", type=FieldType.BOOLEAN),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="restart_container",
                name="Restart Container",
                description="Restart a container",
                category="Containers",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                    FieldDefinition(
                        name="container_id",
                        label="Container ID",
                        type=FieldType.STRING,
                        required=True
                    ),
                    FieldDefinition(
                        name="timeout",
                        label="Timeout (seconds)",
                        type=FieldType.INTEGER,
                        default=10
                    ),
                ],
                outputs=[
                    FieldDefinition(name="success", label="Success", type=FieldType.BOOLEAN),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="remove_container",
                name="Remove Container",
                description="Remove a container",
                category="Containers",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                    FieldDefinition(
                        name="container_id",
                        label="Container ID",
                        type=FieldType.STRING,
                        required=True
                    ),
                    FieldDefinition(
                        name="force",
                        label="Force",
                        type=FieldType.BOOLEAN,
                        default=False,
                        description="Force removal even if running"
                    ),
                    FieldDefinition(
                        name="volumes",
                        label="Remove Volumes",
                        type=FieldType.BOOLEAN,
                        default=False,
                        description="Remove associated volumes"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="success", label="Success", type=FieldType.BOOLEAN),
                ],
                is_idempotent=False
            ),

            ActionDefinition(
                id="get_container_logs",
                name="Get Container Logs",
                description="Get logs from a container",
                category="Containers",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                    FieldDefinition(
                        name="container_id",
                        label="Container ID",
                        type=FieldType.STRING,
                        required=True
                    ),
                    FieldDefinition(
                        name="tail",
                        label="Tail Lines",
                        type=FieldType.INTEGER,
                        default=100,
                        description="Number of lines from end"
                    ),
                    FieldDefinition(
                        name="timestamps",
                        label="Include Timestamps",
                        type=FieldType.BOOLEAN,
                        default=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="logs", label="Logs", type=FieldType.TEXT),
                ],
                is_idempotent=True
            ),

            # =====================================================================
            # Stack Actions
            # =====================================================================
            ActionDefinition(
                id="list_stacks",
                name="List Stacks",
                description="List all stacks",
                category="Stacks",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID (optional)",
                        type=FieldType.INTEGER,
                        required=False,
                        description="Filter by endpoint"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="stacks", label="Stacks", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="get_stack",
                name="Get Stack",
                description="Get details of a specific stack",
                category="Stacks",
                inputs=[
                    FieldDefinition(
                        name="stack_id",
                        label="Stack ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="stack", label="Stack", type=FieldType.OBJECT),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="start_stack",
                name="Start Stack",
                description="Start a stopped stack",
                category="Stacks",
                inputs=[
                    FieldDefinition(
                        name="stack_id",
                        label="Stack ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="success", label="Success", type=FieldType.BOOLEAN),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="stop_stack",
                name="Stop Stack",
                description="Stop a running stack",
                category="Stacks",
                inputs=[
                    FieldDefinition(
                        name="stack_id",
                        label="Stack ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="success", label="Success", type=FieldType.BOOLEAN),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="delete_stack",
                name="Delete Stack",
                description="Delete a stack",
                category="Stacks",
                inputs=[
                    FieldDefinition(
                        name="stack_id",
                        label="Stack ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="success", label="Success", type=FieldType.BOOLEAN),
                ],
                is_idempotent=False
            ),

            ActionDefinition(
                id="redeploy_stack",
                name="Redeploy Stack",
                description="Redeploy a git-based stack (pull latest and redeploy)",
                category="Stacks",
                inputs=[
                    FieldDefinition(
                        name="stack_id",
                        label="Stack ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                    FieldDefinition(
                        name="pull_image",
                        label="Pull Image",
                        type=FieldType.BOOLEAN,
                        default=True,
                        description="Pull latest images"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="success", label="Success", type=FieldType.BOOLEAN),
                ],
                is_idempotent=True
            ),

            # =====================================================================
            # Image Actions
            # =====================================================================
            ActionDefinition(
                id="list_images",
                name="List Images",
                description="List all images in an endpoint",
                category="Images",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="images", label="Images", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="remove_image",
                name="Remove Image",
                description="Remove an image",
                category="Images",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                    FieldDefinition(
                        name="image_id",
                        label="Image ID",
                        type=FieldType.STRING,
                        required=True
                    ),
                    FieldDefinition(
                        name="force",
                        label="Force",
                        type=FieldType.BOOLEAN,
                        default=False
                    ),
                ],
                outputs=[
                    FieldDefinition(name="success", label="Success", type=FieldType.BOOLEAN),
                ],
                is_idempotent=False
            ),

            # =====================================================================
            # Volume Actions
            # =====================================================================
            ActionDefinition(
                id="list_volumes",
                name="List Volumes",
                description="List all volumes in an endpoint",
                category="Volumes",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="volumes", label="Volumes", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),

            # =====================================================================
            # Network Actions
            # =====================================================================
            ActionDefinition(
                id="list_networks",
                name="List Networks",
                description="List all networks in an endpoint",
                category="Networks",
                inputs=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="networks", label="Networks", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),

            # =====================================================================
            # User Actions
            # =====================================================================
            ActionDefinition(
                id="list_users",
                name="List Users",
                description="List all Portainer users",
                category="Users",
                inputs=[],
                outputs=[
                    FieldDefinition(name="users", label="Users", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),

            # =====================================================================
            # System Actions
            # =====================================================================
            ActionDefinition(
                id="get_status",
                name="Get Status",
                description="Get Portainer system status",
                category="System",
                inputs=[],
                outputs=[
                    FieldDefinition(name="version", label="Version", type=FieldType.STRING),
                    FieldDefinition(name="instance_id", label="Instance ID", type=FieldType.STRING),
                ],
                is_idempotent=True
            ),
        ]

    def get_triggers(self) -> List[TriggerDefinition]:
        return [
            TriggerDefinition(
                id="container_status_change",
                name="Container Status Change",
                description="Poll for container status changes",
                trigger_type=TriggerType.POLLING,
                outputs=[
                    FieldDefinition(name="containers", label="Changed Containers", type=FieldType.ARRAY),
                ],
                config_fields=[
                    FieldDefinition(
                        name="endpoint_id",
                        label="Endpoint ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                ],
                default_poll_interval_seconds=60,
                min_poll_interval_seconds=30
            ),

            TriggerDefinition(
                id="stack_webhook",
                name="Stack Webhook",
                description="Webhook to trigger stack redeployment",
                trigger_type=TriggerType.WEBHOOK,
                outputs=[
                    FieldDefinition(name="stack_id", label="Stack ID", type=FieldType.INTEGER),
                    FieldDefinition(name="action", label="Action", type=FieldType.STRING),
                ],
                config_fields=[
                    FieldDefinition(
                        name="stack_id",
                        label="Stack ID",
                        type=FieldType.INTEGER,
                        required=True
                    ),
                ]
            ),
        ]

    # =========================================================================
    # Authentication
    # =========================================================================

    async def authenticate(self) -> bool:
        """Authenticate with Portainer API"""
        if not self.auth_config:
            raise AuthenticationError("No authentication config provided")

        url = self.auth_config.credentials.get("url", "").rstrip("/")
        auth_method = self.auth_config.credentials.get("auth_method", "api_key")

        if not url:
            raise AuthenticationError("Portainer URL is required")

        self._base_url = url

        # Create HTTP client
        self._client = httpx.AsyncClient(timeout=30.0, verify=True)

        if auth_method == "api_key":
            api_key = self.auth_config.credentials.get("api_key")
            if not api_key:
                raise AuthenticationError("API Key is required when using API Key authentication")
            self._token = api_key

        else:  # password auth
            username = self.auth_config.credentials.get("username")
            password = self.auth_config.credentials.get("password")

            if not username or not password:
                raise AuthenticationError("Username and password are required")

            try:
                response = await self._client.post(
                    f"{self._base_url}/api/auth",
                    json={"username": username, "password": password}
                )
                response.raise_for_status()
                data = response.json()
                self._token = data.get("jwt")
                if not self._token:
                    raise AuthenticationError("No JWT token in response")
            except httpx.HTTPStatusError as e:
                raise AuthenticationError(f"Authentication failed: {e.response.status_code}")
            except Exception as e:
                raise AuthenticationError(f"Authentication failed: {str(e)}")

        self._authenticated = True
        return True

    async def test_connection(self) -> ExecutionResult:
        """Test connection to Portainer"""
        try:
            await self.authenticate()

            # Get system status to verify connection
            response = await self._request("GET", "/api/status")

            return ExecutionResult(
                success=True,
                data={
                    "message": "Connection successful",
                    "version": response.get("Version", "Unknown"),
                    "instance_id": response.get("InstanceID", "Unknown"),
                    "url": self._base_url,
                }
            )
        except AuthenticationError as e:
            return ExecutionResult(success=False, error_message=str(e), error_code="AUTH_FAILED")
        except Exception as e:
            return ExecutionResult(success=False, error_message=str(e), error_code="CONNECTION_ERROR")

    # =========================================================================
    # HTTP Helper
    # =========================================================================

    async def _request(
        self,
        method: str,
        path: str,
        params: Dict[str, Any] = None,
        json_data: Dict[str, Any] = None,
    ) -> Dict[str, Any]:
        """Make authenticated request to Portainer API"""
        if not self._client:
            raise AuthenticationError("Not authenticated")

        headers = {"X-API-Key": self._token}

        url = f"{self._base_url}{path}"

        response = await self._client.request(
            method=method,
            url=url,
            headers=headers,
            params=params,
            json=json_data,
        )
        response.raise_for_status()

        if response.status_code == 204:
            return {}

        return response.json()

    # =========================================================================
    # Action Execution
    # =========================================================================

    async def execute_action(
        self,
        action_id: str,
        inputs: Dict[str, Any],
        context: ExecutionContext
    ) -> ExecutionResult:
        """Execute a Portainer action"""
        import time
        start_time = time.time()

        await self.ensure_authenticated()

        try:
            handlers = {
                "list_endpoints": self._list_endpoints,
                "get_endpoint": self._get_endpoint,
                "get_dashboard": self._get_dashboard,
                "list_containers": self._list_containers,
                "get_container": self._get_container,
                "start_container": self._start_container,
                "stop_container": self._stop_container,
                "restart_container": self._restart_container,
                "remove_container": self._remove_container,
                "get_container_logs": self._get_container_logs,
                "list_stacks": self._list_stacks,
                "get_stack": self._get_stack,
                "start_stack": self._start_stack,
                "stop_stack": self._stop_stack,
                "delete_stack": self._delete_stack,
                "redeploy_stack": self._redeploy_stack,
                "list_images": self._list_images,
                "remove_image": self._remove_image,
                "list_volumes": self._list_volumes,
                "list_networks": self._list_networks,
                "list_users": self._list_users,
                "get_status": self._get_status,
            }

            handler = handlers.get(action_id)
            if not handler:
                return ExecutionResult(
                    success=False,
                    error_message=f"Unknown action: {action_id}",
                    error_code="UNKNOWN_ACTION"
                )

            result = await handler(inputs)
            result.execution_time_ms = int((time.time() - start_time) * 1000)
            return result

        except httpx.HTTPStatusError as e:
            return ExecutionResult(
                success=False,
                error_message=f"API error: {e.response.status_code} - {e.response.text}",
                error_code="API_ERROR",
                execution_time_ms=int((time.time() - start_time) * 1000)
            )
        except Exception as e:
            logger.exception(f"Error executing {action_id}")
            return ExecutionResult(
                success=False,
                error_message=str(e),
                error_code="EXECUTION_ERROR",
                execution_time_ms=int((time.time() - start_time) * 1000)
            )

    # =========================================================================
    # Action Handlers - Endpoints
    # =========================================================================

    async def _list_endpoints(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """List all endpoints"""
        params = {"limit": inputs.get("limit", 100)}
        endpoints = await self._request("GET", "/api/endpoints", params=params)

        return ExecutionResult(
            success=True,
            data={
                "endpoints": endpoints,
                "total": len(endpoints)
            }
        )

    async def _get_endpoint(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Get endpoint details"""
        endpoint_id = inputs["endpoint_id"]
        endpoint = await self._request("GET", f"/api/endpoints/{endpoint_id}")

        return ExecutionResult(success=True, data={"endpoint": endpoint})

    async def _get_dashboard(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Get dashboard for endpoint"""
        endpoint_id = inputs["endpoint_id"]
        dashboard = await self._request("GET", f"/api/docker/{endpoint_id}/dashboard")

        return ExecutionResult(
            success=True,
            data={
                "containers": dashboard.get("containers", {}),
                "images": dashboard.get("images", {}),
                "volumes": dashboard.get("volumes", 0),
                "networks": dashboard.get("networks", 0),
                "stacks": dashboard.get("stacks", 0),
            }
        )

    # =========================================================================
    # Action Handlers - Containers
    # =========================================================================

    async def _list_containers(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """List containers"""
        endpoint_id = inputs["endpoint_id"]
        all_containers = inputs.get("all", True)

        params = {"all": "true" if all_containers else "false"}
        containers = await self._request(
            "GET",
            f"/api/endpoints/{endpoint_id}/docker/containers/json",
            params=params
        )

        return ExecutionResult(success=True, data={"containers": containers})

    async def _get_container(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Get container details"""
        endpoint_id = inputs["endpoint_id"]
        container_id = inputs["container_id"]

        container = await self._request(
            "GET",
            f"/api/endpoints/{endpoint_id}/docker/containers/{container_id}/json"
        )

        return ExecutionResult(success=True, data={"container": container})

    async def _start_container(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Start container"""
        endpoint_id = inputs["endpoint_id"]
        container_id = inputs["container_id"]

        await self._request(
            "POST",
            f"/api/endpoints/{endpoint_id}/docker/containers/{container_id}/start"
        )

        return ExecutionResult(success=True, data={"success": True})

    async def _stop_container(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Stop container"""
        endpoint_id = inputs["endpoint_id"]
        container_id = inputs["container_id"]
        timeout = inputs.get("timeout", 10)

        await self._request(
            "POST",
            f"/api/endpoints/{endpoint_id}/docker/containers/{container_id}/stop",
            params={"t": timeout}
        )

        return ExecutionResult(success=True, data={"success": True})

    async def _restart_container(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Restart container"""
        endpoint_id = inputs["endpoint_id"]
        container_id = inputs["container_id"]
        timeout = inputs.get("timeout", 10)

        await self._request(
            "POST",
            f"/api/endpoints/{endpoint_id}/docker/containers/{container_id}/restart",
            params={"t": timeout}
        )

        return ExecutionResult(success=True, data={"success": True})

    async def _remove_container(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Remove container"""
        endpoint_id = inputs["endpoint_id"]
        container_id = inputs["container_id"]
        force = inputs.get("force", False)
        volumes = inputs.get("volumes", False)

        params = {
            "force": "true" if force else "false",
            "v": "true" if volumes else "false",
        }

        await self._request(
            "DELETE",
            f"/api/endpoints/{endpoint_id}/docker/containers/{container_id}",
            params=params
        )

        return ExecutionResult(success=True, data={"success": True})

    async def _get_container_logs(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Get container logs"""
        endpoint_id = inputs["endpoint_id"]
        container_id = inputs["container_id"]
        tail = inputs.get("tail", 100)
        timestamps = inputs.get("timestamps", True)

        params = {
            "stdout": "true",
            "stderr": "true",
            "tail": str(tail),
            "timestamps": "true" if timestamps else "false",
        }

        # Logs endpoint returns plain text
        response = await self._client.get(
            f"{self._base_url}/api/endpoints/{endpoint_id}/docker/containers/{container_id}/logs",
            headers={"X-API-Key": self._token},
            params=params
        )
        response.raise_for_status()

        return ExecutionResult(success=True, data={"logs": response.text})

    # =========================================================================
    # Action Handlers - Stacks
    # =========================================================================

    async def _list_stacks(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """List stacks"""
        params = {}
        if inputs.get("endpoint_id"):
            params["filters"] = f'{{"EndpointID":{inputs["endpoint_id"]}}}'

        stacks = await self._request("GET", "/api/stacks", params=params)

        return ExecutionResult(success=True, data={"stacks": stacks})

    async def _get_stack(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Get stack details"""
        stack_id = inputs["stack_id"]
        stack = await self._request("GET", f"/api/stacks/{stack_id}")

        return ExecutionResult(success=True, data={"stack": stack})

    async def _start_stack(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Start stack"""
        stack_id = inputs["stack_id"]
        endpoint_id = inputs["endpoint_id"]

        await self._request(
            "POST",
            f"/api/stacks/{stack_id}/start",
            params={"endpointId": endpoint_id}
        )

        return ExecutionResult(success=True, data={"success": True})

    async def _stop_stack(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Stop stack"""
        stack_id = inputs["stack_id"]
        endpoint_id = inputs["endpoint_id"]

        await self._request(
            "POST",
            f"/api/stacks/{stack_id}/stop",
            params={"endpointId": endpoint_id}
        )

        return ExecutionResult(success=True, data={"success": True})

    async def _delete_stack(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Delete stack"""
        stack_id = inputs["stack_id"]
        endpoint_id = inputs["endpoint_id"]

        await self._request(
            "DELETE",
            f"/api/stacks/{stack_id}",
            params={"endpointId": endpoint_id}
        )

        return ExecutionResult(success=True, data={"success": True})

    async def _redeploy_stack(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Redeploy git-based stack"""
        stack_id = inputs["stack_id"]
        endpoint_id = inputs["endpoint_id"]
        pull_image = inputs.get("pull_image", True)

        await self._request(
            "PUT",
            f"/api/stacks/{stack_id}/git/redeploy",
            params={"endpointId": endpoint_id},
            json_data={"pullImage": pull_image}
        )

        return ExecutionResult(success=True, data={"success": True})

    # =========================================================================
    # Action Handlers - Images
    # =========================================================================

    async def _list_images(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """List images"""
        endpoint_id = inputs["endpoint_id"]

        images = await self._request(
            "GET",
            f"/api/endpoints/{endpoint_id}/docker/images/json"
        )

        return ExecutionResult(success=True, data={"images": images})

    async def _remove_image(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Remove image"""
        endpoint_id = inputs["endpoint_id"]
        image_id = inputs["image_id"]
        force = inputs.get("force", False)

        await self._request(
            "DELETE",
            f"/api/endpoints/{endpoint_id}/docker/images/{image_id}",
            params={"force": "true" if force else "false"}
        )

        return ExecutionResult(success=True, data={"success": True})

    # =========================================================================
    # Action Handlers - Volumes
    # =========================================================================

    async def _list_volumes(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """List volumes"""
        endpoint_id = inputs["endpoint_id"]

        response = await self._request(
            "GET",
            f"/api/endpoints/{endpoint_id}/docker/volumes"
        )

        return ExecutionResult(success=True, data={"volumes": response.get("Volumes", [])})

    # =========================================================================
    # Action Handlers - Networks
    # =========================================================================

    async def _list_networks(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """List networks"""
        endpoint_id = inputs["endpoint_id"]

        networks = await self._request(
            "GET",
            f"/api/endpoints/{endpoint_id}/docker/networks"
        )

        return ExecutionResult(success=True, data={"networks": networks})

    # =========================================================================
    # Action Handlers - Users
    # =========================================================================

    async def _list_users(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """List users"""
        users = await self._request("GET", "/api/users")

        return ExecutionResult(success=True, data={"users": users})

    # =========================================================================
    # Action Handlers - System
    # =========================================================================

    async def _get_status(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Get system status"""
        status = await self._request("GET", "/api/status")

        return ExecutionResult(
            success=True,
            data={
                "version": status.get("Version"),
                "instance_id": status.get("InstanceID"),
            }
        )

    # =========================================================================
    # Polling Triggers
    # =========================================================================

    async def poll_trigger(
        self,
        trigger_id: str,
        config: Dict[str, Any],
        last_poll_state: Optional[Dict[str, Any]] = None
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Poll for trigger events"""
        await self.ensure_authenticated()

        if trigger_id == "container_status_change":
            return await self._poll_container_status(config, last_poll_state)

        return [], last_poll_state or {}

    async def _poll_container_status(
        self,
        config: Dict[str, Any],
        last_poll_state: Optional[Dict[str, Any]]
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Poll for container status changes"""
        endpoint_id = config["endpoint_id"]
        last_statuses = last_poll_state.get("container_statuses", {}) if last_poll_state else {}

        containers = await self._request(
            "GET",
            f"/api/endpoints/{endpoint_id}/docker/containers/json",
            params={"all": "true"}
        )

        changed = []
        current_statuses = {}

        for container in containers:
            container_id = container["Id"][:12]
            current_status = container.get("State", "unknown")
            current_statuses[container_id] = current_status

            if last_statuses.get(container_id) and last_statuses[container_id] != current_status:
                changed.append({
                    "container_id": container_id,
                    "name": container.get("Names", [""])[0].lstrip("/"),
                    "previous_status": last_statuses[container_id],
                    "current_status": current_status,
                    "image": container.get("Image"),
                })

        new_state = {"container_statuses": current_statuses}

        return changed, new_state

    # =========================================================================
    # Dynamic Options
    # =========================================================================

    async def get_dynamic_options(
        self,
        field_name: str,
        depends_on_values: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Fetch dynamic options for fields"""
        await self.ensure_authenticated()

        if field_name == "endpoint_id":
            endpoints = await self._request("GET", "/api/endpoints")
            return [
                {"value": str(e["Id"]), "label": e.get("Name", f"Endpoint {e['Id']}")}
                for e in endpoints
            ]

        if field_name == "stack_id":
            stacks = await self._request("GET", "/api/stacks")
            return [
                {"value": str(s["Id"]), "label": s.get("Name", f"Stack {s['Id']}")}
                for s in stacks
            ]

        if field_name == "container_id" and depends_on_values.get("endpoint_id"):
            endpoint_id = depends_on_values["endpoint_id"]
            containers = await self._request(
                "GET",
                f"/api/endpoints/{endpoint_id}/docker/containers/json",
                params={"all": "true"}
            )
            return [
                {"value": c["Id"][:12], "label": c.get("Names", [""])[0].lstrip("/")}
                for c in containers
            ]

        return []

    # =========================================================================
    # Cleanup
    # =========================================================================

    async def close(self):
        """Cleanup resources"""
        if self._client:
            await self._client.aclose()
            self._client = None
