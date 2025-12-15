"""
Zabbix Connector
================
Native SDK-based Zabbix integration using pyzabbix library.
Communicates via JSON-RPC protocol.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

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
    RateLimitError,
)
from .registry import register_provider

logger = logging.getLogger(__name__)


@register_provider
class ZabbixConnector(ProviderBase):
    """
    Zabbix monitoring connector using native pyzabbix SDK.

    Uses JSON-RPC protocol for communication with Zabbix API.

    Supports:
    - Host management (list, get, create, update)
    - Problem/alert retrieval
    - Trigger management
    - Template operations
    - Graph/history data retrieval
    - Maintenance windows
    - User and user group management
    """

    def __init__(self, auth_config: Optional[AuthConfig] = None):
        super().__init__(auth_config)
        self._api = None
        self._base_url: Optional[str] = None

    # -------------------------------------------------------------------------
    # Metadata
    # -------------------------------------------------------------------------

    @classmethod
    def get_metadata(cls) -> ProviderMetadata:
        return ProviderMetadata(
            id="zabbix",
            name="Zabbix",
            description="Enterprise-class open source monitoring platform for networks and applications",
            version="1.0.0",
            icon_url="https://assets.zabbix.com/img/favicon.ico",
            documentation_url="https://www.zabbix.com/documentation/current/en/manual/api",
            categories=["monitoring", "infrastructure", "alerting"],
            tags=["monitoring", "metrics", "alerts", "infrastructure", "network", "observability"],
            protocol=ProtocolType.JSON_RPC,
            auth_schema=AuthSchemaDefinition(
                auth_type=AuthType.CUSTOM,
                fields=[
                    FieldDefinition(
                        name="url",
                        label="Zabbix Server URL",
                        type=FieldType.URL,
                        required=True,
                        description="URL to your Zabbix server API endpoint",
                        placeholder="https://zabbix.example.com/api_jsonrpc.php"
                    ),
                    FieldDefinition(
                        name="auth_method",
                        label="Authentication Method",
                        type=FieldType.SELECT,
                        required=True,
                        default="token",
                        description="Choose API Token (Zabbix 5.4+) or Username/Password",
                        options=[
                            {"value": "token", "label": "API Token (Recommended)"},
                            {"value": "password", "label": "Username/Password"},
                        ]
                    ),
                    FieldDefinition(
                        name="api_token",
                        label="API Token",
                        type=FieldType.PASSWORD,
                        required=False,
                        secret=True,
                        description="Zabbix API token (required if using token auth)"
                    ),
                    FieldDefinition(
                        name="username",
                        label="Username",
                        type=FieldType.STRING,
                        required=False,
                        description="Zabbix username (required if using password auth)"
                    ),
                    FieldDefinition(
                        name="password",
                        label="Password",
                        type=FieldType.PASSWORD,
                        required=False,
                        secret=True,
                        description="Zabbix password (required if using password auth)"
                    ),
                ]
            ),
            supports_webhooks=True,  # Zabbix supports media types for alerting
            base_url="https://zabbix.example.com"
        )

    # -------------------------------------------------------------------------
    # Actions
    # -------------------------------------------------------------------------

    def get_actions(self) -> List[ActionDefinition]:
        return [
            # Host Actions
            ActionDefinition(
                id="list_hosts",
                name="List Hosts",
                description="Get a list of all hosts",
                category="Hosts",
                inputs=[
                    FieldDefinition(
                        name="group_ids",
                        label="Host Group IDs",
                        type=FieldType.ARRAY,
                        required=False,
                        description="Filter by host group IDs"
                    ),
                    FieldDefinition(
                        name="search",
                        label="Search",
                        type=FieldType.STRING,
                        required=False,
                        description="Search hosts by name pattern"
                    ),
                    FieldDefinition(
                        name="limit",
                        label="Limit",
                        type=FieldType.INTEGER,
                        default=100,
                        min_value=1,
                        max_value=1000
                    ),
                ],
                outputs=[
                    FieldDefinition(name="hosts", label="Hosts", type=FieldType.ARRAY),
                    FieldDefinition(name="total", label="Total Count", type=FieldType.INTEGER),
                ],
                is_idempotent=True,
                is_batch_capable=True
            ),

            ActionDefinition(
                id="get_host",
                name="Get Host",
                description="Get detailed information about a specific host",
                category="Hosts",
                inputs=[
                    FieldDefinition(
                        name="host_id",
                        label="Host ID",
                        type=FieldType.STRING,
                        required=True,
                        description="Zabbix host ID"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="host", label="Host", type=FieldType.OBJECT),
                    FieldDefinition(name="interfaces", label="Interfaces", type=FieldType.ARRAY),
                    FieldDefinition(name="groups", label="Host Groups", type=FieldType.ARRAY),
                    FieldDefinition(name="templates", label="Templates", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="create_host",
                name="Create Host",
                description="Create a new host in Zabbix",
                category="Hosts",
                inputs=[
                    FieldDefinition(
                        name="host",
                        label="Host Name",
                        type=FieldType.STRING,
                        required=True,
                        description="Technical name of the host"
                    ),
                    FieldDefinition(
                        name="name",
                        label="Visible Name",
                        type=FieldType.STRING,
                        required=False,
                        description="Visible name (defaults to host name)"
                    ),
                    FieldDefinition(
                        name="group_ids",
                        label="Host Group IDs",
                        type=FieldType.ARRAY,
                        required=True,
                        description="IDs of host groups to add the host to"
                    ),
                    FieldDefinition(
                        name="ip",
                        label="IP Address",
                        type=FieldType.STRING,
                        required=True,
                        description="IP address for agent interface"
                    ),
                    FieldDefinition(
                        name="port",
                        label="Port",
                        type=FieldType.INTEGER,
                        default=10050,
                        description="Agent port"
                    ),
                    FieldDefinition(
                        name="template_ids",
                        label="Template IDs",
                        type=FieldType.ARRAY,
                        required=False,
                        description="IDs of templates to link"
                    ),
                    FieldDefinition(
                        name="description",
                        label="Description",
                        type=FieldType.TEXT,
                        required=False
                    ),
                ],
                outputs=[
                    FieldDefinition(name="host_id", label="Host ID", type=FieldType.STRING),
                ],
                is_idempotent=False
            ),

            ActionDefinition(
                id="enable_host",
                name="Enable Host",
                description="Enable monitoring for a host",
                category="Hosts",
                inputs=[
                    FieldDefinition(
                        name="host_id",
                        label="Host ID",
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
                id="disable_host",
                name="Disable Host",
                description="Disable monitoring for a host",
                category="Hosts",
                inputs=[
                    FieldDefinition(
                        name="host_id",
                        label="Host ID",
                        type=FieldType.STRING,
                        required=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="success", label="Success", type=FieldType.BOOLEAN),
                ],
                is_idempotent=True
            ),

            # Problems/Alerts Actions
            ActionDefinition(
                id="list_problems",
                name="List Problems",
                description="Get current problems/alerts",
                category="Problems",
                inputs=[
                    FieldDefinition(
                        name="host_ids",
                        label="Host IDs",
                        type=FieldType.ARRAY,
                        required=False,
                        description="Filter by host IDs"
                    ),
                    FieldDefinition(
                        name="severity_min",
                        label="Minimum Severity",
                        type=FieldType.SELECT,
                        options=[
                            {"value": "0", "label": "Not classified"},
                            {"value": "1", "label": "Information"},
                            {"value": "2", "label": "Warning"},
                            {"value": "3", "label": "Average"},
                            {"value": "4", "label": "High"},
                            {"value": "5", "label": "Disaster"},
                        ],
                        default="0"
                    ),
                    FieldDefinition(
                        name="acknowledged",
                        label="Acknowledged",
                        type=FieldType.SELECT,
                        options=[
                            {"value": "all", "label": "All"},
                            {"value": "true", "label": "Acknowledged only"},
                            {"value": "false", "label": "Unacknowledged only"},
                        ],
                        default="all"
                    ),
                    FieldDefinition(
                        name="limit",
                        label="Limit",
                        type=FieldType.INTEGER,
                        default=100,
                        min_value=1,
                        max_value=1000
                    ),
                ],
                outputs=[
                    FieldDefinition(name="problems", label="Problems", type=FieldType.ARRAY),
                    FieldDefinition(name="total", label="Total Count", type=FieldType.INTEGER),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="acknowledge_problem",
                name="Acknowledge Problem",
                description="Acknowledge a problem/alert",
                category="Problems",
                inputs=[
                    FieldDefinition(
                        name="event_ids",
                        label="Event IDs",
                        type=FieldType.ARRAY,
                        required=True,
                        description="IDs of events to acknowledge"
                    ),
                    FieldDefinition(
                        name="message",
                        label="Message",
                        type=FieldType.TEXT,
                        required=False,
                        description="Acknowledgment message"
                    ),
                    FieldDefinition(
                        name="close",
                        label="Close Problem",
                        type=FieldType.BOOLEAN,
                        default=False,
                        description="Also close the problem"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="success", label="Success", type=FieldType.BOOLEAN),
                    FieldDefinition(name="event_ids", label="Acknowledged Event IDs", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),

            # Host Groups Actions
            ActionDefinition(
                id="list_host_groups",
                name="List Host Groups",
                description="Get a list of host groups",
                category="Host Groups",
                inputs=[
                    FieldDefinition(
                        name="search",
                        label="Search",
                        type=FieldType.STRING,
                        required=False
                    ),
                ],
                outputs=[
                    FieldDefinition(name="groups", label="Host Groups", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),

            # Templates Actions
            ActionDefinition(
                id="list_templates",
                name="List Templates",
                description="Get a list of templates",
                category="Templates",
                inputs=[
                    FieldDefinition(
                        name="search",
                        label="Search",
                        type=FieldType.STRING,
                        required=False
                    ),
                ],
                outputs=[
                    FieldDefinition(name="templates", label="Templates", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),

            ActionDefinition(
                id="link_template",
                name="Link Template to Host",
                description="Link a template to a host",
                category="Templates",
                inputs=[
                    FieldDefinition(
                        name="host_id",
                        label="Host ID",
                        type=FieldType.STRING,
                        required=True
                    ),
                    FieldDefinition(
                        name="template_ids",
                        label="Template IDs",
                        type=FieldType.ARRAY,
                        required=True
                    ),
                ],
                outputs=[
                    FieldDefinition(name="success", label="Success", type=FieldType.BOOLEAN),
                ],
                is_idempotent=True
            ),

            # Triggers Actions
            ActionDefinition(
                id="list_triggers",
                name="List Triggers",
                description="Get triggers for hosts",
                category="Triggers",
                inputs=[
                    FieldDefinition(
                        name="host_ids",
                        label="Host IDs",
                        type=FieldType.ARRAY,
                        required=False
                    ),
                    FieldDefinition(
                        name="only_active",
                        label="Only Active",
                        type=FieldType.BOOLEAN,
                        default=True,
                        description="Only return triggers in problem state"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="triggers", label="Triggers", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),

            # Maintenance Actions
            ActionDefinition(
                id="create_maintenance",
                name="Create Maintenance Window",
                description="Create a maintenance period",
                category="Maintenance",
                inputs=[
                    FieldDefinition(
                        name="name",
                        label="Name",
                        type=FieldType.STRING,
                        required=True
                    ),
                    FieldDefinition(
                        name="host_ids",
                        label="Host IDs",
                        type=FieldType.ARRAY,
                        required=False
                    ),
                    FieldDefinition(
                        name="group_ids",
                        label="Host Group IDs",
                        type=FieldType.ARRAY,
                        required=False
                    ),
                    FieldDefinition(
                        name="active_since",
                        label="Start Time",
                        type=FieldType.DATETIME,
                        required=True,
                        description="Maintenance start time (Unix timestamp)"
                    ),
                    FieldDefinition(
                        name="active_till",
                        label="End Time",
                        type=FieldType.DATETIME,
                        required=True,
                        description="Maintenance end time (Unix timestamp)"
                    ),
                    FieldDefinition(
                        name="description",
                        label="Description",
                        type=FieldType.TEXT,
                        required=False
                    ),
                ],
                outputs=[
                    FieldDefinition(name="maintenance_id", label="Maintenance ID", type=FieldType.STRING),
                ],
                is_idempotent=False
            ),

            # History/Metrics Actions
            ActionDefinition(
                id="get_history",
                name="Get Item History",
                description="Get historical data for items",
                category="History",
                inputs=[
                    FieldDefinition(
                        name="item_ids",
                        label="Item IDs",
                        type=FieldType.ARRAY,
                        required=True
                    ),
                    FieldDefinition(
                        name="history_type",
                        label="History Type",
                        type=FieldType.SELECT,
                        options=[
                            {"value": "0", "label": "Float"},
                            {"value": "1", "label": "Character"},
                            {"value": "2", "label": "Log"},
                            {"value": "3", "label": "Unsigned integer"},
                            {"value": "4", "label": "Text"},
                        ],
                        default="0"
                    ),
                    FieldDefinition(
                        name="time_from",
                        label="Time From",
                        type=FieldType.DATETIME,
                        required=False,
                        description="Start time (Unix timestamp)"
                    ),
                    FieldDefinition(
                        name="time_till",
                        label="Time Till",
                        type=FieldType.DATETIME,
                        required=False,
                        description="End time (Unix timestamp)"
                    ),
                    FieldDefinition(
                        name="limit",
                        label="Limit",
                        type=FieldType.INTEGER,
                        default=100,
                        min_value=1,
                        max_value=10000
                    ),
                ],
                outputs=[
                    FieldDefinition(name="history", label="History", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),

            # API Info
            ActionDefinition(
                id="get_api_info",
                name="Get API Info",
                description="Get Zabbix API version information",
                category="System",
                inputs=[],
                outputs=[
                    FieldDefinition(name="version", label="API Version", type=FieldType.STRING),
                ],
                is_idempotent=True
            ),
        ]

    # -------------------------------------------------------------------------
    # Triggers
    # -------------------------------------------------------------------------

    def get_triggers(self) -> List[TriggerDefinition]:
        return [
            TriggerDefinition(
                id="new_problems",
                name="New Problems",
                description="Poll for new problems/alerts",
                trigger_type=TriggerType.POLLING,
                outputs=[
                    FieldDefinition(name="problems", label="Problems", type=FieldType.ARRAY),
                ],
                config_fields=[
                    FieldDefinition(
                        name="severity_min",
                        label="Minimum Severity",
                        type=FieldType.SELECT,
                        options=[
                            {"value": "0", "label": "Not classified"},
                            {"value": "1", "label": "Information"},
                            {"value": "2", "label": "Warning"},
                            {"value": "3", "label": "Average"},
                            {"value": "4", "label": "High"},
                            {"value": "5", "label": "Disaster"},
                        ],
                        default="2"
                    ),
                    FieldDefinition(
                        name="host_group_ids",
                        label="Host Group IDs",
                        type=FieldType.ARRAY,
                        required=False,
                        description="Limit to specific host groups"
                    ),
                ],
                default_poll_interval_seconds=60,
                min_poll_interval_seconds=30
            ),

            TriggerDefinition(
                id="host_status_change",
                name="Host Status Change",
                description="Poll for host availability changes",
                trigger_type=TriggerType.POLLING,
                outputs=[
                    FieldDefinition(name="hosts", label="Changed Hosts", type=FieldType.ARRAY),
                ],
                config_fields=[
                    FieldDefinition(
                        name="host_group_ids",
                        label="Host Group IDs",
                        type=FieldType.ARRAY,
                        required=False
                    ),
                ],
                default_poll_interval_seconds=120,
                min_poll_interval_seconds=60
            ),
        ]

    # -------------------------------------------------------------------------
    # Authentication
    # -------------------------------------------------------------------------

    async def authenticate(self) -> bool:
        """Authenticate with Zabbix API using pyzabbix.

        Supports two authentication methods:
        - API Token (Zabbix 5.4+): Recommended, uses api_token field
        - Username/Password: Traditional login method
        """
        if not self.auth_config:
            raise AuthenticationError("No authentication config provided")

        url = self.auth_config.credentials.get("url")
        auth_method = self.auth_config.credentials.get("auth_method", "password")
        api_token = self.auth_config.credentials.get("api_token")
        username = self.auth_config.credentials.get("username")
        password = self.auth_config.credentials.get("password")

        if not url:
            raise AuthenticationError("Zabbix Server URL is required")

        self._base_url = url

        try:
            from pyzabbix import ZabbixAPI

            self._api = ZabbixAPI(url)

            if auth_method == "token":
                # API Token authentication (Zabbix 5.4+)
                if not api_token:
                    raise AuthenticationError("API Token is required when using token authentication")
                # pyzabbix supports token auth by setting the auth token directly
                self._api.auth = api_token
                # Verify the token works by making a simple API call
                self._api.api_version()
                logger.info(f"Authenticated with Zabbix API using API token")
            else:
                # Username/Password authentication
                if not username or not password:
                    raise AuthenticationError("Username and password are required when using password authentication")
                self._api.login(username, password)
                logger.info(f"Authenticated with Zabbix API {self._api.api_version()} using username/password")

            self._authenticated = True
            return True

        except ImportError:
            raise AuthenticationError("pyzabbix library not installed. Run: pip install pyzabbix")
        except Exception as e:
            raise AuthenticationError(f"Zabbix authentication failed: {str(e)}")

    async def test_connection(self) -> ExecutionResult:
        """Test connection to Zabbix API"""
        try:
            await self.authenticate()
            version = self._api.api_version()
            auth_method = self.auth_config.credentials.get("auth_method", "password")
            return ExecutionResult(
                success=True,
                data={
                    "message": "Connection successful",
                    "version": version,
                    "url": self._base_url,
                    "auth_method": "API Token" if auth_method == "token" else "Username/Password"
                }
            )
        except AuthenticationError as e:
            return ExecutionResult(success=False, error_message=str(e), error_code="AUTH_FAILED")
        except Exception as e:
            return ExecutionResult(success=False, error_message=str(e), error_code="CONNECTION_ERROR")

    # -------------------------------------------------------------------------
    # Action Execution
    # -------------------------------------------------------------------------

    async def execute_action(
        self,
        action_id: str,
        inputs: Dict[str, Any],
        context: ExecutionContext
    ) -> ExecutionResult:
        """Execute a Zabbix action"""
        import time
        start_time = time.time()

        await self.ensure_authenticated()

        try:
            # Route to appropriate handler
            handlers = {
                "list_hosts": self._list_hosts,
                "get_host": self._get_host,
                "create_host": self._create_host,
                "enable_host": self._enable_host,
                "disable_host": self._disable_host,
                "list_problems": self._list_problems,
                "acknowledge_problem": self._acknowledge_problem,
                "list_host_groups": self._list_host_groups,
                "list_templates": self._list_templates,
                "link_template": self._link_template,
                "list_triggers": self._list_triggers,
                "create_maintenance": self._create_maintenance,
                "get_history": self._get_history,
                "get_api_info": self._get_api_info,
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

        except Exception as e:
            logger.exception(f"Error executing {action_id}")
            return ExecutionResult(
                success=False,
                error_message=str(e),
                error_code="EXECUTION_ERROR",
                execution_time_ms=int((time.time() - start_time) * 1000)
            )

    # -------------------------------------------------------------------------
    # Action Handlers
    # -------------------------------------------------------------------------

    async def _list_hosts(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """List all hosts"""
        params = {
            "output": ["hostid", "host", "name", "status", "description", "available"],
            "selectInterfaces": ["ip", "dns", "port", "type"],
            "selectGroups": ["groupid", "name"],
            "limit": inputs.get("limit", 100),
        }

        if inputs.get("group_ids"):
            params["groupids"] = inputs["group_ids"]

        if inputs.get("search"):
            params["search"] = {"name": inputs["search"]}
            params["searchWildcardsEnabled"] = True

        hosts = self._api.host.get(**params)

        return ExecutionResult(
            success=True,
            data={
                "hosts": hosts,
                "total": len(hosts)
            },
            raw_response={"hosts": hosts}
        )

    async def _get_host(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Get detailed host information"""
        hosts = self._api.host.get(
            hostids=inputs["host_id"],
            output="extend",
            selectInterfaces="extend",
            selectGroups="extend",
            selectParentTemplates=["templateid", "name"],
        )

        if not hosts:
            return ExecutionResult(
                success=False,
                error_message=f"Host not found: {inputs['host_id']}",
                error_code="NOT_FOUND"
            )

        host = hosts[0]
        return ExecutionResult(
            success=True,
            data={
                "host": host,
                "interfaces": host.get("interfaces", []),
                "groups": host.get("groups", []),
                "templates": host.get("parentTemplates", []),
            },
            raw_response=host
        )

    async def _create_host(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Create a new host"""
        host_params = {
            "host": inputs["host"],
            "groups": [{"groupid": gid} for gid in inputs["group_ids"]],
            "interfaces": [{
                "type": 1,  # Agent
                "main": 1,
                "useip": 1,
                "ip": inputs["ip"],
                "dns": "",
                "port": str(inputs.get("port", 10050)),
            }],
        }

        if inputs.get("name"):
            host_params["name"] = inputs["name"]

        if inputs.get("template_ids"):
            host_params["templates"] = [{"templateid": tid} for tid in inputs["template_ids"]]

        if inputs.get("description"):
            host_params["description"] = inputs["description"]

        result = self._api.host.create(**host_params)

        return ExecutionResult(
            success=True,
            data={"host_id": result["hostids"][0]},
            raw_response=result
        )

    async def _enable_host(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Enable a host"""
        result = self._api.host.update(
            hostid=inputs["host_id"],
            status=0  # 0 = enabled
        )
        return ExecutionResult(
            success=True,
            data={"success": True},
            raw_response=result
        )

    async def _disable_host(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Disable a host"""
        result = self._api.host.update(
            hostid=inputs["host_id"],
            status=1  # 1 = disabled
        )
        return ExecutionResult(
            success=True,
            data={"success": True},
            raw_response=result
        )

    async def _list_problems(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """List current problems"""
        params = {
            "output": "extend",
            "selectHosts": ["hostid", "name"],
            "selectTags": "extend",
            "sortfield": ["eventid"],
            "sortorder": "DESC",
            "limit": inputs.get("limit", 100),
            "recent": True,
        }

        if inputs.get("host_ids"):
            params["hostids"] = inputs["host_ids"]

        if inputs.get("severity_min"):
            params["severities"] = list(range(int(inputs["severity_min"]), 6))

        acknowledged = inputs.get("acknowledged", "all")
        if acknowledged == "true":
            params["acknowledged"] = True
        elif acknowledged == "false":
            params["acknowledged"] = False

        problems = self._api.problem.get(**params)

        return ExecutionResult(
            success=True,
            data={
                "problems": problems,
                "total": len(problems)
            },
            raw_response={"problems": problems}
        )

    async def _acknowledge_problem(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Acknowledge problems"""
        params = {
            "eventids": inputs["event_ids"],
            "action": 6,  # 2=acknowledge, 4=add message, so 6=both
        }

        if inputs.get("message"):
            params["message"] = inputs["message"]

        if inputs.get("close"):
            params["action"] = 7  # Add close problem (1)

        result = self._api.event.acknowledge(**params)

        return ExecutionResult(
            success=True,
            data={
                "success": True,
                "event_ids": result.get("eventids", inputs["event_ids"])
            },
            raw_response=result
        )

    async def _list_host_groups(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """List host groups"""
        params = {
            "output": ["groupid", "name", "flags"],
        }

        if inputs.get("search"):
            params["search"] = {"name": inputs["search"]}
            params["searchWildcardsEnabled"] = True

        groups = self._api.hostgroup.get(**params)

        return ExecutionResult(
            success=True,
            data={"groups": groups},
            raw_response={"groups": groups}
        )

    async def _list_templates(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """List templates"""
        params = {
            "output": ["templateid", "host", "name", "description"],
        }

        if inputs.get("search"):
            params["search"] = {"name": inputs["search"]}
            params["searchWildcardsEnabled"] = True

        templates = self._api.template.get(**params)

        return ExecutionResult(
            success=True,
            data={"templates": templates},
            raw_response={"templates": templates}
        )

    async def _link_template(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Link templates to a host"""
        result = self._api.host.update(
            hostid=inputs["host_id"],
            templates=[{"templateid": tid} for tid in inputs["template_ids"]]
        )

        return ExecutionResult(
            success=True,
            data={"success": True},
            raw_response=result
        )

    async def _list_triggers(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """List triggers"""
        params = {
            "output": ["triggerid", "description", "priority", "value", "status", "state"],
            "selectHosts": ["hostid", "name"],
            "expandDescription": True,
        }

        if inputs.get("host_ids"):
            params["hostids"] = inputs["host_ids"]

        if inputs.get("only_active", True):
            params["only_true"] = True  # Only in problem state

        triggers = self._api.trigger.get(**params)

        return ExecutionResult(
            success=True,
            data={"triggers": triggers},
            raw_response={"triggers": triggers}
        )

    async def _create_maintenance(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Create a maintenance window"""
        # Convert datetime strings to Unix timestamps if needed
        active_since = inputs["active_since"]
        active_till = inputs["active_till"]

        if isinstance(active_since, str):
            active_since = int(datetime.fromisoformat(active_since.replace("Z", "+00:00")).timestamp())
        if isinstance(active_till, str):
            active_till = int(datetime.fromisoformat(active_till.replace("Z", "+00:00")).timestamp())

        params = {
            "name": inputs["name"],
            "active_since": active_since,
            "active_till": active_till,
            "timeperiods": [{
                "timeperiod_type": 0,  # One-time
                "start_date": active_since,
                "period": active_till - active_since,
            }],
        }

        if inputs.get("host_ids"):
            params["hostids"] = inputs["host_ids"]

        if inputs.get("group_ids"):
            params["groupids"] = inputs["group_ids"]

        if inputs.get("description"):
            params["description"] = inputs["description"]

        result = self._api.maintenance.create(**params)

        return ExecutionResult(
            success=True,
            data={"maintenance_id": result["maintenanceids"][0]},
            raw_response=result
        )

    async def _get_history(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Get item history"""
        params = {
            "itemids": inputs["item_ids"],
            "history": int(inputs.get("history_type", 0)),
            "sortfield": "clock",
            "sortorder": "DESC",
            "limit": inputs.get("limit", 100),
            "output": "extend",
        }

        if inputs.get("time_from"):
            time_from = inputs["time_from"]
            if isinstance(time_from, str):
                time_from = int(datetime.fromisoformat(time_from.replace("Z", "+00:00")).timestamp())
            params["time_from"] = time_from

        if inputs.get("time_till"):
            time_till = inputs["time_till"]
            if isinstance(time_till, str):
                time_till = int(datetime.fromisoformat(time_till.replace("Z", "+00:00")).timestamp())
            params["time_till"] = time_till

        history = self._api.history.get(**params)

        return ExecutionResult(
            success=True,
            data={"history": history},
            raw_response={"history": history}
        )

    async def _get_api_info(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Get API version info"""
        version = self._api.api_version()
        return ExecutionResult(
            success=True,
            data={"version": version}
        )

    # -------------------------------------------------------------------------
    # Polling Triggers
    # -------------------------------------------------------------------------

    async def poll_trigger(
        self,
        trigger_id: str,
        config: Dict[str, Any],
        last_poll_state: Optional[Dict[str, Any]] = None
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Poll for trigger events"""
        await self.ensure_authenticated()

        if trigger_id == "new_problems":
            return await self._poll_new_problems(config, last_poll_state)
        elif trigger_id == "host_status_change":
            return await self._poll_host_status(config, last_poll_state)

        return [], last_poll_state or {}

    async def _poll_new_problems(
        self,
        config: Dict[str, Any],
        last_poll_state: Optional[Dict[str, Any]]
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Poll for new problems since last check"""
        last_event_id = last_poll_state.get("last_event_id") if last_poll_state else None

        params = {
            "output": "extend",
            "selectHosts": ["hostid", "name"],
            "selectTags": "extend",
            "sortfield": ["eventid"],
            "sortorder": "ASC",
            "recent": True,
        }

        if config.get("severity_min"):
            params["severities"] = list(range(int(config["severity_min"]), 6))

        if config.get("host_group_ids"):
            params["groupids"] = config["host_group_ids"]

        if last_event_id:
            params["eventid_from"] = int(last_event_id) + 1

        problems = self._api.problem.get(**params)

        # Update state with highest event ID
        new_state = last_poll_state.copy() if last_poll_state else {}
        if problems:
            new_state["last_event_id"] = max(int(p["eventid"]) for p in problems)

        return problems, new_state

    async def _poll_host_status(
        self,
        config: Dict[str, Any],
        last_poll_state: Optional[Dict[str, Any]]
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Poll for host availability changes"""
        last_statuses = last_poll_state.get("host_statuses", {}) if last_poll_state else {}

        params = {
            "output": ["hostid", "name", "status", "available"],
        }

        if config.get("host_group_ids"):
            params["groupids"] = config["host_group_ids"]

        hosts = self._api.host.get(**params)

        # Find changed hosts
        changed = []
        current_statuses = {}

        for host in hosts:
            host_id = host["hostid"]
            current_status = f"{host['status']}_{host['available']}"
            current_statuses[host_id] = current_status

            if last_statuses.get(host_id) and last_statuses[host_id] != current_status:
                changed.append({
                    **host,
                    "previous_status": last_statuses[host_id],
                    "current_status": current_status,
                })

        new_state = {"host_statuses": current_statuses}

        return changed, new_state

    # -------------------------------------------------------------------------
    # Dynamic Options
    # -------------------------------------------------------------------------

    async def get_dynamic_options(
        self,
        field_name: str,
        depends_on_values: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Fetch dynamic options for fields"""
        await self.ensure_authenticated()

        if field_name == "host_ids" or field_name == "host_id":
            hosts = self._api.host.get(output=["hostid", "name"], limit=1000)
            return [{"value": h["hostid"], "label": h["name"]} for h in hosts]

        if field_name == "group_ids":
            groups = self._api.hostgroup.get(output=["groupid", "name"])
            return [{"value": g["groupid"], "label": g["name"]} for g in groups]

        if field_name == "template_ids":
            templates = self._api.template.get(output=["templateid", "name"])
            return [{"value": t["templateid"], "label": t["name"]} for t in templates]

        return []

    # -------------------------------------------------------------------------
    # Cleanup
    # -------------------------------------------------------------------------

    async def close(self):
        """Logout and cleanup"""
        if self._api:
            try:
                self._api.user.logout()
            except Exception:
                pass
            self._api = None
