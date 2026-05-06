import { Download } from 'lucide-react'
import { calculateDiagnosis, formatCurrency } from '../lib/diagnosis'
import type { Scenario } from '../types'

type ReportPreviewProps = {
  rank: number
  scenario: Scenario
  selectedName: string
  reportTitle: string
  diagnosis: ReturnType<typeof calculateDiagnosis>
}

export function ReportPreview({ rank, scenario, selectedName, reportTitle, diagnosis }: ReportPreviewProps) {
  return (
    <section className="analysis-panel report-preview">
      <div className="section-heading">
        <div>
          <span>리포트 미리보기</span>
          <h2>{selectedName} 정밀 분석 요약</h2>
        </div>
        <Download size={18} />
      </div>
      <div className="report-grid">
        <div>
          <span>종합 순위</span>
          <strong>{rank}위</strong>
        </div>
        <div>
          <span>진단 등급</span>
          <strong>{diagnosis.grade}</strong>
        </div>
        <div>
          <span>비례율</span>
          <strong>{diagnosis.finance.accountingProRata.toFixed(0)}%/{diagnosis.finance.marketProRata.toFixed(0)}%</strong>
        </div>
        <div>
          <span>정비사업식 정산</span>
          <strong>
            {formatSettlementCurrency(diagnosis.finance.accountingSameSizeSettlement)}
          </strong>
        </div>
        <div>
          <span>손익분기 분양가</span>
          <strong>{Math.round(diagnosis.finance.breakEvenGeneralSalePrice).toLocaleString()}만원/평</strong>
        </div>
      </div>
      <p>
        {reportTitle}의 기준 가정은 공사비 {scenario.constructionCost.toLocaleString()}만원/평, 일반분양가 {scenario.salePrice}%, 금리{' '}
        {scenario.interestRate.toFixed(1)}%, 공공기여 {scenario.publicContribution}%이며, 총수익은{' '}
        {formatCurrency(diagnosis.finance.revenue.totalRevenue)}로 추정됩니다.
      </p>
    </section>
  )
}

function formatSettlementCurrency(value: number) {
  if (value < 0) return `${Math.abs(value).toFixed(1)}억 환급`
  if (value > 0) return `${value.toFixed(1)}억 부담`
  return '정산 없음'
}
