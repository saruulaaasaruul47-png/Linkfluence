import { lazy } from 'react'
import { useAuth } from '../context/auth-context'

const MarketplaceLayout = lazy(() => import('./marketplace/MarketplaceLayout.jsx').then((module) => ({ default: module.MarketplaceLayout })))
const DashboardLayout = lazy(() => import('./dashboard/DashboardLayout.jsx').then((module) => ({ default: module.DashboardLayout })))

// Discover and Showcase are shared marketplace pages, but a signed-in creator or
// business should keep their dashboard chrome (profile, notifications, channel
// switch) instead of dropping into the logged-out marketplace navbar.
export function DiscoveryLayout() {
  const { hasRole } = useAuth()
  let lastDashboardRole = ''
  try { lastDashboardRole = window.localStorage.getItem('vyra:last-dashboard-role') || '' } catch { /* Fall back to role priority. */ }
  const dashboardRole = ['creator', 'business'].includes(lastDashboardRole) && hasRole(lastDashboardRole)
    ? lastDashboardRole
    : hasRole('business')
      ? 'business'
      : hasRole('creator')
        ? 'creator'
        : ''
  return dashboardRole ? <DashboardLayout role={dashboardRole} /> : <MarketplaceLayout />
}
