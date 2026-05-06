import { describe, expect, it } from 'vitest'
import {
  fetchKaptComplexList,
  fetchKaptLegalDongComplexList,
  fetchKaptRoadnameComplexList,
  fetchKaptSigunguComplexList,
  fetchKaptTotalComplexList,
} from './kaptClient'

const config = {
  dataGoKrServiceKey: 'test-key',
  kaptBaseUrl: 'https://example.test/kapt',
  molitTradeBaseUrl: 'https://example.test/trade',
  seoulDataBaseUrl: 'https://example.test/seoul',
}

const payload = {
  response: {
    body: {
      items: [
        {
          kaptCode: 'A10023070',
          kaptName: '잠실 센트럴파크',
          bjdCode: '1171010100',
          as1: '서울특별시',
          as2: '송파구',
          as3: '잠실동',
        },
      ],
      totalCount: 1,
    },
    header: {
      resultCode: '00',
      resultMsg: 'NORMAL SERVICE.',
    },
  },
}

describe('kaptClient', () => {
  it('parses AptListService3 responses where body.items is an array', async () => {
    const records = await fetchKaptComplexList('11', config, async () => Response.json(payload))

    expect(records[0]).toMatchObject({
      kaptCode: 'A10023070',
      complexName: '잠실 센트럴파크',
      legalDongCode: '1171010100',
    })
  })

  it('calls every documented AptListService3 list operation with the correct parameter', async () => {
    const calledUrls: string[] = []
    const fetcher = async (input: string | URL) => {
      calledUrls.push(String(input))
      return Response.json(payload)
    }

    await fetchKaptComplexList('11', config, fetcher)
    await fetchKaptSigunguComplexList('11710', config, fetcher)
    await fetchKaptLegalDongComplexList('1171010100', config, fetcher)
    await fetchKaptRoadnameComplexList('117103123023', config, fetcher)
    await fetchKaptTotalComplexList(config, fetcher)

    expect(calledUrls[0]).toContain('/getSidoAptList3?')
    expect(calledUrls[0]).toContain('sidoCode=11')
    expect(calledUrls[1]).toContain('/getSigunguAptList3?')
    expect(calledUrls[1]).toContain('sigunguCode=11710')
    expect(calledUrls[2]).toContain('/getLegaldongAptList3?')
    expect(calledUrls[2]).toContain('bjdCode=1171010100')
    expect(calledUrls[3]).toContain('/getRoadnameAptList3?')
    expect(calledUrls[3]).toContain('roadCode=117103123023')
    expect(calledUrls[4]).toContain('/getTotalAptList3?')
  })
})
