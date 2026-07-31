# Influence Hub API

The backend is an Express modular monolith written in JavaScript. Each feature owns its routes, controller, service, repository, validation, mapper, and business rules. Controllers do not contain Prisma queries or domain logic.

## Setup

1. Copy `.env.example` to `.env` and replace database, JWT, and Resend values.
2. Use different secrets of at least 32 characters for access and refresh JWTs.
3. Start PostgreSQL and create the configured database.
4. Install packages with `npm ci`.
5. Apply migrations with `npm run migrate:deploy`.
6. Generate Prisma Client with `npm run prisma:generate`.
7. Start development mode with `npm run dev`, or production mode with `npm start`.

The API base URL is `http://localhost:3000/api/v1`. Health check: `GET /api/v1/health`.

## Admin account

Create or reset a local admin without storing its plaintext password in source control:

```powershell
$env:ADMIN_EMAIL='admin@example.com'
$env:ADMIN_PASSWORD='your-strong-password'
npm run seed:admin
```

The command activates and verifies the account, adds the `ADMIN` role, hashes the password with bcrypt, and invalidates its previous sessions. Sign in from the regular `/login` page; an admin is redirected to `/admin/dashboard`.

## Authentication

Registration creates a `PENDING_VERIFICATION` viewer and emails a six-digit OTP. Verification activates the account, returns a 15-minute access token, and sets a rotating seven-day refresh token as an HTTP-only cookie. OTPs and refresh tokens are SHA-256 hashes in PostgreSQL; passwords use bcrypt.

Endpoints:

- `POST /auth/register`
- `POST /auth/verify-email`
- `POST /auth/resend-otp`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `POST /auth/forgot-password`
- `POST /auth/verify-reset-otp`
- `POST /auth/reset-password`
- `GET /auth/me`

Password reset uses a separate short-lived reset JWT. Refresh tokens rotate in token families; reuse of an already-rotated token revokes that family. See [POSTMAN.md](./POSTMAN.md) for the manual flows.

## Account and channel profiles

All profile routes require `Authorization: Bearer <access-token>`. Creator and Business profile creation adds the matching role to the same user; deleting a channel removes that role.

User endpoints:

- `GET /users/me`
- `PATCH /users/me`
- `PATCH /users/me/avatar` with multipart field `avatar` (JPG, PNG, WEBP or GIF; maximum 5 MB)
- `PATCH /users/me/password`
- `DELETE /users/me` (soft delete)

Creator endpoints:

- `POST /creator/profile`
- `GET /creator/profile`
- `PATCH /creator/profile`
- `DELETE /creator/profile`
- `GET /creator/portfolio`
- `POST /creator/portfolio`
- `PATCH /creator/portfolio/:id`
- `DELETE /creator/portfolio/:id`

Business endpoints:

- `POST /business/profile`
- `GET /business/profile`
- `PATCH /business/profile`
- `DELETE /business/profile`

Media endpoints:

- `POST /media/uploads` with multipart fields `file` and `purpose`
- `DELETE /media/uploads/:id`

Media ownership, file size, declared MIME type, file signature, and purpose are checked before the asset is accepted. Local uploads are served from `/uploads`; replace the storage adapter with object storage in production.

## Public marketplace

Public-safe endpoints never return user IDs, email addresses, private creator rates, password data, or token data:

- `GET /creators`
- `GET /creators/:id`
- `GET /businesses`
- `GET /businesses/:id`
- `GET /categories`
- `GET /portfolio/:id`

List endpoints support validated search, filter, sort, and pagination query parameters. The frontend creator and business onboarding forms upload their media first, then submit owned media IDs to the matching profile endpoint.

## Discovery, library, collections, and showcase

Authenticated library endpoints:

- `GET /library`
- `PUT|DELETE /library/saved/:targetType/:targetId`
- `PUT|DELETE /library/following/:targetType/:targetId`
- `POST /library/recent`
- `POST /library/shares`
- `GET|POST /collections`
- `GET|PATCH|DELETE /collections/:id`
- `PUT|DELETE /collections/:id/items/:targetType/:targetId`

Public discovery endpoints:

- `GET /marketplace/discover`
- `GET /search`
- `GET /showcase`
- `GET /showcase/:id`

Creator showcase endpoints:

