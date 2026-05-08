import type { Complex, DataProfile } from '../types'
import type { SearchIndexItem } from '../types/searchIndex'

type SearchOnlyCandidateOptions = {
  limit?: number
}

type RegionProfile = {
  district: string
  dong: string
  lat: number
  lng: number
  recentPrice: number
  newBuildPrice: number
  units: number
  far: number
  landShare: number
  representativeSupplyPyeong: number
}

const DEFAULT_LIMIT = 230

const LEGACY_NAME_PATTERN = /(주공|시영|한신|현대|삼익|우성|미성|한양|극동|대우|벽산|청구|건영|동아|쌍용|대림|삼성|한진|아남|대성|개나리|목련|은하|한라|꿈마을|샘마을|후곡|강촌|까치|무지개|양지|정든|초원|향촌|한가람)/
const MODERN_OR_NON_APT_PATTERN = /(힐스테이트|자이|래미안|푸르지오|아이파크|더샵|센트레빌|포레스트|e편한|롯데캐슬|위브|오피스텔|빌라|원룸|도시형|주상복합|타워|스위트|팰리스|시티|테라스|아크로|디에이치|트리마제|하이페리온|쉐르빌|플래티넘|아이빌|리슈빌|아트리체|엘리프|관리사무소|임대)/

const LEGAL_CODE_PROFILES: Record<string, RegionProfile> = {
  '11110': { district: '종로구', dong: '종로권', lat: 37.575, lng: 126.982, recentPrice: 10.5, newBuildPrice: 3900, units: 680, far: 218, landShare: 7.9, representativeSupplyPyeong: 30 },
  '11140': { district: '중구', dong: '중구권', lat: 37.56, lng: 126.997, recentPrice: 11.2, newBuildPrice: 4200, units: 760, far: 220, landShare: 7.8, representativeSupplyPyeong: 30 },
  '11170': { district: '용산구', dong: '용산권', lat: 37.526, lng: 126.978, recentPrice: 24, newBuildPrice: 7200, units: 900, far: 190, landShare: 11.5, representativeSupplyPyeong: 32 },
  '11200': { district: '성동구', dong: '성동권', lat: 37.545, lng: 127.04, recentPrice: 16.5, newBuildPrice: 5600, units: 980, far: 205, landShare: 9.2, representativeSupplyPyeong: 31 },
  '11215': { district: '광진구', dong: '광진권', lat: 37.535, lng: 127.085, recentPrice: 13.5, newBuildPrice: 4700, units: 920, far: 210, landShare: 8.8, representativeSupplyPyeong: 31 },
  '11230': { district: '동대문구', dong: '동대문권', lat: 37.575, lng: 127.04, recentPrice: 8.8, newBuildPrice: 3400, units: 1050, far: 220, landShare: 7.8, representativeSupplyPyeong: 30 },
  '11260': { district: '중랑구', dong: '중랑권', lat: 37.6, lng: 127.09, recentPrice: 6.4, newBuildPrice: 2800, units: 1200, far: 215, landShare: 7.9, representativeSupplyPyeong: 25 },
  '11290': { district: '성북구', dong: '성북권', lat: 37.6, lng: 127.015, recentPrice: 7.8, newBuildPrice: 3200, units: 1100, far: 210, landShare: 8.1, representativeSupplyPyeong: 30 },
  '11305': { district: '강북구', dong: '강북권', lat: 37.64, lng: 127.025, recentPrice: 5.8, newBuildPrice: 2600, units: 1050, far: 210, landShare: 7.9, representativeSupplyPyeong: 25 },
  '11320': { district: '도봉구', dong: '도봉권', lat: 37.665, lng: 127.04, recentPrice: 5.6, newBuildPrice: 2550, units: 1400, far: 205, landShare: 8.2, representativeSupplyPyeong: 25 },
  '11350': { district: '노원구', dong: '노원권', lat: 37.65, lng: 127.065, recentPrice: 5.4, newBuildPrice: 2550, units: 1900, far: 205, landShare: 8.3, representativeSupplyPyeong: 24 },
  '11380': { district: '은평구', dong: '은평권', lat: 37.61, lng: 126.93, recentPrice: 7.4, newBuildPrice: 3100, units: 1100, far: 215, landShare: 8, representativeSupplyPyeong: 30 },
  '11410': { district: '서대문구', dong: '서대문권', lat: 37.575, lng: 126.94, recentPrice: 8.6, newBuildPrice: 3400, units: 980, far: 218, landShare: 7.9, representativeSupplyPyeong: 30 },
  '11440': { district: '마포구', dong: '마포권', lat: 37.55, lng: 126.94, recentPrice: 11.8, newBuildPrice: 3900, units: 1050, far: 230, landShare: 7.4, representativeSupplyPyeong: 31 },
  '11470': { district: '양천구', dong: '양천권', lat: 37.525, lng: 126.865, recentPrice: 18, newBuildPrice: 4300, units: 1550, far: 150, landShare: 12.8, representativeSupplyPyeong: 32 },
  '11500': { district: '강서구', dong: '강서권', lat: 37.555, lng: 126.84, recentPrice: 8.2, newBuildPrice: 3100, units: 1300, far: 215, landShare: 8.1, representativeSupplyPyeong: 30 },
  '11530': { district: '구로구', dong: '구로권', lat: 37.5, lng: 126.89, recentPrice: 7.4, newBuildPrice: 3000, units: 1200, far: 218, landShare: 7.9, representativeSupplyPyeong: 30 },
  '11545': { district: '금천구', dong: '금천권', lat: 37.455, lng: 126.9, recentPrice: 6.8, newBuildPrice: 2800, units: 900, far: 215, landShare: 7.8, representativeSupplyPyeong: 29 },
  '11560': { district: '영등포구', dong: '영등포권', lat: 37.52, lng: 126.925, recentPrice: 18.5, newBuildPrice: 5200, units: 850, far: 185, landShare: 11.6, representativeSupplyPyeong: 32 },
  '11590': { district: '동작구', dong: '동작권', lat: 37.505, lng: 126.95, recentPrice: 13.5, newBuildPrice: 4300, units: 950, far: 205, landShare: 8.8, representativeSupplyPyeong: 31 },
  '11620': { district: '관악구', dong: '관악권', lat: 37.48, lng: 126.95, recentPrice: 7.6, newBuildPrice: 3100, units: 1050, far: 220, landShare: 7.8, representativeSupplyPyeong: 30 },
  '11650': { district: '서초구', dong: '서초권', lat: 37.5, lng: 127.005, recentPrice: 30, newBuildPrice: 8000, units: 900, far: 180, landShare: 12.2, representativeSupplyPyeong: 33 },
  '11680': { district: '강남구', dong: '강남권', lat: 37.505, lng: 127.055, recentPrice: 32, newBuildPrice: 8400, units: 900, far: 185, landShare: 11.8, representativeSupplyPyeong: 33 },
  '11710': { district: '송파구', dong: '송파권', lat: 37.51, lng: 127.1, recentPrice: 20, newBuildPrice: 6100, units: 1400, far: 190, landShare: 10.3, representativeSupplyPyeong: 31 },
  '11740': { district: '강동구', dong: '강동권', lat: 37.55, lng: 127.14, recentPrice: 11.5, newBuildPrice: 4100, units: 1500, far: 190, landShare: 9.5, representativeSupplyPyeong: 30 },
  '41135': { district: '성남분당구', dong: '분당권', lat: 37.37, lng: 127.11, recentPrice: 10.5, newBuildPrice: 3500, units: 1100, far: 215, landShare: 8, representativeSupplyPyeong: 31 },
  '41173': { district: '안양동안구', dong: '평촌권', lat: 37.39, lng: 126.96, recentPrice: 8.2, newBuildPrice: 3000, units: 1200, far: 218, landShare: 8, representativeSupplyPyeong: 31 },
  '41210': { district: '광명시', dong: '광명권', lat: 37.47, lng: 126.87, recentPrice: 7.2, newBuildPrice: 3200, units: 1400, far: 195, landShare: 8.6, representativeSupplyPyeong: 25 },
  '41285': { district: '고양일산동구', dong: '일산동구권', lat: 37.65, lng: 126.79, recentPrice: 6.2, newBuildPrice: 2600, units: 1200, far: 215, landShare: 8, representativeSupplyPyeong: 31 },
  '41287': { district: '고양일산서구', dong: '일산서구권', lat: 37.67, lng: 126.76, recentPrice: 6.1, newBuildPrice: 2550, units: 1400, far: 215, landShare: 8, representativeSupplyPyeong: 31 },
  '41410': { district: '군포시', dong: '산본권', lat: 37.36, lng: 126.93, recentPrice: 5.4, newBuildPrice: 2400, units: 1500, far: 218, landShare: 7.8, representativeSupplyPyeong: 25 },
}

