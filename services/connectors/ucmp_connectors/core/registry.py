"""
Connector Registry
==================
Central registry for managing connector classes and instances.
"""

from typing import Dict, List, Optional, Type, Any
from .base import ConnectorBase, ConnectorMetadata, AuthConfig, DeclarativeConnector
import logging
import importlib
import pkgutil
from pathlib import Path

logger = logging.getLogger(__name__)


class ConnectorRegistry:
    """
    Central registry for all available connectors.
    
    Supports both:
    - Code-based connectors (Python classes)
    - Declarative connectors (YAML/JSON manifests)
    """
    
    _instance: Optional["ConnectorRegistry"] = None
    
    def __init__(self):
        self._connectors: Dict[str, Type[ConnectorBase]] = {}
        self._manifests: Dict[str, Dict[str, Any]] = {}
        self._metadata_cache: Dict[str, ConnectorMetadata] = {}
    
    @classmethod
    def get_instance(cls) -> "ConnectorRegistry":
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    # -------------------------------------------------------------------------
    # Registration
    # -------------------------------------------------------------------------
    
    def register(self, connector_class: Type[ConnectorBase]) -> None:
        """Register a code-based connector class"""
        metadata = connector_class.get_metadata()
        connector_id = metadata.id
        
        if connector_id in self._connectors:
            logger.warning(f"Overwriting existing connector: {connector_id}")
        
        self._connectors[connector_id] = connector_class
        self._metadata_cache[connector_id] = metadata
        logger.info(f"Registered connector: {connector_id} ({metadata.name})")
    
    def register_manifest(self, manifest: Dict[str, Any]) -> None:
        """Register a declarative connector from a manifest"""
        connector_id = manifest.get("id")
        if not connector_id:
            raise ValueError("Manifest must have an 'id' field")
        
        if connector_id in self._manifests:
            logger.warning(f"Overwriting existing manifest: {connector_id}")
        
        self._manifests[connector_id] = manifest
        
        # Cache metadata
        self._metadata_cache[connector_id] = self._manifest_to_metadata(manifest)
        logger.info(f"Registered manifest connector: {connector_id}")
    
    def _manifest_to_metadata(self, manifest: Dict[str, Any]) -> ConnectorMetadata:
        """Convert manifest to ConnectorMetadata"""
        from .base import AuthSchemaDefinition, FieldDefinition, AuthType
        
        auth_config = manifest.get("auth", {})
        auth_fields = [
            FieldDefinition(**f) for f in auth_config.get("fields", [])
        ]
        
        return ConnectorMetadata(
            id=manifest["id"],
            name=manifest["name"],
            description=manifest.get("description", ""),
            version=manifest.get("version", "1.0.0"),
            icon_url=manifest.get("icon_url"),
            documentation_url=manifest.get("documentation_url"),
            categories=manifest.get("categories", []),
            tags=manifest.get("tags", []),
            auth_schema=AuthSchemaDefinition(
                auth_type=AuthType(auth_config.get("type", "api_key")),
                fields=auth_fields,
                oauth2_config=auth_config.get("oauth2")
            ),
            supports_webhooks=manifest.get("supports_webhooks", False),
            base_url=manifest.get("base_url")
        )
    
    def unregister(self, connector_id: str) -> bool:
        """Remove a connector from the registry"""
        removed = False
        if connector_id in self._connectors:
            del self._connectors[connector_id]
            removed = True
        if connector_id in self._manifests:
            del self._manifests[connector_id]
            removed = True
        if connector_id in self._metadata_cache:
            del self._metadata_cache[connector_id]
        return removed
    
    # -------------------------------------------------------------------------
    # Discovery
    # -------------------------------------------------------------------------
    
    def auto_discover(self, package_name: str = "ucmp_connectors.connectors") -> int:
        """
        Auto-discover and register connectors from a package.
        Returns count of discovered connectors.
        """
        count = 0
        try:
            package = importlib.import_module(package_name)
            package_path = Path(package.__file__).parent
            
            for _, module_name, _ in pkgutil.iter_modules([str(package_path)]):
                try:
                    module = importlib.import_module(f"{package_name}.{module_name}")
                    
                    # Look for ConnectorBase subclasses
                    for attr_name in dir(module):
                        attr = getattr(module, attr_name)
                        if (isinstance(attr, type) and 
                            issubclass(attr, ConnectorBase) and 
                            attr not in (ConnectorBase, DeclarativeConnector)):
                            try:
                                self.register(attr)
                                count += 1
                            except Exception as e:
                                logger.error(f"Failed to register {attr_name}: {e}")
                                
                except Exception as e:
                    logger.error(f"Failed to import module {module_name}: {e}")
                    
        except ImportError as e:
            logger.error(f"Failed to import package {package_name}: {e}")
        
        return count
    
    def load_manifests_from_directory(self, directory: str) -> int:
        """Load declarative connector manifests from a directory"""
        import yaml
        import json
        
        count = 0
        dir_path = Path(directory)
        
        if not dir_path.exists():
            logger.warning(f"Manifest directory does not exist: {directory}")
            return 0
        
        for file_path in dir_path.glob("**/*.yaml"):
            try:
                with open(file_path) as f:
                    manifest = yaml.safe_load(f)
                self.register_manifest(manifest)
                count += 1
            except Exception as e:
                logger.error(f"Failed to load manifest {file_path}: {e}")
        
        for file_path in dir_path.glob("**/*.json"):
            try:
                with open(file_path) as f:
                    manifest = json.load(f)
                self.register_manifest(manifest)
                count += 1
            except Exception as e:
                logger.error(f"Failed to load manifest {file_path}: {e}")
        
        return count
    
    # -------------------------------------------------------------------------
    # Retrieval
    # -------------------------------------------------------------------------
    
    def get_connector_ids(self) -> List[str]:
        """Get all registered connector IDs"""
        return list(set(list(self._connectors.keys()) + list(self._manifests.keys())))
    
    def get_metadata(self, connector_id: str) -> Optional[ConnectorMetadata]:
        """Get metadata for a connector"""
        return self._metadata_cache.get(connector_id)
    
    def get_all_metadata(self) -> List[ConnectorMetadata]:
        """Get metadata for all registered connectors"""
        return list(self._metadata_cache.values())
    
    def create_instance(
        self,
        connector_id: str,
        auth_config: Optional[AuthConfig] = None
    ) -> Optional[ConnectorBase]:
        """
        Create an instance of a connector.
        Returns None if connector not found.
        """
        # Check code-based connectors first
        if connector_id in self._connectors:
            return self._connectors[connector_id](auth_config=auth_config)
        
        # Check manifest-based connectors
        if connector_id in self._manifests:
            manifest = self._manifests[connector_id]
            return DeclarativeConnector(manifest=manifest, auth_config=auth_config)
        
        logger.warning(f"Connector not found: {connector_id}")
        return None
    
    def has_connector(self, connector_id: str) -> bool:
        """Check if a connector is registered"""
        return connector_id in self._connectors or connector_id in self._manifests
    
    # -------------------------------------------------------------------------
    # Search / Filter
    # -------------------------------------------------------------------------
    
    def search(
        self,
        query: str = "",
        categories: List[str] = None,
        tags: List[str] = None,
        auth_type: str = None
    ) -> List[ConnectorMetadata]:
        """Search connectors by various criteria"""
        results = []
        
        for metadata in self._metadata_cache.values():
            # Text search
            if query:
                query_lower = query.lower()
                if not (
                    query_lower in metadata.name.lower() or
                    query_lower in metadata.description.lower() or
                    any(query_lower in t.lower() for t in metadata.tags)
                ):
                    continue
            
            # Category filter
            if categories:
                if not any(c in metadata.categories for c in categories):
                    continue
            
            # Tag filter
            if tags:
                if not any(t in metadata.tags for t in tags):
                    continue
            
            # Auth type filter
            if auth_type:
                if metadata.auth_schema.auth_type != auth_type:
                    continue
            
            results.append(metadata)
        
        return results
    
    def get_by_category(self, category: str) -> List[ConnectorMetadata]:
        """Get all connectors in a category"""
        return [m for m in self._metadata_cache.values() if category in m.categories]


# =============================================================================
# Decorator for easy registration
# =============================================================================

def register_connector(cls: Type[ConnectorBase]) -> Type[ConnectorBase]:
    """Decorator to auto-register a connector class"""
    ConnectorRegistry.get_instance().register(cls)
    return cls
