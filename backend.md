# Backend Analysis and Implementation Plan

> Шинжилгээ хийсэн огноо: 2026-07-30  
> Хамрах хүрээ: `frontend/src`, `frontend/package.json`, `backend/src`, `backend/prisma`, `backend/tests`, backend configuration болон seed/documentation.  
> Энэ audit хийх үед backend source code өөрчлөөгүй.

## 1. Project Overview

Influence Hub буюу VYRA нь Creator болон Business сувгийг нэг User account-аас удирдаж, marketplace discovery, campaign, proposal, offer, collaboration workspace, contract, payment, messaging, analytics болон admin operations хийх frontend бүхий influencer marketplace төсөл байна.

Frontend:

- React 19
- React Router
- Axios
- Tailwind CSS
- Motion/ReactBits төрлийн visual effect
- Context provider + LocalStorage state
- Vite

Backend:

- Node.js
- Express 5
- PostgreSQL
- Prisma 7 + `@prisma/adapter-pg`
- JWT access/refresh token
- bcrypt
- Zod
- Multer
- Resend
- Supertest + Node test runner

Одоогийн бодит төлөв:

- Frontend 121 source asset/file, 70 орчим route/redirect, public marketplace, хоёр channel dashboard, admin console агуулж байна.
- Frontend-ийн authentication, personal account, creator profile, business profile гэсэн 20 API call backend-тэй холбогдсон.
- Marketplace, dashboard, collaboration болон admin-ийн үндсэн state нь `MarketplaceProvider`, `DashboardDataProvider`, `CollaborationProvider`, `data/*.js` дээр mock/LocalStorage хэлбэрээр байна.
- Backend runtime дээр `auth`, `users`, `creator`, `business` гэсэн 4 module mount хийгдсэн.
- Prisma schema 25 model агуулдаг боловч profile-аас бусад domain model-д route/controller/service/repository байхгүй.
- Backend-ийн одоо байгаа 18 integration test бүгд амжилттай.
- Prisma schema valid, 6 migration database-д applied.
- Frontend lint, 3 validation test, production build амжилттай.
- Backend нь хэсэгчилсэн modular monolith боловч бүх frontend business domain-ийг хэрэгжүүлээгүй тул production-д бэлэн биш.
- Backend runtime TypeScript compiler ашиглаж, `.ts` Prisma client/config import хийж байгаа нь “backend бүх код JavaScript байна” гэсэн шаардлагыг зөрчиж байна.

## 2. Frontend Analysis

### 2.1 Route inventory

#### Public, authentication, onboarding

| Route | Page | Гол action | Backend хэрэгцээ |
|---|---|---|---|
| `/` | `LandingPage` | Our work/Discover/Services anchor, sign in/get started | Navigation only |
| `/design-system` | `DesignSystemPage` | UI demo dialog/drawer/theme/mock invite | Production backend шаардлагагүй demo |
| `/login` | `LoginPage` | Login, keep signed in, password show/hide, forgot link, Google button | Login хийсэн; remember/Google дутуу |
| `/register` | `RegisterPage` | Register, terms consent | Register хийсэн; consent хадгалахгүй |
| `/verify-email` | `VerifyEmailPage` | OTP verify, resend | Хийгдсэн |
| `/forgot-password` | `ForgotPasswordPage` | Email submit, reset preview | Backend огт холбогдоогүй |
| `/403` | `ForbiddenPage` | Back | Navigation only |
| `/welcome` | `WelcomePage` | Creator/Business channel/Explore сонгох | Navigation; authenticated |
| `/onboarding/creator` | `CreatorOnboardingPage` | 6-step creator setup, avatar/cover/sample, socials/rates | Profile API хэсэгчлэн; cover/sample upload дутуу |
| `/onboarding/business` | `BusinessOnboardingPage` | 4-step business setup, logo/cover, preferences | Profile API хэсэгчлэн; logo/cover upload дутуу |
| `*` | `NotFoundPage` | Discover/back | Navigation only |

#### Marketplace

| Route | Page | Гол action |
|---|---|---|
| `/discover` | `DiscoverPage` | Hero search, category/creator/business/campaign/showcase/collection browse |
| `/search` | `GlobalSearchPage` | Grouped query |
| `/search/creators` | `CreatorSearchPage` | Query, niche/platform/follower/engagement/rating/price/verified filter, sort |
| `/search/businesses` | `BusinessSearchPage` | Query, industry/rating/campaign/verified filter, sort |
| `/search/campaigns` | `CampaignSearchPage` | Query, niche/platform/goal/budget/deadline/open filter, sort |
| `/creator-search`, `/business-search`, `/campaign-search` | Redirect | Canonical search route руу redirect |
| `/showcase` | `ShowcasePage`/`ShowcaseFeed` | Contents/Following feed, category, reshuffle, like/save/share/follow/view |
| `/showcase/:id` | `ShowcaseDetailPage` | View, save, share, creator view |
| `/categories` | `CategoriesPage` | Category-аар creator search |
| `/creators/:id` | `CreatorProfilePage` | Follow, save, offer, social link, portfolio, rating |
| `/businesses/:id` | `BusinessProfilePage` | Follow, save, pitch/request channel, campaign view |
| `/campaigns/:id` | `MarketplaceCampaignPage` | Campaign view, apply/request channel |
| `/collections` | `CollectionsPage` | List/create collection |
| `/collections/:id` | `CollectionDetailPage` | Rename, description/visibility update, delete, remove item, share |
| `/saved` | `SavedPage` | Saved list, add to collection |
| `/following` | `FollowingPage` | Followed channel list |
| `/account` | `AccountPage` | Personal profile, avatar, creator/business edit/delete, account delete |

#### Creator dashboard

| Route | Page | Гол action |
|---|---|---|
| `/creator/dashboard` | `CreatorDashboardPage` | Metrics, campaign/workspace/message/deadline navigation |
| `/creator/discover` | Dashboard campaign search | Campaign filter/search/view |
| `/creator/portfolio` | `PortfolioPage` | Add/edit/delete/publish portfolio, media kit download |
| `/creator/campaigns` | `CampaignListPage` | Filter/view campaigns |
| `/creator/campaigns/:id` | `CampaignDetailPage` | Submit/edit proposal, open workspace |
| `/creator/work-requests` | `CreatorWorkRequestsPage` | Interested, counter, decline offer |
| `/creator/invitations*` | Redirect | Work requests route руу redirect |
| `/creator/collaborations` | `CollaborationListPage` | Filter/open workspace |
| `/creator/collaborations/:workspaceId` | `CollaborationWorkspacePage` | Negotiation, approvals, files, deliverables, review, activity |
| `/creator/proposals` | `CreatorProposalsPage` | List/view/withdraw proposal |
| `/creator/contracts` | `ContractListPage` | List/view |
| `/creator/contracts/:id` | `ContractDetailPage` | Frontend-only sign preview |
| `/creator/messages` | `MessagesPage` | Thread search/read/send/edit/delete/attachment |
| `/creator/analytics` | `AnalyticsPage` | Date range, metric/chart, CSV export |
| `/creator/wallet` | `WalletPage` | Transaction, payment method, payout/refund |
| `/creator/notifications` | `NotificationsPage` | Read/read all/filter |
| `/creator/settings` | `SettingsPage` | Channel update, preference, password, channel delete |

#### Business dashboard

| Route | Page | Гол action |
|---|---|---|
| `/business/dashboard` | `BusinessDashboardPage` | Metrics, campaign/creator/proposal/workspace navigation |
| `/business/campaigns` | `CampaignListPage` | Filter/view/create |
| `/business/campaigns/new` | `CreateCampaignPage` | 4-step campaign draft wizard |
| `/business/campaigns/:id` | `CampaignDetailPage` | Inline edit/status/deadline/delete, proposals/workspace |
| `/business/creators` | `BusinessCreatorsPage` | Search/filter/sort, shortlist, compare, invite, offer, view |
| `/business/shortlist` | `BusinessCreatorsPage` | Shortlisted creators |
| `/business/compare` | `BusinessCreatorsPage` | Compared creators |
| `/business/proposals` | `ProposalListPage` | List/filter/view |
| `/business/proposals/:id` | `ProposalDetailPage` | Accept/decline/decision |
| `/business/responses` | `BusinessResponsesPage` | Approve offer, request changes, decline |
| `/business/incoming-responses` | Redirect | Responses route руу redirect |
| `/business/collaborations` | `CollaborationListPage` | Filter/open workspace |
| `/business/collaborations/:workspaceId` | `CollaborationWorkspacePage` | Agreement lock, contract/payment, task/file/deliverable review |
| `/business/contracts` | `ContractListPage` | List/view |
| `/business/contracts/:id` | `ContractDetailPage` | Frontend-only sign preview |
| `/business/messages` | `MessagesPage` | Conversation CRUD action |
| `/business/analytics` | `AnalyticsPage` | Date range/CSV |
| `/business/payments` | `WalletPage` | Payment method/transaction/refund |
| `/business/notifications` | `NotificationsPage` | Read state |
| `/business/settings` | `SettingsPage` | Profile/preference/password/delete |

#### Admin

| Route family | Page/feature | Гол action |
|---|---|---|
| `/admin/dashboard` | `AdminDashboardPage` | Platform metrics, trust queue, quick navigation |
| `/admin/users`, `/:userId` | Management/detail | Search/filter/page, suspend/restore/delete, impersonation preview |
| `/admin/channels`, `/:channelId` | Management/detail | Verify/reject/restrict/feature/change owner/suspend/delete |
| `/admin/creators` | Management | Creator search/filter/action |
| `/admin/businesses` | Management | Business search/filter/action |
| `/admin/campaigns`, `/:campaignId` | Management/detail | Publish/pause/hide/cancel/visibility |
| `/admin/contracts`, `/:contractId` | Management/detail | Freeze/terminate, ledger/conversation/payment action |
| `/admin/payments` | Finance center | Payment/transaction/commission tab, filter, drawer, export/refund |
| `/admin/transactions`, `/admin/commissions` | Redirect | Payment query tab руу redirect |
| `/admin/refunds` | Refund queue | Search/filter/detail/decision |
| `/admin/disputes`, `/:disputeId` | Dispute workflow | Evidence, internal note, request, resolve/escalate/close |
| `/admin/reports` | Reports | Resolve/escalate/dismiss |
| `/admin/content-moderation` | Moderation | Approve/hide/remove |
| `/admin/verifications` | Verification | Document view, approve/reject |
| `/admin/reviews` | Review moderation | Hide/restore/remove |
| `/admin/search` | Global admin search | Users/channels/contracts etc. |
| `/admin/operations` | Mutation center | Resource tab, reason, controlled action |
| `/admin/notifications` | Announcements | Draft/preview/audience/channel/send |
| `/admin/audit-logs` | Audit | Search/filter/detail read-only |
| `/admin/settings` | System setting | Platform/marketplace/finance/security setting update |

### 2.2 Component inventory

