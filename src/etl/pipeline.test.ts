import { describe, expect, it } from 'vitest'
import { rawComplexBundles } from './__fixtures__/rawComplexBundles'
import { buildComplexBundles, buildComplexDataset } from './pipeline'

describe('buildComplexBundles', () => {
  it('joins raw source records by legal dong code and normalized complex name', () => {
    const bundles = buildComplexBundles({
      physical: rawComplexBundles.map((bundle) => bundle.physical),
      transactions: rawComplexBundles.flatMap((bundle) => (bundle.transaction ? [bundle.transaction] : [])),
      regulations: rawComplexBundles.flatMap((bundle) => (bundle.regulation ? [bundle.regulation] : [])),
      marketIndicators: rawComplexBundles.flatMap((bundle) => (bundle.market ? [bundle.market] : [])),
    })

    expect(bundles).toHaveLength(2)
    expect(bundles[0].transaction?.recentPrice).toBe(18.2)
    expect(bundles[0].regulation?.allowedFar).toBe(300)
    expect(bundles[1].transaction).toBeUndefined()
  })
})

describe('buildComplexDataset', () => {
  it('produces normalized complexes ready for repository ingestion', () => {
    const complexes = buildComplexDataset({
      physical: rawComplexBundles.map((bundle) => bundle.physical),
      transactions: rawComplexBundles.flatMap((bundle) => (bundle.transaction ? [bundle.transaction] : [])),
      regulations: rawComplexBundles.flatMap((bundle) => (bundle.regulation ? [bundle.regulation] : [])),
      marketIndicators: rawComplexBundles.flatMap((bundle) => (bundle.market ? [bundle.market] : [])),
    })

    expect(complexes[0].identifiers.complexId).toBe('1156011000-1156011000100010000-테스트리버')
    expect(complexes[0].dataReliability).toBeGreaterThan(complexes[1].dataReliability)
  })
})
