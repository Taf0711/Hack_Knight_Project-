.PHONY: help setup start stop restart logs clean reset test

help:
	@echo "Greenwash Detector - Available Commands:"
	@echo ""
	@echo "  make setup    - Initial setup (copy .env, check dependencies)"
	@echo "  make start    - Start all services with Docker Compose"
	@echo "  make stop     - Stop all services"
	@echo "  make restart  - Restart all services"
	@echo "  make logs     - View logs from all services"
	@echo "  make reset    - Clear all data (keep services running)"
	@echo "  make clean    - Remove containers and volumes"
	@echo "  make test     - Run tests"
	@echo ""

setup:
	@echo "Setting up Greenwash Detector..."
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "✅ Created .env file - please add your GEMINI_API_KEY"; \
	else \
		echo "✅ .env file already exists"; \
	fi
	@mkdir -p uploads
	@echo "✅ Created uploads directory"
	@echo ""
	@echo "⚠️  IMPORTANT: Add your GEMINI_API_KEY to .env before starting!"
	@echo ""

start:
	@echo "Starting Greenwash Detector..."
	docker-compose up --build -d
	@echo ""
	@echo "✅ Services started!"
	@echo ""
	@echo "🌐 Frontend:  http://localhost:3000"
	@echo "🔧 API:       http://localhost:8000"
	@echo "📚 API Docs:  http://localhost:8000/docs"
	@echo ""
	@echo "Run 'make logs' to view logs"

stop:
	@echo "Stopping services..."
	docker-compose down
	@echo "✅ Services stopped"

restart:
	@echo "Restarting services..."
	docker-compose restart
	@echo "✅ Services restarted"

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f python-api

logs-frontend:
	docker-compose logs -f nextjs

logs-db:
	docker-compose logs -f postgres

reset:
	@echo "⚠️  This will delete ALL documents, claims, and uploaded files. Continue? [y/N] " && read ans && [ $${ans:-N} = y ]
	@echo "Resetting database..."
	docker-compose exec -T postgres psql -U greenwash_user -d greenwash_db -c "TRUNCATE TABLE score, evidence, claim, passage, document, company RESTART IDENTITY CASCADE;"
	@echo "Clearing uploads directory..."
	rm -rf uploads/*
	@echo "✅ Database and uploads cleared! Services still running."
	@echo "   Refresh your browser to see clean state."

clean:
	@echo "⚠️  This will remove all containers and data. Continue? [y/N] " && read ans && [ $${ans:-N} = y ]
	docker-compose down -v
	rm -rf uploads/*
	@echo "✅ Cleaned up"

test:
	@echo "Running tests..."
	@echo "Backend tests:"
	cd backend && python -m pytest || true
	@echo ""
	@echo "Frontend tests:"
	cd frontend && npm test || true

dev-backend:
	cd backend && uvicorn main:app --reload

dev-frontend:
	cd frontend && npm run dev

install-backend:
	cd backend && pip install -r requirements.txt

install-frontend:
	cd frontend && npm install

