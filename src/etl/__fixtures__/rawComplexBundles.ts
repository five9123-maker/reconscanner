import type { RawComplexBundle } from '../rawTypes'

export const rawComplexBundles: RawComplexBundle[] = [
  {
    physical: {
      kaptCode: 'KAPT-DEMO-101',
      complexName: '테스트리버아파트',
      roadAddress: '서울 영등포구 여의대로 100',
      jibunAddress: '서울 영등포구 여의도동 1',
      district: '영등포구',
      legalDongCode: '1156011000',
      pnu: '1156011000100010000',
      lat: 37.5247,
      lng: 126.9292,
      builtYear: 1982,
      units: 1200,
      landAreaPyeong: 18000,
      currentFar: 132,
      updatedMonth: '2026-04',
    },
    transaction: {
      legalDongCode: '1156011000',
      complexName: '테스트리버아파트',
      recentPrice: 18.2,
      previousAssetValue: 13.4,
      transactionMonth: '2026-03',
      tradeCount12m: 28,
    },
    regulation: {
      legalDongCode: '1156011000',
      complexName: '테스트리버아파트',
      allowedFar: 300,
      stage: '추진위',
      regulationRisk: '중간',
      residentMomentum: '중간',
      updatedMonth: '2026-04',
    },
    market: {
      district: '영등포구',
      newBuildPrice: 4200,
      costIndexMonth: '2026-03',
    },
  },
  {
    physical: {
      complexName: '누락테스트아파트',
      jibunAddress: '서울 중랑구 면목동 10',
      district: '중랑구',
      legalDongCode: '1126010100',
      lat: 37.5885,
      lng: 127.0877,
      builtYear: 1990,
      units: 450,
      landAreaPyeong: 3600,
      currentFar: 210,
      updatedMonth: '2026-01',
    },
  },
]
