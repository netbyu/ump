"""
Nango Provider to UCMP Connector Converter

This tool converts Nango's providers.yaml definitions to UCMP connector manifests.
Nango has 500+ pre-configured API auth definitions that we can leverage.

Usage:
    python nango_converter.py providers.yaml --output ./manifests/
    python nango_converter.py providers.yaml --provider slack
    python nango_converter.py providers.yaml --all

Source: https://github.com/NangoHQ/nango/blob/master/packages/providers/providers.yaml
"""

import yaml
import json
import argparse
from pathlib import Path
from typing import Any, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime


@dataclass
class OAuth2Config:
    """OAuth2 authentication configuration"""
    authorization_url: str
    token_url: str
    scopes: list[str] = field(default_factory=list)
    refresh_url: Optional[str] = None
    # Additional OAuth2 params
    token_params: dict = field(default_factory=dict)
    authorization_params: dict = field(default_factory=dict)


@dataclass
class ApiKeyConfig:
    """API Key authentication configuration"""
    header_name: str = "Authorization"
    prefix: str = ""
    in_location: str = "header"  # header, query, body


@dataclass
class BasicAuthConfig:
    """Basic authentication configuration"""
    pass


@dataclass
class AuthConfig:
    """Authentication configuration"""
    type: str  # oauth2, api_key, basic, none
    oauth2: Optional[OAuth2Config] = None
    api_key: Optional[ApiKeyConfig] = None
    basic: Optional[BasicAuthConfig] = None
    fields: list[dict] = field(default_factory=list)


@dataclass 
class PaginationConfig:
    """Pagination configuration"""
    type: str  # cursor, offset, page, link
    cursor_param: Optional[str] = None
    cursor_path_in_response: Optional[str] = None
    limit_param: Optional[str] = None
    offset_param: Optional[str] = None
    page_param: Optional[str] = None
    response_path: Optional[str] = None
    max_page_size: int = 100


@dataclass
class UCMPManifest:
    """UCMP Connector Manifest"""
    id: str
    name: str
    description: str
    version: str
    base_url: str
    auth: dict
    documentation_url: str = ""
    icon_url: str = ""
    categories: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    pagination: Optional[dict] = None
    test_endpoint: str = ""
    actions: list[dict] = field(default_factory=list)
    triggers: list[dict] = field(default_factory=list)
    supports_webhooks: bool = False
    # Metadata
    nango_source: bool = True
    converted_at: str = ""


