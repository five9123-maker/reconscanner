import { newBuildComparables } from '../data/newBuildComparables'
import { findNewBuildMarketReference } from '../data/newBuildReferencePrices'
import type { Complex } from '../types'

type NewBuildPriceEstimateMethod = 'direct_comparable' | 'district_blend' | 'market_band_blend' | 'region_blend' | 'dataset_blend' | 'base_value'

type NewBuildPriceEstimate = {
  pricePerPyeong: number
  reliabilityBoost: number
  comparableCount: number
  comparableNames: string[]
  method: NewBuildPriceEstimateMethod
  confidence: number
  description: string
}

export function applyNewBuildPriceEstimates(dataset: Complex[]): Complex[] {
  return dataset.map((complex) => {
    const estimate = estimateNewBuildPrice(complex, dataset)

    return {
      ...complex,
      newBuildPrice: estimate.pricePerPyeong,
      dataReliability: Math.min(99, complex.dataReliability + estimate.reliabilityBoost),
    }
  })
}

export function estimateNewBuildPrice(complex: Complex, peers: Complex[] = []): NewBuildPriceEstimate {
  const candidates = newBuildComparables.filter((item) => item.targetComplexId === complex.identifiers.complexId)

  if (candidates.length === 0) return estimateFallbackNewBuildPrice(complex, peers)

  const weighted = candidates.map((item) => {
    const distanceWeight = 1 / Math.max(item.distanceKm, 0.4)
    const weight = distanceWeight * item.similarity

    return {
      price: item.pricePerPyeong,
      weight,
    }
  })
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0)
  const pricePerPyeong = Math.round(weighted.reduce((sum, item) => sum + item.price * item.weight, 0) / totalWeight / 10) * 10
  const averageSimilarity = candidates.reduce((sum, item) => sum + item.similarity, 0) / candidates.length

  return {
    pricePerPyeong,
    reliabilityBoost: candidates.length >= 3 && averageSimilarity >= 0.75 ? 2 : 1,
    comparableCount: candidates.length,
    comparableNames: candidates.map((item) => item.name),
    method: 'direct_comparable',
    confidence: candidates.length >= 3 && averageSimilarity >= 0.75 ? 82 : 72,
    description: `${candidates.map((item) => item.name).slice(0, 3).join(', ')} ${candidates.length}개 단지의 거리·유사도 가중 평균`,
  }
}

export function describeNewBuildComparables(complex: Complex, peers: Complex[] = []) {
  const estimate = estimateNewBuildPrice(complex, peers)

  return `${estimate.description}. 신뢰도 ${estimate.confidence}%`
}

function estimateFallbackNewBuildPrice(complex: Complex, peers: Complex[]): NewBuildPriceEstimate {
  const sameDistrictMedian = median(peerPrices(peers, complex, (peer) => peer.district === complex.district))
  const sameRegionMedian = median(peerPrices(peers, complex, (peer) => getRegionKey(peer) === getRegionKey(complex)))
  const datasetMedian = median(peerPrices(peers, complex))
  const marketReference = findNewBuildMarketReference(getCurrentPricePerPyeong(complex))
  const marketBandPrice = marketReference?.referencePricePerPyeong
  const basePrice = complex.newBuildPrice
  const anchorPrice = weightedAnchor([
    { price: sameDistrictMedian, weight: 0.45 },
    { price: marketBandPrice, weight: 0.35 },
    { price: sameRegionMedian, weight: 0.25 },
    { price: datasetMedian, weight: 0.15 },
  ]) ?? basePrice
  const method = sameDistrictMedian
    ? 'district_blend'
    : marketBandPrice
      ? 'market_band_blend'
      : sameRegionMedian
        ? 'region_blend'
        : datasetMedian
          ? 'dataset_blend'
          : 'base_value'
  const blendRatio = sameDistrictMedian ? 0.42 : marketBandPrice ? 0.38 : sameRegionMedian ? 0.35 : datasetMedian ? 0.28 : 0
  const blendedPrice = basePrice > 0 ? basePrice * (1 - blendRatio) + anchorPrice * blendRatio : anchorPrice
  const cappedPrice = basePrice > 0 ? clamp(blendedPrice, basePrice * 0.86, basePrice * 1.14) : blendedPrice
  const pricePerPyeong = Math.round(cappedPrice / 10) * 10
  const scope = sameDistrictMedian
    ? marketReference
      ? `같은 구 중앙값과 ${marketReference.label} 레퍼런스`
      : '같은 구'
    : marketReference
      ? `${marketReference.label} 레퍼런스`
      : sameRegionMedian
        ? '같은 권역'
        : datasetMedian
          ? '전체 분석 대상'
          : '단지 기본값'
  const confidence = sameDistrictMedian ? 68 : marketReference ? marketReference.confidence : sameRegionMedian ? 60 : datasetMedian ? 54 : 46

  return {
    pricePerPyeong,
    reliabilityBoost: 0,
    comparableCount: 0,
    comparableNames: [],
    method,
    confidence,
    description:
      method === 'base_value'
        ? '직접 비교 신축 단지 없음. 단지 기본 기준가 유지'
        : `직접 비교 신축 단지 없음. ${scope}와 단지 기본값을 혼합하고 변동폭 상한 적용`,
  }
}

function peerPrices(peers: Complex[], complex: Complex, predicate: (peer: Complex) => boolean = () => true) {
  return peers
    .filter((peer) => peer.id !== complex.id && peer.newBuildPrice > 0 && predicate(peer))
    .map((peer) => peer.newBuildPrice)
}

function median(values: number[]) {
  if (values.length === 0) return undefined

  const sorted = [...values].sort((a, b) => a - b)
  const center = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0 ? (sorted[center - 1] + sorted[center]) / 2 : sorted[center]
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function weightedAnchor(items: { price: number | undefined; weight: number }[]) {
  const validItems = items.filter((item): item is { price: number; weight: number } => item.price !== undefined && item.price > 0)

  if (validItems.length === 0) return undefined

  const totalWeight = validItems.reduce((sum, item) => sum + item.weight, 0)

  return validItems.reduce((sum, item) => sum + item.price * item.weight, 0) / totalWeight
}

function getCurrentPricePerPyeong(complex: Complex) {
  const supplyPyeong = complex.representativeSupplyPyeong ?? complex.landShare * (complex.currentFar / 100)

  return supplyPyeong > 0 ? (complex.recentPrice * 10000) / supplyPyeong : 0
}

function getRegionKey(complex: Complex) {
  if (['강남구', '서초구', '송파구'].includes(complex.district)) return 'gangnam-core'
  if (['양천구', '강서구'].includes(complex.district)) return 'mokdong-west'
  if (['노원구', '도봉구', '강북구'].includes(complex.district)) return 'northeast-seoul'
  if (complex.district.includes('분당') || complex.district.includes('성남')) return 'bundang'
  if (complex.district.includes('동안') || complex.district.includes('안양') || complex.district.includes('군포')) return 'pyeongchon-sanbon'
  if (complex.district.includes('부천')) return 'jungdong'
  if (complex.district.includes('일산') || complex.district.includes('고양')) return 'ilsan'

  return complex.legalDongCode.slice(0, 2) || complex.district
}
