# Requirement Day 3–4 хэрэгжилтийн тайлан — 2026-08-01

Эх төлөвлөгөө: `requirement-compliance-plan.md` доторх **Өдөр 3 — QPay adapter, immutable ledger, commission**, **Өдөр 4 — Publish proof, retention, auto-approval, dispute settlement**.

## 1. Ерөнхий үр дүн

- Payment service-ийн provider dependency-г port/factory болгож, mock болон QPay adapter-ийг салгасан.
- QPay invoice create, callback token verification, payment check, raw callback audit, duplicate event idempotency хэрэгжсэн.
- Funding, creator earning, 10% commission, refund, payout гэсэн таван double-entry ledger rule нэмэгдсэн.
- Ledger posting нь transaction batch болон idempotency key-тэй; database update trigger нь journal мөрийг immutable болгосон.
- Payout bank account AES-256-GCM encryption, minimum threshold, admin approve/reject flow нэмэгдсэн.
- Daily reconciliation service болон scheduled command нэмэгдэж, provider event/ledger difference шалгадаг болсон.
- Deliverable approval дээр шууд completed/released хийдэг logic устсан.
- Revision limit бүх revision chain-ийн version дээр хэрэгжинэ.
- Publish proof provider/manual verification, append-only metric snapshot, retention check, auto-approval, dispute window, delayed settlement нэмэгдсэн.
- Retention fail үед payment settlement freeze болж trust case автоматаар нээгдэнэ.
- Admin dispute resolution creator/business/split award бүр immutable ledger, refund/release record болон audit log үүсгэнэ.
- Creator Wallet нь encrypted payout account болон admin approval шаарддаг бодит API урсгалтай болсон.
- Admin dispute detail нь mock toast биш бодит dispute list/award API ашигладаг болсон.
- `prisma.config.ts`, `tsconfig.json` өөрчлөөгүй.

## 2. Өдөр 3 — Payment ба ledger

### 2.1 Provider port ба QPay adapter

Үндсэн файлууд:

- `backend/src/modules/payments/providers/payment-provider.port.js`
- `backend/src/modules/payments/providers/qpay.provider.js`
- `backend/src/modules/payments/providers/mock.provider.js`

QPay adapter нь:

- access token-ийг expiry хүртэл cache хийнэ;
- `POST /v2/invoice` ашиглан давтагдашгүй `sender_invoice_no`-той invoice үүсгэнэ;
- callback URL-д payment ID болон тусдаа callback token холбоно;
- callback авсны дараа `POST /v2/payment/check`-ээр төлөлтийг server-to-server баталгаажуулна;
- amount/currency зөрвөл payment state өөрчлөхгүй;
- raw callback болон provider check response-ийг `PaymentProviderEvent.payload`-д хадгална;
- provider payment ID-аар duplicate callback-ийг нэг удаа боловсруулна.

Шинэ public provider endpoint:

- `POST /api/v1/payments/webhooks/qpay?paymentId=:id&token=:token`

QPay checkout response-д `checkoutUrl`, `qrText`, `qrImage`, `deeplinks` буцна.

### 2.2 Double-entry ledger

Үндсэн файл: `backend/src/modules/payments/ledger.service.js`.

| Event | Debit | Credit |
|---|---|---|
| Funding | Provider clearing | Escrow liability |
| Creator earning | Escrow liability | Creator payable |
| 10% commission | Escrow liability | Platform revenue |
| Refund | Escrow liability | Refund payable |
| Payout | Creator payable | Provider clearing |

Posting бүр ижил amount-аар debit/credit үүсгэнэ. `postingBatchId` болон `idempotencyKey` нь retry үед давхар journal entry үүсэхээс хамгаална. `LedgerEntry` update хийхэд PostgreSQL trigger татгалзана; correction нь шинэ compensating entry байх зарчимтай.

### 2.3 Payout account ба approval

Шинэ API:

- `GET /api/v1/payments/payout-accounts`
- `POST /api/v1/payments/payout-accounts`
- `DELETE /api/v1/payments/payout-accounts/:id`
- `POST /api/v1/admin/payouts/:id/decision`

Бизнес дүрэм:

- Account number AES-256-GCM-ээр encrypt хийгдэнэ; response-д зөвхөн `last4` гарна.
- Creator зөвхөн өөрийн account-ыг payout request-д ашиглана.
- Payout нь `PAYOUT_MINIMUM_AMOUNT`-аас бага бол татгалзана.
- Request нь эхлээд `PENDING`; admin approve хийсний дараа `PROCESSING` болно.
- Reject үед reason, timestamp болон AdminAction хадгалагдана.
- Provider success event ирсний дараа л `PAID` болж payout ledger posting үүснэ.

### 2.4 Reconciliation

Үндсэн файлууд:

- `backend/src/modules/payments/reconciliation.service.js`
- `backend/src/modules/payments/reconciliation.repository.js`
- `backend/scripts/reconcile-payments.js`

API ба command:

- `POST /api/v1/admin/reconciliation-runs`
- `npm run job:reconcile`

Reconciliation нь сонгосон хугацааны verified provider funding event болон `ESCROW_FUNDED` ledger entry-ийн total/count-ийг харьцуулж `MATCHED`, `MISMATCHED`, `FAILED` төлөв, discrepancy болон record ID-уудыг хадгална.

## 3. Өдөр 4 — Publication ба settlement lifecycle

### 3.1 Corrected lifecycle

Шинэ урсгал:

`FUNDED → SUBMITTED → REVISION_REQUESTED → APPROVED → PUBLISHED → PROVEN → SETTLEMENT_PENDING → COMPLETED`

Deliverable approval нь зөвхөн publication-ready болгоно. Payment release үүсгэхгүй. Verified proof болон contract-ийн dispute window дууссаны дараа lifecycle job settlement үүсгэнэ. Release event амжилттай болсон үед collaboration `COMPLETED` болно.

### 3.2 Auto approval ба revision chain

- Submission бүр `autoApprovalDueAt`-ийг 7 хоногоор тохируулна.
- Business хугацаандаа шийдээгүй latest deliverable-уудыг lifecycle job автоматаар approve хийнэ.
- Revision limit нь зөвхөн direct child шалгахгүй, version chain-ийн нийт revision round-ыг шалгана.
- Limit дууссан үед дахин revision request хийхийг `REVISION_LIMIT_REACHED` code-оор хориглоно.

### 3.3 Publish proof verification ба metrics

Үндсэн файл: `backend/src/modules/reviews/publish-proof.provider.js`.

- Connected verified provider account болон `providerPostId` байвал provider path ашиглана.
- Provider post lookup боломжгүй үед owned screenshot шаардсан manual verification queue ашиглана.
- Manual decision endpoint: `POST /api/v1/admin/proofs/:id/decision`.
- Verification metric бүр `PublishProofMetricSnapshot` model-д append-only хадгалагдана.
- Proof дээр `verifiedAt`, `retentionDueAt`, `lastCheckedAt`, live state болон failure reason хадгалагдана.

### 3.4 Retention ба scheduled settlement

Үндсэн файлууд:

- `backend/src/modules/collaborations/lifecycle.service.js`
- `backend/src/modules/collaborations/lifecycle.repository.js`
- `backend/scripts/process-collaboration-lifecycle.js`

Command: `npm run job:lifecycle`.

Retention check post removed гэж батлагдвал:

- proof `REMOVED` болно;
- collaboration `DISPUTED` болно;
- `settlementDueAt` цэвэрлэгдэнэ;
- өндөр priority-тай TrustCase үүснэ;
- payment болон payout action active dispute middleware-аар freeze болно.

### 3.5 Dispute financial award

Шинэ endpoint:

- `POST /api/v1/admin/disputes/:id/resolve`

Дэмжих шийдвэр:

- `CREATOR_WINS`
- `BUSINESS_WINS`
- `SPLIT` + `creatorPercent`

Award бүр creator payable, refund payable болон proportional commission-ийг escrow-оос balanced ledger posting хэлбэрээр гаргана. Resolution data, AdminAction, collaboration activity болон outbox event нэг transaction дотор хадгалагдана.

## 4. Database migration

Migration: `backend/prisma/migrations/20260801070000_requirement_day3_day4/migration.sql`.

Нэмэгдсэн гол өгөгдөл:

- `Collaboration.autoApprovalDueAt`, `settlementDueAt`
- `PaymentPayout.payoutAccountId`, approval/rejection fields
- `LedgerEntry.postingBatchId`
- `PublishProofMetricSnapshot`
- `TrustCase.resolutionData`
- Immutable ledger update trigger

Migration deploy болон Prisma generate/validate амжилттай дууссан.

## 5. Баталгаажуулалт

| Шалгалт | Үр дүн |
|---|---:|
| Backend full integration suite | 56/56 passed |
| Day 3–4 targeted integration/domain tests | 17/17 passed |
| Five ledger scenario rules | 5/5 passed |
| Dispute award calculations | 3/3 passed |
| Reconciliation discrepancy | 0, MATCHED |
| Duplicate payout webhook | One provider event and one ledger posting |
| Ledger update immutability | Database rejected mutation |
| Frontend tests | 11/11 passed |
| Frontend ESLint | Passed |
| Frontend production build | Passed, 2392 modules transformed |

## 6. Production-д тохируулах зүйл

- `PAYMENT_PROVIDER=qpay` болон QPay merchant credential/config оруулах.
- `QPAY_CALLBACK_TOKEN`, `PAYOUT_ACCOUNT_ENCRYPTION_KEY`-ийг secret manager-аас өгөх.
- `job:reconcile`, `job:lifecycle` command-уудыг platform scheduler/cron-д бүртгэх.
- QPay sandbox callback certification болон бодит invoice/amount test хийх.
- Bank payout execution нь QPay inbound invoice-ээс тусдаа тул production payout provider эсвэл finance bank process-той холбох.

---

# Requirement Day 5–6 хэрэгжилтийн тайлан — 2026-08-01

Эх төлөвлөгөө: `requirement-compliance-plan.md` доторх **Өдөр 5 — Realtime, queue, notification ба frontend cutover**, **Өдөр 6 — Analytics, proof, hardening ба release gate**.

## 1. Ерөнхий үр дүн

Day 5, 6-ийн үндсэн backend болон frontend урсгалуудыг modular monolith бүтцийг хадгалан хэрэгжүүлэв.

