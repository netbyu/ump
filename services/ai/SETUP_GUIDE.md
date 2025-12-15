# AI Compute Management - Setup Guide

Complete setup guide for the AI Compute Management system in UMP.

## Overview

The AI Compute Management system provides a web interface for managing AWS Spot GPU instances for LLM testing. It consists of:

1. **FastAPI Backend** (`services/ai/api/`) - REST API for managing instances
2. **Next.js Frontend** (`apps/web/app/(dashboard)/ai-compute/`) - Web UI
3. **PostgreSQL Database** (schema in `api/schema.sql`) - Instance tracking

## Architecture

```
┌─────────────────────┐
│   Next.js Frontend  │
│  (Port 3000)        │
└──────────┬──────────┘
           │
           │ HTTP/REST
           │
┌──────────▼──────────┐
│   FastAPI Backend   │
│   (Port 8002)       │
└──────────┬──────────┘
           │
           ├─────────────┐
           │             │
┌──────────▼──────┐  ┌──▼──────────────┐
│   PostgreSQL    │  │   AWS Boto3     │
│   (Port 5432)   │  │   EC2 API       │
└─────────────────┘  └─────────────────┘
```

## Setup Steps

### 1. Backend Setup

#### Install Python Dependencies

```bash
cd /home/ubuntu/vscode/ump/services/ai/api
pip install -r requirements.txt
```

#### Install AWS CLI (if not already installed)

```bash
# Download AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"

# Unzip the installer
unzip awscliv2.zip

# Run the install script
sudo ./aws/install

# Verify installation
aws --version
```

#### Configure AWS Credentials

**Option 1: Use AWS CLI (Recommended)**
```bash
aws configure
```

This will prompt you for:
- AWS Access Key ID
- AWS Secret Access Key
- Default region name (use `ca-central-1`)
- Default output format (use `json`)

**Option 2: Use Environment File**
```bash
# Copy example env file
cp .env.example .env

# Edit and add your AWS credentials
nano .env
```

Add these lines to `.env`:
```env
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_DEFAULT_REGION=ca-central-1
```

**Option 3: Use Environment Variables**
```bash
export AWS_ACCESS_KEY_ID=your_access_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_access_key
export AWS_DEFAULT_REGION=ca-central-1
```

#### Start the API Server

```bash
# From /home/ubuntu/vscode/ump/services/ai/api
uvicorn app.main:app --reload --port 8002

# Or using Python
python -m app.main
```

The API will be available at:
- API: http://localhost:8002
- Docs: http://localhost:8002/docs
- ReDoc: http://localhost:8002/redoc

### 2. Database Setup (Optional but Recommended)

The database is used for tracking instance history and cost analytics.

#### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database (if not exists)
CREATE DATABASE ump;
\c ump

# Run schema
\i /home/ubuntu/vscode/ump/services/ai/api/schema.sql
```

#### Configure Database Connection

In `api/.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ump
```

**Note:** The current implementation doesn't use the database yet. Instance data is fetched directly from AWS. The database schema is ready for future enhancement.

### 3. Frontend Setup

#### Install Dependencies

```bash
cd /home/ubuntu/vscode/ump/apps/web
npm install
```

#### Configure API URL

Create or edit `.env.local`:
```bash
# In /home/ubuntu/vscode/ump/apps/web/.env.local
NEXT_PUBLIC_AI_API_URL=http://localhost:8002/api
```

#### Start Development Server

```bash
npm run dev
```

The frontend will be available at: http://localhost:3000

### 4. Add Navigation Link

Edit the sidebar navigation to include AI Compute:

```tsx
// In apps/web/components/layout/sidebar.tsx or similar
{
  name: "AI Compute",
  href: "/ai-compute",
  icon: Server, // or Cpu
}
```

## Features

### 1. Dashboard (`/ai-compute`)
- Overview of active instances
- Cost summary
- Quick actions

### 2. Launch Instance (`/ai-compute/launch`)
- Select instance type (g5.xlarge, g5.2xlarge, etc.)
- Choose framework (Ollama, vLLM, TGI, llama.cpp)
- Specify model to pre-install
- Configure volume size and pricing
- Real-time cost estimates

### 3. Instance List (`/ai-compute/instances`)
- View all instances
- Filter by status
- Quick actions (view, terminate)
- Cost tracking

### 4. Instance Details (`/ai-compute/instances/[id]`)
- Full instance information
- Connection details (SSH, API endpoints)
- Cost breakdown
- Quick actions

### 5. Pricing Explorer (`/ai-compute/pricing`)
- Compare all instance types
- Real-time spot pricing
- Savings calculator
- Cost examples

## Usage

### Launch Your First Instance

1. Go to `/ai-compute/launch`
2. Select instance type (recommend starting with `g5.xlarge`)
3. Choose framework (recommend `ollama` for beginners)
4. Optional: Specify a model (e.g., `llama3.2:3b`)
5. Give it a name
6. Click "Launch Instance"

### Connect to Instance

Once the instance is running:

1. Go to `/ai-compute/instances/[instance-id]`
2. Copy the SSH command
3. SSH into the instance:
   ```bash
   ssh -i ~/.ssh/llm-testing-key.pem ubuntu@<public-ip>
   ```

4. Check setup progress:
   ```bash
   sudo tail -f /var/log/user-data.log
   ```

5. Wait for setup to complete (5-10 minutes)

### Use the LLM

#### For Ollama:
```bash
# SSH into instance
ollama run llama3.2:3b

