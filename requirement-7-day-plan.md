# Influence Hub — Requirement v2.1 нийцлийн аудит ба 7 өдрийн төлөвлөгөө

Шалгасан огноо: **2026-08-06**  
Эх баримт: `requirement.md` — Influence Hub SRS v2.1 Detailed  
Шалгасан хүрээ: `frontend/src`, `frontend/test`, `frontend/tests`, `backend/src`, `backend/prisma`, `backend/tests`, `backend/scripts`, deployment болон release баримтууд  
Аргачлал: route, page, API client, state, controller, service, repository, Zod schema, Prisma model, middleware, infrastructure болон test-ийг requirement бүртэй static analysis-аар тулгав. Frontend test suite-ийг мөн ажиллуулж баталгаажуулав.

---

## 1. Товч дүгнэлт

Төсөл нь зөвхөн UI prototype биш болсон. Одоогийн кодод authentication, хоёр төрлийн channel, social connection, marketplace, social content feed, campaign/proposal/direct offer, collaboration workspace, contract, payment/ledger, deliverable, publish proof, review, showcase, realtime messaging, notification, analytics, trust-and-safety болон admin module бодитоор байна.

Гол давуу тал:

- Backend нь **30 module**, **61 Prisma model**, **38 enum**, ойролцоогоор **193 REST route** бүхий modular monolith бүтэцтэй.
- Frontend нь **96 route**, **41 page file**, API client дотор ойролцоогоор **176 request mapping**-тай.
- JWT access/refresh rotation, bcrypt, OTP, Zod, RBAC, ownership/IDOR хамгаалалт, rate limit, Helmet, CORS, signed media URL, webhook idempotency болон audit суурь байна.
- Collaboration lifecycle нь agreement → contract → funding → deliverable → publish proof → retention → settlement → review/showcase урсгалтай.
- Backend integration suite-ийн хамгийн сүүлийн баталгаажуулалт **68/68 pass**. Frontend-ийн энэ аудитаар ажиллуулсан test **11/11 pass**.

Гол зөрүү:

- Backend-д бодит operation байхад contract, portfolio, settings болон зарим dashboard UI `mock`, static array эсвэл `localStorage` ашигласан хэвээр.
- Creator/Business discovery нь SRS-ийн бүх filter, sort болон cursor pagination-ийг бүрэн хангахгүй.
- Workspace task нь зөвхөн toggle operation-той; бүрэн task board CRUD, priority/status/assignee дутаж байна.
- Production object storage, production Redis/RabbitMQ, QPay certification, Meta app review зэрэг external setup дуусаагүй.
- Public route-ууд Vite SPA тул бүрэн SSR/SEO шаардлагыг хангахгүй.
- Admin settings/feature flag нь browser-only draft бөгөөд backend enforcement байхгүй.

### Одоогийн ойролцоолсон нийцэл

| Үнэлэх хэсэг | Жин | Одоогийн оноо | Жигнэсэн |
|---|---:|---:|---:|
| Functional requirements FR-1–FR-22 | 50% | 82% | 41.0 |
| Frontend–Backend бодит интеграц | 15% | 74% | 11.1 |
| Architecture ба database consistency | 10% | 91% | 9.1 |
| Authentication ба security | 10% | 84% | 8.4 |
| Non-functional requirements | 10% | 58% | 5.8 |
| Testing ба release readiness | 5% | 72% | 3.6 |
| **НИЙТ** | **100%** |  | **79.0%** |

> **79% нь static-analysis estimate.** Энэ нь feature-ийн тоог зүгээр тоолсон үзүүлэлт биш. Бодит API ажиллагаа, frontend ашиглаж байгаа эсэх, permission, persistence, test болон production dependency-г хамтад нь тооцсон.

Төлөвийн тэмдэглэгээ:

- **✅ Хийгдсэн** — үндсэн business rule, persistence, API/UI болон хамгаалалт кодоор нотлогдсон.
- **🟡 Хэсэгчлэн** — суурь нь байгаа ч SRS-ийн нэг буюу хэд хэдэн нөхцөл дутуу.
- **❌ Хийгдээгүй** — шаардлагыг хангах бодит implementation олдоогүй.
- **🌐 External** — кодоор ганцаараа дуусгах боломжгүй production credential, provider approval эсвэл infrastructure.

---

## 2. Бодит төслийн бүтэц

### 2.1 Frontend

- Stack: React 19, Vite 8, React Router 7, JavaScript, Tailwind CSS 4, Axios, Context API, Motion, Lucide, Socket.IO Client.
- Route entry: `frontend/src/main.jsx`.
- Auth state: `frontend/src/context/AuthProvider.jsx`, `frontend/src/api/axiosClient.js`, `frontend/src/api/tokenStore.js`.
- Marketplace/social feed: `frontend/src/components/marketplace/ShowcaseFeed.jsx`, `frontend/src/pages/marketplace/*`.
- Creator/Business dashboard: `frontend/src/pages/dashboard/*`, `frontend/src/components/dashboard/*`.
- Collaboration: `frontend/src/pages/collaboration/*`.
- Admin: `frontend/src/pages/admin/*`, `frontend/src/components/admin/*`.
- API integration: `frontend/src/api/*.js`.
- Test: `frontend/test/validation.test.mjs`, `frontend/tests/critical-api-flows.test.js`.

### 2.2 Backend

- Stack: Node.js, Express 5, JavaScript ES Modules, PostgreSQL, Prisma 7, JWT, bcrypt, Zod, Socket.IO, Redis adapter, RabbitMQ, Resend, multer, PDFKit.
- Bootstrap: `backend/src/app.js`, `backend/src/server.js`, `backend/src/routes/index.js`.
- Module convention: route → controller → service → repository → Prisma; request schema болон mapper тусдаа.
- Infrastructure: `backend/src/infrastructure/eventing/*`, `backend/src/infrastructure/realtime/*`.
- Background commands: `backend/scripts/process-collaboration-lifecycle.js`, `backend/scripts/reconcile-payments.js`, `backend/src/workers/outbox.js`.
- Schema: `backend/prisma/schema.prisma`.
- Integration tests: `backend/tests/integration/*.test.js`.

