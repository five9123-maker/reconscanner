import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BarChart3,
  Building2,
  Calculator,
  CircleDollarSign,
  Database,
  FileText,
  Clock3,
  Home,
  MapPin,
  RefreshCw,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Star,
  TrendingUp,
} from 'lucide-react'
import { Control } from './components/Control'
import { FactRow } from './components/FactRow'
import { QuickAccessGroup } from './components/QuickAccessGroup'
import { useJsonResource } from './hooks/useJsonResource'
import { useLocalStorageState } from './hooks/useLocalStorageState'
import {
  createScenarioDelta,
  createScoreTooltip,
  getStageTooltip,
  getUnitTypeCountLabel,
  getUnitTypeCountTooltip,
} from './lib/analysisDisplay'
import { baseScenario, calculateDiagnosis, formatCurrency, getContributionRange } from './lib/diagnosis'
import { formatSettlementCurrency, formatSettlementDelta, formatSignedPoint, formatSourceType } from './lib/displayFormat'
import { findRenewalMatch, findTransactionDiagnostic, formatMatchStrategy, mergeLiveComplexes } from './lib/livePayloadMerge'
import {
  describeCurrentPricePerPyeong,
  describeExpectedSalePricePerPyeong,
  estimateCurrentPricePerPyeong,
  estimateExpectedSalePricePerPyeong,
} from './lib/marketPrice'
import { validateApiEnrichmentPlan, validateLiveEtlStatus, validateSearchIndexPayload } from './lib/payloadValidation'
import { getScenarioStressLabel, isBaseScenario, sanitizeScenario } from './lib/scenario'
import { getSearchItemLabel, searchIndexByComplexName } from './lib/searchIndex'
import { createSearchOnlyAnalysisCandidates } from './lib/searchOnlyCandidateFactory'
import {
  createComplexRepository,
  getDefaultComplexId,
  listComplexes,
} from './repositories/complexRepository'
import type { Complex, RankedComplex, Scenario, SourceType } from './types'
import type { DataValidationIssue } from './etl/validate'
import type { ApiEnrichmentPlan } from './types/apiEnrichment'
import type { LiveEtlStatus } from './types/liveEtl'
import type { SearchIndexItem, SearchIndexPayload } from './types/searchIndex'
import './App.css'

type AppView = 'national' | 'scanner' | 'renewalProducts'

