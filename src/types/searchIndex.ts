export type SearchIndexItem = {
  id: string
  name: string
  aliases: string[]
  searchTokens?: string[]
  district: string
  legalDongCode: string
  status: 'analysis_ready' | 'search_only'
  source: 'sample_analysis_db' | 'analysis_candidate' | 'kapt_api'
}

export type SearchIndexPayload = {
  generatedAt: string
  counts?: {
    analysisReady: number
    analysisCandidate?: number
    searchOnly: number
  }
  items: SearchIndexItem[]
}
