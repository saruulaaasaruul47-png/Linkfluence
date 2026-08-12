# Slow query ба index audit

Огноо: **2026-08-07**

## High-traffic query mapping

| Query | Filter/order | Одоогийн index | Үр дүн |
|---|---|---|---|
| Public content feed | status, visibility, publishedAt, id | `ContentPost(status, visibility, publishedAt, id)` | Covered |
| Story expiry | postType, status, expiresAt | `ContentPost(postType, status, expiresAt)` | Covered |
| Category feed | category, status, publishedAt | `ContentPost(category, status, publishedAt)` | Covered |
| Creator/business channel posts | owner id, status, createdAt | owner-specific composite indexes | Covered |
| Showcase feed | status, publishedAt | `ShowcasePost(status, publishedAt)` | Covered |
| Showcase category | category, status | `ShowcasePost(category, status)` | Covered |
| Campaign discovery | status, category, publishedAt | `Campaign(status, category, publishedAt)` | Covered |
| Creator category | categories array | GIN `CreatorProfile(categories)` | Covered |
| Marketplace rating/price | ratingAverage / startingRate | single-column sort/filter indexes | Covered |
| Conversation messages | conversationId, createdAt | `Message(conversationId, createdAt)` | Covered |
| Notifications | userId, readAt, createdAt | composite notification index | Covered |
| Payment lifecycle | collaborationId, type, status | composite payment index | Covered |
| Outbox worker | processedAt, deadLetteredAt, nextAttemptAt | composite outbox index | Covered |

## Observation

Public creator/business ranking нь filtered candidate ID-г авч application layer-д aggregate social score эрэмбэлээд дараа нь detail query хийдэг. Cursor 10k verifier өмнөх өдөр pass боловч production data ихсэхэд энэ хэсэг хамгийн түрүүнд `EXPLAIN (ANALYZE, BUFFERS)` хийх candidate. Одоогоор таамгаар migration нэмээгүй; ашиглагдахгүй index бичилтийн зардал үүсгэхээс хамгаалсан.

## Monitoring rule

- API request **750 ms**-ээс удаан бол structured log `slow=true`.
- Staging gate p95 **400 ms**.
- Slow log дээр query shape давтагдвал `pg_stat_statements` → EXPLAIN → index proposal → staging comparison дарааллаар шийднэ.
- Index нэмэхээс өмнө/дараа p95, rows scanned, buffer hit болон write overhead-ийг нэг тайланд хадгална.
