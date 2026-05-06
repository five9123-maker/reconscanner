import type { Complex, DataProfile, DataSignal } from '../types'
import { describeNewBuildComparables } from './newBuildPrice'

export function createPublicDataProfile(complex: Complex): DataProfile {
  const publicSignals: DataSignal[] = [
    {
      label: '단지 물리 정보',
      value: `${complex.builtYear}년 준공 · ${complex.units.toLocaleString()}세대 · 현재 용적률 ${complex.currentFar}%`,
      sourceType: 'official_api',
      sourceName: 'K-apt / 공동주택 기본정보',
      confidence: complex.identifiers.kaptCode ? 88 : 72,
      method: '준공연도, 세대수, 현재 용적률을 공동주택 단지 기본정보에서 취합',
    },
    {
      label: '토지·규제 추정',
      value: `허용 용적률 ${complex.allowedFar}% · 평균 대지지분 ${complex.landShare.toFixed(1)}평`,
      sourceType: complex.identifiers.pnu ? 'official_api' : 'inferred',
      sourceName: complex.identifiers.pnu ? '토지이음 / 지자체 고시' : '공공 데이터 기반 추정',
      confidence: complex.identifiers.pnu ? 82 : 58,
      method: '평균 대지지분은 대지면적/세대수. 허용 용적률은 도시계획·정비사업 기준과 단지 기본값 결합',
    },
    {
      label: '시장 가격',
      value: `최근 시세 ${complex.recentPrice.toFixed(1)}억 · 주변 신축 ${complex.newBuildPrice.toLocaleString()}만원/평`,
      sourceType: 'official_api',
      sourceName: '국토교통부 실거래가 / 한국부동산원 시세',
      confidence: complex.sourceFreshness.transaction === 'unknown' ? 52 : 78,
      method: `최근 시세는 실거래가 대표 평형 중앙값. 주변 신축 기준가는 ${describeNewBuildComparables(complex)}`,
    },
    {
      label: '추진 단계',
      value: `${complex.stage} · 주민 추진력 ${complex.residentMomentum}`,
      sourceType: 'public_document',
      sourceName: '정비사업 정보몽땅 / 지자체 공개자료',
      confidence: complex.sourceFreshness.regulation === 'unknown' ? 50 : 74,
      method: '서울 정비사업 API 매칭값 우선 사용. 미매칭 시 기존 정비사업 단계 추정값 사용',
    },
  ]

  return {
    estimationMode: 'public_api_estimate',
    publicSignals,
    manualSignals: [],
    gaps: createPublicDataGaps(complex),
  }
}

export function mergeDataProfile(complex: Complex, manualSignals: DataSignal[] = []): DataProfile {
  const baseProfile = complex.dataProfile ?? createPublicDataProfile(complex)

  return {
    ...baseProfile,
    estimationMode: manualSignals.length > 0 ? 'manual_enriched' : baseProfile.estimationMode,
    manualSignals: [...baseProfile.manualSignals, ...manualSignals],
    gaps: manualSignals.length > 0 ? baseProfile.gaps.filter((gap) => !isCoveredByManualSignal(gap, manualSignals)) : baseProfile.gaps,
  }
}

function createPublicDataGaps(complex: Complex) {
  const gaps = [
    '권리가액/종전자산 감정평가 세부표',
    '조합원 평형 신청 분포와 1+1 신청률',
    '상가·청산자·소송 등 비정형 리스크',
    '시공사 본계약 공사비와 설계변경 조건',
  ]

  if (!complex.identifiers.pnu) {
    gaps.unshift('필지 PNU 기반 토지·규제 매칭')
  }

  return gaps
}

function isCoveredByManualSignal(gap: string, manualSignals: DataSignal[]) {
  const normalizedGap = gap.replace(/\s+/g, '')

  return manualSignals.some((signal) => normalizedGap.includes(signal.label.replace(/\s+/g, '')))
}
