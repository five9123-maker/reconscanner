import { complexes } from '../data/complexes'
import { formatApiError } from './api/errors'
import { fetchKaptLegalDongComplexList } from './api/kaptClient'
import { createDefaultRegulationRecord, createMarketIndicatorRecord } from './api/mappers'
import { createTransactionRecordFromTrades } from './api/mappers'
import { fetchSeoulRenewalXmlRows, mapSeoulRenewalRows } from './api/seoulRenewalClient'
import { createDealMonthWindow, fetchApartmentTrades } from './api/molitTradeClient'
import { defaultPublicApiConfig, type PublicApiConfig } from './api/config'
import { findBestKaptMatch, type KaptMatchResult } from './kaptMatcher'
import { matchRenewalRecord, type RenewalMatchResult } from './renewalMatcher'
import { estimateNewBuildPrice } from '../lib/newBuildPrice'
import type { FetchLike } from './api/http'
import type { EtlInput } from './runEtl'

export type PublicFetchTarget = {
  complexId: string
  dealMonth: string
  transactionLookbackMonths?: number
}

export type PublicFetchResult = {
  input: EtlInput
  skippedSources: string[]
  kaptMatches: KaptMatchResult[]
  renewalMatches: RenewalMatchResult[]
}

export async function fetchPublicEtlInput(
  targets: PublicFetchTarget[],
  config: PublicApiConfig = defaultPublicApiConfig,
  fetcher?: FetchLike,
): Promise<PublicFetchResult> {
  const selectedComplexes = targets
    .map((target) => complexes.find((complex) => complex.id === target.complexId || complex.identifiers.complexId === target.complexId))
    .filter((complex) => complex !== undefined)
  const skippedSources: string[] = []
  const kaptMatches = await fetchKaptMatches(selectedComplexes, config, fetcher, skippedSources)
  const tradeCache = new Map<string, Promise<Record<string, string>[]>>()
  const physical = selectedComplexes.map((complex) => ({
    appId: complex.id,
    stableComplexId: complex.identifiers.complexId,
    kaptCode: kaptMatches.find((match) => match.complexId === complex.id && match.matched)?.kaptCode ?? complex.identifiers.kaptCode,
    complexName: complex.name,
    roadAddress: complex.identifiers.roadAddress,
    jibunAddress: complex.identifiers.jibunAddress,
    district: complex.district,
    legalDongCode: complex.legalDongCode,
    pnu: complex.identifiers.pnu,
    lat: complex.identifiers.lat,
    lng: complex.identifiers.lng,
    builtYear: complex.builtYear,
    units: complex.units,
    landAreaPyeong: complex.landShare * complex.units,
    currentFar: complex.currentFar,
    updatedMonth: complex.sourceFreshness.physicalInfo,
  }))

  const transactions = []

  for (const complex of selectedComplexes) {
    const target = targets.find((item) => item.complexId === complex.id || item.complexId === complex.identifiers.complexId)
    const latestDealMonth = target?.dealMonth ?? currentDealMonth()
    const lookbackMonths = target?.transactionLookbackMonths ?? 6
    const dealMonths = createDealMonthWindow(latestDealMonth, lookbackMonths)
    const lawdCode = complex.legalDongCode.slice(0, 5)

    try {
      const trades = []

      for (const dealMonth of dealMonths) {
        const cacheKey = `${lawdCode}-${dealMonth}`
        const cached = tradeCache.get(cacheKey)

        if (cached) {
          trades.push(...(await cached))
          continue
        }

        const request = fetchApartmentTrades(lawdCode, dealMonth, config, fetcher)
        tradeCache.set(cacheKey, request)
        trades.push(...(await request))
      }

      const record = createTransactionRecordFromTrades(
        complex.legalDongCode,
        complex.name,
        trades,
        complex.previousAssetValue,
        {
          aliases: complex.aliases,
          umdName: extractDongName(complex.identifiers.jibunAddress),
          jibun: extractJibun(complex.identifiers.jibunAddress),
          builtYear: complex.builtYear,
          preferredExclusiveArea: complex.marketOverride?.preferredExclusiveArea,
          allowAreaFallback: complex.marketOverride?.allowAreaFallback,
        },
      )

      if (record.matchStrategy === 'fallback-all-district-trades') {
        transactions.push({
          ...record,
          recentPrice: complex.recentPrice,
          previousAssetValue: complex.previousAssetValue || complex.recentPrice * 0.78,
          tradeCount12m: 0,
          representativeArea: undefined,
          representativeAreaRange: undefined,
          areaPriceStats: [],
          transactionMonth: complex.sourceFreshness.transaction,
        })
        continue
      }

      transactions.push({
        ...record,
        transactionMonth: dealMonths[0],
      })
    } catch (error) {
      skippedSources.push(`${complex.name}: 실거래가 API (${formatApiError(error)})`)
      transactions.push({
        legalDongCode: complex.legalDongCode,
        complexName: complex.name,
        recentPrice: createFallbackRecentPrice(complex, selectedComplexes),
        previousAssetValue: complex.previousAssetValue || createFallbackRecentPrice(complex, selectedComplexes) * 0.78,
        transactionMonth: complex.sourceFreshness.transaction,
        tradeCount12m: 0,
      })
    }
  }

  const seoulRenewalRecords = await fetchSeoulRenewalRecords(config, fetcher, skippedSources)
  const matchedRenewals = selectedComplexes.map((complex) => matchRenewalRecord(complex, seoulRenewalRecords))
  const renewalMatches = matchedRenewals.map((match) => match.result)
  const regulations = selectedComplexes.map((complex, index) => {
    const matchedRecord = matchedRenewals[index]?.record

    if (matchedRecord) {
      return {
        ...createFallbackRegulationRecord(complex),
        ...matchedRecord,
        stage: matchedRecord.stage === '검토' ? complex.stage : matchedRecord.stage,
        regulationRisk: matchedRecord.regulationRisk,
        residentMomentum: matchedRecord.residentMomentum,
      }
    }

    return createFallbackRegulationRecord(complex)
  })
  const marketIndicators = [...new Map(selectedComplexes.map((complex) => [complex.district, complex])).values()].map((complex) =>
    createMarketIndicatorRecord(complex.district, estimateNewBuildPrice(complex, selectedComplexes).pricePerPyeong, complex.sourceFreshness.costIndex),
  )

  return {
    input: {
      physical,
      transactions,
      regulations,
      marketIndicators,
    },
    skippedSources,
    kaptMatches,
    renewalMatches,
  }
}

