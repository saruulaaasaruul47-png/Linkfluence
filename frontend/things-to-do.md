# VYRA Marketplace — Things to do

Энэ файл нь одоогийн repository-г шалгасан frontend/backend implementation checklist юм.

- `[x]` — код дээр хэрэгжсэн
- `[ ]` — хийгдээгүй, mock хэвээр эсвэл backend integration шаардлагатай
- Frontend-ийн `localStorage` mock flow-уудыг production backend implementation гэж тооцоогүй.

---

# 1. Frontend

## Foundation ба UI system

- [x] React + Vite project setup
- [x] Tailwind CSS theme, responsive dark UI
- [x] Reusable Button, Input, Select, Textarea, Dialog, Drawer, Tabs, Toast components
- [x] Loading, skeleton, empty state components
- [x] ReactBits-style spotlight, aurora, blur, motion effects
- [x] Responsive marketplace, dashboard, admin layouts
- [x] Route metadata/title component
- [x] 404, 403 болон Error Boundary/500 fallback
- [x] Production build manual vendor chunking
- [x] Бүх route-ийг lazy loading болгох
- [ ] Lighthouse performance audit
- [ ] Бүх browser/device дээр manual QA хийх

## Authentication UI

- [x] Register page болон client-side validation
- [x] Login page болон HTTP-only cookie session restore
- [x] Logout болон session цэвэрлэх
- [x] Protected route
- [x] Creator, Business, Admin frontend role guard
- [x] Access token-ийг зөвхөн memory-д хадгалах
- [x] Нэгэн зэрэг ирсэн 401 request-үүдэд single refresh queue ашиглах
- [x] Forgot password UI
- [x] Verify email UI
- [x] Register/Login-ийг backend API-тай холбох
- [x] Access token болон secure refresh-token flow
- [x] Google OAuth холболт
- [x] Email verification код илгээх, шалгах API
- [x] Forgot/reset password email болон шинэ password backend flow
- [x] Production admin authentication, RBAC, permission policy

## Creator ба Business onboarding

- [x] Role сонгох Welcome page
- [x] Creator multi-step onboarding
- [x] Business multi-step onboarding
- [x] Draft state browser persistence
- [x] Алхам алгасахыг хориглосон validation
- [x] Avatar, cover, portfolio file preview/remove
- [x] Social account болон profile information form
- [x] Onboarding дуусахад тухайн role/channel үүсгэх frontend state
- [x] Username uniqueness backend validation
- [x] File upload storage/CDN integration
- [x] Social account ownership verification
- [x] Creator/Business channel CRUD API

## Marketplace ба discovery

- [x] Landing page
- [x] Discover page болон discovery sections
- [x] Creator, Business, Campaign cards
- [x] Creator, Business public profile pages
- [x] Creator profile social layout: cover, avatar, stats, Posts/About/Reviews tabs
- [x] Marketplace-ээс role-aware Admin/Creator/Business dashboard руу буцах shortcut
- [x] Public campaign detail page
- [x] Creator/Business/Campaign тусдаа search page
- [x] Global search
- [x] Desktop sticky filter sidebar болон compact search toolbar
- [x] Global search result-type quick filter
- [x] Search/filter/sort URL query state
- [x] Debounced search input
- [x] Categories болон Showcase pages
- [x] Showcase detail, like/save/share statistics frontend state
- [x] Recommended content frontend scoring
- [x] Fallback/lazy image component
- [x] Marketplace өгөгдлийг API-аас авах
- [x] Backend pagination, advanced search/filter
- [x] Search index буюу full-text search service
- [ ] Production recommendation algorithm

## My Account, save, follow, collections

- [x] My Account summary
- [x] Personal account overview дээр Creator/Business channel create/manage hub
- [x] Creator болон Business channel profile edit
- [x] Saved items
- [x] Following list
- [x] Recently followed Creator/Business channel preview
- [x] Collections create/edit/delete
- [x] My Account дотор Collections tab болон empty-state CTA
- [x] Collection visibility болон share-link UI
- [x] Channel deactivate frontend flow
- [x] Account settings болон dashboard settings нэг browser source ашиглах
- [x] Account/channel CRUD API
- [x] Save/follow/collection database persistence
- [x] Public/private collection access control backend
- [x] Account soft-delete backend flow
- [x] Account data export backend flow

