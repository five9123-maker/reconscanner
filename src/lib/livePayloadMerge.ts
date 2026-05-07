import type { Complex } from '../types'
import type { LiveEtlStatus, TransactionDiagnostic } from '../types/liveEtl'
import { normalizeSearchText } from './search'

export function mergeLiveComplexes(baseComplexes: Complex[], liveComplexes: Complex[]) {
  if (liveComplexes.length === 0) return baseComplexes

  return baseComplexes.map((complex) => {
    const liveComplex = liveComplexes.find(
      (item) =>
        item.id === complex.id ||
        item.identifiers.complexId === complex.identifiers.complexId ||
        (item.legalDongCode === complex.legalDongCode && item.name === complex.name),
    )

    if (!liveComplex) return complex

    return {
      ...complex,
      ...liveComplex,
      aliases: [...new Set([...complex.aliases, ...liveComplex.aliases])],
      identifiers: {
        ...complex.identifiers,
        ...liveComplex.identifiers,
      },
      sourceFreshness: {
        ...complex.sourceFreshness,
        ...liveComplex.sourceFreshness,
      },
      dataProfile: liveComplex.dataProfile ?? complex.dataProfile,
      financeOverride: liveComplex.financeOverride ?? complex.financeOverride,
      marketOverride: {
        ...complex.marketOverride,
        ...liveComplex.marketOverride,
      },
      note: liveComplex.note || complex.note,
    }
  })
}

export function findTransactionDiagnostic(diagnostics: TransactionDiagnostic[], complex: Complex) {
  const normalizedNames = [complex.name, ...complex.aliases].map(normalizeSearchText)

  return diagnostics.find((diagnostic) => normalizedNames.includes(normalizeSearchText(diagnostic.complexName)))
}

export function findRenewalMatch(matches: NonNullable<LiveEtlStatus['renewalMatches']>, complex: Complex) {
  const normalizedNames = [complex.name, ...complex.aliases].map(normalizeSearchText)

  return matches.find((match) => match.complexId === complex.id || normalizedNames.includes(normalizeSearchText(match.complexName)))
}

export function formatMatchStrategy(strategy?: string) {
  if (strategy === 'name+metadata') return '이름+주소'
  if (strategy === 'name-only') return '이름 중심'
  if (strategy === 'fallback-all-district-trades') return '구 전체 fallback'

  return '미상'
}
