import { useMemo, useState } from 'react'
import Sanscript from 'sanscript'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBroom, faCopy, faRightToBracket } from '@fortawesome/free-solid-svg-icons'
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

export default function TransliterationDock({
  onInsert,
  seedRoman = '',
  seedTelugu = '',
  scheme: controlledScheme,
  onSchemeChange,
}) {
  const [internalScheme, setInternalScheme] = useState('itrans')
  const scheme = controlledScheme ?? internalScheme
  const setScheme = onSchemeChange ?? setInternalScheme
  const [romanOverride, setRomanOverride] = useState('')
  const [romanOverrideSeedTelugu, setRomanOverrideSeedTelugu] = useState('')
  const [romanOverrideActive, setRomanOverrideActive] = useState(false)

  const normalizedSeedTelugu = String(seedTelugu ?? '').trim()
  const normalizedSeedRoman = String(seedRoman ?? '')

  // Manual override is only considered active for the *same* seedTelugu that was present
  // when the user last edited/cleared the Roman input.
  const overrideActiveForCurrentSeed =
    romanOverrideActive && romanOverrideSeedTelugu === normalizedSeedTelugu

  const romanFromSeedTelugu = useMemo(() => {
    if (!normalizedSeedTelugu) return ''
    try {
      return Sanscript.t(normalizedSeedTelugu, 'telugu', scheme)
    } catch {
      return ''
    }
  }, [normalizedSeedTelugu, scheme])

  const romanValue =
    normalizedSeedTelugu && !overrideActiveForCurrentSeed
      ? romanFromSeedTelugu
      : romanOverride || normalizedSeedRoman

  const telugu = useMemo(() => {
    const input = romanValue ?? ''
    if (!input.trim()) return ''
    try {
      return Sanscript.t(input, scheme, 'telugu')
    } catch {
      return ''
    }
  }, [romanValue, scheme])

  const previewTelugu =
    normalizedSeedTelugu && !overrideActiveForCurrentSeed ? normalizedSeedTelugu : telugu

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
            value={romanValue}
            onChange={(e) => {
              setRomanOverrideActive(true)
              setRomanOverrideSeedTelugu(normalizedSeedTelugu)
              setRomanOverride(e.target.value)
            }}
            placeholder="e.g., rAmuDu, nIvu, telugu"
            fullWidth
          />
          <TextField
            label="Preview"
            value={previewTelugu || ''}
            fullWidth
            multiline
            minRows={2}
            InputProps={{ readOnly: true }}
            placeholder="(preview)"
            sx={{
              '& .MuiInputBase-input': {
                fontFamily: '"Timmana", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
                fontSize: 20,
                lineHeight: 1.5,
              },
            }}
          />
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              onClick={() => {
                if (!previewTelugu) return
                onInsert?.(previewTelugu)
              }}
              disabled={!previewTelugu}
              startIcon={<FontAwesomeIcon icon={faRightToBracket} />}
            >
              Insert at cursor
            </Button>
            <Button
              variant="outlined"
              onClick={async () => {
                if (!previewTelugu) return
                await navigator.clipboard.writeText(previewTelugu)
              }}
              disabled={!previewTelugu || !navigator.clipboard}
              startIcon={<FontAwesomeIcon icon={faCopy} />}
            >
              Copy
            </Button>
            <Button
              variant="text"
              onClick={() => {
                setRomanOverrideActive(true)
                setRomanOverrideSeedTelugu(normalizedSeedTelugu)
                setRomanOverride('')
              }}
              disabled={!romanValue && !normalizedSeedTelugu}
              startIcon={<FontAwesomeIcon icon={faBroom} />}
            >
              Clear
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
