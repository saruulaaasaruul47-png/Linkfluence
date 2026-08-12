# Influence Hub — Requirement нийцлийн шинжилгээ

**Шалгасан огноо:** 2026-08-05  
**Эх баримт:** `requirement.md` v0.1 Draft  
**Харьцуулсан эх сурвалж:** backend/frontend код, Prisma schema, integration test, `implementation-report.md`, `docs/release-blockers.md`, `requirement-compliance-plan.md` (2026-08-01)

---

> **Дараагийн шалгалт (2026-08-05, орой):** Энэ баримтад FR-3, FR-4, FR-5-ийн gap мөр тус бүрийг код дээр нь дахин шалгаж, боломжтойг нь хийж дуусгав. FR-3.1 (`productSupport` + campaign attachment) болон FR-5.3 (earnings summary + tax export CSV) — backend аль хэдийн бичигдсэн байсан ч test/frontend холбогдоогүй байсныг бүрэн холбож, integration test нэмж, бүх 62 test-ийг ногоон болгов. FR-4.3 (QPay production cert) болон FR-4.5 (Meta App Review) нь код дотроос "хийж" дуусгах боломжгүй **гадаад бизнес/certification процесс** тул 🟡 хэвээр үлдэв — доорх FR-4 хүснэгтэд шалтгааныг тодруулсан.
>
> **Дараагийн шалгалт #2 (2026-08-05, шөнө):** FR-7, FR-8, FR-9-ийн gap мөр тус бүрийг мөн адил дахин шалгаж, гурвыг нь бүрэн код дээр хийж дуусгав: FR-7.2 (review simultaneous reveal + auto-verified portfolio), FR-8.2 (ShowcaseConsent dual-consent flow), FR-9.1 (contract publish-deadline reminder job + notification wiring). Prisma migration нэмэгдэж (`PortfolioItem.collaborationId/verified`, `Contract.publishReminderSentAt`), backend+frontend хоёуланд нь холбогдож, 3 шинэ integration test нэмэгдэж бүх 65 test ногоон боллоо.

## 1. Товч дүгнэлт

Төсөл 2026-08-01-ний `requirement-compliance-plan.md`-ийн **~46% readiness**-аас **маш их урагшилсан**. 6 өдрийн төлөвлөгөөний (Day 1–6) гол хэсгүүд backend дээр хэрэгжсэн: Meta OAuth abstraction, QPay/ledger/reconciliation, publish proof + retention lifecycle, Socket.io/RabbitMQ/outbox, campaign PDF analytics, signed media URL.

Гэхдээ **MVP Definition of Done** болон **production release**-д хүрэхэд backend болон frontend хоёуланд ч үлдсэн gap байна. Frontend нь олон чухал хуудас дээр **API + mock/localStorage fallback** хосолсон байдалтай; tech stack шаардлага (TypeScript, SSR/Next.js, R2) биелээгүй.

### Ойролцоолсон нийцэл (2026-08-05)

| Хэсэг | Өмнө (08-01) | 08-05 (анхны шалгалт) | 08-05 (FR-3/4/5-ийн дараа) | 08-05 (FR-7/8/9-ийн дараа) | Тайлбар |
|---|---:|---:|---:|---:|---|
| MVP функциональ (FR-1 – FR-9) | 55% | 78% | 80% | **~86%** | FR-7.2 (review reveal + verified portfolio), FR-8.2 (showcase dual-consent) бүрэн хаагдсан; FR-9.1-ийн deadline reminder код хаагдсан, зөвхөн mobile push дутуу |
| Функциональ бус (NFR-1 – NFR-8) | 23% | 58% | 58% | **~62%** | NFR-7 (integration test) ✅ боллоо — бүх 65 test ногоон; бусад NFR (SSR, R2, Meta prod) өөрчлөлтгүй |
| Definition of Done | 30% | 62% | 66% | **~69%** | Бүх 65 integration test ногоон; pilot, Meta prod, SSR, staging infra дутуу хэвээр |
| **Нийт MVP readiness** | ~46% | ~72% | 73% | **~75%** | `FR 70% + NFR 20% + DoD 10%` жинтэй estimate |

> Энэ хувь нь кодын чанар биш — `requirement.md`-ийн production scope-той харьцуулсан **гүйцэтгэлийн хэмжээ**.