## Creator dashboard

- [x] Dashboard overview, metrics, deadlines, quick actions
- [x] Dashboard layout доторх Discover campaigns route болон sticky compact filters
- [x] Portfolio list, add/edit/delete
- [x] Image/video browser preview
- [x] Media kit text download
- [x] Campaign list/detail
- [x] Invitation болон proposal screens
- [x] Proposal submit/edit/withdraw frontend flow
- [x] Contracts list/detail болон local sign state
- [x] Collaboration list/workspace
- [x] Analytics болон Wallet pages
- [x] Notifications, Messages, Settings
- [x] Creator dashboard data API integration
- [x] Portfolio/media upload API
- [x] Proposal/contract production API
- [x] Server-generated media kit PDF

## Business dashboard

- [x] Dashboard overview, metrics, campaigns
- [x] Campaign create/edit/delete/status/deadline frontend state
- [x] Creator browse, shortlist, compare
- [x] Creator name/niche/location/platform search
- [x] Creator niche/location/audience/engagement filter болон sort
- [x] Work offer send
- [x] Proposal accept/reject/shortlist/counter frontend state
- [x] Contracts, payments, analytics pages
- [x] Notifications, Messages, Settings
- [x] Creator/Business analytics desktop 2-column panel layout
- [x] Creator/Business profile dropdown logout
- [x] Campaign CRUD API
- [x] Creator shortlist/compare/invite backend persistence
- [x] Proposal decision болон audit API
- [ ] Business billing/organization/team backend

## Business–Creator collaboration workflow

- [x] Initial work offer form
- [x] Pending creator response state
- [x] Creator interested/counter/decline actions
- [x] Business approve/request changes/decline actions
- [x] Final budget/timeline approval
- [x] Approved offer-оос Collaboration Workspace үүсгэх
- [x] Overview, Negotiation, Agreement, Tasks, Files, Timeline tabs
- [x] Contract, Payment, Deliverables, Activity tabs
- [x] Agreement болон contract хоёр талын approval
- [x] Agreement/contract change request
- [x] Contract version history болон local audit
- [x] Printable contract HTML, browser Save as PDF flow
- [x] Funding gate болон frontend escrow state
- [x] Deliverable upload preview, approve/revision request
- [x] Completed state, reviews, Showcase publish
- [x] Role-based deep-links болон notifications
- [x] Work offer/collaboration database models болон API
- [ ] Immutable contract versions болон legal e-signature
- [ ] Server-generated signed PDF
- [x] Secure file/deliverable storage
- [ ] Production escrow/payment integration

## Contracts, payments, analytics

- [x] Contract lifecycle UI
- [x] Mock sign/approval/revision/proof/review interactions
- [x] Wallet, transaction, escrow ledger UI
- [x] Masked card/bank method frontend state
- [x] Creator payout request frontend state
- [x] Refund/reconciliation frontend case
- [x] Platform commission estimate
- [x] Creator болон Business analytics dashboards
- [x] Working 7D/1M/3M/1Y/All chart filter
- [x] Browser analytics event preview
- [x] Analytics болон transactions CSV export
- [x] Payment provider integration
- [ ] Verified card/bank setup
- [x] Secure escrow ledger, milestone release
- [ ] Real payout/withdrawal
- [x] Refund/failed payment/reconciliation backend
- [x] Payment webhooks
- [x] Analytics event ingestion/aggregation backend
- [ ] Scheduled CSV/PDF reports

## Messaging ба notifications

- [x] Conversation list болон chat window
- [x] Conversation search
- [x] Message send/edit/delete browser state
- [x] Image/document attachment preview/download
- [x] Typing, online, delivered/read frontend indicators
- [x] Campaign болон contract deep-link
- [x] Notification list
- [x] Mark one/all as read browser persistence
- [x] Role-safe notification deep-links
- [x] Admin announcement draft/send frontend flow
- [x] Conversation/message API
- [x] WebSocket/SSE realtime update
- [x] Server-side typing, online, delivered, read receipt
- [x] Attachment upload API
- [x] Redis/BullMQ notification jobs
- [ ] Email болон push notification provider

## Admin

