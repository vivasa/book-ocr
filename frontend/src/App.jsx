import { useMemo, useState } from 'react'
import Sanscript from 'sanscript'
import './App.css'

const LANG_OPTIONS = [
  { value: 'tel', label: 'Telugu (tel)' },
  { value: 'kan', label: 'Kannada (kan)' },
  { value: 'hin', label: 'Hindi / Devanagari (hin)' },
  { value: 'eng', label: 'English (eng)' },
]

function App() {
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [lang, setLang] = useState('tel')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [romanInput, setRomanInput] = useState('')
  const [correctionCopied, setCorrectionCopied] = useState(false)

  const teluguText = useMemo(() => {
    const input = (romanInput || '').trim()
    if (!input) return ''

    // Default to ITRANS since it’s commonly used for Indian transliteration.
    // Note: users may need to type explicit long vowels where necessary.
    try {
      return Sanscript.t(input, 'itrans', 'telugu')
    } catch {
      return ''
    }
  }, [romanInput])

  const canSubmit = useMemo(() => !!file && !isLoading, [file, isLoading])

  async function onExtract() {
    if (!file) return

    setIsLoading(true)
    setError('')
    setText('')

    try {
      const form = new FormData()
      form.append('image', file)

      const resp = await fetch(`/extract?lang=${encodeURIComponent(lang)}`, {
        method: 'POST',
        body: form,
      })

      const data = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        throw new Error(data?.error || `Request failed (${resp.status})`)
      }
      setText(data?.text ?? '')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function onCopyCorrection() {
    try {
      await navigator.clipboard.writeText(teluguText)
      setCorrectionCopied(true)
      window.setTimeout(() => setCorrectionCopied(false), 1200)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function onAppendCorrection() {
    if (!teluguText) return
    setText((prev) => {
      if (!prev) return teluguText
      const needsSpace = prev.endsWith(' ') || prev.endsWith('\n')
      return needsSpace ? `${prev}${teluguText}` : `${prev} ${teluguText}`
    })
  }

  function onDownload() {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ocr_${lang}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function onFileChange(e) {
    const next = e.target.files?.[0] || null
    setFile(next)
    setText('')
    setError('')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(next ? URL.createObjectURL(next) : null)
  }

  return (
    <div className="page">
      <header className="header">
        <h1>OCR Review</h1>
        <p className="subtitle">Upload an image, extract text, then edit it.</p>
      </header>

      <section className="panel">
        <div className="controls">
          <label className="field">
            <span className="label">Image</span>
            <input type="file" accept="image/*" onChange={onFileChange} />
          </label>

          <label className="field">
            <span className="label">OCR language</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)}>
              {LANG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <button className="primary" disabled={!canSubmit} onClick={onExtract}>
            {isLoading ? 'Extracting…' : 'Extract Text'}
          </button>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div className="grid">
          <div className="card">
            <div className="cardTitle">Image</div>
            {previewUrl ? (
              <img className="preview" src={previewUrl} alt="preview" />
            ) : (
              <div className="placeholder">Choose an image to preview</div>
            )}
          </div>

          <div className="card">
            <div className="cardTitle">Extracted text (editable)</div>
            <textarea
              className="textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Extracted text will appear here"
              rows={14}
            />
            <div className="actions">
              <button className="secondary" disabled={!text} onClick={onCopy}>
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button className="secondary" disabled={!text} onClick={onDownload}>
                Download .txt
              </button>
              <div className="meta">Characters: {text.length}</div>
            </div>
          </div>

          <div className="card">
            <div className="cardTitle">Correction (English → Telugu)</div>
            <input
              className="input"
              value={romanInput}
              onChange={(e) => setRomanInput(e.target.value)}
              placeholder="Type in English/romanized Telugu (ITRANS style)…"
            />

            <div className="output" aria-label="Telugu output">
              {teluguText || <span className="muted">Telugu transliteration will appear here</span>}
            </div>

            <div className="actions">
              <button className="secondary" disabled={!teluguText} onClick={onCopyCorrection}>
                {correctionCopied ? 'Copied' : 'Copy Telugu'}
              </button>
              <button className="secondary" disabled={!teluguText} onClick={onAppendCorrection}>
                Append to extracted text
              </button>
              <div className="meta">Characters: {teluguText.length}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default App
