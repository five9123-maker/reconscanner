import type { Complex, TransactionBasis } from '../types'
import type { LiveEtlStatus, TransactionDiagnostic } from '../types/liveEtl'
import { findTransactionDiagnostic } from './livePayloadMerge'

const DEFAULT_EXCLUSIVE_TO_SUPPLY_RATIO = 0.75
const REPRESENTATIVE_PYEONG_MISMATCH_THRESHOLD = 0.1
const DERIVED_PREVIOUS_ASSET_RATIO = 0.78
const SQM_PER_PYEONG = 3.3058

type AreaPriceStat = NonNullable<TransactionDiagnostic['areaPriceStats']>[number]

export function applyTransactionBasis(complexes: Complex[], liveEtlStatus: LiveEtlStatus | null): Complex[] {
  const diagnostics = liveEtlStatus?.transactionDiagnostics ?? []

  if (diagnostics.length === 0) return complexes

  return complexes.map((complex) => {
    const diagnostic = findTransactionDiagnostic(diagnostics, complex)
    const stats = (diagnostic?.areaPriceStats ?? []).filter((stat) => stat.medianPrice > 0 && stat.medianPricePerPyeong > 0)

    if (stats.length === 0) return complex

    return normalizeComplexWithStats(complex, stats, formatDealMonth(liveEtlStatus?.dealMonth))
  })
}

function normalizeComplexWithStats(complex: Complex, stats: AreaPriceStat[], dealMonth?: string): Complex {
  const representativePyeong = complex.representativeSupplyPyeong ?? complex.landShare * (complex.currentFar / 100)
  const preferredExclusiveArea = complex.marketOverride?.preferredExclusiveArea
  const preferredStat = preferredExclusiveArea ? findStatContainingArea(stats, preferredExclusiveArea) : undefined

  // 대표 전용면적이 지정됐는데 해당 면적대 거래가 없고 fallback이 금지된 단지는
  // 거래 매칭 자체를 신뢰하지 않는다 (동명 단지 오매칭 방지).
  if (!preferredStat && preferredExclusiveArea && complex.marketOverride?.allowAreaFallback === false) return complex

  const selectedStat = preferredStat ?? findClosestStat(stats, representativePyeong)

  if (!selectedStat) return complex

  const impliedSupplyPyeong = getImpliedSupplyPyeong(selectedStat)
  const mismatchRatio = representativePyeong > 0 ? Math.abs(impliedSupplyPyeong - representativePyeong) / representativePyeong : 0
  const priceChanged = Math.abs(selectedStat.medianPrice - complex.recentPrice) > 0.001
  // preferredExclusiveArea가 지정된 단지는 대표 평형을 신뢰하고 가격 밴드만 교정한다.
  // 지정이 없으면 밴드에서 역산한 공급평형이 대표 평형과 10% 이상 어긋날 때만 보정한다.
  const shouldAdjustPyeong = !preferredStat && mismatchRatio > REPRESENTATIVE_PYEONG_MISMATCH_THRESHOLD
  const adjusted = priceChanged || shouldAdjustPyeong

  const nextRepresentativePyeong = shouldAdjustPyeong ? Math.round(impliedSupplyPyeong * 10) / 10 : representativePyeong
  const nextRecentPrice = selectedStat.medianPrice
  const previousAssetWasDerived = Math.abs(complex.previousAssetValue - complex.recentPrice * DERIVED_PREVIOUS_ASSET_RATIO) < complex.recentPrice * 0.02
  const nextPreviousAssetValue = adjusted && previousAssetWasDerived ? nextRecentPrice * DERIVED_PREVIOUS_ASSET_RATIO : complex.previousAssetValue

  const basis: TransactionBasis = {
    areaRange: selectedStat.areaRange,
    tradeCount: selectedStat.tradeCount,
    medianPrice: selectedStat.medianPrice,
    medianPricePerExclusivePyeong: selectedStat.medianPricePerPyeong,
    impliedSupplyPyeong: Math.round(impliedSupplyPyeong * 10) / 10,
    exclusiveToSupplyRatio: DEFAULT_EXCLUSIVE_TO_SUPPLY_RATIO,
    dealMonth,
    adjusted,
    sourceName: '국토교통부 아파트 실거래가 공개시스템',
    description: createBasisDescription(selectedStat, nextRepresentativePyeong, preferredExclusiveArea, shouldAdjustPyeong, dealMonth),
  }

  return {
    ...complex,
    recentPrice: nextRecentPrice,
    representativeSupplyPyeong: nextRepresentativePyeong,
    previousAssetValue: nextPreviousAssetValue,
    transactionBasis: basis,
  }
}

function findStatContainingArea(stats: AreaPriceStat[], exclusiveArea: number) {
  return stats.find((stat) => {
    const range = parseAreaRange(stat.areaRange)

    return range != null && exclusiveArea > range.min && exclusiveArea <= range.max
  })
}

function findClosestStat(stats: AreaPriceStat[], representativePyeong: number) {
  return [...stats].sort(
    (a, b) =>
      Math.abs(getImpliedSupplyPyeong(a) - representativePyeong) - Math.abs(getImpliedSupplyPyeong(b) - representativePyeong) ||
      b.tradeCount - a.tradeCount,
  )[0]
}

function getImpliedSupplyPyeong(stat: AreaPriceStat) {
  const exclusivePyeong = stat.medianPrice / stat.medianPricePerPyeong

  return exclusivePyeong / DEFAULT_EXCLUSIVE_TO_SUPPLY_RATIO
}

function parseAreaRange(label: string) {
  if (label.startsWith('~')) return { min: 0, max: Number.parseFloat(label.slice(1)) }
  if (label.endsWith('㎡~')) return { min: Number.parseFloat(label), max: 999 }

  const [min, max] = label.replace('㎡', '').split('~').map((part) => Number.parseFloat(part))

  if (Number.isNaN(min) || Number.isNaN(max)) return null

  return { min, max }
}

function createBasisDescription(
  stat: AreaPriceStat,
  representativePyeong: number,
  preferredExclusiveArea: number | undefined,
  pyeongAdjusted: boolean,
  dealMonth?: string,
) {
  const monthLabel = dealMonth ? `${dealMonth} 기준 ` : ''
  const bandLabel = `전용 ${stat.areaRange} 구간 실거래 ${stat.tradeCount}건 중앙값 ${stat.medianPrice.toFixed(1)}억`
  const matchLabel = preferredExclusiveArea
    ? `대표 전용면적 ${preferredExclusiveArea}㎡가 속한 구간 사용`
    : pyeongAdjusted
      ? `구간 역산 공급평형 ${representativePyeong.toFixed(1)}평으로 대표 평형 보정`
      : `대표 공급평형 ${representativePyeong.toFixed(1)}평과 정합 확인`

  return `${monthLabel}${bandLabel}. ${matchLabel}`
}

function formatDealMonth(dealMonth?: string | number) {
  if (dealMonth == null) return undefined

  const text = String(dealMonth)

  return text.length === 6 ? `${text.slice(0, 4)}.${text.slice(4)}` : text
}

export function pyeongFromSquareMeters(area: number) {
  return area / SQM_PER_PYEONG
}
