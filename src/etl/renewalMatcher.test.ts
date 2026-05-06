import { describe, expect, it } from 'vitest'
import { complexes } from '../data/complexes'
import { matchRenewalRecord } from './renewalMatcher'
import type { RegulationRecord } from './rawTypes'

describe('matchRenewalRecord', () => {
  it('matches a Seoul renewal record by apartment name and legal dong code', () => {
    const jamsil = complexes.find((complex) => complex.id === 'apt-002')
    const records: RegulationRecord[] = [
      {
        legalDongCode: '1171010100',
        complexName: '잠실주공5단지 주택재건축정비구역',
        allowedFar: 300,
        stage: '사업시행인가',
        regulationRisk: '중간',
        residentMomentum: '높음',
        updatedMonth: '2026-04',
      },
    ]

    expect(jamsil).toBeDefined()

    const match = matchRenewalRecord(jamsil!, records)

    expect(match.result).toMatchObject({
      complexId: 'apt-002',
      matched: true,
      sourceRecordName: '잠실주공5단지 주택재건축정비구역',
    })
    expect(match.record).toMatchObject({
      complexName: '잠실주공5단지',
      sourceType: 'official_api',
    })
  })

  it('keeps weak district-only matches out of the regulation record', () => {
    const eunma = complexes.find((complex) => complex.id === 'apt-001')
    const records: RegulationRecord[] = [
      {
        legalDongCode: '',
        complexName: '강남구 역삼동 도시환경정비구역',
        allowedFar: 250,
        stage: '검토',
        regulationRisk: '중간',
        residentMomentum: '중간',
        updatedMonth: 'unknown',
      },
    ]

    expect(eunma).toBeDefined()

    const match = matchRenewalRecord(eunma!, records)

    expect(match.result.matched).toBe(false)
    expect(match.record).toBeUndefined()
  })
})
