import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { complexes } from '../data/complexes'
import { fetchKaptTotalComplexList } from './api/kaptClient'

const outputPath = process.env.RECON_SEARCH_INDEX_OUTPUT ?? 'public/data/search-index.json'

const analyzed = complexes.map((complex) => ({
  id: complex.id,
  name: complex.name,
  aliases: complex.aliases,
  district: complex.district,
  legalDongCode: complex.legalDongCode,
  status: 'analysis_ready' as const,
  source: 'sample_analysis_db' as const,
}))

let kaptRecords: Awaited<ReturnType<typeof fetchKaptTotalComplexList>> = []

try {
  kaptRecords = await fetchKaptTotalComplexList()
} catch (error) {
  console.log(`K-apt search index fetch skipped: ${error instanceof Error ? error.message : 'unknown error'}`)
}

const analyzedNames = new Set(analyzed.flatMap((item) => [normalizeName(item.name), ...item.aliases.map(normalizeName)]))
const searchableOnly = kaptRecords
  .filter((record) => !analyzedNames.has(normalizeName(record.complexName)))
  .slice(0, 2000)
  .map((record) => ({
    id: record.kaptCode,
    name: record.complexName,
    aliases: [] as string[],
    district: record.district,
    legalDongCode: record.legalDongCode,
    status: 'search_only' as const,
    source: 'kapt_api' as const,
  }))

const payload = {
  generatedAt: new Date().toISOString(),
  counts: {
    analysisReady: analyzed.length,
    searchOnly: searchableOnly.length,
  },
  items: [...analyzed, ...searchableOnly],
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`)

console.log(`search index completed: ${payload.items.length} complexes -> ${outputPath}`)

function normalizeName(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, '').replace(/아파트|단지/g, '')
}