- Outbox publisher, RabbitMQ topic/retry/dead-letter queue болон development/test-д ашиглах memory broker нэмэгдсэн.
- Socket.IO messaging нь access token, conversation membership, Redis adapter, reconnect/rejoin болон cursor history-тэй болсон.
- Offer, proposal, contract, payment, deliverable, publish proof, payout, deadline event-үүд notification consumer-т холбогдсон.
- In-app notification болон email preference/opt-out урсгал нэмэгдсэн.
- Admin, finance, payment UI-ийн гол mock mutation-ууд бодит API руу шилжсэн.
- Campaign analytics JSON/PDF report, publish proof, signed media URL болон audit trail нэмэгдсэн.
- Request ID, structured latency log, slow-request тэмдэглэгээ болон p95 smoke script нэмэгдсэн.
- Backend-ийн **51/51 integration test**, frontend-ийн **11/11 test**, ESLint болон production build амжилттай дууссан.
- `prisma.config.ts`, `tsconfig.json` хоёрт өөрчлөлт оруулаагүй.

## 2. Өдөр 5 — Realtime, queue, notification

### 2.1 Event delivery ба Outbox

Үндсэн файлууд:

- `backend/src/infrastructure/eventing/outbox.repository.js`
- `backend/src/infrastructure/eventing/outbox.worker.js`
- `backend/src/infrastructure/eventing/rabbitmq-broker.js`
- `backend/src/infrastructure/eventing/memory-broker.js`
- `backend/src/workers/outbox.js`

Хийгдсэн зүйл:

- Database transaction-аар үүссэн `OutboxEvent`-ийг worker publish хийнэ.
- Publish алдаа бүр `attempts`, `lastError`, `nextAttemptAt`-д хадгалагдан exponential backoff хэрэглэнэ.
- Дээд оролдлого дуусвал `deadLetteredAt` тэмдэглэгдэнэ.
- RabbitMQ consumer retry queue нь TTL + dead-letter routing ашиглана.
- Topic wildcard consumer болон DLQ behavior-ийг integration test-ээр баталсан.

Schema өөрчлөлт:

- `OutboxEvent.nextAttemptAt`
- `OutboxEvent.lockedAt`
- `OutboxEvent.lastError`
- `OutboxEvent.deadLetteredAt`
- `Notification.sourceEventId` болон `(userId, sourceEventId)` unique constraint
- `NotificationPreference`

Migration: `backend/prisma/migrations/20260801050000_requirement_day5_day6/migration.sql`.

### 2.2 Realtime messaging

Үндсэн файлууд:

- `backend/src/infrastructure/realtime/realtime.gateway.js`
- `backend/src/modules/messaging/*`
- `frontend/src/api/realtime.js`
- `frontend/src/pages/dashboard/MessagingPages.jsx`

Хийгдсэн зүйл:

- Socket connection нь JWT access token-оор баталгаажна.
- User бүр хувийн room-д, conversation-д зөвхөн participant болсон үед нэгдэнэ.
- `message:created`, `message:edited`, `message:deleted`, `message:read` event дамжина.
- Frontend reconnect хийхдээ идэвхтэй conversation room-д дахин нэгдэнэ.
- REST cursor history хэвээр үлдсэн тул reconnect-ийн хооронд алдсан message-ийг сэргээнэ.
- Redis adapter нь `REDIS_URL` тохируулсан production орчинд олон instance хооронд event түгээнэ.
- Хоёр зэрэгцээ socket client ижил event хүлээж авах болон outsider room-д орохгүй байх test нэмэгдсэн.

### 2.3 Notification ба email preference

Үндсэн файлууд:

- `backend/src/modules/notifications/notification.consumer.js`
- `backend/src/modules/notifications/notification.consumer.repository.js`
- `backend/src/modules/notifications/notification.email.js`
- `backend/src/modules/notifications/*`

Шинэ API:

- `GET /api/v1/notifications/preferences`
- `PATCH /api/v1/notifications/preferences`

Хийгдсэн зүйл:

- Offer, proposal, contract, payment, deliverable, proof, payout, deadline topic-ууд consumer-тэй.
- `sourceEventId` ашиглан retry үед notification давхар үүсэхээс хамгаалсан.
- In-app notification realtime user room руу түгээгдэнэ.
- Email master switch болон event тус бүрийн opt-out preference хадгалагдана.
- Account UI дээр preference toggle-ууд бодит API-тай холбогдсон.

### 2.4 Admin ба finance cutover

Шинэ/холбосон operation-ууд:

1. User status өөрчлөх
2. Channel verification өөрчлөх
3. Campaign status өөрчлөх
4. Contract freeze хийх
5. Refund үүсгэх
6. Payout reconciliation хийх
7. Trust case resolve хийх
8. Announcement publish хийх

Admin dashboard, finance center, refund list болон wallet route нь `frontend/src/api/dashboard.api.js`-ийн бодит API ашигладаг болсон. Mutation бүр audit log үүсгэх service flow-той.

## 3. Өдөр 6 — Analytics, proof, security hardening

### 3.1 Campaign analytics ба PDF

Үндсэн файлууд:

- `backend/src/modules/analytics/analytics.repository.js`
- `backend/src/modules/analytics/analytics.service.js`
- `backend/src/modules/analytics/analytics.controller.js`
- `backend/src/modules/analytics/analytics.routes.js`

Шинэ API:

- `GET /api/v1/analytics/campaigns/:campaignId/report`
- `GET /api/v1/analytics/campaigns/:campaignId/report.pdf`

Report нь reach, views, engagement, spend, CPM, CPE, engagement rate, creator breakdown, deliverable болон publish proof холбоосуудыг нэгтгэнэ. JSON болон PDF report-ийг зөвхөн campaign owner business эсвэл admin авна. PDF export бүр analytics audit event үүсгэнэ.

### 3.2 Publish proof

Шинэ API:

- `GET /api/v1/collaborations/:collaborationId/proofs`
- `POST /api/v1/collaborations/:collaborationId/proofs`

Business rule:

- Зөвхөн тухайн collaboration-ийн creator proof оруулна.
- Deliverable нь approved болсон байна.
- Screenshot asset болон social account өгсөн бол тухайн creator эзэмшдэг эсэхийг шалгана.
- Proof үүсэхэд outbox event гарч notification урсгалд орно.

Collaboration workspace дээр platform, published URL, optional screenshot сонголттой form болон өмнөх proof list нэмэгдсэн.

### 3.3 Signed media access

Үндсэн файл: `backend/src/modules/media/media.signing.js`.

Хийгдсэн зүйл:

- Upload болон content URL-д HMAC signature, expiry, subject binding ашигласан.
- URL гаргахаас өмнө asset permission шалгана.
- Signature verification-д constant-time comparison ашигласан.
- Tampered болон expired URL-г татгалзана.
- Signed upload/content route нь хугацаатай token-оор ажиллана.

### 3.4 Observability ба release gate

- `backend/src/shared/middleware/requestContext.js` нь request ID, status, duration, user ID болон slow flag-ийг structured log хэлбэрээр гаргана.
- `backend/scripts/p95-smoke.js` нь endpoint latency-ийн p95 smoke хэмжилт хийнэ.
- `docs/release-blockers.md` дотор production readiness checklist бий.
- `docs/adr/0001-public-ssr-migration.md` дотор public marketplace-ийн SSR migration шийдвэр, үе шат, trade-off бичигдсэн.

## 4. Баталгаажуулалт

| Шалгалт | Үр дүн |
|---|---:|
| Backend integration suite | 51/51 passed |
| Day 5 broker retry/DLQ tests | 2/2 passed |
| Frontend validation tests | 3/3 passed |
| Frontend critical API flow tests | 8/8 passed |
| Frontend ESLint | Passed |
| Frontend Vite production build | Passed, 2392 modules transformed |
| Prisma migration deploy | Passed |

Frontend critical API flow test нь auth, creator search/compare/invite, proposal, collaboration, payment, deliverable, publish proof, analytics report гэсэн төлөвлөгөөнд нэрлэсэн урсгалуудыг хамарсан. Энэ нь **8/8 урсгалын contract coverage** бөгөөд бүх source line-ийн 80% coverage гэсэн утга биш.

## 5. Production орчны үлдсэн blocker

Кодоор дур мэдэн “дууссан” гэж тэмдэглээгүй дараах external зүйлс байна:

- Production RabbitMQ болон Redis instance-ийн connection/credential тохируулах.
- Production object storage adapter ашиглах; одоогийн signed URL logic local storage adapter дээр ажиллана.
- Бодит payment provider credential болон webhook endpoint-ийг staging дээр баталгаажуулах.
- Production-тэй ойролцоо өгөгдөл/ачаалал дээр p95 smoke болон soak test ажиллуулах.
- Frontend dependency audit-д илэрсэн 3 high advisory-г compatibility regression test-тэйгээр шийдэх.
- Email provider-ийн production credential, sender domain болон unsubscribe policy баталгаажуулах.

---

# Requirement Day 1–2 хэрэгжилтийн тайлан — 2026-08-01

Эх төлөвлөгөө: `requirement-compliance-plan.md` доторх **Өдөр 1 — Domain model ба state machine**, **Өдөр 2 — Meta OAuth ба verified statistics**.

Энэ хэсэг нь 2026-08-01-нд хийсэн шинэ хэрэгжилтийг тайлагнана. Доорх хуучин Day 1–2 тайланг түүх болгон хэвээр хадгалсан.

## 1. Ерөнхий үр дүн

Хоёр өдрийн төлөвлөгөөний production foundation-ийг modular monolith бүтцийг эвдэхгүйгээр хэрэгжүүлэв.

- Prisma schema-д **8 шинэ model**, **7 шинэ enum**, collaboration lifecycle-ийн **4 шинэ төлөв** нэмэгдсэн.
- Mutable agreement JSON-оос critical contract rule-уудыг typed snapshot болгон хадгалдаг болсон.
- Proposal болон invitation acceptance нь approved offer болон collaboration workspace үүсгэдэг нэг orchestration flow-той болсон.
- Instagram/Facebook connection-д provider abstraction, one-time OAuth state, AES-256-GCM token encryption, append-only statistics, stale/error state, manual sync API нэмэгдсэн.
- Sandbox provider-оор authorize → callback → encrypted SocialAccount → SocialStat → resync → disconnect урсгалыг integration test-ээр баталсан.
- Creator onboarding болон My Account дээр provider connection UI, verified/manual/stale/error ялгалт, sync/disconnect action нэмэгдсэн.
- `prisma.config.ts` болон `tsconfig.json`-д өөрчлөлт оруулаагүй.