function App() {
  const [activeView, setActiveView] = useState<AppView>('national')
  const [selectedId, setSelectedId] = useState(getDefaultComplexId())
  const [query, setQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [scenario, setScenario] = useState<Scenario>(baseScenario)
  const [liveEtlRefreshKey, setLiveEtlRefreshKey] = useState(0)
  const [pendingSearchOnlyItem, setPendingSearchOnlyItem] = useState<SearchIndexItem | null>(null)
  const [areaRangeOverrides, setAreaRangeOverrides] = useState<Record<string, string>>({})
  const [favoriteIds, setFavoriteIds] = useLocalStorageState<string[]>('reconscanner.favoriteIds', [])
  const [recentIds, setRecentIds] = useLocalStorageState<string[]>('reconscanner.recentIds', [])
  const [requestedSearchOnlyIds, setRequestedSearchOnlyIds] = useLocalStorageState<string[]>('reconscanner.requestedSearchOnlyIds', [])
  const liveEtlStatus = useJsonResource<LiveEtlStatus | null>('/data/live-etl-result.json', validateLiveEtlStatus, null, liveEtlRefreshKey)
  const searchIndexPayload = useJsonResource<SearchIndexPayload | null>('/data/search-index.json', validateSearchIndexPayload, null)
  const apiEnrichmentPlan = useJsonResource<ApiEnrichmentPlan | null>('/data/api-enrichment-plan.json', validateApiEnrichmentPlan, null)
  const searchIndex = useMemo(() => searchIndexPayload?.items ?? [], [searchIndexPayload])
  const searchOnlyAnalysisCandidates = useMemo(() => createSearchOnlyAnalysisCandidates(searchIndex), [searchIndex])

  const repository = useMemo(
    () => createComplexRepository(mergeLiveComplexes([...listComplexes(), ...searchOnlyAnalysisCandidates], liveEtlStatus?.complexes ?? []), []),
    [liveEtlStatus, searchOnlyAnalysisCandidates],
  )
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
  const baselineDiagnosis = useMemo(() => calculateDiagnosis(selected, baseScenario), [selected])
  const scenarioDelta = useMemo(() => createScenarioDelta(diagnosis, baselineDiagnosis), [diagnosis, baselineDiagnosis])
  const rankedComplexes = useMemo<RankedComplex[]>(
    () => repository.getRankedComplexes(scenario),
    [repository, scenario],
  )
  const eligibleAnalysisIds = useMemo(() => new Set(rankedComplexes.map(({ complex }) => complex.id)), [rankedComplexes])
  const searchSuggestions = useMemo(
    () => searchIndexByComplexName(searchIndex, query, rankedComplexes, eligibleAnalysisIds).slice(0, 8),
    [eligibleAnalysisIds, query, rankedComplexes, searchIndex],
  )
  const showSearchDropdown = isSearchFocused && query.trim().length > 0
  const contributionRange = getContributionRange(diagnosis.contribution)
  const accountingContributionRange = getContributionRange(diagnosis.finance.accountingSameSizeSettlement)
  const scenarioLabel = getScenarioStressLabel(scenario)
  const dataProfile = selected.dataProfile
  const renewalMatch = useMemo(() => findRenewalMatch(liveEtlStatus?.renewalMatches ?? [], selected), [liveEtlStatus, selected])
  const officialStatus = useMemo(() => createOfficialStatus(renewalMatch), [renewalMatch])
  const selectedValidationIssues = useMemo(
    () => getIssuesForComplex(repository.getValidationIssues(), selected),
    [repository, selected],
  )
  const selectedQualityIssues = useMemo(
    () => createQualityIssues(selected, transactionDiagnostic, renewalMatch, selectedValidationIssues),
    [selected, transactionDiagnostic, renewalMatch, selectedValidationIssues],
  )
  const selectedQualityGrade = useMemo(
    () => createQualityGrade(selected, renewalMatch, selectedQualityIssues),
    [selected, renewalMatch, selectedQualityIssues],
  )
  const evidencePack = useMemo(
    () => createEvidencePack(selected, diagnosis, scenario, transactionDiagnostic, renewalMatch, selectedQualityGrade),
    [selected, diagnosis, scenario, transactionDiagnostic, renewalMatch, selectedQualityGrade],
  )
  const dataQuality = useMemo(() => repository.getDataQualitySummary(), [repository])
  const validationIssues = useMemo(() => repository.getValidationIssues().slice(0, 3), [repository])
  const favoriteComplexes = useMemo(() => favoriteIds.map((id) => repository.getComplexById(id)).filter(Boolean) as Complex[], [favoriteIds, repository])
  const requestedSearchOnlyItems = useMemo(
    () => requestedSearchOnlyIds.map((id) => searchIndex.find((item) => item.id === id)).filter(Boolean) as SearchIndexItem[],
    [requestedSearchOnlyIds, searchIndex],
  )
  const recentComplexes = useMemo(
    () => recentIds.filter((id) => id !== selected.id).map((id) => repository.getComplexById(id)).filter(Boolean) as Complex[],
    [recentIds, repository, selected.id],
  )
  const isFavorite = favoriteIds.includes(selected.id)
  const nationalDashboard = useMemo(() => createNationalDashboard(rankedComplexes), [rankedComplexes])

  const selectAnalysisComplex = (id: string) => {
    setSelectedId(id)
    setPendingSearchOnlyItem(null)
  }

  const toggleFavorite = () => {
    setFavoriteIds((current) => (current.includes(selected.id) ? current.filter((id) => id !== selected.id) : [selected.id, ...current].slice(0, 12)))
  }

  const requestSearchOnlyAnalysis = (item: SearchIndexItem) => {
    setRequestedSearchOnlyIds((current) => (current.includes(item.id) ? current : [item.id, ...current].slice(0, 30)))
  }

  useEffect(() => {
    setRecentIds((current) => [selected.id, ...current.filter((id) => id !== selected.id)].slice(0, 8))
  }, [selected.id, setRecentIds])

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
        <nav className="topbar-tabs" aria-label="화면 이동">
          <button
            className={activeView === 'national' ? 'active' : ''}
            type="button"
            onClick={() => setActiveView('national')}
          >
            <BarChart3 size={16} />
            <span>전국 대시보드</span>
          </button>
          <button
            className={activeView === 'scanner' ? 'active' : ''}
            type="button"
            onClick={() => setActiveView('scanner')}
          >
            <Home size={16} />
            <span>단지 스캐너</span>
          </button>
          <button
            className={activeView === 'renewalProducts' ? 'active' : ''}
            type="button"
            onClick={() => setActiveView('renewalProducts')}
          >
            <Building2 size={16} />
            <span>리뉴얼(수선) 상품</span>
          </button>
        </nav>
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
        </div>
      </header>

      {activeView === 'national' ? (
        <NationalDashboard stats={nationalDashboard} />
      ) : activeView === 'renewalProducts' ? (
        <RenewalProducts />
      ) : (
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
                placeholder="단지명 검색 · 철거/착공 이후 또는 준공 15년 이하는 제외"
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
                          selectAnalysisComplex(item.id)
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
                      <b className={item.source === 'analysis_candidate' ? 'candidate' : undefined}>{getSearchItemLabel(item)}</b>
                    </button>
                  ))
                ) : (
                  <p>분석 대상 없음 · 철거/착공 이후 또는 준공 15년 이하 단지는 제외됩니다.</p>
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
                <button
                  type="button"
                  disabled={requestedSearchOnlyIds.includes(pendingSearchOnlyItem.id)}
                  onClick={() => requestSearchOnlyAnalysis(pendingSearchOnlyItem)}
                >
                  {requestedSearchOnlyIds.includes(pendingSearchOnlyItem.id) ? '분석 요청 저장됨' : '분석 요청 목록에 추가'}
                </button>
              </div>
            )}
          </div>

          {(favoriteComplexes.length > 0 || recentComplexes.length > 0) && (
            <div className="quick-access-panel">
              {favoriteComplexes.length > 0 && (
                <QuickAccessGroup
                  icon={<Star size={14} />}
                  title="관심 단지"
                  complexes={favoriteComplexes.slice(0, 5)}
                  selectedId={selected.id}
                  onSelect={selectAnalysisComplex}
                />
              )}
              {recentComplexes.length > 0 && (
                <QuickAccessGroup
                  icon={<Clock3 size={14} />}
                  title="최근 본 단지"
                  complexes={recentComplexes.slice(0, 5)}
                  selectedId={selected.id}
                  onSelect={selectAnalysisComplex}
                />
              )}
            </div>
          )}

        </aside>

        <section className="detail-panel">
          <div className="summary-band">
            <div className="summary-copy">
              <span className="eyebrow">
                <MapPin size={15} />
                {selected.address}
              </span>
              <div className="title-row">
                <h1>{selected.name}</h1>
                <button
                  className={`favorite-button ${isFavorite ? 'active' : ''}`}
                  type="button"
                  aria-label={isFavorite ? '관심 단지 해제' : '관심 단지 저장'}
                  onClick={toggleFavorite}
                >
                  <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
              </div>
              <p>{selected.note}</p>
            </div>
            <div className="score-gauge" style={{ '--score': `${diagnosis.businessScore * 3.6}deg` } as React.CSSProperties}>
              <div>
                <span>{diagnosis.businessScore.toFixed(0)}</span>
                <small>순수 사업성</small>
                <em>{officialStatus.shortLabel}</em>
              </div>
            </div>
            <div
              className="summary-ratio-card tooltip-target"
              data-tooltip="정비사업식: (총수익-공사비-사업비)/종전자산. 시장가치식: 현재 구축 시세/동일평형 신축 원가. 두 값을 함께 봐야 실제 분담금과 시장 체감 차이를 구분할 수 있음"
              tabIndex={0}
            >
              <TrendingUp size={19} />
              <span>비례율 비교</span>
              <strong>{diagnosis.finance.accountingProRata.toFixed(0)}% / {diagnosis.finance.marketProRata.toFixed(0)}%</strong>
              <small>정비사업식 추정 / 시장가치식</small>
            </div>
          </div>

          <section className="insight-grid">
            <div className="analysis-panel">
              <div className="section-heading">
                <div>
                  <span>핵심 판단</span>
                  <h2>순수 사업성 판단</h2>
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
                  <FactRow
                    label="평당 실거래가"
                    value={`${estimateCurrentPricePerPyeong(selected).toLocaleString()}만원/평`}
                    tooltip={describeCurrentPricePerPyeong(selected)}
                  />
                  <FactRow
                    label="평당 예상 분양가"
                    value={`${estimateExpectedSalePricePerPyeong(selected, scenario).toLocaleString()}만원/평`}
                    tooltip={describeExpectedSalePricePerPyeong(selected, scenario)}
                  />
                  <FactRow
                    label="평형 종류"
                    value={getUnitTypeCountLabel(selected, transactionDiagnostic)}
                    tooltip={getUnitTypeCountTooltip(selected, transactionDiagnostic)}
                  />
                  <FactRow
                    label="사업 단계"
                    value={selected.stage}
                    tooltip={getStageTooltip(selected)}
                  />
                </div>
              </div>
              <div className="score-bars">
                {[
                  { label: '사업성', tooltipLabel: '사업성', value: diagnosis.businessScore },
                  { label: '노후도', tooltipLabel: '노후도', value: diagnosis.agingScore },
                  { label: '규제', tooltipLabel: '규제', value: diagnosis.regulationScore },
                  { label: '추진력', tooltipLabel: '추진력', value: diagnosis.momentumScore },
                  { label: '시장 상황', tooltipLabel: '시장', value: diagnosis.timingScore },
                ].map(({ label, tooltipLabel, value }) => (
                  <div className="score-bar tooltip-target" key={label} data-tooltip={createScoreTooltip(tooltipLabel, selected, diagnosis, scenario)} tabIndex={0}>
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
                <span>Evidence Pack</span>
                <h2>수치별 출처와 산정 방식</h2>
                <p>툴팁에 숨어 있던 근거를 항목별로 분리해, 공식값과 추정값을 따로 확인할 수 있게 정리했습니다.</p>
              </div>
              <FileText size={18} />
            </div>
            <div className="evidence-pack-grid">
              {evidencePack.map((item) => (
                <EvidencePackCard key={item.label} item={item} />
              ))}
            </div>
            <div className="data-profile-grid compact">
              <div className="source-column gap-column">
                <span>추가 확보 필요</span>
                {(dataProfile?.gaps ?? []).map((gap) => (
                  <p key={gap}>{gap}</p>
                ))}
              </div>
              <div className="source-column quality-column">
                <span>데이터 보완 필요</span>
                {selectedQualityIssues.length > 0 ? (
                  selectedQualityIssues.map((issue) => <QualityIssueRow key={`${issue.type}-${issue.message}`} issue={issue} />)
                ) : (
                  <div className="empty-source">현재 단지의 주요 보완 이슈 없음</div>
                )}
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
                  <span>공식 추진 근거</span>
                  <h2>{officialStatus.label}</h2>
                  <p>정비사업 공식 매칭은 추진 확실성 근거로만 사용하고, 순수 사업성 점수와 분리해 해석합니다.</p>
                </div>
                <FileText size={18} />
              </div>
              <div className={`renewal-match-card ${officialStatus.tone}`}>
                <span>{renewalMatch.matched ? '매칭 원문' : '가장 가까운 후보'}</span>
                <strong>{renewalMatch.sourceRecordName ?? '후보 없음'}</strong>
                <small>{renewalMatch.reason} · 매칭 점수 {renewalMatch.score}점</small>
                <p>{officialStatus.detail}</p>
              </div>
            </section>
          )}

        </section>

        <aside className="right-panel">
          <div className="section-title">
            <SlidersHorizontal size={18} />
            <span>시나리오 조정 · {scenarioLabel}</span>
          </div>
          <div className="scenario-delta-card">
            <span>기준 대비 변화</span>
            <div className="scenario-delta-grid">
              <div className="tooltip-target" data-tooltip="기준 시나리오와 현재 시나리오의 정비사업식 동일평형 정산금 차이. 양수는 부담 증가, 음수는 부담 완화 또는 환급 증가" tabIndex={0}>
                <small>정비사업식</small>
                <b className={scenarioDelta.accountingSettlementDelta > 0 ? 'burden' : scenarioDelta.accountingSettlementDelta < 0 ? 'refund' : ''}>
                  {formatSettlementDelta(scenarioDelta.accountingSettlementDelta)}
                </b>
              </div>
              <div className="tooltip-target" data-tooltip="기준 시나리오와 현재 시나리오의 시장가치식 동일평형 정산금 차이. 시장 시세와 신축 원가 기반 추정값" tabIndex={0}>
                <small>시장가치식</small>
                <b className={scenarioDelta.marketSettlementDelta > 0 ? 'burden' : scenarioDelta.marketSettlementDelta < 0 ? 'refund' : ''}>
                  {formatSettlementDelta(scenarioDelta.marketSettlementDelta)}
                </b>
              </div>
              <div className="tooltip-target" data-tooltip="기준 시나리오 대비 예상 비례율 변화. 일반분양가·공사비·금리·공공기여 조정이 반영됨" tabIndex={0}>
                <small>비례율</small>
                <b>{formatSignedPoint(scenarioDelta.proRataDelta, '%p')}</b>
              </div>
              <div className="tooltip-target" data-tooltip="기준 시나리오 대비 현재 추진 성공 가능성 점수 변화. 사업성·노후도·규제·추진력·시장 환경 가중합" tabIndex={0}>
                <small>종합점수</small>
                <b>{formatSignedPoint(scenarioDelta.scoreDelta, '점')}</b>
              </div>
            </div>
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
              <span
                className="tooltip-target"
                data-tooltip="분석은 가능하지만 아직 K-apt/PNU/실거래가 실매칭 전인 후보 단지 수. UI에서는 후보 추정으로 표시"
                tabIndex={0}
              >
                추정 후보
              </span>
              <b>{dataQuality.inferredCandidateCount}개</b>
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
            {requestedSearchOnlyItems.length > 0 && (
              <div className="request-queue-card">
                <span>분석 요청 목록</span>
                <b>{requestedSearchOnlyItems.length}개 단지 대기</b>
                <ol>
                  {requestedSearchOnlyItems.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <strong>{item.name}</strong>
                      <small>
                        {item.district || '자치구 미상'} · 법정동코드 {item.legalDongCode || '미상'}
                      </small>
                    </li>
                  ))}
                </ol>
                <button type="button" onClick={() => setRequestedSearchOnlyIds([])}>
                  요청 목록 비우기
                </button>
              </div>
            )}
            {apiEnrichmentPlan?.batches[0] && (
              <div className="enrichment-plan-card">
                <span
                  className="tooltip-target"
                  data-tooltip="추정 후보 중 점수 영향도와 데이터 신뢰도 개선 필요성이 큰 단지를 우선 API 실매칭 대상으로 묶은 목록"
                  tabIndex={0}
                >
                  다음 API 매칭 batch
                </span>
                <b>
                  {apiEnrichmentPlan.batches[0].targets.length}개 단지 · 후보 {apiEnrichmentPlan.totalCandidates}개 중 우선순위
                </b>
                <ol>
                  {apiEnrichmentPlan.batches[0].targets.slice(0, 5).map((target) => (
                    <li key={target.id}>
                      <strong>{target.name}</strong>
                      <small>
                        {target.district} · 우선순위 {target.priorityScore} · 신뢰도 {target.dataReliability}%
                      </small>
                    </li>
                  ))}
                </ol>
                <code>{apiEnrichmentPlan.batches[0].command}</code>
              </div>
            )}
            <p>샘플 repository 기반. 다음 단계: K-apt, 실거래가, 정비사업 ETL 결과로 교체</p>
          </div>
        </aside>
      </section>
      )}
    </main>
  )
}

