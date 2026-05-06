import type { RiskLevel, Stage } from '../types'

export type KaptComplexRecord = {
  appId?: string
  stableComplexId?: string
  kaptCode?: string
  complexName: string
  roadAddress?: string
  jibunAddress: string
  district: string
  legalDongCode: string
  pnu?: string
  lat: number
  lng: number
  builtYear: number
  units: number
  landAreaPyeong: number
  currentFar: number
  updatedMonth: string
}

export type TransactionMarketRecord = {
  legalDongCode: string
  complexName: string
  recentPrice: number
  previousAssetValue: number
  transactionMonth: string
  tradeCount12m: number
  representativeArea?: number
  representativeAreaRange?: string
  matchConfidence?: number
  matchStrategy?: string
  areaPriceStats?: AreaPriceStat[]
}

export type TransactionMatchHint = {
  aliases?: string[]
  umdName?: string
  jibun?: string
  builtYear?: number
  preferredExclusiveArea?: number
  allowAreaFallback?: boolean
}

export type AreaPriceStat = {
  areaRange: string
  minArea: number
  maxArea: number
  tradeCount: number
  medianPrice: number
  medianPricePerPyeong: number
}

export type RegulationRecord = {
  legalDongCode: string
  complexName: string
  allowedFar: number
  stage: Stage
  regulationRisk: RiskLevel
  residentMomentum: RiskLevel
  updatedMonth: string
  sourceName?: string
  sourceType?: 'official_api' | 'fallback'
  sourceRecordName?: string
  matchConfidence?: number
  matchReason?: string
}

export type MarketIndicatorRecord = {
  district: string
  newBuildPrice: number
  costIndexMonth: string
}

export type RawComplexBundle = {
  physical: KaptComplexRecord
  transaction?: TransactionMarketRecord
  regulation?: RegulationRecord
  market?: MarketIndicatorRecord
}
