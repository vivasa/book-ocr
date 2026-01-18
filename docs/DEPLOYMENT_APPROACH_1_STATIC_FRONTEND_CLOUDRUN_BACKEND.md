# Deployment Approach 1: Static Frontend + Cloud Run Backend (Decoupled)

Goal: deploy **frontend-v2** as a static site and deploy the **OCR backend** as a separate Cloud Run service, so fixes to one do not require redeploying the other.

This document is written to be long-lasting and scalable:
- explicit environments (dev/staging/prod)
- explicit versioning and rollback
- minimal coupling between UI and API

---

## High-level architecture

- **Frontend**: static hosting (CDN-backed)
  - serves the SPA assets (`index.html`, JS/CSS bundles)
  - configured with `VITE_API_BASE` pointing to the backend base URL
- **Backend**: Cloud Run service
  - exposes `POST /extract?lang=tel|kan|hin|eng`
  - exposes `GET /health` (recommended for Cloud Run)
  - may also expose `GET /healthz` (works locally; on Cloud Run it may be intercepted by the platform)

The browser will call:
- `POST ${VITE_API_BASE}/extract?lang=...`

Because frontend and backend are on different origins in this approach, **CORS must be configured on the backend**.

---

## Recommended hosting option for the static frontend

You have two strong GCP-native choices:

### Option A (recommended): Firebase Hosting (SPA + CDN + easy rollbacks)
- Pros: very stable for SPAs, global CDN, simple deploy/rollback, optional rewrites.
- Cons: introduces Firebase tooling (still within GCP ecosystem).

### Option B: Cloud Storage static website + Cloud CDN
- Pros: very cheap, simple, purely GCS+CDN.
- Cons: SPA routing + cache invalidation require more careful configuration.

This doc includes steps for both.

---

## Environments (strongly recommended)

Create at least two environments:
- **staging**: test new builds safely
- **prod**: stable

You can implement environments as:
- separate GCP projects (most robust), or
- separate Cloud Run services + separate frontend sites within one project.

---

## Backend deployment (Cloud Run)

### 0) Choose a region
Example region: `us-central1`.

### 1) Build + deploy backend image
You can deploy backend using source builds or a container image pipeline.

For long-term stability, prefer **container image builds** (Cloud Build or GitHub Actions) and deploy by image digest.

Minimum deploy shape:
- service name: `ocr-api`
- unauthenticated: optional (depends on whether you want the public internet to access OCR)

### 2) Backend configuration (env vars)
Backend runtime env vars (examples):
- `DAILY_LIMIT` (prod)
- `FIRESTORE_DATABASE`
- `DISABLE_QUOTA=0` (prod) / `1` (local)

### 3) CORS configuration (required)
Because the static frontend is a different origin, the backend must:
- respond to browser preflight `OPTIONS` requests
- include headers such as:
  - `Access-Control-Allow-Origin: https://<your-frontend-domain>`
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type`

Implementation in this repo:
- Backend supports an origin allowlist via `CORS_ALLOW_ORIGINS` (comma-separated).
- Example:
  - `CORS_ALLOW_ORIGINS=https://<your-staging-site>.web.app,https://<your-prod-site>.web.app`

Policy guidance:
- Do NOT use `*` for `Access-Control-Allow-Origin` in production unless you truly want public use.
- Prefer an allowlist of exact origins (prod + staging).

---

## Frontend deployment (frontend-v2)

### 0) Build
Build the SPA with the backend base URL:

- Set `VITE_API_BASE` to the backend origin (no trailing slash preferred)
  - example: `https://ocr-api-<hash>-uc.a.run.app`

Then build:
- `npm ci`
- `npm run build`

### Option A: Deploy to Firebase Hosting
This repo includes Firebase Hosting config files in `frontend-v2/`:
- [frontend-v2/firebase.json](frontend-v2/firebase.json)
- [frontend-v2/.firebaserc](frontend-v2/.firebaserc)

High-level steps (staging + prod as separate Firebase projects):

1) Create two GCP/Firebase projects:
- `book-ocr-staging` (or your preferred ID)
- `book-ocr-prod` (or your preferred ID)

Important: creating a GCP project is not always the same as creating a Firebase project.

You must **add Firebase** to each project before `firebase deploy` can create/list Hosting sites.
You can do this from the Firebase Console (“Add project” / “Add Firebase”), or via CLI:

```bash
firebase projects:addfirebase book-ocr-staging
firebase projects:addfirebase book-ocr-prod
```

2) Install Firebase CLI (one-time on your machine):

```bash
npm install -g firebase-tools
firebase login
```

3) Update [frontend-v2/.firebaserc](frontend-v2/.firebaserc) with the real project IDs.

4) Build + deploy staging:

```bash
cd frontend-v2
VITE_API_BASE=https://<YOUR_CLOUD_RUN_BACKEND_BASE> npm ci
VITE_API_BASE=https://<YOUR_CLOUD_RUN_BACKEND_BASE> npm run build
firebase use staging
firebase deploy --only hosting
```

If you see Hosting site resolution errors, this repo uses an explicit Hosting target (`app`). You can deploy it explicitly:

```bash
firebase deploy --only hosting:app
```

5) Build + deploy prod (same steps, but `firebase use prod`).

Notes:
- `VITE_API_BASE` must be set at build time (it is compiled into the static bundle).
- The backend base should be the origin, not `/extract`.

Notes:
- Use distinct Firebase sites or channels for staging/prod.
- Prefer immutable asset caching for hashed bundles.

### Option B: Deploy to Cloud Storage + Cloud CDN
High-level steps:
1) Create a GCS bucket (website hosting)
2) Upload `dist/` contents
3) Put Cloud CDN in front
4) Ensure SPA routes fall back to `index.html`

Notes:
- SPA fallback is trickier on pure GCS; the most robust variant uses an HTTPS Load Balancer with URL map that serves `index.html` for unknown paths.

---

## Versioning + rollback strategy

### Backend
- Tag images (e.g. `ocr-api:<git-sha>`) and deploy by digest.
- Keep at least N previous revisions.

### Frontend
- Firebase Hosting: use channels/releases.
- GCS+CDN: versioned deploy folders + atomic switch, or keep previous object generations.

---

## CI/CD (long-lasting process)

A stable setup uses two independent pipelines:

### Pipeline 1: Backend
Trigger: merge to `main` touching `backend/**`.
- Run backend tests (`pytest`)
- Build container image
- Push to Artifact Registry
- Deploy to Cloud Run (staging)
- Smoke test `/health` + one OCR request (optional)
- Promote to prod (manual approval)

### Pipeline 2: Frontend-v2
Trigger: merge to `main` touching `frontend-v2/**`.
- Install deps
- Build `frontend-v2/dist`
- Deploy to hosting (staging)
- Smoke test: load homepage + OCR call via browser/API
- Promote to prod (manual approval)

---

## Checklist (what we will do next)

1) Pick hosting option: Firebase Hosting vs GCS+CDN
2) Decide environment split: separate projects vs same project
3) Implement backend CORS allowlist (prod + staging origins)
4) Deploy backend to Cloud Run (staging)
5) Deploy frontend-v2 static site (staging)
6) Smoke test end-to-end OCR from the hosted frontend
7) Repeat for prod
8) Add CI/CD automation
