import { describe, expect, it } from 'vitest'
import { complexes } from '../data/complexes'
import { baseScenario, calculateDiagnosis, getContributionRange } from './diagnosis'

const target = complexes.find((complex) => complex.id === 'apt-002') ?? complexes[0]

describe('calculateDiagnosis', () => {
  it('returns bounded scores and display-grade values', () => {
    const diagnosis = calculateDiagnosis(target, baseScenario)

    expect(diagnosis.reconScore).toBeGreaterThanOrEqual(0)
    expect(diagnosis.reconScore).toBeLessThanOrEqual(100)
    expect(diagnosis.businessScore).toBeGreaterThanOrEqual(0)
    expect(diagnosis.businessScore).toBeLessThanOrEqual(100)
    expect(diagnosis.grade.length).toBeGreaterThan(0)
    expect(diagnosis.riskSummary).toHaveLength(3)
  })

  it('increases estimated contribution when construction cost rises', () => {
    const baseline = calculateDiagnosis(target, baseScenario)
    const stressed = calculateDiagnosis(target, {
      ...baseScenario,
      constructionCost: baseScenario.constructionCost + 120,
    })

    expect(stressed.contribution).toBeGreaterThan(baseline.contribution)
  })

  it('keeps same-size settlement independent from general sale price sensitivity', () => {
    const baseline = calculateDiagnosis(target, baseScenario)
    const stressed = calculateDiagnosis(target, {
      ...baseScenario,
      salePrice: baseScenario.salePrice - 10,
    })

    expect(stressed.contribution).toBe(baseline.contribution)
  })

  it('does not erase prime-location feasibility through mixed price units', () => {
    const jamsil = complexes.find((complex) => complex.id === 'apt-002')
    const apgujeong = complexes.find((complex) => complex.id === 'apt-005')

    expect(jamsil).toBeDefined()
    expect(apgujeong).toBeDefined()

    expect(calculateDiagnosis(jamsil!, baseScenario).businessScore).toBeGreaterThanOrEqual(70)
    expect(calculateDiagnosis(apgujeong!, baseScenario).businessScore).toBeGreaterThanOrEqual(70)
  })

  it('penalizes early-stage current-success scores while preserving pure business potential', () => {
    const eunma = complexes.find((complex) => complex.id === 'apt-001')!
    const apgujeong = complexes.find((complex) => complex.id === 'apt-005')!
    const eunmaDiagnosis = calculateDiagnosis(eunma, baseScenario)
    const apgujeongDiagnosis = calculateDiagnosis(apgujeong, baseScenario)

    expect(apgujeongDiagnosis.businessScore).toBeGreaterThan(eunmaDiagnosis.businessScore)
    expect(apgujeongDiagnosis.reconScore).toBeLessThan(eunmaDiagnosis.reconScore)
  })
})

describe('getContributionRange', () => {
  it('keeps optimistic, baseline, and conservative scenarios ordered', () => {
    const range = getContributionRange(2.4)

    expect(range.optimistic).toBeLessThan(range.baseline)
    expect(range.baseline).toBeLessThan(range.conservative)
  })
})
