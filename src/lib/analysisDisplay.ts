import type { Complex, Diagnosis, Scenario } from '../types'
import type { TransactionDiagnostic } from '../types/liveEtl'
import { baseScenario } from './diagnosis'
import { getReferenceYear } from './date'
import { isInferredCandidate } from './complexFlags'

export function createScenarioDelta(diagnosis: Diagnosis, baselineDiagnosis: Diagnosis) {
  return {
    accountingSettlementDelta: diagnosis.finance.accountingSameSizeSettlement - baselineDiagnosis.finance.accountingSameSizeSettlement,
    marketSettlementDelta: diagnosis.finance.sameSizeSettlement - baselineDiagnosis.finance.sameSizeSettlement,
    proRataDelta: diagnosis.proRata - baselineDiagnosis.proRata,
    scoreDelta: diagnosis.reconScore - baselineDiagnosis.reconScore,
  }
}

export function createScoreTooltip(label: string, complex: Complex, diagnosis: Diagnosis, scenario: Scenario) {
  const farUpside = complex.allowedFar - complex.currentFar
  const age = getReferenceYear() - complex.builtYear
  const generalSaleRatio = diagnosis.finance.plan.saleableFloorArea > 0
    ? (diagnosis.finance.plan.generalSaleArea / diagnosis.finance.plan.saleableFloorArea) * 100
    : 0
  const constructionDelta = scenario.constructionCost - baseScenario.constructionCost

  const tooltips: Record<string, string> = {
    사업성: `판단 기준: 비례율, 대지지분, 용적률 여력, 주변 신축 시세, 공사비 민감도 가중합. 근거: 비례율 ${diagnosis.proRata.toFixed(0)}%, 대지지분 ${complex.landShare.toFixed(1)}평, 용적률 여력 ${farUpside}%p, 일반분양면적 ${generalSaleRatio.toFixed(1)}%`,
    노후도: `판단 기준: 준공 후 경과연수. 30년 이상이면 재건축 검토 가능 구간으로 가산. 근거: ${complex.builtYear}년 준공, ${age}년 경과`,
    규제: `판단 기준: 규제 리스크가 낮을수록 고점. 낮음 88점, 중간 66점, 높음 42점. 근거: 현재 ${complex.regulationRisk}, 허용 용적률 ${complex.allowedFar}%`,
    추진력: `판단 기준: 사업 단계와 주민 추진력 평균. 사업시행인가·관리처분인가·착공신고 등 후속 단계일수록 가산. 근거: 단계 ${complex.stage}, 주민 추진력 ${complex.residentMomentum}`,
    시장: `판단 기준: 금리와 공사비가 낮을수록 고점. 기준은 금리 ${baseScenario.interestRate}%, 공사비 ${baseScenario.constructionCost}만원/평. 근거: 현재 금리 ${scenario.interestRate}%, 공사비 ${scenario.constructionCost}만원/평, 기준 대비 ${constructionDelta >= 0 ? '+' : ''}${constructionDelta}만원/평`,
  }

  return tooltips[label] ?? `${label}: 산정 기준 미연결`
}

export function createScoreEvidenceItems(complex: Complex, diagnosis: Diagnosis, scenario: Scenario) {
  const farUpside = Math.max(complex.allowedFar - complex.currentFar, 0)
  const age = getReferenceYear() - complex.builtYear
  const generalSaleRatio = diagnosis.finance.plan.saleableFloorArea > 0
    ? (diagnosis.finance.plan.generalSaleArea / diagnosis.finance.plan.saleableFloorArea) * 100
    : 0

  return [
    {
      label: '사업성',
      method: '비례율, 대지지분, 용적률 여력, 일반분양 여력, 공사비 민감도 가중합',
      evidence: `비례율 ${diagnosis.proRata.toFixed(0)}%, 대지지분 ${complex.landShare.toFixed(1)}평, 용적률 여력 ${farUpside}%p, 일반분양 비중 ${generalSaleRatio.toFixed(1)}%`,
    },
    {
      label: '노후도',
      method: '준공 후 경과연수. 30년 이상 재건축 검토 가능 구간 가산',
      evidence: `${complex.builtYear}년 준공, ${age}년 경과`,
    },
    {
      label: '규제',
      method: '규제 리스크 낮음 88점, 중간 66점, 높음 42점',
      evidence: `현재 리스크 ${complex.regulationRisk}, 허용 용적률 ${complex.allowedFar}%`,
    },
    {
      label: '추진력',
      method: '사업 단계와 주민 추진력 평균. 후속 인허가 단계일수록 가산',
      evidence: `현재 단계 ${complex.stage}, 주민 추진력 ${complex.residentMomentum}`,
    },
    {
      label: '시장',
      method: '금리와 공사비가 기준보다 높을수록 감점',
      evidence: `공사비 ${scenario.constructionCost}만원/평, 금리 ${scenario.interestRate}%`,
    },
  ]
}