## 2. Өдөр 1 — Domain model ба state machine

### 2.1 Шинэ database model

`backend/prisma/schema.prisma` болон `backend/prisma/migrations/20260801010000_requirement_day1_day2/migration.sql`:

1. `SocialStat`
   - Social statistics-ийг update хийхгүй, snapshot хэлбэрээр append-only хадгална.
   - Followers, following, media count, reach, impressions, engagement болон `capturedAt` хадгална.

2. `SocialOAuthState`
   - OAuth `state`-ийн зөвхөн SHA-256 hash хадгална.
   - 10 минутын expiry, one-time consumption болон callback result account-ыг хадгална.
   - Давхар callback ижил үр дүн буцаах idempotency боломжтой.

3. `PublishProof`
   - Дараагийн publish/retention implementation-д зориулж collaboration, deliverable, social account, screenshot, URL, metrics болон verification status relation-уудыг тодорхойлсон.

4. `LedgerAccount`
   - Provider clearing, escrow liability, creator payable, platform revenue, refund payable, user wallet төрлүүдтэй.

5. `LedgerEntry`
   - Debit/credit account, positive amount, idempotency key, payment/collaboration reference-тэй immutable journal суурь.
   - Migration дээр debit ба credit ижил байж болохгүй, amount эерэг байх database check constraint нэмсэн.

6. `ReconciliationRun`
   - Provider total болон ledger total тулгах үе, mismatch count, run status хадгалах суурь.

7. `ShowcaseConsent`
   - Collaboration бүр дээр user тус бүрийн `PENDING/APPROVED/DECLINED` шийдвэрийг unique хадгална.

8. `PayoutAccount`
   - Bank/provider account-ын encrypted number, last4, currency, default болон verification мэдээллийн суурь.

Эдгээр model-ийн business operation Day 3–4 төлөвлөгөөнд хийгдэх бөгөөд Day 1 дээр relation, constraint, index болон migration суурийг найдвартай тавьсан.

### 2.2 SocialAccount security болон sync field

`SocialAccount` дээр:

- `providerAccountId`, `providerPageId`
- `accessTokenEncrypted`, `refreshTokenEncrypted`
- `tokenExpiresAt`, `connectedAt`
- `lastSyncAt`, `syncStatus`, `syncError`
- `SocialStat[]`

нэмэгдсэн.

`platform + providerAccountId` unique constraint нь нэг provider account-ыг олон creator эзэмшихээс хамгаална. `creatorId + platform` unique constraint нь нэг creator/platform connection-ийг OAuth callback-аар idempotent upgrade хийх боломж олгоно.

Creator profile update хийх үед өмнө нь бүх social account-ыг delete хийдэг байсан. Үүнийг өөрчилж:

- зөвхөн `MANUAL` account-уудыг profile form-оор replace хийнэ;
- OAuth token, verified account, stat history-г profile edit устгахгүй;
- `createMany(..., skipDuplicates: true)` ашиглаж connected platform-ыг manual link overwrite хийхээс хамгаалсан.

Нотолгоо: `backend/src/modules/creator/creator.repository.js`.

### 2.3 Collaboration lifecycle transition matrix

`backend/src/modules/collaborations/collaboration.state.js` файлд төвлөрсөн transition matrix үүсгэсэн.

Production settlement path:

`NEGOTIATION → AGREEMENT_REVIEW → CONTRACT_REVIEW → PAYMENT_PENDING → IN_PROGRESS → PUBLISHED → PROVEN → SETTLEMENT_PENDING → COMPLETED`

Нэмэгдсэн төлөв:

- `PUBLISHED`
- `PROVEN`
- `DISPUTED`
- `SETTLEMENT_PENDING`

`assertCollaborationTransition()` нь буруу transition бүрд HTTP 409, `INVALID_COLLABORATION_TRANSITION`, `{ from, to }` detail үүсгэнэ. Collaboration болон contract service-ийн гол transition-уудад ашигласан.

`backend/tests/integration/requirement-day1-state.test.js`:

- production happy path transition бүрийг батална;
- 13 unsafe jump-ыг хориглож байгааг батална;
- terminal `COMPLETED`, `CANCELLED` төлвөөс буцаж орохыг хориглоно.

### 2.4 Typed contract snapshot

`Contract` model дээр:

- `revisionLimit`
- `publishBy`
- `retentionDays`
- `disputeWindowDays`
- `disclosureRequired`

typed field нэмэгдсэн.

`backend/src/modules/contracts/contract.snapshot.js` нь agreement terms-ийг дараах bound-тай normalize хийнэ:

- revision: 0–20
- retention: 1–3650 өдөр
- dispute window: 1–90 өдөр
- publish date: valid `Date` эсвэл `null`
- paid partnership disclosure: default `true`

Agreement өөрчлөгдөх, contract generate болох бүрд typed snapshot шинэчлэгдэнэ. Contract болон collaboration response DTO эдгээр field-ийг буцаана.

### 2.5 Proposal/Invitation acceptance orchestration

`backend/src/modules/collaborations/collaboration-bootstrap.service.js` нэмэгдсэн.

Proposal `ACCEPT` эсвэл Invitation `ACCEPT` үед нэг database transaction дотор:

1. Source-той unique `WorkOffer` үүсгэнэ.
2. Offer-ийг `APPROVED` болгоно.
3. Collaboration workspace үүсгэнэ.
4. Initial agreement version үүсгэнэ.
5. Typed contract draft үүсгэнэ.
6. Business/creator conversation ба membership үүсгэнэ.
7. Initial workspace tasks үүсгэнэ.
8. Activity audit record үүсгэнэ.
9. Offer revision үүсгэнэ.
10. Outbox event болон хоёр талын notification үүсгэнэ.

`WorkOffer.sourceType` нь `DIRECT`, `PROPOSAL`, `INVITATION`; `sourceType + sourceId` unique тул нэг accept request олон workspace үүсгэхгүй.

## 3. Өдөр 2 — Meta OAuth ба verified statistics

### 3.1 Modular social-sync бүтэц

`backend/src/modules/social-sync/`:

- `social.routes.js` — route definition
- `social.controller.js` — HTTP mapping/redirect
- `social.service.js` — OAuth, permission, sync business logic
- `social.repository.js` — бүх Prisma query/transaction
- `social.schema.js` — Zod validation
- `social.mapper.js` — safe DTO, stale state
- `token-encryption.js` — AES-GCM abstraction
- `providers/provider.contract.js` — provider port contract
- `providers/sandbox.provider.js` — deterministic local/test provider
- `providers/meta.provider.js` — Meta Graph provider adapter
- `providers/index.js` — environment-based provider selection

Controller дотор Prisma query, repository дотор business decision оруулаагүй.

### 3.2 API endpoint

| Method | Endpoint | Auth | Үйлдэл |
|---|---|---|---|
| GET | `/api/v1/social-connections/:provider/authorize` | Creator user | One-time state үүсгэж provider authorize URL буцаана |
| GET | `/api/v1/social-connections/:provider/callback` | OAuth state | Code exchange, profile/stat татах, encrypted connection хадгалах |
| GET | `/api/v1/creator/social-accounts` | Creator user | Safe connection/status/stat DTO жагсаана |
| DELETE | `/api/v1/creator/social-accounts/:id` | Owner creator | Өөрийн connection-ийг салгана |
| POST | `/api/v1/social-connections/:id/sync` | Owner эсвэл Admin | Token refresh болон append-only statistics sync хийнэ |

Supported provider param: `instagram`, `facebook`.

`redirectTo` нь зөвхөн `/...` application-relative path байна. `//evil.example` хэлбэрийг validation хориглох тул OAuth дараах open redirect үүсэхгүй.

### 3.3 OAuth state ба callback security

- State token: 32 random bytes, base64url.
- Database-д plaintext state биш SHA-256 hash хадгална.
- Lifetime: 10 минут.
- Provider/platform state-тэй таарах ёстой.
- State нэг удаа transaction-аар claim хийнэ.
- Callback давхар ирвэл provider token/stat дахин үүсгэхгүй, өмнөх safe result-ийг idempotent буцаана.
- Browser callback `text/html` хүсвэл My Account руу 303 redirect хийнэ.
- API/test callback JSON envelope буцаана.

### 3.4 Token encryption

`backend/src/modules/social-sync/token-encryption.js`:

- AES-256-GCM
- request бүрд 12-byte random IV
- authentication tag
- versioned envelope: `v1.iv.tag.ciphertext`
- 32-byte base64 эсвэл 64-character hex key
- production дээр `SOCIAL_TOKEN_ENCRYPTION_KEY` заавал шаардана
- decrypt/authentication fail үед raw crypto error гаргахгүй, `SOCIAL_TOKEN_DECRYPTION_FAILED` буцаана

Access/refresh token нь mapper болон API response-д огт ордоггүй.

### 3.5 Provider abstraction

Provider contract таван operation шаарддаг:

- `authorizeUrl`
- `exchangeCode`
- `refreshToken`
- `fetchProfile`
- `fetchStats`

`SOCIAL_PROVIDER_MODE=sandbox` үед local deterministic provider ажиллана. `SOCIAL_PROVIDER_MODE=meta` үед Meta OAuth/Graph adapter ажиллана.

