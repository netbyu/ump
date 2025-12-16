"""
Phone Configuration Generator
Generates vendor-specific config files from templates
"""
from jinja2 import Template
from typing import Dict, Any, Optional
import re


class PhoneConfigGenerator:
    """Generate phone configs from templates"""

    def __init__(self):
        self.vendor_handlers = {
            'yealink': self.generate_yealink_config,
            'polycom': self.generate_polycom_config,
            'cisco': self.generate_cisco_config,
            'grandstream': self.generate_grandstream_config,
        }

    def generate_config(
        self,
        vendor: str,
        template_content: str,
        variables: Dict[str, Any]
    ) -> str:
        """
        Generate config from template

        Args:
            vendor: Phone vendor (yealink, polycom, etc.)
            template_content: Jinja2 template string
            variables: Values to inject (extension, password, etc.)

        Returns:
            Generated configuration content
        """
        # Get vendor-specific handler or use generic
        handler = self.vendor_handlers.get(vendor, self.generate_generic_config)

        return handler(template_content, variables)

    def generate_generic_config(
        self,
        template_content: str,
        variables: Dict[str, Any]
    ) -> str:
        """Generic Jinja2 template rendering"""
        template = Template(template_content)
        return template.render(**variables)

    def generate_yealink_config(
        self,
        template_content: str,
        variables: Dict[str, Any]
    ) -> str:
        """
        Generate Yealink phone config
        Format: INI-style key=value pairs
        """
        # Add Yealink-specific defaults
        yealink_vars = {
            'codec_list': 'PCMU,PCMA,G722',
            'ntp_server': 'pool.ntp.org',
            'admin_password': 'admin',
            **variables
        }

        template = Template(template_content)
        config = template.render(**yealink_vars)

        # Add Yealink version header
        version_header = "#!version:1.0.0.1\n\n"
        return version_header + config

    def generate_polycom_config(
        self,
        template_content: str,
        variables: Dict[str, Any]
    ) -> str:
        """
        Generate Polycom phone config
        Format: XML
        """
        polycom_vars = {
            'voip_protocol': 'SIP',
            **variables
        }

        template = Template(template_content)
        config = template.render(**polycom_vars)

        # Add XML declaration if not present
        if not config.strip().startswith('<?xml'):
            xml_header = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            return xml_header + config

        return config

    def generate_cisco_config(
        self,
        template_content: str,
        variables: Dict[str, Any]
    ) -> str:
        """
        Generate Cisco phone config
        Format: XML (SEP{MAC}.cnf.xml)
        """
        cisco_vars = {
            'device_pool': 'Default',
            'ntp_server': '0.pool.ntp.org',
            **variables
        }

        template = Template(template_content)
        return template.render(**cisco_vars)

    def generate_grandstream_config(
        self,
        template_content: str,
        variables: Dict[str, Any]
    ) -> str:
        """
        Generate Grandstream phone config
        Format: XML (cfg{MAC}.xml)
        """
        grandstream_vars = {
            'p_value': '0',  # Grandstream uses P-values
            **variables
        }

        template = Template(template_content)
        return template.render(**grandstream_vars)

    def format_mac_for_vendor(self, mac_address: str, vendor: str) -> str:
        """
        Format MAC address according to vendor requirements

        Args:
            mac_address: MAC in AA:BB:CC:DD:EE:FF format
            vendor: Phone vendor

        Returns:
            Formatted MAC address
        """
        # Remove colons and convert to lowercase
        mac_clean = mac_address.replace(':', '').lower()

        if vendor == 'yealink':
            # Yealink: lowercase no separator
            return mac_clean

        elif vendor == 'polycom':
            # Polycom: MAC with dashes
            return '-'.join([mac_clean[i:i+2] for i in range(0, 12, 2)])

        elif vendor == 'cisco':
            # Cisco: Uppercase no separator
            return mac_clean.upper()

        elif vendor == 'grandstream':
            # Grandstream: Lowercase no separator
            return mac_clean

        else:
            # Default: Lowercase no separator
            return mac_clean

    def get_config_filename(
        self,
        mac_address: str,
        vendor: str,
        pattern: str
    ) -> str:
        """
        Generate config filename based on vendor pattern

        Args:
            mac_address: MAC address
            vendor: Phone vendor
            pattern: Filename pattern (e.g., "y{mac}.cfg")

        Returns:
            Config filename
        """
        formatted_mac = self.format_mac_for_vendor(mac_address, vendor)

        # Replace {mac} placeholder
        filename = pattern.replace('{mac}', formatted_mac)

        return filename


# =============================================================================
# Vendor-Specific Template Defaults
# =============================================================================

