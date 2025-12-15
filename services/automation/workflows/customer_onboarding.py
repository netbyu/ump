"""
Example: Customer Onboarding Workflow
Demonstrates per-step deployment modes
"""
from temporalio import workflow
from .base_workflow import BaseWorkflowWithApprovals
from datetime import timedelta


@workflow.defn
class CustomerOnboardingWorkflow(BaseWorkflowWithApprovals):
    """
    Customer onboarding workflow with mixed step deployment modes:

    Step 1: Validate Email       → Always Auto (accessory)
    Step 2: Check Duplicates     → Auto Monitored (read)
    Step 3: Create CRM Record    → Validation Required (write)
    Step 4: Setup Billing        → Always Manual (critical)
    Step 5: Send Welcome Email   → Always Auto (accessory)
    Step 6: Notify Team          → Always Auto (accessory)
    """

    @workflow.run
    async def run(self, customer_data: dict) -> dict:
        """Execute customer onboarding workflow"""

        workflow.logger.info(
            f"Starting customer onboarding for: {customer_data.get('email')}"
        )

        # Use base class implementation
        # It will:
        # 1. Get step configs from PostgreSQL
        # 2. Execute each step based on its mode
        # 3. Wait for approvals where needed
        # 4. Return results

        result = await super().run({
            **customer_data,
            'workflow_id': 'customer_onboarding'
        })

        return result


# Register workflow
# In worker: worker.register_workflow(CustomerOnboardingWorkflow)
