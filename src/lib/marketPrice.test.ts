import { describe, expect, it } from 'vitest'
import { complexes } from '../data/complexes'
import { baseScenario } from './diagnosis'
import {
  describeCompletionMarketPricePerPyeong,
  describeCurrentPricePerPyeong,
  describeExpectedSalePricePerPyeong,
  estimateCompletionMarketPricePerPyeong,
  estimateCurrentPricePerPyeong,
  estimateExpectedSalePricePerPyeong,
  estimateNationalPyeongCompletionValue,
} from './marketPrice'

describe('marketPrice', () => {
  it('estimates current price per pyeong from representative current price', () => {
    const jamsil = complexes.find((complex) => complex.id === 'apt-002')!

    expect(estimateCurrentPricePerPyeong(jamsil)).toBe(Math.round((jamsil.recentPrice * 10000) / 36))
    expect(describeCurrentPricePerPyeong(jamsil)).toContain('최근 대표 시세')
  })

  it('caps expected sale price by nearby new-build price in regulated districts', () => {
    const jamsil = complexes.find((complex) => complex.id === 'apt-002')!
    const baselinePrice = estimateExpectedSalePricePerPyeong(jamsil, baseScenario)

    // 송파구는 분양가상한제 권역: 분양가는 신축 기준가 × 75%를 넘지 않는다 (은마 보도 분양가 8,000만원/평 검증 기반)
    expect(baselinePrice).toBe(Math.round(jamsil.newBuildPrice * 0.75))
    expect(baselinePrice).toBeLessThan(estimateCurrentPricePerPyeong(jamsil) * 1.15)
    // 시나리오 배율은 상한 적용 후에도 비례해서 동작한다
    expect(estimateExpectedSalePricePerPyeong(jamsil, { ...baseScenario, salePrice: 110 })).toBe(
      Math.round((jamsil.newBuildPrice * 0.75 * 110) / 115),
    )
    expect(describeExpectedSalePricePerPyeong(jamsil, baseScenario)).toContain('평당 실거래가')
    expect(describeExpectedSalePricePerPyeong(jamsil, baseScenario)).toContain('분양가상한')
  })

  it('separates completion market value from capped sale price in prime locations', () => {
    const jamsil = complexes.find((complex) => complex.id === 'apt-002')!

    // 2026-06 웹 검증: 잠실 르엘 84㎡ 입주권 48억(평당 약 1.4억) 기준으로 완공가치는 1.1억~1.6억/평 구간
    expect(estimateCompletionMarketPricePerPyeong(jamsil, baseScenario)).toBeGreaterThan(11000)
    expect(estimateCompletionMarketPricePerPyeong(jamsil, baseScenario)).toBeLessThan(16000)
    expect(estimateCompletionMarketPricePerPyeong(jamsil, baseScenario)).toBeGreaterThan(estimateExpectedSalePricePerPyeong(jamsil, baseScenario))
    expect(describeCompletionMarketPricePerPyeong(jamsil, baseScenario)).toContain('현재 구축 평당가')
  })

  it('estimates national-pyeong completion value from completion market price', () => {
    const jamsil = complexes.find((complex) => complex.id === 'apt-002')!

    expect(estimateNationalPyeongCompletionValue(jamsil, baseScenario)).toBeCloseTo((estimateCompletionMarketPricePerPyeong(jamsil, baseScenario) * 33) / 10000)
  })
})