- [x] Admin layout, navigation, dashboard
- [x] Users, channels, campaigns, contracts tables
- [x] Payments, commissions, refunds UI
- [x] Reports, disputes, moderation, verification, reviews UI
- [x] Local pagination/search/filter
- [x] Admin global search
- [x] Announcement route болон history
- [x] Persistent admin settings
- [x] User suspend/restore/delete frontend action
- [x] Channel verify/reject/restrict frontend action
- [x] Campaign publish/pause/hide frontend action
- [x] Content approve/hide/remove frontend action
- [x] Report/dispute resolution frontend action
- [x] Refund/payout/freeze frontend action
- [x] Mutation бүрд reason шаардах local audit
- [x] Admin logout/session control
- [x] Admin data API болон server pagination
- [x] Strict backend RBAC/permissions
- [x] Admin mutations болон immutable audit log backend
- [x] Sensitive action re-authentication/2FA

## Frontend integration, quality, testing

- [x] `VITE_API_URL` environment example
- [x] Shared API client
- [x] Auth header болон 401 logout interceptor
- [x] Friendly API error mapping
- [x] Optimistic mutation/rollback helper
- [x] Shared validation helper
- [x] Validation unit tests
- [x] `npm run lint`, `npm run test`, `npm run build`, `npm run check`
- [x] Shared Button font size/padding compact scale
- [x] Reels-style Showcase Contents/Following feed
- [x] Route-level lazy loading болон Suspense skeleton fallback
- [x] Admin/Marketplace/Dashboard/Collaboration feature chunk split
- [x] Legacy dashboard duplicate export cleanup
- [x] Dialog/Drawer focus trap болон focus restore
- [x] Admin/Creator/Business compact sidebar hover/focus auto-expand болон optional pin
- [x] Reusable FeatureUnavailable preview pattern
- [x] Mobile messages list/detail navigation
- [x] Onboarding image/video preview ratio болон sticky mobile actions
- [x] Project setup/environment README
- [x] Одоогийн `src/data/*.js` fixture-үүдийг API response-оор солих
- [ ] API client-ийг бүх feature flow-д ашиглах
- [ ] Server-state cache/query layer
- [ ] Бүх form-ыг shared schema validation-тай холбох
- [x] Component tests
- [x] Route/integration tests
- [x] Playwright/Cypress end-to-end tests
- [ ] Full accessibility audit
- [x] Monitoring/error-reporting service
- [x] Production CI/CD pipeline

---

# 2. Backend

## Одоогийн бодит төлөв

- [x] `backend` folder болон `package.json` байна
- [x] Express, Prisma, PostgreSQL driver dependencies суусан
- [x] Prisma config, 73 model болон migration-ууд байна
- [x] API gateway/auth-service нэртэй scaffold folders байна
- [x] `backend/src/app.js` implementation
- [x] API gateway implementation
- [x] Auth service implementation
- [x] Ажилладаг HTTP server/start/dev scripts
- [x] Prisma models
- [x] Migration
- [x] Seed
- [x] Backend integration test suite
- [x] Frontend-ээс ашиглаж байгаа authentication API endpoint

## P0 — Backend foundation

- [x] Modular Monolith бүхий нэг Express app architecture
- [x] Environment validation
- [x] Express app bootstrap, health endpoint
- [x] CORS болон Helmet
- [x] Compression
- [x] Central error handler
- [x] Request logger, request ID
- [x] API versioning `/api/v1`
- [x] PostgreSQL connection
- [x] Prisma schema болон migration
- [x] Database seed
- [x] Docker Compose: app + PostgreSQL + Redis
- [x] Dev/start/test/migrate scripts
- [x] Seed script
- [x] OpenAPI/Swagger documentation

## Database entities

- [x] User болон UserRole enum
- [x] Permission болон granular RBAC models
- [x] Refresh token rotation-д зориулсан AuthToken model
- [x] Email OTP-д зориулсан VerificationCode model
- [x] CreatorProfile
- [x] BusinessProfile
- [x] BusinessMember болон team permission model
- [x] SocialAccount
- [x] PortfolioItem
- [x] Нэгдсэн MediaAsset model
- [x] Creator category/skill string collections
- [x] Campaign
- [x] Proposal
- [x] WorkOffer болон counter/final terms
- [x] Collaboration workspace
- [x] Contract болон immutable version snapshot model
- [x] Deliverable; task/file/timeline workspace JSON state
- [x] Conversation, ConversationMember, Message болон attachment JSON
- [x] Notification
- [x] Follow, Collection, CollectionItem
- [x] Payment model нь funding/release/payout/refund/commission төрлүүдийг нэгтгэсэн
- [x] Review
- [x] TrustCase нь report/dispute/verification/moderation-ийг нэгтгэсэн
- [x] AnalyticsEvent
- [x] AdminAction audit model