YEALINK_DEFAULT_TEMPLATE = """
# Account 1 - Line {{line_number|default(1)}}
account.{{line_number|default(1)}}.enable = 1
account.{{line_number|default(1)}}.label = {{extension_name|default(extension)}}
account.{{line_number|default(1)}}.display_name = {{extension_name|default(extension)}}
account.{{line_number|default(1)}}.auth_name = {{extension}}
account.{{line_number|default(1)}}.user_name = {{extension}}
account.{{line_number|default(1)}}.password = {{sip_password}}
account.{{line_number|default(1)}}.sip_server.1.address = {{pbx_server_ip}}
account.{{line_number|default(1)}}.sip_server.1.port = {{pbx_port|default(5060)}}
account.{{line_number|default(1)}}.sip_server.1.transport_type = {{transport|default(0)}}

# Codecs
voice.codec.1.enable = 1
voice.codec.1.payload_type = PCMU
voice.codec.2.enable = 1
voice.codec.2.payload_type = PCMA
voice.codec.3.enable = 1
voice.codec.3.payload_type = G722

# Features
features.blf.enable = {{features.blf|default(1)}}
features.call_forward.enable = 1
features.call_forward.on_code = *72
features.call_forward.off_code = *73
features.voice_mail.number = *97

# Network
network.internet_port.type = {{network_type|default(0)}}
{% if static_ip %}
network.internet_port.ip = {{static_ip}}
network.internet_port.mask = {{subnet_mask|default('255.255.255.0')}}
network.internet_port.gateway = {{gateway}}
{% endif %}

# Time
local_time.time_zone = {{timezone|default(-5)}}
local_time.ntp_server1 = {{ntp_server|default('pool.ntp.org')}}

# Admin
security.user_password = {{admin_password|default('admin')}}
"""

POLYCOM_DEFAULT_TEMPLATE = """
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<APPLICATION>
  <reg reg.1.server.1.address="{{pbx_server_ip}}"
       reg.1.server.1.port="{{pbx_port|default(5060)}}"
       reg.1.displayName="{{extension_name|default(extension)}}"
       reg.1.address="{{extension}}"
       reg.1.auth.userId="{{extension}}"
       reg.1.auth.password="{{sip_password}}"
       reg.1.lineKeys="1"
       reg.1.label="{{extension_name|default(extension)}}"
       reg.1.type="private"/>

  <voIpProt voIpProt.SIP.requestValidation.1.request="INVITE"
             voIpProt.SIP.requestValidation.1.method="digest"/>

  <call call.directedCallPickupString="*8"
        call.missedCallTracking.enabled="1"
        call.callsPerLineKey="1"/>

  <tcpIpApp tcpIpApp.sntp.address="{{ntp_server|default('pool.ntp.org')}}"
             tcpIpApp.sntp.gmtOffset="{{timezone|default(-18000)}}"/>
</APPLICATION>
"""

GRANDSTREAM_DEFAULT_TEMPLATE = """
<?xml version="1.0" encoding="UTF-8"?>
<gs_provision version="1">
  <config version="1">
    <!-- Account 1 -->
    <P270>{{extension}}</P270>  <!-- Account Name -->
    <P271>{{extension_name|default(extension)}}</P271>  <!-- Display Name -->
    <P35>{{extension}}</P35>   <!-- SIP User ID -->
    <P36>{{extension}}</P36>   <!-- Authenticate ID -->
    <P34>{{sip_password}}</P34>  <!-- Authenticate Password -->
    <P47>{{pbx_server_ip}}</P47>  <!-- SIP Server -->
    <P48>{{pbx_port|default(5060)}}</P48>  <!-- SIP Port -->

    <!-- Codecs -->
    <P57>0</P57>  <!-- PCMU -->
    <P58>8</P58>  <!-- PCMA -->
    <P59>9</P59>  <!-- G722 -->

    <!-- Features -->
    <P1347>*97</P1347>  <!-- Voicemail UserID -->

    <!-- Network -->
    {% if static_ip %}
    <P8>{{static_ip}}</P8>
    <P9>{{subnet_mask|default('255.255.255.0')}}</P9>
    <P10>{{gateway}}</P10>
    {% endif %}

    <!-- Time Zone -->
    <P64>{{timezone|default(-5)}}</P64>
  </config>
</gs_provision>
"""

CISCO_DEFAULT_TEMPLATE = """
<?xml version="1.0" encoding="UTF-8"?>
<device>
  <devicePool>
    <name>Default</name>
    <dateTimeSetting>
      <timeZone>{{timezone|default('America/New_York')}}</timeZone>
      <ntpServer>{{ntp_server|default('0.pool.ntp.org')}}</ntpServer>
    </dateTimeSetting>
  </devicePool>

  <sipLines>
    <line button="1">
      <featureID>9</featureID>
      <featureLabel>{{extension_name|default(extension)}}</featureLabel>
      <proxy>{{pbx_server_ip}}</proxy>
      <port>{{pbx_port|default(5060)}}</port>
      <name>{{extension}}</name>
      <displayName>{{extension_name|default(extension)}}</displayName>
      <authName>{{extension}}</authName>
      <authPassword>{{sip_password}}</authPassword>
      <sharedLine>false</sharedLine>
    </line>
  </sipLines>

  <commonProfile>
    <phonePassword>{{admin_password|default('cisco')}}</phonePassword>
  </commonProfile>
</device>
"""
