# OCR App (Backend + React UI)

This repo is now a small monorepo:

- `backend/`: Flask + Tesseract OCR API (Cloud Run-friendly)
- `frontend/`: original React (Vite) UI (single image → `/extract`)
- `frontend-v2/`: “Book OCR (no login)” workflow UI (PDF/images → per-page OCR → proofread → export)

For production deployment, the recommended approach is **decoupled**:
- `frontend-v2/` on Firebase Hosting
- `backend/` on Cloud Run

See:
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Local Development

### 1) Backend (API)

```bash
cd backend
export PORT=8080
export DISABLE_QUOTA=1
./venv/bin/python app.py
```

### 2) Frontend (React dev server)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/`.

`frontend/vite.config.js` proxies `/extract` to `http://localhost:8080` during development.

## Tests (Backend)

```bash
cd backend
./venv/bin/python -m pytest -q
```

## Deployment

- Recommended: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Deep-dive / rationale: [docs/DEPLOYMENT_APPROACH_1_STATIC_FRONTEND_CLOUDRUN_BACKEND.md](docs/DEPLOYMENT_APPROACH_1_STATIC_FRONTEND_CLOUDRUN_BACKEND.md)
- Archived options (single-service Cloud Run, Vercel rewrites): [docs/ARCHIVED_DEPLOYMENT_OPTIONS.md](docs/ARCHIVED_DEPLOYMENT_OPTIONS.md)

Recommended runtime env vars:

- `DAILY_LIMIT`: daily request limit
- `OCR_LANGUAGE`: default OCR language
- `FIRESTORE_DATABASE`: Firestore DB name
- `DISABLE_QUOTA`: set to `0` in production

## API

### `POST /extract`

- Upload: `multipart/form-data` with `image`
- Optional: `lang` query param (`tel`, `kan`, `hin`, `eng`)

Response:

```json
{ "status": "success", "text": "..." }
```
