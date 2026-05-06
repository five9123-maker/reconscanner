import { describe, expect, it } from 'vitest'
import { rawComplexBundles } from './__fixtures__/rawComplexBundles'
import { runInMemoryEtl } from './runEtl'

describe('runInMemoryEtl', () => {
  it('returns normalized complexes, validation issues, and run stats', () => {
    const result = runInMemoryEtl({
      physical: rawComplexBundles.map((bundle) => bundle.physical),
      transactions: rawComplexBundles.flatMap((bundle) => (bundle.transaction ? [bundle.transaction] : [])),
      regulations: rawComplexBundles.flatMap((bundle) => (bundle.regulation ? [bundle.regulation] : [])),
      marketIndicators: rawComplexBundles.flatMap((bundle) => (bundle.market ? [bundle.market] : [])),
    })

    expect(result.complexes).toHaveLength(2)
    expect(result.stats.physicalRecords).toBe(2)
    expect(result.stats.normalizedComplexes).toBe(2)
    expect(result.stats.warningCount).toBeGreaterThan(0)
    expect(result.stats.errorCount).toBe(0)
  })
})
