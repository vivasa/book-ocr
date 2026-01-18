# Archived deployment options (kept for reference)

The repo currently recommends **Firebase Hosting (frontend-v2) + Cloud Run (backend)**.
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

The options below are **not** the preferred path anymore, but are kept because they can still be useful in some situations.

---

## Option A: Single Cloud Run service (UI + API together)

This uses the repo-root Dockerfile(s) to bake a frontend build into the backend container.

- Default repo-root `Dockerfile`: builds `frontend/` and serves it via Flask.
- Repo-root `Dockerfile.frontend-v2`: builds `frontend-v2/` and serves it via Flask.

Why it’s archived:
- Couples frontend and backend deploys.
- Makes rollbacks and independent releases harder.

If you still want this approach, see the repo-root Dockerfiles:
- [Dockerfile](Dockerfile)
- [Dockerfile.frontend-v2](Dockerfile.frontend-v2)

---

## Option B: Vercel hosting with rewrites

This repo includes [frontend-v2/vercel.json](frontend-v2/vercel.json) as an example of rewriting `/extract` (and `/health`) to a Cloud Run backend.

Why it’s archived:
- Adds an extra proxy hop.
- Request size/timeouts and operational behavior are different from the Firebase Hosting + CORS approach.

If you use it, treat it as an alternative deployment style and keep the backend CORS model in mind if you ever switch to direct calls.