| Group | Files/components | Backend relation |
|---|---|---|
| Auth | `AuthLayout`, `AuthIntro`, `ProtectedRoute` | Session/role response ашиглана |
| Onboarding | `OnboardingLayout`, `StepHeading`, `StepActions`, `ReviewList` | Form state/profile API |
| Marketplace layout | `MarketplaceLayout`, `PageHero`, `SectionHeader`, `NoResults` | Account/channel/session, search data |
| Marketplace discovery | `HeroSearch`, `EditorialCategories`, `HorizontalCarousel`, `FeaturedSection`, `TrendingSection`, `RecommendationSection` | Discovery/search endpoints |
| Marketplace cards | `CreatorCard`, `BusinessCard`, `CampaignCard`, `CategoryCard`, `CollectionCard`, `ContentCard`, `ShowcaseCard` | View/save/follow/share/offer endpoint |
| Marketplace feature | `SearchFilters`, `ShowcaseFeed`, `MarketplaceItem`, `MarketplaceImage` | Query/feed/library endpoints |
| Collaboration | `WorkOfferDialog` | Offer create endpoint |
| Dashboard | `DashboardLayout`, `DashboardHeader`, `DashboardPanel`, chart/stat UI | Role-scoped aggregate endpoints |
| Admin | `AdminLayout`, `AdminDataPage`, `AdminHeader`, `AdminPanel`, `AdminStat`, `DangerAction`, tabs/tables | Admin query/mutation/audit endpoints |
| Navigation | `SidebarNavItem`, `RouteMeta`, `BrandLogo` | Navigation only |
| UI primitives | `Avatar`, `Badge`, `Button`, `Card`, `Checkbox`, `Dialog`, `Drawer`, `Dropdown`, `EmptyState`, `FeatureUnavailable`, `FileUpload`, `Input`, `Select`, `Skeleton`, `Spinner`, `Switch`, `Tabs`, `Textarea`, `Toast`, `Tooltip` | Өөрөө endpoint шаардахгүй; parent action дамжуулна |
| Visual-only | Landing `BlurText`, `CreatorStack`, `Magnet`, `Noise`, `ScrollReveal`, `SpotlightCard`; `ReactBitsEffects`, `TextType` | Backend operation байхгүй |
| Safety | `ErrorBoundary` | Render failure; API error handler биш |

### 2.3 Frontend data flow

1. `AuthProvider`:
   - Access token memory-д `tokenStore` ашиглана.
   - Refresh token browser HTTP-only cookie-д байна.
   - App start үед `/auth/refresh` дараа `/auth/me`.
   - 401 үед Axios interceptor нэг refresh promise ашиглан request retry хийнэ.
2. `MarketplaceProvider`:
   - `saved`, `following`, `collections`, `recent`, account snapshot LocalStorage-д.
   - Save/follow/share/collection/recent action backend руу явахгүй.
3. `DashboardDataProvider`:
   - Portfolio, campaign, proposal, shortlist, compare, invitation, payment method, payout, refund, analytics event, conversation, message, notification LocalStorage-д.
4. `CollaborationProvider`:
   - Offer/workspace/notification болон state transition бүхэлдээ LocalStorage-д.
5. `data/marketplace.js`, `data/dashboard.js`, `data/admin.js`:
   - Runtime UI-ийн гол source.
6. `useOnboardingDraft`:
   - Onboarding draft LocalStorage-д; finish үед profile API дуудна.
7. `api/*.js`:
   - Зөвхөн auth/user/creator/business endpoint ашиглана.
8. `lib/api-client.js`:
   - `apiRequest`, `optimisticMutation` тодорхойлсон боловч import/use байхгүй.

### 2.4 Forms, modal, tables, loading/error/empty

- Authentication form: register/login/verify; backend field error `details`-тэй таарна.
- Forgot password: frontend-only.
- Creator onboarding: cover/sample file сонгодог боловч binary upload хийдэггүй.
- Business onboarding: logo/cover сонгодог боловч payload-д оруулахгүй.
- Campaign wizard/proposal dialog: LocalStorage.
- Offer dialog/response dialogs: LocalStorage.
- Collaboration workspace forms: negotiation, agreement/contract change note, file, deliverable, review, activity бүгд LocalStorage.
- Portfolio CRUD dialog: LocalStorage.
- Messaging composer/edit/delete: LocalStorage.
- Payment method/payout/refund dialog: LocalStorage.
- Admin `AdminDataPage`: simulated 500 ms loading, client search/filter/pagination, mock row/table/drawer.
- Reusable skeleton/spinner/empty state байна; бодит API list endpoint-ууд байхгүй тул ихэнх loading/error state simulated.
- `ErrorBoundary` нь component render error барина; domain API error state орлохгүй.

## 3. Existing Backend Analysis

### 3.1 Runtime structure

```text
backend/
  src/
    app.js
    server.js
    config/
      cors.js
      database.js
      env.js
    routes/index.js
    modules/
      auth/
      users/
      creator/
      business/
    shared/
      constants/
      errors/
      middleware/
      utils/
    notification/
  prisma/
    schema.prisma
    migrations/
    seed-admin.js
    seed-demo-accounts.js
  tests/integration/
```

### 3.2 Existing module audit

#### `auth`

- Route: register, verify email, resend OTP, login, refresh, logout, current user.
- Controller: HTTP/cookie/response mapping; business logic агуулаагүй.
- Service: credential, OTP, status, JWT, refresh rotation logic.
- Repository: бүх Prisma query, transaction.
- Validation: Zod body schema.
- Mapper: sensitive field хассан user DTO.
- Email: Resend adapter болон test code memory.
- Давуу тал: repository boundary сайн; hashed OTP/token; verified/disabled state; common error.
- Дутуу: forgot/reset password, logout all, refresh token family reuse response, account lockout, Google OAuth.

#### `users`

- Route: current profile get/update, avatar, password, account delete.
- Controller/service/repository/schema/mapper бүрэн layer-тэй.
- Password change нь refresh token revoke, `sessionVersion` increment хийнэ.
- Account delete soft delete хийнэ.
- Дутуу: delete confirmation/current password, active contract/payment check, logout-all тусдаа endpoint, user admin management.

#### `creator`

- Authenticated owner profile create/get/update/delete.
- Social link, rates, metadata-г mapper/service-ээр Prisma shape руу хөрвүүлнэ.
- Repository transaction дотор role sync.
- Дутуу: public profile/list/search, portfolio route, cover/sample upload, URL validation, channel-level permission abstraction.

#### `business`

- Authenticated owner profile create/get/update/delete.
- Preferences JSON mapping, role sync.
- Дутуу: public profile/list/search, logo/cover upload, business campaigns болон ownership policy.

### 3.3 Shared/config

| File | Үүрэг | Audit |
|---|---|---|
| `src/app.js` | Express middleware/mount | Helmet, CORS, body limit, cookie, static upload, global errors зөв |
| `src/server.js` | DB connect/listen/shutdown | Graceful SIGINT/SIGTERM байна |
| `src/config/env.js` | Zod env validation | Гол secret/config шалгана; storage/payment/logger env байхгүй |
| `src/config/database.js` | Prisma adapter/client | `.ts` generated client import; JS-only requirement зөрчинө |
| `src/config/cors.js` | Single client origin | Development-д хангалттай; multi-origin production config байхгүй |
| `authenticate.js` | Access token authentication | `authService`-г shared layer-ээс шууд import хийсэн |
| `authorize.js` | Role middleware | Код байна, runtime route дээр ашиглагдаагүй |
| `avatarUpload.js` | Local disk avatar | MIME/5 MB/UUID; content sniff/virus/object storage байхгүй |
| `validate.js` | Zod envelope | Body validation сайн; одоогийн route-д params/query schema байхгүй |
| `errorHandler.js` | App/Prisma/JWT/Multer mapping | Common envelope; requestId/log redaction байхгүй |
| `rateLimiters.js` | Auth route rate limit | Register/login/OTP/refresh дээр байна |

### 3.4 Prisma entity

Одоо байгаа 25 model:

`User`, `AuthToken`, `VerificationCode`, `CreatorProfile`, `BusinessProfile`, `SocialAccount`, `PortfolioItem`, `Campaign`, `Proposal`, `WorkOffer`, `Collaboration`, `Contract`, `ContractVersion`, `Deliverable`, `Conversation`, `ConversationMember`, `Message`, `Notification`, `Follow`, `Collection`, `CollectionItem`, `Payment`, `Review`, `TrustCase`, `AnalyticsEvent`, `AdminAction`.

Эдгээрээс runtime repository ашигладаг нь:

- `User`
- `AuthToken`
- `VerificationCode`
- `CreatorProfile`
- `BusinessProfile`
- `SocialAccount`

`PortfolioItem`-аас `AdminAction` хүртэлх бусад domain model API layer-гүй.

### 3.5 Configuration, legacy, unused

- `backend/app.js` нь legacy Express listener эхлүүлээд `src/server.js` import хийдэг; package script ашиглахгүй боловч буруу entrypoint болж болно.
- `backend/config/database.js`, `backend/config/env.js`, `src/notification/email.template.js`, `dockerfile` хоосон.
- `src/notification/email.service.js` import хийхэд шууд test email илгээх IIFE side effect-тэй, runtime-д import хийгдээгүй.
- `lib/prisma.ts`, `prisma.config.ts`, `tsconfig.json`, `tsx`, `typescript`, generated `.ts` client нь JS-only шаардлагыг зөрчинө.
- `authorize.js` route дээр ашиглагдаагүй.
- `authRepository.deleteExpiredAuthTokens`, `deleteExpiredVerificationCodes`, `revokeUserRefreshTokens` runtime job/route-аар ашиглагдаагүй.
- `frontend/src/lib/api-client.js` ашиглагдаагүй.

## 4. Completed Features

### Feature: Register + email verification

```text
Related frontend page: /register, /verify-email
Backend module: auth
Endpoint: POST /auth/register, POST /auth/verify-email, POST /auth/resend-otp
Database entities: User, VerificationCode, AuthToken
Current status: Completed
Testing status: Integration test хийгдсэн, pass
```

### Feature: Login/session lifecycle

```text
Related frontend page: /login, бүх protected route
Backend module: auth
Endpoint: POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/me
Database entities: User, AuthToken
Current status: Completed for current-device session; family reuse/logout-all байхгүй
Testing status: Login, rotate, old token reject, logout, disabled account test pass
```

### Feature: Personal account

```text
Related frontend page: /account, creator/business settings
Backend module: users
Endpoint: GET/PATCH /users/me, PATCH /users/me/avatar, PATCH /users/me/password, DELETE /users/me
Database entities: User, AuthToken
Current status: Completed for current frontend calls
Testing status: Profile/avatar/password/delete integration test pass
```

### Feature: Creator channel profile

```text
Related frontend page: /onboarding/creator, /account, /creator/settings
Backend module: creator
Endpoint: POST/GET/PATCH/DELETE /creator/profile
Database entities: User, CreatorProfile, SocialAccount
Current status: Completed for text/profile payload; media/portfolio тусдаа дутуу
Testing status: CRUD + role sync integration test pass
```

### Feature: Business channel profile

```text
Related frontend page: /onboarding/business, /account, /business/settings
Backend module: business
Endpoint: POST/GET/PATCH/DELETE /business/profile
Database entities: User, BusinessProfile
Current status: Completed for text/profile payload; logo/cover upload дутуу
Testing status: CRUD + role sync integration test pass
```

## 5. Partially Completed Features

### Authentication

- Хийгдсэн: register, login, access/refresh JWT, rotation, email OTP/resend, logout, current user, password change.
- Дутуу: forgot/reset, logout all, remember-me policy, Google OAuth, failed-login lockout.
- Эрсдэл: revoked refresh token дахин ашиглагдахад тухайн token reject болохоос token family бүхэлдээ revoke болохгүй.
- Frontend integration: одоо байгаа auth flow холбоотой; forgot/Google UI холбогдоогүй.
- Дуусгах: `PASSWORD_RESET` purpose/OTP grant, session family, security event/audit нэмэх.

### Creator onboarding

- Хийгдсэн: profile/social/rate metadata, username conflict, role sync.
- Дутуу: cover/sample upload, initial `PortfolioItem`, social ownership verification.
- Эрсдэл: creator social field нь URL биш зөвхөн max length шалгадаг.
- Frontend integration: finish ажиллана; сонгосон cover/sample алга болно.
- Дуусгах: media module, URL validation, portfolio transaction.

### Business onboarding

- Хийгдсэн: business profile/preference, role sync.
- Дутуу: logo/cover upload; consent persistence.
- Эрсдэл: file UI хэрэглэгчид хадгалагдсан мэт ойлголт өгнө.
- Frontend integration: text field ажиллана.
- Дуусгах: channel media upload болон response DTO.

### Database business domain