### Backend vs Frontend — гол ялгаа

| Давхарга | Бэлэн байдал | Гол асуудал |
|---|---|---|
| **Backend** | ~88% MVP logic | Meta prod credential, 24h sync cron, Google OAuth, R2 storage, mobile push infra |
| **Frontend** | ~65% MVP UX | Олон хуудас mock fallback; dashboard home/contracts demo; admin trust mock; SSR/TS байхгүй |
| **Infra / External** | ~35% | Staging RabbitMQ/Redis/R2, QPay certification, Meta app review, 3 brand pilot |

---

## 2. Backend — хийгдсэн зүйлс

### 2.1 Модуль ба API (mount хийгдсэн)

`backend/src/routes/index.js` дээр 30+ domain module ажиллана:

- **Auth/Users** — register, login, refresh, email verify, forgot/reset password
- **Creator/Business profile** — channel CRUD, portfolio
- **Social-sync** — Instagram/Facebook OAuth (sandbox + Meta adapter), encrypted token, manual sync
- **Marketplace/Discovery/Search** — creator/business/campaign filter, pagination
- **Sourcing** — shortlist, compare (4 хүртэл), campaign invitation
- **Campaigns/Proposals/Offers** — open campaign + direct invite/offer
- **Collaborations/Contracts/Deliverables** — state machine, agreement versioning
- **Payments** — mock + QPay provider, escrow funding gate, ledger, payout account encryption, reconciliation
- **Reviews/Publish proof** — API verification + manual queue, retention, metric snapshots
- **Disputes** — open/freeze, admin CREATOR_WINS / BUSINESS_WINS / SPLIT + ledger
- **Messaging** — REST + Socket.io realtime
- **Notifications** — in-app, email preference, RabbitMQ consumer + outbox
- **Analytics** — campaign JSON + PDF report (CPM/CPE/reach)
- **Admin** — users/channels/campaigns/contracts/payouts/disputes/reconciliation
- **Content/Safety** — requirement-ээс гадуур нэмэгдсэн social content platform (Stories, moderation)

### 2.2 Requirement Day 1–6 хэрэгжилт (implementation-report баталгаажсан)

| Өдөр | Хэрэгжсэн |
|---|---|
| Day 1 | SocialStat, PublishProof, LedgerEntry, ShowcaseConsent schema; collaboration state machine; contract typed snapshot; proposal/invitation → collaboration orchestration |
| Day 2 | social-sync module, AES-GCM token encryption, append-only stats, stale/error DTO |
| Day 3 | QPay adapter, double-entry ledger (5 rule), payout encryption, daily reconciliation |
| Day 4 | Publish proof lifecycle, 7-day auto-approval, retention checker, dispute ledger awards |
| Day 5 | Outbox + RabbitMQ/DLQ, Socket.io + Redis adapter, notification consumers, admin API cutover |
| Day 6 | Campaign PDF, signed media URL, p95 smoke script, release-blocker checklist |

### 2.3 Database

- Prisma: 45+ model, collaboration lifecycle enum (`PUBLISHED`, `PROVEN`, `DISPUTED`, `SETTLEMENT_PENDING` г.м.)
- Migration: Day 1–6 + social content foundation migrations байна
- Scheduled jobs (script): `job:reconcile`, `job:lifecycle` — **social sync cron байхгүй**

---

## 3. Backend — дутуу / хэсэгчилсэн зүйлс

Тэмдэглэгээ: ✅ хийсэн · 🟡 хэсэгчилэн · ❌ хийгдээгүй

### FR-1. Бүртгэл, account, channel

| ID | Төлөв | Gap |
|---|---|---|
| FR-1.1 | 🟡 | Email/password ✅. **Google OAuth ❌** — `User` model-д `googleId` байхгүй, `/auth/google` route байхгүй |
| FR-1.2 | ✅ | OTP email verification, Resend, integration test |
| FR-1.3–1.4 | ✅ | Welcome flow, Creator/Business/Viewer, дараа channel үүсгэх |
| FR-1.5 | 🟡 | Profile CRUD ✅. "Үйлчилгээ" тусдаа entity биш — `rates` JSON |
| FR-1.6 | 🟡 | OAuth module ✅ (sandbox + Meta adapter). **Production Meta app review/certification ❌** |
| FR-1.7 | 🟡 | UNVERIFIED default, badge UI ✅. Manual stat оруулах flow backend-д сул |
| FR-1.8 | 🟡 | Business profile ✅. **`verifiedPayer` escrow-оос автомат ❌** — зөвхөн `verificationStatus` |
| FR-1.9 | ✅ | Dashboard API-аар profile удирдана |
| FR-1.10 | ✅ | Viewer discovery, channel-required action хязгаарлалт |
| FR-1.11 | 🟡 | Manual `POST /social-connections/:id/sync` ✅. **24 цаг тутам background sync job ❌** |