class NangoConverter:
    """Converts Nango provider definitions to UCMP manifests"""
    
    # Auth mode mapping
    AUTH_MODE_MAP = {
        "OAUTH2": "oauth2",
        "OAUTH1": "oauth1", 
        "API_KEY": "api_key",
        "BASIC": "basic",
        "NONE": "none",
        "APP": "app",  # GitHub App style
        "CUSTOM": "custom",
        "TBA": "tba",  # Token Based Auth (NetSuite)
        "TABLEAU": "tableau",
        "TWO_STEP": "two_step",
        "SIGNATURE": "signature",
        "JWT": "jwt",
        "BILL": "bill",
    }
    
    def __init__(self, providers_yaml_path: str):
        """Load Nango providers.yaml"""
        with open(providers_yaml_path, 'r') as f:
            self.providers = yaml.safe_load(f)
        
        print(f"✓ Loaded {len(self.providers)} providers from Nango")
    
    def convert_auth(self, provider_id: str, provider: dict) -> dict:
        """Convert Nango auth config to UCMP format"""
        auth_mode = provider.get("auth_mode", "NONE")
        ucmp_type = self.AUTH_MODE_MAP.get(auth_mode, "custom")
        
        auth = {
            "type": ucmp_type,
            "fields": []
        }
        
        if ucmp_type == "oauth2":
            auth["oauth2"] = {
                "authorization_url": provider.get("authorization_url", ""),
                "token_url": provider.get("token_url", ""),
                "scopes": provider.get("default_scopes", []),
            }
            
            # Add refresh URL if different from token URL
            if provider.get("refresh_url"):
                auth["oauth2"]["refresh_url"] = provider["refresh_url"]
            
            # Add any token params
            if provider.get("token_params"):
                auth["oauth2"]["token_params"] = provider["token_params"]
            
            # Add authorization params
            if provider.get("authorization_params"):
                auth["oauth2"]["authorization_params"] = provider["authorization_params"]
            
            # Handle scope separator (some APIs use space, others comma)
            if provider.get("scope_separator"):
                auth["oauth2"]["scope_separator"] = provider["scope_separator"]
                
        elif ucmp_type == "api_key":
            auth["api_key"] = {
                "header_name": provider.get("proxy", {}).get("headers", {}).get("Authorization", "Authorization"),
                "in_location": "header"
            }
            auth["fields"] = [
                {
                    "name": "api_key",
                    "label": "API Key",
                    "type": "string",
                    "required": True,
                    "secret": True,
                    "description": f"API Key for {provider.get('display_name', provider_id)}"
                }
            ]
            
        elif ucmp_type == "basic":
            auth["fields"] = [
                {
                    "name": "username",
                    "label": "Username",
                    "type": "string",
                    "required": True,
                    "description": "Username for basic auth"
                },
                {
                    "name": "password", 
                    "label": "Password",
                    "type": "string",
                    "required": True,
                    "secret": True,
                    "description": "Password for basic auth"
                }
            ]
        
        # Handle connection configuration (dynamic fields)
        if provider.get("connection_configuration"):
            for config_field in provider["connection_configuration"]:
                if isinstance(config_field, str):
                    auth["fields"].append({
                        "name": config_field,
                        "label": config_field.replace("_", " ").title(),
                        "type": "string",
                        "required": True,
                        "description": f"Required configuration: {config_field}"
                    })
                elif isinstance(config_field, dict):
                    auth["fields"].append({
                        "name": config_field.get("name", ""),
                        "label": config_field.get("title", config_field.get("name", "")).replace("_", " ").title(),
                        "type": config_field.get("type", "string"),
                        "required": config_field.get("required", False),
                        "description": config_field.get("description", ""),
                        "example": config_field.get("example", ""),
                    })
        
        # Handle credentials configuration
        if provider.get("credentials"):
            for cred_key, cred_config in provider["credentials"].items():
                if isinstance(cred_config, dict):
                    auth["fields"].append({
                        "name": cred_key,
                        "label": cred_config.get("title", cred_key.replace("_", " ").title()),
                        "type": cred_config.get("type", "string"),
                        "required": cred_config.get("required", True),
                        "secret": cred_config.get("type") == "password" or "secret" in cred_key.lower() or "key" in cred_key.lower(),
                        "description": cred_config.get("description", ""),
                        "example": cred_config.get("example", ""),
                    })
        
        return auth
    
    def convert_pagination(self, provider: dict) -> Optional[dict]:
        """Convert Nango pagination config to UCMP format"""
        paginate = provider.get("paginate")
        if not paginate:
            return None
        
        pagination = {
            "type": paginate.get("type", "cursor")
        }
        
        if paginate.get("type") == "cursor":
            pagination.update({
                "cursor_param": paginate.get("cursor_name_in_request", "cursor"),
                "cursor_path_in_response": paginate.get("cursor_path_in_response"),
                "limit_param": paginate.get("limit_name_in_request", "limit"),
                "response_path": paginate.get("response_path"),
            })
        elif paginate.get("type") == "offset":
            pagination.update({
                "offset_param": paginate.get("offset_name_in_request", "offset"),
                "limit_param": paginate.get("limit_name_in_request", "limit"),
                "response_path": paginate.get("response_path"),
            })
        elif paginate.get("type") == "link":
            pagination.update({
                "link_path_in_response": paginate.get("link_path_in_response_body"),
                "link_rel": paginate.get("link_rel", "next"),
            })
        
        return pagination
    
    def convert_provider(self, provider_id: str) -> Optional[UCMPManifest]:
        """Convert a single Nango provider to UCMP manifest"""
        if provider_id not in self.providers:
            print(f"✗ Provider '{provider_id}' not found")
            return None
        
        provider = self.providers[provider_id]
        
        # Handle provider extensions (inherits from another provider)
        if provider.get("extends"):
            base_provider = self.providers.get(provider["extends"], {})
            # Merge base with current (current overrides base)
            merged = {**base_provider, **provider}
            provider = merged
        
        # Extract base URL
        base_url = ""
        if provider.get("proxy"):
            base_url = provider["proxy"].get("base_url", "")
        
        # Handle dynamic base URLs with ${connectionConfig.xxx}
        if "${" in base_url:
            # Keep as template, will be resolved at runtime
            pass
        
        manifest = UCMPManifest(
            id=provider_id,
            name=provider.get("display_name", provider_id.replace("-", " ").replace("_", " ").title()),
            description=f"{provider.get('display_name', provider_id)} API integration",
            version="1.0.0",
            base_url=base_url,
            auth=self.convert_auth(provider_id, provider),
            documentation_url=provider.get("docs", ""),
            categories=provider.get("categories", []),
            tags=[provider_id] + provider.get("categories", []),
            pagination=self.convert_pagination(provider),
            test_endpoint=provider.get("proxy", {}).get("verification", {}).get("endpoint", ""),
            actions=[],  # Actions need to be added separately (from n8n or manual)
            triggers=[],
            supports_webhooks=bool(provider.get("webhook_routing_script")),
            nango_source=True,
            converted_at=datetime.now().isoformat()
        )
        
        return manifest
    
    def to_yaml(self, manifest: UCMPManifest) -> str:
        """Convert manifest to YAML string"""
        data = asdict(manifest)
        
        # Clean up None values and empty lists
        def clean_dict(d):
            if isinstance(d, dict):
                return {k: clean_dict(v) for k, v in d.items() 
                        if v is not None and v != [] and v != {} and v != ""}
            elif isinstance(d, list):
                return [clean_dict(i) for i in d if i is not None]
            return d
        
        cleaned = clean_dict(data)
        
        # Add header comment
        header = f"""# UCMP Connector Manifest
# Auto-converted from Nango providers.yaml
# Source: https://github.com/NangoHQ/nango
# Converted: {manifest.converted_at}
#
# NOTE: This manifest contains auth configuration only.
# Actions need to be added based on the API documentation.

"""
        return header + yaml.dump(cleaned, default_flow_style=False, sort_keys=False, allow_unicode=True)
    
    def convert_all(self, output_dir: str, limit: Optional[int] = None):
        """Convert all providers to UCMP manifests"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        converted = 0
        errors = 0
        
        providers_list = list(self.providers.keys())
        if limit:
            providers_list = providers_list[:limit]
        
        for provider_id in providers_list:
            try:
                manifest = self.convert_provider(provider_id)
                if manifest:
                    yaml_content = self.to_yaml(manifest)
                    
                    # Write to file
                    output_file = output_path / f"{provider_id}.yaml"
                    with open(output_file, 'w') as f:
                        f.write(yaml_content)
                    
                    converted += 1
                    print(f"  ✓ {provider_id}")
            except Exception as e:
                errors += 1
                print(f"  ✗ {provider_id}: {e}")
        
        print(f"\n{'='*50}")
        print(f"Converted: {converted}")
        print(f"Errors: {errors}")
        print(f"Output: {output_path}")
    
    def list_providers(self, category: Optional[str] = None) -> list[str]:
        """List available providers, optionally filtered by category"""
        providers = []
        
        for provider_id, config in self.providers.items():
            if category:
                categories = config.get("categories", [])
                if category.lower() in [c.lower() for c in categories]:
                    providers.append(provider_id)
            else:
                providers.append(provider_id)
        
        return sorted(providers)
    
    def get_stats(self) -> dict:
        """Get statistics about the providers"""
        stats = {
            "total": len(self.providers),
            "by_auth_mode": {},
            "by_category": {},
            "with_pagination": 0,
            "with_webhooks": 0,
        }
        
        for provider_id, config in self.providers.items():
            # Count auth modes
            auth_mode = config.get("auth_mode", "NONE")
            stats["by_auth_mode"][auth_mode] = stats["by_auth_mode"].get(auth_mode, 0) + 1
            
            # Count categories
            for cat in config.get("categories", []):
                stats["by_category"][cat] = stats["by_category"].get(cat, 0) + 1
            
            # Count features
            if config.get("paginate"):
                stats["with_pagination"] += 1
            if config.get("webhook_routing_script"):
                stats["with_webhooks"] += 1
        
        return stats


# =============================================================================
# Example Nango providers.yaml content for testing
# =============================================================================
SAMPLE_PROVIDERS = """
slack:
  display_name: Slack
  categories:
    - communication
    - messaging
  auth_mode: OAUTH2
  authorization_url: https://slack.com/oauth/v2/authorize
  token_url: https://slack.com/api/oauth.v2.access
  default_scopes:
    - chat:write
    - channels:read
    - users:read
  proxy:
    base_url: https://slack.com/api
  docs: https://api.slack.com/

