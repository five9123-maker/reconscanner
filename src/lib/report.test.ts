import { describe, expect, it } from 'vitest'
import { complexes } from '../data/complexes'
import { baseScenario, calculateDiagnosis } from './diagnosis'
import { buildReportPayload } from './report'

describe('buildReportPayload', () => {
  it('creates a stable report payload from complex, diagnosis, and scenario data', () => {
    const complex = complexes[1]
    const diagnosis = calculateDiagnosis(complex, baseScenario)
    const payload = buildReportPayload(complex, diagnosis, baseScenario, '2026-05-04T00:00:00.000Z')

    expect(payload.title).toBe('잠실주공5단지 재건축 사업성 진단')
    expect(payload.generatedAt).toBe('2026-05-04T00:00:00.000Z')
    expect(payload.complex.complexId).toBe('seoul-songpa-jamsil-jugong5')
    expect(payload.diagnosis.riskSummary).toHaveLength(3)
    expect(payload.finance.totalRevenue).toBeGreaterThan(0)
    expect(payload.finance.constructionCost).toBeGreaterThan(0)
    expect(payload.finance.generalSaleArea).toBeGreaterThan(0)
    expect(payload.finance.breakEvenGeneralSalePrice).toBeGreaterThanOrEqual(0)
    expect(payload.data.estimationMode).toBe('public_api_estimate')
    expect(payload.data.remainingGaps.length).toBeGreaterThan(0)
    expect(payload.assumptions.constructionCost).toBe(baseScenario.constructionCost)
    expect(payload.disclaimer).toContain('참고용 진단')
  })
})
