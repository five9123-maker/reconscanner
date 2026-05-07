import { baseScenario, calculateDiagnosis } from '../lib/diagnosis'
import { validateComplex } from './validate'
import type { Complex } from '../types'

export type ApiEnrichmentTarget = {
  id: string
  name: string
  district: string
  priorityScore: number
  reconScore: number
  businessScore: number
  dataReliability: number
  reasons: string[]
  commandTarget: string
}

export type ApiEnrichmentPlan = {
  generatedAt: string
  totalCandidates: number
  batchSize: number
  batches: Array<{
    index: number
    targets: ApiEnrichmentTarget[]
    command: string
  }>
}

export function buildApiEnrichmentPlan(complexes: Complex[], batchSize = 10, generatedAt = new Date().toISOString()): ApiEnrichmentPlan {
  const targets = complexes
    .filter(isInferredCandidate)
    .map(toEnrichmentTarget)
    .sort((left, right) => right.priorityScore - left.priorityScore || left.name.localeCompare(right.name, 'ko'))
  const normalizedBatchSize = Math.max(1, Math.min(30, Math.floor(batchSize)))
  const batches = chunk(targets, normalizedBatchSize).map((batch, index) => ({
    index: index + 1,
    targets: batch,
    command: `RECON_LIVE_TARGETS=${batch.map((target) => target.commandTarget).join(',')} npm run etl:live`,
  }))

  return {
    generatedAt,
    totalCandidates: targets.length,
    batchSize: normalizedBatchSize,
    batches,
  }
}

function toEnrichmentTarget(complex: Complex): ApiEnrichmentTarget {
  const diagnosis = calculateDiagnosis(complex, baseScenario)
  const issues = validateComplex(complex)
  const issuePenalty = Math.min(18, issues.length * 2)
  const reliabilityGap = 100 - complex.dataReliability
  const priorityScore = Math.round((diagnosis.reconScore * 0.38 + diagnosis.businessScore * 0.24 + reliabilityGap * 0.28 + issuePenalty * 0.1) * 10) / 10

  return {
    id: complex.id,
    name: complex.name,
    district: complex.district,
    priorityScore,
    reconScore: Math.round(diagnosis.reconScore * 10) / 10,
    businessScore: Math.round(diagnosis.businessScore * 10) / 10,
    dataReliability: complex.dataReliability,
    reasons: buildReasons(complex, diagnosis, issues.length),
    commandTarget: complex.id,
  }
}

function buildReasons(complex: Complex, diagnosis: ReturnType<typeof calculateDiagnosis>, issueCount: number) {
  const reasons = [
    `종합 ${Math.round(diagnosis.reconScore)}점`,
    `사업성 ${Math.round(diagnosis.businessScore)}점`,
    `신뢰도 ${complex.dataReliability}%`,
  ]

  if (issueCount > 0) reasons.push(`품질 이슈 ${issueCount}건`)
  if (!complex.identifiers.pnu) reasons.push('PNU 매칭 필요')
  if (complex.dataProfile?.publicSignals.every((signal) => signal.sourceType === 'inferred')) reasons.push('후보 추정값 검증 필요')

  return reasons
}

function isInferredCandidate(complex: Complex) {
  return complex.dataProfile?.publicSignals.every((signal) => signal.sourceType === 'inferred') ?? false
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }

  return result
}
