import { assertDataGoKrKey, defaultPublicApiConfig, type PublicApiConfig } from './config'
import { classifyProviderCode, PublicApiError } from './errors'
import { createUrl, fetchText, type FetchLike } from './http'
import { createTransactionRecordFromTrades } from './mappers'
import { parseXmlHeader, parseXmlItems } from './xml'
import type { TransactionMarketRecord, TransactionMatchHint } from '../rawTypes'

export async function fetchApartmentTrades(
  lawdCode: string,
  dealMonth: string,
  config: PublicApiConfig = defaultPublicApiConfig,
  fetcher?: FetchLike,
) {
  assertDataGoKrKey(config)

  const url = createUrl(config.molitTradeBaseUrl, '/getRTMSDataSvcAptTrade', {
    serviceKey: config.dataGoKrServiceKey,
    LAWD_CD: lawdCode,
    DEAL_YMD: dealMonth.replace(/[^0-9]/g, '').slice(0, 6),
    pageNo: 1,
    numOfRows: 1000,
  })
  const xml = await fetchText(url, fetcher, 'molit-trade')
  const header = parseXmlHeader(xml)

  if (header.resultCode && !['00', '000'].includes(header.resultCode)) {
    throw new PublicApiError(
      'molit-trade',
      classifyProviderCode(header.resultCode, header.resultMsg),
      `MOLIT trade API error ${header.resultCode}: ${header.resultMsg ?? 'unknown error'}`,
    )
  }

  return parseXmlItems(xml)
}

export async function fetchTransactionMarketRecord(
  legalDongCode: string,
  complexName: string,
  dealMonth: string,
  previousAssetValue = 0,
  matchHint: TransactionMatchHint = {},
  config: PublicApiConfig = defaultPublicApiConfig,
  fetcher?: FetchLike,
): Promise<TransactionMarketRecord> {
  const trades = await fetchApartmentTrades(legalDongCode.slice(0, 5), dealMonth, config, fetcher)

  return createTransactionRecordFromTrades(legalDongCode, complexName, trades, previousAssetValue, matchHint)
}

export async function fetchTransactionMarketRecordWindow(
  legalDongCode: string,
  complexName: string,
  latestDealMonth: string,
  months = 6,
  previousAssetValue = 0,
  matchHint: TransactionMatchHint = {},
  config: PublicApiConfig = defaultPublicApiConfig,
  fetcher?: FetchLike,
): Promise<TransactionMarketRecord> {
  const dealMonths = createDealMonthWindow(latestDealMonth, months)
  const monthlyTrades = await Promise.all(
    dealMonths.map((dealMonth) => fetchApartmentTrades(legalDongCode.slice(0, 5), dealMonth, config, fetcher)),
  )
  const trades = monthlyTrades.flat()
  const record = createTransactionRecordFromTrades(legalDongCode, complexName, trades, previousAssetValue, matchHint)

  return {
    ...record,
    transactionMonth: dealMonths[0],
  }
}

export function createDealMonthWindow(latestDealMonth: string, months: number) {
  const normalized = latestDealMonth.replace(/[^0-9]/g, '').slice(0, 6)
  const year = Number(normalized.slice(0, 4))
  const month = Number(normalized.slice(4, 6))
  const latest = new Date(year, month - 1, 1)

  return Array.from({ length: months }, (_, index) => {
    const date = new Date(latest)
    date.setMonth(latest.getMonth() - index)

    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
  })
}
