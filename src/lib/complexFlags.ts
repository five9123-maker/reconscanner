import type { Complex } from '../types'

export function isInferredCandidate(complex: Complex) {
  return complex.dataProfile?.publicSignals.every((signal) => signal.sourceType === 'inferred') ?? false
}
