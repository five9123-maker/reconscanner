import { complexes } from '../data/complexes'
import { manualComplexOverrides, type ManualComplexOverride } from '../data/manualOverrides'
import { validateComplexDataset, type DataValidationIssue } from '../etl/validate'
import { applyManualOverrides } from '../lib/complexOverlays'
import { calculateDiagnosis } from '../lib/diagnosis'
import { isFreshnessStale } from '../lib/date'
import { applyNewBuildPriceEstimates } from '../lib/newBuildPrice'
import { rankComplexNameMatch } from '../lib/search'
import type { Complex, DataQualitySummary, RankedComplex, Scenario } from '../types'

export type ComplexRepository = ReturnType<typeof createComplexRepository>

export const sampleComplexRepository = createComplexRepository(complexes)

export function createComplexRepository(dataset: Complex[], manualOverrides: ManualComplexOverride[] = manualComplexOverrides) {
  const enrichedDataset = applyManualOverrides(applyNewBuildPriceEstimates(dataset), manualOverrides)
  const getRanked = (scenario: Scenario): RankedComplex[] =>
    enrichedDataset
      .map((complex) => ({ complex, diagnosis: calculateDiagnosis(complex, scenario) }))
      .sort((a, b) => b.diagnosis.reconScore - a.diagnosis.reconScore)

  return {
    listComplexes(): Complex[] {
      return enrichedDataset
    },

    getDefaultComplexId(): string {
      return enrichedDataset[1]?.id ?? enrichedDataset[0].id
    },

    getComplexById(id: string): Complex | undefined {
      return enrichedDataset.find((complex) => complex.id === id || complex.identifiers.complexId === id)
    },

    searchComplexes(query: string, scenario: Scenario): RankedComplex[] {
      const normalizedQuery = query.trim().toLowerCase()

      return getRanked(scenario).filter(({ complex }) => !normalizedQuery || rankComplexNameMatch(complex, normalizedQuery) > 0)
    },

    getRankedComplexes(scenario: Scenario): RankedComplex[] {
      return getRanked(scenario)
    },

    getDataQualitySummary(): DataQualitySummary {
      const averageReliability = enrichedDataset.reduce((sum, complex) => sum + complex.dataReliability, 0) / enrichedDataset.length
      const inferredCandidateCount = enrichedDataset.filter((complex) =>
        complex.dataProfile?.publicSignals.every((signal) => signal.sourceType === 'inferred'),
      ).length
      const missingKaptCode = enrichedDataset.filter((complex) => !complex.identifiers.kaptCode).length
      const missingPnu = enrichedDataset.filter((complex) => !complex.identifiers.pnu).length
      const issues = validateComplexDataset(enrichedDataset)
      const staleSources = enrichedDataset
        .filter((complex) => Object.values(complex.sourceFreshness).some((value) => isFreshnessStale(value)))
        .map((complex) => complex.name)

      return {
        totalComplexes: enrichedDataset.length,
        inferredCandidateCount,
        averageReliability,
        missingKaptCode,
        missingPnu,
        staleSources,
        issueCount: issues.length,
        warningCount: issues.filter((issue) => issue.severity === 'warning').length,
        errorCount: issues.filter((issue) => issue.severity === 'error').length,
      }
    },

    getValidationIssues(): DataValidationIssue[] {
      return validateComplexDataset(enrichedDataset)
    },
  }
}

export const listComplexes = sampleComplexRepository.listComplexes
export const getDefaultComplexId = sampleComplexRepository.getDefaultComplexId
export const getComplexById = sampleComplexRepository.getComplexById
export const searchComplexes = sampleComplexRepository.searchComplexes
export const getRankedComplexes = sampleComplexRepository.getRankedComplexes
export const getDataQualitySummary = sampleComplexRepository.getDataQualitySummary
export const getValidationIssues = sampleComplexRepository.getValidationIssues
