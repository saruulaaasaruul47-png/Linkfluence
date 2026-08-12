# Payment, Wallet, Revenue, Earnings implementation тайлан

## 1. Хэрэгжүүлсэн хүрээ

Payment урсгалыг шууд Collaboration руу provider-оор мөнгө хийх хуучин загвараас дараах ledger-based загварт шилжүүлэв.

```text
Stripe / configured provider
  → Business Wallet
  → Collaboration funding эсвэл Barter service fee
  → Creator Pending + Platform Pending
  → Collaboration completion
  → Creator Available + Platform Earned
  → Creator Payout
```

PAID, BARTER, HYBRID нөхөн төлбөрийн төрөл, Business Wallet, Creator Earnings, Platform Revenue, Refund, Payout, Admin Finance болон давхар бичилттэй immutable ledger нэг урсгал болсон.

## 2. Архитектур

Одоогийн modular monolith бүтцийг хадгалсан. Шинэ financial logic нь `payments` module-д байрлана.

- Route: `payment.routes.js`
- Controller: `payment.controller.js`
- Service/business rules: `wallet.service.js`, `finance.rules.js`, `payment.service.js`
- Repository: `wallet.repository.js`, `payment.repository.js`
- Validation: `payment.schema.js`, `offer.schema.js`
- DTO/mapper: `payment.mapper.js`, collaboration/contract/offer mapper-ууд
- Ledger: `ledger.service.js`
- Provider adapter: Stripe, QPay, Mock provider port
- Admin read model: `admin.repository.js`, `admin.service.js`

Controller дотор Prisma query болон financial business logic оруулаагүй. Financial write бүр repository/service transaction-аар хийгдэнэ.

## 3. Prisma model ба relation

### Өөрчилсөн model

- `User`: `walletTopUps` relation
- `WorkOffer`: `paymentType`, `barterDetails`
- `Collaboration`: `paymentType`, `cashAmount`, `barterEstimatedValue`, `barterDetails`, `platformRevenue`
- `Payment`: compensation breakdown, commission, creator amount, platform fee, idempotency, funded/released/refunded timestamps
- `PaymentProviderEvent`: `walletTopUpId`
- `LedgerAccountType`: Business Wallet, Creator Pending/Available, Platform Pending account төрлүүд
- `LedgerEntryType`: top-up, funding, pending, release, revenue, refund, payout entry төрлүүд
- `PaymentType` болон `PaymentStatus`: wallet болон barter lifecycle status/type

### Нэмсэн model

- `WalletTopUp`
  - Provider checkout intent болон verified webhook-ийн төлөв хадгална.
  - `idempotencyKey`, `providerRef` unique.
- `PlatformRevenue`
  - `PAID_COMMISSION`, `HYBRID_COMMISSION`, `BARTER_SERVICE_FEE` эх үүсвэртэй.
  - `PENDING → EARNED` болон refund төлөв хадгална.

### Migration

- `20260808190000_wallet_barter_hybrid_finance`
- `20260808191000_wallet_funding_serializable_guard`

Migration-ууд local PostgreSQL database-д амжилттай орсон. Prisma нийт 30 migration-тай бөгөөд database schema up to date.

`prisma.config.ts` болон `tsconfig.json` өөрчлөөгүй.

## 4. API endpoint

### Business Wallet

- `GET /api/v1/payments/wallet?currency=MNT`
  - Available balance, funded/spent totals, top-up history, ledger transactions.
- `POST /api/v1/payments/wallet/top-ups`
  - Provider checkout үүсгэнэ.
  - Request: `amount`, `currency`, `idempotencyKey`.
  - Wallet balance зөвхөн verified webhook ирсний дараа нэмэгдэнэ.

### Collaboration payment

- `GET /api/v1/collaborations/:id/payments/summary`
  - Payment type, cash, barter, creator net, commission/service fee, wallet balance, missing amount.
- `POST /api/v1/collaborations/:id/payments/fund`
  - Зөвхөн тухайн Collaboration-ийн Business owner ажиллуулна.
  - Request: `paymentMethod: WALLET`, `idempotencyKey`.
  - Active contract болон `PAYMENT_PENDING` state шаардлагатай.

### Existing endpoint-уудтай холболт

- `POST /api/v1/payments/:id/refunds`
- `POST /api/v1/payments/:id/payouts`
- `GET /api/v1/payments/earnings/summary`
- `GET /api/v1/payments/earnings/export.csv`
- `POST /api/v1/payments/webhooks/stripe`
- `POST /api/v1/payments/webhooks/mock`
- Admin finance resources: `payments`, `ledger`, `revenue`, `barterFees`, `refunds`, `payouts`

## 5. PAID flow

