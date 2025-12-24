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

export default function PageStrip({ pages, selectedPageId, onSelectPage }) {
  return (
    <List dense sx={{ px: 1 }}>
      {pages.map((p) => (
        <ListItemButton
          key={p.id}
          selected={p.id === selectedPageId}
          onClick={() => onSelectPage?.(p.id)}
          sx={{ borderRadius: 2, mb: 0.5 }}
        >
          <ListItemAvatar>
            <Avatar variant="rounded" src={p.previewUrl} alt={`Page ${p.pageNumber}`} />
          </ListItemAvatar>
          <ListItemText
            primary={<Typography variant="subtitle2">Page {p.pageNumber}</Typography>}
            secondary={
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 0 }}>
                <Chip size="small" label={statusLabel(p.status)} />
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
