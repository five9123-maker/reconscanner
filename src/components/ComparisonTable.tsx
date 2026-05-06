import { BarChart3 } from 'lucide-react'
import type { RankedComplex } from '../types'

type ComparisonTableProps = {
  rankedComplexes: RankedComplex[]
  selectedId: string
  onSelect: (id: string) => void
  title: string
  caption: string
  mode: 'business' | 'success'
}

export function ComparisonTable({ rankedComplexes, selectedId, onSelect, title, caption, mode }: ComparisonTableProps) {
  return (
    <section className="analysis-panel comparison-panel">
      <div className="section-heading">
        <div>
          <span>단지 비교</span>
          <h2>{title}</h2>
          <p>{caption}</p>
        </div>
        <BarChart3 size={18} />
      </div>
      <div className="comparison-table">
        <div className="comparison-header">
          <span>단지</span>
          <span>등급</span>
          <span>{mode === 'business' ? '사업성' : '종합점수'}</span>
          <span>비례율</span>
          <span>정산금</span>
          <span>대지지분</span>
        </div>
        {rankedComplexes.slice(0, 5).map(({ complex, diagnosis }) => (
          <button
            key={complex.id}
            className={`comparison-row ${selectedId === complex.id ? 'selected' : ''}`}
            type="button"
            onClick={() => onSelect(complex.id)}
          >
            <span>
              <b>{complex.name}</b>
              <small>{complex.district}</small>
            </span>
            <strong>{diagnosis.grade}</strong>
            <span>{mode === 'business' ? `${diagnosis.businessScore.toFixed(0)}점` : `${diagnosis.reconScore.toFixed(0)}점`}</span>
            <span>{diagnosis.finance.accountingProRata.toFixed(0)}%/{diagnosis.finance.marketProRata.toFixed(0)}%</span>
            <span>{formatSettlementCurrency(diagnosis.finance.accountingSameSizeSettlement)}</span>
            <span>{complex.landShare.toFixed(1)}평</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function formatSettlementCurrency(value: number) {
  if (value < 0) return `${Math.abs(value).toFixed(1)}억 환급`
  if (value > 0) return `${value.toFixed(1)}억 부담`
  return '정산 없음'
}
