import { describe, expect, it } from 'vitest'
import { getFreshnessThresholdMonth, getReferenceYear, isFreshnessStale, shiftYearMonth, toYearMonth } from './date'

describe('date helpers', () => {
  const referenceDate = new Date('2026-05-07T00:00:00.000Z')

  it('derives the reference year from the given date', () => {
    expect(getReferenceYear(referenceDate)).toBe(2026)
  })

  it('formats and shifts year-month values across year boundaries', () => {
    expect(toYearMonth(referenceDate)).toBe('2026-05')
    expect(shiftYearMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftYearMonth('2026-12', 2)).toBe('2027-02')
  })

  it('flags freshness older than the rolling threshold', () => {
    expect(getFreshnessThresholdMonth(referenceDate, 2)).toBe('2026-03')
    expect(isFreshnessStale('2026-02', referenceDate, 2)).toBe(true)
    expect(isFreshnessStale('2026-03', referenceDate, 2)).toBe(false)
    expect(isFreshnessStale('unknown', referenceDate, 2)).toBe(false)
  })
})
