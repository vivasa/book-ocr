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

### 6.5) Language Help (Telugu)
The center pane includes a **Language Help** tab (Telugu only for now).

- Shows all Telugu consonants from the Telugu Unicode block (largest set), with script → roman hints.
- Click any glyph to copy it to clipboard.
- Includes a curated set of common conjuncts/clusters (click-to-copy).

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

## Deploying to Vercel (recommended approach)

The OCR backend is already deployed (Cloud Run). If you deploy this frontend separately (e.g. Vercel), the key decision is how the browser reaches the OCR API.

### Option A (recommended): Vercel rewrite (no CORS)
This repo includes [frontend-v2/vercel.json](frontend-v2/vercel.json) which rewrites:
- `/extract` → the deployed OCR service `/extract`
- `/healthz` → the deployed OCR service `/healthz`

Benefits:
- No CORS work needed (browser calls your Vercel origin, Vercel forwards to Cloud Run).
- Keeps the frontend code using relative URLs (works the same in dev with Vite proxy).

Vercel project settings:
- **Root Directory**: `frontend-v2`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

Important:
- Do **not** set `VITE_API_BASE` on Vercel for this option (leave it empty) so requests go to `/extract`.

### Option B: direct browser calls to Cloud Run (requires CORS)
You can set `VITE_API_BASE=https://<your-cloud-run-host>` and let the browser call Cloud Run directly.

If you do this, the backend must explicitly allow your Vercel domain via CORS (otherwise browsers will block the request). The current backend does not enable CORS by default.

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

---

## TODO: Add Language Help for Kannada + Hindi

This is intentionally deferred; the current implementation is Telugu-only.

### 1) Unicode block + consonant extraction
- Add Unicode helpers similar to `src/lib/teluguUnicode.js`.
- **Kannada** block: `U+0C80..U+0CFF`.
- **Devanagari (Hindi)** block: `U+0900..U+097F`.
- For each script, enumerate code points in the block and select the largest consonant set by:
	- keeping only `Script=<...>` + `Letter` characters
	- excluding independent vowels + avagraha-type letters + vocalic letters (script-specific)
	- documenting any exclusions inline so future changes are deliberate.

### 2) Virama / halant handling for conjunct helpers
- Telugu uses virama `U+0C4D`.
- Kannada uses virama `U+0CCD`.
- Devanagari uses halant `U+094D`.
- Implement `make<Script>Conjunct(c1, c2)` for each, generating `c1 + virama + c2`.

### 3) Transliteration scheme mapping
- `LanguageHelpPane` currently uses Sanscript with `telugu`.
- Add a mapping for script keys:
	- Telugu: `telugu`
	- Kannada: `kannada`
	- Hindi: `devanagari`
- Share the same scheme state used by the Transliteration dock so roman hints are consistent.

### 4) English special-case (OCR confusion help)
- Add a dedicated section for `lang === 'eng'` showing OCR confusions (O/0, I/l/1, rn/m, etc.).
- Keep it copy-only (no insert).

### 5) Performance + UI bounds
- If you choose to implement exhaustive conjunct helpers later, note that a full pair grid grows as $n^2$.
- A simpler alternative is a “conjunct builder” (pick C1 + C2, copy the result) to remain exhaustive without rendering $n^2$ tiles.

