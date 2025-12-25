# Copilot instructions — book-ocr

## Big picture (monorepo)
- `backend/` is the **OCR service**: Flask + Tesseract with an optional Firestore-backed daily quota.
- `frontend/` is the original simple Vite React UI (single-image upload → `/extract`).
- `frontend-v2/` is a separate “Book OCR (no login)” UI: PDF/images import → per-page OCR → proofread → export, **local-only** persistence.

## Backend: API contract and invariants
- Primary endpoint: `POST /extract?lang=tel|kan|hin|eng` with `multipart/form-data` field `image`.
  - Success: `{ "status": "success", "text": "..." }`
  - Errors: `{ "error": "..." }` with status `400`, `429` (quota), or `500`.
- Language allow-list is intentionally tight (see `ALLOWED_OCR_LANGUAGES` in `backend/src/ocr_service/app.py`). Keep it tight unless there’s a reason.
- Quota behavior:
  - Enabled by default, backed by Firestore; disable locally via `DISABLE_QUOTA=1`.
  - If Firestore fails, the service fails “safe” with `500`.
- SPA serving behavior (only when built assets are present): controlled by `FRONTEND_DIST` and `backend/src/ocr_service/app.py`.

## Frontends: how they call the API
- `frontend/` (simple UI) uses Vite dev proxy (`frontend/vite.config.js`) to send `/extract` to `http://localhost:8080`.
- `frontend-v2/` (book workflow):
  - In dev, proxies `/extract` to Cloud Run by default; override with `VITE_PROXY_TARGET=http://127.0.0.1:8080` (`frontend-v2/vite.config.js`).
  - In production builds without a proxy, API calls use `VITE_API_BASE` (`frontend-v2/src/lib/ocrApi.js`).

## frontend-v2: state & persistence conventions
- Persisted data is **browser-local**:
  - IndexedDB schema via `idb` in `frontend-v2/src/storage/db.js` (`projects`, `pages`).
  - LocalStorage is for UI-only state (see keys in `frontend-v2/src/App.jsx`, e.g. `book-ocr:v2:rightPaneWidth`, `book-ocr:v2:editorFontSize`).
- OCR run updates per-page status: `new → processing → done|error` and pauses on HTTP `429`.

## Developer workflows (use these commands)
- Backend run:
  - `cd backend && export PORT=8080 && export DISABLE_QUOTA=1 && ./venv/bin/python app.py`
- Backend tests:
  - `cd backend && ./venv/bin/python -m pytest -q`
  - Tests rely on `create_app(...)` dependency injection to avoid Firestore/Tesseract (`backend/tests/` + `backend/src/ocr_service/app.py`).
- Backend lint:
  - Ruff is configured in `backend/pyproject.toml` (run `ruff` from the backend env).
- frontend-v2 run:
  - `cd frontend-v2 && npm install && npm run dev`
- Smoke test against a URL:
  - `backend/scripts/smoke_client.py` (configure `OCR_URL`, `OCR_LANG`, `OCR_IMAGE`).

## Docker/Cloud Run
- Repo-root `Dockerfile` builds **only** `frontend/` then bakes it into the backend image (sets `FRONTEND_DIST=/app/frontend/dist`).
  - If you intend to serve `frontend-v2` from the backend image, you’ll need a deliberate change (don’t assume it’s already wired).

## What NOT to assume
- `APP_DESIGN.md` contains a broader app plan (e.g., MySQL endpoints) that is **not implemented**; don’t add routes unless requested.
- Keep `/extract` response shape stable; frontends and tests assume it.
