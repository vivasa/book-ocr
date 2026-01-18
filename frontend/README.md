# frontend (original UI)

This is the original simple React (Vite) UI:
- upload a single image
- call the backend `POST /extract`
- show extracted text

For the “Book OCR” workflow UI (PDF/images import → per-page OCR → proofread → export), use `frontend-v2/` instead.

## Running locally

Start the backend:

```bash
cd backend
export PORT=8080
export DISABLE_QUOTA=1
./venv/bin/python app.py
```

Start this frontend:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/extract` to `http://localhost:8080` (see `frontend/vite.config.js`).

## Deployment

Canonical deployment docs:
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

Archived alternatives:
- [docs/ARCHIVED_DEPLOYMENT_OPTIONS.md](docs/ARCHIVED_DEPLOYMENT_OPTIONS.md)
