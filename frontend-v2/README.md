# frontend-v2

A new (separate) frontend for book digitization.

- No backend changes required.
- Uses the existing OCR API: `POST /extract?lang=...`.
- Stores projects/pages locally in the browser via IndexedDB.
- Supports **PDF + images only** (v1).

## Run (local)

### Option A (recommended): use the deployed Cloud Run OCR

Just run the frontend:

```bash
cd frontend-v2
npm install
npm run dev
```

By default, `frontend-v2` proxies `/extract` to:

`https://telugu-ocr-prod-777583762558.us-central1.run.app`

### Option B: use a local backend (optional)

1) Start backend:

```bash
cd backend
export PORT=8080
export DISABLE_QUOTA=1
./venv/bin/python app.py
```

2) Start frontend-v2:

```bash
cd frontend-v2
npm install
npm run dev
```

Open `http://localhost:5173/`.

Vite dev server proxies `/extract` to `VITE_PROXY_TARGET` (defaults to Cloud Run).

Override the proxy target:

```bash
VITE_PROXY_TARGET=http://127.0.0.1:8080 npm run dev
```

If you ever host the built frontend separately (no dev proxy), set:

`VITE_API_BASE=https://telugu-ocr-prod-777583762558.us-central1.run.app`
