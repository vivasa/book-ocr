import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppBar,
  Box,
  Button,
  Chip,
  CssBaseline,
  Divider,
  IconButton,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
} from '@mui/material'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faArrowsRotate,
  faFileArrowUp,
  faFileExport,
  faFileLines,
  faFolderOpen,
  faPlay,
  faMagnifyingGlassMinus,
  faMagnifyingGlassPlus,
  faMoon,
  faPlus,
  faSun,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { newId } from './lib/ids.js'
import { pdfToPagePngBlobs } from './lib/pdfImport.js'
import { ALLOWED_LANGS, extractText } from './lib/ocrApi.js'
import {
  deleteProject,
  getProject,
  listPages,
  listProjects,
  bulkUpsertPages,
  upsertPage,
  upsertProject,
} from './storage/projectStore.js'
import PageStrip from './components/PageStrip.jsx'
import PageViewer from './components/PageViewer.jsx'
import LanguageHelpPane from './components/LanguageHelpPane.jsx'
import TransliterationDock from './components/TransliterationDock.jsx'
import ProofreadEditor from './components/ProofreadEditor.jsx'

function nowMs() {
  return Date.now()
}

async function getImageDims(blob) {
  const bitmap = await createImageBitmap(blob)
  const dims = { width: bitmap.width, height: bitmap.height }
  bitmap.close?.()
  return dims
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function isPdfFile(file) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function isImageFile(file) {
  return file.type.startsWith('image/')
}

export default function App() {
  const UI_STORAGE_KEYS = useMemo(
    () => ({
      rightPaneWidth: 'book-ocr:v2:rightPaneWidth',
      editorFontSize: 'book-ocr:v2:editorFontSize',
      themeMode: 'book-ocr:v2:themeMode',
      centerPaneTab: 'book-ocr:v2:centerPaneTab',
      translitScheme: 'book-ocr:v2:translitScheme',
      lineHintRatio(projectId, pageId) {
        return `book-ocr:v2:lineHintRatio:${projectId}:${pageId}`
      },
      editorSelection(projectId, pageId) {
        return `book-ocr:v2:editorSelection:${projectId}:${pageId}`
      },
    }),
    [],
  )

  const [themeMode, setThemeMode] = useState('dark')
  const [translitScheme, setTranslitScheme] = useState('itrans')
  const [centerPaneTab, setCenterPaneTab] = useState('viewer')

  const viewerFrameRef = useRef(null)

  useEffect(() => {
    try {
      const saved = (window.localStorage.getItem(UI_STORAGE_KEYS.themeMode) || '').trim()
      if (saved === 'light' || saved === 'dark') {
        setThemeMode(saved)
        return
      }
      const prefersLight = window.matchMedia?.('(prefers-color-scheme: light)')?.matches
      if (prefersLight) setThemeMode('light')
    } catch {
      // ignore
    }
  }, [UI_STORAGE_KEYS])

  useEffect(() => {
    try {
      const raw = (window.localStorage.getItem(UI_STORAGE_KEYS.centerPaneTab) || '').trim()
      if (raw === 'viewer' || raw === 'lang') {
        setCenterPaneTab(raw)
      }
    } catch {
      // ignore
    }
  }, [UI_STORAGE_KEYS])

  useEffect(() => {
    try {
      const raw = (window.localStorage.getItem(UI_STORAGE_KEYS.translitScheme) || '').trim()
      if (raw === 'itrans' || raw === 'hk' || raw === 'iast') {
        setTranslitScheme(raw)
      }
    } catch {
      // ignore
    }
  }, [UI_STORAGE_KEYS])

  useEffect(() => {
    try {
      window.localStorage.setItem(UI_STORAGE_KEYS.centerPaneTab, String(centerPaneTab))
    } catch {
      // ignore
    }
  }, [UI_STORAGE_KEYS, centerPaneTab])

  useEffect(() => {
    try {
      window.localStorage.setItem(UI_STORAGE_KEYS.translitScheme, String(translitScheme))
    } catch {
      // ignore
    }
  }, [UI_STORAGE_KEYS, translitScheme])

  useEffect(() => {
    try {
      window.localStorage.setItem(UI_STORAGE_KEYS.themeMode, themeMode)
    } catch {
      // ignore
    }
  }, [UI_STORAGE_KEYS, themeMode])

  const theme = useMemo(() => {
    const isDark = themeMode === 'dark'
    const divider = isDark ? '#555555' : '#D0D0D0'
    return createTheme({
      palette: {
        mode: themeMode,
        ...(isDark
          ? {
              // IntelliJ / Darcula-inspired palette (approximation).
              background: { default: '#2B2B2B', paper: '#3C3F41' },
              text: { primary: '#A9B7C6', secondary: '#808080' },
              divider,
              // Softer (pastel-ish) accents for a calmer UI.
              primary: { main: '#7FA7FF' },
              secondary: { main: '#C792EA' },
              success: { main: '#8BD5A2' },
              warning: { main: '#F2C97D' },
              error: { main: '#F28B82' },
              action: {
                hover: 'rgba(255,255,255,0.06)',
                selected: 'rgba(127,167,255,0.20)',
                disabled: 'rgba(169,183,198,0.35)',
                disabledBackground: 'rgba(255,255,255,0.04)',
              },
            }
          : {
              // IntelliJ light-inspired palette (approximation).
              background: { default: '#F5F5F5', paper: '#FFFFFF' },
              text: { primary: '#1F2328', secondary: '#5A5A5A' },
              divider,
              // Softer (pastel-ish) accents for a calmer UI.
              primary: { main: '#5B8CFF' },
              secondary: { main: '#B07AE6' },
              success: { main: '#55B97C' },
              warning: { main: '#E3B55B' },
              error: { main: '#E77474' },
              action: {
                hover: 'rgba(0,0,0,0.04)',
                selected: 'rgba(91,140,255,0.14)',
                disabled: 'rgba(31,35,40,0.35)',
                disabledBackground: 'rgba(0,0,0,0.03)',
              },
            }),
      },
      shape: { borderRadius: 0 },
      components: {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: isDark ? '#2B2B2B' : '#F5F5F5',
              '--app-divider': divider,
            },
          },
        },
        MuiIconButton: {
          styleOverrides: {
            root: {
              color: isDark ? '#A9B7C6' : '#5A5A5A',
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: 6,
            },
          },
        },
      },
    })
  }, [themeMode])

  const [view, setView] = useState('projects')
  const [projects, setProjects] = useState([])
  const [activeProject, setActiveProject] = useState(null)
  const [pages, setPages] = useState([])
  const [selectedPageId, setSelectedPageId] = useState('')
  const [banner, setBanner] = useState('')
  const [error, setError] = useState('')

  const [lang, setLang] = useState('tel')
  const [ocrRunning, setOcrRunning] = useState(false)
  const [ocrPausedByQuota, setOcrPausedByQuota] = useState(false)

  // UI-only state
  const [rightPaneWidth, setRightPaneWidth] = useState(420)
  const [editorFontSize, setEditorFontSize] = useState(15)
  const [zoom, setZoom] = useState(1)
  const [lineHintRatio, setLineHintRatio] = useState(0)
  const [translitSeedTelugu, setTranslitSeedTelugu] = useState('')
  const draggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartWidthRef = useRef(420)

  const editorRef = useRef(null)
  const saveTimerRef = useRef(0)
  const objectUrlsRef = useRef(new Set())
  const editorSelectionSaveTimerRef = useRef(0)

  const selectedPage = useMemo(
    () => pages.find((p) => p.id === selectedPageId) ?? null,
    [pages, selectedPageId],
  )

  useEffect(() => {
    setLineHintRatio(0)

    // Default zoom: fit-to-width (up to 100%), so large PDF-rendered images don't look
    // “zoomed in” and partially off-screen by default.
    const frameWidth = viewerFrameRef.current?.clientWidth ?? 0
    const pageWidth = selectedPage?.width ?? 0
    if (frameWidth > 0 && pageWidth > 0) {
      const gutter = 24
      const raw = (frameWidth - gutter) / pageWidth
      const next = Math.max(0.25, Math.min(1, Math.round(raw * 100) / 100))
      setZoom(next)
    } else {
      setZoom(1)
    }
  }, [selectedPageId, selectedPage?.width])

  async function refreshProjects() {
    const p = await listProjects()
    setProjects(p)
  }

  function revokeAllObjectUrls() {
    for (const url of objectUrlsRef.current) {
      URL.revokeObjectURL(url)
    }
    objectUrlsRef.current.clear()
  }

  function withPreviewUrl(page) {
    if (!page?.imageBlob) return { ...page, previewUrl: '' }
    const url = URL.createObjectURL(page.imageBlob)
    objectUrlsRef.current.add(url)
    return { ...page, previewUrl: url }
  }

  async function openProject(projectId) {
    setError('')
    setBanner('')
    setOcrPausedByQuota(false)

    revokeAllObjectUrls()

    const project = await getProject(projectId)
    if (!project) {
      setError('Project not found')
      return
    }

    const loadedPages = await listPages(projectId)
    const pagesWithUrls = loadedPages.map(withPreviewUrl)

    setActiveProject(project)
    setLang(project.ocrLang ?? 'tel')
    setPages(pagesWithUrls)
    setSelectedPageId(pagesWithUrls[0]?.id ?? '')
    setView('workspace')
  }

  async function createProject() {
    const id = newId()
    const project = {
      id,
      title: `Untitled Book`,
      createdAt: nowMs(),
      updatedAt: nowMs(),
      ocrLang: 'tel',
    }
    await upsertProject(project)
    await refreshProjects()
    await openProject(id)
  }

  async function onDeleteProject(projectId) {
    if (!confirm('Delete this project and all its pages?')) return
    await deleteProject(projectId)
    await refreshProjects()
  }

  async function updateProject(patch) {
    if (!activeProject) return
    const next = { ...activeProject, ...patch, updatedAt: nowMs() }
    setActiveProject(next)
    await upsertProject(next)
    await refreshProjects()
  }

  async function importFiles(fileList) {
    if (!activeProject) return

    setError('')
    setBanner('')

    const files = Array.from(fileList || [])
    if (files.length === 0) return

    const existingCount = pages.length
    let nextPageNumber = existingCount + 1

    const newPages = []

    for (const file of files) {
      if (isPdfFile(file)) {
        setBanner(`Importing PDF: ${file.name} …`)
        const pageBlobs = await pdfToPagePngBlobs(file)
        for (const p of pageBlobs) {
          const id = newId()
          newPages.push({
            id,
            projectId: activeProject.id,
            pageNumber: nextPageNumber++,
            imageBlob: p.blob,
            width: p.width,
            height: p.height,
            status: 'new',
            ocrText: '',
            correctedText: '',
            lastError: '',
            createdAt: nowMs(),
            updatedAt: nowMs(),
          })
        }
      } else if (isImageFile(file)) {
        setBanner(`Importing image: ${file.name} …`)
        const dims = await getImageDims(file)
        const id = newId()
        newPages.push({
          id,
          projectId: activeProject.id,
          pageNumber: nextPageNumber++,
          imageBlob: file,
          width: dims.width,
          height: dims.height,
          status: 'new',
          ocrText: '',
          correctedText: '',
          lastError: '',
          createdAt: nowMs(),
          updatedAt: nowMs(),
        })
      } else {
        setBanner(`Skipping unsupported file: ${file.name}`)
      }
    }

    if (newPages.length === 0) {
      setBanner('No supported files selected (use PDF or images).')
      return
    }

    await bulkUpsertPages(newPages)
    await updateProject({ updatedAt: nowMs() })

    const merged = [...pages, ...newPages].sort((a, b) => a.pageNumber - b.pageNumber)
    const mergedWithUrls = merged.map((p) => (p.previewUrl ? p : withPreviewUrl(p)))
    setPages(mergedWithUrls)
    if (!selectedPageId) setSelectedPageId(mergedWithUrls[0]?.id ?? '')

    setBanner(`Imported ${newPages.length} page(s).`)
  }

  async function runOcr({ onlySelected = false } = {}) {
    if (!activeProject) return
    if (ocrRunning) return

    setError('')
    setBanner('')
    setOcrPausedByQuota(false)

    const targetPages = onlySelected
      ? pages.filter((p) => p.id === selectedPageId)
      : pages

    if (targetPages.length === 0) {
      setBanner('No pages to OCR.')
      return
    }

    setOcrRunning(true)
    try {
      for (let i = 0; i < targetPages.length; i += 1) {
        const pageId = targetPages[i].id
        const idx = pages.findIndex((p) => p.id === pageId)
        if (idx < 0) continue

        // Use current state snapshot each loop for correctness.
        const current = (prevPages) => prevPages.find((p) => p.id === pageId)

        setPages((prev) => {
          const p = current(prev)
          if (!p) return prev
          const next = [...prev]
          next[idx] = { ...p, status: 'processing', lastError: '', updatedAt: nowMs() }
          return next
        })

        const pageBefore = pages.find((p) => p.id === pageId) || targetPages[i]
        const imageBlob = pageBefore.imageBlob

        setBanner(`OCR: page ${i + 1}/${targetPages.length} …`)

        try {
          const text = await extractText(imageBlob, { lang })
          const updated = {
            ...pageBefore,
            status: 'done',
            ocrText: text,
            correctedText: pageBefore.correctedText ? pageBefore.correctedText : text,
            lastError: '',
            updatedAt: nowMs(),
          }
          await upsertPage(updated)

          setPages((prev) => prev.map((p) => (p.id === pageId ? withPreviewUrl(updated) : p)))
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e)
          const status = e?.status

          const updated = {
            ...pageBefore,
            status: 'error',
            lastError: message,
            updatedAt: nowMs(),
          }
          await upsertPage(updated)
          setPages((prev) => prev.map((p) => (p.id === pageId ? withPreviewUrl(updated) : p)))

          if (status === 429) {
            setOcrPausedByQuota(true)
            setBanner('OCR paused: daily quota exceeded (429).')
            break
          }
        }
      }

      await updateProject({ ocrLang: lang, updatedAt: nowMs() })
      if (!ocrPausedByQuota) setBanner('OCR finished.')
    } finally {
      setOcrRunning(false)
    }
  }

  function onEditorChange(nextText) {
    if (!selectedPage) return

    // Update state immediately.
    setPages((prev) =>
      prev.map((p) =>
        p.id === selectedPage.id ? { ...p, correctedText: nextText, updatedAt: nowMs() } : p,
      ),
    )

    // Debounced IndexedDB write.
    window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(async () => {
      const latest = pages.find((p) => p.id === selectedPage.id) || selectedPage
      await upsertPage({ ...latest, correctedText: nextText, updatedAt: nowMs() })
      await updateProject({ updatedAt: nowMs() })
    }, 350)
  }

  function exportTxt() {
    if (!activeProject) return
    const ordered = [...pages].sort((a, b) => a.pageNumber - b.pageNumber)
    const combined = ordered
      .map((p) => (p.correctedText || p.ocrText || '').trimEnd())
      .join('\n\n')
      .trim()

    const safeTitle = (activeProject.title || 'book').replaceAll(/[^a-zA-Z0-9_-]+/g, '_')
    downloadText(`${safeTitle}.txt`, combined)
  }

  function exportJsonBackup() {
    if (!activeProject) return
    const ordered = [...pages].sort((a, b) => a.pageNumber - b.pageNumber)
    const backup = {
      project: {
        id: activeProject.id,
        title: activeProject.title,
        createdAt: activeProject.createdAt,
        updatedAt: activeProject.updatedAt,
        ocrLang: activeProject.ocrLang,
      },
      pages: ordered.map((p) => ({
        id: p.id,
        pageNumber: p.pageNumber,
        width: p.width,
        height: p.height,
        status: p.status,
        ocrText: p.ocrText,
        correctedText: p.correctedText,
        lastError: p.lastError,
      })),
      note: 'This backup does not include page images (kept local in IndexedDB).',
    }

    const safeTitle = (activeProject.title || 'book').replaceAll(/[^a-zA-Z0-9_-]+/g, '_')
    downloadJson(`${safeTitle}.json`, backup)
  }

  useEffect(() => {
    refreshProjects()
    return () => {
      revokeAllObjectUrls()
    }
  }, [])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(UI_STORAGE_KEYS.rightPaneWidth)
      if (!raw) return
      const n = Number.parseInt(raw, 10)
      if (!Number.isFinite(n)) return
      const next = Math.max(320, Math.min(820, n))
      setRightPaneWidth(next)
      dragStartWidthRef.current = next
    } catch {
      // ignore
    }
  }, [UI_STORAGE_KEYS])

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(UI_STORAGE_KEYS.rightPaneWidth, String(rightPaneWidth))
      } catch {
        // ignore
      }
    }, 120)
    return () => window.clearTimeout(t)
  }, [UI_STORAGE_KEYS, rightPaneWidth])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(UI_STORAGE_KEYS.editorFontSize)
      if (!raw) return
      const n = Number.parseInt(raw, 10)
      if (!Number.isFinite(n)) return
      setEditorFontSize(Math.max(12, Math.min(24, n)))
    } catch {
      // ignore
    }
  }, [UI_STORAGE_KEYS])

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.localStorage.setItem(UI_STORAGE_KEYS.editorFontSize, String(editorFontSize))
      } catch {
        // ignore
      }
    }, 120)
    return () => window.clearTimeout(t)
  }, [UI_STORAGE_KEYS, editorFontSize])

  useEffect(() => {
    if (!activeProject?.id || !selectedPageId) return
    try {
      const key = UI_STORAGE_KEYS.lineHintRatio(activeProject.id, selectedPageId)
      const raw = window.localStorage.getItem(key)
      const n = raw == null ? 0 : Number.parseFloat(raw)
      setLineHintRatio(Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0)
    } catch {
      setLineHintRatio(0)
    }
  }, [UI_STORAGE_KEYS, activeProject?.id, selectedPageId])

  useEffect(() => {
    if (!activeProject?.id || !selectedPageId) return

    let canceled = false
    const key = UI_STORAGE_KEYS.editorSelection(activeProject.id, selectedPageId)

    function tryRestore() {
      if (canceled) return
      const api = editorRef.current
      if (!api?.setSelection) {
        window.requestAnimationFrame(tryRestore)
        return
      }

      try {
        const raw = window.localStorage.getItem(key)
        if (!raw) return
        const parsed = JSON.parse(raw)
        const anchor = Number(parsed?.anchor)
        const head = Number(parsed?.head)
        if (!Number.isFinite(anchor) || !Number.isFinite(head)) return
        api.setSelection(anchor, head)
      } catch {
        // ignore
      }
    }

    window.requestAnimationFrame(tryRestore)
    return () => {
      canceled = true
    }
  }, [UI_STORAGE_KEYS, activeProject?.id, selectedPageId, selectedPage?.correctedText, selectedPage?.ocrText])

  useEffect(() => {
    function onPointerMove(e) {
      if (!draggingRef.current) return
      const dx = dragStartXRef.current - e.clientX
      const next = Math.max(320, Math.min(820, dragStartWidthRef.current + dx))
      setRightPaneWidth(next)
    }
    function onPointerUp() {
      draggingRef.current = false
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  // Projects view
  if (view === 'projects') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div className="appShell">
          <AppBar position="static" color="transparent" elevation={0}>
            <Toolbar sx={{ gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Book OCR (v2)
              </Typography>
              <Chip size="small" label="no login" />
              <Box sx={{ flex: 1 }} />
              <Tooltip title={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
                <IconButton
                  onClick={() => setThemeMode((m) => (m === 'dark' ? 'light' : 'dark'))}
                  aria-label="Toggle theme"
                >
                  <FontAwesomeIcon icon={themeMode === 'dark' ? faSun : faMoon} />
                </IconButton>
              </Tooltip>
              <Button variant="contained" onClick={createProject} startIcon={<FontAwesomeIcon icon={faPlus} />}>
                New project
              </Button>
            </Toolbar>
          </AppBar>

          <Box className="centerPane panel" sx={{ p: 3 }}>
            <Box sx={{ maxWidth: 980, mx: 'auto' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Projects
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
                Projects are stored locally in your browser (IndexedDB).
              </Typography>

              {projects.length === 0 ? (
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 0 }}>
                  <Typography variant="body2">No projects yet. Create one to begin.</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'grid', gap: 1.25 }}>
                  {projects.map((p) => (
                    <Box
                      key={p.id}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                        >
                          {p.title || 'Untitled'}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.75 }}>
                          Last updated: {new Date(p.updatedAt ?? p.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                      <Button variant="outlined" onClick={() => openProject(p.id)} startIcon={<FontAwesomeIcon icon={faFolderOpen} />}>
                        Open
                      </Button>
                      <Button color="error" variant="outlined" onClick={() => onDeleteProject(p.id)} startIcon={<FontAwesomeIcon icon={faTrash} />}>
                        Delete
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Box>
        </div>
      </ThemeProvider>
    )
  }

  // Workspace view
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="appShell">
        <AppBar position="static" color="transparent" elevation={0}>
          <Toolbar sx={{ gap: 1.5 }}>
            <Tooltip title="Back to projects">
              <IconButton
                onClick={() => {
                  setView('projects')
                  setActiveProject(null)
                  setPages([])
                  setSelectedPageId('')
                  revokeAllObjectUrls()
                }}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </IconButton>
            </Tooltip>

            <TextField
              size="small"
              label="Project"
              value={activeProject?.title ?? ''}
              onChange={(e) => updateProject({ title: e.target.value })}
              sx={{ width: 340 }}
            />

            <Select size="small" value={lang} onChange={(e) => setLang(e.target.value)}>
              {ALLOWED_LANGS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>

            <Button variant="outlined" component="label" startIcon={<FontAwesomeIcon icon={faFileArrowUp} />}>
              Import PDF/images
              <input
                type="file"
                accept="application/pdf,image/*"
                multiple
                hidden
                onChange={(e) => importFiles(e.target.files)}
              />
            </Button>

            <Button
              variant="contained"
              disabled={ocrRunning || pages.length === 0}
              onClick={() => runOcr()}
              startIcon={<FontAwesomeIcon icon={faPlay} />}
            >
              {ocrRunning ? 'OCR…' : 'Run OCR (all)'}
            </Button>

            <Button
              variant="outlined"
              disabled={ocrRunning || !selectedPageId}
              onClick={() => runOcr({ onlySelected: true })}
              startIcon={<FontAwesomeIcon icon={faPlay} />}
            >
              OCR (selected)
            </Button>

            <Box sx={{ flex: 1 }} />

            <Tooltip title={themeMode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
              <IconButton
                onClick={() => setThemeMode((m) => (m === 'dark' ? 'light' : 'dark'))}
                aria-label="Toggle theme"
              >
                <FontAwesomeIcon icon={themeMode === 'dark' ? faSun : faMoon} />
              </IconButton>
            </Tooltip>

            <Button variant="outlined" disabled={pages.length === 0} onClick={exportTxt} startIcon={<FontAwesomeIcon icon={faFileLines} />}>
              Export .txt
            </Button>
            <Button variant="outlined" disabled={pages.length === 0} onClick={exportJsonBackup} startIcon={<FontAwesomeIcon icon={faFileExport} />}>
              Export JSON
            </Button>
          </Toolbar>
          <Divider />
        </AppBar>

        {(banner || error || ocrPausedByQuota) && (
          <Box sx={{ px: 2, py: 1.5, display: 'grid', gap: 1 }}>
            {banner ? (
              <Box sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 0 }}>
                <Typography variant="body2">{banner}</Typography>
              </Box>
            ) : null}
            {error ? (
              <Box sx={{ p: 1.25, border: '1px solid', borderColor: 'error.main', borderRadius: 0 }}>
                <Typography variant="body2">{error}</Typography>
              </Box>
            ) : null}
            {ocrPausedByQuota ? (
              <Box sx={{ p: 1.25, border: '1px solid', borderColor: 'warning.main', borderRadius: 0 }}>
                <Typography variant="body2">
                  OCR is paused due to quota. You can keep proofreading processed pages.
                </Typography>
              </Box>
            ) : null}
          </Box>
        )}

        <div className="main">
          <div className="leftPane panel">
            <Box sx={{ p: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Pages
              </Typography>
            </Box>
            <PageStrip pages={pages} selectedPageId={selectedPageId} onSelectPage={setSelectedPageId} />
          </div>

          <div className="centerPane panel">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Tabs
                value={centerPaneTab}
                onChange={(_, v) => setCenterPaneTab(v)}
                variant="standard"
                sx={{ minHeight: 32, '& .MuiTab-root': { minHeight: 32, py: 0 } }}
              >
                <Tab value="viewer" label="Page Viewer" />
                <Tab value="lang" label="Language Help" />
              </Tabs>
              <Box sx={{ flex: 1 }} />

              {centerPaneTab === 'viewer' ? (
                <>
                  <Tooltip title="Zoom out">
                    <span>
                      <IconButton
                        onClick={() =>
                          setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))
                        }
                        disabled={!selectedPage || zoom <= 0.5}
                      >
                        <FontAwesomeIcon icon={faMagnifyingGlassMinus} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Reset zoom">
                    <span>
                      <IconButton onClick={() => setZoom(1)} disabled={!selectedPage || zoom === 1}>
                        <FontAwesomeIcon icon={faArrowsRotate} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Zoom in">
                    <span>
                      <IconButton
                        onClick={() =>
                          setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))
                        }
                        disabled={!selectedPage || zoom >= 3}
                      >
                        <FontAwesomeIcon icon={faMagnifyingGlassPlus} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Chip size="small" label={`${Math.round(zoom * 100)}%`} />
                </>
              ) : null}
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, p: 1.5 }}>
              {centerPaneTab === 'viewer' ? (
                <>
                  <div className="viewerFrame" ref={viewerFrameRef}>
                    <PageViewer
                      page={selectedPage}
                      zoom={zoom}
                      lineHint={{ ratio: lineHintRatio }}
                      onLineHintChange={(r) => {
                        setLineHintRatio(r)
                        if (!activeProject?.id || !selectedPageId) return
                        try {
                          const key = UI_STORAGE_KEYS.lineHintRatio(activeProject.id, selectedPageId)
                          window.localStorage.setItem(key, String(r))
                        } catch {
                          // ignore
                        }
                      }}
                    />
                  </div>

                  {selectedPage?.lastError ? (
                    <Box
                      sx={{
                        mt: 1.5,
                        p: 1.25,
                        border: '1px solid',
                        borderColor: 'error.main',
                        borderRadius: 0,
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Page error
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', opacity: 0.85 }}>
                        {selectedPage.lastError}
                      </Typography>
                    </Box>
                  ) : null}
                </>
              ) : (
                <LanguageHelpPane lang={lang} scheme={translitScheme} />
              )}
            </Box>
          </div>

          <div
            className="splitter"
            role="separator"
            aria-orientation="vertical"
            onPointerDown={(e) => {
              draggingRef.current = true
              dragStartXRef.current = e.clientX
              dragStartWidthRef.current = rightPaneWidth
              e.currentTarget.setPointerCapture?.(e.pointerId)
            }}
            title="Drag to resize"
          />

          <div className="rightPane panel" style={{ width: rightPaneWidth }}>
            <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Proofreading Dock
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Decrease editor font">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => setEditorFontSize((s) => Math.max(12, s - 1))}
                    disabled={editorFontSize <= 12}
                    aria-label="Decrease editor font"
                  >
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                      A-
                    </Typography>
                  </IconButton>
                </span>
              </Tooltip>
              <Chip size="small" label={`${editorFontSize}px`} />
              <Tooltip title="Increase editor font">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => setEditorFontSize((s) => Math.min(24, s + 1))}
                    disabled={editorFontSize >= 24}
                    aria-label="Increase editor font"
                  >
                    <Typography variant="caption" sx={{ fontWeight: 800 }}>
                      A+
                    </Typography>
                  </IconButton>
                </span>
              </Tooltip>
              <Chip size="small" label={`${rightPaneWidth}px`} />
            </Box>
            <Divider />

            <Box sx={{ p: 1.5 }}>
              <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mb: 0.75 }}>
                Corrected text
              </Typography>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 0, overflow: 'hidden' }}>
                <ProofreadEditor
                  ref={editorRef}
                  value={selectedPage ? selectedPage.correctedText ?? selectedPage.ocrText ?? '' : ''}
                  onChange={(next) => onEditorChange(next)}
                  placeholder="Run OCR, then proofread here."
                  disabled={!selectedPage}
                  height={420}
                  fontSize={editorFontSize}
                  onSelectionChange={(sel) => {
                    const candidate = String(sel?.selectedText ?? '').trim()
                    if (candidate) setTranslitSeedTelugu(candidate.slice(0, 400))

                    if (!activeProject?.id || !selectedPageId) return
                    window.clearTimeout(editorSelectionSaveTimerRef.current)
                    editorSelectionSaveTimerRef.current = window.setTimeout(() => {
                      try {
                        const key = UI_STORAGE_KEYS.editorSelection(activeProject.id, selectedPageId)
                        window.localStorage.setItem(
                          key,
                          JSON.stringify({ anchor: sel?.anchor, head: sel?.head }),
                        )
                      } catch {
                        // ignore
                      }
                    }, 150)
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 1 }}>
                Characters: {(selectedPage?.correctedText ?? selectedPage?.ocrText ?? '').length}
              </Typography>
            </Box>

            <TransliterationDock
              seedTelugu={translitSeedTelugu}
              scheme={translitScheme}
              onSchemeChange={setTranslitScheme}
              onInsert={(teluguText) => {
                if (!selectedPage) return
                editorRef.current?.insertText?.(teluguText)
              }}
            />
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
