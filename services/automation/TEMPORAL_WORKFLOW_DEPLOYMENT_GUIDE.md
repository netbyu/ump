# Temporal Workflow Deployment System - Complete Guide

Granular per-step deployment control with Temporal orchestration.

## 🎯 System Overview

A sophisticated workflow deployment system that provides **per-step control** over automation levels:
- **Manual Mode** - Step-by-step approval with "Continue" buttons
- **Monitoring Mode** - Auto-run with success rate tracking
- **Automated Mode** - Fully automated after proving reliability
- **Per-Step Modes** - Each step can have its own deployment mode

**Powered by:**
- **Temporal** - Workflow orchestration, signals, queries
- **PostgreSQL** - Step configs, metrics, approvals
- **FastAPI** - API layer between frontend and Temporal
- **Next.js** - Visual timeline UI with real-time updates

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────┐
│         Next.js Frontend                     │
│  - Visual timeline (polls Temporal)          │
│  - Approval buttons (send signals)           │
│  - Real-time updates every 2 seconds         │
└─────────────────┬────────────────────────────┘
                  │
                  │ HTTP REST
                  │
┌─────────────────▼────────────────────────────┐
│         FastAPI Backend                      │
│  - Temporal client integration               │
│  - Send signals (approve/reject)             │
│  - Query workflow status                     │
│  - Store step configs in PostgreSQL          │
└───────┬──────────────────────┬───────────────┘
        │                      │
        │                      │
┌───────▼──────┐      ┌────────▼──────────────┐
│ PostgreSQL   │      │  Temporal Server      │
│              │      │                       │
│ Step Configs │      │ ┌──────────────────┐ │
│ Metrics      │      │ │ Workflow Running │ │
│ Approvals    │      │ │ await signal()   │ │
│ Analytics    │      │ │   ⏸️ Paused       │ │
└──────────────┘      │ └──────────────────┘ │
                      │                       │
                      │ User clicks "Continue"│
                      │       ↓               │
                      │ Signal received       │
                      │       ↓               │
                      │ ▶️ Continues execution│
                      └───────────────────────┘
```

---

## 📁 Complete File Structure

```
services/automation/
├── workflows/
│   ├── base_workflow.py                 ✨ Base workflow with approvals
│   └── customer_onboarding.py           ✨ Example workflow
│
├── activities/
│   ├── workflow_activities.py           ✨ Config, preview, impact analysis
│   └── step_activities.py               ✨ Actual step implementations
│
├── api/
│   ├── temporal_client.py               ✨ Temporal client manager
│   └── routes/
│       └── workflow_executions.py       ✨ API endpoints
│
└── workflow_deployment_schema.sql       ✨ PostgreSQL schema

apps/web/
├── components/automation/
│   ├── workflow-execution-timeline.tsx  ✨ Visual timeline
│   └── step-approval-interface.tsx      ✨ Approval UI with Continue button
│
└── app/(dashboard)/automation/
    ├── workflows/[id]/
    │   └── execute/page.tsx              ✨ Execution view
    └── executions/[id]/page.tsx          ✨ Step configuration
