# Frontend v2 UI Spec — Book Digitization (No Login)

Date: 24 Dec 2025

This spec describes a **new frontend** for digitizing a book from photographs (PDF/DOC/images), running OCR, proofreading, and saving/exporting text. It is designed to work with the existing OCR endpoint (`POST /extract`) described in [APP_DESIGN.md](APP_DESIGN.md) and remain modular so persistence can evolve later.

## Product Goals (v1)
- Import a book as **a set of pages** (images; optionally PDF/DOC as containers).
- Run OCR per page using the existing backend endpoint: `POST /extract?lang=...`.
- Provide a **fast proofreading workflow** with a **transliteration tool always available**.
- Save corrected text (initially to a simple DB / file DB via backend; can later move to MySQL/Postgres/etc).

## Non-Goals (v1)
- No login / multi-user permissions.
- No complex book structure (chapters/TOC) beyond simple “page order” and an optional title.
- No advanced layout editing (tables, complex columns) beyond basic text correction.

---

## Information Architecture (Screens)

### 1) Projects
- Purpose: list and resume books.
- UI:
  - “New Project” primary CTA
  - Project list with: title, last updated, pages total, OCR progress
  - “Open” action

### 2) New Project (Wizard)
Stepper: **Import → Organize → OCR Setup**
- **Import**
  - Drag/drop + file picker
  - Accept: images, PDF, DOC/DOCX (even if backend support lands later)
  - Show selected files list, basic validation errors
- **Organize**
  - Thumbnails view of extracted pages
  - Reorder pages (drag), delete pages
  - Rotate page left/right (metadata-only if needed)
- **OCR Setup**
  - Language selection (tel/kan/hin/eng) aligned with backend allowed list
  - “Create Project” CTA

### 3) Project Workspace (Main)
A single workspace with a top stepper:
**Organize → OCR → Proofread → Export**

---

## Project Workspace Layout (Core)

Use a stable 3-pane layout so users build muscle memory.

### Left: Page Strip
- Vertical thumbnails with:
  - Page number
  - Status badges: not processed / processing / done / error / low-confidence
  - Quick actions: rotate, delete
- Multi-select for batch actions (rotate, delete, re-run OCR)

### Center: Page Viewer
- Large preview of selected page
- Controls: zoom in/out, fit width, rotate
- Optional overlay: OCR regions (future)

### Right: Proofreading + Transliteration Dock
This dock is the key differentiator.

It contains two stacked tabs/panels:
1) **Corrected Text (Editor)**
   - Main editable text area for the current page
   - Shows per-page character count
   - Shows “Unsaved changes” state
2) **Transliteration (Always available)**
   - **Mode A (Default): Roman → Telugu input**
     - A small input line where user types Roman text (ITRANS/HK/etc)
     - The transliterated Telugu output appears live
     - Buttons: “Insert at cursor”, “Replace selection”, “Copy”
   - **Mode B: Live preview of editor**
     - Shows the editor content transliterated into another scheme (useful for proofreading)

Rationale: users typically correct OCR by re-typing small fragments; transliteration must be one action away.

### Top Bar
- Project title (editable)
- Global status: save state, OCR queue progress
- Primary CTA changes per step:
  - OCR step: “Run OCR” / “Re-run OCR (selected)”
  - Proofread step: “Save page” / “Save all”
  - Export step: “Generate export”

### Bottom/Side: Job Progress
- Compact queue list: page N of M, current status
- Clear actions: cancel / retry failed

---

## Primary User Flows

### Flow A: Import → OCR → Proofread
1. Create project, import files
2. Organize page order and rotate obvious issues
3. Run OCR (all pages)
4. Proofread page-by-page with:
   - image preview
   - text editor
   - transliteration insertion for corrections

### Flow B: Fix a “bad OCR” page quickly
- Click page with error badge → view image
- Edit text; use transliteration insert for words
- Save page; optionally “Re-run OCR” if OCR was totally wrong

### Flow C: Export + Persist
- Export generates a “final text” built from corrected text (fallback to OCR output if not corrected)
- Persisted export is saved as an artifact (DB/file store) and downloadable

---

## Proofreading UX Details (High Impact)

### Keyboard-first actions
- `j/k` or arrow keys: previous/next page
- `Cmd+Enter`: save current page
- `Cmd+Shift+T`: toggle transliteration mode (A/B)

### Transliteration behavior
- Choose scheme dropdown: ITRANS / Harvard-Kyoto / IAST (exact set depends on library; current frontend already uses `sanscript`)
- “Insert at cursor” must preserve cursor position and not steal focus from the editor
- Keep a small “recent inserts” list (3–5 items) inside the dock (optional; skip if MVP)

### Error and quota handling
- If OCR returns `429` (quota exceeded), show a non-blocking banner and:
  - pause the OCR queue
  - allow user to continue proofreading already-processed pages
- If OCR returns `500`, mark page as error with retry action

---

## Data Model (Frontend)

The UI should treat everything as a **Project (book)** containing ordered **Pages**.

- Project
  - id
  - title
  - createdAt / updatedAt
  - ocrLang (default)
  - sourceFiles[] (original uploads metadata)
- Page
  - id
  - projectId
  - pageNumber (order)
  - imageRef (URL/blob reference)
  - ocrText
  - correctedText
  - status: not_started | processing | done | error

Important: keep the persistence layer behind a thin adapter so you can switch between:
- Local-first storage (IndexedDB) for immediate UX
- Backend storage (file DB / MySQL later)

---

## Backend Contract (Minimal)

### Existing (already implemented)
- `POST /extract?lang=tel|kan|hin|eng` with multipart `image`
  - returns `{ status: "success", text: "..." }`

### New (optional, to support DB persistence)
These can be added later without changing the UI shape:
- `POST /projects` / `GET /projects` / `GET /projects/:id`
- `POST /projects/:id/pages` (upload/store page images)
- `PATCH /projects/:id/pages/:pageId` (save correctedText)
- `POST /projects/:id/exports` (create export artifact)

---

## MVP Component Inventory (React)
- ProjectList
- NewProjectWizard
- WorkspaceLayout
- PageStrip
- PageViewer
- ProofreadEditor
- TransliterationDock
- JobQueuePanel
- ExportPanel

---

## Open Decisions (to settle before build)
1) Import support: do we split PDF/DOC into pages on the backend, or require user to upload images for v1?
2) Persistence v1: do we store page images + text in backend immediately, or do local-only drafts and only save exports?
3) Export formats: plain text first, or also searchable PDF?