- `GET /showcase/following`
- `GET /showcase/mine`
- `POST /showcase`
- `PATCH|DELETE /showcase/:id`
- `PUT|DELETE /showcase/:id/reactions/like`

Targets are resolved through one polymorphic target module. Save, follow, recent, and reaction mutations are idempotent. Collections enforce owner access and private, unlisted-token, or public visibility.

## Campaigns, proposals, and sourcing

Public campaign endpoints:

- `GET /campaigns`
- `GET /campaigns/:id`
- `POST /campaigns/:campaignId/proposals`
- `GET /proposals/:id`

Business campaign and sourcing endpoints:

- `GET|POST /business/campaigns`
- `PATCH|DELETE /business/campaigns/:id`
- `POST /business/campaigns/:id/publish`
- `POST /business/campaigns/:id/pause`
- `POST /business/campaigns/:id/archive`
- `GET /business/proposals`
- `POST /business/proposals/:id/decision`
- `GET|PUT|DELETE /business/shortlist`
- `GET|PUT|DELETE /business/compare`
- `GET|POST /business/invitations`
- `POST /business/invitations/:id/cancel`

Creator workflow endpoints:

- `GET /creator/proposals`
- `PATCH /creator/proposals/:id`
- `POST /creator/proposals/:id/withdraw`
- `GET /creator/invitations`
- `POST /creator/invitations/:id/respond`

Campaign and proposal writes use state-transition policies, ownership checks, and optimistic versions. A creator may submit only one proposal per open campaign. Compare lists contain at most four creators per campaign or general sourcing context.

## Offers, collaborations, contracts, and payments

Offer endpoints:

- `GET|POST /offers`
- `GET /offers/:id`
- `POST /offers/:id/respond`
- `POST /offers/:id/decision`

Collaboration lifecycle endpoints:

- `GET /collaborations`
- `GET /collaborations/:id`
- `PATCH /collaborations/:id/terms`
- `POST /collaborations/:id/agreement/lock`
- `POST /collaborations/:id/agreement/action`
- `POST /collaborations/:id/tasks/:taskId/toggle`
- `POST /collaborations/:id/files`
- `POST /collaborations/:id/activity`
- `POST /contracts/:id/action`
- `GET /contracts/:id/document`

Production and finance endpoints:

- `POST /collaborations/:id/payments/funding-intent`
- `POST /payments/webhooks/mock`
- `GET /payments/transactions`
- `GET|POST /payments/methods`
- `DELETE /payments/methods/:id`
- `POST /payments/:id/refunds`
- `POST /payments/:id/payouts`
- `POST /collaborations/:id/deliverables`
- `POST /collaborations/:id/deliverables/:deliverableId/revision`
- `POST /collaborations/:id/deliverables/:deliverableId/review`
- `GET|POST /collaborations/:id/reviews`
- `POST /collaborations/:id/showcase`

Offer, agreement, and contract writes are versioned and audited. Workspace creation is idempotent. A collaboration becomes funded or released only after a signed provider webhook is processed; normal frontend actions cannot set those states directly. `/payments/:id/mock-confirm` is available only outside production for the local mock-provider workflow. Payment methods accept provider tokens only and reject raw card fields.

## Seed marketplace data

Create deterministic local creator and business records without committing a password:

```powershell
$env:MARKETPLACE_SEED_PASSWORD='your-strong-password'
npm run seed:marketplace
```

The script is idempotent and creates four creators with published showcase work plus three businesses with public open campaigns.

## Tests

Set `TEST_DATABASE_URL` to a separate migrated PostgreSQL database when available, then run:

```bash
npm test
```

The integration suite covers auth, reset OTP, refresh-token reuse, logout-all, account/channel profiles, media validation, portfolio ownership/lifecycle, discovery/library persistence, collection access, showcase reactions, campaign versioning, proposal transitions, sourcing, offer/contract transitions, payment webhook idempotency, deliverable completion, directional reviews, and public DTOs. Tests mock email and payment-provider delivery and clean up their uniquely prefixed data. If `TEST_DATABASE_URL` is omitted, they use `DATABASE_URL`, so use that fallback only for local development.

`prisma.config.ts` and `tsconfig.json` are existing tooling configuration and are intentionally unchanged. The application start, test, and seed runtime uses JavaScript and Node directly.