### 2.3 Архитектурын дүгнэлт

Modulith шаардлага **сайн хангагдсан**. Controller дотор Prisma query бичсэн гол зөрчил олдоогүй; repository нь persistence, service нь business rule хариуцсан. Module хооронд public service ашигласан orchestration байна. Гэхдээ зарим service transaction callback дотор Prisma client ашигладаг бөгөөд үүнийг repository abstraction-аар бүрэн нэг мөр болгох боломжтой. Энэ нь одоогоор blocker биш.

---

## 3. Functional requirement-ийн нийцлийн matrix

| Requirement | Төлөв | Нотолгоо | Дутуу зүйл |
|---|---|---|---|
| FR-1 Authentication | ✅ 95% | `backend/src/modules/auth/*`, `frontend/src/pages/auth/*`, `auth.test.js` | Production Resend sender/domain acceptance test external хэвээр. |
| FR-2 User Account | ✅ 90% | `users/*`, `AccountPage.jsx`, avatar/password/delete endpoints | Account UI-ийн бүх field болон delete confirmation-д component test нэмэх шаардлагатай. |
| FR-3 Creator Profile | 🟡 76% | `creator/*`, `portfolio/*`, `social-sync/*`, creator onboarding | Prisma-д байгаа `skills`, `languages`, `startingRate`, `currency`, `availableForWork`-ийг profile request/UI бүрэн удирдахгүй; YouTube manual connection тусгай flow дутуу. |
| FR-4 Business Profile | 🟡 80% | `business/*`, business onboarding, public profile | `Verified Payer` badge-г амжилттай funded/released payment history-оос боддог rule/DTO алга. |
| FR-5 Home Showcase Feed | 🟡 76% | `content/*`, `showcase/*`, `ShowcaseFeed.jsx` | Featured, trending, latest, recommended, following, popular, recently-viewed хэсгийг ялгасан deterministic ranking/section API бүрэн биш. |
| FR-6 Discover | 🟡 68% | `marketplace/*`, `discovery/*`, `SearchPages.jsx`, `SearchFilters.jsx` | Creator language/currency/skills; Business completed collaborations; alphabetical/trending sort; creators/businesses cursor pagination дутуу. `followers` sort одоогоор `createdAt` fallback ашиглаж байна. |
| FR-7 Follow, Save, Collections | ✅ 92% | `interactions/*`, `collections/*`, `LibraryPages.jsx` | Share-token management UI болон collection visibility edge-case test өргөтгөх хэрэгтэй. |
| FR-8 Compare, Shortlist | ✅ 90% | `sourcing/*`, `BusinessCreatorsPage`, 2–4 creator limit | Compare metric-ийн average views/platform aggregation-ийг verified social snapshot-аас тогтвортой гаргах хэрэгтэй. |
| FR-9 Work Offer | ✅ 90% | `offers/*`, `WorkOfferDialog.jsx`, offer integration tests | `CHANGES_REQUESTED` UX болон cancelled offer-ийн тусгай frontend state-г илүү тодорхой болгоно. |
| FR-10 Collaboration Workspace | ✅ 85% | `collaborations/*`, `CollaborationWorkspacePage.jsx` | Task/file хэсгийн зарим operation бүрэн CRUD биш; workspace-ийн бүх sub-navigation contract test дутуу. |
| FR-11 Negotiation, Agreement | ✅ 90% | agreement version, lock/action endpoints, typed contract snapshot | Concurrent edit conflict UI болон agreement change-note history-ийн frontend coverage нэмэх шаардлагатай. |
| FR-12 Messages, Files, Realtime | 🟡 80% | `messaging/*`, Socket.IO gateway, Redis adapter, `MessagingPages.jsx` | Typing start/stop event байхгүй; frontend message attachment upload UI бүрэн холбогдоогүй; production R2 adapter байхгүй. |
| FR-13 Tasks, Timeline | 🟡 58% | `CollaborationTask`, `CollaborationActivity`, task toggle endpoint | To Do/In Progress/Review/Done, priority, assignee, create/edit/delete task operations дутуу. |
| FR-14 Contract | 🟡 80% | `contracts/*`, `ContractVersion`, PDF endpoint | Backend бодит боловч `WorkflowPages.jsx` contract list/detail/sign/PDF нь static `contracts`, local decision болон mock toast ашиглаж байна. `GET /contracts` list endpoint алга. |
| FR-15 Payment, Escrow | 🟡 79% | QPay adapter, payment provider port, ledger, payout, reconciliation modules | Local default `PAYMENT_PROVIDER=mock`; refund/payout provider abstraction бүрэн production биш; QPay staging certification external. |
| FR-16 Deliverables | ✅ 86% | `deliverables/*`, media ownership, revision chain | `WorkflowPages.jsx` дотор өөр mock lifecycle давхар байгаа нь хэрэглэгчийг бодит workspace flow-оос зөрүүлж байна. |
| FR-17 Publish Proof | ✅ 86% | `PublishProof`, provider verification, retention job, metric snapshots | Production provider post lookup, retry policy, real scheduled worker deployment external. |
| FR-18 Reviews | ✅ 91% | completed-only bilateral review, delayed/simultaneous reveal, stale reveal job | Review moderation/appeal UI болон edge-case frontend test нэмэх шаардлагатай. |
| FR-19 Showcase | 🟡 84% | dual consent, showcase creation, content feed, public detail | Showcase-ийн Business relation/CTA-г legacy `ShowcasePost` DTO бүрд нэг мөр болгох; ranking/view/share counters-ийг бүрэн холбох шаардлагатай. |
| FR-20 Notifications | ✅ 85% | notification DB/preferences, outbox, RabbitMQ/memory broker, realtime, Resend | Production RabbitMQ/Resend credential, monitored worker, reminder scheduling external; notification deep-link role route зарим event-д ерөнхий байна. |
| FR-21 Analytics | 🟡 74% | summary, campaign JSON/PDF report, analytics event, dashboard pages | Recommendation/conversion funnel, verified social reach aggregation, scheduled rollup/cache дутуу. |
| FR-22 Admin | 🟡 74% | admin overview/list/mutations, audit, trust cases, finance pages | Feature flags/system settings backend алга; work-offer/collaboration dedicated admin list дутуу; content hide/unhide moderation operation бүрэн биш. |

