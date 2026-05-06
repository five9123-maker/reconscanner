export type ApiErrorKind = 'missing_key' | 'auth' | 'quota' | 'network' | 'server' | 'client' | 'provider' | 'unknown'

export class PublicApiError extends Error {
  readonly kind: ApiErrorKind
  readonly source: string
  readonly status?: number

  constructor(source: string, kind: ApiErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'PublicApiError'
    this.source = source
    this.kind = kind
    this.status = status
  }
}

export function classifyHttpStatus(status: number): ApiErrorKind {
  if (status === 401 || status === 403) return 'auth'
  if (status === 408 || status === 429) return 'quota'
  if (status >= 500) return 'server'
  if (status >= 400) return 'client'

  return 'unknown'
}

export function classifyProviderCode(code: string, message = ''): ApiErrorKind {
  const normalized = `${code} ${message}`.toLowerCase()

  if (normalized.includes('service_key') || normalized.includes('인증') || normalized.includes('key')) return 'auth'
  if (normalized.includes('limit') || normalized.includes('quota') || normalized.includes('초과')) return 'quota'
  if (normalized.includes('99') || normalized.includes('error')) return 'provider'

  return 'provider'
}

export function formatApiError(error: unknown) {
  if (error instanceof PublicApiError) {
    return `${error.source}/${error.kind}: ${error.message}`
  }

  return error instanceof Error ? error.message : 'unknown error'
}
