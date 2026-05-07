import { describe, expect, it } from 'vitest'
import { complexes } from '../data/complexes'
import { buildApiEnrichmentPlan } from './apiEnrichmentPlan'

describe('apiEnrichmentPlan', () => {
  it('prioritizes inferred analysis candidates into executable ETL batches', () => {
    const plan = buildApiEnrichmentPlan(complexes, 12, '2026-05-07T00:00:00.000Z')

    expect(plan.totalCandidates).toBe(56)
    expect(plan.batchSize).toBe(12)
    expect(plan.batches).toHaveLength(5)
    expect(plan.batches[0].targets).toHaveLength(12)
    expect(plan.batches[0].command).toMatch(/^RECON_LIVE_TARGETS=apt-/)
    expect(plan.batches[0].command).toContain('npm run etl:live')
    expect(plan.batches[0].targets[0].priorityScore).toBeGreaterThanOrEqual(plan.batches.at(-1)!.targets.at(-1)!.priorityScore)
    expect(plan.batches[0].targets[0].reasons).toContain('후보 추정값 검증 필요')
  })

  it('clamps batch size to an operator-safe range', () => {
    expect(buildApiEnrichmentPlan(complexes, 0).batchSize).toBe(1)
    expect(buildApiEnrichmentPlan(complexes, 100).batchSize).toBe(30)
  })
})