Meta тохиргоо:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_GRAPH_VERSION`
- `META_REDIRECT_URI`
- `API_PUBLIC_URL`

Production mode дээр encryption key болон Meta mode-ийн credential-уудыг environment validation заавал шалгана.

### 3.6 Append-only stats ба stale/error state

Sync бүр:

1. Account-ыг `SYNCING` болгоно.
2. Token дуусах дөхсөн бол refresh хийнэ.
3. Provider profile/stat татна.
4. SocialAccount-ийн current aggregate шинэчилнэ.
5. Шинэ `SocialStat` row append хийнэ.
6. `lastSyncAt`, `HEALTHY` төлөв шинэчилнэ.

Failure үед:

- provider failure → `ERROR`
- encryption/decryption failure → `REAUTH_REQUIRED`
- `syncError` safe message хадгална
- 24 цагийн threshold давбал DTO `STALE` ба `isStale=true` гаргана

Raw token, provider exception detail public DTO-д буцахгүй.

### 3.7 Frontend integration

`frontend/src/api/social.api.js` нь authorize/list/sync/disconnect API-г төвлөрүүлсэн.

Creator onboarding:

- Instagram/Facebook API connect сонголттой.
- Channel үүссэний дараа OAuth redirect эхэлнэ.
- Manual link-үүд unverified хэвээр хадгалагдана.
- Verified ба manual account-ийн ялгааг тайлбарласан.

My Account → Creator:

- Connected account жагсаалт
- verified/manual badge
- follower count
- healthy/stale/error status
- provider sync
- disconnect confirmation
- Instagram/Facebook connect action

## 4. Migration ба configuration

Migration:

`backend/prisma/migrations/20260801010000_requirement_day1_day2/migration.sql`

Амжилттай ажиллуулсан:

```text
npx prisma validate     → valid
npx prisma generate     → Prisma Client v7.9.1 generated
npx prisma migrate deploy → 20260801010000_requirement_day1_day2 applied
```

Шинэ environment variable-уудыг `backend/.env.example`-д тайлбартай нэмсэн. Local `.env` secret-ийг report/code-д хуулж оруулаагүй.

## 5. Test ба verification

### Backend

```text
npm test
tests: 46
pass: 46
fail: 0
```

Шинээр нэмэгдсэн 6 test:

- 3 state/contract snapshot test
- 3 social OAuth/encryption/sync integration test

Нэмэлт database assertion:

- accepted invitation нь `workspaceId` буцаана;
- яг нэг matching Collaboration үүснэ;
- `INVITATION + sourceId`-тай яг нэг approved WorkOffer үүснэ.

### Frontend

```text
npm run build
2361 modules transformed
build completed successfully
```

## 6. Өнөөдрийн scope-д ороогүй дараагийн ажил

Schema foundation тавигдсан боловч төлөвлөгөөний дараагийн өдрүүдэд хийгдэх зүйл:

- QPay provider болон webhook reconciliation
- Ledger posting service, 10% commission, payout approval
- PublishProof submit/verify/retention API
- Delayed settlement болон dispute award split
- 24 цаг тутмын scheduler/queue worker
- Meta production app review, page selection болон real credential acceptance test

Sandbox provider нь production Meta credential байхгүй үед урсгалыг бүрэн test хийх зориулалттай. Production-д `SOCIAL_PROVIDER_MODE=meta` болон Meta App Review/credential шаардлагатай.

---

# Day 1–2 хэрэгжилтийн тайлан

Огноо: 2026-07-30

## Ерөнхий үр дүн

`backend.md` доторх Day 1 болон Day 2-ын ажлуудыг Modular Monolith Architecture ашиглан хэрэгжүүлж дуусгав.

Backend application runtime нь JavaScript болон Node.js дээр ажиллана. Controller дотор Prisma query болон business logic бичээгүй. Database query-г repository layer, business rule-г service layer хариуцна.

`backend/prisma.config.ts` болон `backend/tsconfig.json` файлуудад ямар ч өөрчлөлт оруулаагүй.

## Day 1 — JavaScript runtime болон Authentication

### JavaScript application runtime

- Backend entrypoint-ийг `src/server.js` болгосон.
- Development runtime: `nodemon src/server.js`.
- Production runtime: `node src/server.js`.
- Test болон seed script-үүдийг Node.js-оор шууд ажилладаг болгосон.
- Application runtime-аас `tsx` болон TypeScript import хамаарлыг арилгасан.
- Prisma Client-ийг JavaScript-compatible байдлаар тохируулсан.
- Ашиглагдахгүй legacy entrypoint болон notification файлуудыг цэвэрлэсэн.
- Auth module-ийн middleware болон public interface-ийг module дотор нь байршуулсан.
- Shared module-ээс auth module руу үүссэн reverse dependency-г арилгасан.

### Password reset

Дараах endpoint-уудыг хэрэгжүүлсэн:

- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/verify-reset-otp`
- `POST /api/v1/auth/reset-password`

Хэрэгжсэн хамгаалалт:

- Бүртгэлтэй болон бүртгэлгүй email-д ижил хариу өгнө.
- Зургаан оронтой OTP ашиглана.
- OTP database-д hash хэлбэрээр хадгалагдана.
- OTP хугацаа, оролдлогын тоо болон resend cooldown шалгана.
- OTP-г зөвхөн нэг удаа ашиглаж болно.
- OTP шалгасны дараа богино хугацаатай password-reset JWT олгоно.
- Password солигдсоны дараа өмнөх бүх session хүчингүй болно.

### Refresh token security

- Refresh token rotation хэрэгжүүлсэн.
- Refresh token бүр family ID-тай болсон.
- Ашиглагдсан refresh token-ийг дахин ашиглах оролдлогыг илрүүлнэ.
- Token reuse илэрвэл тухайн token family бүхэлдээ хүчингүй болно.
- Refresh session дээр IP address болон user-agent хадгална.
- Шинэ token өмнөх token-той `replacedById` relation-оор холбогдоно.

### Logout

- Одоогийн session-оос гарах `POST /auth/logout` хэвээр ажиллана.
- Бүх төхөөрөмжөөс гарах `POST /auth/logout-all` нэмэгдсэн.
- Logout-all үед refresh token-ууд болон одоогийн access session хүчингүй болно.

### Frontend authentication integration

- `auth.api.js` дотор forgot password, OTP verify, reset password, logout-all API method нэмсэн.
- Forgot password page-ийг дараах дөрвөн алхамтай болгосон:
  1. Email оруулах
  2. OTP шалгах
  3. Шинэ password оруулах
  4. Амжилттай дууссан төлөв
- Password strength болон confirm password validation нэмсэн.
- Password reset endpoint-уудыг Axios refresh retry logic-оос тусгаарласан.

## Day 2 — Media, Portfolio болон Public Marketplace

### Media module

Тусдаа modular бүтэцтэй media module үүсгэсэн:

- Route
- Controller
- Service
- Repository
- Validation
- Mapper
- Upload middleware
- Magic-byte validator
- Local storage adapter
- Public module interface

Endpoint:

- `POST /api/v1/media/uploads`
- `DELETE /api/v1/media/uploads/:id`

Хэрэгжсэн хамгаалалт:

- Зөвхөн нэвтэрсэн хэрэглэгч upload хийж болно.
- Upload owner-оор тусгаарлагдана.
- Image болон video хэмжээний хязгаартай.
- Declared MIME type шалгана.
- Файлын бодит signature буюу magic byte шалгана.
- Файл бүрийн SHA-256 checksum хадгална.
- Media purpose шалгана.
- Profile эсвэл portfolio-д ашиглагдаж байгаа media-г шууд устгах боломжгүй.

### MediaAsset entity

Media metadata хадгалах `MediaAsset` entity нэмсэн.

Үндсэн талбарууд:

- Owner
- Purpose
- Original filename
- MIME type
- Media type
- File size
- Storage provider
- Storage key
- Public URL
- Checksum
- Created timestamp

### Creator portfolio

Endpoint-ууд:

- `GET /api/v1/creator/portfolio`
- `POST /api/v1/creator/portfolio`
- `PATCH /api/v1/creator/portfolio/:id`
- `DELETE /api/v1/creator/portfolio/:id`
- `GET /api/v1/portfolio/:id`

Хэрэгжсэн logic:

- Portfolio owner enforcement.
- Нэг creator хамгийн ихдээ 50 portfolio item үүсгэнэ.
- `DRAFT`, `PUBLISHED`, `ARCHIVED` lifecycle.
- Portfolio item soft delete хийнэ.
- Public endpoint зөвхөн published item харуулна.
- Өөр creator-ийн portfolio item-ийг update/delete хийх боломжгүй.
- Media ownership шалгана.
- Creator profile үүсэхэд initial portfolio sample-г transaction дотор үүсгэх боломжтой.

### Public creator marketplace

Endpoint-ууд:

- `GET /api/v1/creators`
- `GET /api/v1/creators/:id`

Creator list дээр:

- Search
- Category filter
- Platform filter
- Location filter
- Minimum followers
- Minimum engagement
- Minimum rating
- Minimum/maximum price
- Verified filter
- Available-for-work filter
- Pagination
- Sort

Public creator DTO дараах private мэдээллийг задруулахгүй:

- User ID
- Email
- Password
- Token
- Public биш rate
- Private account data

### Public business marketplace

Endpoint-ууд:

- `GET /api/v1/businesses`
- `GET /api/v1/businesses/:id`

Business list дээр:

- Search
- Industry filter
- Location filter
- Rating filter
- Verified filter
- Pagination
- Sort

Public business detail нь зөвхөн public, open campaign-уудыг буцаана. User ID, email болон private account data буцаахгүй.

### Marketplace categories

Endpoint:

- `GET /api/v1/categories`

Category бүрийн public creator count-ийг database-аас тооцоолж буцаана.

### Creator onboarding integration

- Avatar, cover болон portfolio sample файлыг media API руу upload хийнэ.
- Upload-аас буцсан media ID-г creator profile payload-д оруулна.
- Social URL-уудыг normalize хийж `https://` URL болгоно.
- Creator category-г зөвшөөрөгдсөн taxonomy-аар шалгана.
- Browser refresh хийсний дараа сэргээх боломжгүй local file-ийг дахин сонгох тайлбар нэмсэн.

### Business onboarding integration

- Logo болон cover файлыг media API руу upload хийнэ.
- Upload-аас буцсан media ID-г business profile payload-д оруулна.
- Media owner болон purpose-г backend дээр дахин шалгана.

### Public profile frontend integration

- Creator public profile page бодит `GET /creators/:id` API ашигладаг болсон.
- Creator portfolio-г backend response-оос харуулдаг болсон.
- Business public profile page бодит `GET /businesses/:id` API ашигладаг болсон.
- Business-ийн public open campaign-уудыг backend response-оос харуулдаг болсон.
- Local fixture data-г зөвхөн demo fallback болгон үлдээсэн.
- Backend media URL-г frontend дээр зөв absolute URL болгон хөрвүүлдэг болсон.

### Marketplace seed

`prisma/seed-marketplace.js` deterministic seed нэмсэн.

- Дөрвөн creator.
- Гурван business.
- Seed account-уудыг давхар үүсгэхгүй.
- Password source code-д хадгалахгүй.
- `MARKETPLACE_SEED_PASSWORD` environment variable ашиглана.

Ажиллуулах:

```powershell
$env:MARKETPLACE_SEED_PASSWORD='your-strong-password'
npm run seed:marketplace
```

## Database өөрчлөлт

### AuthToken

- `familyId`
- `replacedById`
- IP address
- User-agent

### VerificationCode

- `PASSWORD_RESET` purpose
- `resendAvailableAt`
- Attempts болон one-time usage support

### CreatorProfile болон BusinessProfile