- Хийгдсэн: campaign-аас admin audit хүртэл 19 model schema/migration-д байна.
- Дутуу: route/service/repository/business operation бүгд.
- Эрсдэл: schema байгаа нь feature ажилладаг гэсэн үг биш; frontend mock ба DB хооронд огт sync байхгүй.
- Frontend integration: боломжгүй.
- Дуусгах: dependency дарааллаар domain module үүсгэх.

### Authorization

- Хийгдсэн: access authentication, user roles, frontend role route, generic `authorize`.
- Дутуу: backend route role policy, resource ownership/participant/admin permission.
- Эрсдэл: одоогоор profile route self scoped тул аюул бага; шинэ route нэмэх үед IDOR эрсдэл өндөр.
- Дуусгах: channel ownership, resource policy, participant policy, admin middleware.

### Error/security infrastructure

- Хийгдсэн: AppError, global handler, Prisma/JWT/Multer mapping, Helmet/CORS/rate limit.
- Дутуу: request ID, structured logger, redaction, audit writer use, CSRF/origin policy for cookie mutation, file content inspection.
- Frontend integration: common error envelope таарна.
- Дуусгах: logger/audit/security middleware.

## 6. Missing Backend Features

Frontend дээр байгаа боловч runtime backend implementation огт байхгүй:

1. Forgot/reset password ба Google OAuth.
2. Public creator/business profile list/detail.
3. Marketplace discover/recommendation.
4. Global болон type-specific search/filter/sort/pagination.
5. Saved item, recently viewed, share tracking.
6. Follow/unfollow болон following feed.
7. Collection CRUD/visibility/item relation.
8. Showcase content/feed/detail/like/publish.
9. Portfolio CRUD/media upload/media kit data.
10. Campaign CRUD/publish/status/milestone.
11. Proposal submit/update/withdraw/list/decision.
12. Shortlist/compare/invitation.
13. Work offer send/counter/interest/change/decline/approve.
14. Collaboration aggregate list/detail.
15. Versioned negotiation term, agreement lock/approval/change request.
16. Contract generate/version/approval/sign/download.
17. Funding/payment provider/webhook/escrow/release.
18. Task/shared file/deliverable submit/review.
19. Collaboration activity/completion/review/showcase publish.
20. Conversation/message/read/edit/delete/attachment.
21. Notification list/read/read-all/preference/realtime.
22. Creator/business analytics aggregate/export.
23. Payment method, transaction list, wallet, payout, refund.
24. Admin dashboard aggregate.
25. Admin user/channel/creator/business/campaign/contract management.
26. Admin finance/refund/dispute/report/moderation/verification/review.
27. Admin search/operations/announcement/settings/audit API.
28. Realtime messaging/notification/workspace update.

## 7. Frontend and Backend Mapping

Доорх endpoint бүгд `/api/v1` prefix-тэй.

### 7.1 Authentication/account mapping

```text
Frontend page: /register
Frontend action: Register form submit
Expected backend operation: Pending User + OTP үүсгэж email илгээх
Expected endpoint: POST /auth/register
Existing endpoint: POST /auth/register
Implementation status: Completed
Request data: displayName, username?, email, password
Response data: email, verificationRequired, expiresInSeconds
Database entities: User, VerificationCode
Authentication: Public
Permission: Public
Validation: Email/username/password/displayName
Problem: Terms consent backend-д хадгалагдахгүй
Required work: Legal шаардлагатай бол terms version/acceptedAt нэмэх
```

```text
Frontend page: /login
Frontend action: Login, keep signed in, Google login
Expected backend operation: Credential verify, session create; optional persistent duration; OAuth
Expected endpoint: POST /auth/login, GET /auth/google, GET /auth/google/callback
Existing endpoint: POST /auth/login
Implementation status: Login Completed; remember/Google Missing
Request data: email, password, remember?
Response data: user, accessToken; refresh cookie
Database entities: User, AuthToken
Authentication: Public
Permission: Active verified account
Validation: Email/password
Problem: remember state ашиглагдахгүй, Google button toast-only
Required work: Remember policy-г тодорхойлох; Google-ийг UI scope-д оруулах эсэх шийдэх
```

```text
Frontend page: /verify-email
Frontend action: Verify 6-digit OTP, resend
Expected backend operation: Code attempts/expiry/cooldown шалгах, activate, session үүсгэх
Expected endpoint: POST /auth/verify-email, POST /auth/resend-otp
Existing endpoint: Ижил
Implementation status: Completed
Request data: email, otp / email
Response data: user, accessToken / generic success
Database entities: User, VerificationCode, AuthToken
Authentication: Public
Permission: Code owner
Validation: 6 digits, max attempts, expiry, cooldown
Problem: Frontend retryAfterSeconds-ийг error.details-ээс буруу түвшинд шалгадаг
Required work: Frontend `error.details.retryAfterSeconds` contract-ийг test-ээр баталгаажуулах
```

```text
Frontend page: /forgot-password
Frontend action: Reset email submit, OTP verify, new password
Expected backend operation: Generic reset request, OTP verify grant, password reset/session revoke
Expected endpoint: POST /auth/forgot-password, POST /auth/verify-reset-otp, POST /auth/reset-password
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: email; email+otp; resetToken+newPassword
Response data: generic success; short resetToken; success
Database entities: VerificationCode/AuthToken, User
Authentication: Public/reset grant
Permission: Code owner
Validation: Rate limit, expiry, attempt, strong password
Problem: Frontend зөвхөн нэг preview step-тэй
Required work: Backend contract батлаад frontend 3-step flow нэмэх
```

```text
Frontend page: /account, dashboard settings
Frontend action: Personal edit/avatar/password/delete
Expected backend operation: Self-scoped CRUD/session invalidation
Expected endpoint: GET/PATCH /users/me, PATCH /users/me/avatar, PATCH /users/me/password, DELETE /users/me
Existing endpoint: Ижил
Implementation status: Completed
Request data: profile fields; multipart avatar; currentPassword+newPassword
Response data: {user} эсвэл reauthenticationRequired
Database entities: User, AuthToken
Authentication: JWT
Permission: Self
Validation: Username/password/MIME/5MB
Problem: Account delete confirmation/current password болон active financial obligation check байхгүй
Required work: Destructive business guard нэмэх
```

### 7.2 Channel/profile mapping

```text
Frontend page: /welcome, /onboarding/creator, /onboarding/business
Frontend action: Channel type сонгох, creator/business profile үүсгэх
Expected backend operation: Нэг User-д нэг creator, нэг business profile үүсгэж role sync хийх
Expected endpoint: POST /creator/profile, POST /business/profile
Existing endpoint: Ижил
Implementation status: Partially completed
Request data: Onboarding text/profile fields
Response data: {profile,user}
Database entities: User, CreatorProfile/BusinessProfile, SocialAccount
Authentication: JWT
Permission: Self, тухайн profile өмнө нь байхгүй
Validation: Required name/username; field limits
Problem: Creator cover/sample, business logo/cover upload хийгдэхгүй; creator URL validation сул
Required work: Media/portfolio endpoint болон strict URL schema
```

```text
Frontend page: /account, /creator/settings, /business/settings
Frontend action: Channel edit/delete
Expected backend operation: Owner profile update; safe channel deletion
Expected endpoint: GET/PATCH/DELETE /creator/profile, GET/PATCH/DELETE /business/profile
Existing endpoint: Ижил
Implementation status: Completed for current simple profile
Request data: Role-specific editable fields
Response data: {profile} / {user}
Database entities: User, CreatorProfile, BusinessProfile, SocialAccount
Authentication: JWT
Permission: Self owner
Validation: Slug unique, body non-empty
Problem: Active campaign/collaboration/payment байхад hard delete cascade/restrict алдаа гарч болно
Required work: Dependency policy + soft channel disable
```

### 7.3 Marketplace/library mapping

```text
Frontend page: /discover, /search, /search/*
Frontend action: Discover, query, filter, sort, pagination
Expected backend operation: Public indexed query + personalized sections
Expected endpoint: GET /marketplace/discover, GET /search, GET /creators, GET /businesses, GET /campaigns
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: q, type-specific filters, sort, page/limit
Response data: items + meta/facets; grouped global result
Database entities: CreatorProfile, BusinessProfile, SocialAccount, Campaign, Review, AnalyticsEvent
Authentication: Optional JWT
Permission: Public active/published records
Validation: Query length, enum/range, sort allow-list
Problem: Бүх data JS fixture, filtering client-side
Required work: Marketplace module/repository/index/pagination
```

```text
Frontend page: /creators/:id, /businesses/:id, /campaigns/:id
Frontend action: Public detail view
Expected backend operation: Public DTO, visibility, review/portfolio/campaign aggregate
Expected endpoint: GET /creators/:id, GET /businesses/:id, GET /campaigns/:id
Existing endpoint: Байхгүй; owner-only profile endpoint өөр contract-тэй
Implementation status: Missing
Request data: path id/slug
Response data: Public profile/detail
Database entities: Profiles, SocialAccount, PortfolioItem, Review, Campaign
Authentication: Optional
Permission: Public published/active
Validation: ID/slug
Problem: Mock ID нь DB cuid-тай таарахгүй
Required work: Seed/mapping, public mapper
```

```text
Frontend page: Cards, profiles, /saved, /following
Frontend action: Save/unsave, follow/unfollow, mark viewed, share
Expected backend operation: Idempotent user interaction
Expected endpoint: PUT/DELETE /saved/:type/:id, PUT/DELETE /users/:id/follow, POST /recently-viewed, POST /shares
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: targetType,targetId,shareChannel
Response data: state/count/canonical URL
Database entities: Follow; SavedItem/RecentlyViewed/ShareEvent дутуу
Authentication: JWT except public share
Permission: Self; self-follow forbidden
Validation: Target type/existence
Problem: Follow нь User target тул нэг User-ийн creator/business channel-ийг ялгахгүй
Required work: Channel identity эсвэл typed target relation шийдэх
```

```text
Frontend page: /collections, /collections/:id
Frontend action: List/create/update/delete/share/add/remove item
Expected backend operation: Owner-scoped collection CRUD, visibility access
Expected endpoint: /collections, /collections/:id, /collections/:id/items
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: name,description,visibility,targetType,targetId
Response data: collection/items/meta/share URL
Database entities: Collection, CollectionItem
Authentication: JWT; public/unlisted read optional
Permission: Owner mutation
Validation: Name, visibility, target existence, unique item
Problem: Polymorphic target DB foreign key байхгүй
Required work: Service target resolver ба access token policy
```

```text
Frontend page: /showcase, /showcase/:id
Frontend action: Contents/following feed, category, like, save, share, creator view
Expected backend operation: Cursor content feed/reaction
Expected endpoint: GET /showcase, GET /showcase/:id, PUT/DELETE /showcase/:id/like
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: feed,category,cursor,limit
Response data: content,creator,like/save state,nextCursor
Database entities: ShowcaseContent/Reaction дутуу; PortfolioItem боломжит source
Authentication: Optional; following/like-д JWT
Permission: Published content
Validation: Cursor/category/target
Problem: Showcase-ийн canonical entity тодорхойгүй
Required work: Missing logic sectionийн шийдвэр
```

### 7.4 Campaign/proposal/offer mapping

```text
Frontend page: /business/campaigns/new, campaign list/detail
Frontend action: Draft create/edit/status/delete/filter
Expected backend operation: Owner campaign CRUD/state transition
Expected endpoint: POST /campaigns, GET/PATCH/DELETE /campaigns/:id, GET /business/campaigns
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: title,goal,niche,summary,audience,location,platform,audienceSize,deliverables,usage,rounds,guardrails,budget,deadline,open
Response data: campaign DTO/list meta
Database entities: Campaign
Authentication: JWT
Permission: Business owner
Validation: Required wizard fields, budget/deadline/status transition
Problem: Current Prisma fields and frontend payload naming differ
Required work: Mapper/DTO + campaign module
```