### 3.1 Definition of Done шалгалт

| Acceptance flow | Төлөв | Тайлбар |
|---|---|---|
| Register → OTP → Login | ✅ | Backend integration test-тэй. |
| Creator ба Business profile | ✅ | Нэг user хоёр channel эзэмшиж болно. |
| Discover ба public profile | ✅ | Guest access, search/profile API ажиллана. |
| Business Work Offer → Creator response | ✅ | Interested/counter/decline/decision flow байна. |
| Business approval → Workspace | ✅ | Transactional bootstrap, idempotent source relation байна. |
| Agreement → Contract | ✅ | Version, dual approval, state guard байна. |
| Payment funded | 🟡 | Mock болон QPay adapter байна; production credential/certification хийгдээгүй. |
| Deliverable → Revision → Approval | ✅ | Version chain болон ownership хамгаалалттай. |
| Publish proof → Retention | ✅ local / 🌐 production | Sandbox/provider abstraction ба lifecycle job байна. Production provider permission шаардлагатай. |
| Collaboration completed | ✅ | Settlement болон lifecycle transition guard байна. |
| Two-sided review | ✅ | Simultaneous reveal болон stale reveal logic байна. |
| Showcase publish | ✅ | Dual consent болон public feed integration байна. |
| Notifications | ✅ local / 🌐 production | In-app/realtime/email code байна; production broker/email setup дутуу. |
| Admin disputes/reports | ✅ | TrustCase, freeze, evidence, award/refund operation байна. |
| Frontend бүх core flow backend-тэй | 🟡 | Contract, portfolio, settings болон нэг mock lifecycle үлдсэн. |
| Core integration tests | ✅ backend / 🟡 frontend | Backend 68 integration test; frontend 11 test боловч component/E2E coverage бага. |
| Production build | ✅ | Frontend lint/build хамгийн сүүлийн шалгалтаар pass. |

---

## 4. Frontend дээр бодитоор үлдсэн gap

### 4.1 Static, mock болон browser-only state

1. `frontend/src/pages/dashboard/WorkflowPages.jsx`
   - `contracts`-ийг `frontend/src/data/dashboard.js`-ээс авдаг.
   - Sign action `localStorage` decision болдог.
   - PDF download mock toast.
   - Deliverable/proof/review-ийн тусдаа mock stage нь бодит `CollaborationWorkspacePage` flow-той давхарддаг.

2. `frontend/src/pages/dashboard/DashboardUtilityPages.jsx`
   - Portfolio CRUD нь `DashboardDataProvider`-ийн local state ашигладаг; backend `portfolio` болон `media` API байгаа ч энэ page ашиглахгүй.
   - Channel settings/notification preferences-ийн зарим tab browser-only.

3. `frontend/src/context/DashboardDataProvider.jsx`
   - `dashboardCampaigns` болон `initialPortfolio` static fallback.
   - decisions, preferences, paymentMethods, payoutRequests, refundCases, analyticsEvents болон хуучин conversations state-ийн үлдэгдэл байна.
   - Ашиглагдахгүй болсон local state/action-уудыг устгаж provider-ийн responsibility-г багасгах шаардлагатай.

4. `frontend/src/pages/admin/AdminOperationalPages.jsx`
   - Admin settings нь browser-only draft гэж UI өөрөө мэдэгддэг.
   - Requirement дахь feature flag болон system setting server enforcement байхгүй.

5. Public SEO
   - `frontend/src/main.jsx` бүх public route-ийг Vite SPA-аар render хийдэг.
   - Creator/Business/Showcase бүрийн server-generated metadata, sitemap, JSON-LD, canonical бүрэн биш.

### 4.2 UI/UX function gap

- Message attachment сонгох/upload хийх control дутуу, API зөвхөн payload хүлээн авдаг.
- Task board нь SRS-ийн дөрвөн column болон drag/status update interaction-гүй.
- Contract жагсаалт loading/error/empty state бодит API response дээр ажиллахгүй.
- Discovery-ийн бүх filter URL state-д хадгалагдахгүй бөгөөд refresh/share хийхэд зарим сонголт алдагдана.
- Frontend component test бараг байхгүй; API contract mock test нь DOM behavior болон permission UX-г батлахгүй.

---

## 5. Backend, database ба infrastructure gap

### 5.1 Backend operation

- `GET /api/v1/contracts` — participant contract list endpoint байхгүй.
- Task create/update/delete/status transition endpoints байхгүй; зөвхөн `POST /collaborations/:id/tasks/:taskId/toggle` байна.
- Creator profile schema Prisma-д байгаа skills/languages/rate/currency/availability field-үүдийг бүрэн request mapping хийхгүй.
- Verified payer badge calculation алга.
- Admin platform settings, feature flags, admin work-offer/collaboration resource API алга.
- Content moderation hide/archive/restore action admin permission-тэй тусдаа operation хэлбэрээр бүрэн биш.
- Social sync-ийг 24 цаг тутам ажиллуулах production scheduler definition байхгүй.
- Expired OTP/token, processed outbox, analytics retention cleanup command codeоор бүрэн нотлогдохгүй.

### 5.2 Data/query gap

- Creator/business list page-offset pagination ашиглана; SRS cursor pagination шаардсан.
- Creator `followers` sort нь follower aggregate биш `createdAt` ашиглаж байна.
- Language, skills, currency болон completed collaboration filter/query дутуу.
- Content recommendation нь deterministic ranking/score тайлбаргүй; analytics event-ээс personalization хийдэггүй.
- Platform setting/feature flag entity байхгүй.

