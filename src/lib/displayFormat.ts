import type { SourceType } from '../types'

export function formatSettlementCurrency(value: number) {
  if (value < 0) return `${Math.abs(value).toFixed(1)}억 환급`
  if (value > 0) return `${value.toFixed(1)}억 부담`
  return '정산 없음'
}

export function formatSettlementDelta(value: number) {
  if (Math.abs(value) < 0.05) return '변화 없음'

  return value > 0 ? `+${value.toFixed(1)}억 부담` : `${value.toFixed(1)}억 개선`
}

export function formatSignedPoint(value: number, suffix: string) {
  if (Math.abs(value) < 0.05) return `0${suffix}`

  return `${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix}`
}

export function formatSourceType(sourceType: SourceType) {
  const labels: Record<SourceType, string> = {
    official_api: 'API',
    public_document: '문서',
    manual_override: '추가',
    inferred: '추정',
  }

  return labels[sourceType]
}
