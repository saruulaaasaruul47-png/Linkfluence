/* eslint-disable react-refresh/only-export-components -- route-level lazy components live in the app bootstrap by design */
import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/ui'
import { MarketplaceProvider } from './context/MarketplaceProvider.jsx'
import { CollaborationProvider } from './context/CollaborationProvider.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx'
import './styles/globals.css'
import { RouteMeta } from './components/RouteMeta.jsx'
import { DashboardDataProvider } from './context/DashboardDataProvider.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { LanguageProvider } from './context/LanguageProvider.jsx'
import { initializeMonitoring } from './monitoring.js'

initializeMonitoring()

const lazyNamed = (loader, name) => lazy(() => loader().then((module) => ({ default: module[name] })))

const LandingPage = lazy(() => import('./pages/landingpage/LandingPage.jsx'))
const DesignSystemPage = lazy(() => import('./pages/DesignSystemPage.jsx'))
const WelcomePage = lazy(() => import('./pages/WelcomePage.jsx'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage.jsx'))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage.jsx'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage.jsx'))
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage.jsx'))
const CreatorOnboardingPage = lazy(() => import('./pages/onboarding/CreatorOnboardingPage.jsx'))
const BusinessOnboardingPage = lazy(() => import('./pages/onboarding/BusinessOnboardingPage.jsx'))
const MarketplaceLayout = lazyNamed(() => import('./components/marketplace/MarketplaceLayout.jsx'), 'MarketplaceLayout')
const DiscoveryLayout = lazyNamed(() => import('./components/DiscoveryLayout.jsx'), 'DiscoveryLayout')
const DiscoverPage = lazy(() => import('./pages/marketplace/DiscoverPage.jsx'))
const CreatorSearchPage = lazyNamed(() => import('./pages/marketplace/SearchPages.jsx'), 'CreatorSearchPage')
const BusinessSearchPage = lazyNamed(() => import('./pages/marketplace/SearchPages.jsx'), 'BusinessSearchPage')
const CampaignSearchPage = lazyNamed(() => import('./pages/marketplace/SearchPages.jsx'), 'CampaignSearchPage')
const GlobalSearchPage = lazyNamed(() => import('./pages/marketplace/SearchPages.jsx'), 'GlobalSearchPage')
const CollectionDetailPage = lazyNamed(() => import('./pages/marketplace/LibraryPages.jsx'), 'CollectionDetailPage')
const CollectionsPage = lazyNamed(() => import('./pages/marketplace/LibraryPages.jsx'), 'CollectionsPage')
const FollowingPage = lazyNamed(() => import('./pages/marketplace/LibraryPages.jsx'), 'FollowingPage')
const SavedPage = lazyNamed(() => import('./pages/marketplace/LibraryPages.jsx'), 'SavedPage')
const ShowcaseDetailPage = lazyNamed(() => import('./pages/marketplace/LibraryPages.jsx'), 'ShowcaseDetailPage')
const ShowcasePage = lazyNamed(() => import('./pages/marketplace/LibraryPages.jsx'), 'ShowcasePage')
const ContentPostPage = lazyNamed(() => import('./pages/marketplace/LibraryPages.jsx'), 'ContentPostPage')
const BusinessProfilePage = lazyNamed(() => import('./pages/marketplace/ProfilePages.jsx'), 'BusinessProfilePage')
const CreatorProfilePage = lazyNamed(() => import('./pages/marketplace/ProfilePages.jsx'), 'CreatorProfilePage')
const MarketplaceCampaignPage = lazy(() => import('./pages/marketplace/MarketplaceCampaignPage.jsx'))
const AccountPage = lazy(() => import('./pages/marketplace/AccountPage.jsx'))
const DashboardLayout = lazyNamed(() => import('./components/dashboard/DashboardLayout.jsx'), 'DashboardLayout')
const BusinessDashboardPage = lazyNamed(() => import('./pages/dashboard/DashboardHomePages.jsx'), 'BusinessDashboardPage')
const CreatorDashboardPage = lazyNamed(() => import('./pages/dashboard/DashboardHomePages.jsx'), 'CreatorDashboardPage')
const CampaignDetailPage = lazyNamed(() => import('./pages/dashboard/CampaignDashboardPages.jsx'), 'CampaignDetailPage')
const CampaignListPage = lazyNamed(() => import('./pages/dashboard/CampaignDashboardPages.jsx'), 'CampaignListPage')
const CreateCampaignPage = lazyNamed(() => import('./pages/dashboard/CampaignDashboardPages.jsx'), 'CreateCampaignPage')
const ContractDetailPage = lazyNamed(() => import('./pages/dashboard/WorkflowPages.jsx'), 'ContractDetailPage')
const ContractListPage = lazyNamed(() => import('./pages/dashboard/WorkflowPages.jsx'), 'ContractListPage')
const CreatorProposalsPage = lazyNamed(() => import('./pages/dashboard/WorkflowPages.jsx'), 'CreatorProposalsPage')
const ProposalDetailPage = lazyNamed(() => import('./pages/dashboard/WorkflowPages.jsx'), 'ProposalDetailPage')
const ProposalListPage = lazyNamed(() => import('./pages/dashboard/WorkflowPages.jsx'), 'ProposalListPage')
const BusinessCreatorsPage = lazyNamed(() => import('./pages/dashboard/DashboardUtilityPages.jsx'), 'BusinessCreatorsPage')
const PortfolioPage = lazyNamed(() => import('./pages/dashboard/PersistedUtilityPages.jsx'), 'PortfolioPage')
const SettingsPage = lazyNamed(() => import('./pages/dashboard/PersistedUtilityPages.jsx'), 'SettingsPage')
const MessagesPage = lazyNamed(() => import('./pages/dashboard/MessagingPages.jsx'), 'MessagesPage')
const NotificationsPage = lazyNamed(() => import('./pages/dashboard/MessagingPages.jsx'), 'NotificationsPage')
const AnalyticsPage = lazyNamed(() => import('./pages/dashboard/PaymentAnalyticsPages.jsx'), 'AnalyticsPage')
const WalletPage = lazyNamed(() => import('./pages/dashboard/ApiWalletPage.jsx'), 'WalletPage')
const ContentManagementPage = lazy(() => import('./pages/dashboard/ContentManagementPage.jsx'))
const ChannelShowcaseStudioPage = lazy(() => import('./pages/dashboard/ChannelShowcaseStudioPage.jsx'))
const CreatorWorkRequestsPage = lazy(() => import('./pages/collaboration/CreatorWorkRequestsPage.jsx'))
const BusinessResponsesPage = lazy(() => import('./pages/collaboration/BusinessResponsesPage.jsx'))
const CollaborationWorkspacePage = lazy(() => import('./pages/collaboration/CollaborationWorkspacePage.jsx'))
const CollaborationListPage = lazy(() => import('./pages/collaboration/CollaborationListPage.jsx'))
const WorkOfferDialog = lazyNamed(() => import('./components/collaboration/WorkOfferDialog.jsx'), 'WorkOfferDialog')
const AdminLayout = lazyNamed(() => import('./components/admin/AdminLayout.jsx'), 'AdminLayout')
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage.jsx'))
const AdminCampaignDetailPage = lazyNamed(() => import('./pages/admin/AdminManagementPages.jsx'), 'AdminCampaignDetailPage')
const AdminChannelDetailPage = lazyNamed(() => import('./pages/admin/AdminManagementPages.jsx'), 'AdminChannelDetailPage')
const AdminContractDetailPage = lazyNamed(() => import('./pages/admin/AdminManagementPages.jsx'), 'AdminContractDetailPage')
const AdminManagementPage = lazyNamed(() => import('./pages/admin/AdminManagementPages.jsx'), 'AdminManagementPage')
const AdminUserDetailPage = lazyNamed(() => import('./pages/admin/AdminManagementPages.jsx'), 'AdminUserDetailPage')
const AdminFinancePage = lazyNamed(() => import('./pages/admin/AdminFinancePages.jsx'), 'AdminFinancePage')
const AdminDisputeDetailPage = lazyNamed(() => import('./pages/admin/AdminTrustPages.jsx'), 'AdminDisputeDetailPage')
const AdminDisputesPage = lazyNamed(() => import('./pages/admin/AdminTrustPages.jsx'), 'AdminDisputesPage')
const AdminModerationPage = lazyNamed(() => import('./pages/admin/AdminTrustPages.jsx'), 'AdminModerationPage')
const AdminReportsPage = lazyNamed(() => import('./pages/admin/AdminTrustPages.jsx'), 'AdminReportsPage')
const AdminReviewsPage = lazyNamed(() => import('./pages/admin/AdminTrustPages.jsx'), 'AdminReviewsPage')
const AdminVerificationsPage = lazyNamed(() => import('./pages/admin/AdminTrustPages.jsx'), 'AdminVerificationsPage')
const AdminAuditLogsPage = lazyNamed(() => import('./pages/admin/AdminSystemPages.jsx'), 'AdminAuditLogsPage')
const AdminNotificationsPage = lazyNamed(() => import('./pages/admin/AdminOperationalPages.jsx'), 'AdminNotificationsPage')
const AdminOperationsPage = lazyNamed(() => import('./pages/admin/AdminOperationalPages.jsx'), 'AdminOperationsPage')
const AdminSearchPage = lazyNamed(() => import('./pages/admin/AdminOperationalPages.jsx'), 'AdminSearchPage')
const AdminSettingsPage = lazyNamed(() => import('./pages/admin/AdminOperationalPages.jsx'), 'AdminSettingsPage')
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'))
const ForbiddenPage = lazyNamed(() => import('./pages/StatusPages.jsx'), 'ForbiddenPage')

function RouteFallback() {
  return <main data-theme="dark" className="grid min-h-screen place-items-center bg-ink px-5 text-white">
    <div role="status" aria-live="polite" className="w-full max-w-xl animate-pulse space-y-4">
      <span className="block h-3 w-28 rounded-full bg-pink/50" />
      <span className="block h-12 w-4/5 rounded-2xl bg-white/10" />
      <span className="block h-4 w-full rounded-full bg-white/[.06]" />
      <span className="block h-4 w-2/3 rounded-full bg-white/[.06]" />
      <span className="sr-only">Loading page…</span>
    </div>
  </main>
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <RouteMeta />
        <ToastProvider>
        <div className="app-film-grain" aria-hidden="true" />
        <ErrorBoundary><AuthProvider><MarketplaceProvider><DashboardDataProvider><CollaborationProvider><Suspense fallback={<RouteFallback />}><Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/design-system" element={<DesignSystemPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/onboarding/creator" element={<CreatorOnboardingPage />} />
            <Route path="/onboarding/business" element={<BusinessOnboardingPage />} />
          </Route>
          <Route element={<MarketplaceLayout />}>
            <Route path="/search/creators" element={<CreatorSearchPage />} />
            <Route path="/creator-search" element={<Navigate to="/search/creators" replace />} />
            <Route path="/search/businesses" element={<BusinessSearchPage />} />
            <Route path="/business-search" element={<Navigate to="/search/businesses" replace />} />
            <Route path="/search/campaigns" element={<CampaignSearchPage />} />
            <Route path="/search" element={<GlobalSearchPage />} />
            <Route path="/campaign-search" element={<Navigate to="/search/campaigns" replace />} />
            <Route path="/posts/:id" element={<ContentPostPage />} />
            <Route path="/creators/:id" element={<CreatorProfilePage />} />
            <Route path="/businesses/:id" element={<BusinessProfilePage />} />
            <Route path="/campaigns/:id" element={<MarketplaceCampaignPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/collections/:id" element={<CollectionDetailPage />} />
              <Route path="/saved" element={<SavedPage />} />
              <Route path="/following" element={<FollowingPage />} />
              <Route path="/account" element={<AccountPage />} />
            </Route>
          </Route>
          <Route element={<DiscoveryLayout />}>
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/showcase" element={<ShowcasePage />} />
            <Route path="/showcase/:id" element={<ShowcaseDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute role="creator" />}>
            <Route element={<DashboardLayout role="creator" />}>
              <Route path="/creator/dashboard" element={<CreatorDashboardPage />} />
              <Route path="/creator/discover" element={<CampaignSearchPage dashboard />} />
              <Route path="/creator/portfolio" element={<PortfolioPage />} />
              <Route path="/creator/posts" element={<ContentManagementPage role="creator" />} />
              <Route path="/creator/showcase" element={<ChannelShowcaseStudioPage role="creator" />} />
              <Route path="/creator/campaigns" element={<CampaignListPage role="creator" />} />
              <Route path="/creator/campaigns/:id" element={<CampaignDetailPage role="creator" />} />
              <Route path="/creator/invitations" element={<Navigate to="/creator/work-requests" replace />} />
              <Route path="/creator/invitations/:id" element={<Navigate to="/creator/work-requests" replace />} />
              <Route path="/creator/work-requests" element={<CreatorWorkRequestsPage />} />
              <Route path="/creator/collaborations" element={<CollaborationListPage role="creator" />} />
              <Route path="/creator/collaborations/:workspaceId" element={<CollaborationWorkspacePage role="creator" />} />
              <Route path="/creator/proposals" element={<CreatorProposalsPage />} />
              <Route path="/creator/contracts" element={<ContractListPage role="creator" />} />
              <Route path="/creator/contracts/:id" element={<ContractDetailPage role="creator" />} />
              <Route path="/creator/messages" element={<MessagesPage role="creator" />} />
              <Route path="/creator/analytics" element={<AnalyticsPage role="creator" />} />
              <Route path="/creator/wallet" element={<WalletPage role="creator" />} />
              <Route path="/creator/notifications" element={<NotificationsPage role="creator" />} />
              <Route path="/creator/settings" element={<SettingsPage role="creator" />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute role="business" />}>
            <Route element={<DashboardLayout role="business" />}>
              <Route path="/business/dashboard" element={<BusinessDashboardPage />} />
              <Route path="/business/campaigns" element={<CampaignListPage role="business" />} />
              <Route path="/business/posts" element={<ContentManagementPage role="business" />} />
              <Route path="/business/showcase" element={<ChannelShowcaseStudioPage role="business" />} />
              <Route path="/business/campaigns/new" element={<CreateCampaignPage />} />
              <Route path="/business/campaigns/:id" element={<CampaignDetailPage role="business" />} />
              <Route path="/business/creators" element={<BusinessCreatorsPage />} />
              <Route path="/business/shortlist" element={<BusinessCreatorsPage mode="shortlist" />} />
              <Route path="/business/compare" element={<BusinessCreatorsPage mode="compare" />} />
              <Route path="/business/proposals" element={<ProposalListPage role="business" />} />
              <Route path="/business/proposals/:id" element={<ProposalDetailPage role="business" />} />
              <Route path="/business/responses" element={<BusinessResponsesPage />} />
              <Route path="/business/incoming-responses" element={<Navigate to="/business/responses" replace />} />
              <Route path="/business/collaborations" element={<CollaborationListPage role="business" />} />
              <Route path="/business/collaborations/:workspaceId" element={<CollaborationWorkspacePage role="business" />} />
              <Route path="/business/contracts" element={<ContractListPage role="business" />} />
              <Route path="/business/contracts/:id" element={<ContractDetailPage role="business" />} />
              <Route path="/business/messages" element={<MessagesPage role="business" />} />
              <Route path="/business/analytics" element={<AnalyticsPage role="business" />} />
              <Route path="/business/payments" element={<WalletPage role="business" />} />
              <Route path="/business/notifications" element={<NotificationsPage role="business" />} />
              <Route path="/business/settings" element={<SettingsPage role="business" />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute role="admin" />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/users" element={<AdminManagementPage section="users" />} />
              <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} />
              <Route path="/admin/channels" element={<AdminManagementPage section="channels" />} />
              <Route path="/admin/channels/:channelId" element={<AdminChannelDetailPage />} />
              <Route path="/admin/creators" element={<AdminManagementPage section="creators" />} />
              <Route path="/admin/businesses" element={<AdminManagementPage section="businesses" />} />
              <Route path="/admin/campaigns" element={<AdminManagementPage section="campaigns" />} />
              <Route path="/admin/campaigns/:campaignId" element={<AdminCampaignDetailPage />} />
              <Route path="/admin/contracts" element={<AdminManagementPage section="contracts" />} />
              <Route path="/admin/contracts/:contractId" element={<AdminContractDetailPage />} />
              <Route path="/admin/finance" element={<AdminFinancePage section="overview" />} />
              <Route path="/admin/finance/wallet" element={<AdminFinancePage section="wallet" />} />
              <Route path="/admin/finance/transactions" element={<AdminFinancePage section="transactions" />} />
              <Route path="/admin/finance/revenue" element={<Navigate to="/admin/finance" replace />} />
              <Route path="/admin/finance/payouts" element={<Navigate to="/admin/finance/wallet" replace />} />
              <Route path="/admin/finance/refunds" element={<Navigate to="/admin/finance/transactions?view=refunds" replace />} />
              <Route path="/admin/payments" element={<Navigate to="/admin/finance" replace />} />
              <Route path="/admin/payouts" element={<Navigate to="/admin/finance/wallet" replace />} />
              <Route path="/admin/refunds" element={<Navigate to="/admin/finance/transactions?view=refunds" replace />} />
              <Route path="/admin/transactions" element={<Navigate to="/admin/finance/transactions" replace />} />
              <Route path="/admin/commissions" element={<Navigate to="/admin/finance" replace />} />
              <Route path="/admin/barter-fees" element={<Navigate to="/admin/finance" replace />} />
              <Route path="/admin/disputes" element={<AdminDisputesPage />} />
              <Route path="/admin/disputes/:disputeId" element={<AdminDisputeDetailPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/content-moderation" element={<AdminModerationPage />} />
              <Route path="/admin/verifications" element={<AdminVerificationsPage />} />
              <Route path="/admin/reviews" element={<AdminReviewsPage />} />
              <Route path="/admin/search" element={<AdminSearchPage />} />
              <Route path="/admin/operations" element={<AdminOperationsPage />} />
              <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
              <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes></Suspense><Suspense fallback={null}><WorkOfferDialog /></Suspense></CollaborationProvider></DashboardDataProvider></MarketplaceProvider></AuthProvider></ErrorBoundary>
        </ToastProvider>
      </LanguageProvider>
    </BrowserRouter>
  </StrictMode>,
)
