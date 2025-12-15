"""
Base Temporal Workflow with Per-Step Deployment Control
Supports manual approvals, monitoring, and automated execution
"""
from temporalio import workflow, activity
from temporalio.common import RetryPolicy
from datetime import timedelta
from dataclasses import dataclass, asdict
from typing import Optional, Any, Callable
from enum import Enum


class StepDeploymentMode(str, Enum):
    """Step deployment modes"""
    ALWAYS_AUTO = "always_auto"
    AUTO_MONITORED = "auto_monitored"
    VALIDATION_REQUIRED = "validation_required"
    ALWAYS_MANUAL = "always_manual"


class StepImpactLevel(str, Enum):
    """Step impact levels"""
    ACCESSORY = "accessory"
    READ = "read"
    WRITE = "write"
    CRITICAL = "critical"
    EXTERNAL = "external"


@dataclass
class StepConfig:
    """Step deployment configuration"""
    step_id: str
    step_name: str
    step_order: int
    step_type: str
    deployment_mode: StepDeploymentMode
    impact_level: StepImpactLevel
    risk_level: str
    validation_config: dict
    promotion_criteria: dict
    monitoring_config: dict
    timeout_seconds: int = 60


@dataclass
class ApprovalSignal:
    """Approval signal data"""
    step_id: str
    user_id: str
    action: str  # 'approved' or 'rejected'
    edited_data: Optional[dict] = None
    notes: Optional[str] = None


@dataclass
class StepResult:
    """Step execution result"""
    step_id: str
    step_name: str
    step_order: int
    status: str  # completed, failed, rejected, timeout
    success: bool
    deployment_mode: str

    # Timing
    started_at: str
    completed_at: Optional[str] = None
    duration_ms: Optional[int] = None

    # Approval info (if applicable)
    approved_by: Optional[str] = None
    approval_notes: Optional[str] = None
    rejected_by: Optional[str] = None
    rejection_reason: Optional[str] = None

    # Execution data
    output_data: Optional[dict] = None
    error_message: Optional[str] = None


