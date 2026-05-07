import { describe, expect, it } from 'vitest'
import { rawComplexBundles } from '../etl/__fixtures__/rawComplexBundles'
import { buildComplexDataset } from '../etl/pipeline'
import { baseScenario } from '../lib/diagnosis'
import {
  createComplexRepository,
  getComplexById,
  getDataQualitySummary,
  getDefaultComplexId,
  getRankedComplexes,
  getValidationIssues,
  searchComplexes,
} from './complexRepository'

describe('complexRepository', () => {
  it('finds a complex by public app id and stable complex_id', () => {
    const byAppId = getComplexById('apt-002')
    const byComplexId = getComplexById('seoul-songpa-jamsil-jugong5')

    expect(byAppId?.name).toBe('잠실주공5단지')
    expect(byComplexId?.id).toBe('apt-002')
  })

  it('searches only by complex name and alias', () => {
    expect(searchComplexes('잠실5단지', baseScenario)[0]?.complex.id).toBe('apt-002')
    expect(searchComplexes('은마', baseScenario)[0]?.complex.name).toBe('은마아파트')
    expect(searchComplexes('강남구', baseScenario)).toHaveLength(0)
    expect(searchComplexes('KAPT-DEMO-001', baseScenario)).toHaveLength(0)
  })

  it('returns ranked complexes with diagnosis attached', () => {
    const ranked = getRankedComplexes(baseScenario)

    expect(ranked.length).toBeGreaterThanOrEqual(15)
    expect(ranked[0].diagnosis.reconScore).toBeGreaterThanOrEqual(ranked[1].diagnosis.reconScore)
  })

  it('summarizes source quality for data operations', () => {
    const summary = getDataQualitySummary()

    expect(summary.totalComplexes).toBeGreaterThanOrEqual(15)
    expect(summary.inferredCandidateCount).toBe(56)
    expect(summary.averageReliability).toBeGreaterThan(65)
    expect(summary.missingKaptCode).toBeGreaterThanOrEqual(0)
    expect(summary.issueCount).toBeGreaterThan(0)
  })

  it('exposes validation issues for operator-facing diagnostics', () => {
    const issues = getValidationIssues()

    expect(issues.some((issue) => issue.complexName === '압구정 현대 3차')).toBe(true)
  })

  it('has a stable default complex id', () => {
    expect(getDefaultComplexId()).toBe('apt-002')
  })

  it('uses formula-based assumptions when manual project overrides are absent', () => {
    const complex = getComplexById('apt-002')
    const ranked = getRankedComplexes(baseScenario)
    const diagnosis = ranked.find((item) => item.complex.id === 'apt-002')?.diagnosis

    expect(complex?.dataProfile?.estimationMode).toBe('public_api_estimate')
    expect(complex?.dataProfile?.manualSignals.length).toBe(0)
    expect(complex?.financeOverride).toBeUndefined()
    expect(diagnosis?.finance.sameSizeSettlement).toBeLessThan(0)
  })

  it('can be created from an ETL-normalized dataset', () => {
    const dataset = buildComplexDataset({
      physical: rawComplexBundles.map((bundle) => bundle.physical),
      transactions: rawComplexBundles.flatMap((bundle) => (bundle.transaction ? [bundle.transaction] : [])),
      regulations: rawComplexBundles.flatMap((bundle) => (bundle.regulation ? [bundle.regulation] : [])),
      marketIndicators: rawComplexBundles.flatMap((bundle) => (bundle.market ? [bundle.market] : [])),
    })
    const repository = createComplexRepository(dataset)

    expect(repository.searchComplexes('테스트리버', baseScenario)[0].complex.name).toBe('테스트리버아파트')
    expect(repository.getDataQualitySummary().totalComplexes).toBe(2)
    expect(repository.getValidationIssues().length).toBeGreaterThan(0)
    expect(repository.listComplexes()[0].dataProfile?.estimationMode).toBe('public_api_estimate')
  })
})