- Rating average
- Rating count
- Marketplace search/filter index-үүд

### PortfolioItem

- Media asset relation
- Status
- Sort order
- Soft-delete timestamp

### MediaAsset

- Owner relation
- Media purpose
- File metadata
- Storage metadata
- Checksum

## Prisma migration

Day 1–2 migration:

- `20260730020000_day1_day2_foundation`

Legacy drift cleanup migration:

- `20260730021000_cleanup_legacy_auth_token_type`

Migration нь өмнөх AuthToken record-уудын family ID-г аюулгүй backfill хийнэ.

Шалгалтын үр дүн:

- Нийт 8 migration бүрэн хийгдсэн.
- Database schema up to date.
- Prisma schema valid.
- Migration/schema diff: `No difference detected`.

## Modular Monolith Architecture

Шинэ болон өөрчилсөн feature бүр дараах layer-үүдээр тусгаарлагдсан:

- Route: HTTP route declaration.
- Controller: request/response mapping.
- Service: business logic.
- Repository: Prisma query болон persistence.
- Schema: request validation.
- Mapper/DTO: private-safe response.
- Middleware: authentication, upload болон permission.
- Public interface: module хооронд ашиглах зөвшөөрөгдсөн export.

Controller дотор Prisma query байхгүй. Module хооронд circular dependency үүсгээгүй.

## Documentation

Дараах documentation-ийг шинэчилсэн:

- `backend.md`
- `backend/README.md`
- `backend/POSTMAN.md`

Postman documentation дотор:

- Registration болон email verification.
- Login, refresh болон logout.
- Password reset.
- Logout-all.
- Media upload.
- Portfolio lifecycle.
- Creator болон Business public discovery.

## Эцсийн шалгалтын үр дүн

### Backend

- Integration tests: 24/24 pass.
- Authentication tests: 14/14 pass.
- Day 2 media/portfolio/marketplace tests: 4/4 pass.
- Profile tests: 6/6 pass.
- Node.js syntax check: 80 JavaScript file pass.
- API health smoke test: pass.
- Prisma validate: pass.
- Prisma migration status: up to date.
- Prisma schema diff: no difference.
- Controller Prisma query audit: pass.
- TypeScript runtime reference audit: pass.

### Frontend

- ESLint: pass.
- Validation tests: 3/3 pass.
- Vite production build: pass.

## Өөрчлөөгүй хамгаалсан файлууд

Дараах файлуудад ямар ч өөрчлөлт оруулаагүй:

- `backend/prisma.config.ts`
- `backend/tsconfig.json`

Эдгээр файл read-only tooling configuration хэвээр үлдсэн.
# Day 3–4 хэрэгжилтийн тайлан

Огноо: 2026-07-30

## Үр дүн

`backend.md` дотор төлөвлөсөн Day 3 болон Day 4-ийн үндсэн урсгалыг JavaScript Modular Monolith архитектураар хэрэгжүүлэв. Controller нь зөвхөн HTTP orchestration, service нь business rule, repository нь Prisma query, schema нь request validation, mapper нь public DTO-г хариуцна.

`backend/prisma.config.ts` болон `backend/tsconfig.json` файлуудад өөрчлөлт оруулаагүй.

## Day 3 — Discovery, library, collections, showcase

Шинээр хэрэгжүүлсэн module:

- `targets`: polymorphic target ID/slug resolver.
- `interactions`: save, follow, recent view, share.
- `collections`: collection CRUD, visibility, item management.
- `showcase`: creator post publish, public/following feed, reaction.
- `discovery`: discover section болон олон төрлийн combined search.

Үндсэн хамгаалалт:

- Save/follow/recent үйлдэл idempotent.
- Creator өөрийгөө follow хийх боломжгүй.
- Collection owner enforcement.
- `PRIVATE`, `UNLISTED`, `PUBLIC` visibility.
- Unlisted share token.
- Collection 50, item 200 хүртэл хязгаар.
- Showcase зөвхөн өөрийн published portfolio item-оос үүснэ.
- Нэг portfolio item нэг active showcase post-той.
- Following feed зөвхөн дагасан creator-ийн published content буцаана.

Frontend холбоос:

- Marketplace library серверээс hydrate хийнэ.
- Save/follow/recent/share үйлдэл API-д хадгалагдана.
- Collection CRUD болон item mutation API ашиглана.
- Discover/search серверийн filter, sort, pagination ашиглана.
- Showcase болон following feed серверээс уншиж, like reaction хадгална.

## Day 4 — Campaign, proposal, sourcing

Шинээр хэрэгжүүлсэн module:

- `campaigns`: draft CRUD, publish, pause, archive, public listing/detail.
- `proposals`: submit, edit, withdraw, shortlist, counter, accept, reject.
- `sourcing`: shortlist, compare, invitation, respond, cancel.

Үндсэн business rule:

- Campaign зөвхөн business owner-д өөрчлөгдөнө.
- Campaign create хийхэд үргэлж private `DRAFT` үүснэ.
- Publish хийх үед open эсвэл invite-only горим сонгоно.
- Өнгөрсөн application deadline-тай campaign publish хийхгүй.
- Budget range буруу бол request татгалзана.
- Campaign mutation optimistic version ашиглана.
- Нэг creator нэг campaign-д нэг proposal гаргана.
- Зөвхөн public, open, хугацаа дуусаагүй campaign proposal авна.
- Creator өөрийн business campaign-д proposal гаргахгүй.
- Proposal transition бүр зөвшөөрөгдсөн төлөвөөс хийгдэнэ.
- Compare list нэг context-д дөрөв хүртэл creator авна.
- Invitation зөвхөн тухайн business-ийн open campaign-аас илгээгдэнэ.
- Invitation creator болон business owner тус бүр өөрийн action-аа л хийнэ.

Frontend холбоос:

- Business campaign wizard бодит draft API үүсгэнэ.
- Campaign edit, status transition, delete API ашиглана.
- Creator proposal submit/edit/withdraw API ашиглана.
- Business proposal list болон decision API ашиглана.
- Shortlist, compare, invitation browser local state биш database-д хадгалагдана.
- Marketplace campaign detail backend data уншиж, creator шууд proposal илгээж чадна.

## Database өөрчлөлт

Нэмсэн entity:

- `SavedItem`
- `RecentView`
- `ShareEvent`
- `ShowcasePost`
- `ShowcaseReaction`
- `CreatorShortlist`
- `CreatorComparison`
- `CampaignInvitation`

Өргөтгөсөн entity:

- `Follow`: creator/business polymorphic target.
- `Collection`: cover URL.
- `Campaign`: goal, deliverables, application deadline, version, archive timestamp.
- `Proposal`: version, counter amount, counter message.

Day 3–4-д зориулсан 3 migration нэмэгдэж, нийт 11 migration database-д deploy хийгдсэн.

## Seed

`seed-marketplace.js` одоо:

- 4 verified creator
- 4 published portfolio item
- 4 published showcase post
- 3 verified business
- 3 public open campaign

үүсгэнэ. Seed-ийг дараалан хоёр удаа ажиллуулж idempotent болохыг шалгасан.

## Баталгаажуулалт

- Backend integration test: **31/31 pass**
- Day 3/4-ийн шинэ integration test: **7/7 pass**
- Frontend unit test: **3/3 pass**
- Frontend ESLint: **pass**
- Frontend production build: **pass**
- JavaScript syntax check: **140 файл pass**
- Prisma schema validation: **pass**
- Migration status: **11 migration, up to date**
- Database/schema drift: **No difference detected**
- `prisma.config.ts` SHA-256 өөрчлөгдөөгүй.
- `tsconfig.json` SHA-256 өөрчлөгдөөгүй.

---

## Day 5–6 хэрэгжүүлэлтийн тайлан

### Day 5 — Offer, collaboration, agreement, contract

- `offers`, `collaborations`, `contracts`, `audit` module-уудыг Modular Monolith бүтцээр нэмэв.
- Offer үүсгэх, creator interested/counter/decline, business approve/change request/decline үйлдлүүд API болсон.
- Offer mutation бүр optimistic `version` болон immutable `OfferRevision` түүхтэй.
- Business approve хийхэд нэг transaction дотор зөвхөн нэг collaboration, agreement version, contract, анхны task/activity үүснэ.
- Agreement term өөрчлөх бүр шинэ `AgreementVersion` үүсэж, хуучин approval автоматаар хүчингүй болно.
- Agreement болон contract approval нь тухайн version дээр хадгалагдана.
- Хоёр тал agreement approve хийсний дараа contract snapshot/version үүснэ.
- Хоёр тал contract approve хийсний дараа л `PAYMENT_PENDING` болно.
- Participant ownership, role, state, version, IDOR болон double-click хамгаалалт нэмэв.
- Workspace task, file, member note, activity, downloadable contract document endpoint нэмэв.

### Day 6 — Payment, deliverable, review, showcase

- `payments`, `deliverables`, `reviews` module болон payment provider port/mock adapter нэмэв.
- Funding intent үүсгэх болон webhook боловсруулах урсгалыг салгав.
- `FUNDED`, `RELEASED`, `REFUNDED`, `PAID` төлөв зөвхөн HMAC signature шалгасан provider event-ээр өөрчлөгдөнө.
- Provider event ID unique тул давхар webhook idempotent.
- Provider amount, currency, payment type, current state бүгд шалгагдана.
- Raw card мэдээлэл авахгүй; зөвхөн provider token хадгалдаг payment method API нэмэв.
- Refund болон payout eligibility, owner, amount, release boundary шалгалтууд нэмэв.
- Creator deliverable submit/revision, business approve/revision request урсгал нэмэв.
- Verified funding-ээс өмнө deliverable submit хийх болон completion-ээс өмнө release хийх боломжгүй.
- Бүх latest deliverable approve болоход collaboration complete болж release intent үүснэ.
- Creator→business, business→creator чиглэлтэй review хадгалж profile rating aggregate шинэчилнэ.
- Хоёр review болон approved deliverable байхад collaboration-оос Showcase post publish хийнэ.

### Frontend integration

- `CollaborationProvider`-ийн LocalStorage workflow-ийг бодит REST API hydration/mutation болгож солив.
- Work offer, negotiation, agreement, contract, payment, file upload, deliverable, review, showcase action-ууд backend API ашиглана.
- Shared file болон deliverable upload нь owner-scoped `MediaAsset` ашиглана.
- Workspace нээгдэх үед серверийн хамгийн сүүлийн version/state-ийг уншина.
- Payment товч frontend-ээс state шууд солихгүй; local mock provider-ийн verified event урсгалыг дуудна.

