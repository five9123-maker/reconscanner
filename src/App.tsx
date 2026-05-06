import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Building2,
  Calculator,
  CircleDollarSign,
  Database,
  Download,
  FileText,
  Gauge,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react'
import { ComparisonTable } from './components/ComparisonTable'
import { Control } from './components/Control'
import { ReportPreview } from './components/ReportPreview'
import { baseScenario, calculateDiagnosis, formatCurrency, getContributionRange } from './lib/diagnosis'
import { buildReportPayload } from './lib/report'
import { getScenarioStressLabel, isBaseScenario, sanitizeScenario } from './lib/scenario'
import {
  createComplexRepository,
  getDefaultComplexId,
  listComplexes,
} from './repositories/complexRepository'
import type { Complex, DataSignal, RankedComplex, Scenario, SourceType } from './types'
import './App.css'

function App() {
  const [selectedId, setSelectedId] = useState(getDefaultComplexId())
  const [query, setQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [scenario, setScenario] = useState<Scenario>(baseScenario)
  const [liveEtlStatus, setLiveEtlStatus] = useState<LiveEtlStatus | null>(null)
  const [liveEtlRefreshKey, setLiveEtlRefreshKey] = useState(0)
  const [searchIndex, setSearchIndex] = useState<SearchIndexItem[]>([])
  const [pendingSearchOnlyItem, setPendingSearchOnlyItem] = useState<SearchIndexItem | null>(null)
  const [areaRangeOverrides, setAreaRangeOverrides] = useState<Record<string, string>>({})

  const repository = useMemo(() => createComplexRepository(mergeLiveComplexes(listComplexes(), liveEtlStatus?.complexes ?? []), []), [liveEtlStatus])
  const baseSelected = repository.getComplexById(selectedId) ?? repository.getComplexById(repository.getDefaultComplexId())!
  const transactionDiagnostic = useMemo(
    () => findTransactionDiagnostic(liveEtlStatus?.transactionDiagnostics ?? [], baseSelected),
    [liveEtlStatus, baseSelected],
  )
  const selectedAreaRange = areaRangeOverrides[baseSelected.id]
  const selectedAreaStat = useMemo(
    () => transactionDiagnostic?.areaPriceStats?.find((stat) => stat.areaRange === selectedAreaRange),
    [selectedAreaRange, transactionDiagnostic],
  )
  const selected = useMemo(
    () => (selectedAreaStat ? { ...baseSelected, recentPrice: selectedAreaStat.medianPrice } : baseSelected),
    [baseSelected, selectedAreaStat],
  )
  const diagnosis = useMemo(() => calculateDiagnosis(selected, scenario), [selected, scenario])
  const rankedComplexes = useMemo<RankedComplex[]>(
    () => repository.getRankedComplexes(scenario),
    [repository, scenario],
  )
  const businessRankedComplexes = useMemo<RankedComplex[]>(
    () => [...rankedComplexes].sort((left, right) => right.diagnosis.businessScore - left.diagnosis.businessScore),
    [rankedComplexes],
  )
  const searchSuggestions = useMemo(
    () => searchIndexByComplexName(searchIndex, query, rankedComplexes).slice(0, 8),
    [query, rankedComplexes, searchIndex],
  )
  const showSearchDropdown = isSearchFocused && query.trim().length > 0
  const contributionRange = getContributionRange(diagnosis.contribution)
  const accountingContributionRange = getContributionRange(diagnosis.finance.accountingSameSizeSettlement)
  const reportPayload = useMemo(() => buildReportPayload(selected, diagnosis, scenario), [selected, diagnosis, scenario])
  const scenarioLabel = getScenarioStressLabel(scenario)
  const selectedRank = rankedComplexes.findIndex(({ complex }) => complex.id === selected.id) + 1
  const selectedBusinessRank = businessRankedComplexes.findIndex(({ complex }) => complex.id === selected.id) + 1
  const dataProfile = selected.dataProfile
  const renewalMatch = useMemo(() => findRenewalMatch(liveEtlStatus?.renewalMatches ?? [], selected), [liveEtlStatus, selected])
  const dataQuality = useMemo(() => repository.getDataQualitySummary(), [repository])
  const validationIssues = useMemo(() => repository.getValidationIssues().slice(0, 3), [repository])

  useEffect(() => {
    let mounted = true

    fetch('/data/live-etl-result.json')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: LiveEtlStatus | null) => {
        if (mounted) {
          setLiveEtlStatus(payload)
        }
      })
      .catch(() => {
        if (mounted) {
          setLiveEtlStatus(null)
        }
      })

    return () => {
      mounted = false
    }
  }, [liveEtlRefreshKey])

  useEffect(() => {
    let mounted = true

    fetch('/data/search-index.json')
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: SearchIndexPayload | null) => {
        if (mounted && payload?.items) {
          setSearchIndex(payload.items)
        }
      })
      .catch(() => {
        if (mounted) {
          setSearchIndex([])
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={19} />
          </div>
          <div>
            <strong>Recon Scanner</strong>
            <span>재건축 사업성/리스크 진단 MVP</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-button"
            type="button"
            aria-label="기준 시나리오 복원"
            disabled={isBaseScenario(scenario)}
            onClick={() => setScenario(baseScenario)}
          >
            <RefreshCw size={18} />
          </button>
          <button className="icon-button" type="button" aria-label="데이터 상태">
            <Database size={18} />
          </button>
          <button className="primary-action" type="button" onClick={() => setShowReport((current) => !current)}>
            <Download size={17} />
            리포트
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="left-panel">
          <div className="search-area">
            <div className="search-box">
              <Search size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setIsSearchFocused(false), 120)}
                placeholder="단지명 검색"
                aria-label="단지명 검색"
                autoComplete="off"
              />
            </div>
            {showSearchDropdown && (
              <div className="search-dropdown">
                {searchSuggestions.length > 0 ? (
                  searchSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        if (item.status === 'analysis_ready') {
                          setSelectedId(item.id)
                          setPendingSearchOnlyItem(null)
                        } else {
                          setPendingSearchOnlyItem(item)
                        }
                        setQuery(item.name)
                        setIsSearchFocused(false)
                      }}
                    >
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.aliases.slice(0, 2).join(' · ') || item.district}</small>
                      </span>
                      <b>{item.status === 'analysis_ready' ? '분석' : '준비중'}</b>
                    </button>
                  ))
                ) : (
                  <p>일치하는 단지가 없습니다.</p>
                )}
              </div>
            )}
            {pendingSearchOnlyItem && (
              <div className="search-only-card">
                <span>K-apt 목록 확인</span>
                <strong>{pendingSearchOnlyItem.name}</strong>
                <p>
                  {pendingSearchOnlyItem.district || '자치구 미상'} · 법정동코드 {pendingSearchOnlyItem.legalDongCode || '미상'}
                </p>
                <small>아직 분석용 물리·거래·정비사업 묶음이 생성되지 않은 단지</small>
              </div>
            )}
          </div>

          <div className="list-panel">
            <div className="section-title">
              <Building2 size={18} />
              <span>전체 리스트 Top 10</span>
            </div>
            <RankList
              title="순수 사업성"
              caption="대지지분·용적률·분양가 체급 중심"
              items={businessRankedComplexes.slice(0, 10)}
              selectedId={selectedId}
              onSelect={setSelectedId}
              renderValue={({ diagnosis: itemDiagnosis }) => `${itemDiagnosis.businessScore.toFixed(0)}점`}
            />
            <RankList
              title="현재 추진 성공"
              caption="사업성에 단계·규제·추진력 반영"
              items={rankedComplexes.slice(0, 10)}
              selectedId={selectedId}
              onSelect={setSelectedId}
              renderValue={({ diagnosis: itemDiagnosis }) => itemDiagnosis.grade}
            />
          </div>
        </aside>

        <section className="detail-panel">
          <div className="summary-band">
            <div className="summary-copy">
              <span className="eyebrow">
                <MapPin size={15} />
                {selected.address}
              </span>
              <h1>{selected.name}</h1>
              <p>{selected.note}</p>
            </div>
            <div className="score-gauge" style={{ '--score': `${diagnosis.reconScore * 3.6}deg` } as React.CSSProperties}>
              <div>
                <span>{diagnosis.grade}</span>
                <small>종합 진단</small>
                <em>추진 {selectedRank}위</em>
              </div>
            </div>
          </div>

          <div className="metric-grid">
            <article
              className="metric tooltip-target"
              data-tooltip={`산식: 비례율·대지지분·용적률 여력·신축 분양가 체급·공사비 민감도 가중합. 순수 사업성 ${selectedBusinessRank}위`}
              tabIndex={0}
            >
              <Gauge size={19} />
              <span>사업성</span>
              <strong>{diagnosis.businessLabel}</strong>
              <small>{diagnosis.businessScore.toFixed(0)}점 · 사업성 {selectedBusinessRank}위</small>
            </article>
            <article
              className="metric tooltip-target"
              data-tooltip="정비사업식: (총수익-공사비-사업비)/종전자산. 시장가치식: 현재 구축 시세/동일평형 신축 원가. 두 값을 함께 봐야 실제 분담금과 시장 체감 차이를 구분할 수 있음"
              tabIndex={0}
            >
              <TrendingUp size={19} />
              <span>비례율 비교</span>
              <strong>{diagnosis.finance.accountingProRata.toFixed(0)}% / {diagnosis.finance.marketProRata.toFixed(0)}%</strong>
              <small>정비사업식 추정 / 시장가치식</small>
            </article>
            <article
              className="metric tooltip-target"
              data-tooltip={`정비사업식: ${diagnosis.finance.accountingSettlementSource}. 시장가치식: ${diagnosis.finance.sameSizeSettlementSource}`}
              tabIndex={0}
            >
              <CircleDollarSign size={19} />
              <span>동일평형 정산 비교</span>
              <strong>{formatSettlementCurrency(diagnosis.finance.accountingSameSizeSettlement)}</strong>
              <small>시장가치식 {formatSettlementCurrency(diagnosis.finance.sameSizeSettlement)}</small>
            </article>
            <article
              className="metric tooltip-target"
              data-tooltip="기준: 공공 API 확보, 수동 보강, 최신성, 검증 이슈 종합 품질 점수"
              tabIndex={0}
            >
              <ShieldAlert size={19} />
              <span>데이터 신뢰도</span>
              <strong>{selected.dataReliability}%</strong>
              <small>{dataProfile?.estimationMode === 'manual_enriched' ? '추가 근거 포함' : '공공 추정'}</small>
            </article>
          </div>

          <section className="insight-grid">
            <div className="analysis-panel">
              <div className="section-heading">
                <div>
                  <span>핵심 판단</span>
                  <h2>왜 이 등급인가</h2>
                </div>
              </div>
              <div className="complex-info-card">
                <span>단지정보</span>
                <div className="facts-grid">
                  <FactRow label="준공연도" value={`${selected.builtYear}`} tooltip="출처: K-apt 단지 기본정보. 용도: 노후도 점수" />
                  <FactRow label="세대수" value={`${selected.units.toLocaleString()}세대`} tooltip="출처: K-apt 단지 기본정보 또는 단지 원장. 용도: 종전자산, 조합원 분양면적, 대지면적 환산" />
                  <FactRow
                    label="현재/허용 용적률"
                    value={`${selected.currentFar}% / ${selected.allowedFar}%`}
                    tooltip="현재 용적률: 기존 단지 사용 용적률. 허용 용적률: 재건축 후 추정 상한. 용도: 일반분양 여력"
                  />
                  <FactRow
                    label="평균 대지지분"
                    value={`${selected.landShare.toFixed(1)}평`}
                    tooltip="산식: 대지면적 / 세대수. 용도: 토지지분 가격, 일반분양 여력, 사업성 점수"
                  />
                </div>
              </div>
              <div className="reason-list">
                {diagnosis.riskSummary.map((risk) => (
                  <div key={risk} className="reason-item">
                    <span />
                    <p>{risk}</p>
                  </div>
                ))}
              </div>
              <div className="score-bars">
                {[
                  { label: '사업성', value: diagnosis.businessScore },
                  { label: '노후도', value: diagnosis.agingScore },
                  { label: '규제', value: diagnosis.regulationScore },
                  { label: '추진력', value: diagnosis.momentumScore },
                  { label: '시장', value: diagnosis.timingScore },
                ].map(({ label, value }) => (
                  <div className="score-bar tooltip-target" key={label} data-tooltip={createScoreTooltip(label, selected, diagnosis, scenario)} tabIndex={0}>
                    <span>{label}</span>
                    <div>
                      <i style={{ width: `${value}%` }} />
                    </div>
                    <b>{value.toFixed(0)}</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="analysis-panel calculator-panel">
              <div className="section-heading">
                <div>
                  <span>정산금 시나리오</span>
                  <h2>정비사업식 / 시장가치식</h2>
                </div>
                <Calculator size={18} />
              </div>
              <div className="settlement-method-grid">
                <SettlementMethodCard
                  title="정비사업식 추정"
                  tooltip="실제 정비사업 분담금에 가까운 방식. 권리가액=종전자산×비례율, 정산금=조합원분양가-권리가액"
                  range={accountingContributionRange}
                />
                <SettlementMethodCard
                  title="시장가치식"
                  tooltip="현재 구축 시세를 토지가치로 보고 신축 동일평형 원가와 비교하는 간이 방식. 시장 체감에는 유용하지만 실제 고지 분담금과 다를 수 있음"
                  range={contributionRange}
                />
              </div>
              <div className="settlement-list">
                {diagnosis.finance.accountingSettlementScenarios.slice(0, 3).map((accountingItem, index) => {
                  const marketItem = diagnosis.finance.settlementScenarios[index]

                  return (
                    <div
                      key={`${accountingItem.label}-${accountingItem.allocatedPyeong}`}
                      className="dual-settlement-row tooltip-target"
                      data-tooltip={`정비사업식: ${accountingItem.sourceName}. 신뢰도 ${accountingItem.confidence}%. 시장가치식: ${marketItem?.sourceName ?? '미상'}. 신뢰도 ${marketItem?.confidence ?? 0}%`}
                      tabIndex={0}
                    >
                      <span>
                        {accountingItem.label} {accountingItem.currentPyeong}→{accountingItem.allocatedPyeong}평
                      </span>
                      <div>
                        <small>정비사업식 추정</small>
                        <b className={accountingItem.settlement < 0 ? 'refund' : 'burden'}>{formatSettlementCurrency(accountingItem.settlement)}</b>
                      </div>
                      <div>
                        <small>시장가치식</small>
                        <b className={(marketItem?.settlement ?? 0) < 0 ? 'refund' : 'burden'}>{formatSettlementCurrency(marketItem?.settlement ?? 0)}</b>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="analysis-panel finance-panel">
            <div className="section-heading">
              <div>
                <span>사업수지표</span>
                <h2>정산금 기반 예상 비례율</h2>
              </div>
              <CircleDollarSign size={18} />
            </div>
            <div className="finance-grid">
              <div className="finance-column">
                <span>수익</span>
                <FinanceLine
                  label="조합원분양"
                  value={diagnosis.finance.revenue.memberSalesRevenue}
                  source={createFinanceSource(
                    'inferred',
                    '조합원 분양면적×조합원 분양가',
                    64,
                    `${diagnosis.finance.plan.memberSaleArea.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}평 × ${Math.round(
                      diagnosis.finance.revenue.memberSalesRevenue / diagnosis.finance.plan.memberSaleArea * 10000,
                    ).toLocaleString()}만원/평. 조합원 분양가는 주변 신축 평당가의 78% 적용`,
                  )}
                />
                <FinanceLine
                  label="일반분양"
                  value={diagnosis.finance.revenue.generalSalesRevenue}
                  source={
                    selected.financeOverride?.generalSalesRevenue
                      ? createFinanceSource('manual_override', '단지별 수동 보강값', 78)
                      : createFinanceSource(
                          'inferred',
                          '일반분양면적×신축 평당가',
                          66,
                          `${diagnosis.finance.plan.generalSaleArea.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}평 × ${Math.round(
                            diagnosis.finance.revenue.generalSalesRevenue / Math.max(diagnosis.finance.plan.generalSaleArea, 1) * 10000,
                          ).toLocaleString()}만원/평. 신축 평당가는 주변 신축 시세 기준가와 시나리오 분양가 배율 적용`,
                        )
                  }
                />
                <FinanceLine
                  label="임대주택"
                  value={diagnosis.finance.revenue.rentalHousingRevenue}
                  source={createFinanceSource(
                    'inferred',
                    '임대주택면적×공공매입 단가',
                    58,
                    `${diagnosis.finance.plan.rentalHousingArea.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}평 × 1,000만원/평. 공공매입 단가 고정 가정`,
                  )}
                />
                <FinanceLine
                  label="상가/부대시설"
                  value={diagnosis.finance.revenue.commercialRevenue}
                  source={createFinanceSource(
                    'inferred',
                    '상가면적×신축 평당가 보정',
                    52,
                    `${diagnosis.finance.plan.commercialArea.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}평 × ${Math.round(
                      diagnosis.finance.revenue.commercialRevenue / Math.max(diagnosis.finance.plan.commercialArea, 1) * 10000,
                    ).toLocaleString()}만원/평. 상가 단가는 신축 평당가의 72% 적용`,
                  )}
                />
                <FinanceLine
                  label="총수익"
                  value={diagnosis.finance.revenue.totalRevenue}
                  source={createFinanceSource('inferred', '수익 항목 합계', 72, '조합원분양 + 일반분양 + 임대주택 + 상가/부대시설')}
                  strong
                />
              </div>
              <div className="finance-column">
                <span>비용</span>
                <FinanceLine
                  label="종전자산"
                  value={diagnosis.finance.cost.previousAssetValue}
                  source={createFinanceSource(
                    'official_api',
                    '종전자산 추정가×세대수',
                    74,
                    `${selected.previousAssetValue.toFixed(1)}억 × ${selected.units.toLocaleString()}세대. 종전자산은 실거래가보다 낮은 감정평가성 값으로 별도 추정`,
                  )}
                />
                <FinanceLine
                  label="공사비"
                  value={diagnosis.finance.cost.constructionCost}
                  source={createFinanceSource(
                    'inferred',
                    '시나리오 공사비×추정 연면적',
                    62,
                    `${scenario.constructionCost.toLocaleString()}만원/평 × ${diagnosis.finance.plan.grossFloorArea.toLocaleString('ko-KR', {
                      maximumFractionDigits: 0,
                    })}평. 연면적은 공급면적×1.72 계수 적용`,
                  )}
                />
                <FinanceLine
                  label="사업비"
                  value={diagnosis.finance.cost.businessCost}
                  source={
                    selected.financeOverride?.businessCost
                      ? createFinanceSource('manual_override', '사업성 분석 입력값', 78)
                      : createFinanceSource(
                          'inferred',
                          '금융비·기반시설·운영비 추정',
                          56,
                          `보상비 ${formatCurrency(diagnosis.finance.cost.previousAssetValue * 0.025)}, 금융비·기반시설·세금·운영비·단계 버퍼 합산`,
                        )
                  }
                />
                <FinanceLine
                  label="총지출"
                  value={diagnosis.finance.cost.totalCost}
                  source={createFinanceSource('inferred', '종전자산+공사비+사업비', 70, '종전자산 + 공사비 + 사업비')}
                  strong
                />
              </div>
              <div className="finance-column">
                <span>핵심 지표</span>
                <FinanceLine
                  label="사업수지 차액"
                  value={diagnosis.finance.surplus - diagnosis.finance.cost.previousAssetValue}
                  source={createFinanceSource('inferred', '수익-공사비-사업비-종전자산', 68, '총수익 - 공사비 - 사업비 - 종전자산')}
                />
                <FinanceLine
                  label="정비사업식 추정 정산"
                  valueText={formatSettlementCurrency(diagnosis.finance.accountingSameSizeSettlement)}
                  source={createFinanceSource(
                    'inferred',
                    diagnosis.finance.accountingSettlementSource,
                    58,
                    `정비사업식 비례율 ${diagnosis.finance.accountingProRata.toFixed(1)}%. 조합원분양가 - 종전자산×비례율`,
                  )}
                  settlement={diagnosis.finance.accountingSameSizeSettlement}
                />
                <FinanceLine
                  label="시장가치식 정산"
                  valueText={formatSettlementCurrency(diagnosis.finance.sameSizeSettlement)}
                  source={createFinanceSource(
                    'inferred',
                    diagnosis.finance.sameSizeSettlementSource,
                    62,
                    `현재 구축 시세 ${selected.recentPrice.toFixed(1)}억. 토지 평당가=현재 시세/대지지분. 신축 원가=신축 토지지분 원가+평당 사업비 원가`,
                  )}
                  settlement={diagnosis.finance.sameSizeSettlement}
                />
                <FinanceLine
                  label="일반분양면적"
                  value={diagnosis.finance.plan.generalSaleArea}
                  suffix="평"
                  source={
                    selected.financeOverride?.generalSaleArea
                      ? createFinanceSource('manual_override', '사업성 분석 입력값', 86)
                      : createFinanceSource(
                          'inferred',
                          '허용 용적률 기반 잔여 분양면적',
                          58,
                          `총 공급가능면적 ${diagnosis.finance.plan.saleableFloorArea.toLocaleString('ko-KR', {
                            maximumFractionDigits: 0,
                          })}평 - 조합원분양 - 임대주택 - 상가/부대시설`,
                        )
                  }
                />
                <FinanceLine
                  label="임대주택면적"
                  value={diagnosis.finance.plan.rentalHousingArea}
                  suffix="평"
                  source={
                    selected.financeOverride?.rentalHousingArea
                      ? createFinanceSource('manual_override', '사업성 분석 입력값', 82)
                      : createFinanceSource(
                          'inferred',
                          '공공기여·용적률 인센티브 반영',
                          55,
                          `공급가능면적 × 임대 비율. 기본 8%, 용적률 여력과 공공기여율로 가산, 상한 18%`,
                        )
                  }
                />
                <FinanceLine
                  label="손익분기 분양가"
                  value={diagnosis.finance.breakEvenGeneralSalePrice}
                  suffix="만원/평"
                  source={createFinanceSource('inferred', '총지출 회수 필요 분양가', 64, '일반분양수익으로 남은 총지출을 회수하기 위한 평당 분양가')}
                />
              </div>
            </div>
          </section>

          <section className="analysis-panel data-profile-panel">
            <div className="section-heading">
              <div>
                <span>데이터 확보 방식</span>
                <h2>공공 API 추정값과 추가 근거</h2>
              </div>
              <FileText size={18} />
            </div>
            <div className="data-profile-grid">
              <div className="source-column">
                <span>공공 데이터 기반</span>
                {(dataProfile?.publicSignals ?? []).map((signal) => (
                  <SignalRow key={`${signal.label}-${signal.sourceName}`} signal={signal} />
                ))}
              </div>
              <div className="source-column">
                <span>문서·추가 근거</span>
                {(dataProfile?.manualSignals.length ?? 0) > 0 ? (
                  dataProfile?.manualSignals.map((signal) => <SignalRow key={`${signal.label}-${signal.sourceName}`} signal={signal} />)
                ) : (
                  <div className="empty-source">아직 추가 근거 없음</div>
                )}
              </div>
              <div className="source-column gap-column">
                <span>추가 확보 필요</span>
                {(dataProfile?.gaps ?? []).map((gap) => (
                  <p key={gap}>{gap}</p>
                ))}
              </div>
            </div>
          </section>

          {transactionDiagnostic && (
            <section className="analysis-panel trade-diagnostic-panel">
              <div className="section-heading">
                <div>
                  <span>실거래가 진단</span>
                  <h2>대표가격 산정 근거</h2>
                </div>
                <TrendingUp size={18} />
              </div>
              <div className="trade-summary-grid">
                <div>
                  <span>거래 매칭</span>
                  <strong>{formatMatchStrategy(transactionDiagnostic.matchStrategy)}</strong>
                  <small>신뢰도 {Math.round((transactionDiagnostic.matchConfidence ?? 0) * 100)}%</small>
                </div>
                <div>
                  <span>대표 면적대</span>
                  <strong>{transactionDiagnostic.representativeAreaRange ?? '전체 거래'}</strong>
                  <small>{transactionDiagnostic.tradeCount}건 기준</small>
                </div>
                <div>
                  <span>면적대 수</span>
                  <strong>{transactionDiagnostic.areaPriceStats?.length ?? 0}개</strong>
                  <small>전용면적 bucket</small>
                </div>
              </div>
              <div className="area-stats-list">
                {(transactionDiagnostic.areaPriceStats ?? []).map((stat) => (
                  <button
                    key={stat.areaRange}
                    type="button"
                    className={stat.areaRange === (selectedAreaRange ?? transactionDiagnostic.representativeAreaRange) ? 'selected' : ''}
                    onClick={() =>
                      setAreaRangeOverrides((current) => ({
                        ...current,
                        [selected.id]: stat.areaRange,
                      }))
                    }
                  >
                    <span>{stat.areaRange}</span>
                    <b>{formatCurrency(stat.medianPrice)}</b>
                    <small>
                      {stat.tradeCount}건 · 평당 {stat.medianPricePerPyeong.toFixed(2)}억
                    </small>
                  </button>
                ))}
              </div>
              <p className="trade-diagnostic-note">
                선택한 면적대 가격이 현재 시세로 반영되어 정산금·비례율을 다시 계산
              </p>
            </section>
          )}

          {renewalMatch && (
            <section className="analysis-panel renewal-match-panel">
              <div className="section-heading">
                <div>
                  <span>정비구역 매칭</span>
                  <h2>{renewalMatch.matched ? '서울 정비사업 API 매칭' : '직접 매칭 없음'}</h2>
                </div>
                <FileText size={18} />
              </div>
              <div className="renewal-match-card tooltip-target" data-tooltip={`출처: 서울 열린데이터광장 도시계획 정비사업 현황. 매칭 사유: ${renewalMatch.reason}. 매칭 점수 ${renewalMatch.score}점`} tabIndex={0}>
                <span>{renewalMatch.matched ? '매칭 원문' : '가장 가까운 후보'}</span>
                <strong>{renewalMatch.sourceRecordName ?? '후보 없음'}</strong>
                <small>{renewalMatch.reason} · {renewalMatch.score}점</small>
              </div>
            </section>
          )}

          <ComparisonTable
            rankedComplexes={businessRankedComplexes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            title="순수 사업성 비교"
            caption="단계와 규제를 빼고 경제성 신호를 우선 비교"
            mode="business"
          />

          <ComparisonTable
            rankedComplexes={rankedComplexes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            title="현재 추진 성공 가능성"
            caption="사업성에 인허가 단계·규제·주민 추진력을 반영"
            mode="success"
          />

          {showReport && (
            <ReportPreview
              rank={selectedRank}
              scenario={scenario}
              selectedName={selected.name}
              reportTitle={reportPayload.title}
              diagnosis={diagnosis}
            />
          )}
        </section>

        <aside className="right-panel">
          <div className="section-title">
            <SlidersHorizontal size={18} />
            <span>시나리오 조정 · {scenarioLabel}</span>
          </div>
          <Control
            label="공사비"
            value={scenario.constructionCost}
            min={760}
            max={1200}
            step={10}
            suffix="만원/평"
            tooltip="기준: 평당 공사비. 서울 주요 정비사업의 최근 공사비 700~1,000만원/평 범위를 반영. 영향: 공사비, 사업비, 동일평형 정산금, 손익분기 분양가"
            onChange={(value) => setScenario((current) => sanitizeScenario({ ...current, constructionCost: value }))}
          />
          <Control
            label="일반분양가"
            value={scenario.salePrice}
            min={80}
            max={125}
            step={1}
            suffix="%"
            tooltip="기준: 주변 신축 아파트 평당 시세 대비 일반분양가 배율. 100%는 현재 주변 신축 기준가 그대로 적용. 영향: 일반분양수익, 비례율, 사업성 점수"
            onChange={(value) => setScenario((current) => sanitizeScenario({ ...current, salePrice: value }))}
          />
          <Control
            label="금리"
            value={scenario.interestRate}
            min={2.5}
            max={7}
            step={0.1}
            suffix="%"
            tooltip="기준: 사업기간 중 조달금리/금융비 민감도. 금리 상승 시 금융비와 사업비 증가. 영향: 사업비, 비례율, 시장 타이밍 점수"
            onChange={(value) => setScenario((current) => sanitizeScenario({ ...current, interestRate: value }))}
          />
          <Control
            label="공공기여"
            value={scenario.publicContribution}
            min={0}
            max={25}
            step={1}
            suffix="%"
            tooltip="기준: 기부채납, 공공임대, 기반시설 등으로 빠지는 사업 부담률. 값이 높을수록 임대주택면적과 기반시설비 증가. 영향: 일반분양면적, 사업비, 정산금"
            onChange={(value) => setScenario((current) => sanitizeScenario({ ...current, publicContribution: value }))}
          />

          <div className="watch-panel">
            <span>변수 민감도 Top 3</span>
            <ol>
              <li>일반분양가 하락</li>
              <li>공사비 상승</li>
              <li>금융비 증가</li>
            </ol>
          </div>

          <div className="notice-panel">
            <strong>데이터 상태</strong>
            {liveEtlStatus && (
              <div className="live-etl-card">
                <div className="live-etl-header">
                  <span
                    className="tooltip-target"
                    data-tooltip="실시간 데이터 갱신: 공공 API에서 단지 기본정보, 실거래가, 정비사업 정보를 가져와 화면용 분석 데이터로 정리하는 과정"
                    tabIndex={0}
                  >
                    실시간 데이터 갱신
                  </span>
                  <button type="button" onClick={() => setLiveEtlRefreshKey((current) => current + 1)}>
                    상태 새로고침
                  </button>
                </div>
                <b className="tooltip-target" data-tooltip="이번 갱신에서 분석 모델로 변환된 단지 수" tabIndex={0}>
                  {liveEtlStatus.stats.normalizedComplexes}개 단지 갱신
                </b>
                <strong
                  className="tooltip-target"
                  data-tooltip={
                    liveEtlStatus.mode === 'live_api'
                      ? '국토부·K-apt·서울시 API 호출이 성공해 실제 공공 데이터가 반영된 상태'
                      : '일부 API가 실패해 기존 추정값 또는 저장된 기본값으로 보완한 상태'
                  }
                  tabIndex={0}
                >
                  {liveEtlStatus.mode === 'live_api' ? '실제 API 반영' : '보완값 포함'}
                </strong>
                <p className="tooltip-target" data-tooltip="이번에 API로 다시 확인한 내부 단지 ID 목록" tabIndex={0}>
                  대상 {liveEtlStatus.targets?.join(', ') ?? '미상'}
                </p>
                <p className="tooltip-target" data-tooltip="실거래가는 최근 몇 개월을 묶어 대표 가격을 계산. 경고/오류는 데이터 검증 과정에서 발견된 품질 문제 수" tabIndex={0}>
                  거래 조회 {liveEtlStatus.transactionLookbackMonths ?? 1}개월 · 경고 {liveEtlStatus.stats.warningCount} · 오류{' '}
                  {liveEtlStatus.stats.errorCount}
                </p>
                {liveEtlStatus.seoulRenewal && (
                  <p className="tooltip-target" data-tooltip="서울 열린데이터광장의 정비사업 원문 행 수와, 앱에서 사업단계/규제 데이터로 변환한 행 수" tabIndex={0}>
                    서울 정비사업 {liveEtlStatus.seoulRenewal.rows}건 · 변환 {liveEtlStatus.seoulRenewal.regulationRecords}건
                  </p>
                )}
                {liveEtlStatus.renewalMatches && (
                  <p className="tooltip-target" data-tooltip="서울 정비사업 원문 명칭이 현재 분석 단지명과 충분히 일치한 건수" tabIndex={0}>
                    정비구역 매칭 {liveEtlStatus.renewalMatches.filter((match) => match.matched).length}/
                    {liveEtlStatus.renewalMatches.length}건
                  </p>
                )}
                {liveEtlStatus.kaptMatches && (
                  <p className="tooltip-target" data-tooltip="K-apt 공동주택 단지 목록에서 현재 분석 단지를 찾아낸 건수. 단지명/법정동 기준으로 매칭" tabIndex={0}>
                    K-apt 매칭 {liveEtlStatus.kaptMatches.filter((match) => match.matched).length}/{liveEtlStatus.kaptMatches.length}건
                  </p>
                )}
                {liveEtlStatus.transactionDiagnostics && (
                  <p className="tooltip-target" data-tooltip="국토부 실거래가에서 단지명, 동, 지번, 준공연도까지 맞춰 거래를 찾은 건수. 고신뢰는 매칭 신뢰도 72% 이상" tabIndex={0}>
                    거래진단 {liveEtlStatus.transactionDiagnostics.length}건 · 고신뢰{' '}
                    {liveEtlStatus.transactionDiagnostics.filter((item) => (item.matchConfidence ?? 0) >= 0.72).length}건
                  </p>
                )}
                <p className="tooltip-target" data-tooltip="마지막으로 데이터 갱신 파일이 생성된 시각" tabIndex={0}>
                  {new Date(liveEtlStatus.generatedAt).toLocaleString('ko-KR')}
                </p>
                {liveEtlStatus.skippedSources.length > 0 && <em>{liveEtlStatus.skippedSources[0]}</em>}
              </div>
            )}
            <div className="data-status-grid">
              <span className="tooltip-target" data-tooltip="현재 화면에서 분석 가능한 단지 수" tabIndex={0}>대상 단지</span>
              <b>{dataQuality.totalComplexes}개</b>
              <span className="tooltip-target" data-tooltip="단지별 필수 데이터 확보율을 평균낸 값. K-apt, PNU, 좌표, 거래가, 정비사업, 주변 신축가 포함" tabIndex={0}>평균 신뢰도</span>
              <b>{dataQuality.averageReliability.toFixed(0)}%</b>
              <span className="tooltip-target" data-tooltip="K-apt 단지 코드가 아직 연결되지 않은 단지 수" tabIndex={0}>K-apt 누락</span>
              <b>{dataQuality.missingKaptCode}건</b>
              <span className="tooltip-target" data-tooltip="토지 필지 식별자인 PNU가 없는 단지 수. PNU가 없으면 토지·규제 매칭 정밀도가 낮아짐" tabIndex={0}>PNU 누락</span>
              <b>{dataQuality.missingPnu}건</b>
              <span className="tooltip-target" data-tooltip="데이터 검증 규칙에서 발견한 누락, 오래된 값, 비정상 범위의 합계" tabIndex={0}>품질 이슈</span>
              <b>{dataQuality.issueCount}건</b>
              <span className="tooltip-target" data-tooltip="경고는 해석 주의, 오류는 분석 신뢰도에 직접 영향을 줄 수 있는 문제" tabIndex={0}>경고/오류</span>
              <b>
                {dataQuality.warningCount}/{dataQuality.errorCount}
              </b>
            </div>
            <div className="issue-list">
              {validationIssues.map((issue) => (
                <div key={`${issue.complexId}-${issue.field}`} className={`issue-item ${issue.severity}`}>
                  <span>{issue.severity}</span>
                  <p>
                    <b>{issue.complexName}</b>
                    {issue.message}
                  </p>
                </div>
              ))}
            </div>
            <p>샘플 repository 기반. 다음 단계: K-apt, 실거래가, 정비사업 ETL 결과로 교체</p>
          </div>
        </aside>
      </section>
    </main>
  )
}

type FinanceLineProps = {
  label: string
  value?: number
  valueText?: string
  suffix?: string
  source?: FinanceSource
  strong?: boolean
  settlement?: number
}

type FinanceSource = {
  sourceType: SourceType
  label: string
  confidence: number
  detail?: string
}

type SearchIndexItem = {
  id: string
  name: string
  aliases: string[]
  district: string
  legalDongCode: string
  status: 'analysis_ready' | 'search_only'
  source: 'sample_analysis_db' | 'kapt_api'
}

type SearchIndexPayload = {
  generatedAt: string
  items: SearchIndexItem[]
}

type LiveEtlStatus = {
  generatedAt: string
  mode?: 'live_api' | 'fallback_with_skips'
  targets?: string[]
  transactionLookbackMonths?: number
  seoulRenewal?: {
    rows: number
    regulationRecords: number
    error?: string
  }
  kaptMatches?: Array<{
    matched: boolean
  }>
  renewalMatches?: Array<{
    complexId: string
    complexName: string
    matched: boolean
    score: number
    sourceRecordName?: string
    reason: string
  }>
  transactionDiagnostics?: TransactionDiagnostic[]
  skippedSources: string[]
  complexes?: Complex[]
  stats: {
    normalizedComplexes: number
    warningCount: number
    errorCount: number
  }
}

type TransactionDiagnostic = {
  complexName: string
  tradeCount: number
  representativeAreaRange?: string
  matchStrategy?: string
  matchConfidence?: number
  areaPriceStats?: Array<{
    areaRange: string
    tradeCount: number
    medianPrice: number
    medianPricePerPyeong: number
  }>
}

function mergeLiveComplexes(baseComplexes: Complex[], liveComplexes: Complex[]) {
  if (liveComplexes.length === 0) return baseComplexes

  return baseComplexes.map((complex) => {
    const liveComplex = liveComplexes.find(
      (item) =>
        item.id === complex.id ||
        item.identifiers.complexId === complex.identifiers.complexId ||
        (item.legalDongCode === complex.legalDongCode && item.name === complex.name),
    )

    return liveComplex
      ? {
          ...complex,
          ...liveComplex,
          aliases: [...new Set([...complex.aliases, ...liveComplex.aliases])],
          dataProfile: complex.dataProfile,
          financeOverride: complex.financeOverride,
          marketOverride: complex.marketOverride,
          note: complex.note,
        }
      : complex
  })
}

function findTransactionDiagnostic(diagnostics: TransactionDiagnostic[], complex: Complex) {
  const normalizedNames = [complex.name, ...complex.aliases].map(normalizeText)

  return diagnostics.find((diagnostic) => normalizedNames.includes(normalizeText(diagnostic.complexName)))
}

function findRenewalMatch(matches: NonNullable<LiveEtlStatus['renewalMatches']>, complex: Complex) {
  const normalizedNames = [complex.name, ...complex.aliases].map(normalizeText)

  return matches.find((match) => match.complexId === complex.id || normalizedNames.includes(normalizeText(match.complexName)))
}

function normalizeText(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/아파트|단지/g, '')
}

function formatMatchStrategy(strategy?: string) {
  if (strategy === 'name+metadata') return '이름+주소'
  if (strategy === 'name-only') return '이름 중심'
  if (strategy === 'fallback-all-district-trades') return '구 전체 fallback'

  return '미상'
}

function createScoreTooltip(label: string, complex: Complex, diagnosis: ReturnType<typeof calculateDiagnosis>, scenario: Scenario) {
  const farUpside = complex.allowedFar - complex.currentFar
  const age = 2026 - complex.builtYear
  const generalSaleRatio = diagnosis.finance.plan.saleableFloorArea > 0
    ? (diagnosis.finance.plan.generalSaleArea / diagnosis.finance.plan.saleableFloorArea) * 100
    : 0
  const constructionDelta = scenario.constructionCost - baseScenario.constructionCost

  const tooltips: Record<string, string> = {
    사업성: `판단 기준: 비례율, 대지지분, 용적률 여력, 주변 신축 시세, 공사비 민감도 가중합. 근거: 비례율 ${diagnosis.proRata.toFixed(0)}%, 대지지분 ${complex.landShare.toFixed(1)}평, 용적률 여력 ${farUpside}%p, 일반분양면적 ${generalSaleRatio.toFixed(1)}%`,
    노후도: `판단 기준: 준공 후 경과연수. 30년 이상이면 재건축 검토 가능 구간으로 가산. 근거: ${complex.builtYear}년 준공, ${age}년 경과`,
    규제: `판단 기준: 규제 리스크가 낮을수록 고점. 낮음 88점, 중간 66점, 높음 42점. 근거: 현재 ${complex.regulationRisk}, 허용 용적률 ${complex.allowedFar}%`,
    추진력: `판단 기준: 사업 단계와 주민 추진력 평균. 사업시행인가·관리처분인가에 가까울수록 가산. 근거: 단계 ${complex.stage}, 주민 추진력 ${complex.residentMomentum}`,
    시장: `판단 기준: 금리와 공사비가 낮을수록 고점. 기준은 금리 ${baseScenario.interestRate}%, 공사비 ${baseScenario.constructionCost}만원/평. 근거: 현재 금리 ${scenario.interestRate}%, 공사비 ${scenario.constructionCost}만원/평, 기준 대비 ${constructionDelta >= 0 ? '+' : ''}${constructionDelta}만원/평`,
  }

  return tooltips[label] ?? `${label}: 산정 기준 미연결`
}

function searchIndexByComplexName(searchIndex: SearchIndexItem[], query: string, fallback: RankedComplex[]): SearchIndexItem[] {
  const normalizedQuery = normalizeNameForSearch(query)

  if (!normalizedQuery) {
    return fallback.map(({ complex }) => toSearchIndexItem(complex))
  }

  const source = searchIndex.length > 0 ? searchIndex : fallback.map(({ complex }) => toSearchIndexItem(complex))

  return source.filter((item) => [item.name, ...item.aliases].some((value) => normalizeNameForSearch(value).includes(normalizedQuery)))
}

function toSearchIndexItem(complex: Complex): SearchIndexItem {
  return {
    id: complex.id,
    name: complex.name,
    aliases: complex.aliases,
    district: complex.district,
    legalDongCode: complex.legalDongCode,
    status: 'analysis_ready',
    source: 'sample_analysis_db',
  }
}

function normalizeNameForSearch(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, '').replace(/아파트|단지/g, '')
}

type RankListProps = {
  title: string
  caption: string
  items: RankedComplex[]
  selectedId: string
  onSelect: (id: string) => void
  renderValue: (item: RankedComplex) => string
}

function RankList({ title, caption, items, selectedId, onSelect, renderValue }: RankListProps) {
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
            <div>
              <strong>{item.complex.name}</strong>
              <span>
                {item.complex.district} · {item.complex.stage}
              </span>
            </div>
            <b>{renderValue(item)}</b>
          </button>
        ))}
      </div>
    </div>
  )
}

type FactRowProps = {
  label: string
  value: string
  tooltip: string
}

function FactRow({ label, value, tooltip }: FactRowProps) {
  return (
    <div className="fact-row tooltip-target" data-tooltip={tooltip} tabIndex={0}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

function SettlementMethodCard({ title, tooltip, range }: { title: string; tooltip: string; range: ReturnType<typeof getContributionRange> }) {
  return (
    <div className="settlement-method-card tooltip-target" data-tooltip={tooltip} tabIndex={0}>
      <span>{title}</span>
      <dl>
        <div>
          <dt>낙관</dt>
          <dd>{formatSettlementCurrency(range.optimistic)}</dd>
        </div>
        <div>
          <dt>기준</dt>
          <dd>{formatSettlementCurrency(range.baseline)}</dd>
        </div>
        <div>
          <dt>보수</dt>
          <dd>{formatSettlementCurrency(range.conservative)}</dd>
        </div>
      </dl>
    </div>
  )
}

function formatSettlementCurrency(value: number) {
  if (value < 0) return `${Math.abs(value).toFixed(1)}억 환급`
  if (value > 0) return `${value.toFixed(1)}억 부담`
  return '정산 없음'
}

function createFinanceSource(sourceType: SourceType, label: string, confidence: number, detail?: string): FinanceSource {
  return {
    sourceType,
    label,
    confidence,
    detail,
  }
}

function FinanceLine({ label, value, valueText, suffix = '억', source, strong = false, settlement }: FinanceLineProps) {
  const displayValue =
    valueText ??
    (value ?? 0).toLocaleString('ko-KR', {
      maximumFractionDigits: suffix === '억' ? 0 : 0,
    }) + suffix
  const settlementClass = settlement === undefined ? '' : settlement < 0 ? ' refund' : ' burden'
  const tooltip = source
    ? `${label}: ${source.label}. ${source.detail ?? '세부 산식 미연결'}. 유형 ${formatSourceType(source.sourceType)} · 신뢰도 ${source.confidence}%`
    : `${label}: 산정 방식/출처 정보 미연결`

  return (
    <div className={`finance-line tooltip-target ${strong ? 'strong' : ''}${settlementClass}`} data-tooltip={tooltip} tabIndex={0}>
      <p>
        <span>{label}</span>
        {source && (
          <small>
            <i className={`source-chip ${source.sourceType}`}>{formatSourceType(source.sourceType)}</i>
            {source.label}
          </small>
        )}
      </p>
      <b>{displayValue}</b>
    </div>
  )
}

type SignalRowProps = {
  signal: DataSignal
}

function SignalRow({ signal }: SignalRowProps) {
  const tooltip = `${signal.label}: ${signal.method ?? signal.value}. 출처: ${signal.sourceName}. 유형 ${formatSourceType(signal.sourceType)} · 신뢰도 ${signal.confidence}%`

  return (
    <div className="signal-row tooltip-target" data-tooltip={tooltip} tabIndex={0}>
      <div>
        <b>{signal.label}</b>
        <p>{signal.value}</p>
        <small>{signal.sourceName}</small>
      </div>
      <span className={`source-chip ${signal.sourceType}`}>{formatSourceType(signal.sourceType)}</span>
      <meter min="0" max="100" value={signal.confidence} aria-label={`${signal.label} 신뢰도 ${signal.confidence}%`} />
    </div>
  )
}

function formatSourceType(sourceType: SourceType) {
  const labels: Record<SourceType, string> = {
    official_api: 'API',
    public_document: '문서',
    manual_override: '추가',
    inferred: '추정',
  }

  return labels[sourceType]
}

export default App