type RegionalDashboardStat = {
  region: string
  complexes: number
  agedUnits: number
  viableUnits: number
  impossibleUnits: number
  viableRate: number
  averageBusinessScore: number
  averageProRata: number
  averageCurrentPrice: number
  averageConstructionCost: number
  riskLabel: string
}

type RegionalBenchmark = {
  region: string
  viableRate: number
  agedUnits: number
  currentFar: number
  afterFar: number
  landShare: number
  constructionCost: number
  salePrice: number
  rentalRate: number
}

type NationalDashboardStats = {
  agedUnits: number
  maxViableRate: number
  maxViableUnits: number
  impossibleRate: number
  impossibleUnits: number
  sampleUnits: number
  sampleViableUnits: number
  sampleViableRate: number
  regionalStats: RegionalDashboardStat[]
  benchmarks: RegionalBenchmark[]
}

type DashboardCalculatorInput = Pick<RegionalBenchmark, 'currentFar' | 'afterFar' | 'landShare' | 'constructionCost' | 'salePrice' | 'rentalRate'>

type RenewalProduct = {
  company: string
  product: string
  track: string
  target: string
  scope: string
  cost: string
  timeline: string
  cases: string
  note: string
  tone: 'primary' | 'secondary' | 'limited'
}

const REGIONAL_RECONSTRUCTION_BENCHMARKS: RegionalBenchmark[] = [
  { region: '서울', viableRate: 30.1, agedUnits: 478_000, currentFar: 220, afterFar: 300, landShare: 12, constructionCost: 1000, salePrice: 7000, rentalRate: 50 },
  { region: '부산', viableRate: 24.4, agedUnits: 180_000, currentFar: 200, afterFar: 280, landShare: 13, constructionCost: 720, salePrice: 3200, rentalRate: 30 },
  { region: '울산', viableRate: 22.9, agedUnits: 45_000, currentFar: 190, afterFar: 280, landShare: 14, constructionCost: 700, salePrice: 2800, rentalRate: 30 },
  { region: '대구', viableRate: 20.2, agedUnits: 80_000, currentFar: 210, afterFar: 280, landShare: 13, constructionCost: 720, salePrice: 2700, rentalRate: 30 },
  { region: '광주', viableRate: 17.6, agedUnits: 50_000, currentFar: 200, afterFar: 280, landShare: 13, constructionCost: 700, salePrice: 2400, rentalRate: 30 },
  { region: '경기', viableRate: 16.7, agedUnits: 600_000, currentFar: 230, afterFar: 300, landShare: 11, constructionCost: 750, salePrice: 3500, rentalRate: 30 },
  { region: '경남', viableRate: 13.2, agedUnits: 90_000, currentFar: 200, afterFar: 280, landShare: 13, constructionCost: 680, salePrice: 2300, rentalRate: 30 },
  { region: '대전', viableRate: 10.6, agedUnits: 50_000, currentFar: 220, afterFar: 280, landShare: 12, constructionCost: 720, salePrice: 2400, rentalRate: 30 },
  { region: '인천', viableRate: 9.2, agedUnits: 130_000, currentFar: 220, afterFar: 280, landShare: 11, constructionCost: 730, salePrice: 2500, rentalRate: 30 },
  { region: '세종', viableRate: 9, agedUnits: 3_000, currentFar: 240, afterFar: 300, landShare: 10, constructionCost: 720, salePrice: 2400, rentalRate: 30 },
  { region: '충북', viableRate: 8.8, agedUnits: 40_000, currentFar: 200, afterFar: 280, landShare: 13, constructionCost: 670, salePrice: 1800, rentalRate: 30 },
  { region: '전북', viableRate: 8.1, agedUnits: 40_000, currentFar: 190, afterFar: 280, landShare: 14, constructionCost: 660, salePrice: 1700, rentalRate: 30 },
  { region: '강원', viableRate: 7, agedUnits: 40_000, currentFar: 200, afterFar: 280, landShare: 13, constructionCost: 660, salePrice: 1800, rentalRate: 30 },
  { region: '경북', viableRate: 6.9, agedUnits: 50_000, currentFar: 190, afterFar: 280, landShare: 14, constructionCost: 660, salePrice: 1700, rentalRate: 30 },
  { region: '전남', viableRate: 6.3, agedUnits: 30_000, currentFar: 190, afterFar: 280, landShare: 14, constructionCost: 660, salePrice: 1700, rentalRate: 30 },
  { region: '충남', viableRate: 4.9, agedUnits: 50_000, currentFar: 200, afterFar: 280, landShare: 13, constructionCost: 660, salePrice: 1800, rentalRate: 30 },
  { region: '제주', viableRate: 4.3, agedUnits: 10_000, currentFar: 180, afterFar: 260, landShare: 14, constructionCost: 700, salePrice: 2000, rentalRate: 30 },
]

