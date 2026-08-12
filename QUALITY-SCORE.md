# Шинэчилсэн quality score

Шалгасан огноо: 2026-07-31

Өмнөх тайлангийн зарим дүгнэлт одоогийн кодтой нийцэхээ больсон байсан.
Messaging, notifications, analytics, admin mutation/audit, global API rate limit,
structured logging хэрэгжсэн байхад “байхгүй” гэж үнэлсэн байсныг засав.

## Товч үнэлгээ

| Үнэлгээ | Өмнөх оноо | Одоогийн оноо | Төлөв |
|---|---:|---:|---|
| Функциональ шаардлага — FR | 59/100 | **75/100** | MVP үндсэн урсгал хэрэгжсэн |
| Функциональ бус шаардлага — NFR | 39/100 | **56/100** | Дэд бүтэц шаардсан gap үлдсэн |
| Энгийн дундаж | 49/100 | **65.5/100** | Кодын түвшинд мэдэгдэхүйц сайжирсан |

NFR-ийн үлдсэн бага оноо нь QPay, social verification provider, SSR, Redis,
Монгол i18n зэрэг repository дотроос дангаар дуусгах боломжгүй эсвэл одоогийн
сонгосон stack-тай зөрсөн шаардлагаас голчлон шалтгаалж байна.

## FR үнэлгээ

| FR | Оноо | Бодит төлөв |
|---|---:|---|
| FR-1 Registration, onboarding, profile | 80 | Universal account + creator/business channel, media-backed profile |
| FR-2 Campaign | 80 | CRUD, publish, proposal, invitation, optimistic version |
| FR-3 Search, matching, application | 90 | Filter, search, sort, pagination, shortlist, compare |
| FR-4 Deal, negotiation, contract | 88 | Versioned terms, two-party approval, private persistent messaging |
| FR-5 Content submission | 55 | Submission/revision/approval бий; publish-proof gate дутуу |
| FR-6 Escrow/payment | 50 | Idempotent verified mock provider; QPay/ledger дутуу |
| FR-7 Dispute | 72 | Open/list/evidence, IDOR, duplicate guard, payment freeze, admin resolution |
| FR-8 Notifications | 78 | Persistent notification, read/read-all, message/system outbox |
| FR-9 Review/reputation | 90 | Two-sided unique review, transactional aggregate |
| FR-10 Reporting | 68 | Creator/business range analytics, admin DB overview/list |

### FR-7 шинэ нотолгоо

- `backend/src/modules/disputes/dispute.routes.js`
- `backend/src/modules/disputes/dispute.service.js`
- `backend/src/modules/disputes/dispute.repository.js`
- `backend/src/modules/payments/payment.service.js`
- `backend/tests/integration/collaboration-day5-day6.test.js`

Participant биш хэрэглэгч dispute-г 404 авна. Нэг collaboration дээр нэг active
dispute байна. Evidence media ownership шалгана. Active dispute үед release,
refund, payout `PAYMENT_FROZEN_BY_DISPUTE` алдаагаар блоклогдоно.

### FR-8 шинэ нотолгоо

- `backend/src/modules/messaging`
- `backend/src/modules/notifications`
- `frontend/src/pages/dashboard/MessagingPages.jsx`
- `frontend/src/api/dashboard.api.js`

Өмнөх тайланд дурдсан browser-only message/notification дүгнэлт одоо буруу.
Conversation, message, read state, notification PostgreSQL-д хадгалагддаг.

### FR-10 шинэ нотолгоо

- `backend/src/modules/analytics`
- `backend/src/modules/admin`
- `frontend/src/pages/dashboard/PaymentAnalyticsPages.jsx`
- `frontend/src/pages/admin/AdminManagementPages.jsx`

`7D`, `1M`, `3M`, `1Y`, `ALL` analytics болон admin-ийн users, channels,
campaigns, contracts, payments, cases, audit paginated API хэрэгжсэн.

## NFR үнэлгээ

| NFR | Оноо | Бодит төлөв |
|---|---:|---|
| NFR-1 Escrow integrity | 72 | Transaction, idempotency, state guard, dispute freeze |
| NFR-2 Isolation/IDOR | 88 | Offer, collaboration, message, dispute, private media tests |
| NFR-3 Verified statistics | 25 | Social provider verification workflow дутуу |
| NFR-4 QPay | 25 | Provider port бий, production QPay adapter байхгүй |
| NFR-5 Audit | 82 | Collaboration activity, provider event, admin audit, dispute activity/outbox |
| NFR-6 File protection | 80 | Public media path хаалттай; policy-based content endpoint |
| NFR-7 Performance/SSR/cache | 20 | Index/pagination/lazy chunks бий; SSR/load benchmark байхгүй |
| NFR-8 Reliability | 60 | Transaction, graceful shutdown, request ID, deployment/backup plan |
| NFR-9 OWASP/security | 82 | Helmet, CORS, limits, global/auth rate limit, validation, ownership |
| NFR-10 Testing | 78 | 40 backend integration + frontend test/lint/build |
| NFR-11 Монгол UI/i18n | 5 | UI үндсэндээ англи; i18n framework байхгүй |

### NFR-6 шинэ нотолгоо

- `backend/src/app.js` — `/uploads/media` public access хаасан
- `backend/src/modules/media/media.routes.js`
- `backend/src/modules/media/media.service.js`
- `backend/src/modules/media/media.repository.js`
- `backend/tests/integration/marketplace-day2.test.js`

Media response нь `/api/v1/media/assets/:id/content` ашиглана. Avatar/cover/logo
болон published portfolio public байж болно. Collaboration/deliverable нь зөвхөн
owner эсвэл collaboration participant-д харагдана. Unauthorized болон IDOR үед
resource existence нууж 404 буцаана.

## Баталгаажуулалт

- Backend integration: **40/40 pass**
- Frontend unit test: **3/3 pass**
- Frontend ESLint: **pass**
- Frontend production build: **pass**
- Backend runtime: JavaScript, TypeScript application code нэмээгүй
- `prisma.config.ts`, `tsconfig.json` өөрчлөөгүй

## Одоо үнэхээр хамгийн бага үлдсэн хэсгүүд

1. **NFR-11 i18n — 5:** Монгол translation dictionary болон locale switch байхгүй.
2. **NFR-3 verified statistics — 25:** Social provider эсвэл admin screenshot
   verification workflow дутуу.
3. **NFR-4 QPay — 25:** Credential, sandbox contract, webhook specification
   шаардлагатай.
4. **NFR-7 performance — 20:** SSR нь Vite SPA архитектуртай зөрнө; Redis cache,
   load test, p95 budget дутуу.
5. **FR-5 publish proof — 55:** Approved draft-аас шууд completion/release рүү
   шилжихийн өмнө social publish proof болон business verification gate хэрэгтэй.

Дараагийн хамгийн өндөр үр ашигтай ажил нь publish-proof entity/API/state
machine болон frontend workflow юм. QPay болон social provider-ийг credential,
sandbox documentation-гүйгээр “хийсэн” гэж тэмдэглэх боломжгүй.
