import type { KaptComplexRecord, MarketIndicatorRecord, RegulationRecord, TransactionMarketRecord, TransactionMatchHint } from '../rawTypes'

export function toNumber(value: string | number | undefined, fallback = 0) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (!value) return fallback

  const parsed = Number(value.replace(/,/g, '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : fallback
}

export function toMonth(value: string | number | undefined) {
  const text = String(value ?? '').replace(/[^0-9]/g, '')

  if (text.length >= 6) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}`
  }

  return 'unknown'
}

export function createKaptRecordFromApi(item: Record<string, unknown>, fallback: Partial<KaptComplexRecord> = {}): KaptComplexRecord {
  const name = pickString(item, ['kaptName', 'kaptNm', 'complexName', 'name']) || fallback.complexName || '미상 단지'
  const legalDongCode = pickString(item, ['bjdCode', 'bjdCodeNm', 'legalDongCode']) || fallback.legalDongCode || ''
  const units = toNumber(pickString(item, ['kaptdaCnt', 'householdCount', 'units']), fallback.units ?? 0)
  const landAreaPyeong = toNumber(pickString(item, ['kaptdPcnt', 'landAreaPyeong', 'siteArea']), fallback.landAreaPyeong ?? units * 10)

  return {
    kaptCode: pickString(item, ['kaptCode']) || fallback.kaptCode,
    complexName: name,
    roadAddress: pickString(item, ['doroJuso', 'roadAddress']) || fallback.roadAddress,
    jibunAddress: pickString(item, ['kaptAddr', 'jibunAddress']) || fallback.jibunAddress || '',
    district: pickDistrict(pickString(item, ['kaptAddr', 'doroJuso']) || fallback.jibunAddress || fallback.roadAddress || ''),
    legalDongCode,
    pnu: fallback.pnu,
    lat: toNumber(pickString(item, ['lat', 'y']), fallback.lat ?? 37.56),
    lng: toNumber(pickString(item, ['lng', 'lon', 'x']), fallback.lng ?? 126.97),
    builtYear: pickYear(item, fallback.builtYear),
    units,
    landAreaPyeong,
    currentFar: toNumber(pickString(item, ['btlRatio', 'currentFar']), fallback.currentFar ?? 180),
    updatedMonth: fallback.updatedMonth ?? currentMonth(),
  }
}

export function createTransactionRecordFromTrades(
  legalDongCode: string,
  complexName: string,
  trades: Record<string, string>[],
  fallbackPreviousAssetValue = 0,
  matchHint: TransactionMatchHint = {},
): TransactionMarketRecord {
  const match = selectTransactionMatches(complexName, trades, matchHint)
  const targetTrades = match.trades.length > 0 ? match.trades : trades
  const areaPriceStats = createAreaPriceStats(targetTrades)
  const representativeStat = selectRepresentativeAreaStat(areaPriceStats, matchHint)
  const prices = targetTrades.map((trade) => getTradePrice(trade)).filter((value) => value > 0)
  const recentPrice = representativeStat?.medianPrice ?? (prices.length > 0 ? median(prices) : 0)

  return {
    legalDongCode,
    complexName,
    recentPrice,
    previousAssetValue: fallbackPreviousAssetValue || recentPrice * 0.78,
    transactionMonth: toMonth(pickString(targetTrades[0] ?? {}, ['dealYear', '년']) + pickString(targetTrades[0] ?? {}, ['dealMonth', '월']).padStart(2, '0')),
    tradeCount12m: targetTrades.length,
    representativeArea: representativeStat ? (representativeStat.minArea + representativeStat.maxArea) / 2 : undefined,
    representativeAreaRange: representativeStat?.areaRange,
    matchConfidence: match.confidence,
    matchStrategy: match.strategy,
    areaPriceStats,
  }
}

export function createMarketIndicatorRecord(district: string, newBuildPrice: number, costIndexMonth = currentMonth()): MarketIndicatorRecord {
  return {
    district,
    newBuildPrice,
    costIndexMonth,
  }
}

export function createDefaultRegulationRecord(complex: KaptComplexRecord): RegulationRecord {
  return {
    legalDongCode: complex.legalDongCode,
    complexName: complex.complexName,
    allowedFar: Math.max(250, complex.currentFar),
    stage: '검토',
    regulationRisk: '중간',
    residentMomentum: '중간',
    updatedMonth: 'unknown',
  }
}

export function createRegulationRecordFromSeoulRow(row: Record<string, unknown>): RegulationRecord | undefined {
  const complexName = pickString(row, ['APT_NM', 'HOUSE_NM', 'BLDG_NM', 'BIZ_NM', 'PROJECT_NAME', 'RGN_NM', 'PSTN_NM', 'complexName'])
  const legalDongCode = pickString(row, ['BJDONG_CD', 'LEGAL_DONG_CODE', 'legalDongCode'])
  const stageText = pickString(row, ['PROC_STEP', 'STEP_NM', 'BIZ_STEP', 'STAGE', 'RPT_TYPE', 'stage'])
  const districtText = pickString(row, ['PSTN_NM', 'RGN_NM', 'LOGVM'])
  const businessType = pickString(row, ['SCLSF', 'MCLSF', 'LCLSF'])

  if (!complexName) return undefined

  return {
    legalDongCode,
    complexName,
    allowedFar: toNumber(pickString(row, ['ALLOW_FAR', 'PLAN_FAR', 'FAR', 'allowedFar']), 250),
    stage: mapRenewalStage(stageText),
    regulationRisk: mapRisk(pickString(row, ['RISK_LEVEL', 'REGULATION_RISK', 'regulationRisk']) || businessType),
    residentMomentum: mapMomentum(pickString(row, ['MOMENTUM', 'RESIDENT_MOMENTUM', 'residentMomentum']) || stageText || districtText),
    updatedMonth: toMonth(pickString(row, ['UPDATE_DT', 'UPDT_DTTM', 'BASE_YM', 'updatedMonth'])),
  }
}

function pickString(item: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = item[key]

    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }

  return ''
}

function mapRenewalStage(value: string): RegulationRecord['stage'] {
  if (value.includes('관리처분')) return '관리처분인가'
  if (value.includes('사업시행')) return '사업시행인가'
  if (value.includes('조합')) return '조합설립'
  if (value.includes('추진')) return '추진위'

  return '검토'
}

function mapRisk(value: string): RegulationRecord['regulationRisk'] {
  if (value.includes('낮') || value.toLowerCase().includes('low')) return '낮음'
  if (value.includes('높') || value.toLowerCase().includes('high')) return '높음'

  return '중간'
}

function mapMomentum(value: string): RegulationRecord['residentMomentum'] {
  if (value.includes('낮') || value.toLowerCase().includes('low')) return '낮음'
  if (value.includes('높') || value.toLowerCase().includes('high')) return '높음'
  if (value.includes('인가') || value.includes('조합')) return '높음'

  return '중간'
}

function pickYear(item: Record<string, unknown>, fallback?: number) {
  const raw = pickString(item, ['useAprDay', 'kaptdWtime', 'builtYear', 'useApprovalDate'])
  const year = Number(raw.replace(/[^0-9]/g, '').slice(0, 4))

  return Number.isFinite(year) && year > 1900 ? year : fallback ?? 1990
}

function pickDistrict(address: string) {
  return address.split(' ').find((part) => part.endsWith('구')) ?? ''
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const midpoint = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[midpoint]
}

function createAreaPriceStats(trades: Record<string, string>[]) {
  const buckets = new Map<string, { minArea: number; maxArea: number; prices: number[]; pricePerPyeong: number[] }>()

  for (const trade of trades) {
    const price = getTradePrice(trade)
    const area = toNumber(pickString(trade, ['excluUseAr', 'exclusiveArea', '전용면적']))

    if (price <= 0 || area <= 0) continue

    const range = getAreaRange(area)
    const bucket = buckets.get(range.label) ?? {
      minArea: range.min,
      maxArea: range.max,
      prices: [],
      pricePerPyeong: [],
    }

    bucket.prices.push(price)
    bucket.pricePerPyeong.push(price / (area / 3.3058))
    buckets.set(range.label, bucket)
  }

  return [...buckets.entries()]
    .map(([areaRange, bucket]) => ({
      areaRange,
      minArea: bucket.minArea,
      maxArea: bucket.maxArea,
      tradeCount: bucket.prices.length,
      medianPrice: median(bucket.prices),
      medianPricePerPyeong: median(bucket.pricePerPyeong),
    }))
    .sort((a, b) => a.minArea - b.minArea)
}

function selectRepresentativeAreaStat(stats: ReturnType<typeof createAreaPriceStats>, hint: TransactionMatchHint = {}) {
  if (stats.length === 0) return undefined

  const preferredArea = hint.preferredExclusiveArea ?? 84
  const preferred = stats
    .filter((stat) => stat.minArea <= preferredArea && stat.maxArea >= preferredArea)
    .sort((a, b) => b.tradeCount - a.tradeCount)[0]

  if (preferred || hint.allowAreaFallback === false) return preferred

  return [...stats].sort((a, b) => b.tradeCount - a.tradeCount || Math.abs(centerArea(a) - preferredArea) - Math.abs(centerArea(b) - preferredArea))[0]
}

function getTradePrice(trade: Record<string, unknown>) {
  return toNumber(pickString(trade, ['dealAmount', '거래금액'])) / 10000
}

function getAreaRange(area: number) {
  const ranges = [
    { label: '~40㎡', min: 0, max: 40 },
    { label: '40~60㎡', min: 40, max: 60 },
    { label: '60~85㎡', min: 60, max: 85 },
    { label: '85~102㎡', min: 85, max: 102 },
    { label: '102~135㎡', min: 102, max: 135 },
    { label: '135㎡~', min: 135, max: 999 },
  ]

  return ranges.find((range) => area > range.min && area <= range.max) ?? ranges.at(-1)!
}

function centerArea(stat: { minArea: number; maxArea: number }) {
  return (stat.minArea + stat.maxArea) / 2
}

function selectTransactionMatches(complexName: string, trades: Record<string, string>[], hint: TransactionMatchHint) {
  const aliases = [complexName, ...(hint.aliases ?? [])].map(normalizeName)
  const scoredTrades = trades
    .map((trade) => ({
      trade,
      score: scoreTransactionMatch(trade, aliases, hint),
    }))
    .filter(({ score }) => score > 0)
  const strict = scoredTrades.filter(({ score }) => score >= 0.72)

  if (strict.length > 0) {
    return {
      trades: strict.map(({ trade }) => trade),
      confidence: Math.min(1, median(strict.map(({ score }) => score))),
      strategy: 'name+metadata',
    }
  }

  const nameOnly = scoredTrades.filter(({ score }) => score >= 0.48)

  if (nameOnly.length > 0) {
    return {
      trades: nameOnly.map(({ trade }) => trade),
      confidence: Math.min(0.71, median(nameOnly.map(({ score }) => score))),
      strategy: 'name-only',
    }
  }

  return {
    trades: [],
    confidence: 0,
    strategy: 'fallback-all-district-trades',
  }
}

function scoreTransactionMatch(trade: Record<string, string>, aliases: string[], hint: TransactionMatchHint) {
  const tradeName = normalizeName(pickString(trade, ['aptNm', '아파트', 'aptName']))
  const nameScore = Math.max(...aliases.map((alias) => nameSimilarity(alias, tradeName)))

  if (nameScore < 0.4) return 0

  const umdScore = hint.umdName && pickString(trade, ['umdNm', '법정동']) === hint.umdName ? 0.16 : 0
  const jibunScore = hint.jibun && normalizeJibun(pickString(trade, ['jibun', '지번'])) === normalizeJibun(hint.jibun) ? 0.18 : 0
  const builtYear = toNumber(pickString(trade, ['buildYear', '건축년도']))
  const builtYearScore = hint.builtYear && builtYear > 0 && Math.abs(builtYear - hint.builtYear) <= 2 ? 0.14 : 0

  return Math.min(1, nameScore * 0.52 + umdScore + jibunScore + builtYearScore)
}

function nameSimilarity(left: string, right: string) {
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.includes(right) || right.includes(left)) return 0.88

  const leftTokens = createTokenSet(left)
  const rightTokens = createTokenSet(right)
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length
  const union = new Set([...leftTokens, ...rightTokens]).size

  return union > 0 ? intersection / union : 0
}

function createTokenSet(value: string) {
  const tokens = new Set<string>()

  for (let index = 0; index < value.length - 1; index += 1) {
    tokens.add(value.slice(index, index + 2))
  }

  return tokens
}

function normalizeJibun(value: string) {
  return value.replace(/\s+/g, '').replace(/번지/g, '')
}

function normalizeName(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/아파트|단지|주공|차/g, '')
    .replace(/[^0-9a-z가-힣]/g, '')
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7)
}
