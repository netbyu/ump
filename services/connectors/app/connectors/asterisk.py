"""
Asterisk AMI Connector
======================
Integration with Asterisk PBX via AMI (Asterisk Manager Interface).
"""

from typing import Dict, Any, List, Optional
import asyncio
import logging
from datetime import datetime

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


class AMIProtocol:
    """Simple AMI protocol handler"""
    
    def __init__(self, host: str, port: int = 5038):
        self.host = host
        self.port = port
        self._reader: Optional[asyncio.StreamReader] = None
        self._writer: Optional[asyncio.StreamWriter] = None
        self._action_id = 0
        self._connected = False
    
    async def connect(self) -> bool:
        """Establish TCP connection to AMI"""
        try:
            self._reader, self._writer = await asyncio.wait_for(
                asyncio.open_connection(self.host, self.port),
                timeout=10.0
            )
            
            # Read AMI banner
            banner = await self._read_line()
            if not banner.startswith("Asterisk Call Manager"):
                raise ConnectionError(f"Unexpected AMI banner: {banner}")
            
            self._connected = True
            return True
            
        except Exception as e:
            logger.error(f"AMI connection failed: {e}")
            raise ConnectionError(f"Failed to connect to AMI at {self.host}:{self.port}: {e}")
    
    async def disconnect(self):
        """Close AMI connection"""
        if self._writer:
            try:
                await self.send_action("Logoff")
            except:
                pass
            self._writer.close()
            await self._writer.wait_closed()
        self._connected = False
    
    async def login(self, username: str, secret: str) -> Dict[str, str]:
        """Login to AMI"""
        response = await self.send_action("Login", {
            "Username": username,
            "Secret": secret
        })
        
        if response.get("Response") != "Success":
            raise AuthenticationError(f"AMI login failed: {response.get('Message', 'Unknown error')}")
        
        return response
    
    async def send_action(self, action: str, params: Dict[str, Any] = None) -> Dict[str, str]:
        """Send an AMI action and wait for response"""
        if not self._connected:
            raise ConnectionError("Not connected to AMI")
        
        self._action_id += 1
        action_id = str(self._action_id)
        
        # Build action message
        lines = [f"Action: {action}", f"ActionID: {action_id}"]
        if params:
            for key, value in params.items():
                if value is not None:
                    lines.append(f"{key}: {value}")
        lines.append("")  # Empty line terminates action
        
        message = "\r\n".join(lines) + "\r\n"
        
        self._writer.write(message.encode())
        await self._writer.drain()
        
        # Read response
        response = await self._read_response(action_id)
        return response
    
    async def _read_line(self) -> str:
        """Read a single line from AMI"""
        line = await self._reader.readline()
        return line.decode().strip()
    
    async def _read_response(self, action_id: str) -> Dict[str, str]:
        """Read response for a specific action ID"""
        response = {}
        
        while True:
            line = await asyncio.wait_for(self._read_line(), timeout=30.0)
            
            if not line:
                # Empty line indicates end of response
                if response.get("ActionID") == action_id:
                    break
                continue
            
            if ":" in line:
                key, value = line.split(":", 1)
                response[key.strip()] = value.strip()
        
        return response
    
    async def read_events(self, timeout: float = 1.0) -> List[Dict[str, str]]:
        """Read any pending events"""
        events = []
        
        try:
            while True:
                line = await asyncio.wait_for(self._read_line(), timeout=timeout)
                
                if line.startswith("Event:"):
                    event = {"Event": line.split(":", 1)[1].strip()}
                    
                    # Read event data
                    while True:
                        line = await asyncio.wait_for(self._read_line(), timeout=0.5)
                        if not line:
                            break
                        if ":" in line:
                            key, value = line.split(":", 1)
                            event[key.strip()] = value.strip()
                    
                    events.append(event)
                    
        except asyncio.TimeoutError:
            pass
        
        return events


