# Authentication Postman flow

Create a Postman environment with:

- `BASE_URL`: `http://localhost:3000/api/v1`
- `ACCESS_TOKEN`: empty
- `TEST_EMAIL`: a new email address
- `TEST_PASSWORD`: a strong password such as `Password123!`
- `OTP_CODE`: empty
- `RESET_TOKEN`: empty
- `CREATOR_ID`: empty
- `BUSINESS_ID`: empty
- `MEDIA_ID`: empty

Run the requests in this order:

1. `POST {{BASE_URL}}/auth/register` with `email`, `username`, `displayName`, and `password`.
2. Read the OTP from the delivered email. In automated tests only, the email adapter is mocked. Production responses never expose the OTP.
3. `POST {{BASE_URL}}/auth/verify-email` with `email` and the six-character string `otp`.
4. Save `data.accessToken` as `ACCESS_TOKEN`. Confirm Postman stored the HTTP-only `refreshToken` cookie.
5. `GET {{BASE_URL}}/auth/me` with `Authorization: Bearer {{ACCESS_TOKEN}}`.
6. `POST {{BASE_URL}}/auth/refresh` without a request body. Save the new `data.accessToken`.
7. Repeat `/auth/me` with the new access token.
8. `POST {{BASE_URL}}/auth/logout`.
9. Call `/auth/refresh` again and confirm it returns HTTP 401.
10. Register another user without verifying it and confirm `/auth/login` returns `EMAIL_NOT_VERIFIED`.
11. Call `/auth/resend-otp` twice within 60 seconds and confirm the second request returns HTTP 429.

Postman must keep cookies enabled. Do not copy the refresh token into an environment variable.

## Password reset

1. `POST {{BASE_URL}}/auth/forgot-password` with `{ "email": "{{TEST_EMAIL}}" }`.
2. Read the password-reset OTP from the delivered email.
3. `POST {{BASE_URL}}/auth/verify-reset-otp` with `email` and `otp`.
4. Save `data.resetToken` as `RESET_TOKEN`.
5. `POST {{BASE_URL}}/auth/reset-password` with `resetToken` and `newPassword`.
6. Confirm the old password and every previous refresh session no longer work.
7. Login with the new password.
8. With a bearer access token, call `POST /auth/logout-all` and confirm all refresh sessions are revoked.

Forgot-password always returns the same success-shaped response for existing and unknown email addresses.

## Media, portfolio, and public marketplace

1. Login as a creator-channel owner and save the bearer access token.
2. Send `POST {{BASE_URL}}/media/uploads` as `form-data`:
   - `file`: a real JPG, PNG, WEBP, GIF, or supported video file
   - `purpose`: `PORTFOLIO`
3. Save `data.id` as `MEDIA_ID`.
4. `POST {{BASE_URL}}/creator/portfolio` with:

```json
{
  "title": "Published campaign work",
  "description": "A short public description",
  "category": "Fashion",
  "mediaAssetId": "{{MEDIA_ID}}",
  "status": "PUBLISHED"
}
```

5. Save the creator profile ID as `CREATOR_ID`, then call public `GET /creators/{{CREATOR_ID}}`.
6. Confirm the response contains the published portfolio item and does not expose `userId`, email, or private rates.
7. Try updating or deleting another creator's portfolio item and confirm HTTP 404.
8. Exercise public discovery:
   - `GET /creators?q=fashion&category=Fashion&page=1&limit=12`
   - `GET /creators?platform=INSTAGRAM&minFollowers=10000&verified=true`
   - `GET /businesses?q=studio&verified=true&page=1&limit=12`
   - `GET /businesses/{{BUSINESS_ID}}`
   - `GET /categories`
9. Delete an unused owned upload with `DELETE /media/uploads/{{MEDIA_ID}}`. An asset referenced by a profile or portfolio item must return a conflict response.

## Day 3 discovery and library flow

1. Call `GET /marketplace/discover` and `GET /search?q=fashion&type=all`.
2. Save a creator with `PUT /library/saved/CREATOR/{{CREATOR_ID}}`.
3. Follow the creator with `PUT /library/following/CREATOR/{{CREATOR_ID}}`.
4. Record a view with `POST /library/recent`:

```json
{ "targetType": "CREATOR", "targetId": "{{CREATOR_ID}}" }
```

5. Create a private collection using `POST /collections`, then add the creator with `PUT /collections/:id/items/CREATOR/{{CREATOR_ID}}`.
6. As the creator, publish an owned portfolio item with `POST /showcase`.
7. Confirm it appears in `GET /showcase`; like it with `PUT /showcase/:id/reactions/like`.
8. Confirm a follower sees it in `GET /showcase/following`.

Repeat save, follow, recent, collection-item, and like requests to confirm idempotent responses.

## Day 4 campaign and proposal flow

1. Login with a business channel and create a draft using `POST /business/campaigns`.
2. Publish it with `POST /business/campaigns/:id/publish` and `{ "isPublic": true }`.
3. Login with a creator channel and submit `POST /campaigns/:id/proposals`.
4. Submit the same proposal again and confirm HTTP 409.
5. Login as the business owner and call `GET /business/proposals`.
6. Shortlist, counter, accept, or reject with `POST /business/proposals/:id/decision`.
7. Add creators to general sourcing using:
   - `PUT /business/shortlist/:creatorId`
   - `PUT /business/compare/:creatorId`
8. Confirm the fifth unique compare entry returns HTTP 409.
9. Send `POST /business/invitations` with `creatorId`, `campaignId`, and optional `message`.
10. Login as the invited creator and respond through `POST /creator/invitations/:id/respond`.

Campaign update requests may include `version`. A stale version returns `CAMPAIGN_VERSION_CONFLICT`.