```text
Frontend page: Creator campaign detail/proposals; business proposals
Frontend action: Submit/edit/withdraw/view/accept/decline proposal
Expected backend operation: Proposal lifecycle
Expected endpoint: POST /campaigns/:id/proposals, PATCH /proposals/:id, POST /proposals/:id/withdraw, POST /proposals/:id/decision
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: approach,amount,timeline,deliverables; decision/note
Response data: proposal/offer
Database entities: Proposal, Campaign, WorkOffer
Authentication: JWT
Permission: Creator owns proposal; business owns campaign
Validation: Approach >=30, amount >0, deadline/open, legal transitions
Problem: Prisma `message` vs frontend `approach`; `deliverables` Json vs string
Required work: Stable request mapper
```

```text
Frontend page: /business/creators, shortlist, compare
Frontend action: Shortlist, compare, invite, send offer
Expected backend operation: User preference + campaign invitation + offer
Expected endpoint: PUT/DELETE shortlist/compare, POST /campaigns/:id/invitations, POST /offers
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: creatorId,campaignId,message,offer terms
Response data: updated state/invitation/offer
Database entities: Missing Shortlist/Comparison/Invitation; WorkOffer exists
Authentication: JWT
Permission: Business owner
Validation: Target/campaign ownership/duplicate/max compare
Problem: Compare server-side байх эсэх тодорхойгүй
Required work: Preference persistence decision
```

```text
Frontend page: WorkOfferDialog, creator work requests, business responses
Frontend action: Send, interested, counter, decline, approve, request changes
Expected backend operation: Actor/state-specific offer transition, revision audit, workspace create
Expected endpoint: POST /offers, GET /offers, POST /offers/:id/creator-response, POST /offers/:id/business-decision
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: parties,campaign?,title,contentType,budget,timeline,message,counter/final terms,decision,note
Response data: offer; approve үед collaboration
Database entities: WorkOffer, Collaboration; OfferRevision дутуу
Authentication: JWT
Permission: Exact source business/target creator
Validation: Amount/date/decision/current state
Problem: Frontend status нэр ба Prisma enum бүрэн таарахгүй (`AWAITING_BUSINESS_APPROVAL`, `BUSINESS_CHANGES_REQUESTED` байхгүй)
Required work: Нэг canonical state machine сонгох
```

### 7.5 Collaboration/contract/payment mapping

```text
Frontend page: Collaboration list/workspace Overview/Negotiation/Agreement
Frontend action: List/detail, terms save, agreement lock/approve/change
Expected backend operation: Participant-scoped aggregate, versioned terms/approval
Expected endpoint: GET /collaborations, GET /collaborations/:id, PATCH /collaborations/:id/terms, POST /collaborations/:id/agreement/*
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: terms, role decision, note
Response data: workspace aggregate/current version
Database entities: Collaboration; terms/tasks/files/activity одоогоор Json; Agreement entity дутуу
Authentication: JWT
Permission: Participant; lock зөвхөн business
Validation: Date/budget/version/state
Problem: JSON update concurrent overwrite, approval audit/version байхгүй
Required work: Normalize эсвэл optimistic version + approval tables
```

```text
Frontend page: Workspace Contract tab, contract list/detail
Frontend action: Generate/view/download/approve/change/sign preview
Expected backend operation: Agreement snapshot-аас immutable version, two-party approval
Expected endpoint: GET /contracts/:id, GET /contracts/:id/document, POST /contracts/:id/decision
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: decision,note,version
Response data: contract/version/audit/document
Database entities: Contract, ContractVersion
Authentication: JWT
Permission: Participant/admin
Validation: Agreement approved, current version
Problem: Frontend `ContractDetailPage` local sign preview; workspace provider өөр approval logic-той
Required work: Нэг contract flow болгож нэгтгэх
```

```text
Frontend page: Workspace Payment/Deliverables/Tasks/Files/Activity
Frontend action: Fund, toggle task, upload file, submit/review deliverable, add note
Expected backend operation: Payment intent/webhook; production workflow
Expected endpoint: Funding/payment webhook, task/file/deliverable/activity endpoints
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: paymentMethod; multipart file/note; review decision; task state; message
Response data: updated payment/workspace objects
Database entities: Payment, Deliverable; tasks/files/activity are Json
Authentication: JWT
Permission: Participant with role-specific action
Validation: Active contract/funded state/MIME/size/revision note
Problem: Frontend шууд `FUNDED` болгодог, payment provider тодорхойгүй
Required work: Provider adapter ба webhook idempotency
```

```text
Frontend page: Workspace completion/review/showcase
Frontend action: Approve all, complete, rate/comment, publish
Expected backend operation: Completion/release/review/content publish
Expected endpoint: POST /deliverables/:id/review, POST /collaborations/:id/reviews, POST /collaborations/:id/publish
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: decision,note,rating,comment,deliverableId/content metadata
Response data: collaboration/review/showcase
Database entities: Deliverable, Review; showcase entity дутуу
Authentication: JWT
Permission: Participant; business review/approval rule
Validation: Completed, rating 1..5, unique reviewer, approved deliverable
Problem: Хоёр тал rating хийдэг provider ба “business only rates creator” copy зөрчилтэй
Required work: Review direction rule батлах
```

### 7.6 Portfolio/message/notification/analytics/finance mapping

```text
Frontend page: /creator/portfolio
Frontend action: List/add/edit/delete/publish/media-kit export
Expected backend operation: Portfolio CRUD/media
Expected endpoint: GET/POST /creator/portfolio, PATCH/DELETE /portfolio/:id
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: title,category,description,status,multipart media
Response data: item/list
Database entities: PortfolioItem
Authentication: JWT
Permission: Creator owner
Validation: Media/title/status
Problem: Entity байна, module байхгүй
Required work: Portfolio module + upload
```

```text
Frontend page: Creator/business messages
Frontend action: Search/list thread, read, send/edit/delete, attachment
Expected backend operation: Participant conversation/message CRUD
Expected endpoint: /conversations, /conversations/:id/messages, /messages/:id
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: channelId,q,cursor,body,attachment
Response data: conversations/messages/unread meta
Database entities: Conversation, ConversationMember, Message
Authentication: JWT
Permission: Conversation participant/sender
Validation: Body-or-file, edit/delete ownership
Problem: Entity байна, API/realtime байхгүй
Required work: Messaging module, cursor pagination, event transport
```

```text
Frontend page: Notifications/settings
Frontend action: List/filter/read/read-all/preference
Expected backend operation: User notification inbox/preference
Expected endpoint: GET /notifications, PATCH read/read-all, GET/PATCH /notification-preferences
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: filter/page; preference keys
Response data: items/unreadCount/preferences
Database entities: Notification; preference entity дутуу
Authentication: JWT
Permission: Self
Validation: Type/known preference
Problem: Collaboration notification ба static notification хоёр provider-д салангид
Required work: Нэг notification source of truth
```

```text
Frontend page: Creator/business analytics
Frontend action: Range 7d/1m/3m/1y/all, chart, CSV
Expected backend operation: Role-scoped aggregate/export
Expected endpoint: GET /analytics/:role/:profileId, GET /analytics/:role/:profileId/export
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: range
Response data: metrics,series,top items / CSV
Database entities: AnalyticsEvent + domain aggregates
Authentication: JWT
Permission: Owner/admin
Validation: Range enum
Problem: Бүх metric fixture
Required work: Event taxonomy ба aggregate query
```

```text
Frontend page: Wallet/payments
Frontend action: Transaction list, payment method add/remove, payout, refund/reconcile
Expected backend operation: Finance account operation
Expected endpoint: /transactions, /payment-methods, /payouts, /refund-requests
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: providerToken,amount,paymentId,reason
Response data: masked method, balance, transaction/request
Database entities: Payment; method/payout/refund entity дутуу
Authentication: JWT
Permission: Payment party/channel owner
Validation: Balance/minimum/refundable state
Problem: UI masked data-г LocalStorage-д хадгалдаг
Required work: Payment provider tokenization, finance module
```

### 7.7 Admin mapping

```text
Frontend page: Бүх /admin route
Frontend action: Dashboard/list/search/filter/pagination/detail
Expected backend operation: Admin-scoped aggregate болон resource query
Expected endpoint: GET /admin/dashboard, GET /admin/:resource, GET /admin/:resource/:id
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: q,status,dateFrom,dateTo,page,limit,range
Response data: safe admin DTO/items/meta
Database entities: Бүх domain entity, AnalyticsEvent, TrustCase, AdminAction
Authentication: JWT
Permission: ADMIN
Validation: Resource/query allow-list
Problem: Бүх row, stats, chart mock
Required work: Admin query service-үүд
```

```text
Frontend page: Admin management/operations/trust/finance
Frontend action: Suspend/restore/delete/verify/restrict/publish/pause/hide/freeze/refund/resolve/escalate/dismiss
Expected backend operation: Controlled domain mutation + append-only audit
Expected endpoint: POST /admin/:resource/:id/actions эсвэл domain-specific decision endpoint
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: action,reason,payload
Response data: updated resource,auditId
Database entities: Target entity, TrustCase, Payment, AdminAction
Authentication: JWT
Permission: ADMIN; sensitive setting SUPER_ADMIN policy шаардлагатай
Validation: Action allow-list, state, mandatory reason
Problem: Frontend toast/local state л өөрчилнө
Required work: Domain service reuse + transaction audit
```

```text
Frontend page: Admin notifications/settings/audit
Frontend action: Announcement draft/preview/send; settings save; audit read
Expected backend operation: Audience delivery, typed settings, immutable audit
Expected endpoint: /admin/announcements, /admin/settings, /admin/audit-logs
Existing endpoint: Байхгүй
Implementation status: Missing
Request data: title,body,audience,channels; setting values
Response data: draft/delivery stats/settings/audit page
Database entities: Notification, AdminAction; Announcement/SystemSetting дутуу
Authentication: JWT
Permission: ADMIN/SUPER_ADMIN
Validation: Audience/channel/config bounds
Problem: Browser LocalStorage-д admin configuration хадгалдаг
Required work: Persistent admin modules
```

Navigation-only button, modal open/close, carousel arrow, password show/hide, tab switch, local search field debounce, browser copy/download зэрэг action нь өөрөө backend operation шаардахгүй; дээрх domain mutation/search/export action-тай давхцах үед харгалзах endpoint-д mapping хийсэн.

## 8. API Audit

### 8.1 Existing runtime endpoint

| Method | Endpoint | Module | Frontend usage | Status | Auth | Permission | Validation | Problem |
|---|---|---|---|---|---|---|---|---|
| GET | `/health` | routes | Dev/health | Completed | No | Public | None | Request ID/version detail байхгүй |
| POST | `/auth/register` | auth | Register | Completed | No | Public | Zod + rate limit | Terms consent хадгалахгүй |
| POST | `/auth/verify-email` | auth | Verify | Completed | No | Code owner | Zod + attempts | - |
| POST | `/auth/resend-otp` | auth | Verify resend | Completed | No | Pending account | Zod + rate/cooldown | Endpoint нэр verification-specific биш |
| POST | `/auth/login` | auth | Login | Completed | No | Active verified user | Zod + rate limit | Remember/lockout байхгүй |
| POST | `/auth/refresh` | auth | Axios restore/retry | Completed | Cookie | Token owner | Rate + token checks | Family reuse revoke байхгүй |
| POST | `/auth/logout` | auth | Header/sidebar logout | Completed | Cookie | Current session | Token optional | Access token шууд blacklist хийхгүй |
| GET | `/auth/me` | auth | App session | Completed | JWT | Self | Token | `/users/me`-тэй read duplicate contract |
| GET | `/users/me` | users | Account | Completed | JWT | Self | Token | `/auth/me`-тэй duplicate read |
| PATCH | `/users/me` | users | Account | Completed | JWT | Self | Zod | - |
| PATCH | `/users/me/avatar` | users | Account/creator setup | Completed | JWT | Self | MIME/5MB | Local disk, content sniff байхгүй |
| PATCH | `/users/me/password` | users | Settings | Completed | JWT | Self | Zod | Logout-all endpoint тусдаа биш |
| DELETE | `/users/me` | users | Account delete | Partially completed | JWT | Self | None | Confirmation/obligation guard байхгүй |
| POST | `/creator/profile` | creator | Onboarding | Partially completed | JWT | Self | Zod | Media/portfolio дутуу |
| GET | `/creator/profile` | creator | Account/settings | Completed | JWT | Self | Token | Public profile биш |
| PATCH | `/creator/profile` | creator | Account/settings | Partially completed | JWT | Self | Zod | URL validation сул |
| DELETE | `/creator/profile` | creator | Settings | Partially completed | JWT | Self | None | Hard delete/dependency guard |
| POST | `/business/profile` | business | Onboarding | Partially completed | JWT | Self | Zod | Logo/cover дутуу |
| GET | `/business/profile` | business | Account/settings | Completed | JWT | Self | Token | Public profile биш |
| PATCH | `/business/profile` | business | Account/settings | Completed | JWT | Self | Zod | - |
| DELETE | `/business/profile` | business | Settings | Partially completed | JWT | Self | None | Hard delete/dependency guard |

