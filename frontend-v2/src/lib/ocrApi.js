export const ALLOWED_LANGS = [
  { value: 'tel', label: 'Telugu (tel)' },
  { value: 'kan', label: 'Kannada (kan)' },
  { value: 'hin', label: 'Hindi (hin)' },
  { value: 'eng', label: 'English (eng)' },
]

function apiBase() {
  const base = (import.meta.env?.VITE_API_BASE || '').trim()
  return base.endsWith('/') ? base.slice(0, -1) : base
}

/**
 * @param {Blob} imageBlob
 * @param {{ lang: string }} opts
 */
export async function extractText(imageBlob, opts) {
  const formData = new FormData()
  formData.append('image', imageBlob, 'page.png')

  const lang = (opts?.lang ?? 'tel').trim().toLowerCase()
  const resp = await fetch(`${apiBase()}/extract?lang=${encodeURIComponent(lang)}`, {
    method: 'POST',
    body: formData,
  })

  const payload = await resp.json().catch(() => null)

  if (!resp.ok) {
    const message = payload?.error || `OCR failed with ${resp.status}`
    const err = new Error(message)
    err.status = resp.status
    err.payload = payload
    throw err
  }

  if (!payload || payload.status !== 'success') {
    throw new Error('Unexpected OCR response')
  }

  return payload.text ?? ''
}
