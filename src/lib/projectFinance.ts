import type { Complex, ProjectFinance, Scenario } from '../types'

const PYEONG_PER_UNIT_EQUIVALENT = 29
const GROSS_TO_SALEABLE_MULTIPLIER = 1.72
const MEMBER_SALE_PRICE_DISCOUNT = 0.78
const RENTAL_SALE_PRICE_PER_PYEONG = 1000
const COMMERCIAL_AREA_RATIO = 0.025
const COMMERCIAL_PRICE_RATIO = 0.72
const DEFAULT_PROJECT_FAR = 330
const UNDERGROUND_3F_TOTAL_AREA_RATIO = 5.6
const OTHER_PROJECT_COST_MULTIPLIER = 1.4

export function calculateProjectFinance(complex: Complex, scenario: Scenario): ProjectFinance {
  const siteArea = complex.landShare * complex.units
  const saleableFloorArea = Math.max(siteArea * (complex.allowedFar / 100), complex.units * PYEONG_PER_UNIT_EQUIVALENT)
  const grossFloorArea = saleableFloorArea * GROSS_TO_SALEABLE_MULTIPLIER
  const rentalHousingArea = complex.financeOverride?.rentalHousingArea ?? saleableFloorArea * getRentalAreaRatio(complex, scenario)
  const commercialArea = complex.financeOverride?.commercialArea ?? saleableFloorArea * COMMERCIAL_AREA_RATIO
  const housingAndCommercialArea = rentalHousingArea + commercialArea
  const generalSaleFloor = saleableFloorArea * 0.04
  const requestedGeneralSaleArea = complex.financeOverride?.generalSaleArea
  const memberSaleArea = Math.min(
    complex.financeOverride?.memberSaleArea ?? complex.units * PYEONG_PER_UNIT_EQUIVALENT * getMemberUpsizeRatio(complex),
    Math.max(saleableFloorArea - housingAndCommercialArea - (requestedGeneralSaleArea ?? generalSaleFloor), 0),
  )
  const generalSaleArea = requestedGeneralSaleArea ?? Math.max(saleableFloorArea - memberSaleArea - housingAndCommercialArea, 0)

  const generalSalePricePerPyeong = complex.newBuildPrice * (scenario.salePrice / 100)
  const memberSalePricePerPyeong = generalSalePricePerPyeong * MEMBER_SALE_PRICE_DISCOUNT
  const commercialPricePerPyeong = generalSalePricePerPyeong * COMMERCIAL_PRICE_RATIO

  const previousAssetValue = complex.financeOverride?.previousAssetValue ?? complex.previousAssetValue * complex.units
  const constructionCost = complex.financeOverride?.constructionCost ?? (scenario.constructionCost / 10000) * grossFloorArea
  const businessCost = complex.financeOverride?.businessCost ?? calculateBusinessCost(complex, constructionCost, previousAssetValue, scenario)
  const totalCost = previousAssetValue + constructionCost + businessCost

  const memberSalesRevenue = complex.financeOverride?.memberSalesRevenue ?? memberSaleArea * memberSalePricePerPyeong / 10000
  const generalSalesRevenue = complex.financeOverride?.generalSalesRevenue ?? generalSaleArea * generalSalePricePerPyeong / 10000
  const rentalHousingRevenue = complex.financeOverride?.rentalHousingRevenue ?? rentalHousingArea * RENTAL_SALE_PRICE_PER_PYEONG / 10000
  const commercialRevenue = complex.financeOverride?.commercialRevenue ?? commercialArea * commercialPricePerPyeong / 10000
  const totalRevenue = memberSalesRevenue + generalSalesRevenue + rentalHousingRevenue + commercialRevenue
  const surplus = totalRevenue - constructionCost - businessCost
  const sameSizePyeong = estimateCurrentOwnedPyeong(complex)
  const sameSizeSettlement = calculateSettlement(complex, scenario, sameSizePyeong)
  const marketProRata = calculateSettlementImpliedProRata(complex, sameSizeSettlement, scenario)
  const accountingProRata = calculateAccountingProRata(surplus, previousAssetValue)
  const accountingSameSizeSettlement = calculateAccountingSettlement(
    accountingProRata,
    previousAssetValue,
    complex.units,
    memberSalePricePerPyeong,
    sameSizePyeong,
  )
  const proRata = marketProRata
  const contribution = complex.financeOverride?.contribution ?? sameSizeSettlement
  const sameSizeSettlementSource = '현재 구축 시세를 토지가치로 환산 + 신축 토지지분 원가 + 평당 사업비 원가'
  const accountingSettlementSource = '조합원분양가 - 권리가액(종전자산×정비사업식 비례율)'
  const settlementScenarios = buildEstimatedSettlementScenarios(complex, scenario, sameSizePyeong)
  const accountingSettlementScenarios = buildAccountingSettlementScenarios(
    complex,
    sameSizePyeong,
    accountingProRata,
    previousAssetValue,
    memberSalePricePerPyeong,
  )
  const breakEvenGeneralSalePrice = generalSaleArea > 0 ? ((totalCost - memberSalesRevenue - rentalHousingRevenue - commercialRevenue) * 10000) / generalSaleArea : 0

  return {
    plan: {
      siteArea,
      saleableFloorArea,
      grossFloorArea,
      memberSaleArea,
      generalSaleArea,
      rentalHousingArea,
      commercialArea,
    },
    cost: {
      previousAssetValue,
      constructionCost,
      businessCost,
      totalCost,
    },
    revenue: {
      memberSalesRevenue,
      generalSalesRevenue,
      rentalHousingRevenue,
      commercialRevenue,
      totalRevenue,
    },
    proRata,
    accountingProRata,
    marketProRata,
    surplus,
    contribution,
    accountingSameSizeSettlement,
    sameSizeSettlement,
    sameSizeSettlementSource,
    accountingSettlementSource,
    settlementScenarios,
    accountingSettlementScenarios,
    breakEvenGeneralSalePrice,
  }
}