# Or use API
curl http://<public-ip>:11434/api/generate -d '{
  "model": "llama3.2:3b",
  "prompt": "Hello!"
}'
```

#### For vLLM (OpenAI-compatible):
```bash
curl http://<public-ip>:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "meta-llama/Llama-3.2-3B",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Terminate Instance

**Important:** Remember to terminate instances when done to avoid costs!

1. Go to `/ai-compute/instances`
2. Click the trash icon next to the instance
3. Confirm termination

Or use the API:
```bash
curl -X DELETE http://localhost:8002/api/instances/i-0abc123def456
```

## Cost Management

### Understanding Spot Prices

- **On-Demand**: Fixed price, always available
- **Spot**: Variable price (usually 60-90% cheaper), can be interrupted
- The system automatically sets a maximum price to prevent overcharges

### Cost Tracking

The dashboard shows:
- Current running cost per instance
- Total estimated cost across all instances
- Uptime hours

### Tips to Save Money

1. Use spot instances (default)
2. Terminate instances when not in use
3. Choose the smallest instance that fits your model
4. Use quantized models when possible (e.g., `llama3.1:8b-q4`)

## Troubleshooting

### API Not Starting

```bash
# Check if boto3 is installed
pip list | grep boto3

# Check AWS credentials
aws sts get-caller-identity

# Check Python version (requires 3.12+)
python --version
```

### Frontend Can't Connect to API

```bash
# Verify API is running
curl http://localhost:8002/health

# Check NEXT_PUBLIC_AI_API_URL in .env.local
cat /home/ubuntu/vscode/ump/apps/web/.env.local

# Check browser console for errors
```

### Instance Won't Launch

```bash
# Check AWS credentials
aws sts get-caller-identity

# Check spot capacity in region
# (Go to AWS Console > EC2 > Spot Requests)

# Check API logs for errors
# (The uvicorn terminal will show errors)
```

### Instance Stuck in Pending

- Wait 2-3 minutes (AWS takes time to allocate)
- Check AWS Console for spot request status
- May need to try different availability zone

### SSH Connection Issues

```bash
# Verify key permissions
chmod 400 ~/.ssh/llm-testing-key.pem

# Test connection
ssh -v -i ~/.ssh/llm-testing-key.pem ubuntu@<public-ip>

# Check security group allows SSH (port 22)
```

## Next Steps & Enhancements

### Immediate TODOs

- [ ] Add navigation link to sidebar
- [ ] Integrate with RBAC service for user permissions
- [ ] Implement database persistence for instance tracking
- [ ] Add credential encryption and secure storage
- [ ] Set up proper CORS for production

### Future Enhancements

- [ ] Real-time instance metrics (CloudWatch integration)
- [ ] Cost alerts and budget limits
- [ ] Instance templates/presets
- [ ] Bulk operations (launch multiple, terminate all)
- [ ] SSH web terminal
- [ ] Log streaming in UI
- [ ] Model recommendations based on task
- [ ] Auto-shutdown timers
- [ ] Snapshot/backup functionality
- [ ] Multi-region support
- [ ] Team sharing and collaboration

## Security Notes

### Current Implementation

- AWS credentials stored in environment variables
- No encryption at rest (database not yet implemented)
- CORS set to allow all origins (development only)
- No rate limiting

### Production Recommendations

1. **Credentials:**
   - Use AWS IAM roles instead of access keys
   - Implement credential encryption in database
   - Never commit credentials to git

2. **API Security:**
   - Add JWT authentication
   - Integrate with RBAC service
   - Set up proper CORS
   - Add rate limiting
   - Use HTTPS only

3. **Network Security:**
   - Restrict security group IPs to known addresses
   - Use VPN for SSH access
   - Consider private subnets with bastion hosts

4. **Cost Protection:**
   - Set up AWS budgets and alerts
   - Implement spending limits in UI
   - Auto-terminate idle instances

## Support

- **API Docs:** http://localhost:8002/docs
- **GitHub Issues:** Report bugs in the UMP repo
- **AWS Documentation:** https://docs.aws.amazon.com/ec2/

## License

Part of the UMP project.
