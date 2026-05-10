import type { Complex, RankedComplex } from '../types'
import type { SearchIndexItem } from '../types/searchIndex'
import { isInferredCandidate } from './complexFlags'
import { createSearchTokens, normalizeSearchText, rankComplexNameMatch } from './search'

export function searchIndexByComplexName(searchIndex: SearchIndexItem[], query: string, fallback: RankedComplex[], eligibleAnalysisIds?: Set<string>): SearchIndexItem[] {
  const normalizedQuery = normalizeSearchText(query)

  if (!normalizedQuery) {
    return fallback.map(({ complex }) => toSearchIndexItem(complex))
  }

  const source = mergeSearchSources(searchIndex, fallback.map(({ complex }) => toSearchIndexItem(complex)))
    .filter((item) => item.status !== 'analysis_ready' || !eligibleAnalysisIds || eligibleAnalysisIds.has(item.id))

  return source
    .map((item) => ({ item, score: rankComplexNameMatch(item, normalizedQuery) }))
    .filter(({ score }) => score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        sortAnalysisReadyFirst(left.item, right.item) ||
        sortConfirmedAnalysisFirst(left.item, right.item) ||
        left.item.name.localeCompare(right.item.name, 'ko'),
    )
    .map(({ item }) => item)
}

export function getSearchItemLabel(item: SearchIndexItem) {
  if (item.status === 'search_only') return '준비중'
  if (item.source === 'analysis_candidate') return '분석 전'

  return '분석'
}

function toSearchIndexItem(complex: Complex): SearchIndexItem {
  return {
    id: complex.id,
    name: complex.name,
    aliases: complex.aliases,
    searchTokens: createSearchTokens(complex.name, complex.aliases),
    district: complex.district,
    legalDongCode: complex.legalDongCode,
    status: 'analysis_ready',
    source: isInferredCandidate(complex) ? 'analysis_candidate' : 'sample_analysis_db',
  }
}

function sortAnalysisReadyFirst(left: SearchIndexItem, right: SearchIndexItem) {
  if (left.status === right.status) return 0

  return left.status === 'analysis_ready' ? -1 : 1
}

function sortConfirmedAnalysisFirst(left: SearchIndexItem, right: SearchIndexItem) {
  const sourceOrder = {
    sample_analysis_db: 0,
    analysis_candidate: 1,
    kapt_api: 2,
  }

  return sourceOrder[left.source] - sourceOrder[right.source]
}

function mergeSearchSources(searchIndex: SearchIndexItem[], fallback: SearchIndexItem[]) {
  if (searchIndex.length === 0) return fallback

  const fallbackNames = new Set(fallback.flatMap((item) => [item.name, ...item.aliases].map(normalizeSearchText)))
  const remainingSearchItems = searchIndex.filter((item) => !fallbackNames.has(normalizeSearchText(item.name)))

  return [...fallback, ...remainingSearchItems]
}
