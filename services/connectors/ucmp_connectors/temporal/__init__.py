"""
Temporal Activities for Connector Execution
===========================================
Temporal activities that wrap connector operations.
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional, List
from datetime import timedelta
from temporalio import activity, workflow
from temporalio.common import RetryPolicy

import logging

logger = logging.getLogger(__name__)


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


# =============================================================================
# Activities
# =============================================================================

@activity.defn
async def execute_connector_action(params: ConnectorActionInput) -> ConnectorActionOutput:
    """
    Execute a connector action.
    
    This activity:
    1. Retrieves credentials from secure storage
    2. Creates a connector instance
    3. Executes the specified action
    4. Returns the result
    """
    from ..core import (
        ConnectorRegistry,
        CredentialManager,
        ExecutionContext,
    )
    from ..core.credentials import InMemoryCredentialBackend
    
    # Get instances (in production, these would be injected/configured)
    registry = ConnectorRegistry.get_instance()
    
    # TODO: In production, inject the actual credential manager
    # For now, we'll assume credentials are passed or use a shared instance
    cred_manager = activity.info().get("credential_manager")
    if not cred_manager:
        # Fallback for demo - in production this should be properly configured
        backend = InMemoryCredentialBackend()
        cred_manager = CredentialManager(backend)
    
    try:
        # Get auth config from credentials
        auth_config = await cred_manager.get_auth_config(params.credential_id)
        if not auth_config:
            return ConnectorActionOutput(
                success=False,
                data={},
                error_message=f"Credentials not found: {params.credential_id}",
                error_code="CREDENTIALS_NOT_FOUND"
            )
        
        # Create connector instance
        connector = registry.create_instance(params.connector_id, auth_config)
        if not connector:
            return ConnectorActionOutput(
                success=False,
                data={},
                error_message=f"Connector not found: {params.connector_id}",
                error_code="CONNECTOR_NOT_FOUND"
            )
        
        # Build execution context
        context = ExecutionContext(
            workflow_id=params.workflow_id,
            workflow_run_id=params.workflow_run_id,
            step_id=params.step_id,
            user_id=params.user_id,
            tenant_id=params.tenant_id,
            timeout_ms=params.timeout_seconds * 1000,
            correlation_id=activity.info().activity_id
        )
        
        # Validate inputs
        connector.validate_inputs(params.action_id, params.inputs)
        
        # Execute action
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
    from ..core import ConnectorRegistry, CredentialManager
    from ..core.credentials import InMemoryCredentialBackend
    
    registry = ConnectorRegistry.get_instance()
    
    # Get credential manager (same note as above about injection)
    cred_manager = activity.info().get("credential_manager")
    if not cred_manager:
        backend = InMemoryCredentialBackend()
        cred_manager = CredentialManager(backend)
    
    try:
        auth_config = await cred_manager.get_auth_config(params.credential_id)
        if not auth_config:
            return TestConnectionOutput(
                success=False,
                message="Credentials not found"
            )
        
        connector = registry.create_instance(params.connector_id, auth_config)
        if not connector:
            return TestConnectionOutput(
                success=False,
                message=f"Connector not found: {params.connector_id}"
            )
        
        result = await connector.test_connection()
        
        return TestConnectionOutput(
            success=result.success,
            message=result.data.get("message", "Connection test completed"),
            details=result.data
        )
        
    except Exception as e:
        logger.exception("Error testing connection")
        return TestConnectionOutput(
            success=False,
            message=str(e)
        )


@activity.defn
async def poll_connector_trigger(params: PollTriggerInput) -> PollTriggerOutput:
    """Poll a trigger for new events"""
    from ..core import ConnectorRegistry, CredentialManager
    from ..core.credentials import InMemoryCredentialBackend
    
    registry = ConnectorRegistry.get_instance()
    
    cred_manager = activity.info().get("credential_manager")
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
        
        return PollTriggerOutput(
            events=events,
            new_poll_state=new_state
        )
        
    except Exception as e:
        logger.exception("Error polling trigger")
        return PollTriggerOutput(
            events=[],
            new_poll_state=params.last_poll_state or {},
            has_more=False
        )


@activity.defn
async def refresh_oauth_token(connector_id: str, credential_id: str) -> bool:
    """Refresh an OAuth2 token"""
    from ..core import ConnectorRegistry, CredentialManager
    from ..core.credentials import InMemoryCredentialBackend
    
    registry = ConnectorRegistry.get_instance()
    
    cred_manager = activity.info().get("credential_manager")
    if not cred_manager:
        backend = InMemoryCredentialBackend()
        cred_manager = CredentialManager(backend)
    
    try:
        auth_config = await cred_manager.get_auth_config(credential_id)
        if not auth_config or not auth_config.refresh_token:
            return False
        
        connector = registry.create_instance(connector_id, auth_config)
        if not connector:
            return False
        
        new_auth = await connector.refresh_oauth_token()
        
        # Update stored credentials
        await cred_manager.update_oauth_tokens(
            credential_id=credential_id,
            access_token=new_auth.access_token,
            refresh_token=new_auth.refresh_token,
            expires_at=new_auth.token_expires_at
        )
        
        return True
        
    except Exception as e:
        logger.exception("Error refreshing OAuth token")
        return False


# =============================================================================
# Workflow Definitions
# =============================================================================

@workflow.defn
class ConnectorActionWorkflow:
    """
    Simple workflow that executes a single connector action.
    Useful for testing or one-off executions.
    """
    
    @workflow.run
    async def run(self, params: ConnectorActionInput) -> ConnectorActionOutput:
        # Configure retry policy
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


@workflow.defn
class TriggerPollingWorkflow:
    """
    Workflow that continuously polls a trigger at intervals.
    Starts child workflows for each batch of events.
    """
    
    @workflow.run
    async def run(
        self,
        connector_id: str,
        trigger_id: str,
        credential_id: str,
        config: Dict[str, Any],
        poll_interval_seconds: int = 300,
        event_handler_workflow: str = None,  # Name of workflow to handle events
    ):
        poll_state = {}
        
        while True:
            # Poll for events
            poll_input = PollTriggerInput(
                connector_id=connector_id,
                trigger_id=trigger_id,
                credential_id=credential_id,
                config=config,
                last_poll_state=poll_state
            )
            
            result = await workflow.execute_activity(
                poll_connector_trigger,
                poll_input,
                start_to_close_timeout=timedelta(minutes=5),
            )
            
            poll_state = result.new_poll_state
            
            # Process events
            if result.events and event_handler_workflow:
                for event in result.events:
                    # Start child workflow for each event
                    await workflow.start_child_workflow(
                        event_handler_workflow,
                        event,
                        id=f"event-{workflow.uuid4()}",
                    )
            
            # Wait for next poll interval
            await workflow.sleep(timedelta(seconds=poll_interval_seconds))


@workflow.defn
class MultiStepConnectorWorkflow:
    """
    Workflow that executes multiple connector actions in sequence.
    Supports data passing between steps.
    """
    
    @dataclass
    class Step:
        connector_id: str
        action_id: str
        credential_id: str
        inputs: Dict[str, Any]  # Can reference previous step outputs with {{step_name.field}}
        step_name: str = ""
        continue_on_error: bool = False
    
    @dataclass
    class WorkflowInput:
        steps: List["MultiStepConnectorWorkflow.Step"]
        initial_data: Dict[str, Any] = None
    
    @workflow.run
    async def run(self, input: WorkflowInput) -> Dict[str, Any]:
        results = {}
        data_context = input.initial_data or {}
        
        for i, step in enumerate(input.steps):
            step_name = step.step_name or f"step_{i}"
            
            # Resolve input references
            resolved_inputs = self._resolve_references(step.inputs, data_context)
            
            # Execute step
            action_input = ConnectorActionInput(
                connector_id=step.connector_id,
                action_id=step.action_id,
                credential_id=step.credential_id,
                inputs=resolved_inputs,
                workflow_id=workflow.info().workflow_id,
                step_id=step_name
            )
            
            result = await workflow.execute_activity(
                execute_connector_action,
                action_input,
                start_to_close_timeout=timedelta(minutes=5),
            )
            
            results[step_name] = {
                "success": result.success,
                "data": result.data,
                "error": result.error_message
            }
            
            # Update data context for next steps
            data_context[step_name] = result.data
            
            # Handle errors
            if not result.success and not step.continue_on_error:
                break
        
        return results
    
    def _resolve_references(
        self,
        inputs: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Resolve {{step_name.field}} references in inputs"""
        import re
        
        resolved = {}
        pattern = r"\{\{(\w+)\.(\w+)\}\}"
        
        for key, value in inputs.items():
            if isinstance(value, str):
                matches = re.findall(pattern, value)
                for step_name, field in matches:
                    if step_name in context and field in context[step_name]:
                        replacement = str(context[step_name][field])
                        value = value.replace(f"{{{{{step_name}.{field}}}}}", replacement)
                resolved[key] = value
            else:
                resolved[key] = value
        
        return resolved


# =============================================================================
# Activity Registration Helper
# =============================================================================

def get_connector_activities():
    """Get all connector activities for worker registration"""
    return [
        execute_connector_action,
        test_connector_connection,
        poll_connector_trigger,
        refresh_oauth_token,
    ]


def get_connector_workflows():
    """Get all connector workflows for worker registration"""
    return [
        ConnectorActionWorkflow,
        TriggerPollingWorkflow,
        MultiStepConnectorWorkflow,
    ]