### 5.3 Production infrastructure gap

- Local media storage ашиглаж байна; Cloudflare R2 adapter болон malware scan байхгүй.
- Redis URL optional тул distributed Socket.IO/rate limit production readiness deployment-оос хамаарна.
- RabbitMQ optional бөгөөд memory broker fallback-тай; production worker monitoring/alert дутуу.
- QPay, Meta, Resend production credential болон provider acceptance test repository-оос нотлогдохгүй.
- `/health` нь process health өгдөг боловч DB, Redis, broker readiness/liveness-ийг тусад нь шалгахгүй.
- Redis cache болон analytics aggregation cache байхгүй.

### 5.4 Security/legal gap

- Refresh cookie хамгаалалт сайн боловч production cross-site topology сонговол CSRF strategy-г explicit болгож test хийх шаардлагатай.
- In-memory rate limit store horizontal deployment-д хангалтгүй.
- Paid partnership disclosure contract дээр default true ч content publish/proof үед бүх замд enforce хийж буй integration test дутуу.
- Admin 2FA UI draft боловч backend 2FA байхгүй. SRS-д admin system settings байгаа тул production admin hardening-д оруулна.
- Object storage upload-д antivirus/content moderation pipeline байхгүй.

---

## 6. 7 өдрийн хэрэгжүүлэх төлөвлөгөө

> Зорилго: 7 өдрийн дараа local implementation readiness-ийг **79%-аас 90%+** болгох. Meta App Review, QPay merchant certification, production RabbitMQ/Redis/R2 credential болон escrow-ийн хууль зүйн баталгааг кодоор хуурамчаар “хийсэн” гэж тэмдэглэхгүй.

## Өдөр 1 — Frontend mock-to-API cutover

### Өдрийн зорилго

Contract, portfolio, settings-ийн хэрэглэгчид харагддаг mock/local state-ийг устгаж бодит persistence-тэй болгох.

### Backend task

- `GET /api/v1/contracts` participant-only list endpoint нэмэх.
- Filter: `status`, `cursor`, `limit`, `q`.
- Response: contract summary, campaign, creator, business, amount/currency, current version, signed state, deadline, payment state.
- Contract ownership-ийг creator/business participant эсвэл admin-аар хязгаарлах.
- Одоо байгаа contract `action` болон `document` endpoint-ийн DTO-г frontend-д тогтвортой болгох.

### Frontend task

- `WorkflowPages.jsx` дахь static `contracts` import-ийг устгах.
- Contract list/detail/sign/request changes/PDF download-ийг `collaboration.api.js`-ийн бодит API-тай холбох.
- Mock `CollaborationLifecycle`-ийг устгаж contract-оос бодит workspace route руу шилжүүлэх.
- Portfolio page-ийг `creatorApi/portfolioApi + mediaApi` ашиглан CRUD болгох.
- Settings page-ийн profile tab-ийг creator/business profile API, notifications tab-ийг notification preference API ашигладаг болгох.
- Loading, retry, empty, validation, success/error toast нэмэх.
- `DashboardDataProvider`-оос эдгээрийн unused local state/action-ийг устгах.

### Test

- Participant өөрийн contract жагсаалтыг харна.
- Өөр collaboration-ийн contract 404/403.
- Creator ба Business sign дарааллаар ACTIVE болно.
- Portfolio create/update/delete refresh-ийн дараа хэвээр байна.
- Frontend component test: loading → data → error/retry.

### Дууссан байх үр дүн

- Contract, portfolio, channel settings дээр `mock`, static data, local persistence **0**.
- Доод тал нь **8 backend test**, **5 frontend component test** нэмэгдсэн байна.

---

## Өдөр 2 — Workspace task, file, timeline-ийг бүрэн болгох

### Өдрийн зорилго

FR-10, FR-12, FR-13-ын workspace-ийг жинхэнэ freelancer task board болгох.

### Database өөрчлөлт

`CollaborationTask` дээр:

- `status`: `TODO | IN_PROGRESS | REVIEW | DONE`
- `priority`: `LOW | MEDIUM | HIGH | URGENT`
- `assigneeId` nullable relation
- `sortOrder`
- optimistic concurrency-д `version`

Migration нь хуучин completed task-ийг `DONE`, бусдыг `TODO` болгон backfill хийнэ.

### Backend API

- `POST /api/v1/collaborations/:id/tasks`
- `PATCH /api/v1/collaborations/:id/tasks/:taskId`
- `DELETE /api/v1/collaborations/:id/tasks/:taskId`
- Одоо байгаа toggle endpoint-ийг compatibility alias болгон хадгалах.
- File add хийхээс өмнө MediaAsset owner/participant болон MIME/size permission шалгах.
- Task/file mutation бүр `CollaborationActivity` болон OutboxEvent үүсгэнэ.

### Frontend task

- Workspace дээр дөрвөн баганатай responsive task board.
- Create/edit modal, assignee, due date, priority, status move.
- Collaboration file upload-ийг `mediaApi.upload` → workspace file API дарааллаар хийх.
- Message composer дээр attachment upload/preview/remove нэмэх.
- Timeline-г зөвхөн server activity-аас render хийх.

### Business rule

- Зөвхөн collaboration participant task/file харна.
- Terminal collaboration дээр шинэ task/file хориглоно.
- Creator/Business зөвхөн workspace participant-уудыг assignee болгоно.
- Deleted task audit activity үлдэнэ.

### Test ба DoD

- CRUD/status/ownership/concurrent-version-ийн **10+ integration test**.
- Message attachment IDOR болон file MIME test.
- Mobile/tablet task board component test.
- Refresh хийсний дараа task/file/timeline бүрэн сэргээгдэнэ.

### Хэрэгжилтийн үр дүн — 2026-08-07