const FALLBACK_PROFILE: RegionProfile = { district: '수도권', dong: '수도권', lat: 37.52, lng: 127, recentPrice: 7.5, newBuildPrice: 3000, units: 1000, far: 215, landShare: 8, representativeSupplyPyeong: 30 }

export function createSearchOnlyAnalysisCandidates(searchIndex: SearchIndexItem[], options: SearchOnlyCandidateOptions = {}): Complex[] {
  const limit = options.limit ?? DEFAULT_LIMIT
  const selected = searchIndex
    .filter((item) => item.status === 'search_only')
    .filter(isLegacyApartmentCandidate)
    .slice(0, limit)

  return selected.map((item) => toCandidate(item))
}

function isLegacyApartmentCandidate(item: SearchIndexItem) {
  if (!item.name || !item.legalDongCode) return false
  if (!LEGAL_CODE_PROFILES[item.legalDongCode.slice(0, 5)]) return false
  if (MODERN_OR_NON_APT_PATTERN.test(item.name)) return false

  return LEGACY_NAME_PATTERN.test(item.name)
}

function toCandidate(item: SearchIndexItem): Complex {
  const profile = LEGAL_CODE_PROFILES[item.legalDongCode.slice(0, 5)] ?? FALLBACK_PROFILE
  const h = hashText(item.name)
  const unitMultiplier = 0.75 + (h % 70) / 100
  const priceMultiplier = 0.86 + ((h >> 3) % 32) / 100
  const farOffset = ((h >> 5) % 31) - 12
  const landOffset = (((h >> 7) % 21) - 10) / 10
  const representativeOffset = ((h >> 9) % 7) - 3
  const lat = round(profile.lat + ((((h >> 11) % 21) - 10) / 1000), 5)
  const lng = round(profile.lng + ((((h >> 13) % 21) - 10) / 1000), 5)
  const builtYear = 1984 + ((h >> 15) % 13)
  const recentPrice = round(profile.recentPrice * priceMultiplier, 1)
  const representativeSupplyPyeong = clamp(profile.representativeSupplyPyeong + representativeOffset, 23, 36)
  const currentFar = clamp(profile.far + farOffset, 145, 245)
  const landShare = round(clamp(profile.landShare + landOffset, 6.8, 14.5), 1)
  const units = Math.round((profile.units * unitMultiplier) / 10) * 10
  const id = `kapt-candidate-${item.id}`
  const address = `${item.legalDongCode.startsWith('11') ? '서울' : '경기'} ${profile.district} ${profile.dong}`

  return {
    id,
    identifiers: {
      complexId: `kapt-candidate-${item.id}`,
      kaptCode: item.id,
      legalDongCode: item.legalDongCode,
      roadAddress: address,
      jibunAddress: address,
      lat,
      lng,
    },
    name: item.name,
    aliases: item.aliases.length > 0 ? item.aliases : [item.name.replace(/아파트/g, '').trim()].filter(Boolean),
    district: item.district || profile.district,
    address,
    legalDongCode: item.legalDongCode,
    builtYear,
    units,
    currentFar,
    allowedFar: item.legalDongCode.startsWith('11560') ? 400 : 300,
    landShare,
    representativeSupplyPyeong,
    previousAssetValue: round(recentPrice * 0.72, 1),
    recentPrice,
    newBuildPrice: Math.round((profile.newBuildPrice * (0.9 + ((h >> 17) % 21) / 100)) / 10) * 10,
    stage: '검토',
    regulationRisk: currentFar >= 220 ? '높음' : '중간',
    residentMomentum: '중간',
    dataReliability: 42,
    x: clamp(Math.round(((lng - 126.72) / 0.45) * 100), 8, 92),
    y: clamp(Math.round(((37.69 - lat) / 0.38) * 100), 8, 92),
    note: 'K-apt 목록 기반으로 자동 생성한 초기 표본입니다. 실제 분석 전 물리·거래·정비사업 데이터 보강이 필요합니다.',
    sourceFreshness: {
      physicalInfo: '2026-04',
      transaction: '2026-03',
      regulation: '2026-03',
      costIndex: '2026-03',
    },
    dataProfile: createGeneratedProfile(item, profile, builtYear, units, currentFar, recentPrice),
  }
}

