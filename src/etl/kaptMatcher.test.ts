import { describe, expect, it } from 'vitest'
import { complexes } from '../data/complexes'
import { findBestKaptMatch } from './kaptMatcher'
import type { KaptComplexRecord } from './rawTypes'

describe('findBestKaptMatch', () => {
  it('matches a complex to the closest K-apt candidate in the same legal dong', () => {
    const complex = complexes.find((item) => item.id === 'apt-002')!
    const candidates: KaptComplexRecord[] = [
      {
        kaptCode: 'A10000001',
        complexName: '잠실 센트럴파크',
        jibunAddress: '서울 송파구 잠실동',
        district: '송파구',
        legalDongCode: '1171010100',
        lat: 37.5,
        lng: 127.1,
        builtYear: 2000,
        units: 100,
        landAreaPyeong: 1000,
        currentFar: 200,
        updatedMonth: '2026-05',
      },
      {
        kaptCode: 'A10000002',
        complexName: '잠실주공5',
        jibunAddress: '서울 송파구 잠실동',
        district: '송파구',
        legalDongCode: '1171010100',
        lat: 37.5,
        lng: 127.1,
        builtYear: 1978,
        units: 3930,
        landAreaPyeong: 62487,
        currentFar: 138,
        updatedMonth: '2026-05',
      },
    ]

    expect(findBestKaptMatch(complex, candidates)).toMatchObject({
      matched: true,
      kaptCode: 'A10000002',
    })
  })
})