### Database

- `OfferRevision`
- `AgreementVersion`
- `CollaborationTask`
- `CollaborationFile`
- `CollaborationActivity`
- `PaymentProviderEvent`
- `PaymentMethod`
- `PaymentRefund`
- `PaymentPayout`
- `OutboxEvent`

гэсэн entity-үүд болон contract/deliverable/showcase relation, version/index-үүд нэмэгдэв.

Migration:

- `20260730050000_day5_day6_collaboration_finance`
- `20260730051000_day6_media_purposes`
- `20260730052000_day6_deliverable_media`

Нийт 14 migration deploy хийгдсэн, database schema up to date.

### Баталгаажуулалт

- Backend integration test: **36/36 pass**
- Day 5–6 lifecycle test: **5/5 pass**
- Frontend lint: **pass**
- Frontend unit test: **3/3 pass**
- Frontend production build: **pass**
- Prisma schema validation: **pass**
- Migration status: **up to date**
- `backend/prisma.config.ts` болон `backend/tsconfig.json`: **өөрчлөөгүй**

---

## Requirement 7-day plan — Day 1 хэрэгжүүлэлтийн тайлан

### Contract mock-to-API cutover

- `GET /api/v1/contracts` endpoint-ийг `status`, `q`, `cursor`, `limit` validation-тай нэмэв.
- Жагсаалт зөвхөн collaboration-ийн creator/business participant-д харагдана; admin бүх contract-ийг унших боломжтой.
- Contract DTO-д campaign/direct offer title, creator, business, amount/currency, current version, approval, deadline, payment state, terms болон workspace ID тогтвортой хэлбэрээр орно.
- Detail болон document endpoint participant/admin ownership-ийг ижил дүрмээр шалгана; outsider resource existence мэдэхгүйгээр `404` авна.
- Contract action дээр admin participant-ийн оронд approval/change request хийхийг хориглов.
- Contract document-ийг JSON mock биш, server-side `application/pdf` buffer болгон үүсгэж татдаг болгов.
- `WorkflowPages.jsx`-ийн static contract import, browser-only signature decision, mock lifecycle бүрэн арилсан.
- Contract list search/filter/cursor load-more, loading/error/retry/empty төлөвтэй болсон.
- Detail page бодит approve, request changes, PDF download API ашиглаж, жинхэнэ collaboration workspace route руу орно.

### Portfolio persistence

- Creator portfolio page `GET/POST/PATCH/DELETE /creator/portfolio` endpoint-ууд ашиглана.
- Image/video эхлээд owner-scoped `MediaAsset` болгон upload хийгдээд `mediaAssetId`-аар portfolio item-д холбогдоно.
- Published/Draft filter, create/edit/delete, loading/error/retry/empty, validation болон success/error toast нэмэв.
- Data URL/FileReader болон LocalStorage portfolio state ашиглахаа больсон; refresh хийсний дараа database-аас дахин уншина.

### Settings persistence

- Creator/Business profile tab нээгдэхэд profile API-аас өгөгдөл татаж, update/delete API ашигладаг болсон.
- Notification tab `GET/PATCH /notifications/preferences` ашиглаж бүх бодит email preference-ийг account дээр хадгална.
- Profile болон notification хэсэг тус бүр loading, retry, save progress, API error төлөвтэй.
- `MarketplaceProvider.updateAccount`-ийг stable callback болгож settings hydration давтан дуудагдах эрсдэлийг хаав.

### Local mock state цэвэрлэгээ

- `DashboardDataProvider`-оос portfolio, contract decision, notification preference, payment/refund/payout, analytics, conversation болон static notification-ийн browser persistence/action-уудыг авсан.
- Campaign provider одоо static dashboard campaign-аар эхлэхгүй, зөвхөн authenticated API hydration ашиглана.

### Test ба баталгаажуулалт

- Day 1 contract integration test: **8/8 pass**.
  - Business/Creator participant list.
  - Outsider list isolation болон detail `404`.
  - Status/search/filter validation.
  - Stable DTO.
  - Server PDF.
- Day 1 frontend component test: **5/5 pass**.
  - Loading.
  - Server data.
  - Empty.
  - Error + retry.
  - Real approval action.
- Backend full integration suite: **76/76 pass**.
- Frontend test suite: Node **3/3**, Vitest **14/14 pass**.
- Frontend ESLint: **pass**.
- Frontend production build: **pass**.
- Prisma schema validation: **pass**.
- Энэ Day 1 ажилд database schema, migration, `prisma.config.ts`, `tsconfig.json` өөрчлөөгүй.
# Requirement 7-day plan — Day 2 хэрэгжүүлэлтийн тайлан (2026-08-07)

Эх төлөвлөгөө: `requirement-7-day-plan.md` доторх **Өдөр 2 — Workspace task, file, timeline-ийг бүрэн болгох**.

## 1. Database ба migration

- `CollaborationTaskStatus`: `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`.
- `CollaborationTaskPriority`: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- `CollaborationTask` дээр nullable `assigneeId`, `sortOrder`, optimistic concurrency-ийн `version` нэмсэн.
- `createdBy` болон `assignee` User relation-уудыг тусдаа explicit relation болгосон.
- `20260807010000_workspace_task_board` migration нь legacy `completedAt`-тай task-уудыг `DONE`, бусдыг `TODO` болгон, collaboration тус бүрийн хуучин task order-ийг `sortOrder` руу backfill хийдэг.
- Migration local PostgreSQL дээр `prisma migrate deploy`-оор амжилттай хэрэглэгдсэн; Prisma schema validate болон client generate pass.

## 2. Backend modular API ба business rules

Шинэ endpoint:

- `POST /api/v1/collaborations/:id/tasks`
- `PATCH /api/v1/collaborations/:id/tasks/:taskId`
- `DELETE /api/v1/collaborations/:id/tasks/:taskId?version=...`
- `POST /api/v1/collaborations/:id/tasks/:taskId/toggle` compatibility alias хэвээр.

Хэрэгжсэн rule:

- Зөвхөн workspace participant task/file харж, өөрчилнө; outsider-д resource existence задруулахгүй `404` өгнө.
- Task assignee нь тухайн collaboration-ийн Creator эсвэл Business user байна; outsider assignee `400 TASK_ASSIGNEE_NOT_PARTICIPANT`.
- Update/delete нь task `version` шалгана; stale mutation `409 TASK_VERSION_CONFLICT`.
- `COMPLETED`, `CANCELLED` collaboration дээр task/file mutation `409 COLLABORATION_TERMINAL`.
- Delete нь task record-ийг арилгасан ч `TASK_DELETED` activity болон outbox audit snapshot-ийг хадгална.
- Task create/update/move/delete болон file add бүр activity + outbox event-ийг transaction дотор хамт үүсгэнэ.
- Workspace file/message attachment нь client-ийн URL, MIME, size metadata-д итгэхгүй. Сервер тухайн user-ийн `COLLABORATION` purpose-той бодит MediaAsset-ийг шалгаж, зөвшөөрөгдсөн MIME болон 25 MB limit-ийг мөрдүүлнэ.
- Message attachment дээр foreign asset ашиглах IDOR хаагдсан.

## 3. Frontend

- Workspace task list-ийг `WorkspaceTaskBoard` component болгож салгасан.
- Responsive layout: mobile 1 column, tablet 2 column, desktop 4 column.
- Task create/edit dialog нь title, description, assignee, due date, priority, status удирдана.
- Task card дээр forward/backward status move, edit, delete action нэмсэн.
- Terminal workspace task board read-only болж mutation controls нуугдана.
- Collaboration file upload нь Media API-аар эхэлж, дараа нь зөвхөн asset ID/name-ийг workspace API руу дамжуулна.
- Message composer нь attachment сонгох, image preview, remove, upload progress state, textгүй attachment send урсгалтай болсон.
- Workspace timeline нь legacy/local `timeline` fallback ашиглахгүй, зөвхөн backend `activity`-г харуулна.

## 4. Test ба баталгаажуулалт

- Day 2 backend integration: **14/14 pass**.
  - participant/outsider ownership
  - create/assign/update/move/toggle/delete
  - optimistic concurrency
  - activity/outbox audit
  - file ownership/purpose/MIME
  - message attachment IDOR
  - refresh persistence
  - terminal workspace guards
- Day 2 task-board component + API contract targeted frontend: **15/15 pass**.
- Backend full integration suite: **91/91 pass**.
- Frontend full suite: **20/20 pass**.
- Frontend ESLint: pass.
- Frontend Vite production build: pass.
- Prisma format/validate/generate/migrate deploy: pass.

Day 2-ын local code scope бүрэн дууссан. Production object storage нь төлөвлөгөөнд тусдаа external blocker хэвээр.

# Requirement 7-day plan — Day 3 хэрэгжүүлэлтийн тайлан (2026-08-07)

Эх төлөвлөгөө: `requirement-7-day-plan.md` доторх **Өдөр 3 — Discover, Home feed, filter, ranking**.

## 1. Marketplace query contract

- `GET /api/v1/creators` болон `GET /api/v1/businesses` хуучин `page`, `limit`, `pagination` contract-оо хадгалж, нэмэлтээр opaque `nextCursor` буцаана.
- Cursor нь `version + scope + sort + id` агуулсан base64url token. Өөр resource/sort-д ашигласан эсвэл эвдэрсэн cursor `400 INVALID_CURSOR` буцаана.
- Cursor ашигласан response-ийн `hasNextPage` болон `hasPreviousPage` нь cursor traversal-ийн бодит төлөвтэй нийцнэ.
- Result ranking бүр тогтвортой tie-break ашигладаг тул нэг dataset-ийг cursor-аар бүтэн туулахад item давхардах эсвэл алга болохгүй.

## 2. Creator discovery

Server-side filter:

- category/niche, platform
- нийт follower-ийн minimum/maximum range
- engagement-ийн minimum/maximum range
- rating
- starting rate minimum/maximum + currency
- verified, available
- location, language, бүх шаардсан skills

Sort:

- `relevant` / `trending`
- `followers` / `most_followed`
- `rating` / `highest_rated`
- `newest`
- `price_low`, `price_high`
- `alphabetical`

Өмнөх `followers` sort нь `createdAt` fallback ашиглаж байсан. Одоо creator-ийн бүх `SocialAccount.followerCount`-ийг нийлбэрлэн бодитоор эрэмбэлж, trending score-д follower, дундаж engagement, rating-ийг хамтатган ашигладаг.