async function fetchSeoulRenewalRecords(config: PublicApiConfig, fetcher: FetchLike | undefined, skippedSources: string[]) {
  if (!config.seoulOpenApiKey) return []

  try {
    const rows = (
      await Promise.all([
        fetchSeoulRenewalXmlRows('upisRebuild', 1, 1000, config, fetcher),
        fetchSeoulRenewalXmlRows('upisRebuild', 1001, 2000, config, fetcher),
        fetchSeoulRenewalXmlRows('upisRebuild', 2001, 3000, config, fetcher),
        fetchSeoulRenewalXmlRows('upisRebuild', 3001, 4000, config, fetcher),
        fetchSeoulRenewalXmlRows('upisRebuild', 4001, 5000, config, fetcher),
        fetchSeoulRenewalXmlRows('upisRebuild', 5001, 6000, config, fetcher),
        fetchSeoulRenewalXmlRows('upisRebuild', 6001, 7000, config, fetcher),
      ])
    ).flat()
    return mapSeoulRenewalRows(rows)
  } catch (error) {
    skippedSources.push(`서울 정비사업 API (${formatApiError(error)})`)
    return []
  }
}

function createFallbackRegulationRecord(complex: (typeof complexes)[number]) {
  return {
    ...createDefaultRegulationRecord({
      appId: complex.id,
      stableComplexId: complex.identifiers.complexId,
      kaptCode: complex.identifiers.kaptCode,
      complexName: complex.name,
      roadAddress: complex.identifiers.roadAddress,
      jibunAddress: complex.identifiers.jibunAddress,
      district: complex.district,
      legalDongCode: complex.legalDongCode,
      pnu: complex.identifiers.pnu,
      lat: complex.identifiers.lat,
      lng: complex.identifiers.lng,
      builtYear: complex.builtYear,
      units: complex.units,
      landAreaPyeong: complex.landShare * complex.units,
      currentFar: complex.currentFar,
      updatedMonth: complex.sourceFreshness.physicalInfo,
    }),
    allowedFar: complex.allowedFar,
    stage: complex.stage,
    regulationRisk: complex.regulationRisk,
    residentMomentum: complex.residentMomentum,
    updatedMonth: complex.sourceFreshness.regulation,
    sourceName: 'Recon Scanner 기본 정비사업 추정값',
    sourceType: 'fallback' as const,
    matchConfidence: 0,
    matchReason: '서울 정비사업 API 직접 매칭 없음',
  }
}

async function fetchKaptMatches(
  selectedComplexes: typeof complexes,
  config: PublicApiConfig,
  fetcher: FetchLike | undefined,
  skippedSources: string[],
) {
  return Promise.all(
    selectedComplexes.map(async (complex) => {
      try {
        const candidates = await fetchKaptLegalDongComplexList(complex.legalDongCode, config, fetcher)

        return findBestKaptMatch(complex, candidates)
      } catch (error) {
        skippedSources.push(`${complex.name}: K-apt 법정동 목록 API (${formatApiError(error)})`)

        return {
          complexId: complex.id,
          matched: false,
          score: 0,
        }
      }
    }),
  )
}

function createFallbackRecentPrice(complex: (typeof complexes)[number], selectedComplexes: typeof complexes) {
  if (complex.recentPrice > 0) return complex.recentPrice

  const districtPrices = selectedComplexes
    .filter((item) => item.district === complex.district && item.recentPrice > 0)
    .map((item) => item.recentPrice)

  if (districtPrices.length > 0) {
    return median(districtPrices)
  }

  return complex.newBuildPrice > 0 ? (complex.newBuildPrice / 10000) * 29 * 0.72 : 0
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const midpoint = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0 ? (sorted[midpoint - 1] + sorted[midpoint]) / 2 : sorted[midpoint]
}

function currentDealMonth() {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)

  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
}

function extractDongName(address: string) {
  return address.split(' ').find((part) => part.endsWith('동'))
}

function extractJibun(address: string) {
  const parts = address.trim().split(/\s+/)
  return parts.at(-1)
}
