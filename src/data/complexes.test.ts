import { describe, expect, it } from 'vitest'
import { baseScenario, calculateDiagnosis } from '../lib/diagnosis'
import { createSearchTokens, rankComplexNameMatch } from '../lib/search'
import { complexes } from './complexes'

describe('complexes dataset', () => {
  it('contains exactly 100 analysis-ready complexes with unique identifiers', () => {
    expect(complexes).toHaveLength(100)
    expect(new Set(complexes.map((complex) => complex.id)).size).toBe(100)
    expect(new Set(complexes.map((complex) => complex.identifiers.complexId)).size).toBe(100)
  })

  it('keeps all numeric assumptions within sane dashboard ranges', () => {
    for (const complex of complexes) {
      expect(complex.name).toBeTruthy()
      expect(complex.aliases.length).toBeGreaterThan(0)
      expect(complex.identifiers.lat).toBeGreaterThan(33)
      expect(complex.identifiers.lat).toBeLessThan(39)
      expect(complex.identifiers.lng).toBeGreaterThan(124)
      expect(complex.identifiers.lng).toBeLessThan(132)
      expect(complex.builtYear).toBeGreaterThanOrEqual(1970)
      expect(complex.builtYear).toBeLessThanOrEqual(2000)
      expect(complex.units).toBeGreaterThan(100)
      expect(complex.currentFar).toBeGreaterThan(80)
      expect(complex.allowedFar).toBeGreaterThanOrEqual(complex.currentFar)
      expect(complex.landShare).toBeGreaterThan(5)
      expect(complex.recentPrice).toBeGreaterThan(3)
      expect(complex.newBuildPrice).toBeGreaterThan(2000)
      expect(complex.x).toBeGreaterThanOrEqual(0)
      expect(complex.x).toBeLessThanOrEqual(100)
      expect(complex.y).toBeGreaterThanOrEqual(0)
      expect(complex.y).toBeLessThanOrEqual(100)
    }
  })

  it('can calculate diagnosis for every complex without NaN values', () => {
    for (const complex of complexes) {
      const diagnosis = calculateDiagnosis(complex, baseScenario)

      expect(Number.isFinite(diagnosis.reconScore)).toBe(true)
      expect(Number.isFinite(diagnosis.businessScore)).toBe(true)
      expect(Number.isFinite(diagnosis.proRata)).toBe(true)
      expect(Number.isFinite(diagnosis.finance.marketProRata)).toBe(true)
    }
  })

  it('generates searchable tokens for compact and initial-consonant queries', () => {
    const targets = [
      ['잠주5', '잠실주공5단지'],
      ['목14', '목동14단지'],
      ['반포1', '반포주공1단지'],
      ['여의도시범', '여의도 시범아파트'],
      ['백마', '백마마을삼성아파트'],
    ]

    for (const [query, name] of targets) {
      const item = complexes.find((complex) => complex.name === name)!
      const score = rankComplexNameMatch({ ...item, searchTokens: createSearchTokens(item.name, item.aliases) }, query)

      expect(score).toBeGreaterThan(0)
    }
  })

  it('marks generated expansion candidates as inferred data, not confirmed API facts', () => {
    const generatedCandidates = complexes.filter((complex) => Number(complex.id.replace('apt-', '')) >= 45)

    expect(generatedCandidates).toHaveLength(56)

    for (const complex of generatedCandidates) {
      expect(complex.dataReliability).toBeLessThanOrEqual(66)
      expect(complex.dataProfile?.publicSignals.every((signal) => signal.sourceType === 'inferred')).toBe(true)
      expect(complex.dataProfile?.gaps).toContain('K-apt 단지코드 실매칭')
      expect(complex.dataProfile?.gaps).toContain('국토부 실거래가 대표 평형 재산정')
    }
  })
})
