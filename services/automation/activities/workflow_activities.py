"""
Temporal Activities for Workflow Execution
Handles step execution, previews, impact analysis, and notifications
"""
from temporalio import activity
from datetime import datetime
from typing import Optional
import asyncpg
import httpx
import os


# Database connection pool (initialize in worker)
db_pool: Optional[asyncpg.Pool] = None


async def init_db_pool():
    """Initialize database connection pool"""
    global db_pool
    database_url = os.environ.get(
        'DATABASE_URL',
        'postgresql://postgres:postgres@localhost:5432/ump'
    )
    db_pool = await asyncpg.create_pool(database_url)


@activity.defn
async def get_step_deployment_configs(workflow_id: str) -> list[dict]:
    """
    Get step deployment configurations from PostgreSQL
    Returns ordered list of steps with their deployment modes
    """
    activity.logger.info(f"Fetching step configs for workflow: {workflow_id}")

    async with db_pool.acquire() as conn:
        rows = await conn.fetch("""
            SELECT
                step_id::text,
                step_name,
                step_order,
                step_type,
                current_mode::text as deployment_mode,
                impact_level::text,
                risk_level,
                validation_config,
                promotion_criteria,
                monitoring_config,
                COALESCE((validation_config->>'timeout_seconds')::integer, 60) as timeout_seconds
            FROM workflow_step_deployments
            WHERE workflow_id = $1 AND is_active = true
            ORDER BY step_order ASC
        """, workflow_id)

        return [dict(row) for row in rows]


@activity.defn
async def generate_step_preview(
    step_config: dict,
    input_data: dict,
    previous_results: list
) -> dict:
    """
    Generate preview of what the step will execute
    This is shown to the user during approval
    """
    step_type = step_config['step_type']
    activity.logger.info(f"Generating preview for step type: {step_type}")

    # ======================================
    # CRM Operations
    # ======================================
    if step_type == 'create_crm_record':
        return {
            'operation': 'CREATE',
            'target': 'salesforce.contacts',
            'environment': input_data.get('environment', 'PRODUCTION'),
            'record_data': {
                'name': input_data.get('name'),
                'email': input_data.get('email'),
                'company': input_data.get('company'),
                'tier': input_data.get('tier', 'free'),
                'credit_limit': input_data.get('credit_limit', 0)
            }
        }

    elif step_type == 'update_crm_record':
        return {
            'operation': 'UPDATE',
            'target': f"salesforce.contacts (ID: {input_data.get('record_id')})",
            'environment': input_data.get('environment', 'PRODUCTION'),
            'changes': [
                {
                    'field': 'status',
                    'old_value': input_data.get('old_status'),
                    'new_value': input_data.get('new_status')
                },
                {
                    'field': 'tier',
                    'old_value': input_data.get('old_tier'),
                    'new_value': input_data.get('new_tier')
                },
                {
                    'field': 'credit_limit',
                    'old_value': input_data.get('old_credit_limit'),
                    'new_value': input_data.get('new_credit_limit')
                }
            ]
        }

    # ======================================
    # Billing/Payment Operations
    # ======================================
    elif step_type == 'setup_billing_account':
        return {
            'operation': 'PAYMENT_SETUP',
            'target': 'stripe.customers',
            'environment': 'PRODUCTION',
            'customer_data': {
                'email': input_data.get('email'),
                'name': input_data.get('name'),
                'payment_method': input_data.get('payment_method_type', 'card'),
                'credit_limit': input_data.get('credit_limit'),
                'currency': input_data.get('currency', 'USD')
            }
        }

    elif step_type == 'process_refund':
        amount = input_data.get('refund_amount', 0)
        return {
            'operation': 'REFUND',
            'target': 'stripe.refunds',
            'environment': 'PRODUCTION',
            'transaction_details': {
                'customer_id': input_data.get('customer_id'),
                'original_charge_id': input_data.get('charge_id'),
                'refund_amount': f"${amount:.2f} {input_data.get('currency', 'USD')}",
                'reason': input_data.get('refund_reason'),
                'refund_percentage': f"{(amount / input_data.get('original_amount', 1) * 100):.1f}%"
            }
        }

    # ======================================
    # Database Operations
    # ======================================
    elif step_type == 'database_write':
        return {
            'operation': input_data.get('operation', 'UNKNOWN'),
            'target': f"{input_data.get('database')}.{input_data.get('table')}",
            'environment': input_data.get('environment', 'UNKNOWN'),
            'record_count': input_data.get('record_count', 1),
            'affected_fields': input_data.get('fields', [])
        }

    # ======================================
    # Communication Operations
    # ======================================
    elif step_type == 'send_email':
        return {
            'operation': 'SEND_EMAIL',
            'target': input_data.get('recipient'),
            'email_details': {
                'to': input_data.get('recipient'),
                'subject': input_data.get('subject'),
                'template': input_data.get('template_name'),
                'variables': input_data.get('template_vars', {})
            }
        }

    # ======================================
    # Default Preview
    # ======================================
    return {
        'operation': step_type.upper(),
        'data': input_data
    }


