const TELUGU_BLOCK_START = 0x0c00
const TELUGU_BLOCK_END = 0x0c7f

const SCRIPT_TELUGU_RE = /\p{Script=Telugu}/u
const LETTER_RE = /\p{Letter}/u

function isTeluguConsonantCodePoint(cp) {
  // In the Telugu block, consonants are the letter set excluding:
  // - independent vowels: U+0C05..U+0C14
  // - avagraha: U+0C3D
  // - vocalic letters: U+0C60..U+0C61
  if (cp >= 0x0c05 && cp <= 0x0c14) return false
  if (cp === 0x0c3d) return false
  if (cp >= 0x0c60 && cp <= 0x0c61) return false
  return true
}

export function getTeluguConsonants() {
  const consonants = []
  for (let cp = TELUGU_BLOCK_START; cp <= TELUGU_BLOCK_END; cp += 1) {
    const ch = String.fromCharCode(cp)
    if (!SCRIPT_TELUGU_RE.test(ch)) continue
    if (!LETTER_RE.test(ch)) continue
    if (!isTeluguConsonantCodePoint(cp)) continue
    consonants.push(ch)
  }
  return consonants
}

export function makeTeluguConjunct(c1, c2) {
  const virama = '\u0C4D'
  return `${c1}${virama}${c2}`
}

export function getTeluguVowelForms(consonant) {
  const base = String(consonant || '')
  if (!base) return []

  // Dependent vowel signs (matras) applied to a consonant.
  const SIGNS = [
    // a (inherent) — no sign
    { name: 'a', sign: '' },
    { name: 'ā', sign: '\u0C3E' },
    { name: 'i', sign: '\u0C3F' },
    { name: 'ī', sign: '\u0C40' },
    { name: 'u', sign: '\u0C41' },
    { name: 'ū', sign: '\u0C42' },
    { name: 'ṛ', sign: '\u0C43' },
    { name: 'ṝ', sign: '\u0C44' },
    { name: 'e', sign: '\u0C46' },
    { name: 'ē', sign: '\u0C47' },
    { name: 'ai', sign: '\u0C48' },
    { name: 'o', sign: '\u0C4A' },
    { name: 'ō', sign: '\u0C4B' },
    { name: 'au', sign: '\u0C4C' },
  ]

  const virama = '\u0C4D'
  const anusvara = '\u0C02'
  const visarga = '\u0C03'

  const out = []
  for (const s of SIGNS) {
    out.push({ glyph: `${base}${s.sign}`, label: s.name })
  }

  // Optional extras often useful in proofreading.
  out.push({ glyph: `${base}${virama}`, label: 'virāma' })
  out.push({ glyph: `${base}${anusvara}`, label: 'anusvāra' })
  out.push({ glyph: `${base}${visarga}`, label: 'visarga' })

  // De-dupe while preserving order.
  const seen = new Set()
  return out.filter((x) => {
    if (!x?.glyph) return false
    if (seen.has(x.glyph)) return false
    seen.add(x.glyph)
    return true
  })
}

export function makeTeluguCluster(consonants) {
  const virama = '\u0C4D'
  const parts = Array.from(consonants || []).filter(Boolean)
  if (parts.length === 0) return ''
  if (parts.length === 1) return String(parts[0])
  return parts.map(String).join(virama)
}

export function getTeluguCommonConjuncts() {
  // Curated list of common conjuncts/clusters for proofreading.
  // Keep this list small and practical; the goal is “helpful examples”, not exhaustiveness.
  const pairs = [
    ['క', 'క'],
    ['ప', 'ప'],
    ['త', 'త'],
    ['న', 'న'],
    ['మ', 'మ'],
    ['ల', 'ల'],
    ['స', 'స'],

    ['క', 'ర'],
    ['గ', 'ర'],
    ['ప', 'ర'],
    ['బ', 'ర'],
    ['ద', 'ర'],
    ['త', 'ర'],
    ['శ', 'ర'],
    ['స', 'ర'],

    ['స', 'త'],
    ['స', 'థ'],
    ['స', 'ప'],
    ['స', 'క'],
    ['స', 'ట'],

    ['క', 'ష'], // క్ష
    ['జ', 'ఞ'], // జ్ఞ
  ]

  const clusters = [
    ['స', 'త', 'ర'], // స్త్ర
    ['శ', 'ర', 'మ'], // శ్ర్మ (rare but seen in OCR noise; helps users recognize virama stacking)
  ]

  const out = []
  for (const [a, b] of pairs) {
    out.push(makeTeluguConjunct(a, b))
  }
  for (const seq of clusters) {
    const glyph = makeTeluguCluster(seq)
    if (glyph) out.push(glyph)
  }

  // De-dupe while preserving order.
  return [...new Set(out)]
}

export function getTeluguHardExamples() {
  // A few real-world “hard to recognize/type” examples.
  // These are copy-only helpers, but we also provide scheme-specific *typing* hints.
  // Note: these are intended for Sanscript's transliteration schemes.
  return [
    {
      glyph: 'ఙ్మ',
      type: {
        itrans: '~Nma',
        hk: 'Gma',
        iast: 'ṅma',
      },
    },
    {
      glyph: 'వాఙ్మయ',
      type: {
        itrans: 'vA~Nmaya',
        hk: 'vAGmaya',
        iast: 'vāṅmaya',
      },
    },
  ]
}
