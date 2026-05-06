import { describe, expect, it } from 'vitest'
import { complexes } from '../data/complexes'
import { applyNewBuildPriceEstimates, estimateNewBuildPrice } from './newBuildPrice'

describe('newBuildPrice', () => {
  it('estimates nearby new-build reference price from weighted comparables', () => {
    const jamsil = complexes.find((complex) => complex.id === 'apt-002')!
    const estimate = estimateNewBuildPrice(jamsil)

    expect(estimate.pricePerPyeong).toBeGreaterThan(5900)
    expect(estimate.pricePerPyeong).toBeLessThan(6200)
    expect(estimate.comparableCount).toBeGreaterThanOrEqual(3)
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
    const bundang = complexes.find((complex) => complex.id === 'apt-029')!
    const estimate = estimateNewBuildPrice(bundang, complexes)

    expect(estimate.comparableCount).toBe(0)
    expect(estimate.method).toBe('market_band_blend')
    expect(estimate.description).toContain('레퍼런스')
    expect(estimate.confidence).toBeGreaterThanOrEqual(52)
  })
})
