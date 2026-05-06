import { describe, expect, it } from 'vitest'
import { complexes } from '../data/complexes'
import { baseScenario } from './diagnosis'
import { calculateProjectFinance } from './projectFinance'

const target = complexes.find((complex) => complex.id === 'apt-002') ?? complexes[0]

describe('calculateProjectFinance', () => {
  it('builds a redevelopment project income statement', () => {
    const finance = calculateProjectFinance(target, baseScenario)

    expect(finance.plan.siteArea).toBeGreaterThan(0)
    expect(finance.plan.generalSaleArea).toBeGreaterThan(0)
    expect(finance.cost.totalCost).toBeGreaterThan(finance.cost.previousAssetValue)
    expect(finance.revenue.totalRevenue).toBeGreaterThan(0)
    expect(finance.proRata).toBeGreaterThan(0)
    expect(Number.isFinite(finance.sameSizeSettlement)).toBe(true)
  })

  it('keeps the planned sale areas within saleable floor area', () => {
    const finance = calculateProjectFinance(target, {
      ...baseScenario,
      publicContribution: 25,
    })
    const plannedArea =
      finance.plan.memberSaleArea + finance.plan.generalSaleArea + finance.plan.rentalHousingArea + finance.plan.commercialArea

    expect(plannedArea).toBeLessThanOrEqual(finance.plan.saleableFloorArea + 0.001)
  })

  it('raises break-even sale price when construction cost rises', () => {
    const baseline = calculateProjectFinance(target, baseScenario)
    const stressed = calculateProjectFinance(target, {
      ...baseScenario,
      constructionCost: baseScenario.constructionCost + 150,
    })

    expect(stressed.breakEvenGeneralSalePrice).toBeGreaterThan(baseline.breakEvenGeneralSalePrice)
  })

  it('reduces pro-rata ratio when general sale price drops', () => {
    const baseline = calculateProjectFinance(target, baseScenario)
    const stressed = calculateProjectFinance(target, {
      ...baseScenario,
      salePrice: baseScenario.salePrice - 12,
    })

    expect(stressed.proRata).toBeLessThan(baseline.proRata)
  })

  it('uses manually enriched assumptions when a complex provides them', () => {
    const finance = calculateProjectFinance(
      {
        ...target,
        financeOverride: {
          generalSaleArea: 12000,
          businessCost: 7000,
          contribution: 2.8,
        },
      },
      baseScenario,
    )

    expect(finance.plan.generalSaleArea).toBe(12000)
    expect(finance.cost.businessCost).toBe(7000)
    expect(finance.contribution).toBe(2.8)
  })

  it('builds estimated settlement scenarios when manual scenarios are missing', () => {
    const finance = calculateProjectFinance(target, baseScenario)

    expect(finance.settlementScenarios.length).toBeGreaterThanOrEqual(3)
    expect(finance.settlementScenarios[0].sourceType).toBe('inferred')
  })

  it('captures refund potential from high new-build prices and large asset values without complex-specific overrides', () => {
    const jamsil = complexes.find((complex) => complex.id === 'apt-002')!
    const apgujeong = complexes.find((complex) => complex.id === 'apt-005')!
    const sanggye = complexes.find((complex) => complex.id === 'apt-004')!

    expect(calculateProjectFinance(jamsil, baseScenario).sameSizeSettlement).toBeLessThan(0)
    expect(calculateProjectFinance(apgujeong, baseScenario).sameSizeSettlement).toBeLessThan(0)
    expect(calculateProjectFinance(sanggye, baseScenario).sameSizeSettlement).toBeGreaterThan(0)
  })

  it('keeps expected pro-rata consistent with same-size settlement economics', () => {
    const jamsil = complexes.find((complex) => complex.id === 'apt-002')!
    const apgujeong = complexes.find((complex) => complex.id === 'apt-005')!
    const eunma = complexes.find((complex) => complex.id === 'apt-001')!

    expect(calculateProjectFinance(jamsil, baseScenario).proRata).toBeGreaterThan(100)
    expect(calculateProjectFinance(apgujeong, baseScenario).proRata).toBeGreaterThan(120)
    expect(calculateProjectFinance(eunma, baseScenario).proRata).toBeLessThan(100)
  })

  it('keeps same-size settlement estimates in conservative sanity ranges for reference complexes', () => {
    const byId = Object.fromEntries(complexes.map((complex) => [complex.id, calculateProjectFinance(complex, baseScenario).sameSizeSettlement]))

    expect(byId['apt-001']).toBeGreaterThan(3)
    expect(byId['apt-001']).toBeLessThan(8)
    expect(byId['apt-002']).toBeGreaterThan(-4)
    expect(byId['apt-002']).toBeLessThan(1)
    expect(byId['apt-005']).toBeGreaterThan(-18)
    expect(byId['apt-005']).toBeLessThan(-7)
  })
})
