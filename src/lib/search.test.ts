import { describe, expect, it } from 'vitest'
import { createSearchTokens, normalizeSearchText, rankComplexNameMatch } from './search'

describe('search', () => {
  it('creates compact aliases for common reconstruction complex names', () => {
    const tokens = createSearchTokens('잠실주공5단지', ['잠실5단지'])

    expect(tokens).toContain('잠주5')
    expect(tokens).toContain('잠실5')
    expect(tokens).toContain(normalizeSearchText('ㅈㅅㅈㄱ5'))
  })

  it('ranks exact and compact matches above loose contains matches', () => {
    const item = {
      name: '목동신시가지 14단지',
      aliases: ['목동14단지'],
      searchTokens: createSearchTokens('목동신시가지 14단지', ['목동14단지']),
    }

    expect(rankComplexNameMatch(item, '목14')).toBeGreaterThan(80)
    expect(rankComplexNameMatch(item, 'ㅁㄷㅅㅅㄱㅈ14')).toBeGreaterThan(40)
    expect(rankComplexNameMatch(item, '강남구')).toBe(0)
  })
})