Жишээ нь cash amount `1,000,000 MNT`, commission `10%` бол:

- Business Wallet-аас `1,000,000` хасна.
- Creator Pending-д `900,000` үүсгэнэ.
- Platform Pending Commission-д `100,000` үүсгэнэ.
- Collaboration дуусахаас өмнө creator payout хийх боломжгүй.
- Completion үед Creator Pending → Creator Available.
- Platform Pending → Platform Earned Revenue.

## 6. BARTER flow

- Creator monetary earning үргэлж `0`.
- Product/service-ийн estimated value нь зөвхөн reference data.
- Estimated value-аас percentage commission огт тооцохгүй.
- Business Wallet-аас зөвхөн configured fixed fee, default `30,000 MNT`, авна.
- Fee эхлээд Platform Pending, completion үед Platform Earned болно.
- Product/service description, estimated value, delivery method/date offer болон collaboration-д хадгалагдана.

## 7. HYBRID flow

- Product/service болон cash хоёул structured terms-д хадгалагдана.
- Wallet-аас зөвхөн cash amount fund хийнэ.
- Commission зөвхөн cash amount-аас тооцогдоно.
- Product estimated value commission calculation-д орохгүй.
- Creator Pending/Available нь cash minus commission дүн байна.

## 8. Ledger ба concurrency

- Entry бүр debit болон credit account-тай, нийт debit = нийт credit.
- Ledger entry update хийхийг database trigger хориглоно; correction нь compensating entry байна.
- Posting batch болон entry бүр idempotency key-тэй.
- Provider event ID давтагдвал balance дахин нэмэгдэхгүй.
- Ижил event ID өөр payload-тай ирвэл replay mismatch алдаа өгнө.
- Collaboration funding `Serializable` transaction ашиглана.
- Wallet account row `FOR UPDATE` lock авна.
- Concurrent funding үед нэг payment л үүснэ эсвэл тогтвортой retry/duplicate response өгнө.
- Wallet available balance сөрөг болохыг funding guard хориглоно.

## 9. Refund

- Зөвхөн release хийгдээгүй internal Business Wallet payment refund eligible.
- Full болон partial refund дэмжинэ.
- Refund policy нь admin platform setting-ээс уншина.
- Work эхэлсэн эсэхийг deliverable болон task state-аас тогтооно.
- Creator Pending болон Platform Pending дүнг proportional байдлаар Business Wallet руу compensating ledger entries-ээр буцаана.
- Full refund үед payment `REFUNDED`, collaboration `CANCELLED` болно.
- Partial refund үед payment `PARTIALLY_REFUNDED` болно.
- Partial refund-ийн дараа үлдсэн Creator Pending болон Platform Pending дүн payment дээр шинэчлэгдэж, үлдэгдэл нь цааш deliverable/settlement/payout урсгалаа зөв үргэлжлүүлнэ.
- Released creator earning-ийг refund хийж balance эвдэхгүй.
- Wallet-funded dispute нь аль хэдийн тэглэгдсэн escrow-оос дахин хасахгүй; Creator Pending/Platform Pending-ээс award release хийж, үлдэгдлийг Business Wallet руу буцаана.

## 10. Creator payout

- Payout зөвхөн `Creator Available` balance-аас үүснэ.
- Creator payout account өөрийнх байх ownership check-тэй.
- Admin approve/reject decision audit reason шаарддаг.
- Provider success webhook ирсний дараа payout `PAID` болж `PAYOUT` ledger entry үүснэ.
- Давхар provider webhook нэг удаа л боловсруулагдана.
- Payout processing үед dispute/payment freeze policy мөрдөнө.

## 11. Platform revenue ба Admin Finance

Admin хувь хүний balance-тай болоогүй. Platform money нь тусдаа ledger/revenue account-д байна.

Finance overview нь бодит database aggregation-аар:

- Total GMV — PAID/HYBRID cash funding
- Platform Revenue
- Pending Revenue
- Earned Commission
- Barter Fee Revenue
- Creator Earnings
- Refunds
- Pending Payouts

Commissions хүснэгтэд collaboration, business, creator, cash amount, rate, commission, status, date байна. Barter Fees хүснэгтэд barter item, estimated value, fixed platform fee, status харагдана.

## 12. Frontend integration