```

---

## 🎯 Step Classification System

### **Impact Levels:**

| Level | Risk | Examples | Default Mode | Promotion Path |
|-------|------|----------|--------------|----------------|
| **Accessory** | Low | Logs, notifications, non-critical | Always Auto | N/A (stays auto) |
| **Read** | Low | Database queries, API GET calls | Auto Monitored | → Always Auto |
| **Write** | Medium | Create/update records, POST/PUT | Validation Required | → Auto Monitored → Always Auto |
| **Critical** | High | Delete data, process payments | Always Manual | → Validation Required → Auto Monitored |
| **External** | Variable | Third-party API calls | Validation Required | → Auto Monitored |

### **Deployment Modes:**

| Mode | Icon | Description | Behavior |
|------|------|-------------|----------|
| **Always Auto** | 🤖 | No approval | Executes immediately |
| **Auto Monitored** | 📊 | Auto with tracking | Runs + logs metrics |
| **Validation Required** | 👤 | Human check | Shows preview + Continue button |
| **Always Manual** | ✋ | Always approve | Never auto-promotes |

---

## 🎨 Visual Timeline Example

### **Workflow Execution View:**

```
┌────────────────────────────────────────────────────┐
│ Customer Onboarding Workflow - Execution #abc123   │
│ Status: Running • 2/5 steps completed              │
│ [████████░░░░░░░░░░░░] 40%                        │
├────────────────────────────────────────────────────┤
│                                                    │
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  │                                                 │
│  │  STEP 1 🤖 Auto                                │
│  │  Validate Email                         ✓      │
│  │  ✓ Completed in 234ms                          │
│  │                                                 │
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  │                                                 │
│  │  STEP 2 📊 Monitored                           │
│  │  Check Duplicates                        ✓      │
│  │  ✓ Completed in 1.2s • No duplicates found     │
│  │                                                 │
│  ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  │                                                 │
│  │  STEP 3 👤 Validation         ⏸️ Waiting Approval│
│  │  Create CRM Record                              │
│  │  ┌──────────────────────────────────────────┐  │
│  │  │ ℹ️ Operation Preview                     │  │
│  │  │                                          │  │
│  │  │ Action:  CREATE                          │  │
│  │  │ Target:  salesforce.contacts (PRODUCTION)│  │
│  │  │                                          │  │
│  │  │ New Record:                              │  │
│  │  │ • name: "John Doe"                       │  │
│  │  │ • email: "john@example.com"              │  │
│  │  │ • tier: "premium"                        │  │
│  │  │ • credit_limit: $5,000                   │  │
│  │  └──────────────────────────────────────────┘  │
│  │  ┌──────────────────────────────────────────┐  │
│  │  │ ⚠️ Impact Analysis                       │  │
│  │  │                                          │  │
│  │  │ • ⚠️ Execute in PRODUCTION environment   │  │
│  │  │ • Creates new customer record            │  │
│  │  │ • 💳 Setting credit limit to $5,000      │  │
│  │  └──────────────────────────────────────────┘  │
│  │                                                 │
│  │  Confirmation Required:                         │
│  │  ☑ I have reviewed the customer data           │
│  │  ☑ I confirm this is for PRODUCTION             │
│  │  ☐ I have approval for credit limit >$1,000    │
│  │                                                 │
│  │  [✓ Approve & Continue]  [✗ Reject]            │
│  │                                                 │
│  ⏳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  │                                                 │
│  │  STEP 4 ✋ Manual                    Pending    │
│  │  Setup Billing Account                          │
│  │  Waiting for Step 3...                          │
│  │                                                 │
│  ⏳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  │                                                 │
│  │  STEP 5 🤖 Auto                       Pending   │
│  │  Send Welcome Email                             │
│  │                                                 │
└────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Flow Example

### **1. Start Workflow (Temporal)**

```bash
# User clicks "Execute Workflow" in UI
POST /api/workflows/executions/start

# API starts Temporal workflow
client.start_workflow(
    CustomerOnboardingWorkflow.run,
    args=[customer_data],
    id="onboarding-12345"
)
```

### **2. Step 1 Executes (Auto)**

```python
# Temporal workflow executes
mode = 'always_auto'  # From PostgreSQL

# No approval needed, runs immediately
result = await execute_activity('validate_email', customer_data)

# Status: completed ✓
```

### **3. Step 2 Executes (Monitored)**

```python
mode = 'auto_monitored'

# Runs automatically
result = await execute_activity('check_duplicates', customer_data)

# Logs metrics to PostgreSQL for analytics
await log_step_metrics(step_id, result)

# Status: completed ✓
```

### **4. Step 3 Waits for Approval (Manual)**

