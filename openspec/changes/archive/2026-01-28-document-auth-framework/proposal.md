## Why

Authentication exists in this repo (notably optional Google sign-in in `frontend-v2/`), but the current behavior and boundaries (what it does vs. does not protect) aren’t documented in one clear place. This makes deployments and future changes riskier because it’s easy to assume the backend is authenticated when it currently isn’t.

## What Changes

- Add a single, authoritative doc describing **current** authentication behavior across `frontend-v2/` and `backend/`.
- Document how Firebase Auth is configured (env vars), what UI behavior changes when it’s enabled/disabled, and where the code lives.
- Document the backend auth status explicitly (today: no user auth / no token verification on `/extract`).
- Link the new doc from the relevant existing docs (e.g., `frontend-v2/README.md` and/or repo `README.md`).

## Capabilities

### New Capabilities
- `auth-implementation-docs`: Provide accurate documentation of the project’s current authentication implementation (frontend sign-in, configuration, and backend boundaries) so operators and contributors share the same mental model.

### Modified Capabilities
<!-- None (this change is documentation-only; it does not change runtime behavior or requirements). -->

## Impact

- `docs/` (new doc): Add an authentication overview that covers current state, configuration, and “what auth does not do”.
- `frontend-v2/README.md`: Add a pointer to the authoritative auth doc (keep README concise).
- No runtime changes expected in `frontend-v2/` or `backend/`.
