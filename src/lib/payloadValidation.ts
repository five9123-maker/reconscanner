import type { ApiEnrichmentPlan } from '../types/apiEnrichment'
import type { LiveEtlStatus } from '../types/liveEtl'
import type { SearchIndexPayload } from '../types/searchIndex'

export function validateLiveEtlStatus(payload: unknown): LiveEtlStatus | null {
  if (!isRecord(payload) || !isRecord(payload.stats)) return null
  if (
    typeof payload.stats.normalizedComplexes !== 'number' ||
    typeof payload.stats.warningCount !== 'number' ||
    typeof payload.stats.errorCount !== 'number'
  ) {
    return null
  }

  return payload as LiveEtlStatus
}

export function validateSearchIndexPayload(payload: unknown): SearchIndexPayload | null {
  if (!isRecord(payload) || !Array.isArray(payload.items)) return null

  return payload as SearchIndexPayload
}

export function validateApiEnrichmentPlan(payload: unknown): ApiEnrichmentPlan | null {
  if (!isRecord(payload) || !Array.isArray(payload.batches) || typeof payload.totalCandidates !== 'number') return null

  return payload as ApiEnrichmentPlan
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
