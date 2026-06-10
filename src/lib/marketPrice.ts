import type { Complex, Scenario } from '../types'

// 분양가상한제 적용 권역(2026년 기준 규제지역). 일반분양가는 인근 신축 시세 대비 일정 비율을 넘기 어렵다.
const PRICE_CAP_DISTRICTS = ['강남구', '서초구', '송파구', '용산구']
// 은마 보도 분양가(평당 약 8,000만원) ÷ 인근 신축 시세 추정(10,760만원) ≈ 0.75로 캘리브레이션
const PRICE_CAP_RATIO_REGULATED = 0.75
const PRICE_CAP_RATIO_DEFAULT = 0.95
// baseScenario.salePrice와 동일해야 한다. diagnosis.ts와의 순환 참조를 피하기 위해 상수로 둔다.
const BASE_SALE_PRICE_PERCENT = 115

export function estimateCurrentPricePerPyeong(complex: Complex) {
  const representativePyeong = getRepresentativePyeong(complex)

  return representativePyeong > 0 ? Math.round((complex.recentPrice * 10000) / representativePyeong) : 0
}

export function estimateExpectedSalePricePerPyeong(complex: Complex, scenario: Scenario) {
  const uncapped = estimateCurrentPricePerPyeong(complex) * (BASE_SALE_PRICE_PERCENT / 100)
  const cap = getSalePriceCap(complex)
  const basePrice = cap > 0 ? Math.min(uncapped, cap) : uncapped

  return Math.round(basePrice * (scenario.salePrice / BASE_SALE_PRICE_PERCENT))
}

export function getSalePriceCap(complex: Complex) {
  if (complex.newBuildPrice <= 0) return 0

  return complex.newBuildPrice * getSalePriceCapRatio(complex)
}

export function getSalePriceCapRatio(complex: Complex) {
  return PRICE_CAP_DISTRICTS.includes(complex.district) ? PRICE_CAP_RATIO_REGULATED : PRICE_CAP_RATIO_DEFAULT
}

export function isSalePriceCapped(complex: Complex) {
  const cap = getSalePriceCap(complex)

  return cap > 0 && estimateCurrentPricePerPyeong(complex) * (BASE_SALE_PRICE_PERCENT / 100) > cap
}

export function estimateNationalPyeongCompletionValue(complex: Complex, scenario: Scenario) {
  return (estimateCompletionMarketPricePerPyeong(complex, scenario) * 33) / 10000
}

export function estimateCompletionMarketPricePerPyeong(complex: Complex, scenario: Scenario) {
  const model = createCompletionMarketModel(complex)
  const cycleMultiplier = 1 + (scenario.salePrice - 100) * 0.0025

  return Math.round((model.pricePerPyeong * cycleMultiplier) / 10) * 10
}

export function getRepresentativePyeong(complex: Complex) {
  return complex.representativeSupplyPyeong ?? complex.landShare * (complex.currentFar / 100)
}

export function describeCurrentPricePerPyeong(complex: Complex) {
  const representativePyeong = getRepresentativePyeong(complex)
  const basis = complex.transactionBasis
  const sourceLine = basis
    ? `출처: ${basis.sourceName}. ${basis.description}`
    : '출처: 단지 기준값(실거래 미연결). 후보 기준 시세 사용'

  return `산식: 최근 대표 시세 ${complex.recentPrice.toFixed(1)}억 ÷ 대표 공급평형 ${representativePyeong.toFixed(1)}평 × 10,000. ${sourceLine}`
}

export function describeExpectedSalePricePerPyeong(complex: Complex, scenario: Scenario) {
  const capLine = isSalePriceCapped(complex)
    ? ` 분양가상한 반영: 인근 신축 시세 ${complex.newBuildPrice.toLocaleString()}만원/평 × ${Math.round(getSalePriceCapRatio(complex) * 100)}% 상한 적용(분양가상한제 권역 보도 분양가 검증 기반).`
    : ''

  return `산식: 평당 실거래가 ${estimateCurrentPricePerPyeong(complex).toLocaleString()}만원/평 × 일반분양가 배율 ${scenario.salePrice}%.${capLine} 기준값은 실거래가 대비 115%이며 오른쪽 시나리오 바에서 조정`
}

export function describeCompletionMarketPricePerPyeong(complex: Complex, scenario: Scenario) {
  const model = createCompletionMarketModel(complex)
  const scenarioEffect = scenario.salePrice === 100 ? '시나리오 조정 없음' : `일반분양가 시나리오 ${scenario.salePrice}%를 시장 사이클 민감도 25%로 반영`

  return `산식: 현재 구축 평당가 ${model.currentPricePerPyeong.toLocaleString()}만원/평 × ${model.premium.toFixed(2)}배와 분양 기준가 ${complex.newBuildPrice.toLocaleString()}만원/평 × ${model.saleToMarketMultiplier.toFixed(2)}배를 ${model.currentAnchorWeight.toFixed(0)}:${(100 - model.currentAnchorWeight).toFixed(0)} 비중으로 혼합. ${model.tierLabel} 보정, ${scenarioEffect}.`
}

