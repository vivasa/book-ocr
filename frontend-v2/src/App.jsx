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
  TextField,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
} from '@mui/material'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
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
import TransliterationDock from './components/TransliterationDock.jsx'

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
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'dark',
        },
        shape: { borderRadius: 12 },
      }),
    [],
  )

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
  const [zoom, setZoom] = useState(1)
  const draggingRef = useRef(false)
  const dragStartXRef = useRef(0)
  const dragStartWidthRef = useRef(420)

  const textareaRef = useRef(null)
  const saveTimerRef = useRef(0)
  const objectUrlsRef = useRef(new Set())

  const selectedPage = useMemo(
    () => pages.find((p) => p.id === selectedPageId) ?? null,
    [pages, selectedPageId],
  )

  useEffect(() => {
    setZoom(1)
  }, [selectedPageId])

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
              <Button variant="contained" onClick={createProject}>
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
                <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
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
                        borderRadius: 2,
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
                      <Button variant="outlined" onClick={() => openProject(p.id)}>
                        Open
                      </Button>
                      <Button color="error" variant="outlined" onClick={() => onDeleteProject(p.id)}>
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
                <ArrowBackIcon />
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

            <Button variant="outlined" component="label">
              Import PDF/images
              <input
                type="file"
                accept="application/pdf,image/*"
                multiple
                hidden
                onChange={(e) => importFiles(e.target.files)}
              />
            </Button>

            <Button variant="contained" disabled={ocrRunning || pages.length === 0} onClick={() => runOcr()}>
              {ocrRunning ? 'OCR…' : 'Run OCR (all)'}
            </Button>

            <Button
              variant="outlined"
              disabled={ocrRunning || !selectedPageId}
              onClick={() => runOcr({ onlySelected: true })}
            >
              OCR (selected)
            </Button>

            <Box sx={{ flex: 1 }} />

            <Button variant="outlined" disabled={pages.length === 0} onClick={exportTxt}>
              Export .txt
            </Button>
            <Button variant="outlined" disabled={pages.length === 0} onClick={exportJsonBackup}>
              Export JSON
            </Button>
          </Toolbar>
          <Divider />
        </AppBar>

        {(banner || error || ocrPausedByQuota) && (
          <Box sx={{ px: 2, py: 1.5, display: 'grid', gap: 1 }}>
            {banner ? (
              <Box sx={{ p: 1.25, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Typography variant="body2">{banner}</Typography>
              </Box>
            ) : null}
            {error ? (
              <Box sx={{ p: 1.25, border: '1px solid', borderColor: 'error.main', borderRadius: 2 }}>
                <Typography variant="body2">{error}</Typography>
              </Box>
            ) : null}
            {ocrPausedByQuota ? (
              <Box sx={{ p: 1.25, border: '1px solid', borderColor: 'warning.main', borderRadius: 2 }}>
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
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Page Viewer
              </Typography>
              <Box sx={{ flex: 1 }} />
              <Tooltip title="Zoom out">
                <span>
                  <IconButton onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))} disabled={!selectedPage || zoom <= 0.5}>
                    <ZoomOutIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Reset zoom">
                <span>
                  <IconButton onClick={() => setZoom(1)} disabled={!selectedPage || zoom === 1}>
                    <RestartAltIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Zoom in">
                <span>
                  <IconButton onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))} disabled={!selectedPage || zoom >= 3}>
                    <ZoomInIcon />
                  </IconButton>
                </span>
              </Tooltip>
              <Chip size="small" label={`${Math.round(zoom * 100)}%`} />
            </Box>

            <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
              <div className="viewerFrame">
                <PageViewer page={selectedPage} zoom={zoom} />
              </div>

              {selectedPage?.lastError ? (
                <Box sx={{ mt: 1.5, p: 1.25, border: '1px solid', borderColor: 'error.main', borderRadius: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Page error
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', opacity: 0.85 }}>
                    {selectedPage.lastError}
                  </Typography>
                </Box>
              ) : null}
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
              <Chip size="small" label={`${rightPaneWidth}px`} />
            </Box>
            <Divider />

            <Box sx={{ p: 1.5 }}>
              <TextField
                label="Corrected text"
                multiline
                minRows={10}
                maxRows={26}
                fullWidth
                inputRef={textareaRef}
                value={selectedPage ? selectedPage.correctedText ?? selectedPage.ocrText ?? '' : ''}
                onChange={(e) => onEditorChange(e.target.value)}
                placeholder="Run OCR, then proofread here."
                disabled={!selectedPage}
              />
              <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 1 }}>
                Characters: {(selectedPage?.correctedText ?? selectedPage?.ocrText ?? '').length}
              </Typography>
            </Box>

            <TransliterationDock
              onInsert={(teluguText) => {
                if (!selectedPage) return
                const el = textareaRef.current

                const currentValue = selectedPage.correctedText ?? selectedPage.ocrText ?? ''
                const start = el?.selectionStart ?? currentValue.length
                const end = el?.selectionEnd ?? currentValue.length

                const next = currentValue.slice(0, start) + teluguText + currentValue.slice(end)
                onEditorChange(next)

                // Restore focus + cursor to the editor after clicking the insert button.
                requestAnimationFrame(() => {
                  if (!el) return
                  try {
                    el.focus()
                    const cursor = start + teluguText.length
                    el.setSelectionRange(cursor, cursor)
                  } catch {
                    // ignore
                  }
                })
              }}
            />
          </div>
        </div>
      </div>
    </ThemeProvider>
  )
}
