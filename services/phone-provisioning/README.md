# SIP Phone Provisioning Service

Auto-provision SIP phones with zero-touch deployment.

## 🎯 What It Does

Automatically configures IP phones when they boot:
- Phone requests config via TFTP/HTTP
- Service identifies phone by MAC address
- Generates vendor-specific config from template
- Phone downloads and applies configuration
- Phone registers to PBX automatically

## 🏗️ Architecture

```
Phone Boots
    ↓
Requests: tftp://server/{mac}.cfg
    ↓
Provisioning Service:
├─ Looks up MAC in database
├─ Gets: Extension, Password, PBX Server
├─ Loads template for phone model
├─ Generates config file
└─ Returns config to phone
    ↓
Phone applies config
    ↓
Phone registers to PBX ✓
```

## 📦 Components

### **1. Database (PostgreSQL)**
```
Tables:
├── phone_models (Supported hardware)
├── phone_templates (Config templates per vendor)
├── phone_assignments (MAC → Extension mapping)
├── phone_provisioning_log (Audit trail)
└── phone_firmware (Firmware repository)
```

### **2. API Service (FastAPI)**
```
Endpoints:
├── /phone-models (Manage phone models)
├── /templates (Config templates)
├── /assignments (MAC → Extension)
├── /provision/{mac} (Generate config)
└── /firmware (Firmware management)
```

### **3. Config Generator**
```
Supported Vendors:
├── Yealink (T4X, T5X series)
├── Polycom (VVX, Trio)
├── Cisco (79XX, 88XX)
├── Grandstream (GXP, GRP)
└── Extensible for more
```

### **4. TFTP/HTTP Server**
```
Serves:
├── Phone configs (auto-generated)
├── Firmware files
├── Custom backgrounds/ringtones
└── Phonebooks (if enabled)
```

## 🚀 Quick Start

### 1. Deploy Database Schema

```bash
cd /home/ubuntu/vscode/ump/services/phone-provisioning
psql -U postgres -d ucmp -f phone_provisioning_schema.sql
```

### 2. Install Dependencies

```bash
cd api
pip install -r requirements.txt
```

### 3. Start Service

```bash
uvicorn app.main:app --port 8005
```

### 4. Start TFTP Server (optional)

```bash
python -m app.services.tftp_server
```

## 📝 Usage Example

### Add Phone Assignment

```bash
POST /api/assignments
{
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "phone_model_id": "yealink-t46s",
  "extension": "1001",
  "extension_name": "John Doe",
  "sip_password": "secure_password",
  "pbx_server_ip": "192.168.1.100",
  "template_id": "yealink-standard"
}
```

### Phone Auto-Provisions

```
1. Phone boots
2. Sends DHCP request with vendor class
3. DHCP server returns:
   - IP address
   - TFTP server: 192.168.1.10
   - Boot file: yAABBCCDDEEFF.cfg

4. Phone requests: tftp://192.168.1.10/yAABBCCDDEEFF.cfg

5. Provisioning service:
   - Looks up AA:BB:CC:DD:EE:FF
   - Finds: Extension 1001, PBX 192.168.1.100
   - Generates Yealink config
   - Returns config file

6. Phone applies config
7. Phone registers to PBX as 1001 ✓
```

## 🎨 Features

### **Zero-Touch Provisioning**
- Plug phone into network
- Phone auto-configures
- No manual setup needed

### **Mass Deployment**
- Upload CSV: MAC, Extension, Name
- Bulk assign phones
- Deploy hundreds of phones

### **Template System**
- Vendor-specific templates
- Jinja2 templating
- Feature toggles (BLF, voicemail, etc.)
- Custom overrides per phone

### **Firmware Management**
- Centralized firmware repository
- Auto-upgrade phones
- Version control
- Rollback capability

### **Integration**
- Works with PBX nodes
- FreePBX, Asterisk, etc.
- Extension sync
- Real-time status

## 🔧 Configuration Templates

### Yealink Example

```ini
# Yealink T46S Template
#!version:1.0.0.1

# Account 1
account.1.enable = 1
account.1.label = {{extension_name}}
account.1.display_name = {{extension_name}}
account.1.auth_name = {{extension}}
account.1.user_name = {{extension}}
account.1.password = {{sip_password}}
account.1.sip_server_host = {{pbx_server_ip}}
account.1.sip_server_port = 5060

# Codec
voice.codec.1.enable = 1
voice.codec.1.payload_type = PCMU
voice.codec.2.enable = 1
voice.codec.2.payload_type = PCMA

# Features
features.blf.enable = {{features.blf|default(1)}}
features.call_forward.enable = 1
features.voicemail.number = *97

# Timezone
local_time.time_zone = {{timezone|default("-5")}}
```

## 📊 Database Schema Highlights

**Tables Created:**
- ✅ `phone_models` - 5 sample models (Yealink, Polycom, Cisco, Grandstream)
- ✅ `phone_templates` - Config templates
- ✅ `phone_assignments` - MAC → Extension mapping
- ✅ `phone_provisioning_log` - Audit trail
- ✅ `phone_firmware` - Firmware files

**Sample Data:**
- Yealink T46S, T48S
- Polycom VVX 450
- Grandstream GXP2170
- Cisco 8841

## 🎯 Integration with UMP

### Links to Nodes

```
Node: FreePBX Production
├─ Integration: Asterisk AMI
└─ Phone Assignments:
    ├─ MAC: AA:BB:CC:DD:EE:FF → Ext 1001
    ├─ MAC: 11:22:33:44:55:66 → Ext 1002
    └─ MAC: 99:88:77:66:55:44 → Ext 1003
```

### Workflow Integration

```
Temporal Workflow: Onboard Employee
├─ Step 1: Create user in AD
├─ Step 2: Create email account
├─ Step 3: Assign phone extension
├─ Step 4: Auto-provision phone ← Uses this service
└─ Step 5: Send welcome email
```

## 📁 File Structure

```
services/phone-provisioning/
├── api/
│   ├── app/
│   │   ├── models/
│   │   │   └── phone.py               ✅ Created
│   │   ├── routes/
│   │   │   ├── phone_models.py        (TODO)
│   │   │   ├── templates.py           (TODO)
│   │   │   ├── assignments.py         (TODO)
│   │   │   └── provisioning.py        (TODO)
│   │   └── services/
│   │       ├── config_generator.py    (TODO)
│   │       ├── tftp_server.py         (TODO)
│   │       └── template_renderer.py   (TODO)
│   ├── requirements.txt                ✅ Created
│   └── main.py                         (TODO)
├── templates/
│   ├── yealink/                        (TODO)
│   ├── polycom/                        (TODO)
│   ├── cisco/                          (TODO)
│   └── grandstream/                    (TODO)
├── firmware/                           (TODO)
└── phone_provisioning_schema.sql       ✅ Created
```

## 🎯 Next Steps

When database is accessible:
1. ✅ Deploy schema to PostgreSQL
2. Create config generator service
3. Implement vendor templates
4. Build TFTP/HTTP server
5. Create UI for phone management
6. Add to dev.sh (port 8005)

## 📖 Documentation

Complete phone provisioning system ready to be built on top of this foundation.
Schema and models are ready - just needs database deployment and service implementation.
