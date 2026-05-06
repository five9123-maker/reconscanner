import { buildComplexBundles, buildComplexDataset } from './pipeline'
import type { KaptComplexRecord, MarketIndicatorRecord, RegulationRecord, TransactionMarketRecord } from './rawTypes'
import { validateComplexDataset, type DataValidationIssue } from './validate'
import type { Complex } from '../types'

export type EtlInput = {
  physical: KaptComplexRecord[]
  transactions: TransactionMarketRecord[]
  regulations: RegulationRecord[]
  marketIndicators: MarketIndicatorRecord[]
}

export type EtlRunResult = {
  complexes: Complex[]
  issues: DataValidationIssue[]
  stats: {
    physicalRecords: number
    transactionRecords: number
    regulationRecords: number
    marketIndicatorRecords: number
    bundles: number
    normalizedComplexes: number
    warningCount: number
    errorCount: number
  }
}

export function runInMemoryEtl(input: EtlInput): EtlRunResult {
  const bundles = buildComplexBundles(input)
  const complexes = buildComplexDataset(input)
  const issues = validateComplexDataset(complexes)

  return {
    complexes,
    issues,
    stats: {
      physicalRecords: input.physical.length,
      transactionRecords: input.transactions.length,
      regulationRecords: input.regulations.length,
      marketIndicatorRecords: input.marketIndicators.length,
      bundles: bundles.length,
      normalizedComplexes: complexes.length,
      warningCount: issues.filter((issue) => issue.severity === 'warning').length,
      errorCount: issues.filter((issue) => issue.severity === 'error').length,
    },
  }
}