@activity.defn
async def analyze_step_impact(step_config: dict, preview_data: dict) -> dict:
    """
    Analyze the impact of executing a step
    Returns warnings and required confirmations
    """
    impact_level = step_config['impact_level']
    risk_level = step_config['risk_level']
    environment = preview_data.get('environment', 'UNKNOWN')

    activity.logger.info(
        f"Analyzing impact: {impact_level} risk in {environment}"
    )

    warnings = []
    required_checks = []
    confirmation_text = None
    require_typed_confirmation = False

    # ======================================
    # Environment-based warnings
    # ======================================
    if environment == 'PRODUCTION':
        warnings.append("⚠️ This will execute in PRODUCTION environment")
        required_checks.append("I confirm this is for PRODUCTION")

    # ======================================
    # Impact-level warnings
    # ======================================
    if impact_level == 'accessory':
        # No warnings for accessory operations
        pass

    elif impact_level == 'read':
        warnings.append("This will query data from the system")

    elif impact_level == 'write':
        warnings.append("This will modify data in the system")
        required_checks.extend([
            "I have reviewed the changes",
            "I understand data will be modified"
        ])

    elif impact_level == 'critical':
        warnings.extend([
            "🚨 CRITICAL OPERATION - This action cannot be undone",
            "This operation has significant impact",
            "Review all details carefully before proceeding"
        ])
        required_checks.extend([
            "I have reviewed all operation details",
            "I understand this operation is irreversible",
            "I have appropriate authorization for this action"
        ])

    # ======================================
    # Operation-specific warnings
    # ======================================
    operation = preview_data.get('operation', '')

    # Payment/Refund operations
    if operation in ['REFUND', 'PAYMENT_SETUP', 'CHARGE']:
        warnings.append("💰 This involves REAL MONEY")
        required_checks.append("I have verified the payment details")

        if operation == 'REFUND':
            amount = extract_amount(preview_data)
            warnings.append(f"Customer will receive ${amount:.2f}")
            confirmation_text = f"REFUND {amount:.2f}"
            require_typed_confirmation = True

    # Data deletion
    if operation in ['DELETE', 'REMOVE']:
        warnings.append("🗑️ This will DELETE data permanently")
        required_checks.append("I have confirmed this data should be deleted")
        confirmation_text = "DELETE"
        require_typed_confirmation = True

    # Bulk operations
    record_count = preview_data.get('record_count', 1)
    if record_count > 100:
        warnings.append(f"📊 Bulk operation: Affects {record_count} records")
        required_checks.append(f"I have verified all {record_count} records")

    # Credit limit changes
    if 'credit_limit' in str(preview_data):
        credit_limit = extract_credit_limit(preview_data)
        if credit_limit > 1000:
            warnings.append(f"💳 Setting credit limit to ${credit_limit:,}")
            required_checks.append("I have approval for this credit limit")

    return {
        'impact_level': impact_level,
        'risk_level': risk_level,
        'environment': environment,
        'warnings': warnings,
        'required_checks': required_checks,
        'confirmation_text': confirmation_text,
        'require_typed_confirmation': require_typed_confirmation
    }


@activity.defn
async def notify_step_approval_needed(notification_data: dict):
    """
    Notify that a step needs approval
    Sends WebSocket message, email, Slack, etc.
    """
    execution_id = notification_data['execution_id']
    step_name = notification_data['step_name']

    activity.logger.info(f"Sending approval notification for step: {step_name}")

    # Send WebSocket message to frontend
    # (Assumes WebSocket server running)
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "http://localhost:3000/api/websocket/broadcast",
                json={
                    'channel': f"workflow_execution:{execution_id}",
                    'event': 'STEP_APPROVAL_REQUIRED',
                    'data': notification_data
                },
                timeout=5.0
            )
    except Exception as e:
        activity.logger.warning(f"Failed to send WebSocket notification: {e}")

    # TODO: Send email notification
    # TODO: Send Slack notification
    # TODO: Create task in task queue


@activity.defn
async def log_step_execution_metrics(step_id: str, result: dict):
    """
    Log step execution metrics to PostgreSQL
    Used for analytics and promotion decisions
    """
    success = result.get('success', False)
    duration_ms = result.get('duration_ms', 0)

    async with db_pool.acquire() as conn:
        # Insert execution record
        await conn.execute("""
            INSERT INTO workflow_step_executions
            (step_id, status, duration_ms, executed_at)
            VALUES ($1, $2, $3, NOW())
        """, step_id, 'completed' if success else 'failed', duration_ms)

        # Update daily metrics
        await conn.execute("""
            INSERT INTO workflow_step_metrics_daily
            (workflow_id, step_id, date, total_executions, successful_executions, failed_executions)
            VALUES (
                (SELECT workflow_id FROM workflow_step_deployments WHERE step_id = $1),
                $1,
                CURRENT_DATE,
                1,
                CASE WHEN $2 THEN 1 ELSE 0 END,
                CASE WHEN $2 THEN 0 ELSE 1 END
            )
            ON CONFLICT (workflow_id, step_id, date) DO UPDATE SET
                total_executions = workflow_step_metrics_daily.total_executions + 1,
                successful_executions = workflow_step_metrics_daily.successful_executions +
                    CASE WHEN $2 THEN 1 ELSE 0 END,
                failed_executions = workflow_step_metrics_daily.failed_executions +
                    CASE WHEN $2 THEN 0 ELSE 1 END,
                success_rate = (workflow_step_metrics_daily.successful_executions +
                    CASE WHEN $2 THEN 1 ELSE 0 END)::decimal /
                    (workflow_step_metrics_daily.total_executions + 1) * 100
        """, step_id, success)


# ============================================================================
# Helper Functions
# ============================================================================

def extract_amount(preview_data: dict) -> float:
    """Extract monetary amount from preview data"""
    # Look for amount in various places
    if 'refund_amount' in str(preview_data):
        amount_str = preview_data.get('transaction_details', {}).get('refund_amount', '$0')
        return float(amount_str.replace('$', '').replace(',', '').split()[0])
    return 0.0


def extract_credit_limit(preview_data: dict) -> float:
    """Extract credit limit from preview data"""
    record_data = preview_data.get('record_data', {})
    if 'credit_limit' in record_data:
        return float(record_data['credit_limit'])

    for change in preview_data.get('changes', []):
        if change.get('field') == 'credit_limit':
            return float(change.get('new_value', 0))

    return 0.0
