import { defaultPublicApiConfig } from './api/config'
import {
  fetchKaptComplexList,
  fetchKaptLegalDongComplexList,
  fetchKaptRoadnameComplexList,
  fetchKaptSigunguComplexList,
  fetchKaptTotalComplexList,
} from './api/kaptClient'
import { fetchApartmentTrades } from './api/molitTradeClient'
import { fetchSeoulRenewalXmlRows, mapSeoulRenewalRows } from './api/seoulRenewalClient'

let failed = false

try {
  const trades = await fetchApartmentTrades(process.env.RECON_CHECK_LAWD_CD ?? '11710', process.env.RECON_CHECK_DEAL_MONTH ?? '202603')

  console.log(`data.go.kr RTMS check passed: ${trades.length} rows`)
} catch (error) {
  console.log(`data.go.kr RTMS check failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  console.log(`endpoint: ${defaultPublicApiConfig.molitTradeBaseUrl}`)
  console.log('checklist: 활용신청 완료 여부, 승인 직후 반영 지연, 일반 인증키 Encoding/Decoding 복사 위치를 확인하세요.')
  failed = true
}

try {
  const [sido, sigungu, legalDong, roadname, total] = await Promise.all([
    fetchKaptComplexList(process.env.RECON_CHECK_SIDO_CODE ?? '11'),
    fetchKaptSigunguComplexList(process.env.RECON_CHECK_SIGUNGU_CODE ?? '11710'),
    fetchKaptLegalDongComplexList(process.env.RECON_CHECK_BJD_CODE ?? '1171010100'),
    fetchKaptRoadnameComplexList(process.env.RECON_CHECK_ROAD_CODE ?? '117103123023'),
    fetchKaptTotalComplexList(),
  ])

  console.log(
    `data.go.kr K-apt list check passed: sido ${sido.length}, sigungu ${sigungu.length}, bjd ${legalDong.length}, road ${roadname.length}, total ${total.length}`,
  )
} catch (error) {
  console.log(`data.go.kr K-apt list check failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  console.log(`endpoint: ${defaultPublicApiConfig.kaptBaseUrl}`)
  console.log('checklist: 국토교통부_공동주택 단지 목록제공 서비스 활용신청 완료 여부와 인증키 반영 상태를 확인하세요.')
  failed = true
}

if (failed) {
  process.exitCode = 1
}

try {
  const rows = await fetchSeoulRenewalXmlRows(process.env.RECON_CHECK_SEOUL_SERVICE ?? 'upisRebuild', 1, 5)
  const regulations = mapSeoulRenewalRows(rows)

  console.log(`Seoul Open Data check passed: ${rows.length} rows, ${regulations.length} regulation records`)
} catch (error) {
  console.log(`Seoul Open Data check failed: ${error instanceof Error ? error.message : 'unknown error'}`)
  console.log(`endpoint: ${defaultPublicApiConfig.seoulDataBaseUrl}`)
  console.log('checklist: 서울 열린데이터광장 인증키와 서비스명 대소문자를 확인하세요.')
  process.exitCode = 1
}
