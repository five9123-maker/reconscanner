import { describe, expect, it } from 'vitest'
import { fetchSeoulRenewalXmlRows, mapSeoulRenewalRows } from './seoulRenewalClient'

const upisRebuildXml = `<?xml version="1.0" encoding="UTF-8"?>
<upisRebuild>
  <list_total_count>6515</list_total_count>
  <RESULT>
    <CODE>INFO-000</CODE>
    <MESSAGE>정상 처리되었습니다</MESSAGE>
  </RESULT>
  <row>
    <RPT_MNG_CD>11000AGZ198505012337</RPT_MNG_CD>
    <PRJC_CD>11000PPL198505016898</PRJC_CD>
    <LOGVM>서울특별시</LOGVM>
    <RPT_TYPE>변경</RPT_TYPE>
    <MCLSF>정비구역</MCLSF>
    <SCLSF>주택재개발사업지구</SCLSF>
    <PSTN_NM>성동구 하왕십리동 890번지 일대</PSTN_NM>
    <RGN_NM>하왕제1구역제1지구</RGN_NM>
    <AREA_CHG_AFTR>63270</AREA_CHG_AFTR>
  </row>
</upisRebuild>`

describe('seoulRenewalClient', () => {
  it('maps Seoul renewal rows into regulation records', () => {
    const records = mapSeoulRenewalRows([
      {
        APT_NM: '잠실주공5단지',
        BJDONG_CD: '1171010100',
        PLAN_FAR: '300',
        STEP_NM: '사업시행인가',
        UPDATE_DT: '20260430',
      },
    ])

    expect(records[0]).toMatchObject({
      complexName: '잠실주공5단지',
      legalDongCode: '1171010100',
      allowedFar: 300,
      stage: '사업시행인가',
      residentMomentum: '높음',
      updatedMonth: '2026-04',
    })
  })

  it('fetches Seoul upisRebuild XML rows', async () => {
    const rows = await fetchSeoulRenewalXmlRows(
      'upisRebuild',
      1,
      5,
      {
        dataGoKrServiceKey: 'test-key',
        seoulOpenApiKey: 'seoul-key',
        kaptBaseUrl: 'https://example.test/kapt',
        molitTradeBaseUrl: 'https://example.test/trade',
        seoulDataBaseUrl: 'http://openapi.seoul.go.kr:8088',
      },
      async () => new Response(upisRebuildXml),
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].RGN_NM).toBe('하왕제1구역제1지구')
    expect(mapSeoulRenewalRows(rows)[0].complexName).toBe('하왕제1구역제1지구')
  })
})
