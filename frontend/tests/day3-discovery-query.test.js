import { describe, expect, test } from 'vitest'
import {
  buildMarketplaceSearch,
  mergeUniqueById,
  parseMarketplaceSearch,
} from '../src/lib/marketplaceSearchQuery'

describe('Day 3 marketplace search URL contract', () => {
  test('restores filters and sort from a shared URL then serializes the same state', () => {
    const shared = new URLSearchParams('q=fashion&sort=most_followed&niche=Fashion&verified=true&location=Ulaanbaatar&skills=Editing%2CStyling')
    const state = parseMarketplaceSearch(shared)

    expect(state).toEqual({
      query: 'fashion',
      sort: 'most_followed',
      filters: {
        niche: 'Fashion',
        verified: true,
        location: 'Ulaanbaatar',
        skills: 'Editing,Styling',
      },
    })
    expect(buildMarketplaceSearch(state).toString()).toBe(shared.toString())
  })

  test('cursor pages merge without duplicate cards while preserving order', () => {
    expect(mergeUniqueById(
      [{ id: 'a' }, { id: 'b', value: 'old' }],
      [{ id: 'b', value: 'fresh' }, { id: 'c' }],
    )).toEqual([{ id: 'a' }, { id: 'b', value: 'fresh' }, { id: 'c' }])
  })
})
