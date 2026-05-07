import type { Complex, Scenario } from '../types'

export function estimateCurrentPricePerPyeong(complex: Complex) {
  const representativePyeong = getRepresentativePyeong(complex)

  return representativePyeong > 0 ? Math.round((complex.recentPrice * 10000) / representativePyeong) : 0
}

export function estimateExpectedSalePricePerPyeong(complex: Complex, scenario: Scenario) {
  return Math.round(complex.newBuildPrice * (scenario.salePrice / 100))
}

export function getRepresentativePyeong(complex: Complex) {
  return complex.representativeSupplyPyeong ?? complex.landShare * (complex.currentFar / 100)
}

export function describeCurrentPricePerPyeong(complex: Complex) {
  const representativePyeong = getRepresentativePyeong(complex)

  return `산식: 최근 대표 시세 ${complex.recentPrice.toFixed(1)}억 ÷ 대표 공급평형 ${representativePyeong.toFixed(1)}평 × 10,000. 실거래가 대표 평형 중앙값 또는 후보 기준값 사용`
}

export function describeExpectedSalePricePerPyeong(complex: Complex, scenario: Scenario) {
  return `산식: 신축 기준가 ${complex.newBuildPrice.toLocaleString()}만원/평 × 일반분양가 시나리오 ${scenario.salePrice}%. 신축 기준가는 직접 비교 신축, 같은 구/권역 중앙값, 가격대별 레퍼런스를 혼합`
}