### 8.2 Required endpoint status

| Method | Endpoint | Module | Frontend usage | Status | Auth | Permission | Validation | Problem |
|---|---|---|---|---|---|---|---|---|
| POST | `/auth/forgot-password` | auth | Forgot | Missing | No | Public | Email/rate | UI preview |
| POST | `/auth/verify-reset-otp` | auth | Reset | Missing | No | Code owner | OTP | UI step байхгүй |
| POST | `/auth/reset-password` | auth | Reset | Missing | Grant | Self | Password | UI step байхгүй |
| POST | `/auth/logout-all` | auth | Security | Missing | JWT | Self | - | Session management UI байхгүй |
| GET | `/marketplace/discover` | marketplace | Discover | Missing | Optional | Public | Limit | Module байхгүй |
| GET | `/search` | marketplace | Global search | Missing | Optional | Public | q/page | Module байхгүй |
| GET | `/creators`, `/creators/:id` | marketplace | Search/profile | Missing | Optional | Public | filters/id | Owner endpoint-тэй андуурч болохгүй |
| GET | `/businesses`, `/businesses/:id` | marketplace | Search/profile | Missing | Optional | Public | filters/id | - |
| GET | `/campaigns`, `/campaigns/:id` | campaigns | Search/detail | Missing | Optional | Visibility | filters/id | - |
| PUT/DELETE | `/saved/:type/:id` | library | Save | Missing | JWT | Self | target | Entity дутуу |
| PUT/DELETE | `/users/:id/follow` | interactions | Follow | Missing | JWT | Self | target | User/channel ambiguity |
| POST | `/recently-viewed`, `/shares` | interactions | Recommendation/share | Missing | Optional | Self/public | target | Entity дутуу |
| CRUD | `/collections*` | collections | Collections | Missing | JWT/optional read | Owner | body/target | Schema байгаа, module байхгүй |
| GET/PUT/DELETE | `/showcase*` | showcase | Feed/detail/like | Missing | Optional/JWT | Published/self | cursor/target | Entity дутуу |
| CRUD | `/portfolio*` | portfolio | Creator portfolio | Missing | JWT | Creator owner | media/body | Entity байгаа |
| CRUD | `/campaigns*` | campaigns | Business campaign | Missing | JWT | Business owner | wizard/state | Entity байгаа |
| CRUD/decision | `/proposals*` | proposals | Proposal pages | Missing | JWT | Parties | body/state | Entity байгаа |
| PUT/DELETE | `/shortlist*`, `/compare*` | sourcing | Creator sourcing | Missing | JWT | Business owner | max/target | Entity дутуу |
| POST | `/campaigns/:id/invitations` | sourcing | Invite | Missing | JWT | Business owner | target | Entity дутуу |
| CRUD/decision | `/offers*` | offers | Requests/responses | Missing | JWT | Parties | state | Entity байгаа |
| GET/PATCH/POST | `/collaborations*` | collaborations | Workspace | Missing | JWT | Participant | state/version | Entity байгаа, JSON-heavy |
| GET/POST | `/contracts*` | contracts | Contract | Missing | JWT | Participant | version/state | Entity байгаа |
| POST | `/funding-intents`, `/payment-webhooks` | payments | Fund | Missing | JWT/provider | Payer/provider | signature/state | Provider тодорхойгүй |
| CRUD | `/tasks`, `/workspace-files`, `/deliverables`, `/activity` | collaborations | Workspace tabs | Missing | JWT | Participant/role | file/state | Хэсэг model/JSON |
| POST | `/collaborations/:id/reviews`, `/publish` | reviews/showcase | Completion | Missing | JWT | Participant | completed/rating | Review entity байгаа |
| CRUD | `/conversations*`, `/messages*` | messaging | Messages | Missing | JWT | Participant/sender | cursor/body | Entity байгаа |
| GET/PATCH | `/notifications*`, `/notification-preferences` | notifications | Notifications | Missing | JWT | Self | filter/keys | Preference entity дутуу |
| GET | `/analytics/:role/:id`, `/export` | analytics | Analytics | Missing | JWT | Owner/admin | range | Entity байгаа |
| CRUD | `/payment-methods`, `/payouts`, `/refund-requests`, `/transactions` | finance | Wallet/payments | Missing | JWT | Party/owner | finance rules | Entity хэсэгчлэн |
| GET/POST/PATCH | `/admin/*` | admin | Бүх admin route | Missing | JWT | ADMIN | query/action/reason | Runtime admin module байхгүй |

## 9. Database Audit

### 9.1 Existing entity coverage

| Domain | Existing entity | Coverage |
|---|---|---|
| Identity | `User`, `AuthToken`, `VerificationCode` | Одоогийн auth-д хангалттай; reset/session family дутуу |
| Channel profile | `CreatorProfile`, `BusinessProfile`, `SocialAccount` | Одоогийн нэг creator + нэг business/user model-той таарна |
| Portfolio | `PortfolioItem` | Entity байна, status/draft field ба API дутуу |
| Campaign | `Campaign`, `Proposal`, `WorkOffer` | Гол entity байна, frontend DTO/state mapping дутуу |
| Collaboration | `Collaboration`, `Contract`, `ContractVersion`, `Deliverable` | Хэсэгчилсэн; agreement approval/task/file/activity JSON |
| Communication | `Conversation`, `ConversationMember`, `Message`, `Notification` | Entity байна, API/preference/outbox дутуу |
| Library | `Follow`, `Collection`, `CollectionItem` | Save/recent/share байхгүй; follow target ambiguity |
| Finance | `Payment` | Method/payout/refund request/ledger detail дутуу |
| Trust/admin | `Review`, `TrustCase`, `AnalyticsEvent`, `AdminAction` | Generic entity байна; operational module/settings/announcement дутуу |

### 9.2 Missing entity

- `SavedItem`
- `RecentlyViewed`
- `ShareEvent`
- `Category` буюу controlled category taxonomy
- `ShowcaseContent`, `ContentReaction`
- `CreatorShortlist`, `CreatorComparison`
- `CampaignInvitation`
- `OfferRevision`
- `Agreement`, `AgreementApproval` эсвэл versioned equivalent
- `ContractApproval`
- `WorkspaceTask`, `WorkspaceFile`, `CollaborationActivity`
- `DeliverableReview`
- `NotificationPreference`
- `PaymentMethod`
- `PayoutRequest`
- `RefundRequest`
- `AdminAnnouncement`
- `SystemSetting`
- Transactional event delivery хийх бол `OutboxEvent`

### 9.3 Field/type/constraint issue

| Entity/file | Асуудал | Санал |
|---|---|---|
| `AuthToken` | `familyId`, `replacedById`, device/IP байхгүй | Refresh family/reuse/device audit field |
| `VerificationCode` | Зөвхөн `EMAIL_VERIFICATION`; resendAvailableAt байхгүй | `PASSWORD_RESET`, explicit cooldown |
| `User.roles` | Array role; channel ownership profile 1:1 | Одоогийн UI-д тохирно, гэхдээ олон ижил төрлийн channel дэмжихгүй |
| `CreatorProfile.rates`, `metadata` | JSON учир query/filter/index сул | Rate/portfolio field normalize эсвэл JSON schema/version |
| `BusinessProfile.preferences` | JSON | Хайх/analytics шаардлагатай field normalize |
| `PortfolioItem` | `status`, `deletedAt`, sort/order байхгүй | Draft/published/hidden status, soft delete |
| `Campaign.description` | Frontend `summary`; `requirements` JSON-д олон field | Request mapper; хайх field normalize |
| `Proposal.message` | Frontend `approach`; `deliverables` string/JSON зөрүү | DTO mapping ба typed shape |
| `WorkOffer.status` | Frontend status нэртэй бүрэн таарахгүй | Canonical enum/state transition |
| `Collaboration` | `terms/tasks/files/timeline/activity` JSON | Concurrency/audit шаардлагатай хэсгийг normalize |
| `Contract` | Approval timestamps байна, explicit approval/audit actor/version байхгүй | Approval entity |
| `Deliverable` | Review history нэг `reviewNote` дээр overwrite | Append-only review entity |
| `Follow` | `targetId` нь User; channel type ялгахгүй | `targetChannelId` эсвэл typed target |
| `CollectionItem` | Polymorphic target FK байхгүй | Service existence check; боломжтой бол typed join |
| `Payment` | Payment/transaction/refund/payout бүгд нэг type model-д холилдоно | Payment intent + immutable transaction ledger |
| `TrustCase` | Evidence JSON, case-specific fields generic | Эхний үед metadata schema; томрох үед subtype table |
| Бүх workflow model | Optimistic version байхгүй | Offer/Collaboration/Contract дээр `version Int` |

### 9.4 Relation/cascade/soft-delete

- User deletion нь profile болон олон relation-ийг cascade хийж болзошгүй; одоогийн `DELETE /users/me` User row устгахгүй, `deletedAt` тавьдаг тул өгөгдөл хадгалагдана.
- Creator/Business profile delete нь hard delete. Campaign cascade, Collaboration restrict зэрэг relation нэмэгдсэний дараа delete failure эсвэл business record алдагдах эрсдэлтэй.
- Campaign → Proposal cascade зөв; production audit шаардвал hard cascade биш archive/soft delete сонгоно.
- Collaboration → Payment restrict зөв.
- Review/contract/deliverable historical record-д restrict/cascade бодлогыг хууль/санхүүгийн retention-тэй тулгах шаардлагатай.
- `CreatedAt`, `UpdatedAt` ихэнх mutable entity-д байна.
- `DeletedAt` зөвхөн `User` дээр байна.
- `AdminAction` append-only design боловч write API байхгүй.

### 9.5 Index/unique

Сайн:

- User email/username unique.
- Profile slug/userId unique.
- Social platform/handle ба creator/platform unique.
- Proposal campaign/creator unique.
- Offer/collaboration/contract lookup index.
- Conversation membership unique.
- Collection owner/name, collection item unique.
- Review collaboration/reviewer unique.
- Admin/analytics/trust lookup index.

Дутуу:

- Public search-д PostgreSQL text/trigram index.
- Creator category/rate/verification, social engagement/follower filter strategy.
- Campaign public/status/deadline composite index-ийн query plan баталгаа.
- Message cursor index `(conversationId, createdAt, id)`.
- Notification cursor index `(userId, readAt, createdAt, id)`.
- Soft-delete partial unique/index бодлого.

### 9.6 Migration/seed

