import type { RiskLevel, Stage } from '../types'

export const SCORING_CONFIG = {
  stageScore: {
    검토: 42,
    추진위: 58,
    조합설립: 70,
    사업시행인가: 82,
    관리처분인가: 92,
    철거신고: 94,
    착공신고: 96,
    일반분양승인: 97,
    준공인가: 99,
  } satisfies Record<Stage, number>,
  riskScore: {
    낮음: 88,
    중간: 66,
    높음: 42,
  } satisfies Record<RiskLevel, number>,
  residentMomentumScore: {
    낮음: 45,
    중간: 68,
    높음: 86,
  } satisfies Record<RiskLevel, number>,
  businessWeights: {
    proRata: 0.35,
    landShare: 0.2,
    farUpside: 0.2,
    salesMargin: 0.15,
    costSensitivity: 0.1,
  },
  reconWeights: {
    business: 0.38,
    aging: 0.17,
    regulation: 0.18,
    resident: 0.17,
    timing: 0.1,
  },
  salesPowerWeights: {
    absolutePricePower: 0.5,
    replacementPremium: 0.25,
    scarcityPriceSignal: 0.25,
  },
}
