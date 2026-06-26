# pepe-manga.read — common dev workflows.
# `make help` lists everything.

SHELL := /bin/bash

COMPOSE       ?= docker compose
BACKEND_SVC   := backend
FRONTEND_SVC  := frontend
DB_SVC        := mysql

DB_USER       := pepe-manga
DB_PASS       := pepe-mangapass
DB_NAME       := pepe-manga

ANDROID_DIR   := android_native

# Release-signing keystore generation (override any KEY_* on the command line).
KEYSTORE      ?= $(ANDROID_DIR)/release.jks
KEY_ALIAS     ?= pepe-manga
KEY_STOREPASS ?= changeit
KEY_KEYPASS   ?= $(KEY_STOREPASS)
KEY_DNAME     ?= CN=pepe-manga, OU=dev, O=pepe-manga, C=MX

# ── meta ─────────────────────────────────────────────────────────────────
.PHONY: help
help: ## show this help
	@awk 'BEGIN { FS = ":.*##"; printf "Targets:\n" } \
	  /^[a-zA-Z0-9_-]+:.*?##/ { printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

# ── lifecycle ────────────────────────────────────────────────────────────
.PHONY: build up upd down restart stop start ps
build:   ## (re)build all images
	$(COMPOSE) build

up:      ## up + build, attached
	$(COMPOSE) up --build

upd:     ## up + build, detached
	$(COMPOSE) up -d --build

down:    ## stop and remove containers + network
	$(COMPOSE) down

stop:    ## stop containers (keep them)
	$(COMPOSE) stop

start:   ## start previously-stopped containers
	$(COMPOSE) start

restart: ## restart all services
	$(COMPOSE) restart

ps:      ## list services
	$(COMPOSE) ps

# ── logs ─────────────────────────────────────────────────────────────────
.PHONY: logs logs-backend logs-frontend logs-db
logs:          ## tail logs for all services
	$(COMPOSE) logs -f --tail=200

logs-backend:  ## tail backend logs
	$(COMPOSE) logs -f --tail=200 $(BACKEND_SVC)

logs-frontend: ## tail frontend logs
	$(COMPOSE) logs -f --tail=200 $(FRONTEND_SVC)

logs-db:       ## tail mysql logs
	$(COMPOSE) logs -f --tail=200 $(DB_SVC)

# ── shells ───────────────────────────────────────────────────────────────
.PHONY: sh-backend sh-frontend sh-db mysql
sh-backend:    ## bash inside backend
	$(COMPOSE) exec $(BACKEND_SVC) /bin/bash

sh-frontend:   ## sh inside frontend (alpine)
	$(COMPOSE) exec $(FRONTEND_SVC) /bin/sh

sh-db:         ## bash inside mysql
	$(COMPOSE) exec $(DB_SVC) /bin/bash

mysql:         ## mysql client connected to the pepe-manga database
	$(COMPOSE) exec $(DB_SVC) mysql -u$(DB_USER) -p$(DB_PASS) $(DB_NAME)

# ── data ─────────────────────────────────────────────────────────────────
.PHONY: rescan reseed db-reset clean clean-all
rescan:        ## trigger backend to re-walk every watched folder
	curl -fsS -X POST http://localhost:8202/api/import/rescan && echo

reseed:        ## drop all series/progress + re-seed sample data (DESTRUCTIVE)
	@echo ">>> truncating series/chapters/progress/bookmarks/sources…"
	$(COMPOSE) exec -T $(DB_SVC) mysql -u$(DB_USER) -p$(DB_PASS) $(DB_NAME) -e "\
	  SET FOREIGN_KEY_CHECKS=0; \
	  TRUNCATE TABLE bookmarks; \
	  TRUNCATE TABLE progress; \
	  TRUNCATE TABLE chapters; \
	  TRUNCATE TABLE series; \
	  TRUNCATE TABLE sources; \
	  SET FOREIGN_KEY_CHECKS=1;"
	$(COMPOSE) restart $(BACKEND_SVC)

db-reset:      ## wipe the mysql volume (DESTRUCTIVE — full data loss)
	$(COMPOSE) down
	docker volume rm pepe-manga-viewer_pepe-manga-mysql-data 2>/dev/null || \
	  docker volume rm $$(basename $$PWD)_pepe-manga-mysql-data 2>/dev/null || true
	$(COMPOSE) up -d --build

