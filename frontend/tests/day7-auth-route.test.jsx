import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { AuthContext, useAuth } from '../src/context/auth-context.js'
import { ProtectedRoute } from '../src/components/auth/ProtectedRoute.jsx'

const authMocks = vi.hoisted(() => ({
  refreshAccessToken: vi.fn(),
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  subscriber: null,
}))

vi.mock('../src/api/auth.api', () => ({
  authApi: {
    refreshAccessToken: authMocks.refreshAccessToken,
    getCurrentUser: authMocks.getCurrentUser,
    login: authMocks.login,
    logout: authMocks.logout,
  },
}))
vi.mock('../src/api/tokenStore', () => ({
  tokenStore: {
    subscribe: vi.fn((callback) => { authMocks.subscriber = callback; return () => { authMocks.subscriber = null } }),
    set: vi.fn((token) => authMocks.subscriber?.(token)),
    clear: vi.fn(() => authMocks.subscriber?.(null)),
  },
}))

import { AuthProvider } from '../src/context/AuthProvider.jsx'

function AuthState() {
  const auth = useAuth()
  return <p>{auth.isInitializing ? 'restoring' : auth.isAuthenticated ? `ready:${auth.user.name}` : 'anonymous'}</p>
}

function AuthRaceState() {
  const auth = useAuth()
  return <><p>{auth.user?.name || 'anonymous'}</p><button onClick={() => auth.login({ email: 'new@example.com', password: 'Password123!' })}>Login now</button></>
}

function renderProtected(value, initial = '/creator/dashboard') {
  return render(<AuthContext.Provider value={value}><MemoryRouter initialEntries={[initial]}><Routes><Route path="/login" element={<p>Login screen</p>} /><Route path="/403" element={<p>Forbidden screen</p>} /><Route element={<ProtectedRoute role="creator" />}><Route path="/creator/dashboard" element={<p>Creator dashboard</p>} /></Route></Routes></MemoryRouter></AuthContext.Provider>)
}

describe('Day 7 authentication and role route regression', () => {
  beforeEach(() => {
    authMocks.refreshAccessToken.mockReset()
    authMocks.getCurrentUser.mockReset()
    authMocks.login.mockReset()
    authMocks.logout.mockReset()
    authMocks.subscriber = null
  })

  test('restores a refresh-cookie session before exposing protected state', async () => {
    authMocks.refreshAccessToken.mockResolvedValue({ accessToken: 'access-token' })
    authMocks.getCurrentUser.mockResolvedValue({ user: { id: 'user-1', displayName: 'Amara', roles: ['VIEWER', 'CREATOR'] } })
    render(<AuthProvider><AuthState /></AuthProvider>)
    expect(screen.getByText('restoring')).toBeInTheDocument()
    expect(await screen.findByText('ready:Amara')).toBeInTheDocument()
  })

  test('does not let a stale session restore overwrite a newer login', async () => {
    let resolveRefresh
    authMocks.refreshAccessToken.mockImplementation(() => new Promise((resolve) => { resolveRefresh = resolve }))
    authMocks.getCurrentUser.mockResolvedValue({ user: { id: 'old-user', displayName: 'Old account', roles: ['VIEWER'] } })
    authMocks.login.mockResolvedValue({ accessToken: 'new-token', user: { id: 'new-user', displayName: 'New account', roles: ['VIEWER'] } })

    render(<AuthProvider><AuthRaceState /></AuthProvider>)
    fireEvent.click(screen.getByRole('button', { name: 'Login now' }))
    expect(await screen.findByText('New account')).toBeInTheDocument()

    resolveRefresh({ accessToken: 'old-token' })
    await waitFor(() => expect(authMocks.getCurrentUser).toHaveBeenCalled())
    expect(screen.getByText('New account')).toBeInTheDocument()
  })

  test('redirects anonymous users to login', async () => {
    renderProtected({ isAuthenticated: false, isInitializing: false, hasRole: () => false })
    expect(await screen.findByText('Login screen')).toBeInTheDocument()
  })

  test('redirects an authenticated user without the requested role to 403', async () => {
    renderProtected({ isAuthenticated: true, isInitializing: false, hasRole: () => false })
    expect(await screen.findByText('Forbidden screen')).toBeInTheDocument()
  })

  test('renders a protected route only when the role is present', async () => {
    renderProtected({ isAuthenticated: true, isInitializing: false, hasRole: (role) => role === 'creator' })
    await waitFor(() => expect(screen.getByText('Creator dashboard')).toBeInTheDocument())
  })
})
