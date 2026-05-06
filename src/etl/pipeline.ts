import { normalizeComplexes } from './normalize'
import type { KaptComplexRecord, MarketIndicatorRecord, RawComplexBundle, RegulationRecord, TransactionMarketRecord } from './rawTypes'

type BuildBundlesInput = {
  physical: KaptComplexRecord[]
  transactions: TransactionMarketRecord[]
  regulations: RegulationRecord[]
  marketIndicators: MarketIndicatorRecord[]
}

export function buildComplexBundles({ physical, transactions, regulations, marketIndicators }: BuildBundlesInput): RawComplexBundle[] {
  return physical.map((physicalRecord) => {
    const transaction = findBestMatch(transactions, physicalRecord.legalDongCode, physicalRecord.complexName)
    const regulation = findBestMatch(regulations, physicalRecord.legalDongCode, physicalRecord.complexName)
    const market = marketIndicators.find((indicator) => indicator.district === physicalRecord.district)

    return {
      physical: physicalRecord,
      transaction,
      regulation,
      market,
    }
  })
}

export function buildComplexDataset(input: BuildBundlesInput) {
  return normalizeComplexes(buildComplexBundles(input))
}

function findBestMatch<T extends { legalDongCode: string; complexName: string }>(records: T[], legalDongCode: string, complexName: string) {
  const normalizedName = normalizeName(complexName)

  return records.find((record) => record.legalDongCode === legalDongCode && normalizeName(record.complexName) === normalizedName)
}

function normalizeName(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/아파트|단지/g, '')
}
