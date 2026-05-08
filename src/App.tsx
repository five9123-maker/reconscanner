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
import { RankList } from './components/RankList'
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

type AppView = 'scanner' | 'national'

function App() {
  const [activeView, setActiveView] = useState<AppView>('scanner')
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
  const baselineDiagnosis = useMemo(() => calculateDiagnosis(selected, baseScenario), [selected])
  const scenarioDelta = useMemo(() => createScenarioDelta(diagnosis, baselineDiagnosis), [diagnosis, baselineDiagnosis])
  const rankedComplexes = useMemo<RankedComplex[]>(
    () => repository.getRankedComplexes(scenario),
    [repository, scenario],
  )
  const eligibleAnalysisIds = useMemo(() => new Set(rankedComplexes.map(({ complex }) => complex.id)), [rankedComplexes])
  const businessRankedComplexes = useMemo<RankedComplex[]>(
    () => [...rankedComplexes].sort((left, right) => right.diagnosis.businessScore - left.diagnosis.businessScore),
    [rankedComplexes],
  )
  const officialUnmatchedRankedComplexes = useMemo<RankedComplex[]>(
    () => businessRankedComplexes.filter(({ complex }) => !isOfficialRenewalMatched(liveEtlStatus?.renewalMatches ?? [], complex)),
    [businessRankedComplexes, liveEtlStatus],
  )
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
            className={activeView === 'scanner' ? 'active' : ''}
            type="button"
            onClick={() => setActiveView('scanner')}
          >
            <Home size={16} />
            <span>단지 스캐너</span>
          </button>
          <button
            className={activeView === 'national' ? 'active' : ''}
            type="button"
            onClick={() => setActiveView('national')}
          >
            <BarChart3 size={16} />
            <span>전국 대시보드</span>
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
              onSelect={selectAnalysisComplex}
              renderValue={({ diagnosis: itemDiagnosis }) => `${itemDiagnosis.businessScore.toFixed(0)}점`}
            />
            <RankList
              title="공식화 전 후보"
              caption="공식 추진 미확인 단지 중 순수 사업성 상위"
              items={officialUnmatchedRankedComplexes.slice(0, 10)}
              selectedId={selectedId}
              onSelect={selectAnalysisComplex}
              renderValue={({ diagnosis: itemDiagnosis }) => `${itemDiagnosis.businessScore.toFixed(0)}점`}
            />
            <RankList
              title="추진 확실성 참고"
              caption="사업성에 단계·규제·추진력 반영"
              items={rankedComplexes.slice(0, 10)}
              selectedId={selectedId}
              onSelect={selectAnalysisComplex}
              renderValue={({ diagnosis: itemDiagnosis }) => `${itemDiagnosis.reconScore.toFixed(0)}점`}
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
}