const RENEWAL_PRODUCTS: RenewalProduct[] = [
  {
    company: '현대건설',
    product: '더 뉴 하우스(THE NEW HOUSE)',
    track: '비증축·대수선형',
    target: '재건축 연한·용적률 제약이 큰 1990년대 말~2000년대 준공 단지',
    scope: '외벽, 주동 입구, 조경, 커뮤니티, 선택형 세대 인테리어, 층간소음 저감, 창호, Hi-oT, 에너지 설비',
    cost: '가구당 수천만~1억 원 미만 제시',
    timeline: '이주 없이 약 2년 이내',
    cases: '삼성동 힐스테이트 2단지, 수원 신명동보아파트 전환 협의',
    note: '공동주택관리법 트랙이면 입주자대표회의 과반과 장기수선충당금 활용 가능성이 있으나, 용적률 변경 시 주택법 트랙으로 무거워질 수 있습니다.',
    tone: 'primary',
  },
  {
    company: '삼성물산',
    product: '넥스트 리뉴얼(Next Renewal)',
    track: '비증축·프리미엄 수선형',
    target: '2000년 이후 준공, 내진설계·3/4베이·연결형 지하주차장을 이미 갖춘 입지 프리미엄 단지',
    scope: '기존 지하·지상 구조체 유지, 마감·설비·스마트시스템 홈닉/넥스트홈·외관·커뮤니티 래미안급 교체',
    cost: '공식 비용 미공개, 유사 구조상 1억 원 안팎 추정',
    timeline: '공사기간 2년 이내 목표',
    cases: '반포푸르지오 우선협상대상자, 역삼금호어울림, 압구정대원칸타빌, 서초래미안 등 12개 파트너십 단지',
    note: '사업 완료 후 준공 연도 갱신을 자산가치 회복 포인트로 제시하지만, 법적 트랙별 등기·사용승인 효과 확인이 필요합니다.',
    tone: 'primary',
  },
  {
    company: 'GS건설',
    product: '하임랩(HEIMLAB)',
    track: '세대 단위 진단·인테리어',
    target: '단지 전체 사업보다 개별 세대의 누수·단열·공기질·욕실 개선 수요',
    scope: '주거환경 진단, 욕실·세대 인테리어, 단열·누수·공기질 개선, 사후관리',
    cost: '세대별 진단·시공 범위에 따라 산정',
    timeline: '개별 세대 시공 중심',
    cases: '2025년 서울 25개구 확대',
    note: '단지 단위 저비용 리뉴얼이라기보다 세대 단위 개선 솔루션에 가깝습니다.',
    tone: 'secondary',
  },
  {
    company: 'DL이앤씨',
    product: '디 셀렉션(D Selection)',
    track: '신축 입주 전 옵션형',
    target: '아크로·e편한세상 입주 예정자',
    scope: '빅데이터 기반 맞춤형 인테리어 패키지와 입주 전 옵션',
    cost: '상품 패키지별 산정',
    timeline: '신축 입주 전 선택',
    cases: '2025년 3월 공개',
    note: '노후단지 수선 상품보다는 준공 직전 인테리어 옵션에 가까워 비교군으로만 봐야 합니다.',
    tone: 'limited',
  },
  {
    company: '포스코이앤씨',
    product: '증축형 리뉴얼 기술·수주 중심',
    track: '수직·수평·별동 증축형',
    target: '일반분양 15% 확보 가능성이 있는 1990년대 단지와 1기 신도시 후보',
    scope: '수직증축 구조시스템, 전이층 합성보, 기존 리뉴얼 수주 역량',
    cost: '증축형 사업비 기준, 가구당 2억~5억 원대 사례와 비교 필요',
    timeline: '이주 포함 3~5년 이상',
    cases: '분당 느티마을3·4단지, 창원 성원토월 등',
    note: '2026년 4월 기준 대수선형 전용 신상품은 공식 공개가 확인되지 않았습니다.',
    tone: 'secondary',
  },
  {
    company: '대우건설',
    product: '정통 정비사업·써밋 브랜드 중심',
    track: '재건축·리뉴얼 일반 수주',
    target: '브랜드 정비사업 후보지',
    scope: '기존 정비사업 수주와 하이엔드 브랜드 적용',
    cost: '사업지별 산정',
    timeline: '정비사업 인허가 일정 종속',
    cases: '송파 거여5단지 등 정비사업 중심',
    note: '저비용 리뉴얼 전용 상품은 아직 뚜렷하게 공개되지 않았습니다.',
    tone: 'limited',
  },
]

