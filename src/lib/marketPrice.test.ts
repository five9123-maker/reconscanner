import { describe, expect, it } from 'vitest'
import { complexes } from '../data/complexes'
import { baseScenario } from './diagnosis'
import {
  describeCurrentPricePerPyeong,
  describeExpectedSalePricePerPyeong,
  estimateCurrentPricePerPyeong,
  estimateExpectedSalePricePerPyeong,
} from './marketPrice'

describe('marketPrice', () => {
  it('estimates current price per pyeong from representative current price', () => {
    const jamsil = complexes.find((complex) => complex.id === 'apt-002')!

    expect(estimateCurrentPricePerPyeong(jamsil)).toBe(Math.round((jamsil.recentPrice * 10000) / 36))
    expect(describeCurrentPricePerPyeong(jamsil)).toContain('최근 대표 시세')
  })

  it('estimates expected sale price per pyeong from new-build reference and scenario', () => {
    const jamsil = complexes.find((complex) => complex.id === 'apt-002')!

    expect(estimateExpectedSalePricePerPyeong(jamsil, baseScenario)).toBe(jamsil.newBuildPrice)
    expect(estimateExpectedSalePricePerPyeong(jamsil, { ...baseScenario, salePrice: 90 })).toBe(Math.round(jamsil.newBuildPrice * 0.9))
    expect(describeExpectedSalePricePerPyeong(jamsil, baseScenario)).toContain('신축 기준가')
  })
})