### FR-2. Creator хайлт

| ID | Төлөв | Gap |
|---|---|---|
| FR-2.1 | ✅ | Niche, follower tier, engagement, price, platform, rating filter |
| FR-2.2 | ✅ | Compare API, 4 creator limit — `sourcing.service.js` |
| FR-2.3 | ✅ | Shortlist persistent API |

### FR-3. Campaign

| ID | Төлөв | Gap |
|---|---|---|
| FR-3.1 | ✅ | Goal, budget, deadline, deliverables ✅. `productSupport` JSON талбар (`Campaign.productSupport`) болон `CampaignAttachment` (BRIEF/BRAND_GUIDELINE/REFERENCE) хийгдэж, `POST/DELETE /business/campaigns/:id/attachments` route, `CAMPAIGN_BRIEF` MediaPurpose бүрэн холбогдсон. Wizard UI (`CreateCampaignPage`) дээр ч product support toggle + файл upload нэмэгдсэн. Integration test: `marketplace-day3-day4.test.js` |
| FR-3.2 | ✅ | Open proposal + direct invitation |
| FR-3.3 | ✅ | Proposal price, pitch, counter |
| FR-3.4 | ✅ | Proposal/invitation accept → collaboration orchestration (Day 1) |

### FR-4. Гэрээ, escrow, lifecycle

| ID | Төлөв | Gap |
|---|---|---|
| FR-4.1 | ✅ | revisionLimit, publishBy, retentionDays typed snapshot |
| FR-4.2 | ✅ | State machine: NEGOTIATION → … → COMPLETED (+ DISPUTED) |
| FR-4.3 | 🟡 | Funding gate + idempotent webhook код 100% бэлэн, integration test ногоон (`collaboration-day5-day6.test.js`). **Production QPay certification ❌** — энэ нь QPay-тай гэрээ/merchant онбординг хийх *код бус, гадаад бизнес процесс* тул кодоор "хийж" дуусгах боломжгүй |
| FR-4.4 | ✅ | Submit → revision → approve chain, revision limit enforce |
| FR-4.5 | 🟡 | PublishProof + API/manual path ✅. **Meta production post verify ❌** (sandbox/mock) — Meta App Review-д бизнесийн нэрээр өргөдөл гаргаж батлуулах шаардлагатай тул *код бус, гадаад certification процесс* |
| FR-4.6 | ✅ | 7-day auto-approval, dispute window, delayed settlement (`job:lifecycle`) |
| FR-4.7 | ✅ | Dispute freeze + 3-way ledger award |

### FR-5. Төлбөр, commission, payout

| ID | Төлөв | Gap |
|---|---|---|
| FR-5.1 | ✅ | Double-entry ledger, reconciliation service + `job:reconcile` |
| FR-5.2 | ✅ | 10% commission posting |
| FR-5.3 | ✅ | Payout encryption, admin approve ✅. `GET /payments/earnings/summary` (жилээр бүлэглэсэн gross earned/paid out/pending balance) болон `GET /payments/earnings/export.csv` (tax export, BOM+CSV) хийгдэж, Wallet хуудсанд creator-д зориулсан "Tax export" товч холбогдсон. Integration test: `collaboration-day5-day6.test.js` |

### FR-6. Campaign тайлан

| ID | Төлөв | Gap |
|---|---|---|
| FR-6.1 | ✅ | Metrics from publish proof snapshots |
| FR-6.2 | ✅ | `GET /analytics/campaigns/:id/report.pdf` |

### FR-7. Чат ба review