function NationalDashboard({ stats }: { stats: NationalDashboardStats }) {
  const [calculatorInput, setCalculatorInput] = useState<DashboardCalculatorInput>(stats.benchmarks[0])
  const simulation = useMemo(() => calculateDashboardSimulation(calculatorInput), [calculatorInput])

  const updateCalculatorInput = (key: keyof DashboardCalculatorInput, value: number) => {
    setCalculatorInput((current) => ({ ...current, [key]: value }))
  }

  return (
    <section className="national-dashboard">
      <section className="dashboard-panel funnel-panel">
        <div className="section-heading">
          <div>
            <span>분석 프레임</span>
            <h2>전국 노후 아파트 중 재건축 사업성이 있는 곳은 얼마나 될까?</h2>
          </div>
          <FileText size={18} />
        </div>
        <div className="funnel-flow">
          <FunnelStep label="전체 주택" value="1,987만호" caption="2024 인구주택총조사" />
          <FunnelStep label="아파트" value="1,297만호" caption="전체 주택의 65%" />
          <FunnelStep label="30년 이상 아파트" value="251만호" caption="노후 아파트 모집단" />
          <FunnelStep label="사업성 있음" value="42.7만호" caption="최대 17%" tone="good" />
          <FunnelStep label="사업성 부족" value="208.3만호" caption="83%" tone="risk" />
        </div>
      </section>

      <section className="national-grid">
        <div className="dashboard-panel formula-panel">
          <div className="section-heading">
            <div>
              <span>판단 기준</span>
              <h2>비례율 100%를 넘는 단지만 사업성 있음으로 분류</h2>
              <p>총 분양수입, 총사업비, 종전자산 평가액의 균형으로 비례율과 조합원 추가분담금 압력을 판단합니다.</p>
            </div>
            <Calculator size={18} />
          </div>
          <div
            className="formula-card tooltip-target"
            data-tooltip="비례율은 총 분양수입에서 총 사업비를 차감한 뒤 종전자산 대비 사업수지를 판단하는 핵심 지표입니다. 100% 미만이면 조합원 추가분담금 압력이 커집니다."
            tabIndex={0}
          >
            <span>비례율 산식</span>
            <strong>(총 분양수입 - 총 사업비) / 종전자산 평가액 × 100</strong>
            <p>정식 표현으로는 “총 분양수입 - 총 사업비”를 종전자산 평가액으로 나눈 값입니다.</p>
          </div>
          <div className="threshold-grid">
            <ConstraintCard
              label="일반분양 여력"
              value="낮은 현황 용적률·높은 대지지분"
              detail="현황 용적률이 낮고 평균 대지지분이 클수록 일반분양 가능 면적이 커집니다."
              tooltip="현황 용적률은 대지면적 대비 기존 연면적 비율입니다. 허용 용적률과의 차이가 일반분양 여력을 좌우합니다."
            />
            <ConstraintCard
              label="분양가 회수력"
              value="인근 신축 분양가"
              detail="주변 신축 평당가와 일반분양가 상단이 높을수록 사업비 회수력이 커집니다."
              tooltip="일반분양가는 외부 분양 물량의 평당 매출 단가이며, 비례율과 손익분기 분양가에 직접 반영됩니다."
            />
            <ConstraintCard
              label="공사비 단가"
              value="공사비 + 부대비"
              detail="평당 공사비가 상승하면 총사업비와 손익분기 분양가가 동시에 올라갑니다."
              tooltip="공사비는 건물을 짓는 비용입니다. 여기에 설계비, 금융비, 운영비 같은 부대비가 더 붙습니다."
            />
          </div>
        </div>

        <div className="dashboard-panel constraint-panel">
          <div className="section-heading">
            <div>
              <span>해석 주의</span>
              <h2>17%는 실제 완주율이 아니라 이론적 상한</h2>
            </div>
            <ShieldAlert size={18} />
          </div>
          <div className="constraint-stack">
            <ConstraintCard
              label="공사비 민감도"
              value="5% 상승에도 하향 압력"
              detail="비례율 100%를 간신히 넘는 단지는 공사비가 조금만 올라가도 바로 취약해질 수 있습니다."
              tooltip="공사비 민감도는 평당 공사비 변화가 비례율과 동일평형 정산금에 미치는 영향도입니다."
            />
            <ConstraintCard
              label="고밀 단지 한계"
              value="용적률 200%+"
              detail="현황 용적률이 높은 고밀 단지는 일반분양 여력으로 총사업비를 회수하기 어렵습니다."
              tooltip="용적률 200% 이상은 땅에 비해 이미 건물이 많이 올라간 상태라는 뜻입니다."
            />
            <ConstraintCard
              label="남은 83%"
              value="재건축·리뉴얼 사이 정책 공백"
              detail="재건축 사업성이 낮은 단지는 비증축 리뉴얼, 그린리뉴얼, 장기수선 전략을 별도로 검토해야 합니다."
              tooltip="벽식 구조는 벽이 건물을 받치는 방식입니다. 내부 구조를 크게 바꾸거나 고치기 어려운 경우가 많습니다."
            />
          </div>
        </div>
      </section>

      <section className="national-grid wide-left">
        <div className="dashboard-panel regional-panel">
          <div className="section-heading">
            <div>
              <span>지역별 비교</span>
              <h2>17개 시도 재건축 가능 비율</h2>
              <p>방송 인포그래픽의 지역별 비율을 기준으로 보여줍니다. 현재 앱의 단지 표본과는 별도 지표입니다.</p>
            </div>
            <MapPin size={18} />
          </div>
          <div className="region-list">
            {stats.benchmarks.map((region) => (
              <div className="region-row benchmark" key={region.region}>
                <div>
                  <strong>{region.region}</strong>
                  <span>
                    30년+ {formatHouseholds(region.agedUnits)}호 · 공사비 {region.constructionCost.toLocaleString()}만원/평
                  </span>
                </div>
                <div className="region-bar" aria-label={`${region.region} 가능률 ${region.viableRate}%`}>
                  <i style={{ width: `${Math.min(region.viableRate / 32 * 100, 100)}%` }} />
                </div>
                <b>{region.viableRate.toFixed(1)}%</b>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-panel calculator-simulator-panel">
          <div className="section-heading">
            <div>
              <span>시뮬레이션</span>
              <h2>지역 프리셋으로 비례율 감각 보기</h2>
              <p>정밀 감정평가가 아니라 주요 변수 변화가 비례율과 추가분담금 압력에 미치는 방향성을 보는 민감도 모델입니다.</p>
            </div>
            <Calculator size={18} />
          </div>
          <div className="preset-row">
            {stats.benchmarks.slice(0, 8).map((benchmark) => (
              <button key={benchmark.region} type="button" onClick={() => setCalculatorInput(benchmark)}>
                {benchmark.region}
              </button>
            ))}
          </div>
          <div className="calculator-layout">
            <div className="calculator-controls">
              <DashboardRange label="현황 용적률" value={calculatorInput.currentFar} min={100} max={300} suffix="%" tooltip="현황 용적률은 대지면적 대비 기존 연면적 비율입니다." onChange={(value) => updateCalculatorInput('currentFar', value)} />
              <DashboardRange label="재건축 후 용적률" value={calculatorInput.afterFar} min={200} max={500} suffix="%" tooltip="재건축 후 적용된다고 가정한 허용 용적률입니다." onChange={(value) => updateCalculatorInput('afterFar', value)} />
              <DashboardRange label="평균 대지지분" value={calculatorInput.landShare} min={8} max={25} suffix="평" tooltip="대지면적을 세대수로 나눈 평균 토지지분입니다. 일반분양 여력과 종전자산 추정에 반영됩니다." onChange={(value) => updateCalculatorInput('landShare', value)} />
              <DashboardRange label="평당 공사비" value={calculatorInput.constructionCost} min={600} max={1200} step={10} suffix="만원" tooltip="평당 공사비 가정입니다. 실제 사업비에는 설계비, 금융비, 기반시설비, 세금 등이 추가됩니다." onChange={(value) => updateCalculatorInput('constructionCost', value)} />
              <DashboardRange label="일반분양가" value={calculatorInput.salePrice} min={1500} max={10000} step={100} suffix="만원/평" tooltip="일반분양 물량의 평당 매출 단가입니다. 높을수록 총수익과 비례율이 개선됩니다." onChange={(value) => updateCalculatorInput('salePrice', value)} />
              <DashboardRange label="임대·공공기여 비율" value={calculatorInput.rentalRate} min={0} max={50} suffix="%" tooltip="임대주택, 기부채납, 기반시설 등 공공기여로 차감되는 비율입니다. 높을수록 일반분양 가능 면적이 감소합니다." onChange={(value) => updateCalculatorInput('rentalRate', value)} />
            </div>
            <div className={`calculator-result-card ${simulation.proRata >= 100 ? 'good' : 'risk'}`}>
              <span>{simulation.proRata >= 100 ? '사업성 있음' : '사업성 부족'}</span>
              <strong>{simulation.proRata.toFixed(0)}%</strong>
              <p className="tooltip-target" data-tooltip="민감도 모델의 추정값입니다. 100% 이상이면 동일 조건에서 조합원 추가분담금 압력이 낮아집니다." tabIndex={0}>민감도 추정 비례율</p>
              <dl>
                <div>
                  <dt className="tooltip-target" data-tooltip="일반분양 가능 면적이 총 사업비 회수에 기여하는 정도를 단순화한 지표입니다." tabIndex={0}>일반분양 수익률</dt>
                  <dd>{simulation.generalSalePower.toFixed(1)}%</dd>
                </div>
                <div>
                  <dt className="tooltip-target" data-tooltip="비례율 100%에 근접하기 위해 필요한 일반분양 평당가 기준입니다." tabIndex={0}>임계 분양가</dt>
                  <dd>{simulation.thresholdSalePrice.toLocaleString()}만원/평</dd>
                </div>
                <div>
                  <dt className="tooltip-target" data-tooltip="비례율 100% 미만 구간에서 조합원 추가분담금 부담을 단순 환산한 값입니다." tabIndex={0}>추가분담금 압력</dt>
                  <dd>{simulation.contributionPressure.toFixed(1)}억</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="dashboard-panel sample-panel">
          <div className="section-heading">
            <div>
              <span>현재 앱 표본</span>
              <h2>현재 연결된 단지 데이터</h2>
              <p>전국 모집단과는 별도로 현재 앱에 연결된 분석 표본의 커버리지와 가능률을 표시합니다.</p>
            </div>
            <Database size={18} />
          </div>
          <div className="sample-summary-grid">
            <NationalKpiCard label="분석 표본" value={`${formatHouseholds(stats.sampleUnits)}호`} caption={`${stats.regionalStats.length}개 지역`} />
            <NationalKpiCard label="표본 내 가능률" value={`${stats.sampleViableRate.toFixed(1)}%`} caption={`${formatHouseholds(stats.sampleViableUnits)}호 후보`} tone="good" />
          </div>
          <div className="sample-region-list">
            {stats.regionalStats.slice(0, 5).map((region) => (
              <div key={region.region}>
                <span>{region.region}</span>
                <b>{region.viableRate.toFixed(1)}%</b>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="dashboard-panel next-data-panel">
        <div className="section-heading">
          <div>
            <span>데이터 확보 계획</span>
            <h2>전국 단위 데이터 제품으로 확장하려면</h2>
          </div>
          <Database size={18} />
        </div>
        <div className="data-roadmap-grid">
          <ConstraintCard label="1. 노후 아파트 모집단" value="K-apt + 건축물대장" detail="단지명, 주소, 세대수, 사용승인일을 연결해 지역별 30년 이상 공동주택 모수를 산정합니다." tooltip="K-apt는 공동주택 관리 정보를 모아둔 공공 데이터입니다. 건축물대장은 건물의 공식 기록입니다." />
          <ConstraintCard label="2. 사업성 변수" value="용적률·대지지분·신축가" detail="단지별 일반분양 여력, 토지 조건, 인근 신축 가격을 연결합니다." tooltip="이 변수들이 있어야 총수익, 총사업비, 종전자산 대비 비례율을 계산할 수 있습니다." />
          <ConstraintCard label="3. 가능/불가 판정" value="비례율 100% 기준" detail="비례율과 동일평형 정산금을 기준으로 사업성 가능 후보를 분류합니다." tooltip="비례율 100%는 종전자산 대비 사업수지가 균형에 도달하는 기준선입니다." />
          <ConstraintCard label="4. 총량 검증" value="KOSIS·민간 통계 비교" detail="251만호 및 지역별 총량과 맞는지 확인하고 결측 지역을 보정합니다." tooltip="KOSIS는 국가 통계 사이트입니다. 전체 숫자가 맞는지 검산할 때 씁니다." />
        </div>
      </section>
    </section>
  )
}

function RenewalProducts() {
  const primaryProducts = RENEWAL_PRODUCTS.filter((product) => product.tone === 'primary')
  const supportingProducts = RENEWAL_PRODUCTS.filter((product) => product.tone !== 'primary')

  return (
    <section className="renewal-products">
      <section className="renewal-hero dashboard-panel">
        <div className="section-heading">
          <div>
            <span>리뉴얼(수선) 상품</span>
            <h2>재건축과 증축 리뉴얼 사이의 저비용 선택지</h2>
            <p>첨부 자료 기준으로 주요 건설사의 비증축·대수선형 상품과 인접 상품을 구분했습니다.</p>
          </div>
          <Building2 size={18} />
        </div>
        <div className="renewal-kpi-grid">
          <NationalKpiCard label="핵심 모델" value="비증축" caption="골조·층수 유지, 외관·공용부 개선" />
          <NationalKpiCard label="대표 비용" value="~1억" caption="현대건설 제시 기준, 단지별 변동" tone="good" />
          <NationalKpiCard label="대표 기간" value="2년" caption="이주 없는 대수선형 목표" />
          <NationalKpiCard label="검증 상태" value="초기" caption="1호 사업지 실증 전 단계" tone="risk" />
        </div>
      </section>

      <section className="renewal-grid primary-products">
        {primaryProducts.map((product) => (
          <RenewalProductCard key={product.product} product={product} />
        ))}
      </section>

      <section className="dashboard-panel">
        <div className="section-heading">
          <div>
            <span>인접 상품·수주 역량</span>
            <h2>단지 단위 저비용 수선과는 결이 다른 상품들</h2>
          </div>
          <FileText size={18} />
        </div>
        <div className="renewal-table">
          {supportingProducts.map((product) => (
            <RenewalProductRow key={product.product} product={product} />
          ))}
        </div>
      </section>

      <section className="national-grid renewal-decision-grid">
        <div className="dashboard-panel">
          <div className="section-heading">
            <div>
              <span>적합 단지</span>
              <h2>저비용 수선형이 맞는 조건</h2>
            </div>
            <TrendingUp size={18} />
          </div>
          <div className="constraint-stack">
            <ConstraintCard label="준공 시기" value="1990년대 말~2000년대" detail="재건축 연한은 애매하고, 증축 리뉴얼은 공사비 부담이 큰 구간입니다." />
            <ConstraintCard label="입지 조건" value="신축 가격 격차가 큰 곳" detail="외관·공용부 개선 비용을 시세 방어 또는 회복으로 설명할 수 있어야 합니다." />
            <ConstraintCard label="구조 조건" value="골조 유지가 합리적인 단지" detail="내진설계, 지하주차장, 커뮤니티 확장 여지가 이미 있는 단지가 유리합니다." />
          </div>
        </div>
        <div className="dashboard-panel">
          <div className="section-heading">
            <div>
              <span>주의점</span>
              <h2>분담금은 낮아도 일반분양 수익은 없습니다</h2>
            </div>
            <ShieldAlert size={18} />
          </div>
          <div className="constraint-stack">
            <ConstraintCard label="비용 구조" value="분담금=공사비" detail="증축이 없으면 일반분양 수익도 없어 입주민 자비 사업에 가깝습니다." />
            <ConstraintCard label="법적 효과" value="준공연도 갱신 확인 필요" detail="공동주택관리법 대수선 트랙과 주택법 리뉴얼 트랙의 자산가치 효과가 다를 수 있습니다." />
            <ConstraintCard label="시장 검증" value="실거래 사례 0건" detail="2026년 5월 기준 양대 신상품 모두 실제 입주 후 가격 변화 데이터는 아직 없습니다." />
          </div>
        </div>
      </section>
    </section>
  )
}

function RenewalProductCard({ product }: { product: RenewalProduct }) {
  return (
    <article className={`renewal-product-card ${product.tone}`}>
      <div className="product-card-head">
        <div>
          <span>{product.company}</span>
          <h3>{product.product}</h3>
        </div>
        <b>{product.track}</b>
      </div>
      <dl className="product-facts">
        <div>
          <dt>대상</dt>
          <dd>{product.target}</dd>
        </div>
        <div>
          <dt>범위</dt>
          <dd>{product.scope}</dd>
        </div>
        <div>
          <dt>비용</dt>
          <dd>{product.cost}</dd>
        </div>
        <div>
          <dt>기간</dt>
          <dd>{product.timeline}</dd>
        </div>
        <div>
          <dt>사례</dt>
          <dd>{product.cases}</dd>
        </div>
      </dl>
      <p>{product.note}</p>
    </article>
  )
}

function RenewalProductRow({ product }: { product: RenewalProduct }) {
  return (
    <article className={`renewal-product-row ${product.tone}`}>
      <div>
        <span>{product.company}</span>
        <strong>{product.product}</strong>
        <small>{product.track}</small>
      </div>
      <p>{product.target}</p>
      <p>{product.scope}</p>
      <b>{product.note}</b>
    </article>
  )
}

function FunnelStep({ label, value, caption, tone = 'neutral' }: { label: string; value: string; caption: string; tone?: 'neutral' | 'good' | 'risk' }) {
  return (
    <div className={`funnel-step ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </div>
  )
}

function NationalKpiCard({ label, value, caption, tone = 'neutral' }: { label: string; value: string; caption: string; tone?: 'neutral' | 'good' | 'risk' }) {
  return (
    <div className={`national-kpi-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </div>
  )
}

function ConstraintCard({ label, value, detail, tooltip }: { label: string; value: string; detail: string; tooltip?: string }) {
  return (
    <div className={`constraint-card ${tooltip ? 'tooltip-target' : ''}`} data-tooltip={tooltip} tabIndex={tooltip ? 0 : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  )
}

function DashboardRange({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  tooltip,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix: string
  tooltip?: string
  onChange: (value: number) => void
}) {
  return (
    <label className={`dashboard-range ${tooltip ? 'tooltip-target' : ''}`} data-tooltip={tooltip}>
      <span>
        {label}
        <b>
          {value.toLocaleString()}
          {suffix}
        </b>
      </span>
      <input type="range" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  )
}

function createNationalDashboard(rankedComplexes: RankedComplex[]): NationalDashboardStats {
  const agedUnits = 2_510_000
  const maxViableRate = 0.17
  const maxViableUnits = Math.round(agedUnits * maxViableRate)
  const impossibleUnits = agedUnits - maxViableUnits
  const regionalStats = createRegionalDashboardStats(rankedComplexes)
  const sampleUnits = regionalStats.reduce((sum, region) => sum + region.agedUnits, 0)
  const sampleViableUnits = regionalStats.reduce((sum, region) => sum + region.viableUnits, 0)

  return {
    agedUnits,
    maxViableRate,
    maxViableUnits,
    impossibleRate: 1 - maxViableRate,
    impossibleUnits,
    sampleUnits,
    sampleViableUnits,
    sampleViableRate: sampleUnits > 0 ? (sampleViableUnits / sampleUnits) * 100 : 0,
    regionalStats,
    benchmarks: REGIONAL_RECONSTRUCTION_BENCHMARKS,
  }
}

function createRegionalDashboardStats(rankedComplexes: RankedComplex[]): RegionalDashboardStat[] {
  const grouped = new Map<string, RankedComplex[]>()

  for (const ranked of rankedComplexes) {
    const region = getDashboardRegion(ranked.complex)
    grouped.set(region, [...(grouped.get(region) ?? []), ranked])
  }

  return [...grouped.entries()]
    .map(([region, items]) => {
      const agedUnits = items.reduce((sum, item) => sum + item.complex.units, 0)
      const viableItems = items.filter(isViableReconstructionCandidate)
      const viableUnits = viableItems.reduce((sum, item) => sum + item.complex.units, 0)
      const impossibleUnits = agedUnits - viableUnits
      const averageBusinessScore = average(items.map((item) => item.diagnosis.businessScore))
      const averageProRata = average(items.map((item) => item.diagnosis.finance.accountingProRata))
      const averageCurrentPrice = average(items.map((item) => item.complex.recentPrice))

      return {
        region,
        complexes: items.length,
        agedUnits,
        viableUnits,
        impossibleUnits,
        viableRate: agedUnits > 0 ? (viableUnits / agedUnits) * 100 : 0,
        averageBusinessScore,
        averageProRata,
        averageCurrentPrice,
        averageConstructionCost: baseScenario.constructionCost,
        riskLabel: averageBusinessScore >= 70 ? '가능권' : averageBusinessScore >= 58 ? '민감' : '불가권',
      }
    })
    .sort((left, right) => right.viableRate - left.viableRate || right.agedUnits - left.agedUnits)
}

function isViableReconstructionCandidate({ diagnosis }: RankedComplex) {
  return diagnosis.businessScore >= 70 || diagnosis.finance.accountingSameSizeSettlement <= 3
}

function getDashboardRegion(complex: Complex) {
  const [sido, district] = complex.address.split(' ')

  return sido === '서울' && district ? district : complex.district || sido || '지역 미상'
}

function average(values: number[]) {
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
}

function calculateDashboardSimulation(input: DashboardCalculatorInput) {
  const farIncreaseRate = Math.max(input.afterFar / input.currentFar - 1, 0)
  const rentalDrag = farIncreaseRate * (input.rentalRate / 100)
  const generalSalePower = Math.max(farIncreaseRate - rentalDrag, 0) * 100
  const densityPenalty = Math.max(input.currentFar - 180, 0) * 7
  const landShareCredit = Math.max(input.landShare - 11, 0) * 130
  const thresholdSalePrice = Math.round(input.constructionCost * 1.35 + densityPenalty + 1100 - landShareCredit)
  const proRata = Math.max(35, Math.min(145, (input.salePrice / Math.max(thresholdSalePrice, 1)) * 100 + generalSalePower * 0.28))
  const contributionPressure = Math.max(0, (100 - proRata) * 0.14)

  return {
    generalSalePower,
    thresholdSalePrice,
    proRata,
    contributionPressure,
  }
}

function formatHouseholds(value: number) {
  return value.toLocaleString('ko-KR')
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

type RenewalMatch = NonNullable<LiveEtlStatus['renewalMatches']>[number]

type OfficialStatus = {
  label: string
  shortLabel: string
  caption: string
  detail: string
  tone: 'confirmed' | 'unconfirmed' | 'unknown'
}

function createOfficialStatus(match?: RenewalMatch): OfficialStatus {
  if (!match) {
    return {
      label: '공식 데이터 없음',
      shortLabel: '공식 미확인',
      caption: '정비사업 API 조회 전',
      detail: '현재 ETL 결과에서 이 단지의 정비사업 공식 매칭 정보를 찾지 못했습니다. 사업성이 낮다는 뜻은 아니며, 공식 추진 근거만 미확인 상태입니다.',
      tone: 'unknown',
    }
  }

  if (match.matched) {
    return {
      label: '공식 추진 확인',
      shortLabel: '공식 확인',
      caption: '정비사업 공개자료 매칭',
      detail: `서울 정비사업 공개자료에서 직접 매칭되었습니다. 매칭 원문은 ${match.sourceRecordName ?? match.complexName}이며, 이 값은 추진 확실성 근거로만 사용합니다.`,
      tone: 'confirmed',
    }
  }

  return {
    label: '공식 데이터 없음',
    shortLabel: '공식 미확인',
    caption: '직접 매칭 없음',
    detail: `정비사업 공개자료와 직접 매칭되지 않았습니다. 가장 가까운 후보는 ${match.sourceRecordName ?? '없음'}이지만, 사업성 감점이 아니라 공식 추진 근거 미확인으로만 해석합니다.`,
    tone: 'unconfirmed',
  }
}

function getIssuesForComplex(issues: DataValidationIssue[], complex: Complex) {
  return issues.filter((issue) => issue.complexId === complex.identifiers.complexId || issue.complexId === complex.id || issue.complexName === complex.name)
}

type QualityIssue = {
  type: '거래가' | '신축가' | '공식추진' | '토지' | '기본정보' | '신뢰도'
  severity: 'info' | 'warning' | 'error'
  message: string
}

function createQualityIssues(
  complex: Complex,
  transactionDiagnostic: ReturnType<typeof findTransactionDiagnostic> | undefined,
  renewalMatch: RenewalMatch | undefined,
  validationIssues: DataValidationIssue[],
): QualityIssue[] {
  const issues: QualityIssue[] = []

  if (!transactionDiagnostic || transactionDiagnostic.tradeCount < 3) {
    issues.push({
      type: '거래가',
      severity: 'warning',
      message: transactionDiagnostic
        ? `최근 거래 ${transactionDiagnostic.tradeCount}건 기준입니다. 대표 시세 변동성이 클 수 있습니다.`
        : '실거래가 진단 정보가 없어 대표 시세를 후보/기본값으로 해석해야 합니다.',
    })
  }

  if (complex.newBuildPrice <= 0 || complex.sourceFreshness.costIndex === 'unknown') {
    issues.push({
      type: '신축가',
      severity: 'warning',
      message: '주변 신축 비교군 또는 공사비 기준가의 최신성이 부족합니다.',
    })
  }

  if (!renewalMatch?.matched) {
    issues.push({
      type: '공식추진',
      severity: 'info',
      message: '정비몽땅/서울 정비사업 공개자료에서 직접 매칭되지 않았습니다. 순수 사업성 판단과 분리해 보세요.',
    })
  }

  for (const issue of validationIssues) {
    if (issue.field.includes('pnu')) {
      issues.push({ type: '토지', severity: issue.severity, message: issue.message })
    } else if (issue.field.includes('kaptCode') || issue.field === 'units' || issue.field === 'currentFar') {
      issues.push({ type: '기본정보', severity: issue.severity, message: issue.message })
    } else if (issue.field === 'dataReliability') {
      issues.push({ type: '신뢰도', severity: issue.severity, message: issue.message })
    }
  }

  return dedupeQualityIssues(issues).slice(0, 6)
}

function dedupeQualityIssues(issues: QualityIssue[]) {
  const seen = new Set<string>()

  return issues.filter((issue) => {
    const key = `${issue.type}-${issue.message}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function createQualityGrade(complex: Complex, renewalMatch: RenewalMatch | undefined, issues: QualityIssue[]) {
  const errorCount = issues.filter((issue) => issue.severity === 'error').length
  const warningCount = issues.filter((issue) => issue.severity === 'warning').length
  const hasOfficialMatch = renewalMatch?.matched ?? false
  const hasCoreIds = Boolean(complex.identifiers.kaptCode && complex.identifiers.pnu)

  if (errorCount > 0 || complex.dataReliability < 58) {
    return { label: '후보추정', description: '핵심 식별자나 가격 근거 보강 필요' }
  }

  if (complex.dataReliability >= 82 && hasCoreIds && hasOfficialMatch && warningCount <= 1) {
    return { label: '확정', description: '공식 API와 추진 근거가 함께 확인됨' }
  }

  return { label: '부분확정', description: hasOfficialMatch ? '공식 추진은 확인, 일부 가격/토지 근거 보강 필요' : '물리·가격 데이터 중심, 공식 추진은 미확인' }
}

type EvidencePackItem = {
  label: string
  value: string
  sourceType: SourceType
  sourceName: string
  confidence: number
  method: string
}

function createEvidencePack(
  complex: Complex,
  diagnosis: ReturnType<typeof calculateDiagnosis>,
  scenario: Scenario,
  transactionDiagnostic: ReturnType<typeof findTransactionDiagnostic> | undefined,
  renewalMatch: RenewalMatch | undefined,
  qualityGrade: ReturnType<typeof createQualityGrade>,
): EvidencePackItem[] {
  const officialStatus = createOfficialStatus(renewalMatch)
  const transactionConfidence = Math.round((transactionDiagnostic?.matchConfidence ?? 0.52) * 100)

  return [
    {
      label: '기본정보',
      value: `${complex.builtYear}년 · ${complex.units.toLocaleString()}세대 · 용적률 ${complex.currentFar}%`,
      sourceType: complex.identifiers.kaptCode ? 'official_api' : 'inferred',
      sourceName: complex.identifiers.kaptCode ? 'K-apt 공동주택 단지 API' : '후보 레퍼런스/기본값',
      confidence: complex.identifiers.kaptCode ? 88 : 58,
      method: '준공연도, 세대수, 현재 용적률을 단지 기본정보로 사용합니다.',
    },
    {
      label: '실거래가',
      value: `${complex.recentPrice.toFixed(1)}억 · ${estimateCurrentPricePerPyeong(complex).toLocaleString()}만원/평`,
      sourceType: transactionDiagnostic ? 'official_api' : 'inferred',
      sourceName: transactionDiagnostic ? '국토교통부 실거래가 API' : '대표 시세 후보값',
      confidence: transactionDiagnostic ? transactionConfidence : 52,
      method: transactionDiagnostic
        ? `최근 거래 ${transactionDiagnostic.tradeCount}건 중 대표 면적대 중앙값을 사용합니다.`
        : 'API 직접 매칭 전에는 단지 후보값을 사용합니다.',
    },
    {
      label: '정비사업 단계',
      value: `${complex.stage} · ${officialStatus.label}`,
      sourceType: renewalMatch?.matched ? 'public_document' : 'inferred',
      sourceName: renewalMatch?.matched ? '서울 정비사업 공개자료' : '공식 추진 미확인',
      confidence: renewalMatch?.matched ? Math.min(92, Math.max(74, renewalMatch.score)) : 45,
      method: renewalMatch?.matched
        ? `정비구역명 ${renewalMatch.sourceRecordName ?? renewalMatch.complexName}과 매칭했습니다.`
        : '공식 매칭 없음은 사업성 감점이 아니라 추진 근거 미확인으로만 표시합니다.',
    },
    {
      label: '신축 비교가',
      value: `${estimateExpectedSalePricePerPyeong(complex, scenario).toLocaleString()}만원/평`,
      sourceType: 'inferred',
      sourceName: '국토부 실거래가 기반 신축 비교 모델',
      confidence: complex.newBuildPrice > 0 ? 66 : 48,
      method: describeExpectedSalePricePerPyeong(complex, scenario),
    },
    {
      label: '분담금/비례율',
      value: `${formatSettlementCurrency(diagnosis.finance.accountingSameSizeSettlement)} · 비례율 ${diagnosis.finance.accountingProRata.toFixed(0)}%`,
      sourceType: 'inferred',
      sourceName: '정비사업식 산식 추정',
      confidence: 58,
      method: '조합원분양가 - 종전자산×정비사업식 비례율로 동일평형 정산금을 추정합니다.',
    },
    {
      label: '품질 등급',
      value: qualityGrade.label,
      sourceType: qualityGrade.label === '확정' ? 'official_api' : qualityGrade.label === '부분확정' ? 'public_document' : 'inferred',
      sourceName: 'Recon Scanner 데이터 품질 규칙',
      confidence: complex.dataReliability,
      method: qualityGrade.description,
    },
  ]
}

function EvidencePackCard({ item }: { item: EvidencePackItem }) {
  return (
    <div className="evidence-pack-card">
      <div>
        <span>{item.label}</span>
        <i className={`source-chip ${item.sourceType}`}>{formatSourceType(item.sourceType)}</i>
      </div>
      <strong>{item.value}</strong>
      <p>{item.method}</p>
      <small>
        {item.sourceName} · 신뢰도 {item.confidence}%
      </small>
    </div>
  )
}

function QualityIssueRow({ issue }: { issue: QualityIssue }) {
  return (
    <div className={`quality-issue-row ${issue.severity}`}>
      <span>{issue.type}</span>
      <p>{issue.message}</p>
    </div>
  )
}

export default App
