# Deployment (Recommended): Firebase Hosting (frontend-v2) + Cloud Run (backend)

This repo supports multiple deployment styles. The **recommended, long-lasting** approach is:

- **Frontend**: `frontend-v2/` deployed to **Firebase Hosting**
- **Backend**: `backend/` deployed to **Cloud Run**

This keeps UI and API deploys independent.

For deeper rationale and alternatives, see:
- [docs/DEPLOYMENT_APPROACH_1_STATIC_FRONTEND_CLOUDRUN_BACKEND.md](docs/DEPLOYMENT_APPROACH_1_STATIC_FRONTEND_CLOUDRUN_BACKEND.md)

---

## Prereqs

- Google Cloud SDK (`gcloud`) authenticated
- Firebase CLI (`firebase`) authenticated
- Two projects (recommended): `book-ocr-staging` and `book-ocr-prod`

---

## Backend (Cloud Run)

### 1) Configure staging/prod env vars

This repo uses env-var files so you don’t have to fight shell escaping.

Example `env.staging.yaml` (repo root):

```yaml
CORS_ALLOW_ORIGINS: "https://<YOUR_STAGING_SITE>.web.app,https://<YOUR_STAGING_SITE>.firebaseapp.com"
DISABLE_QUOTA: "1"
```

Example `env.prod.yaml` (you will create):

```yaml
CORS_ALLOW_ORIGINS: "https://<YOUR_PROD_SITE>.web.app,https://<YOUR_PROD_SITE>.firebaseapp.com"
DISABLE_QUOTA: "0"
DAILY_LIMIT: "<N>"
FIRESTORE_DATABASE: "ocr-budget-limit"
```

### 2) Deploy

From repo root:

```bash
gcloud config set project book-ocr-staging

gcloud run deploy ocr-api \
  --source backend \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --env-vars-file env.staging.yaml
```

Repeat for prod by setting the project and using `env.prod.yaml`.

### 3) Verify (Cloud Run)

Note: `/healthz` may be intercepted on Cloud Run and return a Google 404 page.
Use **`/health`** instead.

```bash
curl -i https://<YOUR_CLOUD_RUN_URL>/health

curl -i -X OPTIONS "https://<YOUR_CLOUD_RUN_URL>/extract?lang=tel" \
  -H "Origin: https://<YOUR_FRONTEND_HOST>" \
  -H "Access-Control-Request-Method: POST"
```

---

## Frontend (Firebase Hosting)

### 1) Build with the backend URL

`VITE_API_BASE` is compiled into the build output.

```bash
cd frontend-v2

VITE_API_BASE=https://<YOUR_CLOUD_RUN_URL> npm ci
VITE_API_BASE=https://<YOUR_CLOUD_RUN_URL> npm run build
```

### 2) Deploy

```bash
cd frontend-v2

firebase use staging
firebase deploy --only hosting:app
```

Repeat for prod with `firebase use prod`.

---

## End-to-end smoke test

- Load the hosted site.
- Import one image.
- Run OCR for the selected page.

If the UI fails with CORS errors:
- Confirm `CORS_ALLOW_ORIGINS` includes the exact Hosting origin(s).
- Re-deploy the backend with the updated env vars.