- 6 migration байна; `npx prisma migrate status`-аар database schema up to date.
- `npx prisma validate` pass.
- `20260728033245_auth_security` → `20260728040000_rollback_auth_security` → `20260728050000_auth_module` дараалал нь ажилладаг ч production history уншихад төвөгтэй.
- Initial migration domain schema-ийн ихэнхийг үүсгэсэн боловч runtime code байхгүй.
- `seed-admin.js` environment credential ашигладаг нь зөв.
- `seed-demo-accounts.js` зөвхөн creator/business account/profile үүсгэнэ; marketplace/campaign/collaboration/admin dashboard fixture DB seed байхгүй.
- Frontend mock ID, Prisma cuid хоёр шууд таарахгүй тул runtime API шилжилтийн үед deterministic demo seed шаардлагатай.

## 10. Architecture Audit

### 10.1 Modulith assessment

Одоогийн 4 module дотроо route → controller → service → repository → Prisma бүтэц зөв. Гэхдээ нийт frontend domain-ийг хамардаггүй тул “бүрэн modular monolith” гэж тооцох боломжгүй.

| Асуудал | File path | Нөлөө | Засах санал |
|---|---|---|---|
| Shared layer domain module import хийдэг | `src/shared/middleware/authenticate.js` → `modules/auth/auth.service.js` | Dependency direction урвуу | Token verifier/session port-ыг shared security interface болгох эсвэл auth middleware-г auth module-д байршуулах |
| Module internal file шууд import | `creator.service.js`, `business.service.js` → `users/user.mapper.js` | Module public boundary зөрчинө | `users/index.js`-ээр public mapper/service export эсвэл shared account DTO mapper |
| Controller business logic | Existing controller-ууд | Ноцтой logic байхгүй | Энэ хэвээр хадгал |
| Service Prisma query | Existing service-үүд | Шууд query байхгүй | Энэ хэвээр хадгал |
| Repository transaction | Existing repositories | Зөв layer | Transaction orchestration олон module хамрах үед application service ашиглах |
| Service size | `auth.service.js` ~314 lines | Auth use-case олширвол томорно | session/verification/password-reset service болгон дотоод package салгах |
| Module naming | `creator`, `business` singular; expected domain broader | Public marketplace route-тэй андуурна | `creator-profiles`, `business-profiles` эсвэл documented naming |
| Missing module | Marketplace-аас admin хүртэл | Frontend business flow mock | Dependency дарааллаар module нэмэх |
| Circular dependency | Одоогийн import graph | Илрээгүй | Public module API/event ашиглан хэвээр хадгал |
| Shared business logic | `shared` | Password/JWT/error utility л байна | Domain logic оруулаагүй нь зөв |

### 10.2 Recommended module boundary

```text
auth -> users
users -> creator-profiles, business-profiles
profiles -> marketplace, portfolio, interactions
business-profiles -> campaigns
campaigns + creator-profiles -> proposals/invitations/offers
offers -> collaborations
collaborations -> contracts -> payments/deliverables/reviews/showcase
users/profiles -> messaging/notifications/analytics
admin -> domain module public admin service + audit
```

Admin module target repository руу шууд хандахгүй. Жишээ нь campaign pause хийхэд `admin` нь `campaignService.adminTransition(...)` public use-case дуудаж, нэг transaction-д `AdminAction` бичнэ.

## 11. Authentication and Authorization Audit

| Logic | Status | Evidence/problem |
|---|---|---|
| Register | Completed | Pending viewer + hashed password/OTP |
| Login | Completed | bcrypt, generic invalid credential, active/verified check |
| Logout | Completed current token | Cookie token revoke |
| Access token | Completed | Short-lived, memory frontend, sessionVersion |
| Refresh token | Completed | Hash DB + HTTP-only cookie |
| Rotation | Completed basic | Old token atomic revoke/new token create |
| Reuse detection | Partially completed | Revoked token reject; family-wide response байхгүй |
| Email verification | Completed | 6 digit, hash, expiry, attempts |
| Resend verification | Completed | Generic response, cooldown, old code invalidate |
| Forgot password | Missing | UI preview only |
| Reset password | Missing | VerificationPurpose only email |
| Change password | Completed | Current password + revoke + version |
| Current user | Completed | `/auth/me` ба `/users/me` |
| Google auth | Missing intentionally | UI toast-only |
| Role middleware | Partially completed | `authorize` байна, ашиглагдаагүй |
| Permission middleware | Missing | Resource policy байхгүй |
| Ownership validation | Profile scope дээр implicit | `userId`-гаар self profile |
| Suspended/banned | Completed auth-level | `assertActiveUser` |
| Soft-deleted user | Completed auth-level | Login/access reject |
| Logout all devices | Internal effect only | Password change/delete; explicit endpoint/UI байхгүй |
| Login rate limiting | Completed | 10/15 min; distributed store биш |
| Failed login lockout | Missing | Migration rollback хийсэн, current schema field байхгүй |

Нэмэлт:

- Frontend `ProtectedRoute` нь UX хамгаалалт; backend permission биш.
- Creator/business profile create route-д role шаардахгүй байх нь зөв, учир viewer анх channel үүсгэнэ.
- Ирээдүйн role route бүр actor profile ownership шалгах ёстой.
- Refresh cookie `httpOnly`, configurable secure/sameSite, auth path-тэй.
- `COOKIE_SECURE=false` production-д startup-аар хориглох rule байхгүй.

## 12. Validation and Error Handling Audit

### Validation

- `validate(schema)` нь body/params/query envelope parse хийдэг.
- Одоогийн route-ууд body schema ашигладаг.
- Privileged extra field `.strict()`-ээр reject.
- Username/password/email/profile field validation байна.
- Avatar MIME + 5 MB байна.
- Creator social `optionalUrl` нь URL parser биш.
- Creator rate string-ээс non-digit тэмдэг арилган parse хийдэг; `"abc"` нь undefined болж silently алга болно.
- DELETE route confirmation/body validation байхгүй.
- Future list/query/params/file endpoint validation огт байхгүй.

### Error handling

- `AppError` common operational error.
- `errorHandler` Prisma P2002/P2025, Multer, JWT mapping хийнэ.
- Response `{success:false,error:{code,message,details}}` frontend `parseAuthError`-тэй таарна.
- 500 error production-д stack нуух ба development-д харуулна.
- P2002 mapping бүх unique-г email/username гэж ерөнхийлсөн; future collection/contract unique дээр буруу message өгнө.
- P2025 бүх resource-г `USER_NOT_FOUND` code болгоно.
- Request ID response/log-д байхгүй.
- CORS error operational AppError биш тул client-д generic 500 болох боломжтой.
- `removePreviousAvatar(...).catch(() => {})` файл cleanup error-г зориудаар дардаг; metric/log байхгүй.

## 13. Security Audit

| Control | Status | Audit |
|---|---|---|
| Helmet | Completed | `x-powered-by` disabled, CORP cross-origin |
| CORS | Completed basic | Single exact client URL, credentials |
| Rate limit | Completed auth-only | Memory store; multi-instance production-д shared store хэрэгтэй |
| Brute force | Partial | Per-route limit; per-account exponential lockout байхгүй |
| JWT secret | Completed | Env min 32 |
| Password hashing | Completed | bcrypt 10–15 configurable |
| Env validation | Completed core | DB/JWT/cookie/email; production-specific invariant дутуу |
| File upload | Partial | UUID/MIME/size; magic bytes/virus/object storage дутуу |
| Sensitive response | Completed existing DTO | Password/token hash return хийхгүй |
| SQL injection | Prisma хамгаалалт | Raw query ашиглаагүй |
| Ownership | Partial | Self profile only; business domain policy байхгүй |
| Role/permission | Partial | Frontend + unused generic middleware |
| Cookie security | Partial | httpOnly/path/sameSite/secure configurable; production enforce/CSRF origin дутуу |
| Request logging | Missing | `console.log/error` л байна |
| Audit logging | Schema only | `AdminAction` write service байхгүй |
| Refresh theft/reuse | Partial | Hash/rotation сайн, family/device revoke дутуу |
| Email enumeration | Сайн | Resend generic, login generic credential |
| Data retention | Missing | Token/code cleanup method unused; scheduled job байхгүй |

## 14. Code Quality Audit

### Duplicate/legacy/dead code

- `backend/app.js` legacy давхар listener.
- `backend/config/database.js`, `backend/config/env.js` хоосон legacy.
- `backend/src/notification/email.service.js` unused side-effect demo.
- `backend/src/notification/email.template.js`, `backend/dockerfile` хоосон.
- `backend/lib/prisma.ts` unnecessary re-export.
- `frontend/src/lib/api-client.js` unused abstraction.
- `auth.mapper.js` болон `users/user.mapper.js` бараг ижил DTO mapping.
- Creator/Business profile service-ийн slug availability/require/profile role sync pattern давхардсан.
- `/auth/me` ба `/users/me` current user read contract давхардсан боловч session bootstrap ба account domain гэж тайлбарлаж болно.

### Broken/inconsistent risk

- Backend source JS боловч `database.js`, `errorHandler.js` generated `.ts` import ашиглана.
- `package.json` start/test/seed бүгд `tsx` ашиглана.
- `prisma.config.ts`, `tsconfig.json`, TypeScript dev dependency байна.
- `backend/app.js`-г `node`-оор шууд ажиллуулбал нэг 3000 listener дараа `src/server.js` дахин listener эхлүүлэх эрсдэлтэй.
- `src/notification/email.service.js` import хийхэд email илгээх side effect гарна.
- `authRepository` cleanup/revoke helper-үүд unused.
- `authorize` unused.
- Naming: frontend “channel”, backend тусдаа `Channel` entity биш profile/role ашигладаг.

### Await/return/promise

- Existing service/controller async chain-д missing await/return илрээгүй.
- Node `--check` бүх JS file pass.
- Logout frontend API failure-г зориудаар catch хийгээд local session clear хийдэг; security хувьд refresh cookie server дээр үлдэх боломжтой боловч expiry/revocation дараагийн online logout хүртэл үлдэнэ.
- LocalStorage write catch-үүд frontend UX таслахгүй зориудын fallback.

### Performance

- Одоогийн repository жижиг self lookup тул N+1 алга.
- Public list/search implementation байхгүй.
- Ирээдүйн profile list дээр socials/reviews/portfolio include хийхэд N+1/oversized response-оос хамгаалах mapper/query projection хэрэгтэй.
- JSON-heavy collaboration update нь row contention/large payload үүсгэнэ.
- Local static upload cleanup lifecycle байхгүй.

## 15. Testing Audit

### Existing backend test

`tests/integration/auth.test.js`:

1. Invalid/privileged registration reject.
2. Pending viewer register, credential leak шалгах.
3. Duplicate email/username.
4. Unverified login/OTP attempts.
5. Verify + active session.
6. Login/me/refresh/logout.
7. Generic invalid credential/unknown resend.
8. Resend cooldown/old OTP invalidation.
9. Expired/attempt-limited OTP.
10. Refresh old token reject/disabled account.
11. Access token requirement.
12. Health/not-found envelope.

`tests/integration/profiles.test.js`:

1. User read/update/sensitive field.
2. Avatar upload/serve.
3. Creator CRUD + role sync.
4. Business CRUD + role sync.
5. Password change/session revoke/new login.
6. Account soft delete/login reject.

Command result:

- Backend: 18/18 pass.
- Prisma validate: pass.
- Migration status: 6 migration applied/up to date.
- Frontend: lint pass, validation test 3/3 pass, Vite production build pass.

### Missing test

- Unit test: service mapper/state rule тусдаа байхгүй.
- Repository failure/transaction rollback test хязгаарлагдмал.
- Forgot/reset/Google байхгүй тул test байхгүй.
- Role middleware/admin/ownership/IDOR test байхгүй.
- File invalid MIME/oversize/path cleanup test бүрэн биш.
- Campaign/proposal/offer/collaboration/contract/payment test огт байхгүй.
- Messaging/notification/library/search/filter/pagination test байхгүй.
- Payment webhook/idempotency/security test байхгүй.
- Admin mutation+audit atomicity test байхгүй.
- E2E critical flow:
  - register→verify→creator onboarding
  - business campaign→creator proposal
  - offer→workspace→contract→fund→deliverable→complete
  байхгүй.
