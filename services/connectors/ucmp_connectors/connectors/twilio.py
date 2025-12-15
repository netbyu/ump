"""
Twilio Connector
================
Full-featured Twilio integration for SMS, Voice, and more.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio
import httpx
import base64
import logging

from ..core.base import (
    ConnectorBase,
    ConnectorMetadata,
    AuthConfig,
    AuthType,
    AuthSchemaDefinition,
    ActionDefinition,
    TriggerDefinition,
    TriggerType,
    FieldDefinition,
    FieldType,
    ExecutionContext,
    ExecutionResult,
    AuthenticationError,
    RateLimitError,
)
from ..core.registry import register_connector

logger = logging.getLogger(__name__)


@register_connector
class TwilioConnector(ConnectorBase):
    """
    Twilio connector for SMS, Voice, and messaging.
    
    Supports:
    - Send SMS
    - Send MMS
    - Make voice calls
    - List messages
    - List phone numbers
    - Webhook triggers for incoming messages/calls
    """
    
    BASE_URL = "https://api.twilio.com/2010-04-01"
    
    def __init__(self, auth_config: Optional[AuthConfig] = None):
        super().__init__(auth_config)
        self._client: Optional[httpx.AsyncClient] = None
    
    # -------------------------------------------------------------------------
    # Metadata
    # -------------------------------------------------------------------------
    
    @classmethod
    def get_metadata(cls) -> ConnectorMetadata:
        return ConnectorMetadata(
            id="twilio",
            name="Twilio",
            description="Cloud communications platform for SMS, Voice, and messaging",
            version="1.0.0",
            icon_url="https://www.twilio.com/favicon.ico",
            documentation_url="https://www.twilio.com/docs",
            categories=["telephony", "sms", "voice", "messaging"],
            tags=["communication", "sms", "voice", "mms", "whatsapp"],
            auth_schema=AuthSchemaDefinition(
                auth_type=AuthType.BASIC,
                fields=[
                    FieldDefinition(
                        name="account_sid",
                        label="Account SID",
                        type=FieldType.STRING,
                        required=True,
                        description="Your Twilio Account SID (starts with AC)",
                        placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                        validation_regex=r"^AC[a-f0-9]{32}$"
                    ),
                    FieldDefinition(
                        name="auth_token",
                        label="Auth Token",
                        type=FieldType.PASSWORD,
                        required=True,
                        secret=True,
                        description="Your Twilio Auth Token"
                    ),
                ]
            ),
            supports_webhooks=True,
            base_url="https://api.twilio.com"
        )
    
    # -------------------------------------------------------------------------
    # Actions
    # -------------------------------------------------------------------------
    
    def get_actions(self) -> List[ActionDefinition]:
        return [
            ActionDefinition(
                id="send_sms",
                name="Send SMS",
                description="Send an SMS message",
                category="Messaging",
                inputs=[
                    FieldDefinition(
                        name="to",
                        label="To Phone Number",
                        type=FieldType.PHONE,
                        required=True,
                        description="Recipient phone number in E.164 format",
                        placeholder="+15551234567"
                    ),
                    FieldDefinition(
                        name="from_number",
                        label="From Phone Number",
                        type=FieldType.SELECT,
                        required=True,
                        description="Your Twilio phone number to send from",
                        depends_on="__dynamic__"  # Will be populated dynamically
                    ),
                    FieldDefinition(
                        name="body",
                        label="Message Body",
                        type=FieldType.TEXT,
                        required=True,
                        description="The message content",
                        max_length=1600
                    ),
                ],
                outputs=[
                    FieldDefinition(name="sid", label="Message SID", type=FieldType.STRING),
                    FieldDefinition(name="status", label="Status", type=FieldType.STRING),
                    FieldDefinition(name="date_created", label="Date Created", type=FieldType.DATETIME),
                ],
                is_idempotent=False,
                rate_limit_weight=1
            ),
            
            ActionDefinition(
                id="send_mms",
                name="Send MMS",
                description="Send an MMS message with media",
                category="Messaging",
                inputs=[
                    FieldDefinition(
                        name="to",
                        label="To Phone Number",
                        type=FieldType.PHONE,
                        required=True,
                        placeholder="+15551234567"
                    ),
                    FieldDefinition(
                        name="from_number",
                        label="From Phone Number",
                        type=FieldType.STRING,
                        required=True
                    ),
                    FieldDefinition(
                        name="body",
                        label="Message Body",
                        type=FieldType.TEXT,
                        required=False,
                        max_length=1600
                    ),
                    FieldDefinition(
                        name="media_url",
                        label="Media URL",
                        type=FieldType.URL,
                        required=True,
                        description="URL of the media to send"
                    ),
                ],
                outputs=[
                    FieldDefinition(name="sid", label="Message SID", type=FieldType.STRING),
                    FieldDefinition(name="status", label="Status", type=FieldType.STRING),
                ],
                is_idempotent=False
            ),
            
            ActionDefinition(
                id="make_call",
                name="Make Voice Call",
                description="Initiate an outbound voice call",
                category="Voice",
                inputs=[
                    FieldDefinition(
                        name="to",
                        label="To Phone Number",
                        type=FieldType.PHONE,
                        required=True
                    ),
                    FieldDefinition(
                        name="from_number",
                        label="From Phone Number",
                        type=FieldType.STRING,
                        required=True
                    ),
                    FieldDefinition(
                        name="twiml_url",
                        label="TwiML URL",
                        type=FieldType.URL,
                        required=False,
                        description="URL that returns TwiML instructions"
                    ),
                    FieldDefinition(
                        name="twiml",
                        label="TwiML",
                        type=FieldType.TEXT,
                        required=False,
                        description="Inline TwiML instructions (alternative to URL)"
                    ),
                    FieldDefinition(
                        name="record",
                        label="Record Call",
                        type=FieldType.BOOLEAN,
                        default=False
                    ),
                ],
                outputs=[
                    FieldDefinition(name="sid", label="Call SID", type=FieldType.STRING),
                    FieldDefinition(name="status", label="Status", type=FieldType.STRING),
                ],
                is_idempotent=False,
                estimated_duration_ms=5000
            ),
            
            ActionDefinition(
                id="list_messages",
                name="List Messages",
                description="Retrieve a list of messages",
                category="Messaging",
                inputs=[
                    FieldDefinition(
                        name="to",
                        label="To Phone Number",
                        type=FieldType.PHONE,
                        required=False,
                        description="Filter by recipient"
                    ),
                    FieldDefinition(
                        name="from_number",
                        label="From Phone Number",
                        type=FieldType.STRING,
                        required=False,
                        description="Filter by sender"
                    ),
                    FieldDefinition(
                        name="date_sent_after",
                        label="Date Sent After",
                        type=FieldType.DATE,
                        required=False
                    ),
                    FieldDefinition(
                        name="page_size",
                        label="Page Size",
                        type=FieldType.INTEGER,
                        default=50,
                        min_value=1,
                        max_value=1000
                    ),
                ],
                outputs=[
                    FieldDefinition(name="messages", label="Messages", type=FieldType.ARRAY),
                    FieldDefinition(name="total", label="Total Count", type=FieldType.INTEGER),
                ],
                is_idempotent=True,
                is_batch_capable=True
            ),
            
            ActionDefinition(
                id="list_phone_numbers",
                name="List Phone Numbers",
                description="List all phone numbers in your account",
                category="Account",
                inputs=[],
                outputs=[
                    FieldDefinition(name="phone_numbers", label="Phone Numbers", type=FieldType.ARRAY),
                ],
                is_idempotent=True
            ),
            
            ActionDefinition(
                id="lookup_phone",
                name="Lookup Phone Number",
                description="Get information about a phone number",
                category="Lookup",
                inputs=[
                    FieldDefinition(
                        name="phone_number",
                        label="Phone Number",
                        type=FieldType.PHONE,
                        required=True
                    ),
                    FieldDefinition(
                        name="type",
                        label="Lookup Type",
                        type=FieldType.MULTISELECT,
                        options=[
                            {"value": "carrier", "label": "Carrier Info"},
                            {"value": "caller-name", "label": "Caller Name"},
                        ]
                    ),
                ],
                outputs=[
                    FieldDefinition(name="country_code", label="Country Code", type=FieldType.STRING),
                    FieldDefinition(name="phone_number", label="Phone Number", type=FieldType.STRING),
                    FieldDefinition(name="carrier", label="Carrier", type=FieldType.OBJECT),
                    FieldDefinition(name="caller_name", label="Caller Name", type=FieldType.OBJECT),
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
                id="incoming_sms",
                name="Incoming SMS",
                description="Triggered when an SMS is received",
                trigger_type=TriggerType.WEBHOOK,
                outputs=[
                    FieldDefinition(name="message_sid", label="Message SID", type=FieldType.STRING),
                    FieldDefinition(name="from", label="From", type=FieldType.STRING),
                    FieldDefinition(name="to", label="To", type=FieldType.STRING),
                    FieldDefinition(name="body", label="Body", type=FieldType.STRING),
                    FieldDefinition(name="num_media", label="Number of Media", type=FieldType.INTEGER),
                ],
                config_fields=[
                    FieldDefinition(
                        name="phone_number",
                        label="Phone Number",
                        type=FieldType.SELECT,
                        required=True,
                        description="Which phone number to receive SMS on"
                    ),
                ]
            ),
            
            TriggerDefinition(
                id="incoming_call",
                name="Incoming Call",
                description="Triggered when a voice call is received",
                trigger_type=TriggerType.WEBHOOK,
                outputs=[
                    FieldDefinition(name="call_sid", label="Call SID", type=FieldType.STRING),
                    FieldDefinition(name="from", label="From", type=FieldType.STRING),
                    FieldDefinition(name="to", label="To", type=FieldType.STRING),
                    FieldDefinition(name="call_status", label="Call Status", type=FieldType.STRING),
                ],
                config_fields=[
                    FieldDefinition(
                        name="phone_number",
                        label="Phone Number",
                        type=FieldType.SELECT,
                        required=True
                    ),
                ]
            ),
            
            TriggerDefinition(
                id="new_messages",
                name="New Messages (Polling)",
                description="Poll for new messages",
                trigger_type=TriggerType.POLLING,
                outputs=[
                    FieldDefinition(name="messages", label="Messages", type=FieldType.ARRAY),
                ],
                config_fields=[
                    FieldDefinition(
                        name="direction",
                        label="Direction",
                        type=FieldType.SELECT,
                        options=[
                            {"value": "inbound", "label": "Inbound"},
                            {"value": "outbound-api", "label": "Outbound"},
                            {"value": "all", "label": "All"},
                        ],
                        default="inbound"
                    ),
                ],
                default_poll_interval_seconds=60,
                min_poll_interval_seconds=30
            ),
        ]
    
    # -------------------------------------------------------------------------
    # Authentication
    # -------------------------------------------------------------------------
    
    async def authenticate(self) -> bool:
        """Verify Twilio credentials"""
        if not self.auth_config:
            raise AuthenticationError("No authentication config provided")
        
        account_sid = self.auth_config.credentials.get("account_sid")
        auth_token = self.auth_config.credentials.get("auth_token")
        
        if not account_sid or not auth_token:
            raise AuthenticationError("Account SID and Auth Token are required")
        
        # Test credentials by fetching account info
        client = await self._get_client()
        
        try:
            response = await client.get(f"{self.BASE_URL}/Accounts/{account_sid}.json")
            
            if response.status_code == 401:
                raise AuthenticationError("Invalid Account SID or Auth Token")
            
            response.raise_for_status()
            self._authenticated = True
            return True
            
        except httpx.HTTPStatusError as e:
            raise AuthenticationError(f"Authentication failed: {e}")
    
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client with auth"""
        if self._client is None:
            account_sid = self.auth_config.credentials.get("account_sid", "")
            auth_token = self.auth_config.credentials.get("auth_token", "")
            
            self._client = httpx.AsyncClient(
                auth=(account_sid, auth_token),
                timeout=30.0
            )
        return self._client
    
    # -------------------------------------------------------------------------
    # Action Execution
    # -------------------------------------------------------------------------
    
    async def execute_action(
        self,
        action_id: str,
        inputs: Dict[str, Any],
        context: ExecutionContext
    ) -> ExecutionResult:
        """Execute a Twilio action"""
        import time
        start_time = time.time()
        
        await self.ensure_authenticated()
        
        try:
            if action_id == "send_sms":
                result = await self._send_sms(inputs)
            elif action_id == "send_mms":
                result = await self._send_mms(inputs)
            elif action_id == "make_call":
                result = await self._make_call(inputs)
            elif action_id == "list_messages":
                result = await self._list_messages(inputs)
            elif action_id == "list_phone_numbers":
                result = await self._list_phone_numbers()
            elif action_id == "lookup_phone":
                result = await self._lookup_phone(inputs)
            else:
                return ExecutionResult(
                    success=False,
                    error_message=f"Unknown action: {action_id}",
                    error_code="UNKNOWN_ACTION"
                )
            
            execution_time_ms = int((time.time() - start_time) * 1000)
            result.execution_time_ms = execution_time_ms
            return result
            
        except RateLimitError:
            raise
        except Exception as e:
            logger.exception(f"Error executing {action_id}")
            return ExecutionResult(
                success=False,
                error_message=str(e),
                error_code="EXECUTION_ERROR",
                execution_time_ms=int((time.time() - start_time) * 1000)
            )
    
    async def _send_sms(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Send an SMS message"""
        account_sid = self.auth_config.credentials["account_sid"]
        client = await self._get_client()
        
        data = {
            "To": inputs["to"],
            "From": inputs["from_number"],
            "Body": inputs["body"]
        }
        
        response = await client.post(
            f"{self.BASE_URL}/Accounts/{account_sid}/Messages.json",
            data=data
        )
        
        self._check_rate_limit(response)
        response.raise_for_status()
        
        result = response.json()
        return ExecutionResult(
            success=True,
            data={
                "sid": result["sid"],
                "status": result["status"],
                "date_created": result["date_created"]
            },
            raw_response=result
        )
    
    async def _send_mms(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Send an MMS message"""
        account_sid = self.auth_config.credentials["account_sid"]
        client = await self._get_client()
        
        data = {
            "To": inputs["to"],
            "From": inputs["from_number"],
            "MediaUrl": inputs["media_url"]
        }
        if inputs.get("body"):
            data["Body"] = inputs["body"]
        
        response = await client.post(
            f"{self.BASE_URL}/Accounts/{account_sid}/Messages.json",
            data=data
        )
        
        self._check_rate_limit(response)
        response.raise_for_status()
        
        result = response.json()
        return ExecutionResult(
            success=True,
            data={"sid": result["sid"], "status": result["status"]},
            raw_response=result
        )
    
    async def _make_call(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Initiate a voice call"""
        account_sid = self.auth_config.credentials["account_sid"]
        client = await self._get_client()
        
        data = {
            "To": inputs["to"],
            "From": inputs["from_number"],
        }
        
        if inputs.get("twiml_url"):
            data["Url"] = inputs["twiml_url"]
        elif inputs.get("twiml"):
            data["Twiml"] = inputs["twiml"]
        else:
            # Default TwiML
            data["Twiml"] = "<Response><Say>Hello from UCMP</Say></Response>"
        
        if inputs.get("record"):
            data["Record"] = "true"
        
        response = await client.post(
            f"{self.BASE_URL}/Accounts/{account_sid}/Calls.json",
            data=data
        )
        
        self._check_rate_limit(response)
        response.raise_for_status()
        
        result = response.json()
        return ExecutionResult(
            success=True,
            data={"sid": result["sid"], "status": result["status"]},
            raw_response=result
        )
    
    async def _list_messages(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """List messages"""
        account_sid = self.auth_config.credentials["account_sid"]
        client = await self._get_client()
        
        params = {"PageSize": inputs.get("page_size", 50)}
        if inputs.get("to"):
            params["To"] = inputs["to"]
        if inputs.get("from_number"):
            params["From"] = inputs["from_number"]
        if inputs.get("date_sent_after"):
            params["DateSent>"] = inputs["date_sent_after"]
        
        response = await client.get(
            f"{self.BASE_URL}/Accounts/{account_sid}/Messages.json",
            params=params
        )
        
        self._check_rate_limit(response)
        response.raise_for_status()
        
        result = response.json()
        messages = result.get("messages", [])
        
        return ExecutionResult(
            success=True,
            data={
                "messages": messages,
                "total": len(messages)
            },
            has_more="next_page_uri" in result,
            cursor=result.get("next_page_uri"),
            raw_response=result
        )
    
    async def _list_phone_numbers(self) -> ExecutionResult:
        """List phone numbers"""
        account_sid = self.auth_config.credentials["account_sid"]
        client = await self._get_client()
        
        response = await client.get(
            f"{self.BASE_URL}/Accounts/{account_sid}/IncomingPhoneNumbers.json"
        )
        
        self._check_rate_limit(response)
        response.raise_for_status()
        
        result = response.json()
        phone_numbers = [
            {
                "sid": pn["sid"],
                "phone_number": pn["phone_number"],
                "friendly_name": pn["friendly_name"],
                "capabilities": pn.get("capabilities", {})
            }
            for pn in result.get("incoming_phone_numbers", [])
        ]
        
        return ExecutionResult(
            success=True,
            data={"phone_numbers": phone_numbers},
            raw_response=result
        )
    
    async def _lookup_phone(self, inputs: Dict[str, Any]) -> ExecutionResult:
        """Lookup phone number information"""
        client = await self._get_client()
        
        phone_number = inputs["phone_number"]
        lookup_types = inputs.get("type", [])
        
        params = {}
        if lookup_types:
            params["Type"] = ",".join(lookup_types)
        
        # Twilio Lookup API
        response = await client.get(
            f"https://lookups.twilio.com/v1/PhoneNumbers/{phone_number}",
            params=params
        )
        
        self._check_rate_limit(response)
        response.raise_for_status()
        
        result = response.json()
        return ExecutionResult(
            success=True,
            data={
                "country_code": result.get("country_code"),
                "phone_number": result.get("phone_number"),
                "carrier": result.get("carrier"),
                "caller_name": result.get("caller_name")
            },
            raw_response=result
        )
    
    # -------------------------------------------------------------------------
    # Triggers
    # -------------------------------------------------------------------------
    
    async def setup_webhook(
        self,
        trigger_id: str,
        webhook_url: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Configure webhook on a Twilio phone number"""
        account_sid = self.auth_config.credentials["account_sid"]
        client = await self._get_client()
        
        phone_number_sid = config.get("phone_number")
        
        if trigger_id == "incoming_sms":
            data = {"SmsUrl": webhook_url, "SmsMethod": "POST"}
        elif trigger_id == "incoming_call":
            data = {"VoiceUrl": webhook_url, "VoiceMethod": "POST"}
        else:
            raise ValueError(f"Unknown trigger: {trigger_id}")
        
        response = await client.post(
            f"{self.BASE_URL}/Accounts/{account_sid}/IncomingPhoneNumbers/{phone_number_sid}.json",
            data=data
        )
        response.raise_for_status()
        
        return {
            "webhook_id": phone_number_sid,
            "webhook_url": webhook_url
        }
    
    async def poll_trigger(
        self,
        trigger_id: str,
        config: Dict[str, Any],
        last_poll_state: Optional[Dict[str, Any]] = None
    ) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """Poll for new messages"""
        if trigger_id != "new_messages":
            return [], last_poll_state or {}
        
        account_sid = self.auth_config.credentials["account_sid"]
        client = await self._get_client()
        
        # Get last checked timestamp
        last_checked = last_poll_state.get("last_checked") if last_poll_state else None
        
        params = {"PageSize": 100}
        if last_checked:
            params["DateSent>"] = last_checked
        
        direction = config.get("direction", "inbound")
        if direction != "all":
            params["Direction"] = direction
        
        response = await client.get(
            f"{self.BASE_URL}/Accounts/{account_sid}/Messages.json",
            params=params
        )
        response.raise_for_status()
        
        result = response.json()
        messages = result.get("messages", [])
        
        # Update poll state
        new_state = {
            "last_checked": datetime.utcnow().strftime("%Y-%m-%d")
        }
        
        return messages, new_state
    
    # -------------------------------------------------------------------------
    # Dynamic Options
    # -------------------------------------------------------------------------
    
    async def get_dynamic_options(
        self,
        field_name: str,
        depends_on_values: Dict[str, Any]
    ) -> List[Dict[str, str]]:
        """Fetch dynamic options for fields"""
        if field_name in ("from_number", "phone_number"):
            result = await self._list_phone_numbers()
            if result.success:
                return [
                    {"value": pn["phone_number"], "label": pn["friendly_name"] or pn["phone_number"]}
                    for pn in result.data["phone_numbers"]
                ]
        return []
    
    # -------------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------------
    
    def _check_rate_limit(self, response: httpx.Response):
        """Check for rate limiting"""
        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 60))
            raise RateLimitError(
                "Twilio rate limit exceeded",
                retry_after=retry_after,
                connector_id="twilio"
            )
    
    async def close(self):
        """Close HTTP client"""
        if self._client:
            await self._client.aclose()
            self._client = None