hubspot:
  display_name: HubSpot
  categories:
    - marketing
    - crm
    - support
  auth_mode: OAUTH2
  authorization_url: https://app.hubspot.com/oauth/authorize
  token_url: https://api.hubapi.com/oauth/v1/token
  connection_configuration:
    - portalId
  proxy:
    base_url: https://api.hubapi.com
    decompress: true
  paginate:
    type: cursor
    cursor_path_in_response: paging.next.after
    limit_name_in_request: limit
    cursor_name_in_request: after
    response_path: results
  docs: https://developers.hubspot.com/docs/api/overview

github:
  display_name: GitHub
  categories:
    - developer-tools
    - version-control
  auth_mode: OAUTH2
  authorization_url: https://github.com/login/oauth/authorize
  token_url: https://github.com/login/oauth/access_token
  default_scopes:
    - repo
    - read:user
  proxy:
    base_url: https://api.github.com
  paginate:
    type: link
    link_rel: next
  docs: https://docs.github.com/en/rest

twilio:
  display_name: Twilio
  categories:
    - communication
    - telephony
  auth_mode: BASIC
  proxy:
    base_url: https://api.twilio.com/2010-04-01
  docs: https://www.twilio.com/docs/usage/api

sendgrid:
  display_name: SendGrid
  categories:
    - email
    - marketing
  auth_mode: API_KEY
  proxy:
    base_url: https://api.sendgrid.com/v3
    headers:
      Authorization: Bearer ${apiKey}
  docs: https://docs.sendgrid.com/api-reference