- [x] `CollaborationTaskStatus`, `CollaborationTaskPriority`, `assigneeId`, `sortOrder`, `version` schema болон migration нэмэгдсэн; legacy completed task-ууд `DONE`, бусад нь `TODO` болж backfill хийгдсэн.
- [x] Task create/update/delete API болон хуучин toggle compatibility endpoint хэрэгжсэн.
- [x] Optimistic concurrency нь stale `version`-д `409 TASK_VERSION_CONFLICT` буцаадаг болсон.
- [x] Creator/Business participant assignment, terminal workspace guard, task/file ownership болон MIME/25 MB rule server-side хэрэгжсэн.
- [x] Task/file mutation бүр `CollaborationActivity` болон `OutboxEvent`-ийг нэг transaction-д үүсгэдэг болсон.
- [x] Workspace task UI нь mobile 1, tablet 2, desktop 4 баганатай responsive board; create/edit modal, assignee, due date, priority, status move, delete action-тай болсон.
- [x] Collaboration file flow `mediaApi.upload` → workspace file API дарааллаар, server-ийн authoritative media metadata ашигладаг болсон.
- [x] Message composer attachment select/preview/remove/upload/send урсгалтай болсон; attachment IDOR хамгаалалт нэмэгдсэн.
- [x] Timeline зөвхөн backend-ийн persisted activity DTO-оос render хийдэг болсон.
- [x] Backend Day 2 integration test **14/14**, backend full suite **91/91**, frontend full suite **20/20**, lint болон production build pass.

---

## Өдөр 3 — Discover, Home feed, filter, ranking

### Өдрийн зорилго

FR-5 болон FR-6-г SRS-ийн хайлт, cursor pagination, section/ranking шаардлагад хүргэх.

### Backend task

- Creator/Business list response-д backward-compatible `nextCursor` нэмэх; frontend cutover дууссаны дараа page-offset-ийг deprecate хийх.
- Creator filter:
  - category/niche
  - platform
  - followers
  - engagement
  - rating
  - starting rate + currency
  - verified/available
  - location/language/skills
- Business filter:
  - industry/location/verified/rating/completed collaborations
- Sort:
  - trending
  - most followed
  - highest rated
  - newest
  - price low/high
  - alphabetical
- `followers` sort-ийг SocialAccount aggregate-аар бодитоор засах.
- Feed section/ranking:
  - featured
  - trending
  - latest
  - recommended
  - following
  - popular creators/businesses
  - recently viewed
- Viewer/Guest-д campaign content харагдахгүй гэсэн одоогийн rule-г хадгалах.

### Frontend task

- Filter state-ийг URL query-тай sync хийх.
- 300ms debounce-ийг бүх public search-д нэг hook/service болгох.
- Cursor infinite loading, duplicate prevention, abort stale request.
- Home feed-ийн section selector болон Following empty state.
- Search нь creator/business/description/category/location-аар тухайн page дотроо ажиллана.

### Test ба DoD

- Filter/sort/cursor-ийн **15 integration test**.
- Viewer campaign exclusion regression test хэвээр pass.
- 10,000 seed profile дээр duplicate/missing cursor item 0.
- Search/filter reload болон shared URL test.

### Хэрэгжилтийн үр дүн — 2026-08-07

- [x] Creator/Business list нь хуучин `page`/`pagination` contract-оо хадгалсан мөртлөө opaque, sort-bound `nextCursor` буцаадаг болсон.
- [x] Creator filter нь category, platform, aggregate follower range, engagement range, rating, rate/currency, verified/available, location/language/skills-ийг server-side хэрэгжүүлсэн.
- [x] Business filter нь industry/location/verified/rating/completed collaboration count-ийг server-side хэрэгжүүлсэн.
- [x] Trending, most followed, highest rated, newest, price low/high, alphabetical sort deterministic tie-break-тэй болсон.
- [x] `followers`/`most_followed` sort нь `SocialAccount.followerCount`-уудын бодит нийлбэрээр эрэмбэлдэг болсон.
- [x] Feed нь featured, trending, latest, recommended, following section contract болон popular creator/business, recently viewed discovery section-тэй болсон.
- [x] Guest/Viewer campaign content харахгүй, зөвхөн Creator role харна гэсэн regression rule хадгалагдсан.
- [x] Public search filter state URL query-д хадгалагдаж reload/shared URL-аас бүрэн сэргэдэг болсон.
- [x] Public search бүр нэг shared 300 ms debounce hook ашиглаж, stale Axios request-ээ `AbortController`-оор цуцалдаг болсон.
- [x] Creator/Business result cursor-аар infinite load хийж, ID-based merge-ээр duplicate card гаргахгүй болсон.
- [x] Showcase/Home feed дээр For you, Featured, Trending, Latest, Following section selector, Following empty state болон same-page category/search URL state хэрэгжсэн.
- [x] Search нь content title/caption, creator/business name, bio/description, category болон location-аар тухайн feed дотроо ажилладаг болсон.
- [x] Day 3 filter/sort/cursor integration test **15/15**, shared URL/duplicate merge frontend test **2/2** pass.
- [x] 10,000 temporary seed profile, 200 cursor page stress test: **0 duplicate, 0 missing**, test data автоматаар цэвэрлэгдсэн.

---

## Өдөр 4 — Creator trust, social profile, verified payer

### Өдрийн зорилго

Marketplace-ийн шийдвэр гаргалтад шаардлагатай profile data болон verification truth-ийг бүрэн болгох.

### Backend task

- Creator create/update schema-д:
  - `categories[]`
  - `skills[]`
  - `languages[]`
  - `startingRate`
  - `currency`
  - `availableForWork`
  - controlled availability enum
- Manual social account CRUD endpoint нэмэх; manual account үргэлж `UNVERIFIED` байна.
- YouTube manual profile link-ийг тусгай platform болгон дэмжих.
- OAuth account-ийг manual edit устгахгүй гэсэн одоогийн rule-г хадгалах.
- `verifiedPayer`-ийг successful funded/released payment болон dispute/refund state-аас server-side тооцох.
- 24 цагийн stale social account sync command/worker нэмэх.

