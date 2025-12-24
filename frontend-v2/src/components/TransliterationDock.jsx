import { useMemo, useState } from 'react'
import Sanscript from 'sanscript'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'

const SCHEMES = [
  { value: 'itrans', label: 'ITRANS' },
  { value: 'hk', label: 'Harvard-Kyoto' },
  { value: 'iast', label: 'IAST' },
]

export default function TransliterationDock({ onInsert }) {
  const [scheme, setScheme] = useState('itrans')
  const [roman, setRoman] = useState('')

  const telugu = useMemo(() => {
    const input = roman ?? ''
    if (!input.trim()) return ''
    try {
      return Sanscript.t(input, scheme, 'telugu')
    } catch {
      return ''
    }
  }, [roman, scheme])

  return (
    <Card variant="outlined" sx={{ m: 2 }}>
      <CardHeader
        title="Transliteration"
        action={
          <Select size="small" value={scheme} onChange={(e) => setScheme(e.target.value)}>
            {SCHEMES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </Select>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <Stack spacing={1.25}>
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            Type Roman text, insert Telugu at cursor:
          </Typography>
          <TextField
            size="small"
            value={roman}
            onChange={(e) => setRoman(e.target.value)}
            placeholder="e.g., rAmuDu, nIvu, telugu"
            fullWidth
          />
          <TextField
            label="Preview"
            value={telugu || ''}
            fullWidth
            multiline
            minRows={2}
            InputProps={{ readOnly: true }}
            placeholder="(preview)"
          />
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={() => {
                if (!telugu) return
                onInsert?.(telugu)
              }}
              disabled={!telugu}
            >
              Insert at cursor
            </Button>
            <Button
              variant="outlined"
              onClick={async () => {
                if (!telugu) return
                await navigator.clipboard.writeText(telugu)
              }}
              disabled={!telugu || !navigator.clipboard}
            >
              Copy
            </Button>
            <Button variant="text" onClick={() => setRoman('')} disabled={!roman}>
              Clear
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
