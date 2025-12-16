# UMP Integration Architecture

Complete integration system supporting both **Device Integrations** (hardware) and **Platform Integrations** (software/SaaS).

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    UMP Integration System                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐    │
│  │ Device Integrations  │      │ Platform Integrations│    │
│  │ (Hardware)           │      │ (Software/SaaS)      │    │
│  └──────────────────────┘      └──────────────────────┘    │
│           │                              │                  │
│           │                              │                  │
│  ┌────────▼────────┐            ┌────────▼────────┐        │
│  │ Device          │            │ Platform         │        │
│  │ (PBX, Switch)   │            │ (Salesforce,Slack│        │
│  └────────┬────────┘            └────────┬─────────┘        │
│           │                              │                  │
│           ├──────────────┬───────────────┤                  │
│           │              │               │                  │
│  ┌────────▼────────┐    │    ┌─────────▼─────────┐        │
│  │ Provider        │◄───┴────┤ Provider          │        │
│  │ (Template)      │         │ (Template)        │        │
│  │ - Asterisk      │         │ - Salesforce API  │        │
│  │ - Cisco         │         │ - Slack API       │        │
│  └────────┬────────┘         └─────────┬─────────┘        │
│           │                            │                  │
│  ┌────────▼────────┐          ┌────────▼─────────┐        │
│  │ Config + Creds  │          │ Config + Creds   │        │
│  │ - Host, Port    │          │ - API Keys       │        │
│  │ - Username/Pass │          │ - OAuth Tokens   │        │
│  └─────────────────┘          └──────────────────┘        │
│           │                            │                  │
│           └──────────────┬─────────────┘                  │
│                          │                                │
│                 ┌────────▼────────┐                       │
│                 │ Connector       │                       │
│                 │ (Instance)      │                       │
│                 │                 │                       │
│                 │ Ready to use!   │                       │
│                 └─────────────────┘                       │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 🎯 Integration Formula

### **Device Integration:**
```
Device (PBX-001)
  + Provider (Asterisk AMI)
  + Config (host: 192.168.1.10, port: 5038)
  + Credentials (username: admin, secret: ...)
  = Device Integration (ready to manage PBX-001)
```

### **Platform Integration:**
```
Platform (Production Salesforce)
  + Provider (Salesforce API)
  + Config (instance_url, api_version)
  + Credentials (OAuth token, refresh_token)
  = Platform Integration (ready to use Salesforce API)
```

---

## 📊 Database Structure

```sql
-- Device Integrations (Hardware)
CREATE TABLE device_integrations (
    id UUID PRIMARY KEY,
    device_id UUID REFERENCES devices(id),
    provider_id VARCHAR(255),
    connector_id UUID,
    integration_type integration_type DEFAULT 'device',
    config JSONB,
    ...
);

-- Platform Integrations (Software/SaaS)
CREATE TABLE platform_integrations (
    id UUID PRIMARY KEY,
    name VARCHAR(255),  -- e.g., "Production Salesforce"
    provider_id VARCHAR(255),  -- e.g., "salesforce"
    connector_id UUID,
    integration_type integration_type DEFAULT 'platform',
    config JSONB,
    ...
);

-- Unified View
CREATE VIEW all_integrations AS
    SELECT ... FROM device_integrations
    UNION ALL
    SELECT ... FROM platform_integrations;
```

---

## 🎨 UI Structure

```
Connectors Section (Sidebar)
│
├── Providers (Catalog)
│   └── Browse 621+ providers
│       ├── Device Providers (Asterisk, Cisco, etc.)
│       └── Platform Providers (Salesforce, Slack, etc.)
│
├── Connectors (Instances)
│   └── Configured connectors with credentials
│       ├── "Production Salesforce" (Salesforce provider)
│       └── "Main Office PBX" (Asterisk provider)
│
└── Integrations (Bindings)
    ├── Device Integrations
    │   └── Device + Connector = Integration
    │       e.g., "PBX-001" + "Main Office PBX connector"
    │
    └── Platform Integrations ✨ NEW!
        └── Platform + Connector = Integration
            e.g., "CRM Production" + "Production Salesforce connector"
```

---

## 🎯 Examples

### **Example 1: Device Integration**

**Step 1 - Create Connector:**
```
Provider: Asterisk AMI
Name: Main Office PBX Connector
Credentials:
  - host: 192.168.1.10
  - port: 5038
  - username: admin
  - secret: ***
```

**Step 2 - Create Device Integration:**
```
Device: PBX-001 (from devices table)
Connector: Main Office PBX Connector
Config:
  - context: internal
  - extensions: [100-199]
Integration Ready! ✓
```

### **Example 2: Platform Integration**

**Step 1 - Create Connector:**
```
Provider: Salesforce
Name: Production Salesforce
Credentials:
  - client_id: ***
  - client_secret: ***
  - refresh_token: ***
  - instance_url: https://company.salesforce.com
```

**Step 2 - Create Platform Integration:**
```
Platform Name: CRM Production
Connector: Production Salesforce
Config:
  - api_version: v55.0
  - sync_contacts: true
  - default_owner_id: 005...
Integration Ready! ✓
```

---

## 📱 New Pages Needed:

```
/integrations/
├── page.tsx                 (Overview - both types)
├── devices/
│   └── page.tsx            (Device integrations list)
└── platforms/              ✨ NEW!
    ├── page.tsx            (Platform integrations list)
    └── [id]/
        └── page.tsx        (Platform integration details)
```

---

Should I build:
1. **Platform integrations schema** (SQL) ✅ Created
2. **Platform integrations API** (Backend routes)
3. **Platform integrations UI** (Frontend pages)
4. **Unified integrations view** (Shows both types)

Ready to build this? 🚀