import { describe, expect, it } from 'vitest'
import { complexes } from '../data/complexes'
import type { Complex } from '../types'
import { findRenewalMatch, findTransactionDiagnostic, mergeLiveComplexes } from './livePayloadMerge'

const baseComplex = complexes[0]

describe('livePayloadMerge', () => {
  it('merges live API fields without losing local aliases and nested identifiers', () => {
    const liveComplex: Complex = {
      ...baseComplex,
      aliases: ['실시간별칭'],
      identifiers: {
        ...baseComplex.identifiers,
        kaptCode: 'KAPT-LIVE',
      },
      dataReliability: 99,
      dataProfile: {
        estimationMode: 'public_api_estimate',
        publicSignals: [
          {
            label: '실시간 테스트',
            value: '반영',
            sourceType: 'official_api',
            sourceName: '테스트 API',
            confidence: 99,
          },
        ],
        manualSignals: [],
        gaps: [],
      },
      sourceFreshness: {
        ...baseComplex.sourceFreshness,
        transaction: '2026-05',
      },
    }

    const [merged] = mergeLiveComplexes([baseComplex], [liveComplex])

    expect(merged.aliases).toContain(baseComplex.aliases[0])
    expect(merged.aliases).toContain('실시간별칭')
    expect(merged.identifiers.kaptCode).toBe('KAPT-LIVE')
    expect(merged.sourceFreshness.transaction).toBe('2026-05')
    expect(merged.dataReliability).toBe(99)
    expect(merged.dataProfile?.publicSignals[0].sourceName).toBe('테스트 API')
  })

  it('finds diagnostics and renewal matches by normalized names or id', () => {
    expect(findTransactionDiagnostic([{ complexName: baseComplex.name, tradeCount: 3 }], baseComplex)?.tradeCount).toBe(3)
    expect(
      findRenewalMatch(
        [
          {
            complexId: baseComplex.id,
            complexName: '다른 이름',
            matched: true,
            score: 91,
            reason: 'id match',
          },
        ],
        baseComplex,
      )?.score,
    ).toBe(91)
  })
})
