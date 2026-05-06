import type { ManualComplexOverride } from '../data/manualOverrides'
import type { Complex } from '../types'
import { mergeDataProfile } from './dataProfile'

export function applyManualOverrides(dataset: Complex[], overrides: ManualComplexOverride[]): Complex[] {
  return dataset.map((complex) => {
    const override = overrides.find((item) => item.complexId === complex.id || item.complexId === complex.identifiers.complexId)

    if (!override) {
      return {
        ...complex,
        dataProfile: mergeDataProfile(complex),
      }
    }

    const values = override.values ?? {}
    const enriched: Complex = {
      ...complex,
      ...values,
      aliases: [...new Set([...complex.aliases, ...(override.aliases ?? [])])],
      note: override.note ?? complex.note,
      dataReliability: Math.min(99, complex.dataReliability + Math.round(override.manualSignals.length * 2.5)),
      dataProfile: mergeDataProfile(complex, override.manualSignals),
      financeOverride: {
        ...complex.financeOverride,
        ...override.financeOverride,
        note: override.financeOverride?.note ?? override.sourceLabel,
      },
      marketOverride: {
        ...complex.marketOverride,
        ...override.marketOverride,
      },
      sourceFreshness: {
        ...complex.sourceFreshness,
        regulation: maxFreshness(complex.sourceFreshness.regulation, override.updatedAt),
      },
    }

    return enriched
  })
}

function maxFreshness(left: string, right: string) {
  if (left === 'unknown') return right
  return left > right ? left : right
}
