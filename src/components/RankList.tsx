import type { RankedComplex } from '../types'
import { isInferredCandidate } from '../lib/complexFlags'

type RankListProps = {
  title: string
  caption: string
  items: RankedComplex[]
  selectedId: string
  onSelect: (id: string) => void
  renderValue: (item: RankedComplex) => string
}

export function RankList({ title, caption, items, selectedId, onSelect, renderValue }: RankListProps) {
  return (
    <div className="rank-list-block">
      <div className="rank-list-heading">
        <strong>{title}</strong>
        <span>{caption}</span>
      </div>
      <div className="complex-list compact">
        {items.map((item, index) => (
          <button
            key={item.complex.id}
            className={`complex-row ${selectedId === item.complex.id ? 'selected' : ''}`}
            type="button"
            onClick={() => onSelect(item.complex.id)}
          >
            <div className="rank-badge">{index + 1}</div>
            <div className="rank-row-main">
              <strong>{item.complex.name}</strong>
              <span className="rank-row-meta">
                <span className="rank-row-meta-text">
                  {item.complex.district} · {item.complex.stage}
                </span>
                {isInferredCandidate(item.complex) && (
                  <em
                    className="tooltip-target"
                    data-tooltip="후보 추정: 아직 K-apt 단지코드·PNU·최근 실거래가가 완전히 매칭되지 않은 단지. 지역/준공연도/세대수/용적률 등 공개·레퍼런스 기반 값으로 임시 분석했으며, API 실매칭 후 점수와 정산금이 달라질 수 있음"
                    tabIndex={0}
                  >
                    후보 추정
                  </em>
                )}
              </span>
            </div>
            <b>{renderValue(item)}</b>
          </button>
        ))}
      </div>
    </div>
  )
}