function NationalDashboard({ stats }: { stats: NationalDashboardStats }) {
  const topRegions = stats.regionalStats.slice(0, 5)
  const impossibleRate = Math.round(stats.impossibleRate * 100)
  const maxViableRate = Math.round(stats.maxViableRate * 100)

  return (
    <section className="national-dashboard">
      <div className="national-hero">
        <div>
          <span className="eyebrow dark">
            <BarChart3 size={15} />
            전국 재건축 가능성 모니터
          </span>
          <h1>30년 이상 노후 아파트 251만호 중 사업성 통과 상한은 17%</h1>
          <p>
            현재 거래가, 공사비, 분양가 회수력까지 함께 보면 나머지 83%는 동일 조건에서 재건축 사업성 확보가 어렵다는 가정으로 구성한 대시보드입니다.
          </p>
        </div>
        <div className="national-gauge" style={{ '--score': `${maxViableRate * 3.6}deg` } as React.CSSProperties}>
          <div>
            <strong>{maxViableRate}%</strong>
            <span>가능 상한</span>
          </div>
        </div>
      </div>

      <div className="national-kpi-grid">
        <NationalKpiCard label="준공 30년 이상" value={`${formatHouseholds(stats.agedUnits)}호`} caption="전국 노후 공동주택 추정 모수" />
        <NationalKpiCard label="재건축 가능 최대" value={`${formatHouseholds(stats.maxViableUnits)}호`} caption={`${maxViableRate}% 상한 적용`} tone="good" />
        <NationalKpiCard label="사업성 불가" value={`${formatHouseholds(stats.impossibleUnits)}호`} caption={`${impossibleRate}% · 가격/공사비 조건 미달`} tone="risk" />
        <NationalKpiCard
          label="앱 표본 가능률"
          value={`${stats.sampleViableRate.toFixed(1)}%`}
          caption={`${formatHouseholds(stats.sampleUnits)}호 분석 표본 기준`}
        />
      </div>

      <section className="national-grid">
        <div className="dashboard-panel regional-panel">
          <div className="section-heading">
            <div>
              <span>지역별 사업성 비율</span>
              <h2>분석 표본 기준 가능 아파트 비율</h2>
              <p>현재 보유 단지 데이터의 순수 사업성 70점 이상 또는 정비사업식 동일평형 정산금 3억 이하를 가능 후보로 분류했습니다.</p>
            </div>
            <MapPin size={18} />
          </div>
          <div className="region-list">
            {stats.regionalStats.map((region) => (
              <div className="region-row" key={region.region}>
                <div>
                  <strong>{region.region}</strong>
                  <span>
                    {region.complexes}개 단지 · {formatHouseholds(region.agedUnits)}호
                  </span>
                </div>
                <div className="region-bar" aria-label={`${region.region} 가능률 ${region.viableRate.toFixed(1)}%`}>
                  <i style={{ width: `${Math.min(region.viableRate, 100)}%` }} />
                </div>
                <b>{region.viableRate.toFixed(1)}%</b>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-panel constraint-panel">
          <div className="section-heading">
            <div>
              <span>불가 판정의 핵심 변수</span>
              <h2>가격보다 공사비가 빠르게 압박</h2>
            </div>
            <ShieldAlert size={18} />
          </div>
          <div className="constraint-stack">
            <ConstraintCard label="현재 거래가" value="높을수록 종전자산 부담 증가" detail="토지·기존주택 가격이 이미 많이 반영된 지역은 조합원분양가와 권리가액 사이의 여유가 줄어듭니다." />
            <ConstraintCard label="공사비" value={`${baseScenario.constructionCost.toLocaleString()}만원/평 기준`} detail="평당 공사비가 상승하면 일반분양 수익으로 회수해야 하는 비용이 커져 비례율과 정산금이 동시에 악화됩니다." />
            <ConstraintCard label="일반분양 여력" value="용적률·대지지분 의존" detail="허용 용적률 대비 현재 용적률이 높거나 대지지분이 작으면 신규 공급으로 비용을 회수할 공간이 제한됩니다." />
          </div>
        </div>
      </section>

      <section className="dashboard-panel">
        <div className="section-heading">
          <div>
            <span>상위 지역</span>
            <h2>가능 후보 집중 지역</h2>
          </div>
          <TrendingUp size={18} />
        </div>
        <div className="top-region-grid">
          {topRegions.map((region) => (
            <div className="top-region-card" key={region.region}>
              <span>{region.region}</span>
              <strong>{region.viableRate.toFixed(1)}%</strong>
              <p>
                가능 {formatHouseholds(region.viableUnits)}호 · 불가 {formatHouseholds(region.impossibleUnits)}호
              </p>
              <small>
                평균 사업성 {region.averageBusinessScore.toFixed(0)}점 · 비례율 {region.averageProRata.toFixed(0)}%
              </small>
            </div>
          ))}
        </div>
      </section>
    </section>
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

function ConstraintCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="constraint-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
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

function isOfficialRenewalMatched(matches: NonNullable<LiveEtlStatus['renewalMatches']>, complex: Complex) {
  return findRenewalMatch(matches, complex)?.matched ?? false
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
