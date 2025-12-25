import {
  Avatar,
  Box,
  Chip,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material'

function statusLabel(status) {
  if (status === 'processing') return 'processing'
  if (status === 'done') return 'done'
  if (status === 'error') return 'error'
  return 'new'
}

function statusChipColor(status) {
  if (status === 'done') return 'success'
  if (status === 'error') return 'error'
  if (status === 'processing') return 'warning'
  return 'default'
}

export default function PageStrip({ pages, selectedPageId, onSelectPage }) {
  return (
    <List dense sx={{ px: 1 }}>
      {pages.map((p, idx) => (
        <ListItemButton
          key={p.id}
          selected={p.id === selectedPageId}
          onClick={() => onSelectPage?.(p.id)}
          sx={(t) => {
            const isSelected = p.id === selectedPageId
            const zebra = idx % 2 === 0 ? t.palette.action.hover : 'transparent'
            return {
              borderRadius: 0,
              mb: 0.5,
              backgroundColor: isSelected ? t.palette.action.selected : zebra,
              border: '1px solid',
              borderColor: isSelected ? t.palette.primary.main : 'transparent',
              '&:hover': {
                backgroundColor: isSelected ? t.palette.action.selected : t.palette.action.hover,
              },
            }
          }}
        >
          <ListItemAvatar>
            <Avatar variant="rounded" src={p.previewUrl} alt={`Page ${p.pageNumber}`} />
          </ListItemAvatar>
          <ListItemText
            primary={<Typography variant="subtitle2">Page {p.pageNumber}</Typography>}
            secondary={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 0 }}>
                <Chip size="small" color={statusChipColor(p.status)} label={statusLabel(p.status)} />
                {p.ocrText ? (
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.75,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {(p.ocrText || '').slice(0, 28)}…
                  </Typography>
                ) : null}
              </Box>
            }
          />
        </ListItemButton>
      ))}
      {pages.length === 0 ? (
        <Box sx={{ p: 1.5 }}>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            No pages yet.
          </Typography>
        </Box>
      ) : null}
    </List>
  )
}