## 3. Business discovery

- Industry, location, verified status, minimum rating болон minimum completed collaboration filter нэмсэн.
- Business DTO дээр `completedCollaborationCount` нэмсэн.
- Trending ranking нь completed collaboration, open public campaign болон rating-ийн deterministic нийлмэл score ашиглана.
- Highest rated, newest, alphabetical sort болон cursor traversal бүрэн дэмжинэ.

## 4. Feed section ба visibility

`GET /api/v1/feed` дээр:

- `section=featured`
- `section=trending`
- `section=latest`
- `section=recommended`
- `section=following`

contract нэмсэн. Хуучин `mode=for_you|following` compatibility хэвээр.

- Featured нь paid partnership эсвэл verified author content-ийг сонгоно.
- Trending/Recommended/Featured нь reaction count, published time, ID дарааллаар deterministic ranking хийнэ.
- Latest нь published time + ID дараалал ашиглана.
- Following нь authentication шаардаж, зөвхөн дагасан Creator/Business channel-ийн content харуулна.
- Content search нь title, caption, creator/business name, bio/description, category, location-оор ажиллана.
- Guest болон Viewer-ийн feed-ээс `CAMPAIGN` post үргэлж хасагдаж, Creator role-д хэвээр харагдана.

`GET /api/v1/marketplace/discover` response-д backward-compatible үндсэн arrays дээр нэмээд `sections.featured`, `trending`, `latest`, `recommended`, `following`, `popular`, `recentlyViewed` нэмсэн.

## 5. Frontend

- `useDebouncedValue` shared hook нь бүх public marketplace/search input-д 300 ms debounce өгнө.
- Creator/Business search backend-ийн `nextCursor`-оор infinite load хийнэ.
- Шинэ page-ийг ID-аар merge хийж duplicate card дарах ба шинэ filter/query эхлэхэд өмнөх Axios request-ийг `AbortController`-оор цуцална.
- Search query, sort, бүх filter `URLSearchParams`-тай sync болж, browser reload болон shared URL-аас сэргэнэ.
- Creator filter UI-д currency, location, language, skills, available; Business filter UI-д location болон completed collaboration нэмэгдсэн.
- Sort UI нь backend-ийн trending, most followed, highest rated, newest, price, alphabetical contract-тай нийцсэн.
- Showcase/Home feed нь For you, Featured, Trending, Latest, Following selector-той. Query/category/section нь URL-д хадгалагдаж, Following хоосон үед тусгай empty state харуулна.

## 6. Test ба баталгаажуулалт

- Day 3 backend integration: **15/15 pass**.
  - Creator бүх filter range.
  - Aggregate follower sort.
  - Deterministic sort/cursor.
  - Invalid/cross-sort cursor.
  - Business completed collaboration filter/ranking.
  - Feed section/search.
  - Following auth болон campaign visibility regression.
- Frontend Day 3 test: **2/2 pass**.
  - Shared URL → state → URL round trip.
  - Cursor page duplicate merge/order.
- Existing marketplace Day 3/4 regression: **8/8 pass**.
- Existing public marketplace + social content regression: **11/11 pass**.
- Backend full integration suite: **106/106 pass**.
- 10,000 profile stress verifier: **200 page, 0 duplicate, 0 missing**, 41,468 ms; temporary rows `finally` cleanup-аар устсан.
- Frontend Vitest: **22/22 pass**, Node validation: **3/3 pass**.
- Frontend full suite: **25/25 pass**; ESLint болон Vite production build: pass.

Day 3 хэрэгжилт database schema/migration, `prisma.config.ts`, `tsconfig.json`-д өөрчлөлт оруулаагүй. Offset pagination нь backward compatibility-д түр үлдсэн; frontend бүрэн cursor contract ашигладаг болсон.

# Requirement 7-day plan — Day 4 хэрэгжүүлэлтийн тайлан (2026-08-07)

## 1. Creator profile contract

- `creator.schema.js` болон `creator.service.js` нь categories, skills, languages, starting rate, currency, available-for-work болон controlled availability-г бүрэн удирдана.
- Хуучин UI-ийн availability label-ууд backward compatible хэвээр боловч database-д canonical `AVAILABLE_NOW`, `AVAILABLE_THIS_MONTH`, `LIMITED`, `NOT_ACCEPTING` утгаар хадгалагдана.
- Duplicate skill/language цэвэрлэгдэж, `NOT_ACCEPTING` үед available-for-work заавал false болно.
- Creator onboarding болон My Account edit дээр дээрх бүх field, тусгай YouTube link нэмэгдсэн.

## 2. Social trust ба 24 цагийн sync

- `POST/PATCH/DELETE /api/v1/creator/social-accounts` manual CRUD contract бүрэн болсон.
- Manual profile нь ямар request ирсэн ч `UNVERIFIED` + `MANUAL`; encrypted token, provider identity, last-sync үүсгэхгүй.
- OAuth-managed account manual PATCH-д `409 SOCIAL_OAUTH_MANAGED` өгнө. OAuth disconnect үндсэн provider action хэвээр.
- `npm run job:social-sync [limit]` command нь 24 цагаас хуучин connected account-уудыг batch-аар шинэчилнэ.
- Refresh/decrypt/provider алдаа нь `ERROR` эсвэл `REAUTH_REQUIRED` болж хадгалагдана; UI дээр refresh/reconnect action зөв ялгарна.
- Public болон owner DTO access/refresh token буцаахгүй, stale төлөвийг response авах мөчид тооцно.

## 3. Verified Payer ба compare truth

- Business channel-ийн identity verification-ийг payment trust гэж харуулдаг буруу mapping арилсан.
- `verifiedPayer` нь зөвхөн `FUNDING` төрлийн `FUNDED`/`RELEASED` payment, тухайн collaboration dispute/cancel төлөвгүй, active refund-гүй үед true болно.
- Public business profile шалгуур болон qualified date тайлбарладаг болсон.
- Shortlist/compare DTO нь verified OAuth social snapshot-ийн `statisticsCapturedAt`, source болон verified state буцаана; compare table capture date харуулна.

## 4. Баталгаажуулалт

- Day 4 backend integration: **16/16 pass**.
- Backend full integration regression: **122/122 pass**.
- Day 4 frontend trust tests: **7/7 pass**; frontend full suite: **29/29 pass**.
- Frontend ESLint: pass.
- Frontend Vite production build: pass.
- `prisma.config.ts`, `tsconfig.json` болон database schema/migration-д өөрчлөлт оруулаагүй.

# Requirement 7-day plan — Day 5 хэрэгжүүлэлтийн тайлан (2026-08-07)

## 1. Provider architecture ба Stripe

- Нэгдсэн payment provider port нь funding, refund, payout, webhook capability-г provider бүрээр explicit шалгана. Дэмжихгүй operation `501 PAYMENT_PROVIDER_OPERATION_UNSUPPORTED` өгч, амжилттай мэт хуурамч төлөв үүсгэхгүй.
- `PAYMENT_PROVIDER=stripe` үед Business funding нь Stripe Hosted Checkout Session үүсгэж, MNT/USD зэрэг two-decimal currency-г minor unit руу зөв хөрвүүлнэ.
- Checkout success/cancel URL нь байхгүй тусдаа page биш, тухайн `/business/collaborations/:id` workspace руу буцна. Frontend Checkout руу redirect хийж, буцсаны дараа webhook-ийн бодит төлөвийг 5 секунд тутам polling хийнэ.
- `POST /api/v1/payments/webhooks/stripe` нь JSON parse-аас өмнөх raw body, `Stripe-Signature`, HMAC-SHA256, 5 минутын tolerance ашиглана. Event нь internal state machine-д орохын өмнө providerRef, amount, currency-гаар reconcile хийгдэнэ.
- Stripe refund provider call нь request-specific idempotency key ашиглана. Provider network call-ууд database transaction-ийг нээлттэй барихгүй; provider failure нь refund/payout-ийг `FAILED` төлөв болон audit record-той үлдээнэ.
- QPay callback мөн provider-side check, amount/currency/providerRef reconciliation, payload hash replay хамгаалалттай болсон.

## 2. Money invariant

- Ledger batch бүр required posting, account code/type, currency, positive amount, нийт debit/credit тэнцлийг шалгана.
- Batch fingerprint нь ижил event-ийн аюулгүй retry-г зөвшөөрч, өөр payload-тай давхар batch-ийг `LEDGER_BATCH_CONFLICT`-оор хаана.
- Partial/full refund-ийн өмнөх идэвхтэй хүсэлтүүдийг нийлбэрлэн шалгаж, funded balance-аас илүү refund үүсэхгүй.
- Collaboration `DISPUTED` эсвэл active TrustCase-тэй үед release, refund, payout, manual reconciliation бүгд нэг freeze policy ашиглана.
- Payout approve нь transaction дотор provider call хийхээ больсон. Богино atomic claim → provider call → audited finalize урсгалтай тул concurrent хоёр хүсэлтээс нэг нь л provider руу явна.

## 3. Disclosure, wallet, admin UI

- `disclosureRequired=true` contract дээр publish proof болон шууд content publish аль аль нь `paidPartnership=true` шаардана.
- Creator proof form requirement-ийг харуулж, checkbox баталгаажаагүй үед submit disabled байна.
- Creator wallet-ийн available balance, earned болон paid-out дүн payment list-ийн таамаг биш, ledger summary endpoint-оос ирнэ.
- Admin Finance-д бодит payout queue, approve/reject reason, reconciliation action болон refund audit reason нэмэгдсэн.

## 4. Баталгаажуулалт

- Day 5 hardening: **23/23 pass** — Stripe signature/event/currency, provider capability, fail-closed config, 100 ledger batch property run, dispute freeze, disclosure bypass.
- Collaboration/payment targeted regression: **48/48 pass**, concurrent payout-ийн хоёр хүсэлт **200 + 409** болж хэдэн минутын lock үүсгэхгүй.
- Backend бүх integration: **146/146 pass**.
- Frontend validation + Vitest: **32/32 pass**; ESLint болон Vite production build: pass.
- `prisma.config.ts`, `tsconfig.json` болон Prisma schema-д Day 5-аар өөрчлөлт оруулаагүй.

## 5. Production тохиргоо ба зориуд үлдээсэн boundary