@register_provider
class AsteriskAMIConnector(ProviderBase):
    """
    Asterisk PBX connector via AMI (Asterisk Manager Interface).

    Uses native AMI protocol (TCP socket with text-based commands).

    Supports:
    - Originate calls
    - Get channel status
    - Get SIP/PJSIP peer status
    - Get queue status
    - Execute CLI commands
    - Monitor CDR events
    - Queue member management
    """

    def __init__(self, auth_config: Optional[AuthConfig] = None):
        super().__init__(auth_config)
        self._ami: Optional[AMIProtocol] = None

    @classmethod
    def get_metadata(cls) -> ProviderMetadata:
        return ProviderMetadata(
            id="asterisk_ami",
            name="Asterisk AMI",
            description="Connect to Asterisk PBX via AMI (Asterisk Manager Interface) for telephony automation",
            version="1.0.0",
            icon_url="https://www.asterisk.org/wp-content/uploads/2022/04/asterisk-icon-150x150.png",
            documentation_url="https://wiki.asterisk.org/wiki/display/AST/AMI",
            categories=["telephony", "pbx", "voip"],
            tags=["asterisk", "pbx", "sip", "voip", "call-center", "ivr", "queue"],
            protocol=ProtocolType.AMI,
            auth_schema=AuthSchemaDefinition(
                auth_type=AuthType.CUSTOM,
                fields=[
                    FieldDefinition(
                        name="host",
                        label="Asterisk Host",
                        type=FieldType.STRING,
                        required=True,
                        description="Hostname or IP of Asterisk server",
                        placeholder="pbx.example.com"
                    ),
                    FieldDefinition(
                        name="port",
                        label="AMI Port",
                        type=FieldType.INTEGER,
                        required=False,
                        default=5038,
                        description="AMI port (default: 5038)"
                    ),
                    FieldDefinition(
                        name="username",
                        label="AMI Username",
                        type=FieldType.STRING,
                        required=True,
                        description="AMI user from manager.conf"
                    ),
                    FieldDefinition(
                        name="secret",
                        label="AMI Secret",
                        type=FieldType.PASSWORD,
                        required=True,
                        secret=True,
                        description="AMI password"
                    ),
                ]
            ),
            supports_webhooks=False,  # AMI uses persistent connection for events
        )
    
    def get_actions(self) -> List[ActionDefinition]:
        return [
            ActionDefinition(
                id="originate_call",
                name="Originate Call",
                description="Initiate an outbound call",
                category="Calls",
                inputs=[
                    FieldDefinition(
                        name="channel",
                        label="Channel",
                        type=FieldType.STRING,
                        required=True,
                        description="Channel to call (e.g., SIP/1001, PJSIP/trunk/5551234567)",
                        placeholder="SIP/1001"
                    ),
                    FieldDefinition(
                        name="context",
                        label="Context",
                        type=FieldType.STRING,
                        required=True,
                        description="Dialplan context",
                        default="default"
                    ),
                    FieldDefinition(
                        name="exten",
                        label="Extension",
                        type=FieldType.STRING,
                        required=True,
                        description="Extension to dial"
                    ),
                    FieldDefinition(
                        name="priority",
                        label="Priority",
                        type=FieldType.INTEGER,
                        default=1
                    ),
                    FieldDefinition(
                        name="caller_id",
                        label="Caller ID",
                        type=FieldType.STRING,
                        required=False,
                        description="Caller ID to display",
                        placeholder='"John Doe" <1001>'
                    ),
                    FieldDefinition(
                        name="timeout",
                        label="Timeout (ms)",
                        type=FieldType.INTEGER,
                        default=30000,
                        description="Ring timeout in milliseconds"
                    ),
                    FieldDefinition(
                        name="async",
                        label="Async",
                        type=FieldType.BOOLEAN,
                        default=True,
                        description="Return immediately without waiting"
                    ),
                    FieldDefinition(
                        name="variables",
                        label="Channel Variables",
                        type=FieldType.OBJECT,
                        required=False,
                        description="Variables to set on the channel"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="response", label="Response", type=FieldType.STRING),
                    FieldDefinition(name="message", label="Message", type=FieldType.STRING),
                    FieldDefinition(name="uniqueid", label="Unique ID", type=FieldType.STRING),
                ],
                is_idempotent=False
            ),
            
            ActionDefinition(
                id="get_channels",
                name="Get Active Channels",
                description="List all active channels",
                category="Status",
                inputs=[],
                outputs=[
                    FieldDefinition(name="channels", label="Channels", type=FieldType.ARRAY),
                    FieldDefinition(name="count", label="Count", type=FieldType.INTEGER),
                ],
                is_idempotent=True
            ),
            
            ActionDefinition(
                id="get_sip_peers",
                name="Get SIP Peers",
                description="List SIP peer status",
                category="Status",
                inputs=[
                    FieldDefinition(
                        name="peer",
                        label="Peer Name",
                        type=FieldType.STRING,
                        required=False,
                        description="Specific peer to query (leave empty for all)"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="peers", label="Peers", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),
            
            ActionDefinition(
                id="get_pjsip_endpoints",
                name="Get PJSIP Endpoints",
                description="List PJSIP endpoint status",
                category="Status",
                inputs=[],
                outputs=[
                    FieldDefinition(name="endpoints", label="Endpoints", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),
            
            ActionDefinition(
                id="get_queue_status",
                name="Get Queue Status",
                description="Get call queue status",
                category="Queues",
                inputs=[
                    FieldDefinition(
                        name="queue",
                        label="Queue Name",
                        type=FieldType.STRING,
                        required=False,
                        description="Specific queue (leave empty for all)"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="queues", label="Queues", type=FieldType.ARRAY),
                    FieldDefinition(name="members", label="Members", type=FieldType.ARRAY),
                    FieldDefinition(name="callers", label="Callers", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),
            
            ActionDefinition(
                id="queue_add",
                name="Add Queue Member",
                description="Add an agent to a queue",
                category="Queues",
                inputs=[
                    FieldDefinition(
                        name="queue",
                        label="Queue Name",
                        type=FieldType.STRING,
                        required=True
                    ),
                    FieldDefinition(
                        name="interface",
                        label="Interface",
                        type=FieldType.STRING,
                        required=True,
                        description="Agent interface (e.g., SIP/1001)",
                        placeholder="SIP/1001"
                    ),
                    FieldDefinition(
                        name="member_name",
                        label="Member Name",
                        type=FieldType.STRING,
                        required=False
                    ),
                    FieldDefinition(
                        name="paused",
                        label="Start Paused",
                        type=FieldType.BOOLEAN,
                        default=False
                    ),
                ],
                outputs=[
                    FieldDefinition(name="response", label="Response", type=FieldType.STRING),
                ],
                is_idempotent=False
            ),
            
            ActionDefinition(
                id="queue_remove",
                name="Remove Queue Member",
                description="Remove an agent from a queue",
                category="Queues",
                inputs=[
                    FieldDefinition(name="queue", label="Queue Name", type=FieldType.STRING, required=True),
                    FieldDefinition(name="interface", label="Interface", type=FieldType.STRING, required=True),
                ],
                outputs=[
                    FieldDefinition(name="response", label="Response", type=FieldType.STRING),
                ],
                is_idempotent=False
            ),
            
            ActionDefinition(
                id="queue_pause",
                name="Pause Queue Member",
                description="Pause or unpause a queue member",
                category="Queues",
                inputs=[
                    FieldDefinition(name="queue", label="Queue Name", type=FieldType.STRING, required=False),
                    FieldDefinition(name="interface", label="Interface", type=FieldType.STRING, required=True),
                    FieldDefinition(name="paused", label="Paused", type=FieldType.BOOLEAN, required=True),
                    FieldDefinition(name="reason", label="Reason", type=FieldType.STRING, required=False),
                ],
                outputs=[
                    FieldDefinition(name="response", label="Response", type=FieldType.STRING),
                ],
                is_idempotent=True
            ),
            
            ActionDefinition(
                id="hangup",
                name="Hangup Channel",
                description="Hang up a specific channel",
                category="Calls",
                inputs=[
                    FieldDefinition(
                        name="channel",
                        label="Channel",
                        type=FieldType.STRING,
                        required=True,
                        description="Channel to hang up"
                    ),
                    FieldDefinition(
                        name="cause",
                        label="Hangup Cause",
                        type=FieldType.INTEGER,
                        required=False,
                        default=16,
                        description="Hangup cause code"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="response", label="Response", type=FieldType.STRING),
                ],
                is_idempotent=False
            ),
            
            ActionDefinition(
                id="redirect",
                name="Redirect Channel",
                description="Redirect a channel to a different extension",
                category="Calls",
                inputs=[
                    FieldDefinition(name="channel", label="Channel", type=FieldType.STRING, required=True),
                    FieldDefinition(name="context", label="Context", type=FieldType.STRING, required=True),
                    FieldDefinition(name="exten", label="Extension", type=FieldType.STRING, required=True),
                    FieldDefinition(name="priority", label="Priority", type=FieldType.INTEGER, default=1),
                ],
                outputs=[
                    FieldDefinition(name="response", label="Response", type=FieldType.STRING),
                ],
                is_idempotent=False
            ),
            
            ActionDefinition(
                id="command",
                name="CLI Command",
                description="Execute an Asterisk CLI command",
                category="Admin",
                inputs=[
                    FieldDefinition(
                        name="command",
                        label="Command",
                        type=FieldType.STRING,
                        required=True,
                        description="CLI command to execute",
                        placeholder="core show channels"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="output", label="Output", type=FieldType.TEXT),
                ],
                is_idempotent=True
            ),
            
            ActionDefinition(
                id="reload",
                name="Reload Module",
                description="Reload an Asterisk module",
                category="Admin",
                inputs=[
                    FieldDefinition(
                        name="module",
                        label="Module",
                        type=FieldType.STRING,
                        required=False,
                        description="Module to reload (empty for all)",
                        placeholder="chan_sip.so"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="response", label="Response", type=FieldType.STRING),
                ],
                is_idempotent=True
            ),
        ]
    
    def get_triggers(self) -> List[TriggerDefinition]:
        return [
            TriggerDefinition(
                id="cdr_event",
                name="CDR Event",
                description="Triggered when a call completes (CDR generated)",
                trigger_type=TriggerType.WEBSOCKET,  # Uses persistent AMI connection
                outputs=[
                    FieldDefinition(name="uniqueid", label="Unique ID", type=FieldType.STRING),
                    FieldDefinition(name="source", label="Source", type=FieldType.STRING),
                    FieldDefinition(name="destination", label="Destination", type=FieldType.STRING),
                    FieldDefinition(name="duration", label="Duration", type=FieldType.INTEGER),
                    FieldDefinition(name="billsec", label="Billable Seconds", type=FieldType.INTEGER),
                    FieldDefinition(name="disposition", label="Disposition", type=FieldType.STRING),
                ],
                config_fields=[]
            ),
            
            TriggerDefinition(
                id="queue_member_status",
                name="Queue Member Status Change",
                description="Triggered when a queue member status changes",
                trigger_type=TriggerType.WEBSOCKET,
                outputs=[
                    FieldDefinition(name="queue", label="Queue", type=FieldType.STRING),
                    FieldDefinition(name="member", label="Member", type=FieldType.STRING),
                    FieldDefinition(name="status", label="Status", type=FieldType.STRING),
                    FieldDefinition(name="paused", label="Paused", type=FieldType.BOOLEAN),
                ],
                config_fields=[
                    FieldDefinition(
                        name="queue_filter",
                        label="Queue Filter",
                        type=FieldType.STRING,
                        required=False,
                        description="Only trigger for specific queue"
                    ),
                ]
            ),
        ]
    
    async def authenticate(self) -> bool:
        """Connect and authenticate with AMI"""
        if not self.auth_config:
            raise AuthenticationError("No authentication config provided")

        creds = self.auth_config.credentials
        host = creds.get("host")
        port = creds.get("port", 5038)
        username = creds.get("username")
        secret = creds.get("secret")

        if not all([host, username, secret]):
            raise AuthenticationError("Host, username, and secret are required")

        self._ami = AMIProtocol(host, port)
        await self._ami.connect()
        await self._ami.login(username, secret)

        self._authenticated = True
        return True

    async def test_connection(self) -> ExecutionResult:
        """Test connection to Asterisk AMI"""
        try:
            await self.authenticate()

            # Get core status to verify connection
            response = await self._ami.send_action("CoreStatus")

            return ExecutionResult(
                success=True,
                data={
                    "message": "Connection successful",
                    "asterisk_version": response.get("CoreVersion", "Unknown"),
                    "startup_time": response.get("CoreStartupTime"),
                    "reload_time": response.get("CoreReloadTime"),
                    "host": self.auth_config.credentials.get("host"),
                }
            )
        except AuthenticationError as e:
            return ExecutionResult(success=False, error_message=str(e), error_code="AUTH_FAILED")
        except Exception as e:
            return ExecutionResult(success=False, error_message=str(e), error_code="CONNECTION_ERROR")

    async def execute_action(
        self,
        action_id: str,
        inputs: Dict[str, Any],
        context: ExecutionContext
    ) -> ExecutionResult:
        """Execute an AMI action"""
        import time
        start_time = time.time()
        
        await self.ensure_authenticated()
        
        try:
            if action_id == "originate_call":
                result = await self._originate_call(inputs)
            elif action_id == "get_channels":
                result = await self._get_channels()
            elif action_id == "get_sip_peers":
                result = await self._get_sip_peers(inputs)
            elif action_id == "get_pjsip_endpoints":
                result = await self._get_pjsip_endpoints()
            elif action_id == "get_queue_status":
                result = await self._get_queue_status(inputs)
            elif action_id == "queue_add":
                result = await self._queue_add(inputs)
            elif action_id == "queue_remove":
                result = await self._queue_remove(inputs)
            elif action_id == "queue_pause":
                result = await self._queue_pause(inputs)
            elif action_id == "hangup":
                result = await self._hangup(inputs)
            elif action_id == "redirect":
                result = await self._redirect(inputs)
            elif action_id == "command":
                result = await self._command(inputs)
            elif action_id == "reload":
                result = await self._reload(inputs)
            else:
                return ExecutionResult(
                    success=False,
                    error_message=f"Unknown action: {action_id}",
                    error_code="UNKNOWN_ACTION"
                )
            
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
    
    async def _originate_call(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Originate a call"""
        params = {
            "Channel": inputs["channel"],
            "Context": inputs["context"],
            "Exten": inputs["exten"],
            "Priority": inputs.get("priority", 1),
            "Timeout": inputs.get("timeout", 30000),
            "Async": "true" if inputs.get("async", True) else "false",
        }
        
        if inputs.get("caller_id"):
            params["CallerID"] = inputs["caller_id"]
        
        if inputs.get("variables"):
            for key, value in inputs["variables"].items():
                params[f"Variable"] = f"{key}={value}"
        
        response = await self._ami.send_action("Originate", params)
        
        return ExecutionResult(
            success=response.get("Response") == "Success",
            data={
                "response": response.get("Response"),
                "message": response.get("Message"),
                "uniqueid": response.get("Uniqueid")
            },
            raw_response=response
        )
    
    async def _get_channels(self) -> ExecutionResult:
        """Get active channels"""
        response = await self._ami.send_action("CoreShowChannels")
        
        # Read channel events
        channels = []
        events = await self._ami.read_events(timeout=2.0)
        
        for event in events:
            if event.get("Event") == "CoreShowChannel":
                channels.append({
                    "channel": event.get("Channel"),
                    "state": event.get("ChannelState"),
                    "state_desc": event.get("ChannelStateDesc"),
                    "caller_id": event.get("CallerIDNum"),
                    "connected_line": event.get("ConnectedLineNum"),
                    "application": event.get("Application"),
                    "duration": event.get("Duration"),
                })
        
        return ExecutionResult(
            success=True,
            data={
                "channels": channels,
                "count": len(channels)
            }
        )
    
    async def _get_sip_peers(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Get SIP peer status"""
        params = {}
        if inputs.get("peer"):
            params["Peer"] = inputs["peer"]
        
        response = await self._ami.send_action("SIPpeers" if not inputs.get("peer") else "SIPshowpeer", params)
        
        peers = []
        events = await self._ami.read_events(timeout=2.0)
        
        for event in events:
            if event.get("Event") == "PeerEntry":
                peers.append({
                    "name": event.get("ObjectName"),
                    "status": event.get("Status"),
                    "ip_address": event.get("IPaddress"),
                    "ip_port": event.get("IPport"),
                    "dynamic": event.get("Dynamic") == "yes",
                })
        
        return ExecutionResult(success=True, data={"peers": peers})
    
    async def _get_pjsip_endpoints(self) -> ExecutionResult:
        """Get PJSIP endpoints"""
        response = await self._ami.send_action("PJSIPShowEndpoints")
        
        endpoints = []
        events = await self._ami.read_events(timeout=2.0)
        
        for event in events:
            if event.get("Event") == "EndpointList":
                endpoints.append({
                    "name": event.get("ObjectName"),
                    "device_state": event.get("DeviceState"),
                    "active_channels": event.get("ActiveChannels"),
                })
        
        return ExecutionResult(success=True, data={"endpoints": endpoints})
    
    async def _get_queue_status(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Get queue status"""
        params = {}
        if inputs.get("queue"):
            params["Queue"] = inputs["queue"]
        
        response = await self._ami.send_action("QueueStatus", params)
        
        queues = []
        members = []
        callers = []
        
        events = await self._ami.read_events(timeout=2.0)
        
        for event in events:
            event_type = event.get("Event")
            
            if event_type == "QueueParams":
                queues.append({
                    "queue": event.get("Queue"),
                    "calls": int(event.get("Calls", 0)),
                    "holdtime": int(event.get("Holdtime", 0)),
                    "talktime": int(event.get("TalkTime", 0)),
                    "completed": int(event.get("Completed", 0)),
                    "abandoned": int(event.get("Abandoned", 0)),
                })
            elif event_type == "QueueMember":
                members.append({
                    "queue": event.get("Queue"),
                    "name": event.get("Name"),
                    "interface": event.get("StateInterface"),
                    "status": event.get("Status"),
                    "paused": event.get("Paused") == "1",
                    "calls_taken": int(event.get("CallsTaken", 0)),
                    "last_call": event.get("LastCall"),
                })
            elif event_type == "QueueEntry":
                callers.append({
                    "queue": event.get("Queue"),
                    "position": int(event.get("Position", 0)),
                    "channel": event.get("Channel"),
                    "caller_id": event.get("CallerIDNum"),
                    "wait": int(event.get("Wait", 0)),
                })
        
        return ExecutionResult(
            success=True,
            data={
                "queues": queues,
                "members": members,
                "callers": callers
            }
        )
    
    async def _queue_add(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Add member to queue"""
        params = {
            "Queue": inputs["queue"],
            "Interface": inputs["interface"],
        }
        if inputs.get("member_name"):
            params["MemberName"] = inputs["member_name"]
        if inputs.get("paused"):
            params["Paused"] = "true"
        
        response = await self._ami.send_action("QueueAdd", params)
        
        return ExecutionResult(
            success=response.get("Response") == "Success",
            data={"response": response.get("Response")},
            error_message=response.get("Message") if response.get("Response") != "Success" else None
        )
    
    async def _queue_remove(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Remove member from queue"""
        response = await self._ami.send_action("QueueRemove", {
            "Queue": inputs["queue"],
            "Interface": inputs["interface"],
        })
        
        return ExecutionResult(
            success=response.get("Response") == "Success",
            data={"response": response.get("Response")},
            error_message=response.get("Message") if response.get("Response") != "Success" else None
        )
    
    async def _queue_pause(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Pause/unpause queue member"""
        params = {
            "Interface": inputs["interface"],
            "Paused": "true" if inputs["paused"] else "false",
        }
        if inputs.get("queue"):
            params["Queue"] = inputs["queue"]
        if inputs.get("reason"):
            params["Reason"] = inputs["reason"]
        
        response = await self._ami.send_action("QueuePause", params)
        
        return ExecutionResult(
            success=response.get("Response") == "Success",
            data={"response": response.get("Response")}
        )
    
    async def _hangup(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Hangup channel"""
        params = {"Channel": inputs["channel"]}
        if inputs.get("cause"):
            params["Cause"] = str(inputs["cause"])
        
        response = await self._ami.send_action("Hangup", params)
        
        return ExecutionResult(
            success=response.get("Response") == "Success",
            data={"response": response.get("Response")}
        )
    
    async def _redirect(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Redirect channel"""
        response = await self._ami.send_action("Redirect", {
            "Channel": inputs["channel"],
            "Context": inputs["context"],
            "Exten": inputs["exten"],
            "Priority": str(inputs.get("priority", 1)),
        })
        
        return ExecutionResult(
            success=response.get("Response") == "Success",
            data={"response": response.get("Response")}
        )
    
    async def _command(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Execute CLI command"""
        response = await self._ami.send_action("Command", {
            "Command": inputs["command"]
        })
        
        output = response.get("Output", "")
        
        return ExecutionResult(
            success=response.get("Response") == "Success",
            data={"output": output}
        )
    
    async def _reload(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Reload module"""
        params = {}
        if inputs.get("module"):
            params["Module"] = inputs["module"]
        
        response = await self._ami.send_action("Reload", params)
        
        return ExecutionResult(
            success=response.get("Response") == "Success",
            data={"response": response.get("Response")}
        )
    
    async def close(self):
        """Disconnect from AMI"""
        if self._ami:
            await self._ami.disconnect()
            self._ami = None
