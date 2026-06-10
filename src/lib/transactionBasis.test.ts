import { describe, expect, it } from 'vitest'
import type { Complex } from '../types'
import type { LiveEtlStatus } from '../types/liveEtl'
import { applyTransactionBasis } from './transactionBasis'

function createComplex(overrides: Partial<Complex> = {}): Complex {
  return {
    id: 'apt-test',
    identifiers: {
      complexId: 'test-complex',
      legalDongCode: '1100000000',
      jibunAddress: '서울 테스트구 테스트동',
      lat: 37.5,
      lng: 127.0,
    },
    name: '테스트아파트',
    aliases: ['테스트아파트'],
    district: '테스트구',
    address: '서울 테스트구',
    legalDongCode: '1100000000',
    builtYear: 1980,
    units: 1000,
    currentFar: 180,
    allowedFar: 300,
    landShare: 12,
    representativeSupplyPyeong: 35,
    previousAssetValue: 20,
    recentPrice: 40,
    newBuildPrice: 8000,
    stage: '조합설립',
    regulationRisk: '중간',
    residentMomentum: '중간',
    dataReliability: 90,
    x: 50,
    y: 50,
    note: '',
    sourceFreshness: {
      physicalInfo: '2026-04',
      transaction: '2026-03',
      regulation: '2026-03',
      costIndex: '2026-03',
    },
    ...overrides,
  }
}

function createLiveStatus(areaPriceStats: NonNullable<NonNullable<LiveEtlStatus['transactionDiagnostics']>[number]['areaPriceStats']>): LiveEtlStatus {
  return {
    generatedAt: '2026-05-06T00:00:00.000Z',
    dealMonth: 202603,
    skippedSources: [],
    stats: { normalizedComplexes: 1, warningCount: 0, errorCount: 0 },
    transactionDiagnostics: [
      {
        complexName: '테스트아파트',
        tradeCount: areaPriceStats.reduce((sum, stat) => sum + stat.tradeCount, 0),
        areaPriceStats,
      },
    ],
  }
}

describe('applyTransactionBasis', () => {
  it('keeps representative pyeong when the implied supply pyeong is consistent', () => {
    // 전용 84㎡(전용평 25.4) → 공급평 약 33.9 = 대표 35평과 정합 (오차 10% 미만)
    const complex = createComplex({ recentPrice: 40 })
    const live = createLiveStatus([{ areaRange: '60~85㎡', tradeCount: 10, medianPrice: 40, medianPricePerPyeong: 1.574 }])

    const [result] = applyTransactionBasis([complex], live)

    expect(result.representativeSupplyPyeong).toBe(35)
    expect(result.recentPrice).toBe(40)
    expect(result.transactionBasis?.sourceName).toContain('국토교통부')
    expect(result.transactionBasis?.description).toContain('2026.03')
    expect(result.transactionBasis?.adjusted).toBe(false)
  })

  it('re-anchors representative pyeong when the matched band is a different unit size', () => {
    // 압구정신현대 패턴: 대표 35평인데 거래 중앙값이 대형(전용 152㎡, 97억)에 잡힌 경우
    const complex = createComplex({ recentPrice: 97, previousAssetValue: 97 * 0.78 })
    const live = createLiveStatus([{ areaRange: '135㎡~', tradeCount: 11, medianPrice: 97, medianPricePerPyeong: 1.828 }])

    const [result] = applyTransactionBasis([complex], live)

    // 전용평 53.1 → 공급평 70.8로 보정되어 평당가가 과대평가되지 않는다
    expect(result.representativeSupplyPyeong).toBeCloseTo(70.8, 0)
    expect(result.transactionBasis?.adjusted).toBe(true)
    expect(result.previousAssetValue).toBeCloseTo(97 * 0.78, 5)
  })

  it('selects the band containing preferredExclusiveArea and keeps the trusted representative pyeong', () => {
    const complex = createComplex({
      recentPrice: 97,
      marketOverride: { preferredExclusiveArea: 109.24 },
    })
    const live = createLiveStatus([
      { areaRange: '102~135㎡', tradeCount: 9, medianPrice: 66.2, medianPricePerPyeong: 2.004 },
      { areaRange: '135㎡~', tradeCount: 11, medianPrice: 97, medianPricePerPyeong: 1.828 },
    ])

    const [result] = applyTransactionBasis([complex], live)

    expect(result.recentPrice).toBe(66.2)
    expect(result.representativeSupplyPyeong).toBe(35)
    expect(result.transactionBasis?.areaRange).toBe('102~135㎡')
    expect(result.transactionBasis?.description).toContain('109.24㎡')
  })

  it('skips untrusted transaction matches when area fallback is disabled', () => {
    // 후곡10 패턴: 동명 단지 오매칭으로 대표 전용면적 구간 거래가 없는 경우
    const complex = createComplex({
      recentPrice: 6.7,
      representativeSupplyPyeong: 37,
      marketOverride: { preferredExclusiveArea: 101.24, allowAreaFallback: false },
    })
    const live = createLiveStatus([{ areaRange: '60~85㎡', tradeCount: 25, medianPrice: 3.5, medianPricePerPyeong: 0.17 }])

    const [result] = applyTransactionBasis([complex], live)

    expect(result.recentPrice).toBe(6.7)
    expect(result.transactionBasis).toBeUndefined()
  })

  it('recomputes derived previous asset value when the price basis changes', () => {
    const complex = createComplex({ recentPrice: 97, previousAssetValue: 97 * 0.78 })
    const live = createLiveStatus([
      { areaRange: '102~135㎡', tradeCount: 9, medianPrice: 66.2, medianPricePerPyeong: 2.004 },
      { areaRange: '135㎡~', tradeCount: 11, medianPrice: 97, medianPricePerPyeong: 1.828 },
    ])
    const withPreferred = createComplex({
      recentPrice: 97,
      previousAssetValue: 97 * 0.78,
      marketOverride: { preferredExclusiveArea: 109.24 },
    })

    const [result] = applyTransactionBasis([withPreferred], live)

    expect(result.recentPrice).toBe(66.2)
    expect(result.previousAssetValue).toBeCloseTo(66.2 * 0.78, 5)
    expect(complex.previousAssetValue).toBeCloseTo(97 * 0.78, 5)
  })

  it('returns complexes untouched when no diagnostics exist', () => {
    const complex = createComplex()

    expect(applyTransactionBasis([complex], null)).toEqual([complex])
  })
})