### Frontend task

- Creator onboarding/settings/profile edit-д skills, languages, currency, rate, availability.
- Manual болон OAuth verified badge-г ойлгомжтой ялгах.
- Last synced/stale/reauth/error state.
- Business profile дээр Verified Payer badge болон тайлбар.
- Compare page дээр verified statistics captured date харуулах.

### Test ба DoD

- Manual data verified болохгүй.
- OAuth connection encrypted token response-д гарахгүй.
- Stale 24h sync, refresh failure, reauth state test.
- Refund/dispute-тэй business-д payer badge буруу олгогдохгүй.
- **10+ backend**, **4+ frontend** test.

### Хэрэгжилтийн төлөв — 2026-08-07

- [x] Creator create/update API нь `categories[]`, `skills[]`, `languages[]`, `startingRate`, `currency`, `availableForWork`, controlled availability утгуудыг validate хийж хадгална.
- [x] Manual social profile create/update/delete API нэмэгдсэн; YouTube тусдаа platform бөгөөд manual data үргэлж `UNVERIFIED` байна.
- [x] OAuth account-ийг manual update өөрчлөхгүй, profile edit OAuth token/stat-ийг устгахгүй, response encrypted token буцаахгүй.
- [x] `npm run job:social-sync` нь 24+ цаг болсон provider account-уудыг sync хийж, failure-ийг `ERROR` эсвэл `REAUTH_REQUIRED` төлөвт оруулна.
- [x] `verifiedPayer` нь channel verification-оос тусдаа бөгөөд зөвхөн refund/dispute-гүй `FUNDED`/`RELEASED` funding payment-аас server-side тооцогдоно.
- [x] Creator onboarding болон My Account settings дээр skills, languages, rate, currency, availability, YouTube/manual social удирдлага нэмэгдсэн.
- [x] Social UI нь manual, OAuth verified, stale, error, reauth болон last synced төлөвийг ялгаж харуулна.
- [x] Business profile Verified Payer-ийн шалгуур, qualified date-ийг тайлбарлана; Compare хүснэгт verified snapshot capture date харуулна.
- [x] Day 4 backend integration **16/16**, frontend trust presentation **7/7** pass.
- [x] Бүх regression: backend **122/122**, frontend **29/29**, ESLint болон production build pass.

---

## Өдөр 5 — Payment, contract, disclosure hardening

### Өдрийн зорилго

Real provider асаахын өмнөх мөнгө, contract болон paid-content invariant-уудыг хаах.

### Backend task

- `payment.service.js` доторх mock-specific operation-уудыг provider port-оор бүрэн дамжуулах.
- Funding, refund, payout capability-г provider тус бүр explicit болгох; unsupported operation fake success өгөхгүй.
- QPay callback audit, replay, amount/currency/providerRef reconciliation-г өргөтгөх.
- Ledger posting batch бүр debit/credit тэнцүү, idempotent болох DB/service invariant.
- Dispute active үед release/refund/payout freeze rule-ийг бүх entry point дээр шалгах.
- `disclosureRequired=true` contract дээр publish proof/content publish үед paid partnership flag шаардах.
- Payout account encryption болон admin decision audit-ийг regression test-ээр батлах.

### Frontend task

- Funding intent-ийн provider redirect/QR/expiry state.
- Processing, failed, funded, refunded state-үүдийг polling/realtime-аар шинэчлэх.
- Creator wallet balance нь зөвхөн ledger endpoint-оос ирнэ.
- Admin finance дээр payout approve/reject, reconciliation, refund reason бодит API ашиглана.
- Disclosure requirement-ийг deliverable/publish-proof form дээр заавал харуулах.

### Test ба DoD

- Duplicate callback, wrong amount, wrong currency, replay, concurrent payout test.
- Ledger invariant property-style test; balance зөрүү **0**.
- Paid partnership disclosure bypass хийх боломжгүй.
- QPay-г credentialгүй local орчинд mock гэж андуурч success болгохгүй.
- Санхүүгийн **15+ integration test**.

### Хэрэгжилтийн төлөв — 2026-08-07

- [x] Funding/refund/payout/webhook capability бүхий provider port нэмэгдэж, `mock`, QPay, Stripe operation дэмжлэгээ explicit зарладаг; unsupported operation `501` өгч fake success хийхгүй.
- [x] Stripe Hosted Checkout funding, Stripe refund, raw-body HMAC webhook verification, 5 минутын replay window, amount/currency/provider reference reconciliation бүрэн холбогдсон.
- [x] Stripe Checkout success/cancel нь тухайн Business collaboration workspace руу буцаж, UI provider redirect, QR, expiry, polling болон manual refresh-ийг харуулна.
- [x] QPay credentialгүй үед fail-closed; callback нь provider check, providerRef, amount, currency, event replay audit-аар хамгаалагдсан.
- [x] Ledger posting batch нь debit/credit balance, batch fingerprint болон idempotent replay invariant-тай; 100 generated batch property test pass.
- [x] Collaboration dispute эсвэл active TrustCase үед release, refund, payout, reconciliation бүх entry point freeze хийнэ.
- [x] Required disclosure-тэй contract-ийн publish proof/content publish нь `paidPartnership=true`-гүй бол server-side хаагдана; frontend checkbox-гүй submit хийх боломжгүй.
- [x] Creator wallet бодит ledger summary ашиглана; Admin finance нь refund reason, payout approve/reject болон reconciliation API ашиглана.
- [x] Concurrent payout decision нь богино atomic claim ашигладаг: нэг provider call амжилттай үргэлжилж, давхар хүсэлт хурдан `409` авна.
- [x] Payout account encryption, callback replay/mismatch, concurrent payout, dispute freeze, disclosure bypass болон ledger invariant regression тесттэй.
- [x] Day 5 payment hardening test **23/23**, хамтатгасан collaboration/payment suite **48/48**, backend бүх integration **146/146** pass.
- [x] Frontend Node + Vitest **32/32**, ESLint болон production build pass.
- [ ] Stripe Connect connected-account onboarding болон production creator payout — external Stripe account/KYC configuration шаардана; одоогоор capability нь зориуд unsupported бөгөөд fake payout үүсгэхгүй.