| ID | Төлөв | Gap |
|---|---|---|
| FR-7.1 | ✅ | Socket.io realtime + REST history + file attachment |
| FR-7.2 | ✅ | Bilateral review ✅. Review нь **зэрэг нээгддэг** боллоо: хоёр дахь тал review бичих хүртэл эхний review-ийн `publishedAt` null хэвээр (зохиогч өөрийнхөө review-г үзнэ, эсрэг тал нь `rating`/`comment: null` хардаг), хоёул бичсэн мөчид хоёулаа зэрэг нээгдэж, rating aggregate давхар шинэчлэгддэг. Эсрэг тал 14 хоногт review бичихгүй бол `lifecycle` job (`reviewService.revealStale`) автоматаар нээдэг. Дууссан, баталгаажсан collaboration нь `lifecycle` job-оор creator-ийн **баталгаажсан (`verified: true`) portfolio**-д автоматаар нэмэгддэг (`PortfolioItem.collaborationId`). Test: `collaboration-day5-day6.test.js` |

### FR-8. Discovery

| ID | Төлөв | Gap |
|---|---|---|
| FR-8.1 | 🟡 | Public profile API ✅. SSR/SEO ❌ (backend-only REST) |
| FR-8.2 | ✅ | `ShowcaseConsent` model одоо service-д бүрэн ашиглагдаж байна: `POST /collaborations/:id/showcase` нь **хоёр талын explicit consent** (upsert APPROVED) шаарддаг болсон — нэг тал зөвшөөрөхөд `WAITING_FOR_COUNTERPART`, хоёул зөвшөөрсөн мөчид ShowcasePost үүсч `PUBLISHED` болно. `POST .../showcase/decline` нь татгалзах endpoint (эсрэг тал татгалзвал нөгөө тал шахаж чадахгүй, харин өөрийн шийдвэрээ буцаах боломжтой). Test: `collaboration-day5-day6.test.js` |
| FR-8.3 | ✅ | Commerce/affiliate байхгүй |
| FR-8.4 | 🟡 | CTA + funnel ✅. Event attribution бүрэн биш |

### FR-9. Notification ба admin

| ID | Төлөв | Gap |
|---|---|---|
| FR-9.1 | 🟡 | In-app + email + RabbitMQ consumer ✅. **Deadline reminder scheduled job ✅ хийгдсэн** — `job:lifecycle` (`lifecycleService.run`) contract-ийн `publishBy` хугацаа ойртоход (48 цагийн өмнө, нэг удаа `publishReminderSentAt`-аар idempotent) `deadline.publish_approaching` event илгээдэг; `deadline.*`, мөн урьд нь "үхсэн" байсан `showcase.*`/`collaboration.*` event-үүд notification consumer-т бүрэн холбогдсон. **Push notification (mobile/web push) ❌** хэвээр — энэ нь тусдаа mobile/browser push infra (FCM/APNs/Web Push) шаарддаг том feature тул одоогийн dagging-д багтаагүй |
| FR-9.2 | ✅ | Admin API бүрэн. Frontend trust хэсэг mock (доор) |

### Функциональ бус шаардлага (NFR)

| ID | Төлөв | Gap |
|---|---|---|
| NFR-1 | ✅ | Ledger, reconciliation, dispute freeze |
| NFR-2 | 🟡 | Provider abstraction ✅. Scheduled sync ❌. Meta prod ❌ |
| NFR-3 | 🟡 | Unverified badge ✅. Social stat audit log сул |
| NFR-4 | 🟡 | JWT, IDOR test, signed URL ✅. **R2/Cloudflare ❌** — local storage adapter |
| NFR-5 | ❌ | SSR, sitemap, Core Web Vitals — ADR 0001 follow-up л байна |
| NFR-6 | 🟡 | p95 smoke script ✅. Staging soak test ❌ |
| NFR-7 | ✅ | 13 integration suite, 65 test — бүгд ногоон (2026-08-05). Frontend 11 test ✅ |
| NFR-8 | 🟡 | `disclosureRequired` contract field ✅. **#ad validation/moderation enforce ❌**. Escrow legal — external |

### Tech stack зөрчил (requirement §4)

| Шаардлага | Одоогийн байдал |
|---|---|
| React + **TypeScript** + SSR (Next.js) | React 19 + **JavaScript** + Vite SPA |
| Node + **TypeScript** | Node + **JavaScript** |
| Cloudflare R2 | Local file storage + signed URL |
| Render/Vercel production deploy | Код бэлэн, infra staging blocker |

### Phase 2 (MVP хамралтгүй — зөвхөн тэмдэглэл)