export function getDataEvidenceLabel(complex: Complex) {
  if (complex.dataProfile?.estimationMode === 'manual_enriched') return '추가 근거 포함'
  if (isInferredCandidate(complex)) return '후보 추정'

  return '공공 추정'
}

export function getUnitTypeCountLabel(complex: Complex, diagnostic?: TransactionDiagnostic) {
  const liveTypeCount = diagnostic?.areaPriceStats?.length

  if (liveTypeCount && liveTypeCount > 0) return `${liveTypeCount}종`

  return `${estimateUnitTypeCount(complex)}종 추정`
}

export function getUnitTypeCountTooltip(complex: Complex, diagnostic?: TransactionDiagnostic) {
  const liveTypeCount = diagnostic?.areaPriceStats?.length

  if (liveTypeCount && liveTypeCount > 0) {
    const ranges = diagnostic.areaPriceStats?.map((stat) => stat.areaRange).join(', ')

    return `출처: 국토교통부 실거래가 면적 구간. 최근 조회 거래에서 확인된 전용면적 구간 ${liveTypeCount}종. 구간: ${ranges}`
  }

  const representativePyeong = complex.representativeSupplyPyeong ?? complex.landShare * (complex.currentFar / 100)

  return `추정: 실거래 면적 구간 미확보. 대표 공급평형 ${representativePyeong.toFixed(1)}평, 세대수 ${complex.units.toLocaleString()}세대, 평균 대지지분 ${complex.landShare.toFixed(1)}평을 기준으로 평형 다양도 추정`
}

export function getStageTooltip(complex: Complex) {
  const verifiedStageSignal = complex.dataProfile?.manualSignals.find((signal) => signal.label === '사업 단계')
  const source = verifiedStageSignal
    ? `${verifiedStageSignal.sourceName} (웹 교차검증: ${verifiedStageSignal.value})`
    : isInferredCandidate(complex)
      ? '분석 후보 레퍼런스 모델'
      : '정비사업 정보몽땅 / 지자체 공개자료 / 단지 공개자료'

  return `출처: ${source}. 단계는 검토 → 추진위 → 조합설립 → 사업시행인가 → 관리처분인가 → 철거신고 → 착공신고 → 일반분양승인 → 준공인가 순으로 진행. 현재 ${complex.stage} 단계이며 추진력 점수와 일정 리스크에 반영`
}

export function findVerifiedSignal(complex: Complex, ...labels: string[]) {
  return complex.dataProfile?.manualSignals.find((signal) => labels.some((label) => signal.label.includes(label)))
}

export function createProRataCardTooltip(complex: Complex) {
  const base =
    '정비사업식: (총수익-공사비-사업비)/종전자산. 시장가치식: 현재 구축 시세/동일평형 신축 원가. 두 값을 함께 봐야 실제 분담금과 시장 체감 차이를 구분할 수 있음'
  const official = findVerifiedSignal(complex, '공식 비례율', '공식 사업성', '사업성 참고')

  return official ? `${base}. 웹 교차검증: ${official.value} — 출처: ${official.sourceName}` : base
}

export function createSettlementVerificationSuffix(complex: Complex) {
  const official = findVerifiedSignal(complex, '공식 분담금', '공식 사업성')

  return official ? ` 웹 교차검증: ${official.value} — 출처: ${official.sourceName}` : ''
}

function estimateUnitTypeCount(complex: Complex) {
  const representativePyeong = complex.representativeSupplyPyeong ?? complex.landShare * (complex.currentFar / 100)
  const sizeMixBase = representativePyeong <= 25 ? 2 : representativePyeong <= 32 ? 3 : 4
  const scaleBonus = complex.units >= 2000 ? 1 : 0
  const landShareBonus = complex.landShare >= 14 ? 1 : 0

  return Math.min(6, Math.max(2, sizeMixBase + scaleBonus + landShareBonus))
}
