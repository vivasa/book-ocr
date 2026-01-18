import * as pdfjsLib from 'pdfjs-dist'

// pdfjs worker: use the bundled worker entry. Vite will handle it.
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker

/**
 * @param {File} file
 * @returns {Promise<Array<{pageNumber:number, blob:Blob, width:number, height:number}>>}
 */
export async function pdfToPagePngBlobs(file) {
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
  const pdf = await loadingTask.promise

  const results = []
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i)

    // Render at 2x scale for OCR quality.
    const viewport = page.getViewport({ scale: 2 })

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas not supported')

    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)

    await page.render({ canvasContext: context, viewport }).promise

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (!b) reject(new Error('Failed to create image blob'))
        else resolve(b)
      }, 'image/png')
    })

    results.push({ pageNumber: i, blob, width: canvas.width, height: canvas.height })
  }

  return results
}
