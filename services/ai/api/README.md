# AI Compute Management API

FastAPI service for managing AWS Spot GPU instances for LLM testing.

## Quick Start

### 1. Install Dependencies

```bash
cd /home/ubuntu/vscode/ump/services/ai/api
pip install -r requirements.txt
```

### 2. Install AWS CLI (if not already installed)

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

### 3. Configure AWS Credentials

**Option 1: AWS CLI (Recommended)**
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: ca-central-1
# Default output format: json
```

**Option 2: Environment File**
```bash
# Copy example env file
cp .env.example .env

# Edit .env and add your AWS credentials
nano .env
```

**Option 3: Environment Variables**
```bash
export AWS_ACCESS_KEY_ID=your_access_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_access_key
export AWS_DEFAULT_REGION=ca-central-1
```

### 4. Run the API

```bash
# Using uvicorn directly
uvicorn app.main:app --reload --port 8002

# Or using Python
python -m app.main
```

The API will be available at:
- **API**: http://localhost:8002
- **Docs**: http://localhost:8002/docs
- **ReDoc**: http://localhost:8002/redoc

## API Endpoints

### Instances

- `POST /api/instances/launch` - Launch a new GPU spot instance
- `GET /api/instances` - List all instances
- `GET /api/instances/{instance_id}` - Get instance details
- `DELETE /api/instances/{instance_id}` - Terminate an instance
- `POST /api/instances/{instance_id}/stop` - Stop an instance
- `POST /api/instances/{instance_id}/start` - Start a stopped instance

### Pricing

- `GET /api/pricing` - Get pricing for all GPU instance types
- `POST /api/pricing/recommendations` - Get instance recommendations for a model
- `GET /api/pricing/spot/{instance_type}` - Get current spot price

### Credentials (TODO)

- `POST /api/credentials` - Store AWS credentials
- `GET /api/credentials` - Get stored credentials
- `DELETE /api/credentials/{credential_id}` - Delete credentials

## Example Requests

### Launch an Instance

```bash
curl -X POST "http://localhost:8002/api/instances/launch" \
  -H "Content-Type: application/json" \
  -d '{
    "instance_type": "g5.xlarge",
    "framework": "ollama",
    "model": "llama3.2:3b",
    "name": "my-llm-test",
    "volume_size_gb": 100
  }'
```

### List Instances

```bash
curl "http://localhost:8002/api/instances"
```

### Get Pricing

```bash
curl "http://localhost:8002/api/pricing"
```

### Get Recommendations

```bash
curl -X POST "http://localhost:8002/api/pricing/recommendations" \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "llama3.1:70b"
  }'
```

### Terminate Instance

```bash
curl -X DELETE "http://localhost:8002/api/instances/i-0abc123def456"
```

## Architecture

```
api/
├── app/
│   ├── main.py              # FastAPI application
│   ├── models/              # Pydantic models
│   │   ├── instance.py      # Instance models
│   │   ├── pricing.py       # Pricing models
│   │   └── credentials.py   # Credentials models
│   ├── routes/              # API routes
│   │   ├── instances.py     # Instance endpoints
│   │   ├── pricing.py       # Pricing endpoints
│   │   └── credentials.py   # Credentials endpoints
│   ├── services/            # Business logic
│   │   └── aws_service.py   # AWS Spot instance management
│   └── utils/               # Utilities
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## TODO

- [ ] Add database for instance tracking
- [ ] Implement credential storage with encryption
- [ ] Add authentication/authorization (integrate with RBAC service)
- [ ] Add CloudWatch metrics integration
- [ ] Add cost tracking and alerts
- [ ] Add WebSocket support for real-time updates
- [ ] Add instance logs streaming
- [ ] Add backup/restore functionality

## Development

### Running Tests

```bash
# TODO: Add tests
pytest
```

### Code Formatting

```bash
black app/
isort app/
```

### Type Checking

```bash
mypy app/
```

## Production Deployment

### Using Docker

```bash
# TODO: Create Dockerfile
docker build -t ump-ai-api .
docker run -p 8002:8002 --env-file .env ump-ai-api
```

### Using systemd

```bash
# TODO: Create systemd service file
sudo systemctl enable ump-ai-api
sudo systemctl start ump-ai-api
```

## Integration with UMP Platform

This service is designed to integrate with the UMP (Unified Management Platform):

- **Frontend**: `/apps/web/app/(dashboard)/ai-compute/`
- **RBAC**: Integrate with `/services/rbac/` for permissions
- **Database**: Share PostgreSQL with main UMP database
- **Monitoring**: Send metrics to UMP monitoring dashboard

## License

Part of the UMP project.