- Frontend component/route/provider/API contract test бараг байхгүй; зөвхөн 3 validation utility test.

## 16. Current Backend Completion Status

### Тооцооллын арга

Frontend-д шаардлагатай backend capability-г 7 бүлэгт хувааж, бүлэг бүрийн completed/partial/missing operation-ийг жинлэв. Completed = 1, partial = 0.5, missing = 0.

| Бүлэг | Бодит суурь |
|---|---|
| Authentication | 11 capability-ээс register/login/logout/access/refresh/rotation/email verify/resend/change/current/disabled = бүрэн/хэсэгчилсэн; forgot/reset/Google/logout-all/lockout дутуу |
| User/channel | Personal 5 endpoint бүрэн; channel text CRUD ажиллана; media/dependency/public channel дутуу |
| Main business | 28 missing feature жагсаалтаас runtime-д profile-аас бусад нь 0 |
| Database | 25 model байгаа ч шаардлагатай normalized entity/field/API coverage хэсэгчилсэн |
| Security | Core auth/headers/hash/env/error сайн; domain permission/log/audit/payment/upload hardening дутуу |
| Testing | Existing 20 application endpoint-ийн critical path сайн; нийт required domain-ийн test байхгүй |
| Frontend integration | Frontend-ийн 20 API call холбогдсон; 3 provider + 3 mock data domain бүхэлдээ холбогдоогүй |

```text
Authentication: 68%
User management and channel profiles: 64%
Main business modules: 8%
Database design: 57%
Security and authorization: 51%
Testing: 24%
Frontend integration: 18%
Overall backend completion: 30%
```

Overall-д frontend-ийн бодит ажиллах чадварыг илүү зөв тусгахын тулд main business болон frontend integration-ийг тус бүр 2x, бусад бүлгийг 1x жинтэй тооцсон:

`(68 + 64 + 8*2 + 57 + 51 + 24 + 18*2) / 9 = 35.1%`.

Production readiness penalty:

- JS-only violation
- domain authorization/audit/logging байхгүй
- payment/provider/realtime байхгүй
- runtime mock business flow

Иймээс deployable feature completion-ийг **30%** гэж дүгнэв. Энэ нь schema model-ийн тоог feature completion гэж тооцоогүй бодит runtime/API дүн.

## 17. Priority List

```text
Task: JS-only Prisma/runtime болон legacy entrypoint цэгцлэх
Priority: P0
Current status: TypeScript runtime dependency, legacy file байна
Depends on: None
Related module: config/shared
Related frontend page: Бүх API
Expected result: Node.js JavaScript-only start/test/generate тогтвортой
```

```text
Task: Authentication password reset + session hardening
Priority: P0
Current status: Partial
Depends on: JS runtime
Related module: auth/users
Related frontend page: /forgot-password, /login, settings
Expected result: OTP reset, logout-all, refresh family, security test
```

```text
Task: Domain permission/ownership/audit foundation
Priority: P0
Current status: Missing
Depends on: auth/users/profile
Related module: shared security, audit
Related frontend page: Бүх protected dashboard/admin
Expected result: IDOR-гүй channel/resource access
```

```text
Task: Public marketplace/search/library
Priority: P1
Current status: Missing
Depends on: Profile/media, seed, pagination
Related module: marketplace/interactions/collections
Related frontend page: /discover, /search*, profiles, showcase, saved/following/collections
Expected result: Mock marketplace DB API source болно
```

```text
Task: Campaign/proposal/sourcing
Priority: P1
Current status: Schema only
Depends on: Business/creator identity, marketplace
Related module: campaigns/proposals/invitations
Related frontend page: Campaign pages, business creators, proposals
Expected result: Campaign create→proposal→decision ажиллана
```

```text
Task: Offer/collaboration/contract state machine
Priority: P1
Current status: Schema + frontend LocalStorage logic
Depends on: Campaign/proposal, permission/audit
Related module: offers/collaborations/contracts
Related frontend page: Work requests, responses, workspace, contracts
Expected result: Versioned transactional workflow
```

```text
Task: Payment/deliverable/completion
Priority: P1
Current status: Schema partial, API missing
Depends on: Active contract, upload, provider decision
Related module: payments/deliverables/reviews
Related frontend page: Workspace payment/deliverables, wallet
Expected result: Safe fund→deliver→approve→release
```

```text
Task: Messaging/notifications
Priority: P2
Current status: Schema only
Depends on: User/channel/collaboration
Related module: messaging/notifications
Related frontend page: Messages, notifications
Expected result: Persistent inbox/read state; optional realtime
```

```text
Task: Analytics/admin operations
Priority: P2
Current status: Schema partial, UI mock
Depends on: Main domain event/data
Related module: analytics/admin/trust/audit
Related frontend page: Analytics болон бүх admin route
Expected result: DB aggregate, controlled admin mutation/audit
```

```text
Task: Performance, observability, production hardening
Priority: P3
Current status: Basic
Depends on: Main endpoint complete
Related module: shared/config/all
Related frontend page: Бүх page
Expected result: Structured log, metrics, query/index, load/security test
```

## 18. Eight-Day Backend Plan











## Day 1 — JavaScript-only суурь ба auth gap

### Current problems

- Prisma client/config `.ts`, `tsx` runtime.
- Legacy/empty/side-effect file.
- Forgot/reset/logout-all/family reuse дутуу.

### Goal

Одоогийн pass хийж буй auth/profile кодыг хадгалан JS-only, production-safe суурь болгох.

### Related frontend pages

`/login`, `/register`, `/verify-email`, `/forgot-password`, `/account`, settings.

### Modules

`auth`, `users`, `shared`, `config`.

### Existing code to review

`package.json`, `prisma.config.ts`, `src/config/database.js`, `backend/app.js`, `src/notification/*`, auth/users module.

### Tasks

- Prisma JavaScript client/config migration.
- Legacy/unused entry/file цэгцлэх.
- Password reset OTP flow.
- Refresh family/reuse/logout-all.
- Production env invariant.

### API endpoints

- Нэмэх: `/auth/forgot-password`, `/auth/verify-reset-otp`, `/auth/reset-password`, `/auth/logout-all`.
- `/auth/me` ба `/users/me` contract/documentation ялгааг тодорхойлох.

### Database changes

- `VerificationPurpose.PASSWORD_RESET`.
- `AuthToken.familyId`, `replacedById`, device/IP optional.
- Migration + cleanup job design.

### Architecture changes

- Shared→auth reverse dependency арилгах.
- Auth service дотоод use-case салгах.

### Validation and security

- OTP enumeration/rate/attempt/one-time.
- Refresh family reuse.
- Cookie production enforce.

### Tests

- Existing 18 regression.
- Reset/session family/logout-all integration.

### Deliverables

JS-only backend start/test болон бүрэн account security flow.

### Definition of Done

TypeScript runtime/import байхгүй, migration/validate/test pass, reset flow contract frontend-д бэлэн.






## Day 2 — Channel media, public profile, marketplace foundation

### Current problems

- Cover/logo/sample алга болдог.
- Public profile/list endpoint байхгүй.
- Mock ID/data.

### Goal

Creator/Business channel-ийг public marketplace-д бодит DTO/media-тай гаргах.

### Related frontend pages

Onboarding, account/settings, `/creators/:id`, `/businesses/:id`, `/categories`.

### Modules

`creator-profiles`, `business-profiles`, `media`, `portfolio`, `marketplace`.

### Existing code to review

Creator/business service/repository/schema/mapper, onboarding payload, marketplace fixtures.

### Tasks

- Media upload abstraction.
- Public/private mapper.
- Public detail/list.
- Creator social URL validation.
- Initial portfolio sample transaction.
- Deterministic marketplace seed.

### API endpoints

- `/media/uploads`
- `/creators`, `/creators/:id`
- `/businesses`, `/businesses/:id`
- `/creator/portfolio`, `/portfolio/:id`
- `/categories`

### Database changes

- Portfolio status/order/deletedAt.
- Category taxonomy эсвэл validated string strategy.
- Media metadata entity хэрэгтэй эсэх шийдэх.
- Search index.

### Architecture changes

- Profile module public interface.
- Media storage port/adapter.

### Validation and security

- MIME magic byte, file size, ownership, URL.

### Tests

- Public/private DTO, upload invalid/valid, portfolio owner, filter.

### Deliverables

Onboarding media хадгалагдаж, public profile/portfolio API-аас уншигдана.

### Definition of Done

Frontend fixture-гүй нэг creator/business profile detail render хийх contract test pass.







## Day 3 — Discovery, search, save/follow/collection/showcase

### Current problems

- Marketplace бүхэлдээ LocalStorage/mock.
- Search/filter client-side.
- Follow target ambiguity, saved entity дутуу.

### Goal

Marketplace болон My Account library-г persistent API болгох.

### Related frontend pages

`/discover`, `/search*`, `/showcase*`, `/saved`, `/following`, `/collections*`.

### Modules

`marketplace`, `interactions`, `collections`, `showcase`.

### Existing code to review

`MarketplaceProvider`, `SearchPages`, `ShowcaseFeed`, cards, `data/marketplace.js`.

### Tasks

- Search/filter/sort/pagination.
- Discovery section query.
- Saved/follow/recent/share.
- Collection CRUD/visibility/item.
- Showcase/feed/reaction.

### API endpoints

- `/marketplace/discover`, `/search`
- Save/follow/recent/share
- `/collections*`
- `/showcase*`

### Database changes

- Saved/recent/share/showcase/reaction entity.
- Follow target relation correction.
- Search/index/migration/seed.

### Architecture changes

- Polymorphic target resolver нэг module service.
- Recommendation эхний deterministic rule.

### Validation and security

- Target existence, self-follow, collection access, cursor limit.

### Tests

- Search combinations, pagination, idempotency, private/unlisted/public.

### Deliverables

Marketplace provider бодит API-аар hydrate/mutate хийхэд бэлэн.

### Definition of Done

Discover/search/library/showcase critical action DB-д persist, unauthorized access test pass.

## Day 4 — Campaign, proposal, shortlist, invitation

### Current problems

- Campaign/Proposal schema байгаа ч runtime module байхгүй.
- Frontend/Prisma field/status naming зөрүүтэй.

### Goal

Business campaign-аас creator proposal decision хүртэлх flow.

### Related frontend pages

Business campaign wizard/detail, creator discover/detail/proposals, business creator/shortlist/compare/proposals.

### Modules

`campaigns`, `proposals`, `sourcing`.

### Existing code to review

`CampaignDashboardPages`, `WorkflowPages`, `BusinessCreatorsPage`, Prisma Campaign/Proposal.

### Tasks

- DTO mapper/state policy.
- Campaign CRUD/publish/archive.
- Proposal lifecycle.
- Shortlist/compare/invitation.
- Business/creator list views.

### API endpoints

- `/campaigns*`
- `/proposals*`
- shortlist/compare/invitations.

### Database changes

- Campaign missing searchable fields/version.
- Shortlist/comparison/invitation entities.
- Index/migration.

### Architecture changes

- Campaign service proposal repository руу шууд хандахгүй; public proposal use-case/event.

### Validation and security

- Campaign owner, open/deadline, unique proposal, transition.

### Tests

- CRUD, filters, cross-owner 403, invalid state, concurrent update.

### Deliverables

Campaign create→publish→discover→proposal→decision API ажиллана.

### Definition of Done

Frontend campaign/proposal LocalStorage dependency арилгах contract бүрэн.

## Day 5 — Offer ба collaboration agreement/contract

**Хэрэгжилтийн төлөв: [x] Дууссан — 2026-07-30**

### Current problems

- Хамгийн том business state machine зөвхөн frontend provider-д.
- Enum/status зөрүү, JSON overwrite, approval audit байхгүй.

### Goal

Offer-оос active contract хүртэл transactional, versioned workflow.

### Related frontend pages

Offer dialog, work requests, responses, collaboration list/workspace, contract pages.

