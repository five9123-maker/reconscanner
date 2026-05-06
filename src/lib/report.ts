import { getContributionRange } from './diagnosis'
import { createPublicDataProfile } from './dataProfile'
import type { Complex, Diagnosis, Scenario } from '../types'

export type ReportPayload = {
  title: string
  generatedAt: string
  complex: {
    id: string
    complexId: string
    name: string
    address: string
    builtYear: number
    units: number
    currentFar: number
    allowedFar: number
    landShare: number
  }
  diagnosis: {
    grade: string
    reconScore: number
    businessLabel: string
    businessScore: number
    proRata: number
    accountingProRata: number
    marketProRata: number
    contributionRange: ReturnType<typeof getContributionRange>
    accountingContributionRange: ReturnType<typeof getContributionRange>
    riskSummary: string[]
  }
  finance: {
    totalRevenue: number
    previousAssetValue: number
    constructionCost: number
    businessCost: number
    totalCost: number
    surplus: number
    generalSaleArea: number
    rentalHousingArea: number
    breakEvenGeneralSalePrice: number
  }
  assumptions: Scenario
  data: {
    reliability: number
    sourceFreshness: Complex['sourceFreshness']
    estimationMode: NonNullable<Complex['dataProfile']>['estimationMode']
    manualSignalCount: number
    remainingGaps: string[]
  }
  disclaimer: string
}

export function buildReportPayload(complex: Complex, diagnosis: Diagnosis, scenario: Scenario, generatedAt = new Date().toISOString()): ReportPayload {
  const dataProfile = complex.dataProfile ?? createPublicDataProfile(complex)

  return {
    title: `${complex.name} 재건축 사업성 진단`,
    generatedAt,
    complex: {
      id: complex.id,
      complexId: complex.identifiers.complexId,
      name: complex.name,
      address: complex.address,
      builtYear: complex.builtYear,
      units: complex.units,
      currentFar: complex.currentFar,
      allowedFar: complex.allowedFar,
      landShare: complex.landShare,
    },
    diagnosis: {
      grade: diagnosis.grade,
      reconScore: Math.round(diagnosis.reconScore),
      businessLabel: diagnosis.businessLabel,
      businessScore: Math.round(diagnosis.businessScore),
      proRata: Math.round(diagnosis.proRata),
      accountingProRata: Math.round(diagnosis.finance.accountingProRata),
      marketProRata: Math.round(diagnosis.finance.marketProRata),
      contributionRange: getContributionRange(diagnosis.contribution),
      accountingContributionRange: getContributionRange(diagnosis.finance.accountingSameSizeSettlement),
      riskSummary: diagnosis.riskSummary,
    },
    finance: {
      totalRevenue: Math.round(diagnosis.finance.revenue.totalRevenue * 10) / 10,
      previousAssetValue: Math.round(diagnosis.finance.cost.previousAssetValue * 10) / 10,
      constructionCost: Math.round(diagnosis.finance.cost.constructionCost * 10) / 10,
      businessCost: Math.round(diagnosis.finance.cost.businessCost * 10) / 10,
      totalCost: Math.round(diagnosis.finance.cost.totalCost * 10) / 10,
      surplus: Math.round((diagnosis.finance.surplus - diagnosis.finance.cost.previousAssetValue) * 10) / 10,
      generalSaleArea: Math.round(diagnosis.finance.plan.generalSaleArea),
      rentalHousingArea: Math.round(diagnosis.finance.plan.rentalHousingArea),
      breakEvenGeneralSalePrice: Math.round(diagnosis.finance.breakEvenGeneralSalePrice),
    },
    assumptions: scenario,
    data: {
      reliability: complex.dataReliability,
      sourceFreshness: complex.sourceFreshness,
      estimationMode: dataProfile.estimationMode,
      manualSignalCount: dataProfile.manualSignals.length,
      remainingGaps: dataProfile.gaps,
    },
    disclaimer: '본 리포트는 공개 데이터와 입력 가정 기반의 참고용 진단이며, 투자 판단이나 법적 검토를 대체하지 않습니다.',
  }
}
