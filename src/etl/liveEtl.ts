import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fetchPublicEtlInput } from './fetchPublicData'
import { fetchSeoulRenewalXmlRows, mapSeoulRenewalRows } from './api/seoulRenewalClient'
import { runInMemoryEtl } from './runEtl'

const targets = parseTargets(process.env.RECON_LIVE_TARGETS ?? 'apt-002')
const dealMonth = process.env.RECON_DEAL_MONTH ?? previousMonth()
const transactionLookbackMonths = Number(process.env.RECON_TRANSACTION_LOOKBACK_MONTHS ?? 6)
const outputPath = resolve(process.env.RECON_LIVE_OUTPUT ?? 'public/data/live-etl-result.json')
const seoulRenewalService = process.env.SEOUL_RENEWAL_SERVICE ?? 'upisRebuild'
const seoulRenewalSampleRows = Number(process.env.SEOUL_RENEWAL_SAMPLE_ROWS ?? 20)

const publicFetch = await fetchPublicEtlInput(targets.map((complexId) => ({ complexId, dealMonth, transactionLookbackMonths })))
const seoulRenewal = await fetchSeoulRenewalSnapshot(seoulRenewalService, seoulRenewalSampleRows)
const etl = runInMemoryEtl(publicFetch.input)
const payload = {
  generatedAt: new Date().toISOString(),
  targets,
  dealMonth,
  transactionLookbackMonths,
  seoulRenewal,
  kaptMatches: publicFetch.kaptMatches,
  renewalMatches: publicFetch.renewalMatches,
  transactionDiagnostics: publicFetch.input.transactions.map((transaction) => ({
    complexName: transaction.complexName,
    tradeCount: transaction.tradeCount12m,
    representativeAreaRange: transaction.representativeAreaRange,
    matchStrategy: transaction.matchStrategy,
    matchConfidence: transaction.matchConfidence,
    areaPriceStats: transaction.areaPriceStats,
  })),
  mode: publicFetch.skippedSources.length === 0 ? 'live_api' : 'fallback_with_skips',
  skippedSources: publicFetch.skippedSources,
  stats: etl.stats,
  issues: etl.issues,
  complexes: etl.complexes,
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')

console.log(`live ETL completed: ${etl.complexes.length} complexes -> ${outputPath}`)
if (publicFetch.skippedSources.length > 0) {
  console.log(`skipped sources: ${publicFetch.skippedSources.join(' | ')}`)
}

if (seoulRenewal.error) {
  console.log(`seoul renewal skipped: ${seoulRenewal.error}`)
} else {
  console.log(`seoul renewal snapshot: ${seoulRenewal.rows} rows, ${seoulRenewal.regulationRecords} regulation records`)
}

async function fetchSeoulRenewalSnapshot(serviceName: string, sampleRows: number) {
  try {
    const rows = await fetchSeoulRenewalXmlRows(serviceName, 1, sampleRows)
    const regulationRecords = mapSeoulRenewalRows(rows)

    return {
      serviceName,
      rows: rows.length,
      regulationRecords: regulationRecords.length,
      sample: regulationRecords.slice(0, 5),
    }
  } catch (error) {
    return {
      serviceName,
      rows: 0,
      regulationRecords: 0,
      sample: [],
      error: error instanceof Error ? error.message : 'unknown error',
    }
  }
}

function parseTargets(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function previousMonth() {
  const date = new Date()
  date.setMonth(date.getMonth() - 1)

  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`
}
