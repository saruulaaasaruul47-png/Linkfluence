import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/auth-context'
import { Spinner } from '../ui'

export function ProtectedRoute({ role }) {
  const { isAuthenticated, isInitializing, hasRole } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return <div className="grid min-h-screen place-items-center bg-[var(--background)] text-[var(--foreground)]"><div className="text-center"><Spinner className="mx-auto" /><p className="mt-4 text-sm text-[var(--subtle)]">Restoring your session…</p></div></div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (role && !hasRole(role)) {
    return <Navigate to="/403" replace state={{ missingRole: role, from: location.pathname }} />
  }

  return <Outlet />
}
