# Influence Hub — Requirement нийцлийн шинжилгээ ба 6 өдрийн төлөвлөгөө

Шалгасан огноо: 2026-08-01  
Эх баримт: `requirement.md` v0.1 Draft  
Аргачлал: frontend route/page/context/API, backend route/controller/service/repository/validation, Prisma schema, dependency болон test файлуудад хийсэн static analysis. Энэ шалгалтаар dependency суулгах, сервер асаах, test ажиллуулах үйлдэл хийгээгүй.

## 1. Товч дүгнэлт

Төсөл нь энгийн UI prototype-оос нэлээд урагшилсан. Backend нь modular monolith хэлбэртэй, authentication, channel profile, marketplace, campaign/proposal/sourcing, offer/collaboration/contract, mock payment, deliverable, review, showcase, REST messaging, notification, analytics болон admin суурь module-уудтай.

Гэхдээ `requirement.md` нь production influencer marketplace-ийн босго тавьсан. Тэр босгын хамгийн гол хэсгүүд болох Meta OAuth/statistics sync, QPay, immutable ledger/reconciliation, publish proof + retention checking, delayed/automatic settlement, campaign performance PDF, Socket.io/Redis, RabbitMQ worker, R2 signed URL, SSR/SEO одоогийн кодод байхгүй.

### Ойролцоолсон нийцэл

| Хэсэг | Нийцэл | Тайлбар |
|---|---:|---|
| MVP функциональ шаардлага | **55%** | Гол CRUD болон collaboration skeleton бодит API-тай; social/payment/proof/report/realtime дутуу |
| Функциональ бус шаардлага | **23%** | Security суурь боломжийн боловч мөнгө, social API, SSR, queue, performance баталгаа алга |
| Definition of Done | **30%** | Creator search/invite болон зарим workflow нотлогдсон; production acceptance flow-ууд бүрдээгүй |
| Нийт requirement readiness | **ойролцоогоор 46%** | `FR 70% + NFR 20% + DoD 10%` жингээр хийсэн static estimate |

> Энэ 46% нь кодын чанарын оноо биш. `requirement.md`-ийн production scope-тэй харьцуулсан гүйцэтгэлийн хэмжээ юм. UI/page coverage үүнээс өндөр боловч олон admin, finance, dashboard хэсэг static data эсвэл localStorage fallback ашиглаж байна.

## 2. Одоогийн төслийн бодит бүтэц

### Frontend

- React 19 + Vite + React Router + Tailwind CSS 4, JavaScript.
- 94 route тодорхойлогдсон: `frontend/src/main.jsx`.
- Auth, onboarding, public marketplace, creator/business dashboard, collaboration workspace, admin console page-ууд байна.
- API integration-ийн гол provider-ууд:
  - `frontend/src/context/AuthProvider.jsx`
  - `frontend/src/context/MarketplaceProvider.jsx`
  - `frontend/src/context/DashboardDataProvider.jsx`
  - `frontend/src/context/CollaborationProvider.jsx`
- Гэхдээ олон page `frontend/src/data/admin.js`, `frontend/src/data/dashboard.js`, `frontend/src/data/marketplace.js` болон localStorage state ашигласаар байна.
- Frontend test нь зөвхөн validation-ийн 3 test: `frontend/test/validation.test.mjs`.
- Requirement дахь React + TypeScript + SSR шаардлагаас зөрсөн: одоогийн frontend JavaScript SPA, Next.js/Remix биш.

### Backend

- Node.js + Express 5 + PostgreSQL + Prisma, JavaScript modular monolith.
- Module бүр route/controller/service/repository/schema хэлбэртэй салсан.
- 45 Prisma model, 25 enum байна: `backend/prisma/schema.prisma`.
- 5 integration test файлд 40 test case байна: `backend/tests/integration/`.
- Zod validation, JWT access/refresh, bcrypt, rate limiting, Helmet, CORS, common error envelope ашигласан.
- Requirement дахь TypeScript-ээс зөрсөн ч modular monolith бүтэц нь зөв.

### Одоогоор dependency түвшинд байхгүй зүйлс

