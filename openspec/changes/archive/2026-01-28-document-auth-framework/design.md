## Context

This repo includes two frontends (`frontend/` and `frontend-v2/`) and a Flask backend (`backend/`) exposing `POST /extract`.

Authentication is currently present only as an *optional* UI sign-in experience in `frontend-v2/` via Firebase Auth (Google provider). The backend does not validate end-user identity tokens for `/extract`.

The problem this change addresses is documentation clarity: without an explicit write-up, it’s easy to incorrectly assume the backend is authenticated or that Firebase sign-in gates API access.

## Goals / Non-Goals

**Goals:**
- Create one authoritative, easy-to-link document describing the current authentication implementation and its boundaries.
- Make it clear which components are authenticated (and how) vs. unauthenticated.
- Document configuration knobs (env vars) and what behavior changes when auth is enabled/disabled in the UI.
- Keep existing READMEs concise by linking to the authoritative doc.

**Non-Goals:**
- Implement new authentication/authorization in the backend.
- Add token plumbing (e.g., `Authorization: Bearer <idToken>`) from the frontend to the backend.
- Change deployment/IAM posture (e.g., Cloud Run IAM requirements).
- Change any OCR API behavior, quotas, or language allow-lists.

## Decisions

### Decision 1: Documentation lives in `docs/` as a single source of truth

Create `docs/AUTHENTICATION.md` as the canonical description of current auth behavior.

**Alternatives considered:**
- Put everything in `frontend-v2/README.md`: rejected because it mixes operator-level auth boundaries with local dev instructions.
- Put everything in repo root `README.md`: rejected because root README is higher level; auth details are implementation-specific.

### Decision 2: Document “what auth does NOT do” explicitly

Include a short “Non-features / boundaries” section describing that the backend does not verify Firebase ID tokens and that `/extract` is not gated by sign-in.

**Alternatives considered:**
- Imply boundaries indirectly: rejected; ambiguity is the root problem.

### Decision 3: Keep this change documentation-only

No runtime changes, no new dependencies, no API contract changes.

**Alternatives considered:**
- Add backend token verification as part of this change: rejected as out of scope for a documentation pass.

## Risks / Trade-offs

- **[Doc drift]** The code may evolve and the doc becomes stale → Mitigation: link to the concrete source files and env vars; keep sections short; prefer statements that are easy to validate.
- **[False sense of security]** Readers may assume “sign-in” implies “authorization” → Mitigation: include an explicit boundary section and a short architecture diagram.

