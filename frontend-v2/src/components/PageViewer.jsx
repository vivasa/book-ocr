import { Box, Typography } from '@mui/material'

function clamp01(n) {
  const x = Number.isFinite(n) ? n : 0
  return Math.max(0, Math.min(1, x))
}

export default function PageViewer({ page, zoom = 1, lineHint = null, onLineHintChange = null }) {
  if (!page) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          No page selected
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Select a page from the left to begin.
        </Typography>
      </Box>
    )
  }

  const ratio = clamp01(lineHint?.ratio ?? 0)

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Page {page.pageNumber}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          {page.width}×{page.height}
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
        <img
          className="viewerImg"
          style={{ transform: `scale(${zoom})` }}
          src={page.previewUrl}
          alt={`Page ${page.pageNumber}`}
        />

        <Box
          className="lineRuler"
          role="slider"
          aria-label="Proofreading line indicator"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(ratio * 100)}
          onPointerDown={(e) => {
            if (!onLineHintChange) return
            const el = e.currentTarget
            el.setPointerCapture?.(e.pointerId)

            const updateFromEvent = (evt) => {
              const rect = el.getBoundingClientRect()
              const y = evt.clientY - rect.top
              const next = clamp01(y / rect.height)
              onLineHintChange(next)
            }

            updateFromEvent(e)

            const onMove = (evt) => updateFromEvent(evt)
            const onUp = () => {
              window.removeEventListener('pointermove', onMove)
              window.removeEventListener('pointerup', onUp)
            }
            window.addEventListener('pointermove', onMove)
            window.addEventListener('pointerup', onUp)
          }}
          sx={(t) => ({
            position: 'absolute',
            top: 8,
            bottom: 8,
            right: 8,
            width: 22,
            border: '1px solid',
            borderColor: 'divider',
            backgroundColor: t.palette.background.paper,
            opacity: 0.7,
            cursor: onLineHintChange ? 'ns-resize' : 'default',
            userSelect: 'none',
          })}
        >
          <Box
            sx={(t) => ({
              position: 'absolute',
              left: 2,
              right: 2,
              top: `calc(${Math.round(ratio * 1000) / 10}% - 6px)`,
              height: 12,
              border: '1px solid',
              borderColor: 'text.secondary',
              backgroundColor: t.palette.action.hover,
              boxSizing: 'border-box',
            })}
          >
            <Box
              sx={(t) => ({
                position: 'absolute',
                left: -7,
                top: -1,
                width: 0,
                height: 0,
                borderTop: '7px solid transparent',
                borderBottom: '7px solid transparent',
                borderRight: `7px solid ${t.palette.text.secondary}`,
                opacity: 0.9,
              })}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
