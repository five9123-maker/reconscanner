import type { DataSignal, MarketOverride, ProjectFinanceOverride } from '../types'

export type ManualComplexOverride = {
  complexId: string
  updatedAt: string
  sourceLabel: string
  aliases?: string[]
  note?: string
  values?: {
    previousAssetValue?: number
    recentPrice?: number
    newBuildPrice?: number
    allowedFar?: number
    regulationRisk?: '낮음' | '중간' | '높음'
    residentMomentum?: '낮음' | '중간' | '높음'
  }
  financeOverride?: ProjectFinanceOverride
  marketOverride?: MarketOverride
  manualSignals: DataSignal[]
}

export const manualComplexOverrides: ManualComplexOverride[] = []