- `socket.io`, Redis adapter
- RabbitMQ client (`amqplib`) болон worker/DLQ
- QPay provider
- Cloudflare R2/S3 signed URL adapter
- PDF generation library
- Next.js/Remix SSR
- Meta/Instagram/Facebook OAuth SDK эсвэл provider client

## 3. Функциональ шаардлагын нэг бүрийн шалгалт

Тэмдэглэгээ: **✅ хийсэн**, **🟡 хэсэгчлэн**, **❌ хийгдээгүй**.

### FR-1. Бүртгэл, account, channel

| ID | Төлөв | Кодын нотолгоо ба gap |
|---|---|---|
| FR-1.1 | 🟡 | Нэгдсэн email/password registration бий: `backend/src/modules/auth/`. Google button нь “not connected”: `frontend/src/pages/auth/LoginPage.jsx`. `/auth/google` flow байхгүй. |
| FR-1.2 | ✅ | OTP email verification, resend cooldown, attempt/expiry, Resend adapter, integration test бий: `auth.service.js`, `auth.email.js`, `auth.test.js`. |
| FR-1.3 | ✅ | Verification дараа `/welcome`; Creator, Business, Viewer сонголттой: `WelcomePage.jsx`. Login бүрт welcome рүү хүчээр оруулахгүй. |
| FR-1.4 | ✅ | Нэг User дээр CreatorProfile болон BusinessProfile тусдаа optional relation; account/onboarding-оос дараа channel үүсгэнэ. |
| FR-1.5 | 🟡 | Creator profile, зураг, cover, bio, niche, audience, rates, portfolio CRUD бий. “Үйлчилгээ” нь тусгай entity биш, JSON/rates/metadata-д нийлсэн. |
| FR-1.6 | ❌ | Instagram/Facebook OAuth, access/refresh token, Graph API client байхгүй. URL-г гараар SocialAccount болгон хадгалдаг. |
| FR-1.7 | 🟡 | SocialAccount default `UNVERIFIED`, UI badge ялгаатай. Гэхдээ follower/engagement гараар оруулах баталгаатай flow байхгүй. |
| FR-1.8 | 🟡 | Business profile CRUD бий. `verifiedPayer` escrow-аас автоматаар тогтохгүй; зөвхөн ерөнхий `verificationStatus` байна. |
| FR-1.9 | 🟡 | Profile/portfolio API бодит. Dashboard-ийн preferences, payment methods, payout/refund, зарим portfolio/decision state localStorage хэвээр. |
| FR-1.10 | ✅ | Viewer public discovery үзнэ; role middleware/channel-required business rule болон restricted action dialog бий. |
| FR-1.11 | ❌ | 24 цагийн social sync job, `lastSyncAt`, `syncStatus`, stale warning, token refresh байхгүй. |

### FR-2. Creator хайлт

| ID | Төлөв | Кодын нотолгоо ба gap |
|---|---|---|
| FR-2.1 | ✅ | Category, platform, follower, engagement, rating, price, verified, pagination/filter backend-д бий: `marketplace.schema.js`, `marketplace.repository.js`. `followers` sort одоогоор createdAt fallback ашиглаж байгаа жижиг defect-тэй. |
| FR-2.2 | ✅ | Compare persistent API, campaign context, 4 creator limit: `sourcing.service.js`. |
| FR-2.3 | ✅ | Shortlist add/remove/list persistent API: `sourcing.routes.js`. |

### FR-3. Campaign

| ID | Төлөв | Кодын нотолгоо ба gap |
|---|---|---|
| FR-3.1 | 🟡 | Campaign CRUD, goal, platform, budget, deadline, deliverables, requirements бий. Brand guideline/brief file relation болон product support тусгай field/validation байхгүй. Frontend wizard file upload хийхгүй. |
| FR-3.2 | ✅ | Public campaign + proposal болон direct invitation/offer урсгал хоёулаа бий. |
| FR-3.3 | ✅ | Proposal price, message/pitch, timeline, deliverables, counter flow бий. |
| FR-3.4 | 🟡 | Schema олон creator/collaboration зөвшөөрнө. Гэхдээ proposal `ACCEPT` нь шууд collaboration/contract үүсгэдэггүй; direct offer flow тусдаа байна. |

