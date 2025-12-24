import { Box, Typography } from '@mui/material'

export default function PageViewer({ page, zoom = 1 }) {
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

      <img
        className="viewerImg"
        style={{ transform: `scale(${zoom})` }}
        src={page.previewUrl}
        alt={`Page ${page.pageNumber}`}
      />
    </Box>
  )
}
