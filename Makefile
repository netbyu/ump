.PHONY: help dev prod stop logs clean migrate

# Default target
help:
	@echo "Asterisk Management UI - Docker Commands"
	@echo ""
	@echo "Development:"
	@echo "  make dev        - Start development environment (hot reload)"
	@echo "  make dev-logs   - Follow development logs"
	@echo "  make dev-stop   - Stop development environment"
	@echo ""
	@echo "Production:"
	@echo "  make prod       - Build and start production environment"
	@echo "  make prod-logs  - Follow production logs"
	@echo "  make prod-stop  - Stop production environment"
	@echo ""
	@echo "Database:"
	@echo "  make db-shell   - Open PostgreSQL shell"
	@echo "  make db-reset   - Reset database (WARNING: deletes all data)"
	@echo ""
	@echo "Asterisk:"
	@echo "  make ast-cli    - Open Asterisk CLI"
	@echo "  make ast-logs   - Follow Asterisk logs"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean      - Remove all containers, volumes, and images"
	@echo "  make migrate    - Run legacy data migration"

# Development
dev:
	@echo "Starting development environment..."
	@cp -n .env.example .env 2>/dev/null || true
	docker-compose -f docker-compose.dev.yml up -d
	@echo ""
	@echo "Development environment started!"
	@echo "  UI:  http://localhost:3000"
	@echo "  API: http://localhost:3001"
	@echo "  ARI: http://localhost:8088"
	@echo ""
	@echo "Default login: admin / changeme"

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

dev-stop:
	docker-compose -f docker-compose.dev.yml down

# Production
prod:
	@echo "Building and starting production environment..."
	@cp -n .env.example .env 2>/dev/null || true
	docker-compose build
	docker-compose up -d
	@echo ""
	@echo "Production environment started!"
	@echo "  UI:  http://localhost:3000"
	@echo "  API: http://localhost:3001"

prod-logs:
	docker-compose logs -f

prod-stop:
	docker-compose down

# Database
db-shell:
	docker exec -it asterisk-db-dev psql -U asterisk -d asterisk_mgmt

db-reset:
	@echo "WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	docker-compose -f docker-compose.dev.yml down -v
	docker-compose -f docker-compose.dev.yml up -d postgres
	@echo "Database reset complete"

# Asterisk
ast-cli:
	docker exec -it asterisk-pbx-dev asterisk -rvvv

ast-logs:
	docker exec -it asterisk-pbx-dev tail -f /var/log/asterisk/full

# Utilities
clean:
	@echo "Removing all containers, volumes, and images..."
	docker-compose -f docker-compose.dev.yml down -v --rmi all 2>/dev/null || true
	docker-compose down -v --rmi all 2>/dev/null || true
	@echo "Clean complete"

migrate:
	@echo "Running legacy data migration..."
	cd migration && npm install && npm run migrate
