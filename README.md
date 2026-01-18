# OCR App (Backend + React UI)

This repo is now a small monorepo:

- `backend/`: Flask + Tesseract OCR API (Cloud Run-friendly)
- `frontend/`: React (Vite) UI that uploads an image, shows extracted text, and lets you edit it

In production, you can deploy a **single Google Cloud Run service** that serves both:

- API: `POST /extract`
- UI: React SPA static files (served by Flask)

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

## Deployment (Single Cloud Run Service)

Use the **repo-root** `Dockerfile` (it builds `frontend/dist` then bakes it into the backend image).

```bash
gcloud run deploy ocr-app \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi
```

### Deploy frontend-v2 instead of frontend

If you want the **Book OCR (no login)** UI (`frontend-v2/`) served from the same Cloud Run service as the API (`/extract`), use the repo-root Dockerfile variant:

- [Dockerfile.frontend-v2](Dockerfile.frontend-v2)

Because `gcloud run deploy --source .` uses the default `Dockerfile`, the simplest workflow is:

1) Build + push the container with Cloud Build:

```bash
gcloud builds submit --file Dockerfile.frontend-v2 \
  --tag gcr.io/$PROJECT_ID/book-ocr-frontend-v2 .
```

2) Deploy that image to Cloud Run:

```bash
gcloud run deploy book-ocr-v2 \
  --image gcr.io/$PROJECT_ID/book-ocr-frontend-v2 \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi
```

Notes:
- `/extract` behavior stays unchanged; only the baked-in SPA assets differ.
- The image sets `FRONTEND_DIST=/app/frontend-v2/dist` so Flask serves the `frontend-v2` build at `/`.

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
