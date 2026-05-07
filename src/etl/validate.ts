import type { Complex } from '../types'
import { isFreshnessStale } from '../lib/date'

export type ValidationSeverity = 'info' | 'warning' | 'error'

export type DataValidationIssue = {
  complexId: string
  complexName: string
  field: string
  severity: ValidationSeverity
  message: string
}

export function validateComplexDataset(complexes: Complex[]): DataValidationIssue[] {
  return complexes.flatMap((complex) => validateComplex(complex))
}

export function validateComplex(complex: Complex): DataValidationIssue[] {
  const issues: DataValidationIssue[] = []

  addIssueIf(issues, !complex.identifiers.kaptCode, complex, 'identifiers.kaptCode', 'warning', 'K-apt 단지코드가 없어 공동주택 기본정보 재조회가 제한됩니다.')
  addIssueIf(issues, !complex.identifiers.pnu, complex, 'identifiers.pnu', 'warning', 'PNU가 없어 토지/도시계획 데이터 매칭 정확도가 낮아집니다.')
  addIssueIf(issues, complex.units <= 0, complex, 'units', 'error', '세대수가 0 이하라 사업성 계산에 사용할 수 없습니다.')
  addIssueIf(issues, complex.currentFar <= 0, complex, 'currentFar', 'error', '현재 용적률이 없어 용적률 upside 계산이 불가능합니다.')
  addIssueIf(issues, complex.allowedFar < complex.currentFar, complex, 'allowedFar', 'warning', '허용 용적률이 현재 용적률보다 낮아 규제 데이터 확인이 필요합니다.')
  addIssueIf(issues, complex.previousAssetValue <= 0, complex, 'previousAssetValue', 'warning', '종전자산 추정값이 없어 비례율 신뢰도가 낮습니다.')
  addIssueIf(issues, complex.recentPrice <= 0, complex, 'recentPrice', 'warning', '최근 실거래가가 없어 시장성 판단이 제한됩니다.')
  addIssueIf(issues, complex.newBuildPrice <= 0, complex, 'newBuildPrice', 'warning', '주변 신축 기준가가 없어 일반분양가 추정 신뢰도가 낮습니다.')
  addIssueIf(issues, complex.dataReliability < 70, complex, 'dataReliability', 'warning', '데이터 신뢰도가 70% 미만입니다.')

  for (const [source, freshness] of Object.entries(complex.sourceFreshness)) {
    addIssueIf(issues, freshness === 'unknown', complex, `sourceFreshness.${source}`, 'info', `${source} 원천의 갱신월을 확인할 수 없습니다.`)
    addIssueIf(issues, isFreshnessStale(freshness), complex, `sourceFreshness.${source}`, 'warning', `${source} 원천이 오래되었습니다.`)
  }

  return issues
}

function addIssueIf(
  issues: DataValidationIssue[],
  condition: boolean,
  complex: Complex,
  field: string,
  severity: ValidationSeverity,
  message: string,
) {
  if (!condition) return

  issues.push({
    complexId: complex.identifiers.complexId,
    complexName: complex.name,
    field,
    severity,
    message,
  })
}
