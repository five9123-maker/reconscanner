import { describe, expect, it } from 'vitest'
import { rawComplexBundles } from './__fixtures__/rawComplexBundles'
import { normalizeComplex, normalizeComplexes } from './normalize'
import { validateComplex, validateComplexDataset } from './validate'

describe('validateComplex', () => {
  it('does not report blocking errors for a complete normalized record', () => {
    const complex = normalizeComplex(rawComplexBundles[0])
    const issues = validateComplex(complex)

    expect(issues.some((issue) => issue.severity === 'error')).toBe(false)
  })

  it('reports source and matching risks for a partial record', () => {
    const complex = normalizeComplex(rawComplexBundles[1])
    const issues = validateComplex(complex)

    expect(issues.some((issue) => issue.field === 'identifiers.kaptCode')).toBe(true)
    expect(issues.some((issue) => issue.field === 'identifiers.pnu')).toBe(true)
    expect(issues.some((issue) => issue.field === 'previousAssetValue')).toBe(true)
    expect(issues.some((issue) => issue.field === 'sourceFreshness.transaction')).toBe(true)
  })
})

describe('validateComplexDataset', () => {
  it('collects issues across the normalized dataset', () => {
    const complexes = normalizeComplexes(rawComplexBundles)
    const issues = validateComplexDataset(complexes)

    expect(issues.length).toBeGreaterThan(0)
    expect(issues.some((issue) => issue.complexName === '누락테스트아파트')).toBe(true)
  })
})