---

## Өдөр 6 — Admin, moderation, operations, background jobs

### Өдрийн зорилго

FR-20–FR-22 болон production operation-ийн browser-only хэсгийг server-enforced болгох.

### Database

- `PlatformSetting`
- `FeatureFlag`
- setting change бүр `AdminAction` audit-тай.
- Secret утгыг setting table-д plaintext хадгалахгүй.

### Backend API

- `GET/PATCH /api/v1/admin/settings`
- `GET/POST/PATCH /api/v1/admin/feature-flags`
- `GET /api/v1/admin/offers`
- `GET /api/v1/admin/collaborations`
- `POST /api/v1/admin/content/:id/hide`
- `POST /api/v1/admin/content/:id/restore`
- `GET /api/v1/health/live`
- `GET /api/v1/health/ready`
- Ready check: PostgreSQL, Redis шаардлагатай mode, broker, worker backlog threshold.

### Background jobs

- Expired OTP cleanup.
- Revoked/expired refresh token cleanup.
- Processed/dead-letter outbox retention cleanup.
- 24h social sync.
- Collaboration lifecycle/retention/reminder.
- Analytics daily aggregation.
- Job бүр distributed lock, retry, last-run metric, structured log-той.

### Frontend task

- Admin settings browser-only state-ийг API болгох.
- Feature flag өөрчлөлт server enforcement-тэй байх.
- Offers/collaborations/content moderation table бодит API data ашиглах.
- Admin action бүр reason confirmation шаарддаг болгох.

### Test ба DoD

- Non-admin бүх admin mutation 403.
- Setting/flag audit trail complete.
- Hidden content public feed/profile-оос алга болно; restore буцаана.
- Job давхар ажиллахад duplicate notification/payment operation үүсэхгүй.
- **12+ integration test**, worker failure/DLQ test.

### Хэрэгжүүлэлтийн төлөв (2026-08-07)

- [x] `PlatformSetting`, `FeatureFlag`, `JobLease`, `JobRun`, `AnalyticsDailyRollup` model болон migration нэмсэн.
- [x] Settings API зөвхөн whitelist хийсэн non-secret утга хадгалж, өөрчлөлт бүр before/after/reason бүхий `AdminAction` үүсгэдэг.
- [x] Feature flag API болон creator/business onboarding, campaign/content publishing дээрх server-side enforcement нэмсэн.
- [x] Offers, collaborations, content moderation admin list бодит PostgreSQL data ашигладаг болсон.
- [x] Content hide/restore нь public feed, channel profile, detail endpoint-д шууд хэрэгжиж, audit trail үлдээдэг.
- [x] Liveness болон PostgreSQL/Redis/RabbitMQ/outbox backlog шалгадаг readiness endpoint нэмсэн.
- [x] OTP/token/outbox cleanup, 24h social sync, collaboration lifecycle, analytics rollup job-ууд distributed lease, retry, run metric, structured log-той болсон.
- [x] Admin settings localStorage draft-ийг API-backed UI-аар сольж, mutation бүр reason + confirmation шаарддаг болсон.
- [x] Day 6 integration test **15/15 pass**, worker retry/dead-letter болон concurrent duplicate prevention хамрагдсан.

---

## Өдөр 7 — SEO, accessibility, testing, performance, release gate

### Өдрийн зорилго

Хийсэн feature-үүдийг хэмжигдэхүйц release candidate болгох.

### Public SEO

- `/creators/:slug`, `/businesses/:slug`, `/showcase/:id` дээр unique title/description/canonical/OpenGraph.
- Creator, Business, Showcase JSON-LD.
- Dynamic sitemap болон robots.txt.
- Vite SPA-ийн crawl limitation-ийг шийдэхийн тулд public route prerender эсвэл `docs/adr/0001-public-ssr-migration.md`-ийн SSR first phase-г хэрэгжүүлэх.
- Private/dashboard route-ийг `noindex` болгох.

### Accessibility

- Keyboard-only navigation audit.
- Modal focus trap/restore, escape close.
- Visible focus, form label, error `aria-live`.
- Contrast болон reduced-motion check.
- Marketplace feed action-ууд accessible name/state-тэй байх.

### Testing

- Backend service/integration coverage report.
- Frontend Testing Library component tests:
  - auth restore
  - protected/role route
  - discover filters
  - follow/save
  - contract action
  - workspace task/file
  - payment state
  - admin permission
- Browser E2E:
  1. Register → OTP → Creator onboarding
  2. Business offer → Creator counter → Business approve
  3. Contract → Funding → Deliverable → Proof → Review → Showcase
- IDOR matrix, webhook replay, signed URL expiry, role matrix regression.

### Performance ба release

- Staging-like dataset дээр API p95 < 400ms хэмжих.
- Slow query index audit.
- Feed image/video lazy load болон bundle chunk budget.
- `frontend npm run check`, backend full suite, Prisma validate/migrate deploy dry run.
- `docs/release-blockers.md`-ийг бодит үр дүнгээр шинэчлэх.

### Дууссан байх үр дүн

- Backend/frontend бүх test green.
- Critical E2E **3/3 pass**.
- Known critical security/money defect **0**.
- Public SEO metadata coverage **100%**.
- Local requirement readiness **90%+**.
- External blocker тусдаа, эзэн ба баталгаажуулах огноотой байна.

### Хэрэгжүүлэлтийн төлөв — 2026-08-07

