# UMP - Unified Management Platform

Enterprise Unified Communications Management Platform with Role-Based Access Control.

## Project Structure

```
ump/
├── apps/                    # Deployable applications
│   ├── web/                 # Next.js frontend
│   └── api/                 # Main FastAPI backend
│
├── services/                # Microservices
│   └── rbac/                # RBAC service (Casbin-based)
│
├── docs/                    # Documentation
├── references/              # Design references (Figma)
└── docker-compose.yml       # Container orchestration
```

## Tech Stack

### Frontend (apps/web)
- Next.js 14
- React 18
- TailwindCSS
- Radix UI
- TanStack Query
- LiveKit (real-time communication)

### Backend (apps/api)
- FastAPI
- SQLAlchemy (async)
- PostgreSQL
- LiveKit SDK

### RBAC Service (services/rbac)
- FastAPI
- Casbin (RBAC/ABAC)
- PostgreSQL
- JWT Authentication

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.12+
- PostgreSQL 15+
- Docker (optional)

### Frontend Setup
```bash
cd apps/web
npm install
npm run dev
```

### API Setup
```bash
cd apps/api
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### RBAC Service Setup
```bash
cd services/rbac
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Documentation

- [RBAC Implementation Guide](docs/RBAC_IMPLEMENTATION_GUIDE.md)
- [Frontend Guidelines](docs/FRONTEND_GUIDELINES.md)
- [LiveKit Setup](docs/LIVEKIT_SETUP.md)
