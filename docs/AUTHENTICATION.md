# Authentication (Current State)

This document describes **how authentication is currently implemented** in this repo, and (equally importantly) what it **does not** do.

## Components at a glance

- `frontend-v2/` (Book OCR UI): Optional **Firebase Auth (Google sign-in)** for the UI.
- `backend/` (OCR API): **No end-user authentication** on `POST /extract`.
- `frontend/` (original UI): No auth.

## Architecture (today)

```
User ──(optional Google sign-in via Firebase Auth)──> frontend-v2
  │
  └────────────────────(unauthenticated HTTP POST /extract)──────────────────────> backend
```

## `frontend-v2/`: Firebase Auth (optional)

### What it does

When Firebase Auth is configured for the build, the Book OCR UI allows a user to sign in/out with Google.

- Sign-in/out and auth state tracking live in [frontend-v2/src/lib/firebaseAuth.js](../frontend-v2/src/lib/firebaseAuth.js).
- The UI conditionally enables/disables sign-in based on config and listens for auth state changes in [frontend-v2/src/App.jsx](../frontend-v2/src/App.jsx).

### Configuration

Firebase Auth is considered “configured” when these Vite env vars are present:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Optional:

- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`

Notes:
- Local dev requires `localhost` to be an authorized domain in Firebase Auth.
- See the existing setup guidance in [frontend-v2/README.md](../frontend-v2/README.md).

### UI behavior

- If Firebase Auth is **not** configured, the “Sign in” button is disabled and shows a tooltip.
- If Firebase Auth **is** configured:
  - “Sign in” uses a Google provider (popup with redirect fallback).
  - The signed-in user is shown in the top bar and can sign out.

## `backend/`: OCR API is not authenticated

### What it does

The backend exposes `POST /extract` and performs OCR.

- Route implementation: [backend/src/ocr_service/app.py](../backend/src/ocr_service/app.py)

### What it does NOT do

- The backend does **not** validate Firebase ID tokens.
- Requests to `POST /extract` do **not** require a logged-in user.
- The frontend does **not** send `Authorization: Bearer ...` headers for OCR requests.
  - OCR fetch implementation: [frontend-v2/src/lib/ocrApi.js](../frontend-v2/src/lib/ocrApi.js)

### Security / access control note

If you need the backend to require authentication, that is a **separate** change (e.g., verify Firebase ID tokens server-side, or use Cloud Run IAM/identity-aware access). This document only describes the current implementation.
