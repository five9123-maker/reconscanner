import { PublicApiError } from './errors'

export type PublicApiConfig = {
  dataGoKrServiceKey?: string
  seoulOpenApiKey?: string
  kaptBaseUrl: string
  molitTradeBaseUrl: string
  seoulDataBaseUrl: string
}

export const defaultPublicApiConfig: PublicApiConfig = {
  dataGoKrServiceKey: readEnv('DATA_GO_KR_SERVICE_KEY'),
  seoulOpenApiKey: readEnv('SEOUL_OPEN_API_KEY'),
  kaptBaseUrl: readEnv('KAPT_LIST_BASE_URL') ?? 'https://apis.data.go.kr/1613000/AptListService3',
  molitTradeBaseUrl: readEnv('MOLIT_TRADE_BASE_URL') ?? 'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade',
  seoulDataBaseUrl: readEnv('SEOUL_DATA_BASE_URL') ?? 'http://openapi.seoul.go.kr:8088',
}

export function assertDataGoKrKey(config: PublicApiConfig) {
  if (!config.dataGoKrServiceKey) {
    throw new PublicApiError('data.go.kr', 'missing_key', 'DATA_GO_KR_SERVICE_KEY is required for data.go.kr public API calls.')
  }

  if (isPlaceholderKey(config.dataGoKrServiceKey)) {
    throw new PublicApiError('data.go.kr', 'missing_key', 'DATA_GO_KR_SERVICE_KEY still has the .env.example placeholder value.')
  }
}

export function assertSeoulOpenApiKey(config: PublicApiConfig) {
  if (!config.seoulOpenApiKey) {
    throw new PublicApiError('seoul-open-data', 'missing_key', 'SEOUL_OPEN_API_KEY is required for Seoul Open Data API calls.')
  }

  if (isPlaceholderKey(config.seoulOpenApiKey)) {
    throw new PublicApiError('seoul-open-data', 'missing_key', 'SEOUL_OPEN_API_KEY still has the .env.example placeholder value.')
  }
}

function readEnv(key: string) {
  const runtime = globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>
    }
  }

  return normalizeServiceKey(runtime.process?.env?.[key])
}

export function normalizeServiceKey(value: string | undefined) {
  if (!value) return value

  try {
    return value.includes('%') ? decodeURIComponent(value) : value
  } catch {
    return value
  }
}

export function isPlaceholderKey(value: string | undefined) {
  if (!value) return false

  return /^put-your-.+-here$/i.test(value.trim())
}
