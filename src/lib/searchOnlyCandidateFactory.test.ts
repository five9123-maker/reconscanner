import { describe, expect, it } from 'vitest'
import { createSearchOnlyAnalysisCandidates } from './searchOnlyCandidateFactory'
import type { SearchIndexItem } from '../types/searchIndex'

describe('searchOnlyCandidateFactory', () => {
  it('converts legacy K-apt search-only records into low-confidence analysis candidates', () => {
    const candidates = createSearchOnlyAnalysisCandidates([
      searchOnly('A11052201', '명륜아남1차', '1111017100'),
      searchOnly('A10027118', '경희궁자이2단지 아파트', '1111017900'),
      searchOnly('A11054301', '창신쌍용1단지', '1111017400'),
    ])

    expect(candidates.map((candidate) => candidate.name)).toEqual(['명륜아남1차', '창신쌍용1단지'])
    expect(candidates[0].id).toBe('kapt-candidate-A11052201')
    expect(candidates[0].dataReliability).toBeLessThanOrEqual(42)
    expect(candidates[0].dataProfile?.publicSignals.every((signal) => signal.sourceType === 'inferred')).toBe(true)
    expect(candidates[0].dataProfile?.gaps).toContain('준공연도 실확인')
  })

  it('respects the requested expansion limit', () => {
    const candidates = createSearchOnlyAnalysisCandidates([
      searchOnly('A1', '창신쌍용1단지', '1111017400'),
      searchOnly('A2', '명륜아남1차', '1111017100'),
    ], { limit: 1 })

    expect(candidates).toHaveLength(1)
  })
})

function searchOnly(id: string, name: string, legalDongCode: string): SearchIndexItem {
  return {
    id,
    name,
    aliases: [],
    district: '',
    legalDongCode,
    status: 'search_only',
    source: 'kapt_api',
  }
}
