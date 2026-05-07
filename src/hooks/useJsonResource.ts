import { useEffect, useState } from 'react'

export function useJsonResource<T>(
  url: string,
  validate: (payload: unknown) => T | null,
  fallback: T,
  refreshKey: string | number = 0,
) {
  const [data, setData] = useState<T>(fallback)

  useEffect(() => {
    let mounted = true

    fetch(url)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: unknown) => {
        if (mounted) {
          setData(validate(payload) ?? fallback)
        }
      })
      .catch(() => {
        if (mounted) {
          setData(fallback)
        }
      })

    return () => {
      mounted = false
    }
  }, [fallback, refreshKey, url, validate])

  return data
}