clean:         ## stop services + remove containers
	$(COMPOSE) down --remove-orphans

clean-all:     ## clean + remove volumes (DESTRUCTIVE)
	$(COMPOSE) down -v --remove-orphans

# ── health ──────────────────────────────────────────────────────────────
.PHONY: health api-docs open
health:        ## hit backend /health
	curl -fsS http://localhost:8202/health && echo

api-docs:      ## open backend swagger docs in default browser
	xdg-open http://localhost:8202/docs 2>/dev/null || open http://localhost:8202/docs 2>/dev/null || \
	  echo "open http://localhost:8202/docs"

open:          ## open the frontend in default browser
	xdg-open http://localhost:8201 2>/dev/null || open http://localhost:8201 2>/dev/null || \
	  echo "open http://localhost:8201"

# ── local (no-docker) helpers ────────────────────────────────────────────
.PHONY: fe-install fe-dev fe-build be-install be-dev
fe-install:    ## install frontend deps locally (host node)
	cd frontend && npm install

fe-dev:        ## run frontend dev server on host
	cd frontend && npm run dev -- --host

fe-build:      ## production vite build on host
	cd frontend && npm run build

be-install:    ## install backend deps in a local venv
	cd backend && python3 -m venv .venv && \
	  . .venv/bin/activate && pip install -r requirements.txt

be-dev:        ## run backend on host (uses .venv); requires a reachable mysql
	cd backend && . .venv/bin/activate && \
	  DATABASE_URL=mysql+pymysql://$(DB_USER):$(DB_PASS)@localhost:8203/$(DB_NAME) \
	  MANGA_ROOT=$$PWD/sample_manga \
	  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# ── android ──────────────────────────────────────────────────────────────
.PHONY: android-apk android-aab android-apk-debug android-keystore
android-keystore:  ## generate a release keystore + keystore.properties (override KEY_* vars)
	@test ! -f $(KEYSTORE) || { echo ">>> $(KEYSTORE) already exists — refusing to overwrite"; exit 1; }
	keytool -genkeypair -v -keystore $(KEYSTORE) -alias $(KEY_ALIAS) \
	  -keyalg RSA -keysize 2048 -validity 10000 \
	  -storepass $(KEY_STOREPASS) -keypass $(KEY_KEYPASS) -dname "$(KEY_DNAME)"
	@printf 'storeFile=%s\nstorePassword=%s\nkeyAlias=%s\nkeyPassword=%s\n' \
	  "$(notdir $(KEYSTORE))" "$(KEY_STOREPASS)" "$(KEY_ALIAS)" "$(KEY_KEYPASS)" \
	  > $(ANDROID_DIR)/keystore.properties
	@echo ">>> wrote $(ANDROID_DIR)/keystore.properties (git-ignored) — release builds will now be signed"

android-apk:       ## build a release APK of android_native (signed if a keystore is configured)
	cd $(ANDROID_DIR) && ./gradlew assembleRelease
	@echo ">>> APK(s) in $(ANDROID_DIR)/app/build/outputs/apk/release/:"
	@ls -1 $(ANDROID_DIR)/app/build/outputs/apk/release/*.apk

android-aab:       ## build a release App Bundle (.aab) of android_native (signed if a keystore is configured)
	cd $(ANDROID_DIR) && ./gradlew bundleRelease
	@echo ">>> AAB(s) in $(ANDROID_DIR)/app/build/outputs/bundle/release/:"
	@ls -1 $(ANDROID_DIR)/app/build/outputs/bundle/release/*.aab

android-apk-debug: ## build a debug APK of android_native
	cd $(ANDROID_DIR) && ./gradlew assembleDebug
	@echo ">>> APK(s) in $(ANDROID_DIR)/app/build/outputs/apk/debug/:"
	@ls -1 $(ANDROID_DIR)/app/build/outputs/apk/debug/*.apk

# ── verify ───────────────────────────────────────────────────────────────
.PHONY: verify py-check
verify: py-check fe-build ## compile-check backend + vite build the frontend

py-check:      ## byte-compile every backend .py
	@find backend/app -name '*.py' -exec python3 -m py_compile {} + && echo "OK backend"

.DEFAULT_GOAL := help