@workflow.defn
class BaseWorkflowWithApprovals:
    """
    Base workflow class with per-step approval support
    Integrates with PostgreSQL for step deployment configuration
    """

    def __init__(self):
        self.step_approvals: dict[str, ApprovalSignal] = {}
        self.step_results: list[StepResult] = []
        self.current_step_index: int = 0

    @workflow.run
    async def run(self, workflow_data: dict) -> dict:
        """
        Main workflow execution
        Override this in subclasses with specific workflow logic
        """
        workflow_id = workflow_data.get('workflow_id') or workflow.info().workflow_type

        workflow.logger.info(f"Starting workflow: {workflow_id}")

        # Get step deployment configs from PostgreSQL
        step_configs = await workflow.execute_activity(
            "get_step_deployment_configs",
            args=[workflow_id],
            start_to_close_timeout=timedelta(seconds=30),
            retry_policy=RetryPolicy(maximum_attempts=3)
        )

        # Execute each step
        for step_config in step_configs:
            self.current_step_index = step_config['step_order']

            result = await self.execute_step_with_mode(
                step_config=step_config,
                input_data=workflow_data,
                previous_results=self.step_results
            )

            self.step_results.append(result)

            # Stop workflow if critical step failed
            if not result.success and step_config['impact_level'] == 'critical':
                workflow.logger.error(f"Critical step failed: {step_config['step_name']}")
                return {
                    "status": "failed",
                    "failed_at_step": step_config['step_order'],
                    "error": result.error_message,
                    "completed_steps": self.step_results
                }

        workflow.logger.info(f"Workflow completed successfully")

        return {
            "status": "completed",
            "total_steps": len(step_configs),
            "completed_steps": len(self.step_results),
            "results": [asdict(r) for r in self.step_results]
        }

    async def execute_step_with_mode(
        self,
        step_config: dict,
        input_data: dict,
        previous_results: list[StepResult]
    ) -> StepResult:
        """
        Execute a step based on its deployment mode
        Handles: always_auto, auto_monitored, validation_required, always_manual
        """

        step_id = step_config['step_id']
        step_name = step_config['step_name']
        mode = step_config['deployment_mode']
        started_at = workflow.now().isoformat()

        workflow.logger.info(f"Executing step '{step_name}' in mode: {mode}")

        try:
            # ============================================================
            # ALWAYS_AUTO: Execute immediately, no approval
            # ============================================================
            if mode == StepDeploymentMode.ALWAYS_AUTO:
                result = await self.run_step_activity(step_config, input_data)

                return StepResult(
                    step_id=step_id,
                    step_name=step_name,
                    step_order=step_config['step_order'],
                    status="completed",
                    success=True,
                    deployment_mode=mode,
                    started_at=started_at,
                    completed_at=workflow.now().isoformat(),
                    duration_ms=result.get('duration_ms'),
                    output_data=result.get('output')
                )

            # ============================================================
            # AUTO_MONITORED: Execute with enhanced monitoring
            # ============================================================
            elif mode == StepDeploymentMode.AUTO_MONITORED:
                result = await self.run_step_activity(step_config, input_data)

                # Log metrics (fire-and-forget)
                workflow.start_activity(
                    "log_step_execution_metrics",
                    args=[step_id, result],
                    start_to_close_timeout=timedelta(seconds=10)
                )

                return StepResult(
                    step_id=step_id,
                    step_name=step_name,
                    step_order=step_config['step_order'],
                    status="completed",
                    success=True,
                    deployment_mode=mode,
                    started_at=started_at,
                    completed_at=workflow.now().isoformat(),
                    duration_ms=result.get('duration_ms'),
                    output_data=result.get('output')
                )

            # ============================================================
            # VALIDATION_REQUIRED or ALWAYS_MANUAL: Wait for approval
            # ============================================================
            elif mode in [StepDeploymentMode.VALIDATION_REQUIRED, StepDeploymentMode.ALWAYS_MANUAL]:
                # Generate preview of what will be executed
                preview_data = await workflow.execute_activity(
                    "generate_step_preview",
                    args=[step_config, input_data, [asdict(r) for r in previous_results]],
                    start_to_close_timeout=timedelta(seconds=30)
                )

                # Analyze impact
                impact_analysis = await workflow.execute_activity(
                    "analyze_step_impact",
                    args=[step_config, preview_data],
                    start_to_close_timeout=timedelta(seconds=10)
                )

                # Notify that approval is needed
                await workflow.execute_activity(
                    "notify_step_approval_needed",
                    args=[{
                        'workflow_id': workflow.info().workflow_type,
                        'execution_id': workflow.info().workflow_run_id,
                        'step_id': step_id,
                        'step_name': step_name,
                        'step_order': step_config['step_order'],
                        'preview_data': preview_data,
                        'impact_analysis': impact_analysis
                    }],
                    start_to_close_timeout=timedelta(seconds=5)
                )

                # Wait for approval signal
                timeout_minutes = step_config['validation_config'].get('timeout_minutes', 30)

                workflow.logger.info(
                    f"Waiting for approval of step '{step_name}' (timeout: {timeout_minutes}min)"
                )

                try:
                    await workflow.wait_condition(
                        lambda: step_id in self.step_approvals,
                        timeout=timedelta(minutes=timeout_minutes)
                    )
                except TimeoutError:
                    workflow.logger.warning(f"Approval timeout for step '{step_name}'")

                    return StepResult(
                        step_id=step_id,
                        step_name=step_name,
                        step_order=step_config['step_order'],
                        status="timeout",
                        success=False,
                        deployment_mode=mode,
                        started_at=started_at,
                        completed_at=workflow.now().isoformat(),
                        error_message=f"Approval timeout after {timeout_minutes} minutes"
                    )

                # Get approval result
                approval = self.step_approvals[step_id]

                if approval.action == 'approved':
                    workflow.logger.info(f"Step '{step_name}' approved by {approval.user_id}")

                    # Use edited data if provided
                    execution_data = approval.edited_data or input_data

                    # Execute the step
                    result = await self.run_step_activity(step_config, execution_data)

                    return StepResult(
                        step_id=step_id,
                        step_name=step_name,
                        step_order=step_config['step_order'],
                        status="completed",
                        success=True,
                        deployment_mode=mode,
                        started_at=started_at,
                        completed_at=workflow.now().isoformat(),
                        duration_ms=result.get('duration_ms'),
                        approved_by=approval.user_id,
                        approval_notes=approval.notes,
                        output_data=result.get('output')
                    )
                else:
                    workflow.logger.warning(f"Step '{step_name}' rejected by {approval.user_id}")

                    return StepResult(
                        step_id=step_id,
                        step_name=step_name,
                        step_order=step_config['step_order'],
                        status="rejected",
                        success=False,
                        deployment_mode=mode,
                        started_at=started_at,
                        completed_at=workflow.now().isoformat(),
                        rejected_by=approval.user_id,
                        rejection_reason=approval.notes
                    )

        except Exception as e:
            workflow.logger.error(f"Step '{step_name}' failed with error: {e}")

            return StepResult(
                step_id=step_id,
                step_name=step_name,
                step_order=step_config['step_order'],
                status="failed",
                success=False,
                deployment_mode=mode,
                started_at=started_at,
                completed_at=workflow.now().isoformat(),
                error_message=str(e)
            )

    async def run_step_activity(self, step_config: dict, input_data: dict) -> dict:
        """Execute the actual step activity"""

        # Get retry attempts based on impact level
        retry_attempts = {
            'accessory': 1,
            'read': 3,
            'write': 2,
            'critical': 1,
            'external': 3
        }.get(step_config['impact_level'], 3)

        # Execute activity
        result = await workflow.execute_activity(
            step_config['step_type'],
            args=[input_data],
            start_to_close_timeout=timedelta(seconds=step_config.get('timeout_seconds', 60)),
            retry_policy=RetryPolicy(
                maximum_attempts=retry_attempts,
                initial_interval=timedelta(seconds=1),
                backoff_coefficient=2.0
            )
        )

        return result

    @workflow.signal
    async def approve_step(self, approval: ApprovalSignal):
        """
        Signal handler for step approval/rejection
        Frontend calls API → API sends this signal → Workflow continues
        """
        workflow.logger.info(
            f"Received {approval.action} signal for step {approval.step_id} "
            f"from user {approval.user_id}"
        )
        self.step_approvals[approval.step_id] = approval

    @workflow.query
    def get_execution_status(self) -> dict:
        """
        Query handler for real-time status updates
        Frontend polls this for timeline display
        """
        return {
            'workflow_id': workflow.info().workflow_type,
            'execution_id': workflow.info().workflow_run_id,
            'status': 'running',
            'current_step_index': self.current_step_index,
            'total_steps': self.current_step_index + 1,
            'completed_steps': len([r for r in self.step_results if r.success]),
            'step_results': [asdict(r) for r in self.step_results],
            'pending_approvals': [
                step_id for step_id, approval in self.step_approvals.items()
                if approval is None
            ]
        }
