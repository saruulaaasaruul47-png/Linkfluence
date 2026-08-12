import { beforeEach, describe, expect, test, vi } from 'vitest'

const axiosMocks = vi.hoisted(() => ({ clients: [] }))

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => {
      const client = vi.fn()
      client.post = vi.fn()
      client.requestHandler = null
      client.successHandler = null
      client.errorHandler = null
      client.interceptors = {
        request: { use: vi.fn((handler) => { client.requestHandler = handler }) },
        response: { use: vi.fn((success, error) => { client.successHandler = success; client.errorHandler = error }) },
      }
      axiosMocks.clients.push(client)
      return client
    }),
  },
}))

import { tokenStore } from '../src/api/tokenStore.js'
import '../src/api/axiosClient.js'

describe('Axios refresh race protection', () => {
  beforeEach(() => {
    tokenStore.clear()
    axiosMocks.clients.forEach((client) => client.mockReset())
  })

  test('a failed old refresh cannot clear a newer login token', async () => {
    const [apiClient, refreshClient] = axiosMocks.clients
    let rejectRefresh
    refreshClient.post.mockImplementation(() => new Promise((_, reject) => { rejectRefresh = reject }))
    tokenStore.set('old-access-token')
    const expiredEvent = vi.fn()
    window.addEventListener('vyra:auth-expired', expiredEvent)

    const retry = apiClient.errorHandler({
      config: { url: '/users/me', headers: {} },
      response: { status: 401 },
    })
    tokenStore.set('new-login-token')
    rejectRefresh(new Error('Old refresh failed'))

    await expect(retry).rejects.toThrow('Old refresh failed')
    expect(tokenStore.get()).toBe('new-login-token')
    expect(expiredEvent).not.toHaveBeenCalled()
    window.removeEventListener('vyra:auth-expired', expiredEvent)
  })

  test('a successful old refresh cannot replay an old request as the new user', async () => {
    const [apiClient, refreshClient] = axiosMocks.clients
    let resolveRefresh
    refreshClient.post.mockImplementation(() => new Promise((resolve) => { resolveRefresh = resolve }))
    tokenStore.set('old-access-token')

    const retry = apiClient.errorHandler({
      config: { url: '/sensitive-mutation', method: 'post', headers: {} },
      response: { status: 401 },
    })
    tokenStore.set('new-login-token')
    resolveRefresh({ data: { data: { accessToken: 'rotated-old-token' } } })

    await expect(retry).rejects.toMatchObject({ code: 'ERR_STALE_SESSION' })
    expect(tokenStore.get()).toBe('new-login-token')
    expect(apiClient).not.toHaveBeenCalled()
  })
})
