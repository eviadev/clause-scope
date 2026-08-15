# ClauseScope
# Usage: make <command>

.PHONY: help install start stop test test-backend test-frontend evaluate backend-install frontend-install

help: ## Afficher l'aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

install: backend-install frontend-install ## Installer toutes les dépendances

backend-install: ## Installer les dépendances backend
	cd backend && python3 -m venv venv && . venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt

frontend-install: ## Installer les dépendances frontend
	cd frontend && npm ci

start: ## Démarrer avec Docker Compose
	docker compose up --build

stop: ## Arrêter les services Docker
	docker compose down

test: test-backend test-frontend ## Lancer toute la validation locale

test-backend: ## Lancer les tests backend
	cd backend && . venv/bin/activate && python -m pytest tests -q

test-frontend: ## Vérifier types, tests et build frontend
	cd frontend && npx tsc --noEmit && npm test -- --run && npm run build

evaluate: ## Exécuter le benchmark synthétique et son quality gate
	cd backend && . venv/bin/activate && python evaluation.py
