import type { Complex } from '../types'
import type { RegulationRecord } from './rawTypes'

export type RenewalMatchResult = {
  complexId: string
  complexName: string
  matched: boolean
  score: number
  sourceRecordName?: string
  reason: string
}

export function matchRenewalRecord(complex: Complex, records: RegulationRecord[]) {
  const candidates = records
    .map((record) => scoreRenewalRecord(complex, record))
    .sort((a, b) => b.score - a.score)

  const best = candidates[0]

  if (!best || best.score < 0.46) {
    return {
      result: {
        complexId: complex.id,
        complexName: complex.name,
        matched: false,
        score: best?.score ?? 0,
        sourceRecordName: best?.record.complexName,
        reason: best?.reason ?? '서울 정비사업 명칭과 단지명 일치 없음',
      },
    }
  }

  return {
    record: {
      ...best.record,
      legalDongCode: complex.legalDongCode,
      complexName: complex.name,
      allowedFar: Math.max(best.record.allowedFar, complex.allowedFar),
      sourceName: '서울 열린데이터광장 도시계획 정비사업 현황',
      sourceType: 'official_api' as const,
      sourceRecordName: best.record.complexName,
      matchConfidence: Math.round(best.score * 100),
      matchReason: best.reason,
    },
    result: {
      complexId: complex.id,
      complexName: complex.name,
      matched: true,
      score: Math.round(best.score * 100),
      sourceRecordName: best.record.complexName,
      reason: best.reason,
    },
  }
}

function scoreRenewalRecord(complex: Complex, record: RegulationRecord) {
  const recordName = normalize(record.complexName)
  const district = normalize(complex.district)
  const aliases = [complex.name, ...complex.aliases].map(normalize).filter(Boolean)
  let score = 0
  const reasons: string[] = []

  if (record.legalDongCode && record.legalDongCode === complex.legalDongCode) {
    score += 0.45
    reasons.push('법정동코드 일치')
  }

  const exactAlias = aliases.find((alias) => alias && recordName === alias)
  if (exactAlias) {
    score += 0.55
    reasons.push('단지명 정확 일치')
  } else {
    const containingAlias = aliases.find((alias) => alias.length >= 3 && recordName.includes(alias))
    const reverseAlias = aliases.find((alias) => alias.length >= 3 && recordName.length >= 3 && alias.includes(recordName))

    if (containingAlias) {
      score += 0.52
      reasons.push('정비구역명에 단지명 포함')
    } else if (reverseAlias) {
      score += 0.4
      reasons.push('단지명 부분 일치')
    }
  }

  if (district && recordName.includes(district)) {
    score += 0.12
    reasons.push('자치구명 일치')
  }

  if (recordName.includes('정비') || recordName.includes('재건축')) {
    score += 0.06
  }

  return {
    record,
    score: Math.min(1, score),
    reason: reasons.length > 0 ? reasons.join(', ') : '명칭 유사도 낮음',
  }
}

function normalize(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/아파트|단지|주택재건축|재건축|정비구역|정비사업|사업지구|사업구역|사업|일대/g, '')
    .replace(/[^0-9a-z가-힣]+/g, '')
}