### FR-4. Contract, escrow, execution lifecycle

| ID | Төлөв | Кодын нотолгоо ба gap |
|---|---|---|
| FR-4.1 | 🟡 | Agreement/Contract versioning, terms JSON, approvals бий. Revision limit болон publish date нь typed field биш, contract term дотор байж болох бөгөөд service enforce хийхгүй. |
| FR-4.2 | 🟡 | State transition хамгаалалт бий. Гэхдээ requirement-ийн Published, Proven, Disputed төлөвүүд enum-д байхгүй; deliverable approval-аар collaboration шууд `COMPLETED` болдог. |
| FR-4.3 | 🟡 | Funding gate болон signed/idempotent webhook pattern бий. Provider нь зөвхөн `mock`; QPay байхгүй. |
| FR-4.4 | 🟡 | Creator upload, business approve/revision request, version chain бий. Contract revision count limit enforce хийхгүй. |
| FR-4.5 | ❌ | `PublishProof` entity/API, post link/screenshot validation, Graph API proof, metrics snapshot, still-live retention checker байхгүй. |
| FR-4.6 | ❌ | Proof дараах dispute window, N-day delayed release, business 7-day auto approval байхгүй. Одоогийн release deliverable approval/completion-тэй шууд холбоотой. |
| FR-4.7 | 🟡 | Dispute open/evidence болон payment freeze бий; admin resolve case бий. Ledger award split, гурван шийдвэрийн мөнгөний бичилт, full evidence snapshot байхгүй. |

### FR-5. Payment, commission, payout

| ID | Төлөв | Кодын нотолгоо ба gap |
|---|---|---|
| FR-5.1 | ❌ | Immutable double-entry `LedgerEntry` байхгүй. Payment records нь ledger биш; daily reconciliation worker/report байхгүй. |
| FR-5.2 | ❌ | `platformFee` field байгаа боловч funding intent дээр 10% автоматаар бодохгүй, commission entry үүсгэхгүй. |
| FR-5.3 | 🟡 | Payout request model/service бий. Bank account, encryption, minimum threshold, admin approval, tax statement/export API байхгүй. |

### FR-6. Campaign report

| ID | Төлөв | Кодын нотолгоо ба gap |
|---|---|---|
| FR-6.1 | 🟡 | Collaboration/payment/deliverable summary analytics бий. Social reach/view/engagement snapshot болон published URL metrics байхгүй. |
| FR-6.2 | ❌ | Aggregated reach, CPM/CPE, creator comparison report, server-generated PDF байхгүй. Frontend export/contract PDF-ийн зарим action mock/print preview. |

### FR-7. Chat ба review

| ID | Төлөв | Кодын нотолгоо ба gap |
|---|---|---|
| FR-7.1 | 🟡 | Participant-only persistent REST chat, cursor pagination, attachment ownership, IDOR test бий. Socket.io/Redis realtime delivery байхгүй. |
| FR-7.2 | 🟡 | Completed collaboration дээр bilateral review бий. Review-ууд шууд publish болдог буюу simultaneous reveal биш; completed work verified portfolio болох автомат flow байхгүй. |

### FR-8. Public discovery

| ID | Төлөв | Кодын нотолгоо ба gap |
|---|---|---|
| FR-8.1 | 🟡 | Public creator profile/search/portfolio/rates бий. Verified statistics бодит API-аас биш, Vite SPA тул SSR/SEO indexability requirement хангахгүй. |
| FR-8.2 | 🟡 | Showcase catalog/search/reaction/infinite pagination бий. Business publish хийхэд хоёр review шаарддаг ч creator + business explicit showcase consent биш. |
| FR-8.3 | ✅ | Guest public search/profile/showcase үзэж чадна, commerce/affiliate flow хийгдээгүй. |
| FR-8.4 | 🟡 | Offer/collaborate CTA болон channel restriction бий; guest-to-business registration funnel event tracking/attribution бүрэн биш. |

### FR-9. Notification ба admin

