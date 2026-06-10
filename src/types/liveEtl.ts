import type { Complex } from '../types'

export type LiveEtlStatus = {
  generatedAt: string
  mode?: 'live_api' | 'fallback_with_skips'
  targets?: string[]
  dealMonth?: string | number
  transactionLookbackMonths?: number
  seoulRenewal?: {
    rows: number
    regulationRecords: number
    error?: string
  }
  kaptMatches?: Array<{
    matched: boolean
  }>
  renewalMatches?: Array<{
    complexId: string
    complexName: string
    matched: boolean
    score: number
    sourceRecordName?: string
    reason: string
  }>
  transactionDiagnostics?: TransactionDiagnostic[]
  skippedSources: string[]
  complexes?: Complex[]
  stats: {
    normalizedComplexes: number
    warningCount: number
    errorCount: number
  }
}

export type TransactionDiagnostic = {
  complexName: string
  tradeCount: number
  representativeAreaRange?: string
  matchStrategy?: string
  matchConfidence?: number
  areaPriceStats?: Array<{
    areaRange: string
    tradeCount: number
    medianPrice: number
    medianPricePerPyeong: number
  }>
}
