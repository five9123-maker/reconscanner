import { describe, expect, it } from 'vitest'
import { baseScenario } from './diagnosis'
import { getScenarioStressLabel, isBaseScenario, sanitizeScenario } from './scenario'

describe('sanitizeScenario', () => {
  it('fills missing values from the base scenario', () => {
    expect(sanitizeScenario({})).toEqual(baseScenario)
  })

  it('clamps scenario values into supported UI ranges', () => {
    expect(
      sanitizeScenario({
        constructionCost: 2000,
        salePrice: 50,
        interestRate: Number.NaN,
        publicContribution: -10,
      }),
    ).toEqual({
      constructionCost: 1200,
      salePrice: 90,
      interestRate: baseScenario.interestRate,
      publicContribution: 0,
    })
  })
})

describe('scenario helpers', () => {
  it('detects the base scenario', () => {
    expect(isBaseScenario(baseScenario)).toBe(true)
    expect(isBaseScenario({ ...baseScenario, salePrice: 90 })).toBe(false)
  })

  it('labels stressed scenario assumptions', () => {
    expect(getScenarioStressLabel(baseScenario)).toBe('기준')
    expect(getScenarioStressLabel({ ...baseScenario, constructionCost: 1100 })).toBe('보수')
    expect(getScenarioStressLabel({ ...baseScenario, constructionCost: 820, salePrice: 121, interestRate: 3.6 })).toBe('낙관')
  })
})
