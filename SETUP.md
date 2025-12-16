# Asterisk Management UI - Setup Guide

## Quick Start with Docker (Recommended)

```bash
# Clone/copy the new-system directory
cd new-system

# Start development environment
make dev

# Or manually:
docker-compose -f docker-compose.dev.yml up -d
```

**Access:**
- **UI**: http://localhost:3000
- **API**: http://localhost:3001
- **Default login**: `admin` / `changeme`

### Docker Commands

```bash
make dev          # Start dev environment (hot reload)
make dev-logs     # View logs
make dev-stop     # Stop dev environment

make prod         # Build & start production
make prod-stop    # Stop production

make db-shell     # PostgreSQL shell
make ast-cli      # Asterisk CLI

make clean        # Remove everything
```

---

## Manual Setup (Without Docker)

### Prerequisites

- **Node.js** 18+
- **PostgreSQL** 14+
- **Asterisk** 18+ (with PJSIP and ARI enabled)

## Quick Start

### 1. Database Setup

```bash
# Create PostgreSQL database and user
sudo -u postgres psql <<EOF
CREATE USER asterisk WITH PASSWORD 'your_secure_password';
CREATE DATABASE asterisk_mgmt OWNER asterisk;
GRANT ALL PRIVILEGES ON DATABASE asterisk_mgmt TO asterisk;
EOF

# Initialize schema
psql -U asterisk -d asterisk_mgmt -f database/schema.sql
```

### 2. Asterisk Configuration

Copy the Asterisk config files to your Asterisk installation:

```bash
# PJSIP Realtime configuration
cp asterisk/extconfig.conf /etc/asterisk/
cp asterisk/res_config_pgsql.conf /etc/asterisk/

# CDR to PostgreSQL
cp asterisk/cdr_pgsql.conf /etc/asterisk/

# ARI (REST API)
cp asterisk/ari.conf /etc/asterisk/
cp asterisk/http.conf /etc/asterisk/

# Update passwords in the config files!
# Then reload Asterisk
asterisk -rx "core reload"
```

### 3. API Server Setup

```bash
cd api

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your settings

# Generate Prisma client
npx prisma generate

# Start development server
npm run dev
```

### 4. UI Setup

```bash
cd ui

# Install dependencies
npm install

# Start development server
npm run dev
```

### 5. Access the Application

- **UI**: http://localhost:3000
- **API**: http://localhost:3001
- **Default login**: admin / changeme (change immediately!)

---

## Migration from Legacy System

If you're migrating from the legacy IDS VoIP system:

```bash
cd migration

# Install migration dependencies
npm install

# Preview migration (dry run)
npm run migrate:dry-run

# Execute migration
npm run migrate
```

**Important**: All migrated users will have password "changeme" - they must change it on first login.

---

## Production Deployment

### Environment Variables

Set these in production:

```bash
# API
NODE_ENV=production
JWT_SECRET=<generate-secure-random-string>
DATABASE_URL=postgresql://user:pass@host:5432/asterisk_mgmt
ARI_URL=http://asterisk-server:8088
ARI_USERNAME=asterisk-mgmt
ARI_PASSWORD=<secure-password>

# UI
VITE_API_URL=https://your-domain.com/api
```

### Build for Production

```bash
# Build API
cd api && npm run build

# Build UI
cd ui && npm run build
```

### Recommended: Use PM2 for Process Management

```bash
npm install -g pm2

# Start API
cd api && pm2 start dist/index.js --name asterisk-mgmt-api

# Serve UI with nginx (recommended) or:
cd ui && pm2 serve dist 3000 --name asterisk-mgmt-ui
```

### Nginx Configuration Example

```nginx
server {
    listen 80;
    server_name pbx.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name pbx.example.com;

    ssl_certificate /etc/letsencrypt/live/pbx.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pbx.example.com/privkey.pem;

    # UI
    location / {
        root /var/www/asterisk-mgmt/ui/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
    }
}
```

---

## Project Structure

```
new-system/
├── api/                    # Node.js API server
│   ├── src/
│   │   ├── config/        # Configuration
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── services/      # Business logic (ARI, realtime)
│   │   └── utils/         # Utilities
│   └── prisma/            # Database schema
├── ui/                    # React frontend
│   └── src/
│       ├── components/    # Shared components
│       ├── lib/           # API client, socket
│       ├── pages/         # Page components
│       └── stores/        # Zustand stores
├── asterisk/              # Asterisk config files
├── database/              # SQL schema
└── migration/             # Legacy migration tools
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | User login |
| GET | /api/extensions | List extensions |
| POST | /api/extensions | Create extension |
| GET | /api/extensions/:id | Get extension |
| PUT | /api/extensions/:id | Update extension |
| DELETE | /api/extensions/:id | Delete extension |
| GET | /api/queues | List queues |
| POST | /api/queues | Create queue |
| POST | /api/queues/:name/members | Add member to queue |
| DELETE | /api/queues/:name/members/:ext | Remove member |
| GET | /api/cdr | List call records |
| GET | /api/cdr/stats | Call statistics |
| GET | /api/system/status | System health |
| GET | /api/system/channels | Active calls (via ARI) |

---

## Extending the System

### Adding New Features

1. **Backend**: Add route in `api/src/routes/`, update Prisma schema if needed
2. **Frontend**: Add page in `ui/src/pages/`, update router in `App.tsx`

### Adding Real-time Events

1. Subscribe in `api/src/services/ari.ts` to ARI events
2. Forward to clients via `api/src/services/realtime.ts`
3. Handle in UI using `ui/src/lib/socket.ts` hooks