notion:
  display_name: Notion
  categories:
    - productivity
    - documentation
  auth_mode: OAUTH2
  authorization_url: https://api.notion.com/v1/oauth/authorize
  token_url: https://api.notion.com/v1/oauth/token
  authorization_method: header
  body_format: json
  proxy:
    base_url: https://api.notion.com/v1
    headers:
      Notion-Version: '2022-06-28'
  paginate:
    type: cursor
    cursor_name_in_request: start_cursor
    cursor_path_in_response: next_cursor
    response_path: results
  docs: https://developers.notion.com/

salesforce:
  display_name: Salesforce
  categories:
    - crm
    - sales
  auth_mode: OAUTH2
  authorization_url: https://login.salesforce.com/services/oauth2/authorize
  token_url: https://login.salesforce.com/services/oauth2/token
  default_scopes:
    - full
    - refresh_token
  connection_configuration:
    - instance_url
  proxy:
    base_url: ${connectionConfig.instance_url}/services/data/v59.0
  docs: https://developer.salesforce.com/docs/apis

discord:
  display_name: Discord
  categories:
    - communication
    - gaming
  auth_mode: OAUTH2
  authorization_url: https://discord.com/oauth2/authorize
  token_url: https://discord.com/api/oauth2/token
  default_scopes:
    - identify
    - guilds
  proxy:
    base_url: https://discord.com/api/v10
  docs: https://discord.com/developers/docs

airtable:
  display_name: Airtable
  categories:
    - database
    - productivity
  auth_mode: OAUTH2
  authorization_url: https://airtable.com/oauth2/v1/authorize
  token_url: https://airtable.com/oauth2/v1/token
  authorization_params:
    response_type: code
  token_params:
    grant_type: authorization_code
  default_scopes:
    - data.records:read
    - data.records:write
    - schema.bases:read
  proxy:
    base_url: https://api.airtable.com/v0
  paginate:
    type: cursor
    cursor_name_in_request: offset
    cursor_path_in_response: offset
  docs: https://airtable.com/developers/web/api

