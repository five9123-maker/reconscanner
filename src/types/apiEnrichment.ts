export type ApiEnrichmentPlan = {
  generatedAt: string
  totalCandidates: number
  batchSize: number
  batches: Array<{
    index: number
    command: string
    targets: Array<{
      id: string
      name: string
      district: string
      priorityScore: number
      dataReliability: number
    }>
  }>
}
