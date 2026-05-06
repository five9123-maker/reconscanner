import { assertDataGoKrKey, defaultPublicApiConfig, type PublicApiConfig } from './config'
import { fetchJson, type FetchLike, createUrl } from './http'
import { createKaptRecordFromApi } from './mappers'
import type { KaptComplexRecord } from '../rawTypes'

type KaptListResponse = {
  response?: {
    body?: {
      items?: Record<string, unknown>[] | {
        item?: Record<string, unknown> | Record<string, unknown>[]
      }
    }
  }
}

export async function fetchKaptComplexList(
  sidoCode: string,
  config: PublicApiConfig = defaultPublicApiConfig,
  fetcher?: FetchLike,
): Promise<KaptComplexRecord[]> {
  return fetchKaptList('/getSidoAptList3', { sidoCode }, config, fetcher)
}

export async function fetchKaptSigunguComplexList(
  sigunguCode: string,
  config: PublicApiConfig = defaultPublicApiConfig,
  fetcher?: FetchLike,
): Promise<KaptComplexRecord[]> {
  return fetchKaptList('/getSigunguAptList3', { sigunguCode }, config, fetcher)
}

export async function fetchKaptLegalDongComplexList(
  bjdCode: string,
  config: PublicApiConfig = defaultPublicApiConfig,
  fetcher?: FetchLike,
): Promise<KaptComplexRecord[]> {
  return fetchKaptList('/getLegaldongAptList3', { bjdCode }, config, fetcher)
}

export async function fetchKaptRoadnameComplexList(
  roadCode: string,
  config: PublicApiConfig = defaultPublicApiConfig,
  fetcher?: FetchLike,
): Promise<KaptComplexRecord[]> {
  return fetchKaptList('/getRoadnameAptList3', { roadCode }, config, fetcher)
}

export async function fetchKaptTotalComplexList(
  config: PublicApiConfig = defaultPublicApiConfig,
  fetcher?: FetchLike,
): Promise<KaptComplexRecord[]> {
  return fetchKaptList('/getTotalAptList3', {}, config, fetcher)
}

async function fetchKaptList(
  path: string,
  params: Record<string, string>,
  config: PublicApiConfig = defaultPublicApiConfig,
  fetcher?: FetchLike,
): Promise<KaptComplexRecord[]> {
  assertDataGoKrKey(config)

  const url = createUrl(config.kaptBaseUrl, path, {
    serviceKey: config.dataGoKrServiceKey,
    ...params,
    pageNo: 1,
    numOfRows: 1000,
    _type: 'json',
  })
  const payload = await fetchJson<KaptListResponse>(url, fetcher, 'kapt-list')
  const items = extractKaptItems(payload)

  return items.map((item) => createKaptRecordFromApi(item))
}

function extractKaptItems(payload: KaptListResponse) {
  const itemsRoot = payload.response?.body?.items
  const rawItems = Array.isArray(itemsRoot) ? itemsRoot : itemsRoot?.item

  return Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : []
}