| ID | Төлөв | Кодын нотолгоо ба gap |
|---|---|---|
| FR-9.1 | 🟡 | DB notification, read/read-all, transactional OutboxEvent бичилт бий. Гэхдээ outbox consumer, RabbitMQ/DLQ, push/email campaign notification, scheduled reminder байхгүй. |
| FR-9.2 | 🟡 | Admin overview/list/status/case/announcement/audit backend бий. Frontend admin-ийн ихэнх page static `data/admin.js`; payout approval/moderation/verification action-уудын зарим нь mock. |

## 4. Функциональ бус шаардлагын шалгалт

| ID | Төлөв | Нотолгоо ба gap |
|---|---|---|
| NFR-1 Мөнгөний зөв байдал | ❌ | Ledger, balance invariant, reconciliation байхгүй. Dispute freeze байгаа нь зөвхөн нэг хэсэг. |
| NFR-2 API dependency | ❌ | Meta provider abstraction, encrypted token, refresh/rate-limit handling, stale cache байхгүй. |
| NFR-3 Итгэл | 🟡 | Unverified default болон AdminAction audit бий. Social statistics history/audit байхгүй. |
| NFR-4 Security | 🟡 | JWT rotation/reuse detection, bcrypt, Zod, rate limit, Helmet, CORS, IDOR test, media magic-byte validation сайн. OAuth token encryption болон signed URL байхгүй; upload локал static URL-аар serve хийнэ. |
| NFR-5 SEO | ❌ | Vite client SPA. SSR, canonical metadata, sitemap/robots, structured data, Core Web Vitals budget/test байхгүй. |
| NFR-6 Performance | 🟡 | Pagination/index бий. p95 telemetry, APM, cache, background social job байхгүй. |
| NFR-7 Testing | 🟡 | 40 backend integration test сайн суурь. Ledger/reconciliation/retention/social provider/report/queue test байхгүй; frontend ердөө 3 validation test. |
| NFR-8 Legal | ❌ | #ad/paid partnership required term, validation, moderation rule байхгүй. Escrow legal decision нь кодоор шийдэгдэхгүй external blocker. |

## 5. Definition of Done-ийн бодит байдал

| Acceptance criterion | Төлөв |
|---|---|
| Instagram холбоод verified statistics татах | ❌ |
| Brand filter/compare/invite | ✅ |
| Open proposal → contract | 🟡 Proposal ба direct contract flow хооронд orchestration дутуу |
| Unfunded contract start block + idempotent QPay callback | 🟡 Gate/idempotency mock provider дээр бий; QPay биш |
| Content approval → publish → API proof full cycle | 🟡 Approval бий; publish proof байхгүй |
| Retention автомат шалгалт | ❌ |
| Aggregated CPM/CPE PDF | ❌ |
| Dispute freeze → three-way ledger resolution | 🟡 Freeze бий; ledger resolution байхгүй |
| Dual-consent completed work public/SEO | 🟡 Showcase бий; explicit consent + SSR байхгүй |
| Daily reconciliation zero difference | ❌ |
| 3 real brand pilot | ❌ Repository-оос нотлох боломжгүй, product/business validation task |

## 6. Хамгийн өндөр эрсдэлтэй gap-ууд

1. **Money safety:** Payment table-ийг ledger гэж үзэж болохгүй. 10% commission болон reconciliation байхгүй үед real money асааж болохгүй.
2. **Lifecycle mismatch:** Approved deliverable collaboration-ийг шууд complete/release болгодог; publish proof, retention, dispute window алга.
3. **Product differentiator missing:** Verified Instagram/Facebook statistics огт холбогдоогүй.
4. **Frontend truth gap:** Admin/finance/dashboard-ийн олон дэлгэц бодит backend API байхад static/localStorage data үзүүлж байна.
5. **Discovery acquisition gap:** Public UI сайн боловч SPA тул requirement-ийн SEO/SSR зорилго хангахгүй.
6. **Async/realtime gap:** OutboxEvent үүсдэг ч consumer байхгүй; chat REST polling, notification queue/email delivery байхгүй.
7. **Test gap:** Мөнгөтэй холбоотой requirement-ийн хамгийн чухал invariant-ууд test-гүй.

