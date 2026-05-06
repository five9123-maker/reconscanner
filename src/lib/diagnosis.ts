import type { Complex, Diagnosis, RiskLevel, Scenario, Stage } from '../types'
import { calculateProjectFinance } from './projectFinance'

const currentYear = 2026

const stageScore: Record<Stage, number> = {
  검토: 42,
  추진위: 58,
  조합설립: 70,
  사업시행인가: 82,
  관리처분인가: 92,
}

const riskScore: Record<RiskLevel, number> = {
  낮음: 88,
  중간: 66,
  높음: 42,
}

const momentumScore: Record<RiskLevel, number> = {
  낮음: 45,
  중간: 68,
  높음: 86,
}

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

export function calculateDiagnosis(complex: Complex, scenario: Scenario): Diagnosis {
  const finance = calculateProjectFinance(complex, scenario)
  const farUpside = Math.max(complex.allowedFar - complex.currentFar, 0)
  const farUpsideScore = clamp((farUpside / 170) * 100)
  const landShareScore = clamp(complex.landShare >= 15 ? 100 : complex.landShare < 10 ? 40 : 40 + (complex.landShare - 10) * 12)
  const salesMarginScore = calculateSalesPowerScore(complex, scenario)
  const costSensitivityScore = clamp(100 - (scenario.constructionCost - 820) * 0.11 - scenario.interestRate * 4)
  const proRata = finance.proRata
  const proRataScore = clamp((proRata - 15) * 1.7)

  const businessScore = clamp(
    proRataScore * 0.35 +
      landShareScore * 0.2 +
      farUpsideScore * 0.2 +
      salesMarginScore * 0.15 +
      costSensitivityScore * 0.1,
  )
  const agingScore = clamp((currentYear - complex.builtYear - 25) * 3.2 + 40)
  const regulationScore = riskScore[complex.regulationRisk]
  const residentScore = (stageScore[complex.stage] + momentumScore[complex.residentMomentum]) / 2
  const timingScore = clamp(72 - (scenario.interestRate - 4) * 6 - (scenario.constructionCost - 900) * 0.05)
  const reconScore = clamp(businessScore * 0.38 + agingScore * 0.17 + regulationScore * 0.18 + residentScore * 0.17 + timingScore * 0.1)

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

  return clamp(absolutePricePower * 0.5 + replacementPremiumScore * 0.25 + scarcityPriceSignal * 0.25)
}

export function getContributionRange(contribution: number) {
  return {
    optimistic: contribution - 0.6,
    baseline: contribution,
    conservative: contribution + 0.9,
  }
}