function getRentalAreaRatio(complex: Complex, scenario: Scenario) {
  const farGap = Math.max(complex.allowedFar - complex.currentFar, 0)
  const incentiveRental = farGap > 40 ? Math.min(farGap / 1000, 0.07) : 0
  const publicContributionPenalty = scenario.publicContribution / 1000

  return Math.min(0.18, 0.08 + incentiveRental + publicContributionPenalty)
}

function getMemberUpsizeRatio(complex: Complex) {
  if (complex.landShare >= 16) return 1.28
  if (complex.landShare >= 12) return 1.15
  return 1.02
}

function calculateBusinessCost(complex: Complex, constructionCost: number, previousAssetValue: number, scenario: Scenario) {
  const compensationCost = previousAssetValue * 0.025
  const financeCost = constructionCost * (0.08 + scenario.interestRate / 100)
  const infrastructureCost = constructionCost * (0.055 + scenario.publicContribution / 1000)
  const taxAndOperationCost = constructionCost * 0.07
  const stageBuffer = complex.stage === '검토' || complex.stage === '추진위' ? constructionCost * 0.06 : constructionCost * 0.035

  return compensationCost + financeCost + infrastructureCost + taxAndOperationCost + stageBuffer
}

function buildEstimatedSettlementScenarios(complex: Complex, scenario: Scenario, sameSizePyeong: number) {
  const basePyeong = Math.max(sameSizePyeong, estimateTargetSupplyPyeong(complex))
  const scenarios = [
    { label: '동일형', allocatedPyeong: sameSizePyeong },
    { label: '기준형', allocatedPyeong: basePyeong },
    { label: '상향형', allocatedPyeong: basePyeong + 5 },
  ]

  return scenarios.map((settlementScenario) => ({
    label: settlementScenario.label,
    currentPyeong: sameSizePyeong,
    allocatedPyeong: settlementScenario.allocatedPyeong,
    settlement: calculateSettlement(complex, scenario, settlementScenario.allocatedPyeong),
    sourceType: 'inferred' as const,
    sourceName: '현재 구축 시세·대지지분·적용 용적률·평당 공사비 기반 추정',
    confidence: estimateSettlementConfidence(complex),
  }))
}