## 7. 6 өдрийн хэрэгжүүлэх төлөвлөгөө

> Зорилго: 6 өдрийн дараа mock marketplace-ийг production integration-ready MVP рүү ойртуулах. Meta app review, QPay merchant approval, escrow legal review, 3 real pilot болон бүрэн Next.js migration нь external/том scope тул 6 өдөрт “дууссан” гэж тооцохгүй.

### Өдөр 1 — Domain model ба state machine-ийг requirement-тэй тааруулах

**Зорилго:** Дараагийн өдрүүдийн payment/social/proof logic буруу schema дээр баригдахаас сэргийлэх.

- Prisma-д `SocialStat`, `PublishProof`, `LedgerAccount`, `LedgerEntry`, `ReconciliationRun`, `ShowcaseConsent`, `PayoutAccount` model нэмэх.
- `SocialAccount`-д provider user/page id, encrypted token fields, token expiry, `lastSyncAt`, `syncStatus`, `syncError` нэмэх.
- Collaboration lifecycle-д `PUBLISHED`, `PROVEN`, `DISPUTED`, `SETTLEMENT_PENDING` эсвэл түүнтэй тэнцэх тодорхой state оруулах.
- Contract term-ээс revision limit, publishBy, retentionDays, disputeWindowDays, paid-partnership disclosure-г typed snapshot/validation болгох.
- Proposal ACCEPT болон Invitation ACCEPT-ийг нэг orchestration service-ээр offer/collaboration creation-тэй холбох шийдвэр гаргах.
- Migration болон transition matrix test бичих.

**Хэмжигдэх үр дүн:** 6+ шинэ entity, lifecycle transition table, invalid transition-ийн дор хаяж 12 test.

### Өдөр 2 — Meta OAuth ба verified statistics суурь

**Зорилго:** FR-1.6/1.7/1.11 болон бүтээгдэхүүний гол differentiator-ийг хийх.

- `social-sync` module: route/controller/service/repository/provider/mapper/schema.
- Provider port: `authorizeUrl`, `exchangeCode`, `refreshToken`, `fetchProfile`, `fetchStats`.
- Endpoint:
  - `GET /api/v1/social-connections/:provider/authorize`
  - `GET /api/v1/social-connections/:provider/callback`
  - `GET /api/v1/creator/social-accounts`
  - `DELETE /api/v1/creator/social-accounts/:id`
  - admin/dev-only manual sync endpoint.
- Token-ийг AES-GCM/KMS-compatible abstraction-аар encrypted хадгалах; response-д хэзээ ч гаргахгүй.
- SocialStat append-only snapshot, stale/error badge DTO.
- Provider contract test, token encryption test, duplicate callback/idempotency test.
- Frontend onboarding/profile-д “Connect Instagram/Facebook”, connected/error/stale states нэмэх; manual link-ийг unverified хэвээр үлдээх.

**Хэмжигдэх үр дүн:** sandbox provider-оор OAuth callback → SocialAccount → SocialStat бүрэн integration test; profile DTO verified/stale state харуулна.

### Өдөр 3 — QPay adapter, immutable ledger, commission

**Зорилго:** Real payment асаахаас өмнөх санхүүгийн invariant-уудыг бий болгох.

- Одоогийн mock provider interface-ийг `paymentProviderPort` болгоод QPay adapter нэмэх.
- QPay invoice create/check/callback signature-or-token validation, raw callback audit, idempotency.
- Double-entry ledger posting rules:
  - escrow funding
  - creator earning
  - 10% platform commission
  - refund
  - payout
- Transaction бүрт debit total = credit total invariant enforce хийх.
- Payout bank account encryption, minimum threshold, admin approve/reject flow.
- Daily reconciliation service + scheduled command + discrepancy result.
- Frontend Wallet/Payments/Admin Finance-ийг localStorage/static transaction-аас бодит API руу шилжүүлэх.

**Хэмжигдэх үр дүн:** duplicate webhook 1 удаа post хийнэ; 5 ledger scenario ба 3 dispute award split test; reconciliation difference `0` test.