export function describeNationalPyeongCompletionValue(complex: Complex, scenario: Scenario) {
  return `산식: 평당 완공가치 ${estimateCompletionMarketPricePerPyeong(complex, scenario).toLocaleString()}만원/평 × 국평 33평 ÷ 10,000. 같은 단지의 33평 신축을 받는다고 가정한 완공 후 시장가치`
}

function createCompletionMarketModel(complex: Complex) {
  const currentPricePerPyeong = estimateCurrentPricePerPyeong(complex)
  const tier = getCompletionMarketTier(complex, currentPricePerPyeong)
  const premium = complex.marketOverride?.completionMarketPremium ?? tier.premium
  const currentAnchor = currentPricePerPyeong * premium
  const saleAnchor = complex.newBuildPrice * tier.saleToMarketMultiplier
  const blendedPrice = currentAnchor * tier.currentAnchorWeight + saleAnchor * (1 - tier.currentAnchorWeight)
  const floorPrice = Math.max(complex.newBuildPrice * 1.06, currentPricePerPyeong * tier.floorMultiplier)
  // 구축 평당가가 낮은 단지도 완공 시점에는 인근 신축 시세 수준으로 수렴하므로 상한은 신축 기준가 이상으로 둔다
  const capPrice = Math.max(currentPricePerPyeong * tier.capMultiplier, complex.newBuildPrice * 1.1)
  const pricePerPyeong = complex.marketOverride?.completionMarketPricePerPyeong ?? clamp(blendedPrice, floorPrice, capPrice)

  return {
    ...tier,
    premium,
    currentPricePerPyeong,
    pricePerPyeong,
    currentAnchorWeight: tier.currentAnchorWeight * 100,
  }
}

function getCompletionMarketTier(complex: Complex, currentPricePerPyeong: number) {
  const text = `${complex.name} ${complex.address} ${complex.district}`
  const isHanRiverPrime = /압구정|반포|청담|서빙고|이촌|여의도|성수/.test(text)
  const isJamsilPrime = /잠실|신천/.test(text) && currentPricePerPyeong >= 6500
  const isGangnamCore = /강남구|서초구|송파구|용산구/.test(text)
  const isSeoulCore = /양천구|영등포구|성동구|마포구|동작구|광진구/.test(text)

  // 2026-06 웹 검증 결과로 재조정: 재건축 대상 구축은 미래가치가 이미 시세에 상당 부분 반영되어
  // 완공 프리미엄이 1.1~1.3배 수준에 그친다 (예: 은마 평당 1.21억 vs 래미안대치팰리스 1.23억,
  // 잠실주공5 1.30억 vs 잠실르엘 1.41억). 신축 비교 시세(newBuildPrice) 앵커 비중을 높였다.
  if (isHanRiverPrime || isJamsilPrime || currentPricePerPyeong >= 9000) {
    return {
      tierLabel: '한강·강남 핵심지 완공가치',
      premium: 1.25,
      saleToMarketMultiplier: 1.12,
      currentAnchorWeight: 0.45,
      floorMultiplier: 1.08,
      capMultiplier: 1.6,
    }
  }

  if (isGangnamCore || currentPricePerPyeong >= 6500) {
    return {
      tierLabel: '강남권·고가권 완공가치',
      premium: 1.2,
      saleToMarketMultiplier: 1.1,
      currentAnchorWeight: 0.42,
      floorMultiplier: 1.05,
      capMultiplier: 1.5,
    }
  }

  if (isSeoulCore || currentPricePerPyeong >= 4500) {
    return {
      tierLabel: '서울 주요권 완공가치',
      premium: 1.15,
      saleToMarketMultiplier: 1.08,
      currentAnchorWeight: 0.4,
      floorMultiplier: 0.95,
      capMultiplier: 1.45,
    }
  }

  if (currentPricePerPyeong >= 3000) {
    return {
      tierLabel: '수도권 중상위권 완공가치',
      premium: 1.12,
      saleToMarketMultiplier: 1.06,
      currentAnchorWeight: 0.4,
      floorMultiplier: 0.92,
      capMultiplier: 1.35,
    }
  }

  return {
    tierLabel: '수도권 평균권 완공가치',
    premium: 1.08,
    saleToMarketMultiplier: 1.05,
    currentAnchorWeight: 0.4,
    floorMultiplier: 0.9,
    capMultiplier: 1.3,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
