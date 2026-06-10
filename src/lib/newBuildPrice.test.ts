import { describe, expect, it } from 'vitest'
import { complexes } from '../data/complexes'
import { applyNewBuildPriceEstimates, estimateNewBuildPrice } from './newBuildPrice'

describe('newBuildPrice', () => {
  it('estimates nearby new-build reference price from weighted comparables', () => {
    const jamsil = complexes.find((complex) => complex.id === 'apt-002')!
    const estimate = estimateNewBuildPrice(jamsil)

    expect(estimate.pricePerPyeong).toBeGreaterThanOrEqual(9000)
    expect(estimate.comparableCount).toBeGreaterThanOrEqual(3)
    // 2026-06 웹 검증 비교 단지에는 보도 출처가 함께 표기된다
    expect(estimate.description).toContain('출처')
    expect(estimate.description).toContain('기준)')
  })

  it('applies comparable estimates without changing complex identity', () => {
    const enriched = applyNewBuildPriceEstimates(complexes)
    const apgujeong = enriched.find((complex) => complex.id === 'apt-005')!

    expect(apgujeong.name).toBe('압구정 현대 3차')
    expect(apgujeong.newBuildPrice).toBeGreaterThan(8200)
  })

  it('stabilizes missing comparable prices with peer median blending', () => {
    const ilsan = complexes.find((complex) => complex.id === 'apt-027')!
    const estimate = estimateNewBuildPrice(ilsan, complexes)

    expect(estimate.comparableCount).toBe(0)
    expect(estimate.pricePerPyeong).toBeGreaterThanOrEqual(Math.round((ilsan.newBuildPrice * 0.86) / 10) * 10)
    expect(estimate.pricePerPyeong).toBeLessThanOrEqual(Math.round((ilsan.newBuildPrice * 1.14) / 10) * 10)
    expect(estimate.description).toContain('혼합')
  })

  it('uses market-price reference bands when nearby comparables are missing', () => {
    const sanbon = complexes.find((complex) => complex.id === 'apt-022')!
    const estimate = estimateNewBuildPrice(sanbon, complexes)

    expect(estimate.comparableCount).toBe(0)
    expect(estimate.method).not.toBe('direct_comparable')
    expect(estimate.description).toContain('레퍼런스')
    expect(estimate.confidence).toBeGreaterThanOrEqual(52)
  })
})
