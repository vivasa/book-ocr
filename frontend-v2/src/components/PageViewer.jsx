import { Box, Typography } from '@mui/material'

function isEventFromRulerTarget(target) {
  try {
    return Boolean(target?.closest?.('.lineRuler'))
  } catch {
    return false
  }
}

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
  const thumbHeight = 28
  const thumbHalf = Math.round(thumbHeight / 2)

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
        {/* Scale the page and overlays together so the cue stays aligned when zooming. */}
        <Box
          sx={{ position: 'relative', transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          onPointerDown={(e) => {
            if (!onLineHintChange) return
            if (isEventFromRulerTarget(e.target)) return

            const el = e.currentTarget
            const rect = el.getBoundingClientRect()
            const y = e.clientY - rect.top
            const next = clamp01(y / rect.height)
            onLineHintChange(next)
          }}
          role={onLineHintChange ? 'application' : undefined}
          aria-label={onLineHintChange ? 'Page viewer (click to move line indicator)' : undefined}
        >
          <img className="viewerImg" src={page.previewUrl} alt={`Page ${page.pageNumber}`} />

          {/* Horizontal cue line across the page width */}
          <Box
            sx={(t) => ({
              position: 'absolute',
              left: 0,
              right: 0,
              top: `${Math.round(ratio * 1000) / 10}%`,
              height: 2,
              backgroundColor: t.palette.error.main,
              opacity: 0.9,
              pointerEvents: 'none',
            })}
          />

          {/* Vertical ruler/scrollbar track with thumb handle */}
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
              width: 18,
              border: '1px solid',
              borderColor: 'divider',
              backgroundColor: t.palette.background.paper,
              opacity: 0.75,
              cursor: onLineHintChange ? 'ns-resize' : 'default',
              userSelect: 'none',
            })}
          >
            <Box
              sx={(t) => ({
                position: 'absolute',
                left: 2,
                right: 2,
                top: `calc(${Math.round(ratio * 1000) / 10}% - ${thumbHalf}px)`,
                height: thumbHeight,
                border: '1px solid',
                borderColor: 'divider',
                backgroundColor: t.palette.action.selected,
                boxSizing: 'border-box',
                display: 'grid',
                placeItems: 'center',
              })}
            >
              {/* Grip */}
              <Box
                sx={{
                  width: 10,
                  display: 'grid',
                  gap: 2,
                  opacity: 0.85,
                }}
              >
                <Box sx={(t) => ({ height: 1, backgroundColor: t.palette.text.secondary })} />
                <Box sx={(t) => ({ height: 1, backgroundColor: t.palette.text.secondary })} />
                <Box sx={(t) => ({ height: 1, backgroundColor: t.palette.text.secondary })} />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
