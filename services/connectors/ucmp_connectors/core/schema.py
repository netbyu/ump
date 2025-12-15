"""
Schema Registry
===============
Manages JSON Schemas for connector actions and triggers.
Powers dynamic UI generation and validation.
"""

from typing import Dict, Any, List, Optional
from .base import (
    ConnectorBase,
    ActionDefinition,
    TriggerDefinition,
    FieldDefinition,
    FieldType,
    ConnectorMetadata,
)
from .registry import ConnectorRegistry
import logging

logger = logging.getLogger(__name__)


class SchemaRegistry:
    """
    Generates and caches JSON Schemas for connector actions/triggers.
    Used by frontend to dynamically render input forms.
    """
    
    def __init__(self, connector_registry: ConnectorRegistry = None):
        self.connector_registry = connector_registry or ConnectorRegistry.get_instance()
        self._schema_cache: Dict[str, Dict[str, Any]] = {}
    
    # -------------------------------------------------------------------------
    # Schema Generation
    # -------------------------------------------------------------------------
    
    def field_to_json_schema(self, field: FieldDefinition) -> Dict[str, Any]:
        """Convert a FieldDefinition to JSON Schema"""
        type_mapping = {
            FieldType.STRING: {"type": "string"},
            FieldType.NUMBER: {"type": "number"},
            FieldType.INTEGER: {"type": "integer"},
            FieldType.BOOLEAN: {"type": "boolean"},
            FieldType.ARRAY: {"type": "array"},
            FieldType.OBJECT: {"type": "object"},
            FieldType.DATE: {"type": "string", "format": "date"},
            FieldType.DATETIME: {"type": "string", "format": "date-time"},
            FieldType.EMAIL: {"type": "string", "format": "email"},
            FieldType.URL: {"type": "string", "format": "uri"},
            FieldType.PHONE: {"type": "string", "pattern": r"^\+?[1-9]\d{1,14}$"},
            FieldType.PASSWORD: {"type": "string", "writeOnly": True},
            FieldType.TEXT: {"type": "string"},
            FieldType.SELECT: {"type": "string"},
            FieldType.MULTISELECT: {"type": "array", "items": {"type": "string"}},
            FieldType.FILE: {"type": "string", "contentEncoding": "base64"},
        }
        
        schema = type_mapping.get(field.type, {"type": "string"}).copy()
        
        # Add common properties
        if field.description:
            schema["description"] = field.description
        if field.label:
            schema["title"] = field.label
        if field.default is not None:
            schema["default"] = field.default
        if field.placeholder:
            schema["examples"] = [field.placeholder]
        
        # Validation constraints
        if field.min_length is not None:
            schema["minLength"] = field.min_length
        if field.max_length is not None:
            schema["maxLength"] = field.max_length
        if field.min_value is not None:
            schema["minimum"] = field.min_value
        if field.max_value is not None:
            schema["maximum"] = field.max_value
        if field.validation_regex:
            schema["pattern"] = field.validation_regex
        
        # Enum for SELECT fields
        if field.type in (FieldType.SELECT, FieldType.MULTISELECT) and field.options:
            schema["enum"] = [opt["value"] for opt in field.options]
            # Store labels in custom property for UI
            schema["x-enum-labels"] = {opt["value"]: opt["label"] for opt in field.options}
        
        # Custom UI hints
        ui_hints = {}
        if field.secret:
            ui_hints["secret"] = True
        if field.depends_on:
            ui_hints["depends_on"] = field.depends_on
        if field.type == FieldType.TEXT:
            ui_hints["multiline"] = True
        
        if ui_hints:
            schema["x-ui-hints"] = ui_hints
        
        return schema
    
    def action_to_json_schema(
        self,
        connector_id: str,
        action: ActionDefinition
    ) -> Dict[str, Any]:
        """Generate JSON Schema for an action's inputs"""
        required_fields = [f.name for f in action.inputs if f.required]
        
        properties = {}
        for field in action.inputs:
            properties[field.name] = self.field_to_json_schema(field)
        
        schema = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "$id": f"ucmp://connectors/{connector_id}/actions/{action.id}/input",
            "title": f"{action.name} Input",
            "description": action.description,
            "type": "object",
            "properties": properties,
            "required": required_fields,
            "additionalProperties": False,
        }
        
        # Add output schema reference
        if action.outputs:
            output_properties = {}
            for field in action.outputs:
                output_properties[field.name] = self.field_to_json_schema(field)
            
            schema["x-output-schema"] = {
                "type": "object",
                "properties": output_properties
            }
        
        return schema
    
    def trigger_to_json_schema(
        self,
        connector_id: str,
        trigger: TriggerDefinition
    ) -> Dict[str, Any]:
        """Generate JSON Schema for a trigger's configuration and outputs"""
        # Config schema (what the user configures)
        config_required = [f.name for f in trigger.config_fields if f.required]
        config_properties = {}
        for field in trigger.config_fields:
            config_properties[field.name] = self.field_to_json_schema(field)
        
        # Output schema (what the trigger emits)
        output_properties = {}
        for field in trigger.outputs:
            output_properties[field.name] = self.field_to_json_schema(field)
        
        return {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "$id": f"ucmp://connectors/{connector_id}/triggers/{trigger.id}",
            "title": f"{trigger.name}",
            "description": trigger.description,
            "type": "object",
            "properties": {
                "config": {
                    "type": "object",
                    "title": "Configuration",
                    "properties": config_properties,
                    "required": config_required
                },
                "output": {
                    "type": "object",
                    "title": "Output",
                    "properties": output_properties,
                    "readOnly": True
                }
            },
            "x-trigger-type": trigger.trigger_type,
            "x-poll-interval": {
                "default": trigger.default_poll_interval_seconds,
                "minimum": trigger.min_poll_interval_seconds
            }
        }
    
    def auth_to_json_schema(self, metadata: ConnectorMetadata) -> Dict[str, Any]:
        """Generate JSON Schema for connector authentication"""
        auth_schema = metadata.auth_schema
        required_fields = [f.name for f in auth_schema.fields if f.required]
        
        properties = {}
        for field in auth_schema.fields:
            properties[field.name] = self.field_to_json_schema(field)
        
        schema = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "$id": f"ucmp://connectors/{metadata.id}/auth",
            "title": f"{metadata.name} Authentication",
            "type": "object",
            "properties": properties,
            "required": required_fields,
            "x-auth-type": auth_schema.auth_type
        }
        
        # Add OAuth2 config if applicable
        if auth_schema.oauth2_config:
            schema["x-oauth2-config"] = auth_schema.oauth2_config
        
        return schema
    
    # -------------------------------------------------------------------------
    # Retrieval Methods
    # -------------------------------------------------------------------------
    
    def get_action_schema(
        self,
        connector_id: str,
        action_id: str,
        use_cache: bool = True
    ) -> Optional[Dict[str, Any]]:
        """Get JSON Schema for a specific action"""
        cache_key = f"{connector_id}:action:{action_id}"
        
        if use_cache and cache_key in self._schema_cache:
            return self._schema_cache[cache_key]
        
        # Get connector and action
        connector = self.connector_registry.create_instance(connector_id)
        if not connector:
            return None
        
        action = next(
            (a for a in connector.get_actions() if a.id == action_id),
            None
        )
        if not action:
            return None
        
        schema = self.action_to_json_schema(connector_id, action)
        self._schema_cache[cache_key] = schema
        return schema
    
    def get_trigger_schema(
        self,
        connector_id: str,
        trigger_id: str,
        use_cache: bool = True
    ) -> Optional[Dict[str, Any]]:
        """Get JSON Schema for a specific trigger"""
        cache_key = f"{connector_id}:trigger:{trigger_id}"
        
        if use_cache and cache_key in self._schema_cache:
            return self._schema_cache[cache_key]
        
        connector = self.connector_registry.create_instance(connector_id)
        if not connector:
            return None
        
        trigger = next(
            (t for t in connector.get_triggers() if t.id == trigger_id),
            None
        )
        if not trigger:
            return None
        
        schema = self.trigger_to_json_schema(connector_id, trigger)
        self._schema_cache[cache_key] = schema
        return schema
    
    def get_auth_schema(
        self,
        connector_id: str,
        use_cache: bool = True
    ) -> Optional[Dict[str, Any]]:
        """Get JSON Schema for connector authentication"""
        cache_key = f"{connector_id}:auth"
        
        if use_cache and cache_key in self._schema_cache:
            return self._schema_cache[cache_key]
        
        metadata = self.connector_registry.get_metadata(connector_id)
        if not metadata:
            return None
        
        schema = self.auth_to_json_schema(metadata)
        self._schema_cache[cache_key] = schema
        return schema
    
    def get_connector_schemas(
        self,
        connector_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get all schemas for a connector (auth, actions, triggers)"""
        metadata = self.connector_registry.get_metadata(connector_id)
        if not metadata:
            return None
        
        connector = self.connector_registry.create_instance(connector_id)
        if not connector:
            return None
        
        return {
            "connector_id": connector_id,
            "name": metadata.name,
            "description": metadata.description,
            "version": metadata.version,
            "auth": self.auth_to_json_schema(metadata),
            "actions": {
                action.id: self.action_to_json_schema(connector_id, action)
                for action in connector.get_actions()
            },
            "triggers": {
                trigger.id: self.trigger_to_json_schema(connector_id, trigger)
                for trigger in connector.get_triggers()
            }
        }
    
    def get_all_schemas(self) -> Dict[str, Dict[str, Any]]:
        """Get schemas for all registered connectors"""
        return {
            connector_id: self.get_connector_schemas(connector_id)
            for connector_id in self.connector_registry.get_connector_ids()
        }
    
    # -------------------------------------------------------------------------
    # Schema Validation
    # -------------------------------------------------------------------------
    
    def validate_action_input(
        self,
        connector_id: str,
        action_id: str,
        data: Dict[str, Any]
    ) -> tuple[bool, List[str]]:
        """
        Validate input data against action schema.
        Returns (is_valid, list of error messages).
        """
        import jsonschema
        
        schema = self.get_action_schema(connector_id, action_id)
        if not schema:
            return False, [f"Schema not found for {connector_id}/{action_id}"]
        
        try:
            jsonschema.validate(data, schema)
            return True, []
        except jsonschema.ValidationError as e:
            return False, [e.message]
        except jsonschema.SchemaError as e:
            return False, [f"Invalid schema: {e.message}"]
    
    def clear_cache(self, connector_id: str = None):
        """Clear schema cache (optionally for a specific connector)"""
        if connector_id:
            keys_to_remove = [
                k for k in self._schema_cache 
                if k.startswith(f"{connector_id}:")
            ]
            for key in keys_to_remove:
                del self._schema_cache[key]
        else:
            self._schema_cache.clear()


# =============================================================================
# Schema Export Utilities
# =============================================================================

def export_schemas_to_json(output_path: str, registry: SchemaRegistry = None):
    """Export all connector schemas to a JSON file"""
    import json
    
    registry = registry or SchemaRegistry()
    schemas = registry.get_all_schemas()
    
    with open(output_path, 'w') as f:
        json.dump(schemas, f, indent=2)
    
    logger.info(f"Exported {len(schemas)} connector schemas to {output_path}")


def export_schemas_to_openapi(
    output_path: str,
    registry: SchemaRegistry = None,
    api_version: str = "1.0.0"
):
    """Export connector schemas as OpenAPI 3.0 spec"""
    import json
    
    registry = registry or SchemaRegistry()
    all_schemas = registry.get_all_schemas()
    
    # Build OpenAPI spec
    openapi_spec = {
        "openapi": "3.0.3",
        "info": {
            "title": "UCMP Connector API",
            "version": api_version,
            "description": "Auto-generated API specification for UCMP connectors"
        },
        "paths": {},
        "components": {
            "schemas": {}
        }
    }
    
    for connector_id, connector_schemas in all_schemas.items():
        if not connector_schemas:
            continue
        
        # Add auth schema
        auth_schema_name = f"{connector_id.title()}Auth"
        openapi_spec["components"]["schemas"][auth_schema_name] = connector_schemas["auth"]
        
        # Add action schemas and paths
        for action_id, action_schema in connector_schemas.get("actions", {}).items():
            schema_name = f"{connector_id.title()}{action_id.title()}Input"
            openapi_spec["components"]["schemas"][schema_name] = action_schema
            
            # Create path
            path = f"/connectors/{connector_id}/actions/{action_id}/execute"
            openapi_spec["paths"][path] = {
                "post": {
                    "summary": action_schema.get("title", action_id),
                    "description": action_schema.get("description", ""),
                    "operationId": f"{connector_id}_{action_id}",
                    "requestBody": {
                        "required": True,
                        "content": {
                            "application/json": {
                                "schema": {"$ref": f"#/components/schemas/{schema_name}"}
                            }
                        }
                    },
                    "responses": {
                        "200": {
                            "description": "Action executed successfully",
                            "content": {
                                "application/json": {
                                    "schema": action_schema.get("x-output-schema", {"type": "object"})
                                }
                            }
                        }
                    }
                }
            }
    
    with open(output_path, 'w') as f:
        json.dump(openapi_spec, f, indent=2)
    
    logger.info(f"Exported OpenAPI spec to {output_path}")
