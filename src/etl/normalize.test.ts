import { describe, expect, it } from 'vitest'
import { rawComplexBundles } from './__fixtures__/rawComplexBundles'
import { createComplexId, normalizeComplex, normalizeComplexes } from './normalize'

describe('normalizeComplex', () => {
  it('merges public-data records into the internal Complex model', () => {
    const complex = normalizeComplex(rawComplexBundles[0])

    expect(complex.name).toBe('테스트리버아파트')
    expect(complex.identifiers.kaptCode).toBe('KAPT-DEMO-101')
    expect(complex.identifiers.pnu).toBe('1156011000100010000')
    expect(complex.landShare).toBe(15)
    expect(complex.allowedFar).toBe(300)
    expect(complex.previousAssetValue).toBe(13.4)
    expect(complex.newBuildPrice).toBe(4200)
    expect(complex.sourceFreshness.transaction).toBe('2026-03')
  })

  it('keeps partial records usable with lower reliability', () => {
    const complete = normalizeComplex(rawComplexBundles[0])
    const partial = normalizeComplex(rawComplexBundles[1])

    expect(partial.stage).toBe('검토')
    expect(partial.previousAssetValue).toBe(0)
    expect(partial.dataReliability).toBeLessThan(complete.dataReliability)
  })

  it('creates deterministic complex ids from Korean address data', () => {
    expect(createComplexId('1156011000', '1156011000100010000', '테스트리버아파트')).toBe('1156011000-1156011000100010000-테스트리버')
  })
})

describe('normalizeComplexes', () => {
  it('assigns sequential app ids while preserving stable complex ids', () => {
    const normalized = normalizeComplexes(rawComplexBundles)

    expect(normalized).toHaveLength(2)
    expect(normalized[0].id).toBe('apt-001')
    expect(normalized[1].id).toBe('apt-002')
    expect(normalized[0].identifiers.complexId).not.toBe(normalized[1].identifiers.complexId)
  })
})
