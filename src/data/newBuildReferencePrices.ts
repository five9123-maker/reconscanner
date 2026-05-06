export type NewBuildMarketReferenceBand = {
  id: string
  label: string
  currentPricePerPyeongRange: [number, number]
  referencePricePerPyeong: number
  confidence: number
  sampleMarkets: string[]
  note: string
}

export const newBuildMarketReferenceBands: NewBuildMarketReferenceBand[] = [
  {
    id: 'super-prime',
    label: '초고가 핵심지',
    currentPricePerPyeongRange: [8200, Number.POSITIVE_INFINITY],
    referencePricePerPyeong: 8600,
    confidence: 68,
    sampleMarkets: ['압구정', '대치', '반포', '청담'],
    note: '구축 평당가가 이미 최상위권인 시장. 주변 신축이 멀어도 신축 기준가를 고가권으로 유지',
  },
  {
    id: 'prime',
    label: '고가 핵심지',
    currentPricePerPyeongRange: [6200, 8200],
    referencePricePerPyeong: 6500,
    confidence: 66,
    sampleMarkets: ['잠실', '개포', '과천', '목동 상위권'],
    note: '재건축 기대와 학군·입지가 가격에 강하게 반영되는 시장',
  },
  {
    id: 'upper',
    label: '상급 주거지',
    currentPricePerPyeongRange: [4700, 6200],
    referencePricePerPyeong: 5200,
    confidence: 62,
    sampleMarkets: ['목동', '마포 주요권', '분당 중심권'],
    note: '신축 선호는 높지만 초고가권과는 분양가 체급이 다른 시장',
  },
  {
    id: 'mid-high',
    label: '중상위 주거지',
    currentPricePerPyeongRange: [3400, 4700],
    referencePricePerPyeong: 4000,
    confidence: 58,
    sampleMarkets: ['분당 외곽', '평촌', '일산 일부', '서울 비강남 주요권'],
    note: '역세권·학군·대단지 여부에 따라 신축가 편차가 큰 시장',
  },
  {
    id: 'mid',
    label: '중위 주거지',
    currentPricePerPyeongRange: [2400, 3400],
    referencePricePerPyeong: 3000,
    confidence: 56,
    sampleMarkets: ['노원', '산본', '중동', '일산 평균권'],
    note: '분담금 민감도가 높아 공사비 변화가 사업성에 크게 반영되는 시장',
  },
  {
    id: 'entry',
    label: '보급형 주거지',
    currentPricePerPyeongRange: [0, 2400],
    referencePricePerPyeong: 2400,
    confidence: 52,
    sampleMarkets: ['수도권 중저가권', '외곽 구축 대단지'],
    note: '신축 프리미엄은 존재하지만 일반분양가 상단이 제한되는 시장',
  },
]

export function findNewBuildMarketReference(currentPricePerPyeong: number) {
  return newBuildMarketReferenceBands.find(
    (band) => currentPricePerPyeong >= band.currentPricePerPyeongRange[0] && currentPricePerPyeong < band.currentPricePerPyeongRange[1],
  )
}
