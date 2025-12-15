"""
Specific Step Activity Implementations
These are the actual operations executed by workflow steps
"""
from temporalio import activity
from datetime import datetime
import httpx
import asyncpg
from typing import Optional


@activity.defn
async def validate_email(input_data: dict) -> dict:
    """
    Step Activity: Validate email address
    Impact: Accessory (always auto)
    """
    start_time = datetime.now()
    email = input_data.get('email')

    activity.logger.info(f"Validating email: {email}")

    # Simple validation (in real app, use email validation service)
    is_valid = '@' in email and '.' in email

    duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

    return {
        'success': is_valid,
        'output': {'email': email, 'is_valid': is_valid},
        'duration_ms': duration_ms
    }


@activity.defn
async def check_duplicates(input_data: dict) -> dict:
    """
    Step Activity: Check for duplicate customers
    Impact: Read (auto-monitored)
    """
    start_time = datetime.now()
    email = input_data.get('email')

    activity.logger.info(f"Checking for duplicates: {email}")

    # Query database for existing customer
    # (Simulated - replace with actual DB query)
    async with db_pool.acquire() as conn:
        existing = await conn.fetchrow("""
            SELECT id, name, email
            FROM customers
            WHERE email = $1
            LIMIT 1
        """, email)

        has_duplicate = existing is not None

    duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

    return {
        'success': True,
        'output': {
            'has_duplicate': has_duplicate,
            'existing_customer': dict(existing) if existing else None
        },
        'duration_ms': duration_ms
    }


@activity.defn
async def create_crm_record(input_data: dict) -> dict:
    """
    Step Activity: Create CRM record
    Impact: Write (validation required)
    """
    start_time = datetime.now()

    activity.logger.info(f"Creating CRM record for: {input_data.get('email')}")

    # Create record in CRM (e.g., Salesforce API)
    # (Simulated - replace with actual CRM API call)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.salesforce.com/services/data/v55.0/sobjects/Contact",
                headers={
                    "Authorization": f"Bearer {os.environ.get('SALESFORCE_TOKEN')}",
                    "Content-Type": "application/json"
                },
                json={
                    "FirstName": input_data.get('first_name'),
                    "LastName": input_data.get('last_name'),
                    "Email": input_data.get('email'),
                    "Phone": input_data.get('phone'),
                    "Company": input_data.get('company'),
                    "Title": input_data.get('title')
                },
                timeout=30.0
            )

            response.raise_for_status()
            result = response.json()
            record_id = result.get('id')

    except Exception as e:
        activity.logger.error(f"Failed to create CRM record: {e}")
        return {
            'success': False,
            'error': str(e),
            'duration_ms': int((datetime.now() - start_time).total_seconds() * 1000)
        }

    duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

    return {
        'success': True,
        'output': {'record_id': record_id},
        'duration_ms': duration_ms
    }


@activity.defn
async def setup_billing_account(input_data: dict) -> dict:
    """
    Step Activity: Setup billing account
    Impact: Critical (always manual)
    """
    start_time = datetime.now()

    activity.logger.info(f"Setting up billing for: {input_data.get('email')}")

    # Setup Stripe customer
    # (Simulated - replace with actual Stripe API)
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.stripe.com/v1/customers",
                headers={
                    "Authorization": f"Bearer {os.environ.get('STRIPE_SECRET_KEY')}",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                data={
                    "email": input_data.get('email'),
                    "name": input_data.get('name'),
                    "metadata[customer_id]": input_data.get('customer_id')
                },
                timeout=30.0
            )

            response.raise_for_status()
            result = response.json()
            stripe_customer_id = result.get('id')

    except Exception as e:
        activity.logger.error(f"Failed to setup billing: {e}")
        return {
            'success': False,
            'error': str(e),
            'duration_ms': int((datetime.now() - start_time).total_seconds() * 1000)
        }

    duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

    return {
        'success': True,
        'output': {'stripe_customer_id': stripe_customer_id},
        'duration_ms': duration_ms
    }


@activity.defn
async def send_email(input_data: dict) -> dict:
    """
    Step Activity: Send email
    Impact: Accessory (always auto)
    """
    start_time = datetime.now()

    recipient = input_data.get('recipient')
    subject = input_data.get('subject')
    template = input_data.get('template_name')

    activity.logger.info(f"Sending email to: {recipient}")

    # Send email via service (e.g., SendGrid, AWS SES)
    # (Simulated)
    try:
        # Actual email sending logic here
        email_sent = True
        message_id = f"msg_{datetime.now().timestamp()}"
    except Exception as e:
        activity.logger.error(f"Failed to send email: {e}")
        email_sent = False
        message_id = None

    duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

    return {
        'success': email_sent,
        'output': {'message_id': message_id},
        'duration_ms': duration_ms
    }


@activity.defn
async def notify_team(input_data: dict) -> dict:
    """
    Step Activity: Notify team via Slack/webhook
    Impact: Accessory (always auto)
    """
    start_time = datetime.now()

    activity.logger.info("Sending team notification")

    # Send Slack notification
    # (Simulated)
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                os.environ.get('SLACK_WEBHOOK_URL', 'https://hooks.slack.com/...'),
                json={
                    'text': f"New customer onboarded: {input_data.get('email')}"
                },
                timeout=10.0
            )
    except Exception as e:
        activity.logger.warning(f"Failed to send Slack notification: {e}")

    duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)

    return {
        'success': True,
        'output': {'notified': True},
        'duration_ms': duration_ms
    }
