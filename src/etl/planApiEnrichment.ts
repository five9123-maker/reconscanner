import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { complexes } from '../data/complexes'
import { buildApiEnrichmentPlan } from './apiEnrichmentPlan'

const batchSize = Number(process.env.RECON_ENRICHMENT_BATCH_SIZE ?? 10)
const outputPath = resolve(process.env.RECON_ENRICHMENT_PLAN_OUTPUT ?? 'public/data/api-enrichment-plan.json')
const plan = buildApiEnrichmentPlan(complexes, batchSize)

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf-8')

console.log(`api enrichment plan completed: ${plan.totalCandidates} candidates, ${plan.batches.length} batches -> ${outputPath}`)
if (plan.batches[0]) {
  console.log(`next batch: ${plan.batches[0].command}`)
}