jira:
  display_name: Jira
  categories:
    - project-management
    - developer-tools
  auth_mode: OAUTH2
  authorization_url: https://auth.atlassian.com/authorize
  token_url: https://auth.atlassian.com/oauth/token
  authorization_params:
    audience: api.atlassian.com
    prompt: consent
  default_scopes:
    - read:jira-work
    - write:jira-work
    - read:jira-user
  connection_configuration:
    - cloudId
  proxy:
    base_url: https://api.atlassian.com/ex/jira/${connectionConfig.cloudId}/rest/api/3
  docs: https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/
"""


def create_sample_providers_file(output_path: str = "sample_providers.yaml"):
    """Create a sample providers.yaml file for testing"""
    with open(output_path, 'w') as f:
        f.write(SAMPLE_PROVIDERS)
    print(f"✓ Created sample providers file: {output_path}")
    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="Convert Nango providers.yaml to UCMP connector manifests"
    )
    parser.add_argument(
        "providers_yaml",
        nargs="?",
        help="Path to Nango providers.yaml file"
    )
    parser.add_argument(
        "--provider", "-p",
        help="Convert a specific provider"
    )
    parser.add_argument(
        "--output", "-o",
        default="./converted_manifests",
        help="Output directory for converted manifests"
    )
    parser.add_argument(
        "--all", "-a",
        action="store_true",
        help="Convert all providers"
    )
    parser.add_argument(
        "--limit", "-l",
        type=int,
        help="Limit number of providers to convert"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available providers"
    )
    parser.add_argument(
        "--category", "-c",
        help="Filter by category when listing"
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show statistics about providers"
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Create sample providers.yaml and convert it"
    )
    
    args = parser.parse_args()
    
    # Handle sample mode
    if args.sample:
        sample_file = create_sample_providers_file()
        args.providers_yaml = sample_file
        args.all = True
    
    if not args.providers_yaml:
        parser.print_help()
        print("\n\nExample usage:")
        print("  python nango_converter.py --sample                    # Create and convert sample")
        print("  python nango_converter.py providers.yaml --list       # List all providers")
        print("  python nango_converter.py providers.yaml -p slack     # Convert single provider")
        print("  python nango_converter.py providers.yaml --all        # Convert all providers")
        return
    
    converter = NangoConverter(args.providers_yaml)
    
    if args.stats:
        stats = converter.get_stats()
        print("\n📊 Provider Statistics")
        print(f"  Total providers: {stats['total']}")
        print(f"  With pagination: {stats['with_pagination']}")
        print(f"  With webhooks: {stats['with_webhooks']}")
        print("\n  By auth mode:")
        for mode, count in sorted(stats['by_auth_mode'].items(), key=lambda x: -x[1]):
            print(f"    {mode}: {count}")
        print("\n  Top categories:")
        for cat, count in sorted(stats['by_category'].items(), key=lambda x: -x[1])[:15]:
            print(f"    {cat}: {count}")
    
    elif args.list:
        providers = converter.list_providers(args.category)
        print(f"\n📋 Available providers ({len(providers)}):")
        for p in providers:
            print(f"  - {p}")
    
    elif args.provider:
        manifest = converter.convert_provider(args.provider)
        if manifest:
            print(f"\n✓ Converted {args.provider}:\n")
            print(converter.to_yaml(manifest))
            
            # Also save to file
            output_path = Path(args.output)
            output_path.mkdir(parents=True, exist_ok=True)
            output_file = output_path / f"{args.provider}.yaml"
            with open(output_file, 'w') as f:
                f.write(converter.to_yaml(manifest))
            print(f"\n✓ Saved to: {output_file}")
    
    elif args.all:
        print(f"\n🔄 Converting all providers to {args.output}...")
        converter.convert_all(args.output, args.limit)


if __name__ == "__main__":
    main()