```python
mode = 'validation_required'

# Generate preview
preview = await generate_step_preview(step_config, customer_data)

# Analyze impact
impact = await analyze_step_impact(step_config, preview)

# Notify frontend (WebSocket/webhook)
await notify_approval_needed(execution_id, step_id, preview, impact)

# ⏸️ WORKFLOW PAUSES HERE
await workflow.wait_condition(
    lambda: step_id in self.step_approvals,
    timeout=timedelta(minutes=30)
)

# Status: waiting_approval ⏸️
```

### **5. User Reviews in UI**

**Frontend shows:**
```
┌────────────────────────────────────────┐
│ STEP 3 👤 Validation    ⏸️ Waiting     │
│ Create CRM Record                       │
│                                        │
│ [Preview Data]                         │
│ [Impact Warnings]                      │
│ [Confirmation Checkboxes]              │
│                                        │
│ [✓ Approve & Continue]  [✗ Reject]    │
└────────────────────────────────────────┘
```

### **6. User Clicks "Approve & Continue"**

```bash
# Frontend sends request
POST /api/workflows/executions/{id}/steps/{step_id}/approve

# API sends Temporal signal
await handle.signal("approve_step", {
    step_id: step_id,
    user_id: user_id,
    action: 'approved'
})
```

### **7. Workflow Continues Immediately**

```python
# Signal received!
approval = self.step_approvals[step_id]

if approval.action == 'approved':
    # ▶️ WORKFLOW RESUMES
    result = await execute_activity('create_crm_record', customer_data)

    # Continues to next step
    # Status: completed ✓
```

### **8. Remaining Steps Execute**

```
Step 4: Always Manual → Waits for approval
Step 5: Always Auto → Runs automatically

Workflow completes!
```

---

## 📊 Promotion System

### **How Steps Get Promoted:**

```
1. Step starts in: Validation Required
   (127 runs, 97.5% success)

2. Criteria Check:
   ✓ Success Rate: 97.5% ≥ 95% required
   ✗ Total Runs: 127 < 200 required
   ⏳ Need 73 more runs

3. After 200 runs at 98% success:
   ✓ All criteria met
   🚀 Auto-promote to: Auto Monitored

4. Step now in: Auto Monitored
   (Runs automatically, heavily tracked)

5. After 500 runs at 99% success:
   🚀 Auto-promote to: Always Auto

6. Step now: Always Auto
   (Fully automated, no approval)
```

### **Promotion Criteria by Impact:**

```typescript
const PROMOTION_CRITERIA = {
  accessory: {
    min_success_rate: 95.0,
    min_successful_runs: 50,
    monitoring_days: 3
  },
  read: {
    min_success_rate: 98.0,
    min_successful_runs: 100,
    monitoring_days: 7
  },
  write: {
    min_success_rate: 98.0,
    min_successful_runs: 200,
    monitoring_days: 14
  },
  critical: {
    min_success_rate: 99.9,
    min_successful_runs: 500,
    monitoring_days: 30
  }
};
```

---

## 🎨 UI Components Built

### **1. Visual Timeline** (`workflow-execution-timeline.tsx`)

**Features:**
- ✅ Vertical timeline with step progression
- ✅ Real-time status updates (polls every 2s)
- ✅ Step icons (✓, ⏸️, ⏳, ✗)
- ✅ Mode badges (🤖, 📊, 👤)
- ✅ Progress bar
- ✅ Duration tracking
- ✅ Inline approval interfaces

### **2. Step Approval Interface** (`step-approval-interface.tsx`)

**Features:**
- ✅ Operation preview (what will execute)
- ✅ Impact analysis (warnings)
- ✅ Multi-checkbox confirmation
- ✅ Typed confirmation (for critical ops)
- ✅ **"Approve & Continue" button** (green, prominent)
- ✅ Reject button with reason field
- ✅ Environment badges (PRODUCTION warning)
- ✅ Data change visualization (old → new)

### **3. Step Configuration UI** (`executions/[id]/page.tsx`)