- Real Stripe funding асаахдаа `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, HTTPS `CLIENT_URL` тохируулна.
- Creator payout-ийг Stripe-аар хийхэд Stripe Connect connected account onboarding, KYC болон account identifier шаардлагатай. Одоогийн bank payout model энэ мэдээллийг агуулахгүй учраас Stripe payout capability-г зориуд `false` үлдээж, fake success хийхээс хамгаалсан. Энэ нь external account configuration дууссаны дараах тусдаа production integration юм.

# Dashboard, work request, direct messaging implementation (2026-08-07)

## Implemented

- Creator discover campaign cards now open an inline **Send work request** dialog. The existing Proposal domain/API is reused, so there is no duplicate campaign-application endpoint.
- Business creator browsing and creator campaign discovery keep search and filters inside their dashboards. The topbar search that redirected users to a separate page was removed.
- Creator and Business profiles now support a gated direct-message request without a workspace. A conversation is created only after the recipient accepts; decline, duplicate request, initial message preservation, notification and outbox events are persisted.
- Messages UI now has Chats and Requests views, Incoming/Outgoing request boxes, Accept/Decline actions and direct-conversation opening.
- Creator and Business dashboard home pages no longer import dashboard or marketplace mock arrays. Metrics, charts, collaborations, messages, requests, creator recommendations and wallet/funding values are loaded from real APIs.
- The date filter now sends canonical `1D`, `7D`, `1M`, `1Y`, `ALL` values and refreshes analytics for the selected interval.
- User-facing “proposal” labels were aligned to “work request” while preserving the stable backend Proposal model and endpoints.

## Persistence and API

- Added `MessageRequest`, `MessageRequestStatus`, direct conversation key and required relations/indexes.
- Added `GET/POST /api/v1/conversations/requests` and `POST /api/v1/conversations/requests/:id/decision`.
- Added `1D` support to analytics validation and range calculation.
- Migration: `20260807090000_direct_message_requests` (applied successfully).

## Verification

- Direct message and range integration: **5/5 pass**.
- Backend full integration regression: **151/151 pass**.
- Frontend Node validation + Vitest: **32/32 pass**.
- Frontend ESLint and Vite production build: pass.
- Prisma Client generation and migration deploy: pass.
- `prisma.config.ts` and `tsconfig.json` were not changed.

# Real marketplace data enforcement (2026-08-07)

## Implemented

- Removed the unused frontend fixture modules for creators, businesses, campaigns and admin/dashboard sample records.
- Removed the executable marketplace fixture seeder and its npm command. Seven previously seeded `@example.com` marketplace accounts (4 creator, 3 business) were deleted from PostgreSQL; cascading seed campaigns/content were removed with their owners.
- Dashboard channel switcher now derives names, avatars and available roles only from the authenticated user and loaded channel profiles; demo channel fallbacks were removed.
- Dashboard data is cleared on logout, account switch and missing-role/API states so a previous account's campaigns or requests cannot remain visible in memory.
- Creator and business profile pages no longer invent stock avatars/covers, creator skills, collaboration steps, portfolio clients, performance claims or campaign details. Missing media uses a neutral visual state and missing fields are explicitly marked as not set.
- Discover hero media is sourced only from the first registered creator returned by the API. When no creator exists, it renders an abstract empty background instead of a stock person.
- Public campaign list/detail queries now require the owning business user to be active and not deleted. Public creator and business queries already enforce the same account rule.
- Business profile campaign cards now receive the persisted description, goal, platforms, deadlines, deliverables, status and proposal count instead of frontend-generated values.

## Verification

- Frontend static no-fixture tests + validation + Vitest: **34/34 pass**.
- Frontend ESLint and Vite production build: pass.
- Campaign/public marketplace targeted integration: **9/9 pass**.
- Backend full integration regression: **152/152 pass**.
- Added regression coverage proving suspended creator/business owners disappear from creator, business and campaign detail/list APIs.

# Requirement 7-day plan — Day 6 implementation report (2026-08-07)

## 1. Audited platform configuration

- `PlatformSetting` нь зөвхөн API whitelist-д байгаа operational non-secret утгуудыг JSON хэлбэрээр хадгална. JWT, provider key, token, password зэрэг secret field request schema-аар шууд хаагдана; production secret-үүд environment variable хэвээр үлдсэн.
- `GET/PATCH /api/v1/admin/settings` болон `GET/POST/PATCH /api/v1/admin/feature-flags` хэрэгжсэн. Mutation бүр 5-аас дээш тэмдэгттэй reason шаардаж, before/after snapshot-тай `AdminAction` үүсгэнэ.
- Maintenance, channel application, creator/business onboarding, campaign publishing, content publishing нь backend policy дээр enforce хийгдэнэ. Flag rollout нь user ID-ийн deterministic bucket болон allowed role-оор шийдэгдэнэ.

## 2. Admin moderation ба operational data

- `GET /admin/offers`, `/admin/collaborations`, `/admin/content` нь pagination/search/status filter-тэй бодит PostgreSQL query ашиглана.
- `POST /admin/content/:id/hide|restore` нь өмнөх status-ийг хадгалж, hidden metadata болон audit reason бүртгэнэ. Hidden post нь feed, public channel posts, detail endpoint-оос алга болж, restore хийхэд өмнөх төлөвтөө орно.
- Admin Operations UI дээр offers/collaborations/content live жагсаалт, Content Moderation дээр hide/restore drawer, Admin Settings дээр live setting болон feature flag controls нэмэгдсэн. Бүх шинэ mutation reason болон confirmation шаарддаг.

## 3. Health ба background jobs

- `/api/v1/health/live` process uptime буцаана. `/api/v1/health/ready` PostgreSQL, configured Redis, configured RabbitMQ, dynamic outbox backlog threshold-ийг шалгаж failure үед `503` өгнө.
- `JobLease` нь хугацаатай distributed lease, `JobRun` нь attempt/status/metrics/error/last-run history хадгална. Runner exponential retry, structured JSON log, failed run dead-letter metric-тэй.
- `npm run job:maintenance` нь expired OTP, expired/revoked refresh token, retained processed/dead-letter outbox cleanup; 24h social sync; collaboration lifecycle/retention/reminder; previous UTC day analytics rollup-ийг ажиллуулна.
- Existing `job:lifecycle` болон `job:social-sync` command мөн ижил distributed runner ашигладаг болсон.

## 4. Verification

- Prisma format/validate/generate болон хоёр migration deploy: pass.
- Day 6 integration: **15/15 pass** — RBAC 403, secret rejection, setting/flag audit, real admin lists, hide/restore visibility, health, concurrent lease, retry/dead-letter, retention cleanup.
- Өмнөх backend regression: **152/152 pass**; шинэ Day 6 suite нэмэгдсэнээр нийт test тоо 167 болсон.
- Frontend validation + Vitest: **34/34 pass**, Vite production build: pass, ESLint: pass.
- `prisma.config.ts` болон `tsconfig.json` өөрчлөгдөөгүй.

# Requirement 7-day plan — Day 7 implementation report (2026-08-07)

## 1. Public SEO ба crawl contract

- `RouteMeta` нь route бүрийн canonical, robots, OpenGraph, Twitter metadata-г төвлөрүүлж, `/account`, `/creator`, `/business`, `/admin` болон бусад private route-д `noindex, nofollow, noarchive` тавина.
- Creator profile `Person`, Business profile `Organization`, Showcase detail `CreativeWork` JSON-LD-г зөвхөн бодит API data ачаалсны дараа үүсгэнэ.
- Шинэ `seo` backend module repository/service/controller/router давхаргатай. `/sitemap.xml` нь active creator/business болон published showcase-ийг PostgreSQL-оос гаргаж, `/robots.txt` private workspace-уудыг хориглоно.
- Sitemap/robots cache нь 5 минутын max-age, 1 цагийн stale-while-revalidate policy-тэй. Suspended channel sitemap-аас хасагдах regression test нэмэгдсэн.
- Vite SPA-ийн JS-гүй crawler limitation-ийг нуусангүй: ADR 0001 Phase 1 хэрэгжсэн, Phase 2 actual SSR acceptance болон reverse proxy routing release blocker-т бүртгэгдсэн.

## 2. Accessibility

- Feed follow, like, save action бүр state-specific accessible name болон `aria-pressed` өгдөг болсон. Profile/detail toggle action мөн pressed state-тэй.
- Focus indicator-ийг translucent биш solid pink 3px болгож contrast/visibility сайжруулсан.
- Existing shared Dialog/Drawer-ийн focus trap, focus restore, Escape close, labelled dialog semantics-ийг automated keyboard test-ээр баталгаажуулсан.
- Auth restore, anonymous redirect, missing-role 403, зөв role render regression тест нэмсэн.
- Feed image lazy loading, async decode, video metadata preload болон reduced-motion policy шалгагдсан.

## 3. Performance ба CI gate

- Vite route lazy chunks + framework/vendor/motion/icons manual chunking дээр file-level **420 KiB**, total JS/CSS **2 MiB** budget script нэмсэн.
- `frontend npm run check` одоо lint → Node/Vitest → production build → bundle budget дарааллаар fail-fast ажиллана.
- Backend `test:coverage`, `prisma:validate`, `check` script нэмэгдсэн.
- PostgreSQL service-тэй GitHub Actions release gate нь migrate deploy, backend coverage, frontend full check ажиллуулна.
- Local `/api/v1/feed?limit=12` 50 request smoke: min **7.69 ms**, p50 **11.34 ms**, p95 **23.45 ms**, max **134.01 ms**.
- High-traffic query/index mapping `docs/slow-query-index-audit.md`-д баримтжсан; бодит query plan-гүй таамгаар migration нэмээгүй.

## 4. Verification

- Backend full integration ба coverage: **171/171 pass**.
- Backend coverage: line **86.30%**, branch **72.41%**, function **78.70%**.
- Frontend Node validation **5/5**, Vitest/Testing Library **40/40**, нийт **45/45 pass**.
- Frontend ESLint, build, bundle budget pass: largest JS **232,549 B**, total asset **1,290,170 B**.
- Prisma validate/generate/migrate deploy: pass, pending migration **0**.
- Critical domain/API flows **3/3**, IDOR/webhook replay/signed URL expiry/role matrix regression ногоон; known critical security/money defect **0**.
- Chromium Playwright 3 flow, staging-like p95, actual SSR нь кодын үр дүн мэт худал хаагдаагүй; owner/date/evidence-тэй production blocker болсон.
- `prisma.config.ts`, `tsconfig.json`, Prisma schema болон migration Day 7-оор өөрчлөгдөөгүй.
