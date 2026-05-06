import { assertSeoulOpenApiKey, defaultPublicApiConfig, type PublicApiConfig } from './config'
import { classifyProviderCode, PublicApiError } from './errors'
import { fetchJson, fetchText, type FetchLike } from './http'
import { createRegulationRecordFromSeoulRow } from './mappers'
import { parseSeoulXmlResult, parseXmlRows } from './xml'
import type { RegulationRecord } from '../rawTypes'

type SeoulOpenDataResponse = Record<string, { row?: Record<string, unknown>[]; RESULT?: { CODE?: string; MESSAGE?: string } }>

export async function fetchSeoulRenewalRows(
  serviceName: string,
  config: PublicApiConfig = defaultPublicApiConfig,
  fetcher?: FetchLike,
): Promise<Record<string, unknown>[]> {
  assertSeoulOpenApiKey(config)

  const url = new URL(
    `${config.seoulDataBaseUrl.replace(/\/$/, '')}/${config.seoulOpenApiKey}/json/${serviceName}/1/1000`,
  )
  const payload = await fetchJson<SeoulOpenDataResponse>(url, fetcher, 'seoul-renewal')
  const root = payload[serviceName]

  if (!root) {
    return []
  }

  if (root.RESULT?.CODE && root.RESULT.CODE !== 'INFO-000') {
    throw new PublicApiError(
      'seoul-renewal',
      classifyProviderCode(root.RESULT.CODE, root.RESULT.MESSAGE),
      `Seoul Open Data API error ${root.RESULT.CODE}: ${root.RESULT.MESSAGE ?? 'unknown error'}`,
    )
  }

  return root.row ?? []
}

export async function fetchSeoulRenewalXmlRows(
  serviceName = 'upisRebuild',
  startIndex = 1,
  endIndex = 1000,
  config: PublicApiConfig = defaultPublicApiConfig,
  fetcher?: FetchLike,
): Promise<Record<string, unknown>[]> {
  assertSeoulOpenApiKey(config)

  const url = new URL(
    `${config.seoulDataBaseUrl.replace(/\/$/, '')}/${config.seoulOpenApiKey}/xml/${serviceName}/${startIndex}/${endIndex}/%20/%20/%20/%20/%20/%20/%20/`,
  )
  const xml = await fetchText(url, fetcher, 'seoul-renewal')
  const result = parseSeoulXmlResult(xml)

  if (result.CODE && result.CODE !== 'INFO-000') {
    throw new PublicApiError(
      'seoul-renewal',
      classifyProviderCode(result.CODE, result.MESSAGE),
      `Seoul Open Data API error ${result.CODE}: ${result.MESSAGE ?? 'unknown error'}`,
    )
  }

  return parseXmlRows(xml)
}

export function mapSeoulRenewalRows(rows: Record<string, unknown>[]): RegulationRecord[] {
  return rows.map(createRegulationRecordFromSeoulRow).filter((record) => record !== undefined)
}
