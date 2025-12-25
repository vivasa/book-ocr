import { useMemo, useState } from 'react'
import Sanscript from 'sanscript'
import { Box, Divider, TextField, Typography } from '@mui/material'
import { copyTextToClipboard } from '../lib/clipboard.js'
import {
  getTeluguCommonConjuncts,
  getTeluguConsonants,
  getTeluguHardExamples,
  getTeluguVowelForms,
} from '../lib/teluguUnicode.js'

function TeluguGlyphButton({ glyph, romanHint, onCopy }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={() => onCopy(glyph)}
      style={{ all: 'unset' }}
      sx={(t) => ({
        cursor: 'pointer',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0,
        px: 1,
        py: 0.75,
        display: 'grid',
        alignContent: 'center',
        justifyItems: 'center',
        gap: 0.25,
        backgroundColor: 'background.paper',
        '&:hover': { backgroundColor: t.palette.action.hover },
        '&:active': { backgroundColor: t.palette.action.selected },
      })}
    >
      <Typography
        variant="h6"
        sx={{
          lineHeight: 1.1,
          fontFamily:
            '"Timmana", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        }}
      >
        {glyph}
      </Typography>
      <Typography variant="caption" sx={{ opacity: 0.75, lineHeight: 1.2 }}>
        {romanHint}
      </Typography>
    </Box>
  )
}

function TeluguExampleButton({ glyph, typeHint, romanHint, onCopy }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={() => onCopy(glyph)}
      style={{ all: 'unset' }}
      sx={(t) => ({
        cursor: 'pointer',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 0,
        px: 1,
        py: 0.75,
        display: 'grid',
        alignContent: 'center',
        justifyItems: 'center',
        gap: 0.25,
        backgroundColor: 'background.paper',
        '&:hover': { backgroundColor: t.palette.action.hover },
        '&:active': { backgroundColor: t.palette.action.selected },
      })}
    >
      <Typography
        variant="h6"
        sx={{
          lineHeight: 1.1,
          fontFamily:
            '"Timmana", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        }}
      >
        {glyph}
      </Typography>
      {typeHint ? (
        <Typography
          variant="caption"
          sx={{ opacity: 0.85, lineHeight: 1.2, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        >
          Type: {typeHint}
        </Typography>
      ) : null}
      {romanHint ? (
        <Typography variant="caption" sx={{ opacity: 0.65, lineHeight: 1.2 }}>
          Roman: {romanHint}
        </Typography>
      ) : null}
    </Box>
  )
}

export default function LanguageHelpPane({ lang, scheme = 'itrans' }) {
  const [copiedLabel, setCopiedLabel] = useState('')
  const [romanQuery, setRomanQuery] = useState('')

  const teluguConsonants = useMemo(() => getTeluguConsonants(), [])
  const teluguCommonConjuncts = useMemo(() => getTeluguCommonConjuncts(), [])
  const teluguHardExamples = useMemo(() => getTeluguHardExamples(), [])

  const consonants = lang === 'tel' ? teluguConsonants : []

  const consonantCards = useMemo(() => {
    return consonants.map((c) => {
      let roman = ''
      try {
        roman = Sanscript.t(c, 'telugu', scheme)
      } catch {
        roman = ''
      }
      return { glyph: c, roman }
    })
  }, [consonants, scheme])

  const conjunctCards = useMemo(() => {
    if (lang !== 'tel') return []
    return teluguCommonConjuncts.map((glyph) => {
      let roman = ''
      try {
        roman = Sanscript.t(glyph, 'telugu', scheme)
      } catch {
        roman = ''
      }
      return { glyph, roman }
    })
  }, [lang, scheme, teluguCommonConjuncts])

  const hardExampleCards = useMemo(() => {
    if (lang !== 'tel') return []
    return teluguHardExamples.map((ex) => {
      const glyph = ex?.glyph
      const typeHint = ex?.type?.[scheme] ?? ''
      let roman = ''
      try {
        roman = Sanscript.t(glyph, 'telugu', scheme)
      } catch {
        roman = ''
      }
      return { glyph, typeHint, roman }
    })
  }, [lang, scheme, teluguHardExamples])

  const suggestions = useMemo(() => {
    if (lang !== 'tel') return []
    const q = String(romanQuery ?? '').trim()
    if (!q) return []
    const qLower = q.toLowerCase()

    const out = []
    const seen = new Set()

    const push = (item) => {
      if (!item?.glyph) return
      if (seen.has(item.glyph)) return
      seen.add(item.glyph)
      out.push(item)
    }

    // 0) Direct transliteration of the query (what the user likely intends).
    // Example: in ITRANS, typing "no" yields "నో".
    const variants = [q, `${q}M`, `${q}H`]
    for (const v of variants) {
      try {
        const glyph = Sanscript.t(v, scheme, 'telugu')
        if (!glyph) continue
        if (!/\p{Script=Telugu}/u.test(glyph)) continue
        push({ glyph, typeHint: v, roman: v })
      } catch {
        // ignore
      }
    }

    // 0.5) If the query maps to a *single consonant*, show its full vowel-form set.
    // This supports the UX: typing "n" should offer న, నా, ని, నీ, ను, నూ, ...
    try {
      const raw = Sanscript.t(q, scheme, 'telugu')
      const virama = '\u0C4D'

      // Sanscript often emits a trailing virama for a bare consonant key (e.g., "n" => "న్").
      // Normalize "C + virama" to the base consonant "C" for vowel-form expansion.
      let base = raw
      if (typeof raw === 'string' && raw.length === 2 && raw[1] === virama) {
        base = raw[0]
      }

      if (typeof base === 'string' && base.length === 1 && /\p{Script=Telugu}/u.test(base) && teluguConsonants.includes(base)) {
        for (const vf of getTeluguVowelForms(base)) {
          let hint = ''
          try {
            hint = Sanscript.t(vf.glyph, 'telugu', scheme)
          } catch {
            hint = ''
          }
          // Prefer showing how to type it in the current scheme.
          push({ glyph: vf.glyph, typeHint: hint || vf.label || '', roman: hint })
        }
      }
    } catch {
      // ignore
    }

    // 1) Exact/explicit typing hints (best signal)
    for (const ex of hardExampleCards) {
      const key = String(ex.typeHint || '').toLowerCase()
      if (key && key.startsWith(qLower)) push({ glyph: ex.glyph, typeHint: ex.typeHint, roman: ex.roman })
    }

    // 2) Consonants by prefix match of their roman rendering
    for (const c of consonantCards) {
      const key = String(c.roman || '').toLowerCase()
      if (key && key.startsWith(qLower)) push({ glyph: c.glyph, typeHint: c.roman, roman: c.roman })
    }

    // 3) Curated conjuncts by prefix match
    for (const c of conjunctCards) {
      const key = String(c.roman || '').toLowerCase()
      if (key && key.startsWith(qLower)) push({ glyph: c.glyph, typeHint: c.roman, roman: c.roman })
    }

    // Keep it compact.
    return out.slice(0, 30)
  }, [lang, romanQuery, hardExampleCards, consonantCards, conjunctCards, scheme, teluguConsonants])

  async function onCopy(glyph) {
    const ok = await copyTextToClipboard(glyph)
    setCopiedLabel(ok ? glyph : '')
    window.clearTimeout(onCopy._t)
    onCopy._t = window.setTimeout(() => setCopiedLabel(''), 900)
  }

  if (lang !== 'tel') {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Language Help
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          Language Help is currently implemented for Telugu only.
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Telugu consonants
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          Click any glyph to copy.
        </Typography>
        <Box sx={{ flex: 1 }} />
        {copiedLabel ? (
          <Typography variant="caption" sx={{ opacity: 0.85 }}>
            Copied: <span style={{ fontFamily: '"Timmana", system-ui' }}>{copiedLabel}</span>
          </Typography>
        ) : null}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: 1 }}>
        {consonantCards.map((c) => (
          <TeluguGlyphButton
            key={c.glyph}
            glyph={c.glyph}
            romanHint={c.roman}
            onCopy={onCopy}
          />
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Vowel forms
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
        Using scheme: <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>{scheme}</span>.
        Type a base consonant (e.g., <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>n</span>) to see its vowel forms (న, నా, ని, నీ, …). Click any option to copy.
      </Typography>

      <Box sx={{ display: 'grid', gap: 1, mb: 1 }}>
        <TextField
          size="small"
          value={romanQuery}
          onChange={(e) => setRomanQuery(e.target.value)}
          placeholder={scheme === 'itrans' ? 'e.g., ~Nma (for ఙ్మ)' : scheme === 'hk' ? 'e.g., Gma' : 'e.g., ṅma'}
          fullWidth
          inputProps={{
            style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
            'aria-label': 'Type-to-suggest input',
          }}
        />
      </Box>

      {suggestions.length ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 1 }}>
          {suggestions.map((s) => (
            <TeluguExampleButton
              key={s.glyph}
              glyph={s.glyph}
              typeHint={s.typeHint}
              romanHint={''}
              onCopy={onCopy}
            />
          ))}
        </Box>
      ) : romanQuery.trim() ? (
        <Typography variant="body2" sx={{ opacity: 0.75 }}>
          No suggestions yet.
        </Typography>
      ) : null}

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Conjunct helpers (common)
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
        A curated set of common conjuncts/clusters. Click any glyph to copy.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: 1,
          maxHeight: 260,
          overflow: 'auto',
          pr: 0.5,
        }}
      >
        {conjunctCards.map((c) => (
          <TeluguGlyphButton
            key={c.glyph}
            glyph={c.glyph}
            romanHint={c.roman}
            onCopy={onCopy}
          />
        ))}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Hard examples
      </Typography>
      <Typography variant="body2" sx={{ opacity: 0.8, mb: 1 }}>
        Real-world examples that are easy to miss in OCR. Click to copy.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 1 }}>
        {hardExampleCards.map((c) => (
          <TeluguExampleButton
            key={c.glyph}
            glyph={c.glyph}
            typeHint={c.typeHint}
            romanHint={c.roman}
            onCopy={onCopy}
          />
        ))}
      </Box>
    </Box>
  )
}
