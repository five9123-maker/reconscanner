type SearchableComplexName = {
  name: string
  aliases: string[]
  searchTokens?: string[]
}

export function createSearchTokens(name: string, aliases: string[] = []) {
  return [...new Set([name, ...aliases, ...createDerivedAliases(name), ...aliases.flatMap((alias) => createDerivedAliases(alias))].map(normalizeSearchText).filter(Boolean))]
}

export function rankComplexNameMatch(item: SearchableComplexName, query: string) {
  const normalizedQuery = normalizeSearchText(query)
  const initialQuery = getHangulInitials(normalizedQuery)

  if (!normalizedQuery) return 1

  const tokens = item.searchTokens?.length ? item.searchTokens : createSearchTokens(item.name, item.aliases)
  let bestScore = 0

  for (const token of tokens) {
    const initials = getHangulInitials(token)

    if (token === normalizedQuery) bestScore = Math.max(bestScore, 100)
    else if (token.startsWith(normalizedQuery)) bestScore = Math.max(bestScore, 82)
    else if (token.includes(normalizedQuery)) bestScore = Math.max(bestScore, 64)
    else if (initials === initialQuery) bestScore = Math.max(bestScore, 58)
    else if (initials.startsWith(initialQuery)) bestScore = Math.max(bestScore, 46)
  }

  return bestScore
}

export function normalizeSearchText(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/아파트|apt|단지/g, '')
}

function createDerivedAliases(value: string) {
  const normalized = normalizeSearchText(value)
  const number = normalized.match(/\d+/)?.[0]
  const aliases = [normalized]

  if (number) {
    const compactRules: Array<[RegExp, string[]]> = [
      [/잠실주공/, [`잠실${number}`, `잠주${number}`]],
      [/상계주공/, [`상계${number}`, `상주${number}`]],
      [/목동신시가지/, [`목동${number}`, `목${number}`, `목신${number}`]],
      [/압구정현대/, [`압현${number}`, `현대${number}`]],
      [/대치우성/, [`대우${number}`, `우성${number}`]],
      [/중동은하마을/, [`은하${number}`]],
      [/중동한라마을/, [`한라${number}`]],
      [/후곡마을/, [`후곡${number}`]],
      [/강촌마을/, [`강촌${number}`]],
      [/까치마을/, [`까치${number}`]],
      [/샘마을/, [`샘${number}`]],
      [/꿈마을/, [`꿈${number}`]],
    ]

    for (const [pattern, values] of compactRules) {
      if (pattern.test(normalized)) aliases.push(...values)
    }
  }

  aliases.push(getHangulInitials(normalized))

  return aliases
}

function getHangulInitials(value: string) {
  const initials = [
    'ㄱ',
    'ㄲ',
    'ㄴ',
    'ㄷ',
    'ㄸ',
    'ㄹ',
    'ㅁ',
    'ㅂ',
    'ㅃ',
    'ㅅ',
    'ㅆ',
    'ㅇ',
    'ㅈ',
    'ㅉ',
    'ㅊ',
    'ㅋ',
    'ㅌ',
    'ㅍ',
    'ㅎ',
  ]

  return [...value]
    .map((char) => {
      const code = char.charCodeAt(0)
      if (code < 0xac00 || code > 0xd7a3) return char

      return initials[Math.floor((code - 0xac00) / 588)]
    })
    .join('')
}
