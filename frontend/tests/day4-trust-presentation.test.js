import { describe, expect, test } from 'vitest'
import {
  availabilityOptions,
  formatTrustDate,
  socialTrustPresentation,
  verifiedPayerCopy,
} from '../src/lib/trustPresentation'

describe('Day 4 trust presentation', () => {
  test('labels self-reported links as manual and unverified', () => {
    const state = socialTrustPresentation({ connectionType: 'MANUAL', syncStatus: 'MANUAL' })
    expect(state.badge).toBe('Manual · unverified')
    expect(state.canRefresh).toBe(false)
    expect(state.detail).toContain('not provider verified')
  })

  test('shows a healthy OAuth connection as provider verified', () => {
    const state = socialTrustPresentation({
      connectionType: 'API',
      syncStatus: 'HEALTHY',
      verified: true,
      lastSyncAt: '2026-08-07T00:00:00.000Z',
    })
    expect(state.badge).toBe('OAuth verified')
    expect(state.canRefresh).toBe(true)
    expect(state.needsReconnect).toBe(false)
  })

  test('explains stale statistics and allows a refresh', () => {
    const state = socialTrustPresentation({ connectionType: 'API', syncStatus: 'STALE', isStale: true })
    expect(state.badge).toBe('Stats are stale')
    expect(state.detail).toContain('24 hours')
    expect(state.canRefresh).toBe(true)
  })

  test('turns provider credential failure into an explicit reconnect action', () => {
    const state = socialTrustPresentation({ connectionType: 'API', syncStatus: 'REAUTH_REQUIRED' })
    expect(state.badge).toBe('Reconnect required')
    expect(state.needsReconnect).toBe(true)
    expect(state.canRefresh).toBe(false)
  })

  test('keeps the controlled availability values stable for API payloads', () => {
    expect(availabilityOptions.map((item) => item.value)).toEqual([
      'AVAILABLE_NOW',
      'AVAILABLE_THIS_MONTH',
      'LIMITED',
      'NOT_ACCEPTING',
    ])
  })

  test('explains Verified Payer as payment-derived trust instead of channel verification', () => {
    expect(verifiedPayerCopy(true)).toContain('funded collaboration')
    expect(verifiedPayerCopy(false)).toContain('not met')
  })

  test('handles missing capture dates without rendering an invalid date', () => {
    expect(formatTrustDate(null)).toBe('Not captured')
    expect(formatTrustDate('not-a-date')).toBe('Not captured')
  })
})
