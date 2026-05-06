import { describe, expect, it } from 'vitest'
import { createDealMonthWindow, fetchApartmentTrades, fetchTransactionMarketRecord, fetchTransactionMarketRecordWindow } from './molitTradeClient'

const okXml = `<?xml version="1.0" encoding="UTF-8"?>
<response>
  <header><resultCode>000</resultCode><resultMsg>OK</resultMsg></header>
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
      <item>
        <aptNm>다른단지</aptNm>
        <dealAmount>100,000</dealAmount>
        <dealYear>2026</dealYear>
        <dealMonth>3</dealMonth>
        <excluUseAr>59.88</excluUseAr>
        <umdNm>잠실동</umdNm>
        <jibun>35</jibun>
        <buildYear>2007</buildYear>
      </item>
    </items>
  </body>
</response>`

describe('molitTradeClient', () => {
  it('creates a descending deal-month window', () => {
    expect(createDealMonthWindow('202603', 4)).toEqual(['202603', '202602', '202601', '202512'])
  })

  it('fetches and parses apartment trade XML from data.go.kr', async () => {
    const fetcher = async () => new Response(okXml)
    const trades = await fetchApartmentTrades(
      '11710',
      '202603',
      {
        dataGoKrServiceKey: 'test-key',
        kaptBaseUrl: 'https://example.test/kapt',
        molitTradeBaseUrl: 'https://example.test/trade',
        seoulDataBaseUrl: 'https://example.test/seoul',
      },
      fetcher,
    )

    expect(trades).toHaveLength(2)
    expect(trades[0].aptNm).toBe('잠실주공5단지')
  })

  it('creates a transaction market record matched by complex name', async () => {
    const fetcher = async () => new Response(okXml)
    const record = await fetchTransactionMarketRecord(
      '1171010100',
      '잠실주공5단지',
      '202603',
      20.1,
      {
        aliases: ['잠실5단지', '잠실 주공5'],
        umdName: '잠실동',
        jibun: '27',
        builtYear: 1978,
      },
      {
        dataGoKrServiceKey: 'test-key',
        kaptBaseUrl: 'https://example.test/kapt',
        molitTradeBaseUrl: 'https://example.test/trade',
        seoulDataBaseUrl: 'https://example.test/seoul',
      },
      fetcher,
    )

    expect(record.recentPrice).toBe(27.8)
    expect(record.previousAssetValue).toBe(20.1)
    expect(record.tradeCount12m).toBe(1)
    expect(record.representativeAreaRange).toBe('60~85㎡')
    expect(record.areaPriceStats?.[0].medianPrice).toBe(27.8)
  })

  it('aggregates apartment trades over a recent month window', async () => {
    const fetcher = async (input: string | URL) => {
      const url = new URL(String(input))
      const dealMonth = url.searchParams.get('DEAL_YMD')
      const amount = dealMonth === '202603' ? '278,000' : '282,000'

      return new Response(okXml.replace('278,000', amount))
    }
    const record = await fetchTransactionMarketRecordWindow(
      '1171010100',
      '잠실주공5단지',
      '202603',
      2,
      20.1,
      {
        umdName: '잠실동',
        jibun: '27',
        builtYear: 1978,
      },
      {
        dataGoKrServiceKey: 'test-key',
        kaptBaseUrl: 'https://example.test/kapt',
        molitTradeBaseUrl: 'https://example.test/trade',
        seoulDataBaseUrl: 'https://example.test/seoul',
      },
      fetcher,
    )

    expect(record.recentPrice).toBe(28)
    expect(record.tradeCount12m).toBe(2)
    expect(record.transactionMonth).toBe('202603')
  })

  it('prefers the 60~85㎡ representative area bucket over smaller trades', async () => {
    const xml = okXml.replace(
      '</items>',
      `<item>
        <aptNm>잠실주공5단지</aptNm>
        <dealAmount>167,000</dealAmount>
        <dealYear>2026</dealYear>
        <dealMonth>3</dealMonth>
        <excluUseAr>35.46</excluUseAr>
        <umdNm>잠실동</umdNm>
        <jibun>27</jibun>
        <buildYear>1978</buildYear>
      </item></items>`,
    )
    const record = await fetchTransactionMarketRecord(
      '1171010100',
      '잠실주공5단지',
      '202603',
      20.1,
      {
        umdName: '잠실동',
        jibun: '27',
        builtYear: 1978,
      },
      {
        dataGoKrServiceKey: 'test-key',
        kaptBaseUrl: 'https://example.test/kapt',
        molitTradeBaseUrl: 'https://example.test/trade',
        seoulDataBaseUrl: 'https://example.test/seoul',
      },
      async () => new Response(xml),
    )

    expect(record.recentPrice).toBe(27.8)
    expect(record.representativeAreaRange).toBe('60~85㎡')
    expect(record.areaPriceStats).toHaveLength(2)
  })

  it('rejects same-name trades when dong, jibun, and build year do not match', async () => {
    const xml = okXml.replace('<jibun>27</jibun>', '<jibun>999</jibun>').replace('<buildYear>1978</buildYear>', '<buildYear>2001</buildYear>')
    const record = await fetchTransactionMarketRecord(
      '1171010100',
      '잠실주공5단지',
      '202603',
      20.1,
      {
        aliases: ['잠실5단지'],
        umdName: '잠실동',
        jibun: '27',
        builtYear: 1978,
      },
      {
        dataGoKrServiceKey: 'test-key',
        kaptBaseUrl: 'https://example.test/kapt',
        molitTradeBaseUrl: 'https://example.test/trade',
        seoulDataBaseUrl: 'https://example.test/seoul',
      },
      async () => new Response(xml),
    )

    expect(record.matchStrategy).toBe('name-only')
    expect(record.matchConfidence).toBeLessThan(0.72)
  })

  it('can avoid area fallback when a preferred exclusive area bucket is required', async () => {
    const smallOnlyXml = okXml.replace('<excluUseAr>84.92</excluUseAr>', '<excluUseAr>35.46</excluUseAr>')
    const record = await fetchTransactionMarketRecord(
      '1171010100',
      '잠실주공5단지',
      '202603',
      20.1,
      {
        aliases: ['잠실5단지'],
        umdName: '잠실동',
        jibun: '27',
        builtYear: 1978,
        preferredExclusiveArea: 84,
        allowAreaFallback: false,
      },
      {
        dataGoKrServiceKey: 'test-key',
        kaptBaseUrl: 'https://example.test/kapt',
        molitTradeBaseUrl: 'https://example.test/trade',
        seoulDataBaseUrl: 'https://example.test/seoul',
      },
      async () => new Response(smallOnlyXml),
    )

    expect(record.representativeAreaRange).toBeUndefined()
    expect(record.recentPrice).toBe(27.8)
  })
})
