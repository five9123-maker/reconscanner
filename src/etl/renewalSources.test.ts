import { describe, expect, it } from 'vitest'
import { renewalSourcePlans } from './renewalSources'

describe('renewalSourcePlans', () => {
  it('keeps official stage confirmation separate from supplemental events', () => {
    expect(renewalSourcePlans.map((source) => source.source)).toEqual([
      'seoul_cleanup',
      'gyeonggi_onnuri',
      'reb_national',
      'local_government_notice',
      'news_event',
    ])
    expect(renewalSourcePlans.filter((source) => source.usage === 'official_stage_confirmation')).toHaveLength(3)
    expect(renewalSourcePlans.find((source) => source.source === 'news_event')?.reliability).toBe('supplemental')
  })
})
