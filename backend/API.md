# API endpoint inventory

Бүх endpoint-ийн үндсэн prefix нь `/api/v1`. Protected endpoint бүр
`Authorization: Bearer <accessToken>` header шаарддаг.

## Day 7 communication

| Method | Endpoint | Access | Тайлбар |
|---|---|---|---|
| GET | `/conversations?q=&page=&limit=` | Participant | Өөрийн conversation-уудыг pagination-тай авна |
| POST | `/conversations` | Collaboration participant | Conversation үүсгэх буюу байгааг буцаана |
| GET | `/conversations/:id/messages?cursor=&limit=` | Participant | Cursor pagination-тай message history |
| POST | `/conversations/:id/messages` | Participant | Text эсвэл өөрийн media attachment илгээнэ |
| PATCH | `/conversations/:id/messages/:messageId` | Sender | Өөрийн message-ийг засна |
| DELETE | `/conversations/:id/messages/:messageId` | Sender | Soft delete хийнэ |
| POST | `/conversations/:id/read` | Participant | Read marker болон message status шинэчилнэ |
| GET | `/notifications?unread=&page=&limit=` | Authenticated | Notification жагсаалт |
| POST | `/notifications/:id/read` | Owner | Нэг notification уншсан болгоно |
| POST | `/notifications/read-all` | Authenticated | Бүгдийг уншсан болгоно |

## Day 7 analytics

| Method | Endpoint | Access | Тайлбар |
|---|---|---|---|
| GET | `/analytics/summary?role=&range=` | Channel owner | `7D`, `1M`, `3M`, `1Y`, `ALL` aggregate |
| POST | `/analytics/events` | Authenticated | UI analytics event хадгална |

## Day 7 admin

Admin endpoint бүр `ADMIN` role шаарддаг. List endpoint нь `q`, `status`,
`page`, `limit` query дэмжинэ.

| Method | Endpoint | Тайлбар |
|---|---|---|
| GET | `/admin/overview` | Platform aggregate |
| GET | `/admin/users` | User management list |
| GET | `/admin/channels` | Creator/business channel list |
| GET | `/admin/campaigns` | Campaign list |
| GET | `/admin/contracts` | Contract list |
| GET | `/admin/payments` | Payment list |
| GET | `/admin/cases` | Trust case list |
| GET | `/admin/audit` | Admin action history |
| PATCH | `/admin/users/:id/status` | Reason-тэй status mutation ба audit |
| POST | `/admin/cases/:id/resolve` | Resolve, dismiss, escalate ба audit |
| POST | `/admin/announcements` | Audience notification, audit, outbox |

## Disputes and protected media

| Method | Endpoint | Access | Тайлбар |
|---|---|---|---|
| GET | `/collaborations/:id/disputes` | Participant | Collaboration-ийн dispute history |
| POST | `/collaborations/:id/disputes` | Participant | Active dispute нээж payment action freeze хийнэ |
| POST | `/disputes/:id/evidence` | Participant | Owner-verified evidence нэмнэ |
| GET | `/media/assets/:id/content` | Policy based | Public profile media эсвэл owner/participant private media |

Active dispute байгаа үед release, refund, payout хийхийг
`PAYMENT_FROZEN_BY_DISPUTE` business rule хориглоно. `/uploads/media` замаар
шууд public file serving хийхгүй.

## Common response

Амжилттай response нь `success`, `message`, `data` агуулна. Алдаатай response
нь `requestId` агуулна. Тухайн ID-г server-ийн structured JSON log-той тулгаж
оношилно.
