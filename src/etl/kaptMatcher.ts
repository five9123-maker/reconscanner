import type { Complex } from '../types'
import type { KaptComplexRecord } from './rawTypes'

export type KaptMatchResult = {
  complexId: string
  matched: boolean
  score: number
  kaptCode?: string
  kaptName?: string
}

export function findBestKaptMatch(complex: Complex, candidates: KaptComplexRecord[]): KaptMatchResult {
  const ranked = candidates
    .map((candidate) => ({
      candidate,
      score: scoreKaptCandidate(complex, candidate),
    }))
    .sort((a, b) => b.score - a.score)
  const best = ranked[0]

  if (!best || best.score < 0.45) {
    return {
      complexId: complex.id,
      matched: false,
      score: best?.score ?? 0,
    }
  }

  return {
    complexId: complex.id,
    matched: true,
    score: best.score,
    kaptCode: best.candidate.kaptCode,
    kaptName: best.candidate.complexName,
  }
}

function scoreKaptCandidate(complex: Complex, candidate: KaptComplexRecord) {
  const names = [complex.name, ...complex.aliases].map(normalizeName)
  const candidateName = normalizeName(candidate.complexName)
  const nameScore = Math.max(...names.map((name) => similarity(name, candidateName)))
  const dongScore = candidate.legalDongCode === complex.legalDongCode ? 0.25 : 0

  return Math.min(1, nameScore * 0.75 + dongScore)
}

function similarity(left: string, right: string) {
  if (!left || !right) return 0
  if (left === right) return 1
  if (left.includes(right) || right.includes(left)) return 0.86

  const leftTokens = createTokenSet(left)
  const rightTokens = createTokenSet(right)
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length
  const union = new Set([...leftTokens, ...rightTokens]).size

  return union > 0 ? intersection / union : 0
}

function createTokenSet(value: string) {
  const tokens = new Set<string>()

  for (let index = 0; index < value.length - 1; index += 1) {
    tokens.add(value.slice(index, index + 2))
  }

  return tokens
}

function normalizeName(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/아파트|단지|주공/g, '')
    .replace(/[^0-9a-z가-힣]/g, '')
}
