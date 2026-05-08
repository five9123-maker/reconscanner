export type RenewalSourceKind =
  | 'seoul_cleanup'
  | 'gyeonggi_onnuri'
  | 'reb_national'
  | 'local_government_notice'
  | 'news_event'

export type RenewalSourceReliability = 'official' | 'semi_official' | 'supplemental'

export type RenewalSourceEvent = {
  source: RenewalSourceKind
  reliability: RenewalSourceReliability
  projectName: string
  region: string
  representativeAddress?: string
  stage?: string
  eventType: string
  eventDate?: string
  title: string
  sourceUrl?: string
  confidence: number
  evidenceText?: string
}

export type RenewalSourceAdapter = {
  source: RenewalSourceKind
  label: string
  coverage: string
  reliability: RenewalSourceReliability
  usage: 'official_stage_confirmation' | 'candidate_event_detection' | 'supplemental_context'
  collect: () => Promise<RenewalSourceEvent[]>
}

export const renewalSourcePlans: RenewalSourceAdapter[] = [
  createPlannedSource({
    source: 'seoul_cleanup',
    label: '서울 정비몽땅/서울 열린데이터',
    coverage: '서울 정비구역·재건축 사업장',
    reliability: 'official',
    usage: 'official_stage_confirmation',
  }),
  createPlannedSource({
    source: 'gyeonggi_onnuri',
    label: '경기 정비사업 온누리',
    coverage: '경기도 정비사업 현황',
    reliability: 'official',
    usage: 'official_stage_confirmation',
  }),
  createPlannedSource({
    source: 'reb_national',
    label: '한국부동산원/국토부 전국 정비사업 체계',
    coverage: '전국 정비사업 마스터 후보',
    reliability: 'official',
    usage: 'official_stage_confirmation',
  }),
  createPlannedSource({
    source: 'local_government_notice',
    label: '지자체 고시·공고',
    coverage: '시·구청 고시, 공람, 심의 결과',
    reliability: 'semi_official',
    usage: 'candidate_event_detection',
  }),
  createPlannedSource({
    source: 'news_event',
    label: '뉴스/블로그 보조 이벤트',
    coverage: '공사비, 분담금, 비례율, 시공사 이슈',
    reliability: 'supplemental',
    usage: 'supplemental_context',
  }),
]

function createPlannedSource(input: Omit<RenewalSourceAdapter, 'collect'>): RenewalSourceAdapter {
  return {
    ...input,
    collect: async () => [],
  }
}
