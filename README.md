# Recon Scanner

노후 아파트의 물리 정보, 사업성, 규제 환경, 시장 지표를 결합해 재건축 추진 매력도와 리스크를 진단하는 React 기반 MVP입니다. 맹목적인 기대감 대신 공공 API, 공개 문서, 추정 산식을 분리해 보여주는 데이터 가이드를 목표로 합니다.

## 핵심 기능

- 단지명 검색과 검색어 기반 dropdown
- 전체 분석 대상 기준 Top 10 랭킹
- 순수 사업성, 추진 성공 가능성, 리스크 요인 분리
- 재건축 점수, 예상 비례율, 동일평형 정산금 비교
- 낙관/기준/보수 정산금 시나리오
- 공사비, 일반분양가, 금리, 공공기여 slider 시뮬레이션
- 단지정보, 판단 기준, 데이터 출처, 산정 방식 tooltip
- 정비사업식 추정과 시장가치식 추정을 병렬 표시
- 주변 신축 비교군과 가격대별 신축 레퍼런스를 결합한 신축 기준가 모델
- 공공 API 기반 ETL, 검증, fallback, 품질 이슈 표시

## 데이터 모델링 방향

Recon Scanner는 데이터의 확실성을 UI에 드러내는 것을 중요하게 봅니다. 각 값은 가능한 한 출처, 산정 방식, 신뢰도를 함께 관리합니다.

- 물리 정보: K-apt, 단지 기본정보, 공개 자료 기반
- 거래 가격: 국토교통부 실거래가 API 기반 대표 평형 중앙값
- 정비 단계: 서울 열린데이터광장 정비사업 API와 공개 고시 자료 기반
- 신축 기준가: 직접 주변 신축 비교군, 같은 구/권역 중앙값, 가격대별 시장 레퍼런스 혼합
- 사업비: 공사비, 기타 사업비, 금융비용, 공공기여를 시나리오 변수로 반영
- 정산금: 정비사업식 원가 추정과 시장가치식 정산 추정을 함께 표시

## 실행

```bash
npm install
npm run dev
```

로컬 앱:

```text
http://127.0.0.1:5173/
```

GitHub Pages 배포 URL:

```text
https://five9123-maker.github.io/reconscanner/
```

## 검증 명령

```bash
npm run lint
npm run build
npm run test
npm run api:check
npm run etl:sample
npm run etl:live
npm run etl:plan
```

## 실제 공공 API 연동

`.env.example`을 참고해 `.env`에 API key를 넣으면 live ETL을 실행할 수 있습니다. `.env`는 git에 포함하지 않습니다.

```bash
DATA_GO_KR_SERVICE_KEY=...
SEOUL_OPEN_API_KEY=...
RECON_LIVE_TARGETS=apt-002
RECON_DEAL_MONTH=202603
RECON_TRANSACTION_LOOKBACK_MONTHS=6
npm run etl:live
```

여러 단지는 쉼표로 지정합니다.

```bash
RECON_LIVE_TARGETS=apt-001,apt-002,apt-003 npm run etl:live
```

실행 전 연결 상태만 확인하려면 아래 명령을 먼저 사용합니다.

```bash
npm run api:check
```

`.env.example`의 placeholder 값이 그대로 남아 있으면 API 호출 전에 오류로 멈춥니다. 실제 키를 넣은 뒤에도 `auth`가 나오면 해당 API의 활용신청 승인 상태를 먼저 확인합니다.

현재 live ETL은 국토교통부 실거래가 API를 최근 N개월 window로 호출하고, 서울 정비사업 API를 단지명/법정동 기준으로 매칭합니다. key가 없거나 API가 실패하면 기존 공개 추정값 또는 지역 기준 추정값을 fallback으로 유지합니다. 실패 사유는 `missing_key`, `auth`, `quota`, `server`, `provider` 등으로 분류됩니다. 결과는 `public/data/live-etl-result.json`에 저장됩니다.

추정 후보 단지의 API 실매칭 우선순위는 아래 명령으로 생성합니다.

```bash
npm run etl:plan
```

결과는 `public/data/api-enrichment-plan.json`에 저장됩니다. 각 batch에는 바로 실행 가능한 `RECON_LIVE_TARGETS=... npm run etl:live` 명령이 포함됩니다.

## 프로젝트 구조

```text
src/data
  샘플 단지 데이터
  주변 신축 비교군
  가격대별 신축 레퍼런스
  문서·추가 근거 데이터

src/etl
  public API clients
  raw type
  normalize
  pipeline
  validation
  live ETL runner
  API enrichment plan

src/repositories
  UI/진단 엔진이 읽는 데이터 접근 계층

src/lib
  diagnosis
  project finance
  new-build price model
  data profile
  scenario
  report payload

src/components
  대시보드 하위 UI 컴포넌트
```

## 데이터 흐름

```text
raw public data
  -> ETL raw types
  -> normalize
  -> validation
  -> Complex model
  -> evidence overlay
  -> repository
  -> diagnosis engine
  -> React dashboard
```

## 기술 스택

- React
- TypeScript
- Vite
- Vitest
- ESLint
- lucide-react

## 다음 개발 후보

- GitHub Pages 배포 상태 badge와 release note 자동화
- 신축 레퍼런스 데이터의 출처/갱신일 관리
- PDF 리포트 renderer
- 관리자용 ETL 실행 화면
- 공공 API 실패/누락 상태의 UI 복구 흐름 개선