- Offer dialog дээр `PAID / BARTER / HYBRID` сонголт болон conditional validation нэмсэн.
- Business Wallet page бодит wallet/top-up API ашиглана.
- Configured provider Stripe бол secure Checkout URL руу шилжинэ.
- Client талаас `autoConfirm` явуулах боломжийг бүрэн хаасан. Test орчноос бусад үед wallet top-up зөвхөн Stripe provider тохируулагдсан үед эхэлнэ.
- Mock provider wallet balance-д мөнгө credit хийхгүй; Stripe-ийн баталгаажсан paid webhook ирэхээс өмнө top-up `PENDING` хэвээр байна.
- Collaboration Workspace нь бодит payment summary харуулж Wallet-аас fund хийнэ.
- Balance хүрэхгүй үед required/current/missing amount харуулж Add funds action өгнө.
- Creator Wallet/Earnings нь Pending, Available, Total earned болон payout eligibility харуулна.
- Admin Finance нь ledger, commission, barter fee, refund, payout болон revenue API-уудтай холбогдсон.
- Mock wallet/payment rows нэмээгүй.

## 13. Security

- Financial route бүр authenticate middleware-тэй; provider webhook нь signature verification ашиглана.
- Business profile болон collaboration ownership check хийнэ.
- Participant биш хэрэглэгчид Collaboration IDOR мэдээлэл задруулахгүй 404 өгнө.
- Admin finance route нь admin authorization шаарддаг.
- Zod request validation, global error envelope, rate limiting, provider capability guard ашигласан.
- Raw card data backend-д хадгалахгүй; provider token/reference л хадгална.
- Stripe secret болон webhook secret environment variable-аас уншина.
- Stripe `checkout.session.completed` нь зөвхөн `payment_status=paid` үед wallet credit болно; unpaid session болон terminal state-ийн зөрүүтэй event хориглогдоно.
- Нэг top-up-д өөр event ID-тай success webhook давхар ирсэн ч ledger/balance нэг удаа л credit болно.
- Sensitive provider response/log data-г client response-д өгөхгүй.

## 14. Test ба баталгаажуулалт

- Backend бүх integration/unit suite: `203/203` pass.
- PAID/BARTER/HYBRID requirement matrix: `29/29` pass, үүнд шаардсан 24 numbered case, wallet dispute-ийн 3 нэмэлт invariant болон client-controlled auto-confirm хамгаалалт орсон.
- Updated collaboration/payment integration: `26/26` pass.
- Admin operations + finance rules targeted suite: `40/40` pass.
- Frontend node tests: `5/5` pass.
- Frontend Vitest: `43/43` pass.
- Frontend ESLint: pass.
- Frontend production build: pass.
- Bundle budget: pass; largest chunk `232,549 bytes`, limit `430,080 bytes`.
- Prisma schema validation: pass.
- Prisma migration status: database up to date.

## 15. Гол өөрчилсөн file-ууд

Backend:

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20260808190000_wallet_barter_hybrid_finance/migration.sql`
- `backend/prisma/migrations/20260808191000_wallet_funding_serializable_guard/migration.sql`
- `backend/src/modules/payments/finance.rules.js`
- `backend/src/modules/payments/wallet.repository.js`
- `backend/src/modules/payments/wallet.service.js`
- `backend/src/modules/payments/ledger.service.js`
- `backend/src/modules/payments/payment.*.js`
- `backend/src/modules/offers/offer.*.js`
- `backend/src/modules/collaborations/collaboration.*.js`
- `backend/src/modules/collaborations/lifecycle.service.js`
- `backend/src/modules/disputes/dispute.service.js`
- `backend/src/modules/deliverables/deliverable.service.js`
- `backend/src/modules/admin/admin.repository.js`
- `backend/src/modules/admin/admin.service.js`
- `backend/src/modules/admin/admin.routes.js`
- `backend/tests/integration/collaboration-day5-day6.test.js`
- `backend/tests/unit/wallet-barter-hybrid-finance.test.js`

Frontend:

- `frontend/src/api/collaboration.api.js`
- `frontend/src/context/CollaborationProvider.jsx`
- `frontend/src/components/collaboration/WorkOfferDialog.jsx`
- `frontend/src/pages/collaboration/CollaborationWorkspacePage.jsx`
- `frontend/src/pages/dashboard/ApiWalletPage.jsx`
- `frontend/src/pages/admin/AdminFinancePages.jsx`
- `frontend/src/main.jsx`

## 16. Production тохиргоо

Stripe ашиглах үед backend environment-д дараах утгууд шаардлагатай:

- `PAYMENT_PROVIDER=stripe`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CLIENT_URL`

Stripe webhook endpoint: `/api/v1/payments/webhooks/stripe`.

Client request дахь `autoConfirm` талбарыг validation зөвшөөрөхгүй. Test-ээс бусад бүх орчинд Stripe тохируулаагүй бол top-up `WALLET_TOP_UP_STRIPE_REQUIRED` алдаагаар fail-closed хийнэ. Balance зөвхөн Stripe signature нь зөв, event нь paid, amount/currency/provider reference нь `WalletTopUp` record-той таарсан webhook-оор нэг удаа нэмэгдэнэ.
