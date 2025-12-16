"""
Phone Provisioning Service
Main service for auto-provisioning SIP phones
"""
from typing import Optional, Dict, Any
from datetime import datetime
import os
import aiofiles

from .config_generator import PhoneConfigGenerator
from ..models.phone import PhoneAssignment, ProvisioningRequest, ProvisioningResponse


class PhoneProvisioningService:
    """Main provisioning service"""

    def __init__(self, config_dir: str = "/var/lib/phone-configs"):
        self.config_generator = PhoneConfigGenerator()
        self.config_dir = config_dir

        # Ensure config directory exists
        os.makedirs(config_dir, exist_ok=True)

    async def provision_phone(
        self,
        mac_address: str,
        assignment: PhoneAssignment,
        template_content: str,
        phone_model: Any
    ) -> ProvisioningResponse:
        """
        Provision a phone by generating its config file

        Args:
            mac_address: Phone MAC address
            assignment: Phone assignment with extension details
            template_content: Config template
            phone_model: Phone model definition

        Returns:
            ProvisioningResponse with config content
        """
        try:
            # Prepare template variables
            variables = {
                'extension': assignment.extension,
                'extension_name': assignment.extension_name or assignment.extension,
                'sip_password': assignment.sip_password,
                'pbx_server_ip': assignment.pbx_server_ip,
                'pbx_domain': assignment.pbx_domain,
                'pbx_port': 5060,

                # Network
                'static_ip': assignment.static_ip,
                'subnet_mask': assignment.subnet_mask,
                'gateway': assignment.gateway,
                'vlan_id': assignment.vlan_id,

                # Phone
                'mac_address': mac_address,
                'phone_model': phone_model.model_name,

                # Custom config overrides
                **assignment.custom_config,
            }

            # Generate config using vendor-specific generator
            config_content = self.config_generator.generate_config(
                vendor=assignment.vendor,
                template_content=template_content,
                variables=variables
            )

            # Generate filename
            filename = self.config_generator.get_config_filename(
                mac_address=mac_address,
                vendor=assignment.vendor,
                pattern=phone_model.config_file_pattern
            )

            # Save config file
            config_path = os.path.join(self.config_dir, filename)
            async with aiofiles.open(config_path, 'w') as f:
                await f.write(config_content)

            return ProvisioningResponse(
                success=True,
                config_content=config_content,
                config_file_path=config_path
            )

        except Exception as e:
            return ProvisioningResponse(
                success=False,
                error=str(e)
            )

    async def get_config_by_mac(self, mac_address: str) -> Optional[str]:
        """
        Get config file for a MAC address
        Used by TFTP/HTTP server

        Args:
            mac_address: Phone MAC address (any format)

        Returns:
            Config file path or None
        """
        # Normalize MAC address
        mac_normalized = mac_address.replace(':', '').replace('-', '').lower()

        # Search for config file
        # Try different filename patterns
        possible_filenames = [
            f"{mac_normalized}.cfg",           # Generic
            f"y{mac_normalized}.cfg",           # Yealink
            f"{mac_normalized.upper()}.cfg",    # Uppercase
            f"cfg{mac_normalized}.xml",         # Grandstream
            f"SEP{mac_normalized.upper()}.cnf.xml",  # Cisco
        ]

        for filename in possible_filenames:
            config_path = os.path.join(self.config_dir, filename)
            if os.path.exists(config_path):
                async with aiofiles.open(config_path, 'r') as f:
                    return await f.read()

        return None

    async def regenerate_all_configs(self) -> Dict[str, int]:
        """
        Regenerate all phone configs
        Useful after template changes

        Returns:
            Statistics: success_count, failed_count
        """
        stats = {"success": 0, "failed": 0}

        # TODO: Get all phone assignments from database
        # For each assignment:
        #   - Get template
        #   - Generate config
        #   - Save file
        #   - Update stats

        return stats

    def validate_config(
        self,
        config_content: str,
        vendor: str
    ) -> tuple[bool, Optional[str]]:
        """
        Validate generated config

        Args:
            config_content: Generated config
            vendor: Phone vendor

        Returns:
            (is_valid, error_message)
        """
        if vendor == 'yealink':
            # Check for required fields
            required = ['account.1.enable', 'account.1.user_name', 'account.1.password']
            for field in required:
                if field not in config_content:
                    return False, f"Missing required field: {field}"

        elif vendor == 'polycom':
            # Check for valid XML
            if '<?xml' not in config_content:
                return False, "Missing XML declaration"

        elif vendor == 'grandstream':
            # Check for P-values
            if '<P35>' not in config_content:  # SIP User ID
                return False, "Missing SIP User ID (P35)"

        return True, None
