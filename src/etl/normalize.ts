import type { Complex } from '../types'
import type { RawComplexBundle } from './rawTypes'

const fallbackFreshness = 'unknown'

export function normalizeComplex(bundle: RawComplexBundle, index = 0): Complex {
  const { physical, transaction, regulation, market } = bundle
  const complexId = physical.stableComplexId ?? createComplexId(physical.legalDongCode, physical.pnu, physical.complexName)
  const landShare = physical.units > 0 ? physical.landAreaPyeong / physical.units : 0

  return {
    id: physical.appId ?? `apt-${String(index + 1).padStart(3, '0')}`,
    identifiers: {
      complexId,
      kaptCode: physical.kaptCode,
      legalDongCode: physical.legalDongCode,
      pnu: physical.pnu,
      roadAddress: physical.roadAddress,
      jibunAddress: physical.jibunAddress,
      lat: physical.lat,
      lng: physical.lng,
    },
    name: physical.complexName,
    aliases: createAliases(physical.complexName),
    district: physical.district,
    address: trimAddressToDong(physical.jibunAddress),
    legalDongCode: physical.legalDongCode,
    builtYear: physical.builtYear,
    units: physical.units,
    currentFar: physical.currentFar,
    allowedFar: regulation?.allowedFar ?? Math.max(physical.currentFar, 250),
    landShare,
    previousAssetValue: transaction?.previousAssetValue ?? 0,
    recentPrice: transaction?.recentPrice ?? 0,
    newBuildPrice: market?.newBuildPrice ?? 0,
    stage: regulation?.stage ?? '검토',
    regulationRisk: regulation?.regulationRisk ?? '중간',
    residentMomentum: regulation?.residentMomentum ?? '중간',
    dataReliability: calculateReliability(bundle),
    x: projectLngToMapX(physical.lng),
    y: projectLatToMapY(physical.lat),
    note: createNote(physical.currentFar, regulation?.allowedFar, landShare),
    sourceFreshness: {
      physicalInfo: physical.updatedMonth,
      transaction: transaction?.transactionMonth ?? fallbackFreshness,
      regulation: regulation?.updatedMonth ?? fallbackFreshness,
      costIndex: market?.costIndexMonth ?? fallbackFreshness,
    },
  }
}

export function normalizeComplexes(bundles: RawComplexBundle[]): Complex[] {
  return bundles.map((bundle, index) => normalizeComplex(bundle, index))
}

export function createComplexId(legalDongCode: string, pnu: string | undefined, complexName: string) {
  return [legalDongCode, pnu ?? 'no-pnu', complexName]
    .join(' ')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/아파트|단지/g, '')
    .replace(/[^0-9a-z가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function createAliases(name: string) {
  const normalized = name.replace(/\s+/g, '')
  const aliases = new Set<string>([name, normalized])

  aliases.add(name.replace(/아파트/g, '').trim())
  aliases.add(normalized.replace(/아파트/g, ''))

  return [...aliases].filter(Boolean)
}

function trimAddressToDong(address: string) {
  const parts = address.split(' ')
  return parts.length >= 3 ? parts.slice(0, 3).join(' ') : address
}

function calculateReliability(bundle: RawComplexBundle) {
  const required = [
    bundle.physical.kaptCode,
    bundle.physical.legalDongCode,
    bundle.physical.pnu,
    bundle.physical.lat,
    bundle.physical.lng,
    bundle.transaction?.recentPrice,
    bundle.transaction?.previousAssetValue,
    bundle.regulation?.allowedFar,
    bundle.market?.newBuildPrice,
  ]

  const present = required.filter((value) => value !== undefined && value !== '' && value !== 0).length
  return Math.round((present / required.length) * 100)
}

function createNote(currentFar: number, allowedFar?: number, landShare?: number) {
  const farUpside = (allowedFar ?? currentFar) - currentFar

  if (farUpside > 130 && (landShare ?? 0) >= 14) {
    return '낮은 현재 용적률과 충분한 대지지분으로 사업성 확인 가치가 큽니다.'
  }

  if (farUpside < 70) {
    return '용적률 추가 여력이 제한적이어서 분담금 민감도 확인이 필요합니다.'
  }

  return '사업성은 주요 변수 변화에 따라 민감하게 달라질 수 있습니다.'
}

function projectLngToMapX(lng: number) {
  return clampToPercent(((lng - 126.75) / (127.2 - 126.75)) * 100)
}

function projectLatToMapY(lat: number) {
  return clampToPercent(100 - ((lat - 37.42) / (37.7 - 37.42)) * 100)
}

function clampToPercent(value: number) {
  return Math.min(92, Math.max(8, Math.round(value)))
}
