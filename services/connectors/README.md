# UCMP Connectors Service

Integration platform for managing connectors, credentials, and executing actions.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
# or
uvicorn main:app --reload --port 8001
```

## API Endpoints

### Connectors
- `GET /api/connectors` - List all available connectors
- `GET /api/connectors/{connector_id}` - Get connector details
- `GET /api/connectors/{connector_id}/schema` - Get connector schemas
- `POST /api/connectors/{connector_id}/test` - Test credentials without storing

### Credentials
- `POST /api/credentials` - Store new credentials
- `GET /api/credentials` - List stored credentials
- `DELETE /api/credentials/{credential_id}` - Delete credentials
- `POST /api/credentials/{credential_id}/test` - Test stored credentials

### Execution
- `POST /api/connectors/{connector_id}/actions/{action_id}/execute` - Execute an action

## Built-in Connectors

- **Twilio** - SMS, Voice, MMS messaging
- **Asterisk AMI** - PBX control via AMI
- **HTTPBin** - Testing connector (declarative)

## Creating New Connectors

### Code-based Connector

```python
from ucmp_connectors import ConnectorBase, register_connector

@register_connector
class MyConnector(ConnectorBase):
    @classmethod
    def get_metadata(cls):
        return ConnectorMetadata(
            id="my_connector",
            name="My Connector",
            # ...
        )

    async def authenticate(self):
        # Verify credentials
        return True

    def get_actions(self):
        return [
            ActionDefinition(id="my_action", name="My Action", ...)
        ]

    async def execute_action(self, action_id, inputs, context):
        # Execute the action
        return ExecutionResult(success=True, data={...})
```

### Declarative Connector (YAML)

```yaml
# schemas/manifests/my_api.yaml
id: my_api
name: My API
base_url: https://api.example.com

auth:
  type: api_key
  header_name: X-API-Key
  fields:
    - name: api_key
      label: API Key
      type: password
      required: true

actions:
  - id: list_items
    name: List Items
    method: GET
    endpoint: /items
```

## Environment Variables

- `UCMP_CREDENTIAL_KEY` - Encryption key for credential storage (32 characters)

## Database Setup

Run the schema from `ucmp_connectors/db/schema.sql` to set up PostgreSQL tables.