## Authentication ба authorization

- [x] Register
- [x] Login
- [x] Password hash (`bcrypt`)
- [x] JWT access token
- [x] Refresh-token rotation/revocation
- [x] Logout current session
- [x] Logout all sessions
- [x] Email verification
- [x] Forgot/reset password
- [x] Google OAuth
- [x] Auth middleware
- [x] Role middleware
- [x] Granular permission middleware
- [x] Admin 2FA/re-authentication
- [x] Login болон auth endpoint rate limiting
- [x] Per-account lockout/brute-force protection

## User, Creator, Business

- [x] Current user/profile API (`GET /auth/me`)
- [x] Creator profile CRUD
- [x] Business profile CRUD
- [x] Business team/member permissions
- [x] User avatar multipart upload
- [x] Creator/Business cover болон portfolio upload
- [x] Cloudinary/S3-compatible storage
- [x] Social account CRUD/verification
- [x] Username uniqueness
- [x] Channel verification workflow
- [x] Follow/save/collection APIs

## Campaign ба discovery

- [x] Campaign CRUD
- [x] Draft/publish/pause/close states
- [x] Search, filter, sort, pagination
- [x] Creator application/proposal CRUD
- [x] Shortlist/compare/invite persistence
- [x] Duplicate offer/application protection
- [x] Public creator/business/campaign endpoints
- [x] Recommendation scoring
- [x] Full-text search/index

## Collaboration ба contracts

- [x] Work offer send/respond/counter/decline
- [x] Business final approval transaction
- [x] Workspace create/access control
- [x] Negotiation term versions
- [x] Agreement approval/change request
- [x] Immutable contract version history
- [ ] Legally traceable e-signature
- [ ] Signed PDF generation/storage
- [x] Task/file/timeline APIs
- [x] Deliverable upload/review/revision
- [x] Completion/review/showcase publish
- [x] Collaboration state-machine validation

## Chat ба notifications

- [x] Conversation/message CRUD
- [x] Socket.IO/WebSocket gateway
- [x] Typing/online/read/delivered state
- [x] Unread counters
- [x] Message attachment upload
- [x] Redis pub/sub
- [x] Notification database
- [x] BullMQ background jobs
- [x] Email provider
- [ ] Optional push provider
- [x] Role/resource-safe notification deep-links

## Payments

- [x] Payment provider сонгох
- [ ] Customer/card/bank tokenization
- [x] Escrow ledger
- [x] Milestone fund/release
- [ ] Creator payout/withdrawal
- [x] Platform commission calculation
- [x] Refund болон failed payment recovery
- [x] Webhook signature verification
- [x] Idempotency keys
- [x] Reconciliation jobs
- [x] Finance/admin controls

## Analytics

- [x] Analytics event endpoint
- [x] Event validation/deduplication
- [x] Daily/hourly aggregation jobs
- [x] Creator analytics API
- [x] Business analytics API
- [x] Admin platform analytics API
- [x] Date-range query
- [ ] CSV/PDF background export

## Admin ба trust/safety

- [x] User suspend/restore/delete API
- [x] Channel verify/reject API
- [x] Campaign/content visibility control
- [x] Report/dispute resolution
- [x] Refund/payout administrative approval
- [x] Mandatory mutation reason
- [x] Immutable admin audit log
- [x] Admin announcement delivery
- [x] Strict RBAC permissions

## Production readiness

- [x] Request/schema validation
- [x] Rate limiter
- [x] Secure headers/CORS policy
- [x] Structured logging
- [x] Redis caching
- [x] Unit tests
- [x] Integration tests
- [x] API end-to-end tests
- [x] Payment webhook tests
- [x] Database backup/recovery
- [ ] Monitoring, tracing, alerting
- [x] CI pipeline
- [ ] Staging deployment
- [x] Production deployment
- [ ] Secrets management
- [x] Security audit
