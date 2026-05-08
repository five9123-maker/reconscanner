import type { Complex, Stage } from '../types'
import { getReferenceYear } from './date'

export const MIN_REBUILD_ANALYSIS_AGE = 16

const EXCLUDED_ADVANCED_STAGES = new Set<Stage>(['철거신고', '착공신고', '일반분양승인', '준공인가'])

export function isEligibleForReconAnalysis(complex: Complex, referenceYear = getReferenceYear()) {
  return getReconAnalysisExclusionReason(complex, referenceYear) === null
}

export function getReconAnalysisExclusionReason(complex: Complex, referenceYear = getReferenceYear()) {
  if (EXCLUDED_ADVANCED_STAGES.has(complex.stage)) {
    return `${complex.stage} 단계로 이미 사업이 상당히 진행된 단지`
  }

  const age = referenceYear - complex.builtYear

  if (age <= 15) {
    return `준공 ${age}년차로 15년 초과 조건 미충족`
  }

  return null
}
