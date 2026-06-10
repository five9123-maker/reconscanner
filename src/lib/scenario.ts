import { baseScenario } from './diagnosis'
import type { Scenario } from '../types'

export function sanitizeScenario(scenario: Partial<Scenario>): Scenario {
  return {
    constructionCost: clampNumber(scenario.constructionCost, 760, 1200, baseScenario.constructionCost),
    salePrice: clampNumber(scenario.salePrice, 90, 130, baseScenario.salePrice),
    interestRate: clampNumber(scenario.interestRate, 2.5, 7, baseScenario.interestRate),
    publicContribution: clampNumber(scenario.publicContribution, 0, 25, baseScenario.publicContribution),
  }
}

export function isBaseScenario(scenario: Scenario) {
  return (
    scenario.constructionCost === baseScenario.constructionCost &&
    scenario.salePrice === baseScenario.salePrice &&
    scenario.interestRate === baseScenario.interestRate &&
    scenario.publicContribution === baseScenario.publicContribution
  )
}

export function getScenarioStressLabel(scenario: Scenario) {
  const costStress = scenario.constructionCost - baseScenario.constructionCost
  const saleStress = baseScenario.salePrice - scenario.salePrice
  const rateStress = scenario.interestRate - baseScenario.interestRate

  if (costStress >= 120 || saleStress >= 10 || rateStress >= 1) return '보수'
  if (costStress <= -80 && saleStress <= -5 && rateStress <= -0.5) return '낙관'
  return '기준'
}

function clampNumber(value: number | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback
  return Math.min(max, Math.max(min, value))
}