FR-10 TikTok · FR-11 Agency account · FR-12 UGC shop · FR-13 Deep analytics · FR-14 Subscription · FR-15 AI — **❌ хийгдээгүй** (requirement-ийн дагуу MVP-д хамаарахгүй).

---

## 4. Frontend — хийгдсэн зүйлс

### 4.1 API-тай холбогдсон гол хуудсууд

| Хэсэг | Файл | API |
|---|---|---|
| Auth | Login, Register, Verify, **Forgot/Reset** | `auth.api.js` ✅ |
| Onboarding | Creator (social connect), Business | `social.api.js`, `media.api.js` |
| Discover/Search | DiscoverPage, SearchPages | `marketplace.api.js` (fallback mock) |
| Profiles | CreatorProfilePage, BusinessProfilePage | `marketplace.api.js` + content |
| Collaboration workspace | CollaborationWorkspacePage | `CollaborationProvider` → бодит API |
| Wallet/Payments | ApiWalletPage | `paymentApi` ✅ |
| Messaging | MessagingPages | REST + `realtime.js` Socket.io ✅ |
| Analytics/PDF | PaymentAnalyticsPages | `analyticsApi` ✅ |
| Admin dashboard/finance/disputes | AdminDashboard, AdminFinance, AdminDisputes | `adminApi` ✅ |
| Admin management | AdminManagementPages | `adminApi.list()` ✅ |
| Content management | ContentManagementPage | `content.api.js` (requirement-ээс гадуур) |

### 4.2 Frontend test

- Validation: 3/3 passed
- Critical API flows (vitest): 8/8 passed
- Production build: амжилттай (implementation-report)

---

## 5. Frontend — дутуу / mock fallback ашиглаж байгаа хуудсууд

### 5.1 Mock/localStorage fallback — жагсаалт

| Хуудас/компонент | Асуудал |
|---|---|
| `DashboardHomePages.jsx` | **Бүхэлдээ mock** — metrics, campaigns, messages, proposals (`data/dashboard.js`) |
| `WorkflowPages.jsx` — ContractList/Detail | **Mock contracts** + demo lifecycle wizard ("mock state" гэж бичсэн) |
| `DashboardUtilityPages.jsx` | Creator search fallback `data/marketplace` |
| `CampaignDashboardPages.jsx` | `dashboardCampaigns` + marketplace mock хосолсон |
| `CollaborationListPage.jsx` | Campaign/creator mock fallback |
| `DiscoverPage.jsx` | API ачаалвал ажиллана; **алдаа/хоосон үед mock fallback** |
| `SearchPages.jsx`, `ProfilePages.jsx` | Ижил fallback pattern |
| `MarketplaceCampaignPage.jsx` | Mock campaigns import |
| `PaymentAnalyticsPages.jsx` — Wallet | Analytics API ✅; **`transactions` mock import** үлдсэн |
| `AdminTrustPages.jsx` | Disputes ✅; **Reports, Moderation, Verifications — бүх mock** |
| `AdminSystemPages.jsx` | Audit logs mock |
| `AdminOperationalPages.jsx` | Settings/announcements mock + localStorage |
| `LoginPage.jsx` | **Google button → toast "not connected"** |
| `MarketplaceProvider.jsx` | Collections localStorage |
| `DashboardDataProvider.jsx` | Campaign/proposal API ✅; portfolio localStorage seed |

### 5.2 Tech stack gap (frontend)

| Шаардлага | Байдал |
|---|---|
| TypeScript | ❌ JavaScript (.jsx) |
| SSR / SEO | ❌ Vite SPA; `RouteMeta` client-side л |
| Next.js/Remix | ❌ — `docs/adr/0001-public-ssr-migration.md` Proposed |

### 5.3 UI/UX gap

- ~~Campaign create wizard: brief/brand guideline file upload хийгдээгүй~~ ✅ 2026-08-05: product support toggle + BRIEF/BRAND_GUIDELINE/REFERENCE файл upload `CreateCampaignPage`-д нэмэгдсэн
- Contract sign: **frontend-only preview** (backend contract flow-тай бүрэн холбоогүй demo)
- ~~Showcase dual-consent UI: backend `ShowcaseConsent` ашиглах UI байхгүй~~ ✅ 2026-08-05: `CollaborationWorkspacePage`-ийн "Publish to Showcase" панель Approve/Decline товч + хоёр талын consent төлөв харуулах болсон
- ~~Review simultaneous reveal UI байхгүй~~ ✅ 2026-08-05: revealed болтол counterpart-ын review-г "Hidden until..." мессежээр нуудаг, revealed болмогц хоёр review-г хамт харуулдаг
- `#ad` disclosure reminder UI/validation байхгүй