### Modules

`offers`, `collaborations`, `contracts`, `audit`.

### Existing code to review

`CollaborationProvider`, response/request page, workspace negotiation/agreement/contract tabs, Prisma related models.

### Tasks

- Canonical transition table.
- Offer revision.
- Approve үед collaboration create.
- Versioned terms/agreement approvals.
- Contract snapshot/version/approval/document.
- Tasks/files/activity initial support.

### API endpoints

- `/offers*`
- `/collaborations*`
- `/contracts*`

### Database changes

- Version, revision, agreement/approval, task/file/activity entities.
- Unique current approval/version/index.

### Architecture changes

- Application transaction service.
- Domain event/notification port.

### Validation and security

- Participant/role/state/version/idempotency.

### Tests

- Transition matrix, double click/concurrency, IDOR, approval reset.

### Deliverables

Offer→agreement→contract frontend workflow API source болно.

### Definition of Done

Invalid transition DB-г өөрчлөхгүй; audit/activity бүрэн; happy path test pass.

## Day 6 — Payment, deliverable, completion, review

**Хэрэгжилтийн төлөв: [x] Дууссан — 2026-07-30**

### Current problems

- Frontend шууд funded/released болгоно.
- Provider, webhook, payment method, review history байхгүй.

### Goal

Санхүүгийн болон production lifecycle-ийг аюулгүй дуусгах.

### Related frontend pages

Workspace payment/deliverables/review, wallet/payments, creator profile ratings, showcase publish.

### Modules

`payments`, `deliverables`, `reviews`, `showcase`.

### Existing code to review

Workspace tabs, `PaymentAnalyticsPages`, Prisma Payment/Deliverable/Review.

### Tasks

- Provider adapter/funding intent/webhook.
- Immutable transaction.
- Deliverable upload/review/revision.
- Completion/release.
- Directional review/rating aggregate.
- Publish showcase.
- Method/payout/refund.

### API endpoints

- Funding/webhook/payment/transaction/method/payout/refund.
- Deliverable/review/publish.

### Database changes

- Method/transaction/payout/refund/review history/showcase.
- Provider idempotency unique.

### Architecture changes

- Payment provider port.
- Outbox for payment/notification.

### Validation and security

- Webhook signature, amount/state, raw card prohibition, file rule.

### Tests

- Duplicate webhook, early funding/submission, release, refund/payout boundaries.

### Deliverables

Fund→deliver→approve→complete→release→review/publish.

### Definition of Done

Payment state зөвхөн verified provider event-ээр өөрчлөгдөж, бүх finance test pass.

## Day 7 — Messaging, notifications, analytics, admin

### Current problems

- Entity байгаа ч API байхгүй.
- Admin UI бүхэлдээ fixture/local mutation.

### Goal

Communication, metrics, controlled admin operation.

### Related frontend pages

Messages, notifications, analytics, бүх admin page.

### Modules

`messaging`, `notifications`, `analytics`, `admin`, `trust`, `audit`.

### Existing code to review

Messaging/utility/analytics pages, admin pages/UI/data, Prisma communication/trust/admin models.

### Tasks

- Conversation/message/read/attachment.
- Notification/preference/outbox.
- Analytics range/export.
- Admin list/detail/search/filter/page.
- Admin actions mandatory reason + audit.
- Trust/finance/settings/announcement.

### API endpoints

- `/conversations*`, `/messages*`, `/notifications*`, `/analytics*`, `/admin*`.

### Database changes

- Notification preference, announcement, system setting, outbox.
- Audit index/retention.

### Architecture changes

- Admin domain service public API ашиглана.
- Realtime adapter optional.

### Validation and security

- Participant/sender/admin/super-admin, export limit, reason/action allow-list.

### Tests

- Message IDOR, read isolation, admin mutation+audit atomicity, analytics range.

### Deliverables

Dashboard utilities болон admin center бодит DB/API source болно.

### Definition of Done

Admin бүртгэлгүй mutation байхгүй, messaging/notification persistent, queries paginated.

## Day 8 — Frontend integration, regression, production readiness

### Current problems

- 3 provider/3 data fixture runtime source.
- Бодит list loading/error/retry contract байхгүй.
- Observability/deployment сул.

### Goal

API contract-ийг frontend-д бүрэн холбож production release gate хангах.

### Related frontend pages

Бүх route.

### Modules

Бүх module integration.

### Existing code to review

Frontend API/context/page, backend routes/mappers/errors/tests/docs/config.

### Tasks

- Provider-уудыг API query/mutation руу шилжүүлэх.
- Optimistic rollback, cache/refetch, loading/error/empty.
- Mock runtime import арилгах эсвэл зөвхөн seed/test болгох.
- Structured logging/request ID/redaction.
- OpenAPI/Postman/env/deployment docs.
- Query/index/load/security review.

### API endpoints

- Duplicate/unused endpoint contract цэгцлэх.
- Final versioned endpoint inventory.

### Database changes

- Final migration/index/seed verification.
- Backup/retention plan.

### Architecture changes

- Circular dependency/static import check.
- Module public interface enforcement.

### Validation and security

- Full permission matrix, rate limit shared store, CORS/cookie production config.

### Tests

- Unit/integration/API/contract/E2E.
- Critical two-account flow.
- Frontend lint/test/build.
- Backend migrate/validate/test/start smoke.

### Deliverables

Mock runtime dependency-гүй, documented, observable, tested release candidate.

### Definition of Done

Бүх protected/public route expected API-тай, P0/P1 test pass, zero TypeScript backend runtime, production checklist green.

## 19. Missing or Unclear Logic

### Password reset UI

- File path: `frontend/src/pages/auth/ForgotPasswordPage.jsx`
- Page/module: Forgot password / auth
- Тодорхойгүй: OTP/new password тусдаа route эсвэл нэг page step байх эсэх.
- Яагаад асуудалтай: Backend contract/redirect тодорхойгүй.
- Боломжит шийдэл: Нэг route дотор request→OTP→password 3 step.
- Default санал: Нэг route state machine; refresh хийвэл email/session state сэргээхгүй, дахин request.

### Google OAuth scope

- File path: `LoginPage.jsx`
- Тодорхойгүй: Product feature мөн эсэх.
- Боломжит шийдэл: Button нуух эсвэл OAuth module.
- Default санал: Backend хэрэгжүүлэх хүртэл disabled label; fake success хийхгүй.

### Channel model

- File path: `schema.prisma`, account/channel switch UI
- Тодорхойгүй: Нэг User creator/business тус бүр нэг үү, олон ижил төрлийн channel уу.
- Яагаад: Current schema 1:1, UI copy “multiple channels” гэж заримдаа хэлнэ.
- Боломжит шийдэл: Explicit `Channel` + membership.
- Default санал: Одоогийн frontend-д нэг creator + нэг business/user-г хадгал; олон channel UI гарахаас өмнө refactor.

### Creator onboarding media

- File path: `CreatorOnboardingPage.jsx`
- Тодорхойгүй: Sample file portfolio item мөн үү.
- Default санал: Upload хийгээд transaction-д нэг draft/published `PortfolioItem` үүсгэх.

### Business media

- File path: `BusinessOnboardingPage.jsx`
- Тодорхойгүй: Logo/cover public storage.
- Default санал: Image upload purpose + profile URL, MIME/size policy.

### Campaign Apply

- File path: `MarketplaceCampaignPage.jsx`
- Тодорхойгүй: Public viewer button channel modal нээдэг; authenticated creator proposal form нээхгүй.
- Default санал: Viewer→create creator channel, creator→proposal dialog, business→disabled/self-not-applicable.

### Offer/collaboration status

- File path: `CollaborationProvider.jsx`, `schema.prisma`
- Тодорхойгүй: Frontend болон enum canonical status.
- Default санал: Backend state machine canonical; frontend label mapper ашиглах.

### Contract signature

- File path: `WorkflowPages.jsx`, `CollaborationWorkspacePage.jsx`
- Тодорхойгүй: “Approve” нь legal e-signature мөн эсэх.
- Default санал: Одоохондоо approval acknowledgement; UI-д legal signature гэж нэрлэхгүй. Provider сонгосны дараа e-signature.

### Payment provider/escrow

- File path: Workspace payment, `PaymentAnalyticsPages.jsx`
- Тодорхойгүй: Provider, escrow хууль/settlement.
- Default санал: Adapter interface + fake sandbox provider; production money movement provider/legal approval хүртэл disabled.

### Review direction

- File path: `CollaborationProvider.jsx`, `ProfilePages.jsx`
- Тодорхойгүй: Хоёр тал review хийх үү, creator rating-д хэний review орох вэ.
- Default санал: Хоёр тал review бичиж болно; public creator rating-д зөвхөн completed collaboration-ийн business→creator review.

### Showcase entity/publish gate

- File path: `ShowcaseFeed.jsx`, collaboration publish logic
- Тодорхойгүй: Portfolio item, deliverable эсвэл тусдаа content; хоёр review publish gate мөн үү.
- Default санал: Тусдаа `ShowcaseContent` approved deliverable-аас үүснэ; хоёр review заавал биш, хоёр талын content consent шаардлагатай.

### Compare persistence

- File path: `DashboardDataProvider.jsx`
- Тодорхойгүй: Temporary UI selection эсвэл account sync.
- Default санал: Session/local state; shortlist л server persist. Олон төхөөрөмжийн requirement гарвал comparison preference нэмэх.

### Admin permission granularity

- File path: `ProtectedRoute`, admin layout/pages
- Тодорхойгүй: Нэг ADMIN эсвэл finance/trust/support permission.
- Default санал: Эхний release ADMIN, finance/security/system setting-д SUPER_ADMIN; дараа permission table.

### Realtime

- File path: Messages/notification/workspace pages
- Тодорхойгүй: Socket.IO/SSE шаардлага.
- Default санал: REST source of truth + polling эхний release; event/outbox interface хадгалж дараа SSE/Socket.IO.

## 20. Final Recommendations

1. Одоо ажиллаж буй auth/user/profile module-ийг дахин шинээр бичихгүй; test-ээр хамгаалаад өргөтгө.
2. Юуны өмнө JavaScript-only requirement, legacy entrypoint, password reset, permission foundation гэсэн P0-г дуусга.
3. Prisma model байгаа гэдгийг feature completed гэж тооцохгүй; route→controller→service→repository→test бүрдсэн үед completed гэж тэмдэглэ.
4. Frontend-ийн mock state machine-ийг шууд controller руу хуулж болохгүй; canonical enum/state transition-ийг service policy болго.
5. `Collaboration.terms/tasks/files/activity` JSON-г бүхэлд нь нэг өдөр normalize хийхгүй; approval/audit/concurrency шаардлагатай хэсгээс эхэл.
6. Public DTO, owner DTO, admin DTO-г тусдаа mapper болго.
7. IDOR хамгаалалтыг route гарсны дараа биш module бүрийн эхний өдөр permission test-тэй хамт хий.
8. Payment provider тодорхойгүй үед бодит мөнгө хөдөлгөх fake endpoint production-д гаргахгүй.
9. Admin mutation бүр reason + before/after + actor + timestamp audit-тай нэг transaction байна.
10. Frontend provider шилжилтийг module бүрийн API дуусмагц хэсэгчлэн хий; 8 дахь өдөр бүх mock-ийг нэг дор солих эрсдэлээс зайлсхий.
11. Search/filter endpoint эхнээсээ pagination, sort allow-list, index-тэй байна.
12. Request ID, structured log, secret redaction, backup/migration rollback, health/readiness endpoint нэмсний дараа production-ready гэж тооц.

### Audit verification summary

```text
Prisma schema validation: PASS
Migration status: 6 applied, up to date
Backend JavaScript syntax check: PASS
Backend integration tests: 18/18 PASS
Frontend ESLint: PASS
Frontend unit tests: 3/3 PASS
Frontend production build: PASS
Backend source implementation changed during this audit: NO
```