function buildAccountingSettlementScenarios(
  complex: Complex,
  sameSizePyeong: number,
  accountingProRata: number,
  previousAssetValue: number,
  memberSalePricePerPyeong: number,
) {
  const basePyeong = Math.max(sameSizePyeong, estimateTargetSupplyPyeong(complex))
  const scenarios = [
    { label: '동일형', allocatedPyeong: sameSizePyeong },
    { label: '기준형', allocatedPyeong: basePyeong },
    { label: '상향형', allocatedPyeong: basePyeong + 5 },
  ]

  return scenarios.map((settlementScenario) => ({
    label: settlementScenario.label,
    currentPyeong: sameSizePyeong,
    allocatedPyeong: settlementScenario.allocatedPyeong,
    settlement: calculateAccountingSettlement(
      accountingProRata,
      previousAssetValue,
      complex.units,
      memberSalePricePerPyeong,
      settlementScenario.allocatedPyeong,
    ),
    sourceType: 'inferred' as const,
    sourceName: '정비사업식 비례율·종전자산·조합원분양가 기반 추정',
    confidence: estimateAccountingSettlementConfidence(complex),
  }))
}

function calculateSettlement(complex: Complex, scenario: Scenario, allocatedPyeong: number) {
  const currentLandPricePerPyeong = complex.landShare > 0 ? complex.recentPrice / complex.landShare : 0
  const projectFar = estimateProjectFar(complex)
  const newUnitLandShare = allocatedPyeong / (projectFar / 100)
  const newUnitLandCost = currentLandPricePerPyeong * newUnitLandShare
  const projectCostPerPyeong = calculateProjectCostPerSupplyPyeong(scenario, projectFar)
  const newUnitProjectCost = projectCostPerPyeong * allocatedPyeong

  return newUnitLandCost + newUnitProjectCost - complex.recentPrice
}

function calculateAccountingProRata(surplus: number, previousAssetValue: number) {
  if (previousAssetValue <= 0) return 0

  return (surplus / previousAssetValue) * 100
}

function calculateAccountingSettlement(
  accountingProRata: number,
  previousAssetValue: number,
  units: number,
  memberSalePricePerPyeong: number,
  allocatedPyeong: number,
) {
  if (units <= 0) return 0

  const previousAssetPerUnit = previousAssetValue / units
  const rightValue = previousAssetPerUnit * (accountingProRata / 100)
  const memberSalePrice = (allocatedPyeong * memberSalePricePerPyeong) / 10000

  return memberSalePrice - rightValue
}

function calculateSettlementImpliedProRata(complex: Complex, sameSizeSettlement: number, scenario: Scenario) {
  const newUnitCost = complex.recentPrice + sameSizeSettlement

  if (complex.recentPrice <= 0 || newUnitCost <= 0) return 0

  const sameSizeRecoveryRatio = (complex.recentPrice / newUnitCost) * 100
  const generalSaleSensitivity = (scenario.salePrice - 100) * 0.55

  return sameSizeRecoveryRatio + generalSaleSensitivity
}

function estimateCurrentOwnedPyeong(complex: Complex) {
  if (complex.representativeSupplyPyeong) return complex.representativeSupplyPyeong

  const impliedSupplyPyeong = complex.landShare * (complex.currentFar / 100)

  return Math.round(Math.min(45, Math.max(18, impliedSupplyPyeong)))
}

function estimateTargetSupplyPyeong(complex: Complex) {
  if (complex.landShare >= 16) return 37
  if (complex.landShare >= 12) return 33
  return 30
}

function estimateProjectFar(complex: Complex) {
  return Math.max(300, Math.min(DEFAULT_PROJECT_FAR, complex.allowedFar))
}

function calculateProjectCostPerSupplyPyeong(scenario: Scenario, projectFar: number) {
  return (scenario.constructionCost * UNDERGROUND_3F_TOTAL_AREA_RATIO * OTHER_PROJECT_COST_MULTIPLIER) / (projectFar / 100) / 10000
}

function estimateSettlementConfidence(complex: Complex) {
  const highMarketSignal = complex.newBuildPrice >= 5500 && complex.recentPrice >= 20
  if (highMarketSignal && complex.landShare >= 15) return 66
  if (highMarketSignal) return 62
  return 54
}

function estimateAccountingSettlementConfidence(complex: Complex) {
  if (complex.financeOverride?.memberSaleArea || complex.financeOverride?.generalSaleArea || complex.financeOverride?.previousAssetValue) return 72
  if (complex.dataReliability >= 90) return 62
  return 52
}
