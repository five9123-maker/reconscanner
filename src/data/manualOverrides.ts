import type { DataSignal, MarketOverride, ProjectFinanceOverride, Stage } from '../types'

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
    representativeSupplyPyeong?: number
    stage?: Stage
    regulationRisk?: '낮음' | '중간' | '높음'
    residentMomentum?: '낮음' | '중간' | '높음'
  }
  financeOverride?: ProjectFinanceOverride
  marketOverride?: MarketOverride
  manualSignals: DataSignal[]
}

// 2026-06 대표 단지 10곳 웹 교차검증 결과 반영.
// 값 출처는 각 manualSignals의 sourceName 참조 (실거래·사업단계·사업성 보도 기반).
export const manualComplexOverrides: ManualComplexOverride[] = [
  {
    complexId: 'seoul-gangnam-apgujeong-shinhyundai',
    updatedAt: '2026-06-11',
    sourceLabel: '압구정2구역 보도 교차검증(2026-06)',
    values: {
      stage: '조합설립',
    },
    manualSignals: [
      {
        label: '사업 단계',
        value: '조합설립(2025-10 정비구역 지정, 2026-03 현대건설 공사도급계약 2조 7,489억)',
        sourceType: 'public_document',
        sourceName: '서울시 고시·현대건설 뉴스룸(2026-03-30)',
        confidence: 88,
      },
      {
        label: '실거래 검증',
        value: '전용 109.24㎡(35평형) 2026-01-12 70억 신고가',
        sourceType: 'public_document',
        sourceName: '비즈니스포스트(2026-02-20, 국토부 실거래 기반)',
        confidence: 84,
      },
      {
        label: '사업성 참고',
        value: '공사비 평당 1,150만원, 조합 추정 비례율 42%대(일반분양 29가구뿐인 압구정 특유 구조)',
        sourceType: 'public_document',
        sourceName: '아시아경제(2025-09-30)',
        confidence: 72,
      },
    ],
  },
  {
    complexId: 'seoul-songpa-bangi-olympic-athlete',
    updatedAt: '2026-06-11',
    sourceLabel: '올림픽선수기자촌 정비계획 보도 교차검증(2026-06)',
    values: {
      stage: '추진위',
    },
    financeOverride: {
      previousAssetValue: 188332,
      note: '정비계획안 종전자산 추정총액 18조 8,332억원 (위클리한국주택경제 2026-05-04)',
    },
    manualSignals: [
      {
        label: '사업 단계',
        value: '추진위 승인 신청(2025-09)·정비구역 지정안 주민공람(2026-04~06)',
        sourceType: 'public_document',
        sourceName: '위클리한국주택경제신문(2026-05-04)',
        confidence: 86,
      },
      {
        label: '공식 비례율',
        value: '정비계획안 추정 비례율 87.01% (총수입 24조 2,847억, 총지출 7조 8,972억)',
        sourceType: 'public_document',
        sourceName: '위클리한국주택경제신문(2026-05-04)',
        confidence: 82,
      },
    ],
  },
  {
    complexId: 'seoul-gangnam-daechi-mido',
    updatedAt: '2026-06-11',
    sourceLabel: '대치미도 실거래·추진위 보도 교차검증(2026-06)',
    values: {
      recentPrice: 37.3,
      stage: '추진위',
    },
    manualSignals: [
      {
        label: '실거래 검증',
        value: '전용 84.96㎡ 2026-04-09 37.3억 (2026-03 단건 중앙값 44.3억은 표본 1건이라 교정)',
        sourceType: 'public_document',
        sourceName: '집품 국토부 실거래 집계(2026-05-26 기준)',
        confidence: 80,
      },
      {
        label: '사업 단계',
        value: '2025-07 정비구역 지정 고시, 2026-01 추진위원장 선거(조합설립 준비)',
        sourceType: 'public_document',
        sourceName: '강남구청 보도자료·한국NGO신문(2026-01)',
        confidence: 84,
      },
    ],
  },
  {
    complexId: 'seoul-mapo-seongsan-siyoung',
    updatedAt: '2026-06-11',
    sourceLabel: '성산시영 조합설립 보도 교차검증(2026-06)',
    values: {
      stage: '조합설립',
      previousAssetValue: 10.5,
    },
    manualSignals: [
      {
        label: '사업 단계',
        value: '2025-12 조합설립인가(마포구), 2026년 시공사 선정 예정, 약 4,800가구 계획',
        sourceType: 'public_document',
        sourceName: '한국경제(2025-10-26)·정비업계 정리자료',
        confidence: 78,
      },
      {
        label: '사업성 참고',
        value: '2022년 추정 비례율 100.46%, 공사비 인상으로 분담금 증가 우려 보도',
        sourceType: 'public_document',
        sourceName: '하우징워치(2022-12-17)·뉴데일리(2024-03-12)',
        confidence: 66,
      },
      {
        label: '종전자산 보정',
        value: '세대당 종전자산 10.5억 (2022년 전용 50㎡ 권리가액 10.7억 보도 기반)',
        sourceType: 'public_document',
        sourceName: '하우징워치(2022-12-17)',
        confidence: 64,
      },
    ],
  },
  {
    complexId: 'seoul-nowon-sanggye-jugong5',
    updatedAt: '2026-06-11',
    sourceLabel: '상계주공5 분담금·시공 보도 교차검증(2026-06)',
    values: {
      previousAssetValue: 4.3,
      stage: '사업시행인가',
    },
    manualSignals: [
      {
        label: '사업 단계',
        value: '2025-09 한화 건설부문 시공사 선정, 2026-06-18~07-06 조합원 분양신청(관리처분 준비)',
        sourceType: 'public_document',
        sourceName: '뉴스핌(2025-09-20)·헤럴드경제(2026-05-22)',
        confidence: 86,
      },
      {
        label: '공식 분담금',
        value: '보정계수 적용 후 추정 분담금 59㎡ 3.66억 / 67㎡ 4.47억 / 84㎡ 6.05억, 비례율 81.51%',
        sourceType: 'public_document',
        sourceName: '헤럴드경제(2026-05-22)·시티타임스(2025-10-07)',
        confidence: 80,
      },
      {
        label: '실거래 검증',
        value: '전용 31.98㎡ 2025-12 6.9억, 2026-02 호가 7억~7.5억',
        sourceType: 'public_document',
        sourceName: '디지털타임스(2026-02-25)',
        confidence: 78,
      },
    ],
  },
  {
    complexId: 'gyeonggi-ilsan-hugok10',
    updatedAt: '2026-06-11',
    sourceLabel: '후곡10 선도지구·실거래 교차검증(2026-06)',
    values: {
      recentPrice: 7.37,
      previousAssetValue: 5.7,
      representativeSupplyPyeong: 37,
      stage: '추진위',
      residentMomentum: '높음',
    },
    note: '일산 선도지구(후곡 3·4·10·15) 확정 단지. ETL 자동 매칭 시세(3.5억)는 동명 인접 단지 오매칭으로 판단해 보도 실거래로 교정.',
    manualSignals: [
      {
        label: '실거래 검증',
        value: '37평형(전용 101.24㎡) 2026-02-05 7.37억, 46평형 7.8~8.1억 — ETL 매칭값 3.5억은 오매칭',
        sourceType: 'public_document',
        sourceName: '아파트미 국토부 실거래 집계(2026-06-11 조회)',
        confidence: 82,
      },
      {
        label: '사업 단계',
        value: '2024-11 일산 선도지구 선정(후곡 3·4·10·15, 2,564세대), 2025-10 한국토지신탁 예비사업시행자 지정',
        sourceType: 'public_document',
        sourceName: '뉴시스(2024-11-27)·머니투데이(2025-10-02)',
        confidence: 86,
      },
      {
        label: '사업성 참고',
        value: '일산 기준용적률 300%(1기 신도시 최저), 가구당 분담금 약 5억 전망 보도',
        sourceType: 'public_document',
        sourceName: '디지털타임스(2024-11-27)·고양신문(2025-05-30)',
        confidence: 64,
      },
    ],
  },
  {
    complexId: 'gyeonggi-bundang-gumi-kkachi2',
    updatedAt: '2026-06-11',
    sourceLabel: '까치마을2 선도지구 현황 교차검증(2026-06)',
    values: {
      residentMomentum: '높음',
    },
    note: '선도지구 미선정. 까치1·2+하얀5 통합재건축(신탁 MOU, 동의율 85%+)으로 2026년 분당 2차 특별정비구역 도전 중.',
    manualSignals: [
      {
        label: '사업 단계',
        value: '2024-11 분당 선도지구 미선정, 2024-06 교보자산신탁 MOU·사전동의 85%+, 2026-07 2차 특별정비구역 제안 접수 예정',
        sourceType: 'public_document',
        sourceName: '디지털타임스(2024-11-27)·이데일리 마켓in(2024-06-14)·비전성남(2025-12-19)',
        confidence: 80,
      },
      {
        label: '실거래 검증',
        value: '전용 58.14㎡(22평형) 2026-02-23 14.95억 신고가, 2026-05 14.2~14.55억',
        sourceType: 'public_document',
        sourceName: '아파트미 국토부 실거래 집계(2026-06-11 조회)',
        confidence: 82,
      },
      {
        label: '사업성 참고',
        value: '분당 선도지구 추정 분담금 가구당 2.5억~3억, 양지마을 일반분양가 평당 5,800만원 가정',
        sourceType: 'public_document',
        sourceName: '디지털타임스(2024-11-27)·위클리한국주택경제(2024-12-19)',
        confidence: 66,
      },
    ],
  },
  {
    complexId: 'seoul-gangnam-daechi-eunma',
    updatedAt: '2026-06-11',
    sourceLabel: '은마 사업성 보도 교차검증(2026-06)',
    values: {
      allowedFar: 332,
    },
    manualSignals: [
      {
        label: '허용 용적률',
        value: '서울시 통합심의 용적률 특례 331.9% (기존 300% 가정 대비 655가구 추가)',
        sourceType: 'public_document',
        sourceName: '헤럴드경제(2025-09, 통합심의 통과 보도)',
        confidence: 86,
      },
      {
        label: '사업 단계',
        value: '2025-09 통합심의 통과(49층 5,893가구), 2026-06 사업시행인가 신청서 제출',
        sourceType: 'public_document',
        sourceName: '헤럴드경제(2025-09)·아주경제(2026-06-09)',
        confidence: 86,
      },
      {
        label: '공식 사업성',
        value: '비례율 94.18%, 공사비 평당 930만원, 추정 분담금 76㎡→76㎡ 4.2억 / 84㎡→84㎡ 3.2억',
        sourceType: 'public_document',
        sourceName: '아시아경제(2025-10-23)·매경이코노미(2026-05-23)',
        confidence: 80,
      },
      {
        label: '분양가 검증',
        value: '예상 일반분양가 평당 약 8,000만원(전용 84㎡ 기준 27억선)',
        sourceType: 'public_document',
        sourceName: '머니S(2025-09-03)',
        confidence: 72,
      },
    ],
  },
  {
    complexId: 'seoul-songpa-jamsil-jugong5',
    updatedAt: '2026-06-11',
    sourceLabel: '잠실주공5 사업성 보도 교차검증(2026-06)',
    manualSignals: [
      {
        label: '사업 단계',
        value: '2025-06 통합심의 통과(최고 65층, 6,400세대급), 2025년 말 사업시행인가 신청, 2026년 고시 목표',
        sourceType: 'public_document',
        sourceName: 'EBN(2025-06-20)·머니투데이(2026-05-30)',
        confidence: 84,
      },
      {
        label: '공식 분담금',
        value: '조합 추정: 전용 82㎡ 보유자 84㎡ 선택 시 약 6.6억 환급, 76㎡ 보유자 84㎡ 선택 시 약 1억 환급',
        sourceType: 'public_document',
        sourceName: '뉴스핌(2025-10-22, 검증위 검증 전 조합 추정치)',
        confidence: 74,
      },
      {
        label: '실거래 검증',
        value: '전용 76㎡ 2026-02 42.47억 신고가, 전용 82㎡ 2025-12 46.25억 신고가',
        sourceType: 'public_document',
        sourceName: '머니투데이(2026-05-30, 국토부 실거래 기반)',
        confidence: 84,
      },
    ],
  },
  {
    complexId: 'seoul-yangcheon-mokdong-7',
    updatedAt: '2026-06-11',
    sourceLabel: '목동7 사업현황 교차검증(2026-06)',
    manualSignals: [
      {
        label: '사업 단계',
        value: '조합방식 선택(2025-01), 2026-06-07 조합설립 창립총회 예정 — 추진위 단계 유지',
        sourceType: 'public_document',
        sourceName: '뉴데일리(2025-01-13)·더퍼블릭(2026-05-26)',
        confidence: 82,
      },
      {
        label: '실거래 검증',
        value: '전용 66㎡ 2025-04 22.9억 신고가, 106㎡(공급) 2026-05 27.5억 신고가',
        sourceType: 'public_document',
        sourceName: '한국경제(2025-04-16)·뉴스핌(2026-05-22)',
        confidence: 80,
      },
    ],
  },
]