**Features:**
- ✅ Per-step impact level selector
- ✅ Deployment mode selector
- ✅ Custom promotion criteria
- ✅ Success rate thresholds
- ✅ Promotion status indicators
- ✅ Analytics integration

---

## 💡 Real-World Example

### **Scenario: Customer Onboarding**

```
Week 1: All Manual (Learning Phase)
─────────────────────────────────────
Run workflow 20 times manually
Approve every step
Learn edge cases, fix bugs
Success rate: 100% (manual = safe)

Week 2: Promote Accessory Steps
─────────────────────────────────────
Step 1: Validate Email      → 🤖 Always Auto
Step 5: Send Welcome Email  → 🤖 Always Auto

These are low-risk, proven reliable
Now only 3 steps need approval

Week 4: Promote Read Operations
─────────────────────────────────────
Step 2: Check Duplicates    → 📊 Auto Monitored
(After 100 runs @ 99% success)

Now only 2 steps need approval

Week 8: Promote Write Operations
─────────────────────────────────────
Step 3: Create CRM Record   → 📊 Auto Monitored
(After 200 runs @ 98% success)

Only critical step needs approval

Week 12: Graduate CRM Step
─────────────────────────────────────
Step 3: Create CRM Record   → 🤖 Always Auto
(After 500 runs @ 99% success)

Only billing setup still manual

Final State: Step 4 (Critical) stays Always Manual
─────────────────────────────────────
Payment operations always need human approval
All other steps fully automated
```

---

## 🔧 Temporal Workflow Code Walkthrough

### **Step Execution with Mode Detection:**

```python
async def execute_step_with_mode(self, step_config, input_data, previous_results):
    mode = step_config['deployment_mode']

    # ========================================
    # ALWAYS_AUTO: Just run it
    # ========================================
    if mode == 'always_auto':
        return await self.run_step_activity(step_config, input_data)

    # ========================================
    # VALIDATION_REQUIRED: Wait for approval
    # ========================================
    elif mode == 'validation_required':
        # 1. Generate preview
        preview = await generate_step_preview(...)

        # 2. Analyze impact
        impact = await analyze_step_impact(...)

        # 3. Notify frontend (WebSocket)
        await notify_approval_needed(...)

        # 4. ⏸️ WAIT FOR SIGNAL (this pauses the workflow!)
        await workflow.wait_condition(
            lambda: step_id in self.step_approvals,
            timeout=timedelta(minutes=30)
        )

        # 5. Signal received! Check if approved or rejected
        approval = self.step_approvals[step_id]

        if approval.action == 'approved':
            # ▶️ CONTINUE - execute the step
            return await self.run_step_activity(...)
        else:
            # ✗ REJECTED - fail gracefully
            return {'status': 'rejected', 'success': False}
```

### **Temporal Signals (The "Continue" Mechanism):**

```python
@workflow.signal
async def approve_step(self, approval: ApprovalSignal):
    """
    This signal handler is called when user clicks "Approve & Continue"
    The workflow immediately wakes up and continues execution
    """
    self.step_approvals[approval.step_id] = approval
    # That's it! The wait_condition above will now pass
    # Workflow continues to next line
```

---

## 🚀 Getting Started

### **1. Deploy Database Schema**

```bash
cd /home/ubuntu/vscode/ump/services/automation
psql -U postgres -d ump -f workflow_deployment_schema.sql
```

### **2. Start Temporal Worker**