### Өдөр 4 — Publish proof, retention, auto-approval, dispute settlement

**Зорилго:** FR-4-ийн end-to-end execution lifecycle-ийг зөв болгох.

- Deliverable approval дээр шууд completed/released хийх одоогийн logic-ийг салгах.
- PublishProof submit: post URL + owned screenshot/media + platform + publishedAt.
- Provider API verification боломжтой/боломжгүй хоёр path.
- Metric snapshot append хийх; last checked/still live state.
- Retention checker job; deleted post илэрвэл payment freeze/trust case.
- 7-day business auto approval болон N-day dispute window scheduled events.
- Revision limit-ийг бүх revision chain-ийн count дээр enforce хийх.
- Admin dispute resolution: creator wins/business wins/split; тус бүр ledger transaction + audit log.

**Хэмжигдэх үр дүн:** funded → submitted → revised → approved → published → proven → settlement pending → released flow integration test; retention fail ба 3 resolution test.

### Өдөр 5 — Realtime, queue, notifications ба frontend API cutover

**Зорилго:** OutboxEvent-ийг бодитоор хэрэглэж, local/mock UI state-ийн хамгийн том gap-ийг арилгах.

- RabbitMQ publisher/consumer, retry/backoff, DLQ, processedAt/attempts update.
- Socket.io + Redis adapter; conversation membership-аар room authorization.
- Message create/read/edit/delete event; reconnect/cursor history strategy.
- Notification consumers: offer, proposal, contract, payment, deliverable, proof, payout, deadline.
- Email template + preference/opt-out; in-app notification хэвээр.
- Admin management/finance/trust dashboard-ийг `adminApi`-тай бүрэн холбох.
- `DashboardDataProvider`-ийн payment/refund/payout/local decision fallback-уудыг устгаж API loading/error/empty state болгох.

**Хэмжигдэх үр дүн:** 2 client realtime message test; failed notification DLQ test; admin болон finance-ийн critical 8 action mock биш API response ашиглана.

### Өдөр 6 — Analytics/PDF, security, test ба release gate

**Зорилго:** Demo биш, хэмжигдэхүйц MVP release candidate гаргах.

- Campaign report service: reach, views, engagement, spend, CPM, CPE, creator breakdown, proof links.
- Server-side PDF generation + authorization + audit event.
- Security: signed upload/download URL adapter, IDOR matrix, webhook replay, file ownership, rate-limit test.
- Frontend integration/component test: auth, search/compare/invite, proposal, collaboration, payment, deliverable, proof, report.
- API latency logging, request id, slow-query/endpoint threshold; p95 хэмжих smoke script.
- Requirement checklist-ийг дахин ажиллуулж release-blocker жагсаалт гаргах.
- SSR migration-ийг тусдаа follow-up болгон: public creator/business/showcase/category route-уудыг Next.js/Remix рүү үе шаттай шилжүүлэх ADR ба task breakdown.

**Хэмжигдэх үр дүн:** campaign report JSON + PDF test, critical flow-ийн 80%+ service/integration coverage, zero known critical money/IDOR defect.

## 8. 6 өдрийн дараа ч external эсвэл дараагийн sprint-д үлдэх зүйл

- Meta app review болон production permissions.
- QPay merchant credential/production callback certification.
- Escrow болон paid-content disclosure-ийн хууль зүйн зөвлөгөө.
- Vite SPA-аас Next.js/Remix SSR рүү production migration, sitemap/structured data/Core Web Vitals optimization.
- Render/Redis/RabbitMQ/R2 production infrastructure, backup/restore, monitoring/alerting.
- 3 бодит brand pilot campaign болон түүний business acceptance evidence.

## 9. Эхэлж засах дараалал

1. Ledger/state machine schema
2. Publish proof ба delayed settlement
3. QPay adapter + reconciliation
4. Meta OAuth/stat sync
5. Frontend mock-to-API cutover
6. Realtime/queue/report/SSR

Энэ дарааллын шалтгаан: одоогийн UI-г улам өргөжүүлэхээс өмнө мөнгө болон contract lifecycle-ийн буруу төлөв production data-д суухаас хамгаалах шаардлагатай.
