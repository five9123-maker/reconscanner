export function getReferenceYear(referenceDate = new Date()) {
  return referenceDate.getFullYear()
}

export function toYearMonth(referenceDate = new Date()) {
  const year = referenceDate.getFullYear()
  const month = String(referenceDate.getMonth() + 1).padStart(2, '0')

  return `${year}-${month}`
}

export function shiftYearMonth(yearMonth: string, monthDelta: number) {
  const [year, month] = yearMonth.split('-').map(Number)
  const date = new Date(year, month - 1 + monthDelta, 1)

  return toYearMonth(date)
}

export function getFreshnessThresholdMonth(referenceDate = new Date(), staleAfterMonths = 2) {
  return shiftYearMonth(toYearMonth(referenceDate), -staleAfterMonths)
}

export function isFreshnessStale(freshness: string, referenceDate = new Date(), staleAfterMonths = 2) {
  if (freshness === 'unknown') return false

  return freshness < getFreshnessThresholdMonth(referenceDate, staleAfterMonths)
}