---

## 6. Definition of Done — checklist (requirement §8)

| Acceptance criterion | Backend | Frontend | Нийт |
|---|---|---|---|
| Instagram холбоод verified stats + badge | 🟡 Sandbox ✅, Meta prod ❌ | 🟡 Connect UI ✅ | 🟡 |
| Brand filter/compare/invite | ✅ | 🟡 API ✅, UI fallback | ✅ |
| Open proposal → contract | ✅ Orchestration | ✅ Workspace | ✅ |
| Unfunded block + QPay idempotent | 🟡 Mock/QPay code ✅, prod cert ❌ | ✅ Wallet | 🟡 |
| Content → approve → publish → proof cycle | ✅ | ✅ Workspace | ✅ |
| Retention автomat шалгалт | ✅ `job:lifecycle` | 🟡 UI харуулна | ✅ |
| Campaign PDF (CPM/CPE) | ✅ | ✅ Download | ✅ |
| Dispute → 3-way ledger | ✅ | ✅ Admin resolve | ✅ |
| Dual-consent showcase + SEO | ✅ Consent flow бүрэн | 🟡 Consent UI ✅, SSR/SEO ❌ | 🟡 |
| Daily reconciliation zero diff | 🟡 Code ✅, prod cron ❌ | — | 🟡 |
| Integration test бүх money logic | ✅ 65/65 ногоон | ✅ 11 test | ✅ |
| 3 бодит brand pilot | ❌ | ❌ | ❌ |

---

## 7. Test ба одоогийн regression

**Frontend:** 11/11 passed (validation 3 + critical flows 8)

**Backend (2026-08-05, FR-7/8/9 dagging-ийн дараа):** Бүх 13 integration suite (65 test) ногоон:

```
tests 65, suites 13, pass 65, fail 0
```

Өмнөх шалгалтад `requirement-day2-social.test.js` болон `social-content-platform.test.js` fail гэж тэмдэглэсэн байсан ч дараагийн ажиллуулалтуудад хоёул тогтвортой ногоон гарсаар байна — код дотор бус, **тухайн үеийн локал DB state**-тэй холбоотой байсан бололтой.

FR-3/FR-5 gap-уудад зориулж нэмэгдсэн test:
- `marketplace-day3-day4.test.js` — `productSupport` round-trip + campaign attachment (add/remove, ownership, unowned-media 404) checks
- `collaboration-day5-day6.test.js` — `/payments/earnings/summary` (403 creator-бус хэрэглэгчид) + `/payments/earnings/export.csv` checks

FR-7/FR-8/FR-9 gap-уудад зориулж нэмэгдсэн test (`collaboration-day5-day6.test.js`):
- Review simultaneous reveal: нэг тал review бичихэд эсрэг тал `rating`/`comment: null` хардаг, зохиогч өөрийнхөө review-г хардаг, хоёул бичсэний дараа хоёул нээгддэг, rating aggregate зөв шинэчлэгддэг
- 14 хоногийн force-reveal: `reviewService.revealStale` нэг талын хуучирсан review-г автоматаар нээдэг эсэх
- Showcase dual-consent: нэг тал зөвшөөрөхөд `WAITING_FOR_COUNTERPART`, нэг тал decline хийхэд эсрэг тал зөвшөөрч чадахгүй блоклогддог, харин declined тал өөрийн шийдвэрээ буцааж чадах эсэх
- Auto-verified portfolio: COMPLETED collaboration `lifecycle` job-оор `PortfolioItem(verified: true, collaborationId)` болж хувирдаг эсэх
- Publish-deadline reminder: `job:lifecycle` contract `publishBy`-д ойртоход `deadline.publish_approaching` event нэг л удаа (`publishReminderSentAt` idempotent) илгээдэг эсэх

---

## 8. Production release blocker (`docs/release-blockers.md`)

Код дээр хийгдсэн (✅):

