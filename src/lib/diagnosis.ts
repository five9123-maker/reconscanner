import type { Complex, Diagnosis, Scenario } from '../types'
import { getReferenceYear } from './date'
import { calculateProjectFinance } from './projectFinance'
import { SCORING_CONFIG } from './scoringConfig'

export const baseScenario: Scenario = {
  constructionCost: 930,
  salePrice: 100,
  interestRate: 4.3,
  publicContribution: 12,
}

export const formatCurrency = (value: number) => `${value.toFixed(1)}억`

export const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value))

export function scoreToGrade(score: number) {
  if (score >= 85) return 'A'
  if (score >= 78) return 'B+'
  if (score >= 70) return 'B'
  if (score >= 62) return 'C+'
  if (score >= 54) return 'C'
  return 'D'
}

export function getBusinessLabel(score: number) {
  if (score >= 82) return '사업성 우수'
  if (score >= 70) return '사업성 양호'
  if (score >= 58) return '민감 구간'
  return '사업성 취약'
}

export function calculateDiagnosis(complex: Complex, scenario: Scenario, referenceYear = getReferenceYear()): Diagnosis {
  const finance = calculateProjectFinance(complex, scenario)
  const farUpside = Math.max(complex.allowedFar - complex.currentFar, 0)
  const farUpsideScore = clamp((farUpside / 170) * 100)
  const landShareScore = clamp(complex.landShare >= 15 ? 100 : complex.landShare < 10 ? 40 : 40 + (complex.landShare - 10) * 12)
  const salesMarginScore = calculateSalesPowerScore(complex, scenario)
  const costSensitivityScore = clamp(100 - (scenario.constructionCost - 820) * 0.11 - scenario.interestRate * 4)
  const proRata = finance.proRata
  const proRataScore = clamp((proRata - 15) * 1.7)

  const businessScore = clamp(
    proRataScore * SCORING_CONFIG.businessWeights.proRata +
      landShareScore * SCORING_CONFIG.businessWeights.landShare +
      farUpsideScore * SCORING_CONFIG.businessWeights.farUpside +
      salesMarginScore * SCORING_CONFIG.businessWeights.salesMargin +
      costSensitivityScore * SCORING_CONFIG.businessWeights.costSensitivity,
  )
  const agingScore = clamp((referenceYear - complex.builtYear - 25) * 3.2 + 40)
  const regulationScore = SCORING_CONFIG.riskScore[complex.regulationRisk]
  const residentScore = (SCORING_CONFIG.stageScore[complex.stage] + SCORING_CONFIG.residentMomentumScore[complex.residentMomentum]) / 2
  const timingScore = clamp(72 - (scenario.interestRate - 4) * 6 - (scenario.constructionCost - 900) * 0.05)
  const reconScore = clamp(
    businessScore * SCORING_CONFIG.reconWeights.business +
      agingScore * SCORING_CONFIG.reconWeights.aging +
      regulationScore * SCORING_CONFIG.reconWeights.regulation +
      residentScore * SCORING_CONFIG.reconWeights.resident +
      timingScore * SCORING_CONFIG.reconWeights.timing,
  )

  const contribution = finance.contribution

  const riskSummary = [
    costSensitivityScore < 62 ? '공사비 상승 민감도 높음' : '공사비 민감도 관리 가능',
    finance.plan.generalSaleArea / finance.plan.saleableFloorArea < 0.12 ? '일반분양 여력 낮음' : '일반분양 면적 확보',
    proRata < 110 ? '비례율 110% 미만 민감 구간' : '비례율 기준선 상회',
  ]

  return {
    businessScore,
    agingScore,
    regulationScore,
    momentumScore: residentScore,
    timingScore,
    reconScore,
    proRata,
    contribution,
    finance,
    grade: scoreToGrade(reconScore),
    businessLabel: getBusinessLabel(businessScore),
    riskSummary,
  }
}

function calculateSalesPowerScore(complex: Complex, scenario: Scenario) {
  const adjustedNewBuildPrice = complex.newBuildPrice * (scenario.salePrice / 100)
  const targetUnitPyeong = complex.landShare >= 15 ? 34.2 : 30.7
  const estimatedNewUnitPrice = (adjustedNewBuildPrice * targetUnitPyeong) / 10000
  const replacementPremium = estimatedNewUnitPrice - complex.recentPrice

  const absolutePricePower = clamp((adjustedNewBuildPrice - 3200) / 45)
  const replacementPremiumScore = clamp(replacementPremium * 8 + 52)
  const scarcityPriceSignal = clamp((complex.recentPrice - 6) * 2.4)

  return clamp(
    absolutePricePower * SCORING_CONFIG.salesPowerWeights.absolutePricePower +
      replacementPremiumScore * SCORING_CONFIG.salesPowerWeights.replacementPremium +
      scarcityPriceSignal * SCORING_CONFIG.salesPowerWeights.scarcityPriceSignal,
  )
}

export function getContributionRange(contribution: number) {
  return {
    optimistic: contribution - 0.6,
    baseline: contribution,
    conservative: contribution + 0.9,
  }
}