```python
# worker.py
from temporalio.worker import Worker
from temporalio.client import Client
from workflows.customer_onboarding import CustomerOnboardingWorkflow
from activities.workflow_activities import *
from activities.step_activities import *

async def main():
    client = await Client.connect("localhost:7233")

    worker = Worker(
        client,
        task_queue="automation-workflows",
        workflows=[CustomerOnboardingWorkflow],
        activities=[
            get_step_deployment_configs,
            generate_step_preview,
            analyze_step_impact,
            notify_step_approval_needed,
            validate_email,
            check_duplicates,
            create_crm_record,
            setup_billing_account,
            send_email,
            notify_team,
        ]
    )

    await worker.run()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

```bash
python worker.py
```

### **3. Configure Workflow Steps**

```sql
-- Insert step configurations
INSERT INTO workflow_step_deployments (
    workflow_id, step_id, step_name, step_order, step_type,
    impact_level, risk_level, current_mode
) VALUES
    ('customer_onboarding', 'step-1', 'Validate Email', 1, 'validate_email',
     'accessory', 'low', 'always_auto'),
    ('customer_onboarding', 'step-2', 'Check Duplicates', 2, 'check_duplicates',
     'read', 'low', 'auto_monitored'),
    ('customer_onboarding', 'step-3', 'Create CRM Record', 3, 'create_crm_record',
     'write', 'medium', 'validation_required'),
    ('customer_onboarding', 'step-4', 'Setup Billing', 4, 'setup_billing_account',
     'critical', 'critical', 'always_manual'),
    ('customer_onboarding', 'step-5', 'Send Welcome Email', 5, 'send_email',
     'accessory', 'low', 'always_auto');
```

### **4. Execute Workflow**

```bash
# Via UI
http://localhost:3000/automation/workflows/customer_onboarding/execute

# Or via API
POST /api/workflows/executions/start
{
  "workflow_id": "customer_onboarding",
  "workflow_data": {
    "email": "john@example.com",
    "name": "John Doe",
    "tier": "premium"
  }
}
```

### **5. View Timeline & Approve Steps**

```
1. Navigate to execution page
2. See visual timeline with all steps
3. Steps execute automatically or wait
4. When step needs approval:
   - Review preview data
   - Check impact warnings
   - Complete confirmations
   - Click "Approve & Continue"
5. Temporal workflow resumes immediately!
6. Watch next steps execute in real-time
```

---

## 📈 Analytics & Promotion

### **View Step Analytics:**

```
GET /api/workflows/{workflow_id}/steps/{step_id}/analytics

Returns:
{
  "step_id": "step-3",
  "step_name": "Create CRM Record",
  "current_mode": "validation_required",
  "metrics": {
    "total_runs": 127,
    "success_rate": 97.5,
    "consecutive_successes": 45
  },
  "promotion_ready": false,
  "criteria_progress": {
    "success_rate": "97.5% / 95% ✓",
    "total_runs": "127 / 200 ✗",
    "consecutive": "45 / 50 ✗"
  },
  "estimated_promotion_in_days": 12
}
```

### **Auto-Promote Step:**

```bash
# When all criteria met, promote
POST /api/workflows/{workflow_id}/steps/{step_id}/promote

# Updates step_deployment_mode in PostgreSQL
UPDATE workflow_step_deployments
SET current_mode = 'auto_monitored',
    promoted_from = 'validation_required',
    promoted_at = NOW()
WHERE step_id = $1
```

---

## 🎯 Benefits

✅ **Granular Control** - Per-step automation levels
✅ **Risk-Based** - High-risk steps stay manual longer
✅ **Progressive** - Gradual automation as confidence grows
✅ **Temporal-Powered** - Durable, reliable execution
✅ **Visual Timeline** - See exactly what's happening
✅ **Real-Time** - Updates every 2 seconds
✅ **Safe** - Preview + confirm before critical ops
✅ **Analytics-Driven** - Data-based promotion decisions

---

## 🎉 Complete!

Your Temporal-integrated workflow deployment system is ready with:

- ✅ **Temporal Workflows** - Durable step execution
- ✅ **Signal-Based Approvals** - "Continue" buttons work via Temporal signals
- ✅ **Visual Timeline** - Real-time execution tracking
- ✅ **Per-Step Modes** - Granular automation control
- ✅ **Impact Analysis** - Smart validation based on risk
- ✅ **Promotion System** - Auto-graduate to automation
- ✅ **Analytics** - Track success rates and promote when ready

Ready to deploy! 🚀
