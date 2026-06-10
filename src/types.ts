export type RiskLevel = '낮음' | '중간' | '높음'

export type Stage =
  | '검토'
  | '추진위'
  | '조합설립'
  | '사업시행인가'
  | '관리처분인가'
  | '철거신고'
  | '착공신고'
  | '일반분양승인'
  | '준공인가'

export type Complex = {
  id: string
  identifiers: ComplexIdentifiers
  name: string
  aliases: string[]
  district: string
  address: string
  legalDongCode: string
  builtYear: number
  units: number
  currentFar: number
  allowedFar: number
  landShare: number
  representativeSupplyPyeong?: number
  previousAssetValue: number
  recentPrice: number
  newBuildPrice: number
  stage: Stage
  regulationRisk: RiskLevel
  residentMomentum: RiskLevel
  dataReliability: number
  x: number
  y: number
  note: string
  sourceFreshness: SourceFreshness
  transactionBasis?: TransactionBasis
  dataProfile?: DataProfile
  financeOverride?: ProjectFinanceOverride
  marketOverride?: MarketOverride
}

export type TransactionBasis = {
  areaRange: string
  tradeCount: number
  medianPrice: number
  medianPricePerExclusivePyeong: number
  impliedSupplyPyeong: number
  exclusiveToSupplyRatio: number
  dealMonth?: string
  adjusted: boolean
  sourceName: string
  description: string
}

export type ComplexIdentifiers = {
  complexId: string
  kaptCode?: string
  legalDongCode: string
  pnu?: string
  roadAddress?: string
  jibunAddress: string
  lat: number
  lng: number
}

export type SourceFreshness = {
  physicalInfo: string
  transaction: string
  regulation: string
  costIndex: string
}

export type SourceType = 'official_api' | 'public_document' | 'manual_override' | 'inferred'

export type DataSignal = {
  label: string
  value: string
  sourceType: SourceType
  sourceName: string
  confidence: number
  method?: string
}

export type DataProfile = {
  estimationMode: 'public_api_estimate' | 'manual_enriched'
  publicSignals: DataSignal[]
  manualSignals: DataSignal[]
  gaps: string[]
}

export type ProjectFinanceOverride = {
  memberSaleArea?: number
  generalSaleArea?: number
  rentalHousingArea?: number
  commercialArea?: number
  previousAssetValue?: number
  constructionCost?: number
  businessCost?: number
  memberSalesRevenue?: number
  generalSalesRevenue?: number
  rentalHousingRevenue?: number
  commercialRevenue?: number
  contribution?: number
  note?: string
}

export type SettlementScenario = {
  label: string
  currentPyeong: number
  allocatedPyeong: number
  settlement: number
  sourceType: SourceType
  sourceName: string
  confidence: number
}

export type MarketOverride = {
  preferredExclusiveArea?: number
  allowAreaFallback?: boolean
  completionMarketPremium?: number
  completionMarketPricePerPyeong?: number
}

export type Scenario = {
  constructionCost: number
  salePrice: number
  interestRate: number
  publicContribution: number
}

export type ProjectFinance = {
  plan: {
    siteArea: number
    saleableFloorArea: number
    grossFloorArea: number
    memberSaleArea: number
    generalSaleArea: number
    rentalHousingArea: number
    commercialArea: number
  }
  cost: {
    previousAssetValue: number
    constructionCost: number
    businessCost: number
    totalCost: number
  }
  revenue: {
    memberSalesRevenue: number
    generalSalesRevenue: number
    rentalHousingRevenue: number
    commercialRevenue: number
    totalRevenue: number
  }
  proRata: number
  accountingProRata: number
  marketProRata: number
  surplus: number
  contribution: number
  accountingSameSizeSettlement: number
  sameSizeSettlement: number
  sameSizeSettlementSource: string
  accountingSettlementSource: string
  settlementScenarios: SettlementScenario[]
  accountingSettlementScenarios: SettlementScenario[]
  breakEvenGeneralSalePrice: number
}

export type Diagnosis = {
  businessScore: number
  agingScore: number
  regulationScore: number
  momentumScore: number
  timingScore: number
  reconScore: number
  proRata: number
  contribution: number
  finance: ProjectFinance
  grade: string
  businessLabel: string
  riskSummary: string[]
}

export type RankedComplex = {
  complex: Complex
  diagnosis: Diagnosis
}

export type DataQualitySummary = {
  totalComplexes: number
  inferredCandidateCount: number
  averageReliability: number
  missingKaptCode: number
  missingPnu: number
  staleSources: string[]
  issueCount: number
  warningCount: number
  errorCount: number
}
