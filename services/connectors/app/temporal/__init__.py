"""
Temporal Activities for Connector Execution
===========================================
Temporal activities that wrap connector operations.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional, List
from datetime import timedelta

import logging

logger = logging.getLogger(__name__)

# Check if temporalio is available
try:
    from temporalio import activity, workflow
    from temporalio.common import RetryPolicy
    TEMPORAL_AVAILABLE = True
except ImportError:
    TEMPORAL_AVAILABLE = False
    logger.warning("temporalio not installed. Temporal features will be unavailable.")


# =============================================================================
# Activity Input/Output Models
# =============================================================================

@dataclass
class ConnectorActionInput:
    """Input for execute_connector_action activity"""
    connector_id: str
    action_id: str
    credential_id: str
    inputs: Dict[str, Any]

    # Context
    workflow_id: Optional[str] = None
    workflow_run_id: Optional[str] = None
    step_id: Optional[str] = None
    user_id: Optional[str] = None
    tenant_id: Optional[str] = None

    # Execution settings
    timeout_seconds: int = 30
    retry_on_failure: bool = True


@dataclass
class ConnectorActionOutput:
    """Output from execute_connector_action activity"""
    success: bool
    data: Dict[str, Any]
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    execution_time_ms: int = 0

    # Pagination
    has_more: bool = False
    cursor: Optional[str] = None


@dataclass
class TestConnectionInput:
    """Input for test_connection activity"""
    connector_id: str
    credential_id: str
    tenant_id: Optional[str] = None


@dataclass
class TestConnectionOutput:
    """Output from test_connection activity"""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


@dataclass
class PollTriggerInput:
    """Input for poll_trigger activity"""
    connector_id: str
    trigger_id: str
    credential_id: str
    config: Dict[str, Any]
    last_poll_state: Optional[Dict[str, Any]] = None
    tenant_id: Optional[str] = None


@dataclass
class PollTriggerOutput:
    """Output from poll_trigger activity"""
    events: List[Dict[str, Any]]
    new_poll_state: Dict[str, Any]
    has_more: bool = False


# Only define activities/workflows if temporalio is available
if TEMPORAL_AVAILABLE:

    @activity.defn
    async def execute_connector_action(params: ConnectorActionInput) -> ConnectorActionOutput:
        """Execute a connector action."""
        from app.connectors import ConnectorRegistry, CredentialManager, ExecutionContext
        from app.connectors.credentials import InMemoryCredentialBackend

        registry = ConnectorRegistry.get_instance()

        cred_manager = getattr(activity.info(), 'credential_manager', None)
        if not cred_manager:
            backend = InMemoryCredentialBackend()
            cred_manager = CredentialManager(backend)

        try:
            auth_config = await cred_manager.get_auth_config(params.credential_id)
            if not auth_config:
                return ConnectorActionOutput(
                    success=False,
                    data={},
                    error_message=f"Credentials not found: {params.credential_id}",
                    error_code="CREDENTIALS_NOT_FOUND"
                )

            connector = registry.create_instance(params.connector_id, auth_config)
            if not connector:
                return ConnectorActionOutput(
                    success=False,
                    data={},
                    error_message=f"Connector not found: {params.connector_id}",
                    error_code="CONNECTOR_NOT_FOUND"
                )

            context = ExecutionContext(
                workflow_id=params.workflow_id,
                workflow_run_id=params.workflow_run_id,
                step_id=params.step_id,
                user_id=params.user_id,
                tenant_id=params.tenant_id,
                timeout_ms=params.timeout_seconds * 1000,
                correlation_id=activity.info().activity_id
            )

            connector.validate_inputs(params.action_id, params.inputs)

            result = await connector.execute_action(
                action_id=params.action_id,
                inputs=params.inputs,
                context=context
            )

            return ConnectorActionOutput(
                success=result.success,
                data=result.data,
                error_message=result.error_message,
                error_code=result.error_code,
                execution_time_ms=result.execution_time_ms,
                has_more=result.has_more,
                cursor=result.cursor
            )

        except Exception as e:
            logger.exception(f"Error executing action {params.action_id}")
            return ConnectorActionOutput(
                success=False,
                data={},
                error_message=str(e),
                error_code="EXECUTION_ERROR"
            )

    @activity.defn
    async def test_connector_connection(params: TestConnectionInput) -> TestConnectionOutput:
        """Test connection with a connector's credentials"""
        from app.connectors import ConnectorRegistry, CredentialManager
        from app.connectors.credentials import InMemoryCredentialBackend

        registry = ConnectorRegistry.get_instance()

        cred_manager = getattr(activity.info(), 'credential_manager', None)
        if not cred_manager:
            backend = InMemoryCredentialBackend()
            cred_manager = CredentialManager(backend)

        try:
            auth_config = await cred_manager.get_auth_config(params.credential_id)
            if not auth_config:
                return TestConnectionOutput(success=False, message="Credentials not found")

            connector = registry.create_instance(params.connector_id, auth_config)
            if not connector:
                return TestConnectionOutput(success=False, message=f"Connector not found: {params.connector_id}")

            result = await connector.test_connection()

            return TestConnectionOutput(
                success=result.success,
                message=result.data.get("message", "Connection test completed"),
                details=result.data
            )

        except Exception as e:
            logger.exception("Error testing connection")
            return TestConnectionOutput(success=False, message=str(e))

    @activity.defn
    async def poll_connector_trigger(params: PollTriggerInput) -> PollTriggerOutput:
        """Poll a trigger for new events"""
        from app.connectors import ConnectorRegistry, CredentialManager
        from app.connectors.credentials import InMemoryCredentialBackend

        registry = ConnectorRegistry.get_instance()

        cred_manager = getattr(activity.info(), 'credential_manager', None)
        if not cred_manager:
            backend = InMemoryCredentialBackend()
            cred_manager = CredentialManager(backend)

        try:
            auth_config = await cred_manager.get_auth_config(params.credential_id)
            if not auth_config:
                return PollTriggerOutput(events=[], new_poll_state=params.last_poll_state or {})

            connector = registry.create_instance(params.connector_id, auth_config)
            if not connector:
                return PollTriggerOutput(events=[], new_poll_state=params.last_poll_state or {})

            events, new_state = await connector.poll_trigger(
                trigger_id=params.trigger_id,
                config=params.config,
                last_poll_state=params.last_poll_state
            )

            return PollTriggerOutput(events=events, new_poll_state=new_state)

        except Exception as e:
            logger.exception("Error polling trigger")
            return PollTriggerOutput(events=[], new_poll_state=params.last_poll_state or {})

    @workflow.defn
    class ConnectorActionWorkflow:
        """Simple workflow that executes a single connector action."""

        @workflow.run
        async def run(self, params: ConnectorActionInput) -> ConnectorActionOutput:
            retry_policy = RetryPolicy(
                initial_interval=timedelta(seconds=1),
                backoff_coefficient=2.0,
                maximum_interval=timedelta(minutes=1),
                maximum_attempts=3 if params.retry_on_failure else 1,
            )

            return await workflow.execute_activity(
                execute_connector_action,
                params,
                start_to_close_timeout=timedelta(seconds=params.timeout_seconds + 10),
                retry_policy=retry_policy,
            )


def get_connector_activities():
    """Get all connector activities for worker registration"""
    if not TEMPORAL_AVAILABLE:
        return []
    return [
        execute_connector_action,
        test_connector_connection,
        poll_connector_trigger,
    ]


def get_connector_workflows():
    """Get all connector workflows for worker registration"""
    if not TEMPORAL_AVAILABLE:
        return []
    return [ConnectorActionWorkflow]


__all__ = [
    "ConnectorActionInput",
    "ConnectorActionOutput",
    "TestConnectionInput",
    "TestConnectionOutput",
    "PollTriggerInput",
    "PollTriggerOutput",
    "get_connector_activities",
    "get_connector_workflows",
    "TEMPORAL_AVAILABLE",
]
