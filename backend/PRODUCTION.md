# Production readiness

## Required environment

- `NODE_ENV=production`
- `PORT`
- `DATABASE_URL` — TLS болон least-privilege PostgreSQL user
- `FRONTEND_ORIGIN` — зөвшөөрөх production origin
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_PASSWORD_RESET_SECRET` —
  хоорондоо ялгаатай, дор хаяж 32 тэмдэгт
- `PAYMENT_WEBHOOK_SECRET`
- Email provider-ийн production credential

Secret-ийг repository, log, response-д хадгалахгүй.

## Release sequence

1. Database backup үүсгэж, restore test-ийн хамгийн сүүлийн үр дүнг шалгана.
2. `npm ci`, `npx prisma validate`, `npx prisma generate` ажиллуулна.
3. `npm run migrate:deploy` ажиллуулна.
4. Backend `npm test`, frontend `npm run check` pass болсон artifact deploy хийнэ.
5. Health, auth login/refresh, marketplace, conversation, analytics smoke test хийнэ.
6. 5xx rate, latency, DB connection, webhook failure, outbox backlog хянана.

## Logging and privacy

Request бүр `x-request-id` авна эсвэл UUID үүсгэнэ. JSON log нь method, path,
status, duration, user ID-г агуулна. Password, token, secret, OTP, verification
code query-оос redaction хийгдэнэ. Authorization header болон body-г log хийхгүй.

## Backup and retention

- PostgreSQL өдөр бүр encrypted backup, 30 хоногийн retention.
- Долоо хоног бүр тусдаа орчинд restore drill.
- `AdminAction` болон provider event-ийг audit бодлогын дагуу хадгална.
- Expired auth token, OTP, processed outbox event-д scheduled cleanup ажиллуулна.

## Rollback

Application artifact-ийг өмнөх immutable version руу буцаана. Destructive
schema migration хийхгүй; expand/migrate/contract дараалал хэрэглэнэ. Data
corruption илэрвэл write traffic-ийг хааж verified backup-аас restore хийнэ.

## External production gates

- In-memory rate limiter-ийг олон instance deployment-д shared store-оор солино.
- Local upload storage-ийг object storage + signed URL + malware scan руу шилжүүлнэ.
- Outbox worker, notification realtime adapter-ийг monitored process болгоно.
- Browser E2E critical two-account flow-г CI release gate болгоно.