- [x] Creator, Business, Showcase public detail бүр dynamic title/description/canonical/OpenGraph/Twitter болон Person/Organization/CreativeWork JSON-LD-тэй болсон.
- [x] PostgreSQL-backed `/sitemap.xml`, `/robots.txt`, active/published visibility болон private/dashboard `noindex` policy automated test-тэй болсон.
- [x] ADR 0001 Phase 1 metadata/index groundwork хэрэгжиж, actual SSR Phase 2 acceptance ба deployment routing тодорхой болсон.
- [x] Shared Dialog/Drawer focus trap, restore, Escape; form error semantics; visible focus/reduced-motion; feed follow/like/save accessible state source audit болон Testing Library test-тэй.
- [x] Auth restore, anonymous/role protected route, contract action, workspace task, payment API state, discovery query, follow/save болон admin/IDOR regression suite ногоон.
- [x] Backend coverage: **171/171 pass**, line **86.30%**, branch **72.41%**, function **78.70%**; SEO module **100%**.
- [x] Frontend: Node **5/5**, Vitest **40/40**, нийт **45/45**; ESLint/build/bundle budget pass.
- [x] Local feed smoke 50 request: p95 **23.45 ms**; largest JS chunk **232,549 B**, total asset **1,290,170 B**, хоёулаа budget дотор.
- [x] Prisma validate/generate/migrate deploy dry run pass, pending migration **0**.
- [x] Critical domain/API workflow **3/3 pass**, known critical security/money defect **0**.
- [ ] Critical flow-уудыг жинхэнэ Chromium Playwright дээр **3/3** ажиллуулах — Frontend + QA, 2026-08-10.
- [ ] Staging-like anonymized dataset p95 < 400 ms батлах — Backend + DevOps, 2026-08-10.
- [ ] JS-гүй crawler-д actual rendered metadata өгөх ADR 0001 Phase 2 SSR — Frontend platform, 2026-08-21.

Бодит command, coverage, performance болон blocker-ийн нотолгоо `docs/day7-quality-report.md`, `docs/slow-query-index-audit.md`, `docs/release-blockers.md`-д байна.

---

## 7. Өдөр бүрийн dependency дараалал

```text
Day 1: UI truth / API cutover
    ↓
Day 2: Workspace data model + full operations
    ↓
Day 3: Discovery/feed query contract
    ↓
Day 4: Trusted creator/business data
    ↓
Day 5: Money + legal invariants
    ↓
Day 6: Admin enforcement + scheduled operations
    ↓
Day 7: SEO + E2E + performance + release gate
```

Энэ дараалал нь эхлээд хэрэглэгчид худал local/mock state харуулах асуудлыг хааж, дараа нь domain gap, money safety, operations, хамгийн сүүлд release quality-г баталгаажуулна.

---

## 8. 7 хоногт кодоор бүрэн дуусгах боломжгүй external blocker

| Blocker | Яагаад external вэ | 7 хоногт хийх бэлтгэл | Дууссаны нотолгоо |`` Thank you easy function no no no
|---|---|---|---|
| Meta App Review | Meta permission/approval шаарддаг | Provider contract, sandbox, scopes, callback staging test | Production Instagram/Facebook account connect + sync log |
| QPay merchant certification | Merchant credential/provider approval | Adapter, webhook, reconciliation, failure test | Staging invoice + signed callback + zero reconciliation diff |
| Cloudflare R2 | Account/bucket/credential хэрэгтэй | Storage port, signed URL, local contract test | Production upload/download + expiry + malware policy |
| RabbitMQ/Redis | Managed instances ба alert хэрэгтэй | Retry/DLQ/adapter code, readiness check | Monitored worker, reconnect test, backlog alert |
| Resend sender domain | DNS/domain verification шаарддаг | Template, preference, retry handling | Verified sender-аас acceptance email |
| Escrow/legal policy | Монголын хууль, гэрээ, татварын зөвлөгөө | State machine/configurable terms/audit | Legal sign-off болон approved policy version |
| Real pilot | Бодит Business/Creator оролцоно | Seed биш staging workflow, feedback form | 3 pilot collaboration completion evidence |

External blocker-ийг `done` гэж тэмдэглэхгүй. Code complete болон production verified гэсэн хоёр тусдаа төлөв ашиглана.

---

## 9. 7 хоногийн дараах зорилтот оноо

| Хэсэг | Одоо | 7 хоногийн зорилт |
|---|---:|---:|
| Functional requirements | 82% | 93% |
| Frontend–Backend integration | 74% | 95% |
| Architecture/database | 91% | 94% |
| Authentication/security | 84% | 91% |
| Non-functional requirements | 58% | 76% local implementation |
| Testing/release readiness | 72% | 90% |
| **Нийт readiness** | **79%** | **90%+ local** |

Production readiness нь external provider/infrastructure баталгаажилтаас шалтгаалан local readiness-ээс тусдаа хэмжигдэнэ.

---

## 10. Эхэлж засах хамгийн чухал 10 зүйл

1. Contract list/detail/sign/PDF mock UI-г бодит API болгох.
2. Portfolio болон settings browser-only persistence-г арилгах.
3. Workspace task board CRUD/status/priority/assignee хийх.
4. Creator/Business discovery cursor pagination болон дутуу filter-үүдийг хийх.
5. `followers` sort defect-ийг засах.
6. Creator skills/languages/rate/currency API/UI mapping хийх.
7. Payment provider port-ийг funding/refund/payout бүх operation-д мөрдүүлэх.
8. Admin settings/feature flag/moderation-ийг server-enforced болгох.
9. Object storage, cleanup/sync scheduler, readiness checks хийх.
10. Public SEO + component/E2E + p95 release gate хийх.

Эдгээрээс эхний тав нь дуусахад хэрэглэгчид шууд харагдах бодит ажиллагааны gap эрс багасна. Харин 7–10 нь дипломын төслийг demo түвшнээс хамгаалалттай, хэмжигдэхүйц fullstack системийн түвшинд хүргэнэ.
I actually use it for
