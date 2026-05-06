import { describe, expect, it } from 'vitest'
import { fetchPublicEtlInput } from './fetchPublicData'
import { runInMemoryEtl } from './runEtl'

const tradeXml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header><resultCode>00</resultCode><resultMsg>OK</resultMsg></header>
  <body>
    <items>
      <item>
        <aptNm>잠실주공5단지</aptNm>
        <dealAmount>278,000</dealAmount>
        <dealYear>2026</dealYear>
        <dealMonth>3</dealMonth>
        <excluUseAr>84.92</excluUseAr>
        <umdNm>잠실동</umdNm>
        <jibun>27</jibun>
        <buildYear>1978</buildYear>
      </item>
    </items>
  </body>
</response>`

describe('fetchPublicEtlInput', () => {
  it('builds ETL input from live API clients and existing target metadata', async () => {
    const fetcher = async (input: string | URL) =>
      String(input).includes('/getLegaldongAptList3')
        ? Response.json({
            response: {
              body: {
                items: [
                  {
                    kaptCode: 'A10000002',
                    kaptName: '잠실주공5',
                    bjdCode: '1171010100',
                  },
                ],
              },
            },
          })
        : new Response(tradeXml)
    const result = await fetchPublicEtlInput(
      [{ complexId: 'apt-002', dealMonth: '202603', transactionLookbackMonths: 1 }],
      {
        dataGoKrServiceKey: 'test-key',
        kaptBaseUrl: 'https://example.test/kapt',
        molitTradeBaseUrl: 'https://example.test/trade',
        seoulDataBaseUrl: 'https://example.test/seoul',
      },
      fetcher,
    )
    const etl = runInMemoryEtl(result.input)

    expect(result.skippedSources).toEqual([])
    expect(result.kaptMatches[0]).toMatchObject({ matched: true, kaptCode: 'A10000002' })
    expect(result.input.physical).toHaveLength(1)
    expect(result.input.physical[0].kaptCode).toBe('A10000002')
    expect(result.input.transactions[0].recentPrice).toBe(27.8)
    expect(etl.complexes[0].name).toBe('잠실주공5단지')
  })

  it('keeps existing public estimates as fallback when a live API source is unavailable', async () => {
    const result = await fetchPublicEtlInput([{ complexId: 'apt-002', dealMonth: '202603', transactionLookbackMonths: 1 }])

    expect(result.skippedSources[0]).toContain('data.go.kr/missing_key')
    expect(result.input.transactions[0].recentPrice).toBeGreaterThan(0)
    expect(result.input.transactions[0].previousAssetValue).toBeGreaterThan(0)
  })
})
