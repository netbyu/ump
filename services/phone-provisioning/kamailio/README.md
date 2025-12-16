# Kamailio SIP Router - Configuration Guide

## 🎯 Architecture

```
                    Kamailio SIP Router
                       (Port 5060)
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   Extensions         Extensions         Extensions
   1000-1999          2000-2999          3000-3999
        │                  │                  │
        ▼                  ▼                  ▼
  FreePBX 1          Asterisk 1         Special PBX
  (Port 5061)        (Port 5063)        (Port 5065)
        │                  │                  │
    Backup:            Backup:            Backup:
  FreePBX 2          Asterisk 2            N/A
  (Port 5062)        (Port 5064)
```

## 📝 Routing Rules

### Extension-Based Routing

```
Extensions 1000-1999:
├─ Primary: FreePBX 1 (192.168.1.100:5061)
└─ Backup: FreePBX 2 (192.168.1.101:5062)

Extensions 2000-2999:
├─ Primary: Asterisk 1 (192.168.1.102:5063)
└─ Backup: Asterisk 2 (192.168.1.103:5064)

Extensions 3000-3999:
└─ Special PBX (192.168.1.104:5065)

External/PSTN:
└─ SIP Trunks (Set 4)
```

### Load Balancing

**Algorithm: Dispatcher Module**
- Round-robin across active destinations
- Automatic failover to backup
- Health checking (OPTIONS ping every 30s)
- Inactive destinations skipped

### Failover

```
Call to Extension 1001:
1. Kamailio receives INVITE
2. Routes to FreePBX 1 (192.168.1.100:5061)
3. If timeout/error → Try FreePBX 2 (backup)
4. If both fail → Send 503 Service Unavailable
```

## 🔧 Configuration Files

### kamailio.cfg
Main configuration with:
- Routing logic
- Extension range rules
- Load balancing
- Failover handling
- RTPEngine integration

### dispatcher.list
Backend PBX destinations:
```
setid destination flags priority
1     sip:ip:port  0     0
```

## 📊 Management Commands

```bash
# Reload dispatcher (after adding PBX)
docker exec kamailio kamctl dispatcher reload

# Show active backends
docker exec kamailio kamctl dispatcher dump

# Show statistics
docker exec kamailio kamctl stats

# Test backend connectivity
docker exec kamailio kamctl dispatcher ping

# View live calls
docker exec kamailio kamctl online
```

## 🎯 Integration with UMP

### With PBX Nodes

```
Node: FreePBX Primary
├─ Integration: Asterisk AMI
├─ SIP Port: 5061 (NOT 5060!)
└─ Register with Kamailio

Kamailio routes calls to this node
```

### With Phone Provisioning

```
Phone Assignment:
├─ Extension: 1001
├─ PBX Server: <kamailio-ip>:5060  ← Points to Kamailio
└─ Kamailio routes to correct backend
```

## 🚀 Deployment

### Via UMP Stacks

```
1. Infrastructure → Stacks
2. Select "Kamailio SIP Router"
3. Deploy to Docker host
4. Configure backend PBXes
5. Point phones to Kamailio
```

### Manual Docker Compose

```bash
docker compose up -d
docker exec kamailio kamdbctl create
docker exec kamailio kamctl dispatcher reload
```

## 🎨 Use Cases

### Multi-Tenant PBX
```
Company A (Exts 1000-1999) → FreePBX 1
Company B (Exts 2000-2999) → FreePBX 2
Company C (Exts 3000-3999) → Asterisk 1
```

### Geographic Distribution
```
US East (Set 1) → PBX in NY
US West (Set 2) → PBX in LA
Europe (Set 3) → PBX in London
```

### High Availability
```
Primary PBX (Active)
Backup PBX (Standby)

Kamailio monitors health
Fails over automatically
```

## 🔒 Security Features

- **Topology Hiding**: Hides internal PBX IPs
- **Rate Limiting**: Prevent SIP flooding
- **Authentication**: SIP digest auth
- **TLS Support**: Encrypted SIP signaling
- **ACL**: IP-based access control

## 📈 Performance

**Kamailio can handle:**
- 10,000+ concurrent calls
- 100,000+ registrations
- Minimal latency (<1ms routing)
- High availability (99.99%+)

## 🎯 Perfect For:

✅ Multiple PBX instances in Docker
✅ Multi-tenant SIP environments
✅ Load balancing across PBXes
✅ High availability setups
✅ Centralized SIP routing
✅ Enterprise deployments

---

**Kamailio = Enterprise-grade SIP routing for your platform!** 📞🚀
