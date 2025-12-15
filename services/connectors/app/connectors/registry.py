"""
Provider Registry
==================
Central registry for managing provider classes and instances.

Terminology:
- Provider: Template/definition of an external service
- Connector: A configured instance of a provider with credentials
"""

from typing import Dict, List, Optional, Type, Any
from .base import (
    ProviderBase, ProviderMetadata, AuthConfig, DeclarativeProvider,
    ConnectorBase, ConnectorMetadata, DeclarativeConnector  # Backward compat aliases
)
import logging
import importlib
import pkgutil
from pathlib import Path

logger = logging.getLogger(__name__)


class ProviderRegistry:
    """
    Central registry for all available providers.

    Supports both:
    - Code-based providers (Python classes)
    - Declarative providers (YAML/JSON manifests)
    """

    _instance: Optional["ProviderRegistry"] = None

    def __init__(self):
        self._providers: Dict[str, Type[ProviderBase]] = {}
        self._manifests: Dict[str, Dict[str, Any]] = {}
        self._metadata_cache: Dict[str, ProviderMetadata] = {}

    @classmethod
    def get_instance(cls) -> "ProviderRegistry":
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # -------------------------------------------------------------------------
    # Registration
    # -------------------------------------------------------------------------

    def register(self, provider_class: Type[ProviderBase]) -> None:
        """Register a code-based provider class"""
        metadata = provider_class.get_metadata()
        provider_id = metadata.id

        if provider_id in self._providers:
            logger.warning(f"Overwriting existing provider: {provider_id}")

        self._providers[provider_id] = provider_class
        self._metadata_cache[provider_id] = metadata
        logger.info(f"Registered provider: {provider_id} ({metadata.name})")

    def register_manifest(self, manifest: Dict[str, Any]) -> None:
        """Register a declarative provider from a manifest"""
        provider_id = manifest.get("id")
        if not provider_id:
            raise ValueError("Manifest must have an 'id' field")

        if provider_id in self._manifests:
            logger.warning(f"Overwriting existing manifest: {provider_id}")

        self._manifests[provider_id] = manifest

        # Cache metadata
        self._metadata_cache[provider_id] = self._manifest_to_metadata(manifest)
        logger.info(f"Registered manifest provider: {provider_id}")

    def _manifest_to_metadata(self, manifest: Dict[str, Any]) -> ProviderMetadata:
        """Convert manifest to ProviderMetadata"""
        from .base import AuthSchemaDefinition, FieldDefinition, AuthType

        auth_config = manifest.get("auth", {})
        auth_fields = [
            FieldDefinition(**f) for f in auth_config.get("fields", [])
        ]

        return ProviderMetadata(
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

    def unregister(self, provider_id: str) -> bool:
        """Remove a provider from the registry"""
        removed = False
        if provider_id in self._providers:
            del self._providers[provider_id]
            removed = True
        if provider_id in self._manifests:
            del self._manifests[provider_id]
            removed = True
        if provider_id in self._metadata_cache:
            del self._metadata_cache[provider_id]
        return removed

    # -------------------------------------------------------------------------
    # Discovery
    # -------------------------------------------------------------------------

    def auto_discover(self, package_name: str = "app.connectors") -> int:
        """
        Auto-discover and register providers from a package.
        Returns count of discovered providers.
        """
        count = 0
        try:
            package = importlib.import_module(package_name)
            package_path = Path(package.__file__).parent

            for _, module_name, _ in pkgutil.iter_modules([str(package_path)]):
                try:
                    module = importlib.import_module(f"{package_name}.{module_name}")

                    # Look for ProviderBase subclasses
                    for attr_name in dir(module):
                        attr = getattr(module, attr_name)
                        if (isinstance(attr, type) and
                            issubclass(attr, ProviderBase) and
                            attr not in (ProviderBase, DeclarativeProvider, ConnectorBase, DeclarativeConnector)):
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
        """Load declarative provider manifests from a directory"""
        import yaml
        import json

        count = 0
        dir_path = Path(directory)

        if not dir_path.exists():
            logger.warning(f"Provider directory does not exist: {directory}")
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

    def get_provider_ids(self) -> List[str]:
        """Get all registered provider IDs"""
        return list(set(list(self._providers.keys()) + list(self._manifests.keys())))

    # Alias for backward compatibility
    def get_connector_ids(self) -> List[str]:
        """Get all registered provider IDs (alias for backward compat)"""
        return self.get_provider_ids()

    def get_metadata(self, provider_id: str) -> Optional[ProviderMetadata]:
        """Get metadata for a provider"""
        return self._metadata_cache.get(provider_id)

    def get_all_metadata(self) -> List[ProviderMetadata]:
        """Get metadata for all registered providers"""
        return list(self._metadata_cache.values())

    def create_instance(
        self,
        provider_id: str,
        auth_config: Optional[AuthConfig] = None
    ) -> Optional[ProviderBase]:
        """
        Create an instance of a provider (for testing/execution).
        Returns None if provider not found.
        """
        # Check code-based providers first
        if provider_id in self._providers:
            return self._providers[provider_id](auth_config=auth_config)

        # Check manifest-based providers
        if provider_id in self._manifests:
            manifest = self._manifests[provider_id]
            return DeclarativeProvider(manifest=manifest, auth_config=auth_config)

        logger.warning(f"Provider not found: {provider_id}")
        return None

    def has_provider(self, provider_id: str) -> bool:
        """Check if a provider is registered"""
        return provider_id in self._providers or provider_id in self._manifests

    # Alias for backward compatibility
    def has_connector(self, provider_id: str) -> bool:
        """Check if a provider is registered (alias for backward compat)"""
        return self.has_provider(provider_id)

    # -------------------------------------------------------------------------
    # Search / Filter
    # -------------------------------------------------------------------------

    def search(
        self,
        query: str = "",
        categories: List[str] = None,
        tags: List[str] = None,
        auth_type: str = None
    ) -> List[ProviderMetadata]:
        """Search providers by various criteria"""
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

    def get_by_category(self, category: str) -> List[ProviderMetadata]:
        """Get all providers in a category"""
        return [m for m in self._metadata_cache.values() if category in m.categories]


# Alias for backward compatibility
ConnectorRegistry = ProviderRegistry


# =============================================================================
# Decorator for easy registration
# =============================================================================

def register_provider(cls: Type[ProviderBase]) -> Type[ProviderBase]:
    """Decorator to auto-register a provider class"""
    ProviderRegistry.get_instance().register(cls)
    return cls


# Alias for backward compatibility
def register_connector(cls: Type[ProviderBase]) -> Type[ProviderBase]:
    """Decorator to auto-register a provider class (alias for backward compat)"""
    return register_provider(cls)