function createGeneratedProfile(item: SearchIndexItem, profile: RegionProfile, builtYear: number, units: number, currentFar: number, recentPrice: number): DataProfile {
  return {
    estimationMode: 'public_api_estimate',
    publicSignals: [
      {
        label: '단지 목록',
        value: `${item.name} · ${profile.district} · K-apt 목록 기반`,
        sourceType: 'inferred',
        sourceName: 'K-apt 단지 목록 + 권역별 표본 추정',
        confidence: 42,
        method: 'K-apt 검색 목록의 단지명과 법정동코드를 표본 생성에 사용. 준공연도·세대수·용적률은 권역별 보수 가정',
      },
      {
        label: '물리 정보 추정',
        value: `${builtYear}년 준공 추정 · ${units.toLocaleString()}세대 추정 · 현재 용적률 ${currentFar}% 추정`,
        sourceType: 'inferred',
        sourceName: '권역별 노후 단지 표본 모델',
        confidence: 38,
        method: '공개 API 상세값 확보 전까지 같은 구·권역의 노후 단지 분포를 사용한 초기 표본값',
      },
      {
        label: '시장 가격 추정',
        value: `최근 시세 ${recentPrice.toFixed(1)}억 추정 · 신축 기준가 ${profile.newBuildPrice.toLocaleString()}만원/평 권역값`,
        sourceType: 'inferred',
        sourceName: '권역별 가격대 레퍼런스',
        confidence: 40,
        method: '권역별 구축 가격대와 신축 비교가를 혼합한 낮은 신뢰도 표본값. 실거래 API 매칭 시 교체 필요',
      },
      {
        label: '데이터 보강 상태',
        value: '공식 정비사업 매칭 없음 · 후보 표본',
        sourceType: 'inferred',
        sourceName: 'Recon Scanner 표본 확장 규칙',
        confidence: 35,
        method: '표본 검증을 위해 포함한 후보. 순위 해석보다 산식 민감도와 데이터 품질 검증에 사용',
      },
    ],
    manualSignals: [],
    gaps: [
      '준공연도 실확인',
      '세대수·대지면적 K-apt 상세 매칭',
      '국토부 실거래가 대표 평형 재산정',
      '필지 PNU 기반 토지·규제 매칭',
      '정비사업 공식 추진 여부 확인',
    ],
  }
}

function hashText(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }

  return hash
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function round(value: number, digits: number) {
  const multiplier = 10 ** digits

  return Math.round(value * multiplier) / multiplier
}