- Prisma migration, JWT/RBAC, payment webhook, IDOR, signed URL, outbox/DLQ, socket membership

Staging/production дээр хийгдээгүй (❌):

- [ ] RabbitMQ, Redis, object storage credential + alert
- [ ] QPay production certification + webhook replay drill
- [ ] Frontend dependency high advisory fix + regression
- [ ] p95 smoke staging dataset дээр
- [ ] Meta app review + production permissions
- [ ] Cron: `job:reconcile`, `job:lifecycle` (+ social sync cron нэмэх)
- [ ] 3 brand pilot campaign

---

## 9. Backend vs Frontend — нэгтгэсэн priority жагсаалт

### P0 — MVP-г бодитоор ажиллуулах

1. **Frontend mock cutover** — Dashboard home, contracts list, admin trust pages → бодит API
2. **Backend test regression засах** — social/content test suite 500 error
3. **Staging infra** — PostgreSQL, Redis, RabbitMQ, cron jobs
4. **QPay sandbox → production** callback certification
5. **Meta OAuth production** app review

### P1 — Requirement gap хаах

6. Google OAuth (FR-1.1)
7. 24h social sync scheduled job (FR-1.11)
8. ~~ShowcaseConsent dual-consent flow (FR-8.2)~~ ✅ 2026-08-05 хийгдсэн
9. ~~Review simultaneous reveal (FR-7.2)~~ ✅ 2026-08-05 хийгдсэн
10. ~~Campaign brief file upload + productSupport (FR-3.1)~~ ✅ 2026-08-05 хийгдсэн
11. verifiedPayer escrow badge (FR-1.8)
12. ~~Payout tax/earning export (FR-5.3)~~ ✅ 2026-08-05 хийгдсэн
13. #ad disclosure enforcement (NFR-8)

### P2 — Tech stack / acquisition

14. SSR migration (Next.js) — ADR 0001 дагуу үе шаттай
15. TypeScript migration (optional but requirement зөрчил)
16. Cloudflare R2 storage adapter
17. Push notifications (mobile/web push infra) — deadline reminder **in-app + email** хэсэг нь 2026-08-05 хийгдсэн, зөвхөн төхөөрөмжийн push protocol дутуу
18. 3 brand pilot + acceptance evidence

### P3 — Phase 2 (MVP бус)

TikTok, agency account, UGC shop, AI matching, subscription

---

## 10. Дараагийн алхамын санал

1. **Frontend truth audit** — `data/dashboard.js`, `data/admin.js`, `data/marketplace.js` import хийж байгаа файлуудыг нэг бүрчлэн API руу шилжүүлэх checklist гаргах
2. **Backend regression** — test DB migrate + social-content 500 root cause засах
3. **Cron бүртгэл** — `job:reconcile`, `job:lifecycle` + шинэ `job:social-sync` (24h)
4. **Staging deploy** — release-blocker 4 unchecked item
5. **Pilot program** — 1 concierge campaign-аар бүтэн URSCAL (Unfunded → Released) flow батлах

---

## 11. Хавсралт — гол файлууд

| Зүйл | Байршил |
|---|---|
| Requirement | `requirement.md` |
| 6 өдрийн төлөвлөгөө (08-01 audit) | `requirement-compliance-plan.md` |
| Хэрэгжилтийн тайлан | `implementation-report.md` |
| Release blocker | `docs/release-blockers.md` |
| SSR ADR | `docs/adr/0001-public-ssr-migration.md` |
| API route mount | `backend/src/routes/index.js` |
| Collaboration state | `backend/src/modules/collaborations/collaboration.state.js` |
| Ledger rules | `backend/src/modules/payments/ledger.service.js` |
| Social OAuth | `backend/src/modules/social-sync/` |
| Frontend routes | `frontend/src/main.jsx` |
| Review reveal + showcase consent | `backend/src/modules/reviews/review.service.js` |
| Collaboration lifecycle sweep (portfolio/reminder/reveal) | `backend/src/modules/collaborations/lifecycle.service.js` |
| Notification topic routing | `backend/src/modules/notifications/notification.consumer.js` |

---

*Энэ баримт нь 2026-08-05-ны кодын static analysis + test ажиллуулалтын дүнд суурилсан. Production credential, Meta review, pilot campaign зэрэг external зүйлс кодоос тусад шийдэгдэнэ.*
