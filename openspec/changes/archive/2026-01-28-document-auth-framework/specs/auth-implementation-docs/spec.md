## ADDED Requirements

### Requirement: Authentication documentation exists and is authoritative

The project SHALL provide a single, authoritative document describing the current authentication implementation and boundaries across `frontend-v2/` and `backend/`.

#### Scenario: Reader wants the current auth model
- **WHEN** a contributor or operator reads the authentication documentation
- **THEN** they can identify which components implement authentication today
- **AND** they can identify which components do not validate end-user identity

### Requirement: Frontend-v2 optional Firebase Auth behavior is documented

The documentation SHALL describe how optional Firebase Auth (Google sign-in) is configured and how the UI behaves when it is configured vs. not configured.

#### Scenario: Firebase env vars are missing
- **WHEN** Firebase Auth environment variables are not provided in the `frontend-v2/` build
- **THEN** the UI indicates sign-in is unavailable
- **AND** the documentation lists the required configuration keys

#### Scenario: Firebase env vars are present
- **WHEN** Firebase Auth environment variables are provided in the `frontend-v2/` build
- **THEN** the UI allows the user to sign in/out with Google
- **AND** the documentation explains where the sign-in code lives

### Requirement: Backend authentication boundaries are documented

The documentation SHALL state whether the backend validates any end-user identity for `POST /extract`.

#### Scenario: User assumes sign-in gates OCR
- **WHEN** a reader checks the backend authentication section
- **THEN** the documentation states whether `/extract` requires authentication
- **AND** it clarifies that UI sign-in does not automatically imply backend authorization
