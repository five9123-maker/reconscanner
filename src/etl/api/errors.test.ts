import { describe, expect, it } from 'vitest'
import { classifyHttpStatus, classifyProviderCode, formatApiError, PublicApiError } from './errors'

describe('api errors', () => {
  it('classifies public API failures for operator diagnostics', () => {
    expect(classifyHttpStatus(401)).toBe('auth')
    expect(classifyHttpStatus(429)).toBe('quota')
    expect(classifyHttpStatus(503)).toBe('server')
    expect(classifyProviderCode('30', 'SERVICE_KEY_IS_NOT_REGISTERED_ERROR')).toBe('auth')
    expect(classifyProviderCode('22', 'LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR')).toBe('quota')
  })

  it('formats typed public API errors with source and kind', () => {
    expect(formatApiError(new PublicApiError('molit-trade', 'quota', 'request limit exceeded'))).toBe(
      'molit-trade/quota: request limit exceeded',
    )
  })
})
