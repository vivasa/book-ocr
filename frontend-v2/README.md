# frontend-v2 — Book OCR (No Login)

This is a **separate** (v2) frontend focused on fast “scan → OCR → proofread → export” for books.

**Key properties**
- No login.
- No backend changes required.
- Uses the existing OCR API: `POST /extract?lang=...`.
- Stores everything **locally in the browser** (IndexedDB + a small amount of localStorage UI state).
- Import supports **PDF + images only**.

For the original product thinking, see [FRONTEND_V2_UI_SPEC.md](../FRONTEND_V2_UI_SPEC.md). This README documents what is actually implemented in the current code.

---

## Feature Overview

### 1) Projects (local-only)
- Create unlimited projects (“books”) locally.
- Project list shows title and last updated time.
- Delete a project (removes all pages for that project from IndexedDB).

### 2) Import: PDF + images
- Import multiple files at once.
- PDF import is client-side and converts each PDF page into a PNG blob (via `pdfjs-dist`).
- Image import accepts any browser-supported image type.
- Pages are ordered by import sequence and assigned an incrementing page number.

### 3) OCR execution (no backend changes)
- Run OCR on:
	- all pages, or
	- only the selected page.
- Language dropdown uses the backend’s allowed list (`tel`, `kan`, `hin`, `eng`).
- Per-page status is tracked: `new` → `processing` → `done` or `error`.
- Quota handling:
	- if OCR returns HTTP `429`, OCR is paused and a banner is shown.
	- already-processed pages remain editable.

### 4) Proofreading Dock (CodeMirror editor)
The right pane is designed for keyboard-heavy proofreading.

**Editor**
- CodeMirror 6 editor for corrected text.
- Shows line numbers.
- Active cursor line is visually emphasized (heavier + different background).
- Font size controls (`A-` / `A+`) in the dock header.

**Persistence**
- Corrected text is written to IndexedDB with a debounce.
- The editor selection/cursor position is remembered per page (see “UI persistence”).

### 5) Transliteration Dock (always available)
The transliteration card supports two workflows:

**A) Telugu selection → Roman scheme code (automatic)**
- Select Telugu OCR text in the editor.
- The selected Telugu text is shown in the Transliteration Preview.
- The input box is auto-filled with the corresponding Roman text in the chosen scheme (ITRANS/HK/IAST).
- Changing the scheme regenerates the Roman text as long as you haven’t manually edited it.

**B) Roman typing → Telugu preview (manual)**
- Type Roman text in the input.
- Preview shows the transliterated Telugu.
- “Insert at cursor” inserts the Telugu into the editor at the current cursor position.

### 6) Page Viewer (zoom + proofreading overlay)
- Zoom in/out and reset zoom.
- Proofreading overlay:
	- A vertical ruler/handle on the right.
	- A horizontal red line across the page.
	- Drag the handle to move the red line.
	- Click anywhere on the page to move the red line to that click position.

### 7) Export
- Export `.txt`: concatenates corrected text page-by-page (falls back to OCR text if not corrected).
- Export JSON backup: saves project metadata + page text (note: **images are not embedded** in the JSON).

---

## Data & Persistence

### IndexedDB (project + pages)
Stored via the `idb` wrapper.
- Projects: title, timestamps, selected OCR language.
- Pages: page number, image blob, OCR text, corrected text, status, errors.

### localStorage (UI-only state)
Used only for small UI preferences and “resume where you left off” behavior.

**Global keys**
- `book-ocr:v2:rightPaneWidth` — proofreading dock width
- `book-ocr:v2:editorFontSize` — CodeMirror font size

**Per project + page keys**
- `book-ocr:v2:lineHintRatio:<projectId>:<pageId>` — red line position on the page viewer
- `book-ocr:v2:editorSelection:<projectId>:<pageId>` — editor selection/cursor position

If you clear site data in your browser, both IndexedDB and localStorage state may be lost.

---

## Running Locally

### Option A (recommended): use the deployed Cloud Run OCR

```bash
cd frontend-v2
npm install
npm run dev
```

By default, the Vite dev server proxies `/extract` to:

`https://telugu-ocr-prod-777583762558.us-central1.run.app`

Open `http://localhost:5173/`.

### Option B: use a local backend

1) Start backend:

```bash
cd backend
export PORT=8080
export DISABLE_QUOTA=1
./venv/bin/python app.py
```

2) Start frontend-v2 with a proxy override:

```bash
cd frontend-v2
VITE_PROXY_TARGET=http://127.0.0.1:8080 npm run dev
```

---

## Environment Variables

### `VITE_PROXY_TARGET` (dev only)
Used by Vite dev server to proxy `/extract`.

Example:

```bash
VITE_PROXY_TARGET=http://127.0.0.1:8080 npm run dev
```

### `VITE_API_BASE` (production / hosted frontend)
If you deploy the built frontend separately (no dev proxy), API calls use:

`fetch(${VITE_API_BASE}/extract?lang=...)`

Example:

```bash
VITE_API_BASE=https://telugu-ocr-prod-777583762558.us-central1.run.app npm run dev
```

---

## Build / Preview

```bash
cd frontend-v2
npm run build
npm run preview
```

---

## Troubleshooting

### OCR fails with 429
This is quota throttling from the OCR service.
- The UI pauses the OCR queue.
- You can continue proofreading already-processed pages.

### OCR fails with 500 or “Unexpected OCR response”
- Check the OCR service is reachable.
- Confirm the OCR response JSON matches `{ status: "success", text: "..." }`.

### I’m not seeing old projects/pages
- The data is browser-local.
- Different browsers / profiles / incognito sessions have separate storage.
- Clearing site data resets IndexedDB + localStorage.

