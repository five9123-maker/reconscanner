import { classifyHttpStatus, PublicApiError } from './errors'

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>

export async function fetchJson<T>(url: URL, fetcher: FetchLike = fetch, source = 'public-api'): Promise<T> {
  const response = await fetcher(url)

  if (!response.ok) {
    throw new PublicApiError(source, classifyHttpStatus(response.status), `${response.status} ${response.statusText}`, response.status)
  }

  return response.json() as Promise<T>
}

export async function fetchText(url: URL, fetcher: FetchLike = fetch, source = 'public-api'): Promise<string> {
  const response = await fetcher(url)

  if (!response.ok) {
    throw new PublicApiError(source, classifyHttpStatus(response.status), `${response.status} ${response.statusText}`, response.status)
  }

  return response.text()
}

export function createUrl(baseUrl: string, path: string, params: Record<string, string | number | undefined>) {
  const url = new URL(path.replace(/^\//, ''), `${baseUrl.replace(/\/$/, '')}/`)

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }

  return url
}
