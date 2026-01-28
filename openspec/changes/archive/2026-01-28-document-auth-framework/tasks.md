## 1. Add authoritative authentication documentation

- [x] 1.1 Create `docs/AUTHENTICATION.md` describing current auth across `frontend-v2/` and `backend/`
- [x] 1.2 Include an explicit boundary section: what is and is not authenticated today
- [x] 1.3 Link to the concrete code locations (`frontend-v2/src/lib/firebaseAuth.js`, `frontend-v2/src/lib/ocrApi.js`, `backend/src/ocr_service/app.py`)

## 2. Wire docs into existing entry points

- [x] 2.1 Add a short link from `frontend-v2/README.md` to `docs/AUTHENTICATION.md`
- [x] 2.2 Add a short link from repo root `README.md` to `docs/AUTHENTICATION.md`

## 3. Verify

- [x] 3.1 Sanity-check links and statements against current code (no token plumbing, backend `/extract` unauthenticated)
