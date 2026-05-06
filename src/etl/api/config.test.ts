import { describe, expect, it } from 'vitest'
import { assertDataGoKrKey, assertSeoulOpenApiKey, isPlaceholderKey, normalizeServiceKey } from './config'

describe('public api config', () => {
  it('normalizes encoded data.go.kr service keys before URLSearchParams encodes them', () => {
    expect(normalizeServiceKey('abc%2B123%3D')).toBe('abc+123=')
  })

  it('keeps already decoded service keys unchanged', () => {
    expect(normalizeServiceKey('abc+123=')).toBe('abc+123=')
  })

  it('detects .env.example placeholder keys before making an API request', () => {
    expect(isPlaceholderKey('put-your-data-go-kr-service-key-here')).toBe(true)
    expect(() =>
      assertDataGoKrKey({
        dataGoKrServiceKey: 'put-your-data-go-kr-service-key-here',
        kaptBaseUrl: 'https://example.test/kapt',
        molitTradeBaseUrl: 'https://example.test/trade',
        seoulDataBaseUrl: 'https://example.test/seoul',
      }),
    ).toThrow('placeholder')
    expect(() =>
      assertSeoulOpenApiKey({
        seoulOpenApiKey: 'put-your-seoul-open-api-key-here',
        kaptBaseUrl: 'https://example.test/kapt',
        molitTradeBaseUrl: 'https://example.test/trade',
        seoulDataBaseUrl: 'https://example.test/seoul',
      }),
    ).toThrow('placeholder')
  })
})
