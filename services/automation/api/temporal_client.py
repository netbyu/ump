"""
Temporal Client Integration
Connects FastAPI to Temporal Server
"""
from temporalio.client import Client, WorkflowHandle
from temporalio.common import RetryPolicy
from typing import Optional, Any
import os


class TemporalClientManager:
    """Manages Temporal client connections"""

    _client: Optional[Client] = None

    @classmethod
    async def get_client(cls) -> Client:
        """Get or create Temporal client"""
        if cls._client is None:
            temporal_address = os.environ.get('TEMPORAL_ADDRESS', 'localhost:7233')
            cls._client = await Client.connect(temporal_address)
        return cls._client

    @classmethod
    async def start_workflow(
        cls,
        workflow_class: str,
        workflow_id: str,
        args: list,
        task_queue: str = "automation-workflows"
    ) -> WorkflowHandle:
        """Start a new workflow"""
        client = await cls.get_client()

        handle = await client.start_workflow(
            workflow_class,
            args=args,
            id=workflow_id,
            task_queue=task_queue,
            retry_policy=RetryPolicy(maximum_attempts=1)
        )

        return handle

    @classmethod
    async def get_workflow_handle(cls, workflow_id: str) -> WorkflowHandle:
        """Get handle for existing workflow"""
        client = await cls.get_client()
        return client.get_workflow_handle(workflow_id)

    @classmethod
    async def query_workflow(cls, workflow_id: str, query_name: str) -> Any:
        """Query workflow state"""
        handle = await cls.get_workflow_handle(workflow_id)
        return await handle.query(query_name)

    @classmethod
    async def signal_workflow(
        cls,
        workflow_id: str,
        signal_name: str,
        *args
    ):
        """Send signal to workflow"""
        handle = await cls.get_workflow_handle(workflow_id)
        await handle.signal(signal_name, *args)

    @classmethod
    async def get_workflow_result(cls, workflow_id: str) -> Any:
        """Get workflow result (blocking until complete)"""
        handle = await cls.get_workflow_handle(workflow_id)
        return await handle.result()

    @classmethod
    async def cancel_workflow(cls, workflow_id: str):
        """Cancel a running workflow"""
        handle = await cls.get_workflow_handle(workflow_id)
        await handle.cancel()
