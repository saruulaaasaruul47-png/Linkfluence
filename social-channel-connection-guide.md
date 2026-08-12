# Influence Hub — Instagram/Facebook Channel Connection хэрэгжүүлэх заавар

Энэ баримт нь Creator болон Business хэрэглэгч өөрийн Instagram/Facebook channel-аа Influence Hub-д холбож, зөвшөөрөгдсөн profile, follower, post болон engagement мэдээллийг sync хийх integration-ийг хэрэгжүүлэх дараалал юм.

> Энэ нь **Meta/Facebook Login**-оос тусдаа feature. 2026-08-11-ний байдлаар application талын foundation, OAuth flow, sync, webhook, UI болон automated integration test хэрэгжсэн. Доорх “Таны хийх үлдсэн алхам” хэсэг нь Meta Dashboard болон production secret шаарддаг тул зориуд үлдээсэн.

## 0. Одоогийн implementation status

Кодоор бэлэн болсон:

- [x] Creator болон Business channel тус бүр social account эзэмших schema/relation
- [x] Instagram/Facebook authorize болон callback endpoint
- [x] OAuth state hash, 10 минутын expiry, replay/idempotency хамгаалалт
- [x] Нэгээс олон Page/account ирэхэд богино настай selection token болон UI modal
- [x] Provider token-ийг authenticated encryption-ээр хадгалах
- [x] Profile, follower, recent media болон боломжтой media metric snapshot sync
- [x] Manual sync, reconnect status, disconnect, owner isolation
- [x] 24 цагийн stale connection scheduled job (`npm run job:social-sync`)
- [x] Signed Meta webhook verification, duplicate event idempotency, affected connection-ийг stale болгох
- [x] Creator/Business Account болон Dashboard Settings дахь reusable responsive UI
- [x] Loading, empty, error, multiple-account selection төлөв
- [x] Prisma migration local database-д deploy хийсэн
- [x] Creator ба Business ownership/sync integration test

### Таны хийх үлдсэн алхам

Эдгээр нь code-оос автоматаар хийх боломжгүй Meta account/production infrastructure ажил:

- [ ] Meta for Developers дээр app үүсгэх эсвэл зөв app сонгох
- [ ] Facebook Login, Pages API, Instagram API, Webhooks use case/product идэвхжүүлэх
- [ ] Development ба production callback URI-г Meta Dashboard-д exact утгаар бүртгэх
- [ ] App ID/App Secret, production redirect URI, encryption key, webhook verify token-оо secret manager/`.env`-д оруулах
- [ ] App admin/developer/tester болон бодит Facebook Page + Instagram professional test account бэлдэх
- [ ] Meta App Review/Business Verification шаардсан permission-үүдээ submit хийх
- [ ] Privacy Policy, Terms, Data Deletion public HTTPS URL өгөх
- [ ] Production webhook callback-ийг Meta Dashboard-д subscribe хийх
- [ ] Review screen recording болон reviewer test instructions өгөх
- [ ] Live mode-д бодит Meta account-аар final end-to-end test хийх

## 1. Feature-ийн зорилго

Хэрэглэгч Influence Hub-д email/password, Google эсвэл Facebook-аар яаж нэвтэрснээс үл хамааран өөрийн Creator/Business channel settings дотроос social account-аа холбоно.

Жишээ:

```text
Creator Dashboard
  → Channel settings
  → Social connections
  → Connect Instagram
```

эсвэл:

```text
Business Dashboard
  → Channel settings
  → Social connections
  → Connect Facebook Page
```

Амжилттай холбоход:

- social account identity баталгаажна;
- username, profile image, biography зэрэг public profile data sync хийнэ;
- зөвшөөрөлтэй бол follower болон media count sync хийнэ;
- өөрийн post/media жагсаалт sync хийнэ;
- боломжтой insight/engagement metrics sync хийнэ;
- хамгийн сүүлд хэзээ шинэчилснийг харуулна;
- хэрэглэгч connection-оо refresh эсвэл disconnect хийж чадна.

## 2. Маш чухал ялгаа

### 2.1 Facebook Login

Influence Hub account-д нэвтрэх identity provider.

```text
Continue with Facebook
```

### 2.2 Social channel connection

Influence Hub-д аль хэдийн нэвтэрсэн хэрэглэгч өөрийн social channel data-д access олгоно.

```text
Connect Instagram
Connect Facebook Page
```

Login provider болон social connection-ийг нэг database record, нэг endpoint, нэг token flow болгож болохгүй.

## 3. Meta API-ийн хязгаарлалт

- Дурын Instagram/Facebook хэрэглэгчийн private analytics-ийг авч болохгүй.
- Зөвхөн тухайн social account эзэмшигч OAuth consent өгсөн мэдээллийг авна.
- Instagram-ийн professional боломжууд account type болон Meta API product-оос хамаарна.
- Personal Instagram account дээр professional insights бүрэн байхгүй байж болно.
- Facebook Page data нь personal Facebook profile data-тай адил биш.
- Permission бүр Meta App Review эсвэл Business Verification шаардаж болно.
- Meta permission болон endpoint нэр Graph API version бүрээр өөрчлөгдөх боломжтой тул implementation эхлэхдээ [Meta Instagram Platform](https://developers.facebook.com/docs/instagram-platform/) болон [Meta Graph API](https://developers.facebook.com/docs/graph-api/) дээр дахин шалгана.

## 4. Санал болгох integration strategy

Хоёр connection-ийг тусад нь хэрэгжүүлнэ:

1. **Instagram professional account connection**
2. **Facebook Page connection**

Instagram-д Meta Dashboard дээр боломжтой бүтээгдэхүүнээс хамааран:

- Instagram API with Instagram Login; эсвэл
- Instagram API with Facebook Login

ашиглана.

Шинэ Meta App үүсгэх үед боломжтой бол Instagram account-ыг шууд холбодог шинэ Instagram Login flow-г сонгох нь ойлгомжтой. Харин Facebook Page болон түүнд холбоотой Instagram professional account-ыг хамт удирдах шаардлагатай бол Facebook Login суурьтай flow хэрэгтэй байж болно.

## 5. Хэрэгжүүлэх ерөнхий checklist

- [ ] Meta App-ийн social integration use case-ийг тохируулах *(таны Meta Dashboard ажил)*
- [x] Instagram болон Facebook Page-ийн flow-г тусад нь тодорхойлж хэрэгжүүлэх
- [ ] Шаардлагатай permission бүрийн App Review тайлбарыг бичих *(таны Meta submission)*
- [ ] Development callback URI тохируулах
- [ ] Production callback URI тохируулах
- [x] Social connection database entity нэмэх
- [x] Encrypted provider token storage бэлдэх
- [x] OAuth state storage хийх
- [x] Instagram connect start/callback flow хийх
- [x] Facebook Page connect start/callback flow хийх
- [x] Олон account-аас сонгох flow хийх
- [x] Initial profile sync хийх
- [x] Post/media sync хийх
- [x] Metric snapshot sync хийх
- [x] Manual refresh хийх
- [x] Scheduled background sync хийх
- [x] Token expiration болон reauthorization хийх
- [x] Disconnect болон data deletion хийх
- [x] Signed, idempotent webhook endpoint хийх
- [ ] App Review материал бэлдэх
- [x] Automated sandbox integration test хийх
- [ ] Бодит Meta development account-аар manual test хийх

## 6. Meta Dashboard тохиргоо

### 6.1 App product/use case

[Meta for Developers](https://developers.facebook.com/apps/) дотор Influence Hub app-аа сонгоно.

Хэрэгцээнээсээ хамааран:

- Instagram API
- Facebook Login
- Facebook Pages API
- Webhooks

use case/product-уудыг идэвхжүүлнэ.

### 6.2 Redirect URI

Instagram development callback:

```text
http://localhost:3000/api/v1/social-connections/instagram/callback
```

Facebook development callback:

```text
http://localhost:3000/api/v1/social-connections/facebook/callback
```

Production жишээ:

```text
https://api.influencehub.mn/api/v1/social-connections/instagram/callback
https://api.influencehub.mn/api/v1/social-connections/facebook/callback
```

Callback URI нь Meta Dashboard дээр бүртгэсэн утгатай тэмдэгт бүрээрээ адил байна.

### 6.3 App mode

Development mode-д:

- app admin;
- developer;
- tester;
- зөвшөөрөгдсөн test account

л integration-ийг бүрэн турших боломжтой байж болно.

Public хэрэглэгч ашиглахын өмнө шаардлагатай permission-үүдээ App Review-д оруулна.

## 7. Permission төлөвлөлт

Permission-ийг “дараа хэрэг болж магадгүй” гэж бөөнөөр хүсэхгүй. Frontend дээр бодитоор ашиглах data бүрд шаардлагатай хамгийн бага permission сонгоно.

### 7.1 Instagram profile/media зориулалт

Meta app-ийн сонгосон Instagram login төрөл болон тухайн үеийн Graph API version-оос хамааран permission нэр өөр байна. Түгээмэл хэрэгцээ:

- basic Instagram professional account мэдээлэл;
- account media/post жагсаалт;
- account/media insights;
- content publish хэрэгтэй бол publish permission.

Facebook Login суурьтай Instagram integration дээр түгээмэл таарах permission-үүд:

```text
instagram_basic
instagram_manage_insights
pages_show_list
pages_read_engagement
```

Instagram Login суурьтай шинэ flow дээр permission нэр `instagram_business_*` хэлбэртэй байж болно. Яг ашиглах нэрийг implementation хийх үеийн Meta Dashboard болон албан ёсны permission reference-ээс баталгаажуулна.

### 7.2 Facebook Page зориулалт

Түгээмэл хэрэгцээ:

```text
pages_show_list
pages_read_engagement
pages_read_user_content
```

Зөвхөн Page profile болон aggregated engagement харуулах бол publish/manage permission хүсэхгүй.

### 7.3 Эхний MVP-д авахгүй permission

Influence Hub frontend дээр бодитоор ашиглахгүй бол:

- message management;
- comment moderation;
- automatic content publishing;
- ad account management;
- user private content

permission хүсэхгүй.

## 8. Environment variables

Backend environment-д дараах байдлаар тусгаарлана:

```env
SOCIAL_PROVIDER_MODE=meta
META_APP_ID=replace_with_app_id
META_APP_SECRET=replace_with_app_secret
META_GRAPH_VERSION=v23.0

META_INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/v1/social-connections/instagram/callback
META_FACEBOOK_REDIRECT_URI=http://localhost:3000/api/v1/social-connections/facebook/callback
API_PUBLIC_URL=http://localhost:3000
CLIENT_URL=http://localhost:5173
SOCIAL_TOKEN_ENCRYPTION_KEY=replace_with_base64_encoded_32_byte_secret
META_WEBHOOK_VERIFY_TOKEN=replace_with_at_least_32_random_characters
```

32-byte encryption key үүсгэх PowerShell жишээ:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Security:

- App Secret frontend-д очихгүй.
- Provider access token frontend-д хадгалахгүй.
- Provider token-ийг database-д plaintext-аар хадгалахгүй.
- Encryption key-г database-тай хамт хадгалахгүй.
- Token, code болон app secret-ийг log-д бичихгүй.

## 9. Database entity

### 9.1 SocialConnection

```text
SocialConnection
- id
- userId
- localChannelType       CREATOR | BUSINESS
- localChannelId
- provider               INSTAGRAM | FACEBOOK
- externalAccountId
- externalParentId       optional Facebook Page ID
- username
- displayName
- profileImageUrl
- accountType
- status                 ACTIVE | EXPIRED | REVOKED | ERROR | DISCONNECTED
- grantedScopes
- accessTokenEncrypted
- tokenExpiresAt
- lastSyncedAt
- lastSyncStatus
- lastSyncError
- connectedAt
- disconnectedAt
- createdAt
- updatedAt
```

Constraints:

```text
unique(provider, externalAccountId)
unique(localChannelType, localChannelId, provider, externalAccountId)
```

### 9.2 SocialProfileSnapshot

Follower болон profile metric цаг хугацааны явцад хэрхэн өөрчлөгдсөнийг хадгална.

```text
SocialProfileSnapshot
- id
- connectionId
- followersCount
- followsCount
- mediaCount
- reach
- impressions
- engagement
- capturedAt
```

Provider өгөөгүй metric-ийг `0` болгохгүй, `null` хадгална.

### 9.3 SocialMediaItem

```text
SocialMediaItem
- id
- connectionId
- externalMediaId
- mediaType
- caption
- permalink
- thumbnailUrl
- mediaUrl
- publishedAt
- rawStatus
- lastSyncedAt
- createdAt
- updatedAt
```

Constraint:

```text
unique(connectionId, externalMediaId)
```

### 9.4 SocialMediaMetricSnapshot

```text
SocialMediaMetricSnapshot
- id
- mediaItemId
- likeCount
- commentCount
- savedCount
- shareCount
- reach
- impressions
- plays
- capturedAt
```

Metric бүр provider, media type болон permission-ээс хамаарч байхгүй байж болно.

### 9.5 SocialOAuthState

OAuth callback-ийн аюулгүй байдлыг хангана.

```text
SocialOAuthState
- id
- stateHash
- userId
- localChannelType
- localChannelId
- provider
- returnUrl
- expiresAt
- consumedAt
- createdAt
```

Raw `state`-ийг database-д хадгалахгүй, hash хадгалах нь илүү аюулгүй.

## 10. Modulith module бүтэц

```text
backend/src/modules/social-sync/
├── social.routes.js
├── social.controller.js
├── social.service.js
├── social.repository.js
├── social.schema.js
├── social.mapper.js
├── meta-webhook.service.js
├── token-encryption.js
├── providers/
│   ├── meta.provider.js
│   ├── sandbox.provider.js
│   └── provider.contract.js

backend/scripts/sync-stale-social.js
frontend/src/components/social/SocialConnectionsPanel.jsx
```

Хариуцлага:

- Route: endpoint болон auth middleware.
- Controller: request/response mapping.
- Service: connection, account selection, sync business logic.
- Repository: Prisma query.
- Provider adapter: Meta API request болон response normalization.
- Sync job: scheduled synchronization.
- Webhook service: Meta webhook verification/event processing.

Controller дотор Meta API call болон Prisma query шууд бичихгүй.

## 11. Authorization rule

Social channel connection хийх user:

- authenticated байх;
- сонгосон local Creator/Business channel-ийн owner байх;
- suspended/deleted account биш байх;
- тухайн connection-ийг өөрчлөх permission-тэй байх

ёстой.

Admin бусдын provider access token-ийг харах ёсгүй. Admin зөвхөн connection status, provider, last sync болон audit metadata харж болно.

## 12. Instagram connection flow

### 12.1 Connect эхлүүлэх

```http
GET /api/v1/social-connections/instagram/authorize?channelType=CREATOR&redirectTo=/account?channel=creator
Authorization: Bearer <Influence Hub access token>
```

Backend:

1. User тухайн local channel-ийн owner эсэхийг шалгана.
2. Secure random `state` үүсгэнэ.
3. State hash, user болон channel context хадгална.
4. Meta authorization URL үүсгэнэ.
5. Authorization URL frontend-д буцаана.

Response:

```json
{
  "authorizeUrl": "https://..."
}
```

Frontend browser-ийг уг URL руу шилжүүлнэ.

### 12.2 Callback

```http
GET /api/v1/social-connections/instagram/callback?code=...&state=...
```

Backend:

1. `state` hash-ийг шалгана.
2. State expired/consumed эсэхийг шалгана.
3. State-г consumed болгоно.
4. Authorization code-г access token-оор солино.
5. Боломжтой бол long-lived token flow ашиглана.
6. Холбож болох Instagram account-уудыг авна.
7. Нэг account байвал холбоно.
8. Олон account байвал account selection flow руу шилжүүлнэ.
9. Initial sync queue хийнэ.
10. Frontend settings page руу success/error status-тай redirect хийнэ.

## 13. Facebook Page connection flow

### 13.1 Connect эхлүүлэх

```http
GET /api/v1/social-connections/facebook/authorize?channelType=BUSINESS&redirectTo=/account?channel=business
Authorization: Bearer <Influence Hub access token>
```

### 13.2 Callback дараалал

1. OAuth state validate хийнэ.
2. User access token авна.
3. User-ийн удирдах эрхтэй Facebook Page-уудыг авна.
4. Page бүрийн шаардлагатай identity/access context-ийг авна.
5. Нэг Page байвал холбож болно.
6. Олон Page байвал хэрэглэгчээр сонгуулна.
7. Сонгосон Page profile/media/metric-ийн initial sync эхлүүлнэ.

Instagram API with Facebook Login ашиглаж байгаа бол сонгосон Facebook Page-д холбоотой Instagram professional account байгаа эсэхийг шалгаж болно.

## 14. Олон social account-аас сонгох

OAuth callback дээр account-ийг дур мэдэн эхнийхээр сонгож болохгүй.

Олон account ирвэл backend богино настай selection session үүсгэнэ. Frontend:

```text
Choose an account to connect

[Instagram avatar] @creator_one
[Instagram avatar] @creator_two
```

гэж харуулна.

Selection endpoint:

```http
GET /api/v1/social-connections/selections/options?selectionToken=...
Authorization: Bearer <Influence Hub access token>

POST /api/v1/social-connections/selections/complete
Authorization: Bearer <Influence Hub access token>
Content-Type: application/json

{
  "selectionToken": "short-lived-one-time-token",
  "externalAccountId": "selected-account-id"
}
```

Selection token:

- богино хугацаатай;
- нэг удаагийн;
- authenticated user-тэй холбоотой;
- allowed account ID жагсаалттай

байна.

## 15. Connection management API

### Connection жагсаалт

```http
GET /api/v1/social-connections?channelType=CREATOR
Authorization: Bearer <Influence Hub access token>
```

### Manual sync

```http
POST /api/v1/social-connections/:connectionId/sync
```

Manual sync rate limit-тэй байна. Хэрэглэгч refresh button олон дарахад давхар job үүсгэхгүй.

### Reauthorize

UI нь тухайн provider-ийн `authorize` endpoint-ийг дахин эхлүүлнэ. Шинэ token амжилттай ирсний дараа existing connection upsert хийгдэнэ.

### Disconnect

```http
DELETE /api/v1/social-connections/:connectionId?channelType=CREATOR
```

Disconnect хийхэд:

1. Owner permission шалгана.
2. Local encrypted token болон connection record-ийг устгана.
3. Cascade relation-аар local stat/media snapshot-ийг устгана.
4. Scheduled sync тухайн connection дээр дахин ажиллахгүй.

Meta-ийн Apps and Websites хэсгээс хэрэглэгч provider authorization-аа тусад нь revoke хийж болно. Influence Hub-ийн local disconnect нь owner-isolated hard delete хийдэг.

## 16. Sync хийх data

### 16.1 Profile

Provider зөвшөөрсөн тохиолдолд:

- external account ID;
- username;
- display name;
- profile image;
- biography;
- website;
- account type;
- followers count;
- follows count;
- media count

авна.

### 16.2 Post/media

- external media ID;
- caption;
- media type;
- thumbnail;
- permalink;
- publication time;
- basic engagement counts;
- available insights

sync хийнэ.

Provider URL expiry-тэй бол media URL-г permanent гэж үзэхгүй. Refresh хийх эсвэл өөрийн зөвшөөрөгдсөн storage strategy ашиглана.

### 16.3 Metrics normalization

Instagram/Facebook metric нэрийг frontend шууд ашиглахгүй. Backend normalized DTO буцаана:

```json
{
  "followers": 12500,
  "mediaCount": 87,
  "engagementRate": 4.8,
  "reach": 42000,
  "impressions": 61000,
  "capturedAt": "2026-08-11T00:00:00.000Z"
}
```

`engagementRate`-ийн formula-г нэг газар тодорхойлно. Жишээ:

```text
(likes + comments + saves + shares) / followers × 100
```

Гэхдээ provider data дутуу бол misleading тоо гаргахгүй, metric-ийг unavailable гэж тэмдэглэнэ.

## 17. Sync strategy

### 17.1 Initial sync

Connection үүссэний дараа:

1. Profile sync
2. Recent media sync
3. Account insight sync
4. Media insight sync
5. Snapshot хадгалах

дарааллаар background job ажиллуулна.

### 17.2 Scheduled sync

Санал болгох давтамж:

- profile/follower metrics: өдөрт 1–4 удаа;
- recent posts: хэдэн цаг тутам;
- recent post insights: тогтсон хугацаанд;
- expired/old posts: бага давтамжтай.

API quota-г хамгаалахын тулд бүх connection-ийг нэг мөчид зэрэг sync хийхгүй, job-уудыг тарааж ажиллуулна.

### 17.3 Idempotency

Нэг media item дахин ирэхэд duplicate үүсгэхгүй:

```text
upsert(connectionId, externalMediaId)
```

Metric history хадгалах бол snapshot timestamp/bucket-аар давхардлыг хянана.

## 18. Token lifecycle

Connection бүр:

- token expiration;
- permission revoke;
- provider password/security change;
- app authorization removal;
- API error

зэргээс болж ажиллахаа больж болно.

Handling:

```text
ACTIVE → EXPIRED → Reconnect required
ACTIVE → REVOKED → Reconnect required
ACTIVE → ERROR → Retry/backoff
ACTIVE → DISCONNECTED
```

Frontend дээр:

```text
Instagram connection expired. Reconnect to continue syncing.
```

гэж ойлгомжтой харуулна.

401/permission error дээр token-ийг сохроор дахин дахин ашиглахгүй. Connection status-ийг шинэчилж user-д reconnect action өгнө.

## 19. Webhook

Realtime шаардлагатай бол Meta Webhooks ашиглаж болно. Эхний MVP-д scheduled sync хангалттай бол webhook-ийг дараагийн шатанд үлдээнэ.

Webhook хэрэгжүүлэх бол:

```http
GET  /api/v1/webhooks/meta
POST /api/v1/webhooks/meta
```

GET endpoint verification challenge хариуцна. POST endpoint:

- request authenticity/signature шалгана;
- event-ийг хурдан хүлээн авна;
- duplicate event-ийг idempotently хүлээн авна;
- хүнд sync logic-ийг queue руу явуулна;
- шууд удаан API call хийхгүй.

## 20. Frontend UI/UX

Channel settings дотор:

```text
Social connections

Instagram
@username
Connected · Synced 12 minutes ago
[Sync now] [Manage]

Facebook Page
Not connected
[Connect]
```

Connection card дээр:

- provider icon;
- username/display name;
- status;
- last sync;
- follower/media summary;
- sync button;
- reconnect button;
- disconnect action

байна.

Loading state:

```text
Connecting Instagram…
```

Initial sync state:

```text
Instagram connected. Importing profile and recent posts…
```

Empty state:

```text
No social channels connected yet.
Connect a channel to verify your audience and import performance data.
```

Error state:

```text
We could not refresh this connection. Reconnect Instagram to continue.
```

## 21. Marketplace-д ашиглах дүрэм

Marketplace creator card дээр зөвхөн хамгийн сүүлд амжилттай sync болсон баталгаатай metric харуулна.

Харуулах metadata:

```text
Instagram · Connected
125K followers
4.8% engagement
Updated 3 hours ago
```

Хуучирсан data:

```text
Last verified 45 days ago
```

гэж тэмдэглэнэ. Connection expired болсон ч хуучин metric-ийг “live/current” мэт харуулахгүй.

Creator өөрийн provider token эсвэл private insight-ийг business хэрэглэгчид шууд дамжуулахгүй. Marketplace зөвхөн normalized, зөвшөөрөгдсөн aggregate data харуулна.

## 22. Privacy болон data ownership

- Хэрэглэгч ямар account, ямар permission холбож байгааг consent screen-ээс өмнө тайлбарлана.
- Ямар data хадгалж, юунд ашиглахыг Privacy Policy-д бичнэ.
- Disconnect хийвэл future sync зогсоно.
- Account delete хийвэл provider token болон холбоотой private data устна.
- Data retention хугацааг тодорхойлно.
- Raw provider response-ийг шаардлагагүйгээр бүхэлд нь хадгалахгүй.
- Admin token харах, export хийх боломжгүй байна.
- Audit log-д token биш, action болон connection ID хадгална.

## 23. App Review бэлтгэл

Permission бүрд Meta reviewer-д:

- permission яг ямар feature-д хэрэгтэй;
- хэрэглэгч хаанаас Connect дардаг;
- permission-ээр авсан data хаана харагддаг;
- data-г өөр зорилгоор ашиглахгүй гэдгийг;
- test account болон алхам;
- screen recording

өгөх шаардлага гарч болно.

Review video-ийн flow:

1. Influence Hub-д login хийнэ.
2. Creator/Business channel settings нээнэ.
3. Connect Instagram/Facebook дарна.
4. Meta consent харуулна.
5. Account сонгоно.
6. Influence Hub руу буцна.
7. Synced profile/post/metric харагдана.
8. Disconnect action харуулна.

## 24. Security checklist

- [x] OAuth state random, hash хэлбэрээр хадгалагддаг
- [x] State user болон local channel-тэй холбоотой
- [x] State 10 минутын хугацаатай, нэг удаагийн
- [x] Frontend return path зөвхөн application-relative утга авдаг
- [x] App secret зөвхөн backend environment-д ашиглагддаг
- [x] Provider token encrypted at rest
- [ ] Production encryption key-г secret manager-д хадгалах *(таны deployment ажил)*
- [x] Provider token log/response-д ордоггүй
- [x] Connection ownership endpoint бүр дээр шалгагддаг
- [x] Selection token нэг удаагийн, user-bound
- [x] Manual sync API rate limit болон atomic sync lock-той
- [x] Scheduled job failure-ийг account бүрээр тусгаарлаж дараагийн run-д retry хийдэг
- [x] Scheduled sync limit/sequence ашиглан API quota-г хамгаалдаг
- [x] Webhook HMAC SHA-256 signature verify хийдэг
- [x] Webhook event hash-аар idempotent
- [x] Local disconnect flow ажилладаг
- [x] Account/channel delete cascade cleanup хийдэг
- [x] Request log OAuth `code`-ийг redacted хийдэг

## 25. Test plan

### OAuth

- [x] Instagram sandbox connection амжилттай
- [x] Facebook Page sandbox connection амжилттай
- [x] User consent cancel typed error болдог
- [x] State mismatch reject хийдэг
- [x] Expired/consumed state хамгаалалттай
- [x] Callback replay idempotent
- [x] Provider error, timeout, rate limit, reauth typed error-той
- [ ] Бодит Meta development account-аар Instagram/Facebook test хийх *(таны Meta ажил)*

### Authorization

- [x] Creator өөрийн channel-аа холбоно
- [x] Business өөрийн channel-аа холбоно
- [x] Creator/Business list нь owner ба channel type-аар тусгаарлагдана
- [x] Viewer channel-гүй үед connection нэмэх боломжгүй
- [x] Admin/API DTO provider token буцаахгүй

### Account selection

- [x] Нэг external account шууд холбоно
- [x] Олон external account selection modal нээнэ
- [x] Allowed list-д байхгүй account ID сонгоход reject
- [x] Selection token replay reject

### Sync

- [x] Initial profile sync
- [x] Recent post/media bounded fetch
- [x] Duplicate media upsert
- [x] Missing metric `null` хэвээр
- [x] Manual sync давхар ажиллахгүй
- [x] Provider 429 typed retryable error болдог
- [x] Provider 401 дээр reconnect required
- [x] Sync failure өмнөх зөв snapshot-ийг устгахгүй

### Disconnect

- [x] Owner disconnect хийж чадна
- [x] Local encrypted token/connection устна
- [x] Scheduled sync зогсоно
- [x] Connection устсанаар stale verified metric дахин ашиглагдахгүй
- [x] Account deletion cleanup ажиллана

## 26. Хэрэгжүүлэх үе шат

### Phase 1 — Foundation

- SocialConnection schema
- encrypted token storage
- OAuth state
- ownership permission
- provider adapter interface

### Phase 2 — Instagram MVP

- Connect Instagram
- account selection
- profile sync
- recent post sync
- settings UI
- disconnect

### Phase 3 — Metrics

- profile snapshot
- media metric snapshot
- engagement normalization
- marketplace verified metric
- scheduled sync

### Phase 4 — Facebook Page

- Connect Facebook Page
- page selection
- Page profile/post sync
- Facebook metric normalization

### Phase 5 — Reliability

- retry/backoff
- quota handling
- reconnect flow
- audit log
- monitoring
- optional webhook

### Phase 6 — Production approval

- App Review explanation
- reviewer test account
- screen recording
- Privacy Policy
- data deletion
- production redirect URI
- production end-to-end test

## 27. Feature дууссан гэж үзэх шалгуур

- Creator болон Business өөрийн Instagram/Facebook channel-аа тусдаа холбож чаддаг.
- Өөр хэрэглэгчийн local channel-д connection нэмэх боломжгүй.
- Social account selection хэрэглэгчийн сонголтоор хийгддэг.
- Profile, follower, post болон боломжтой engagement data database-д sync болдог.
- Marketplace зөвхөн баталгаатай, хамгийн сүүлд sync болсон normalized data харуулдаг.
- Provider token frontend болон log-д харагддаггүй, database-д encrypted байдаг.
- Token expired/revoked үед reconnect UX гардаг.
- Manual болон scheduled sync duplicate data үүсгэдэггүй.
- Disconnect болон account deletion data cleanup хийдэг.
- Meta development test болон шаардлагатай App Review амжилттай болсон байдаг.

## 28. Албан ёсны эх сурвалж

- [Meta Instagram Platform](https://developers.facebook.com/docs/instagram-platform/)
- [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/)
- [Instagram API with Facebook Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/)
- [Meta Graph API](https://developers.facebook.com/docs/graph-api/)
- [Meta Webhooks](https://developers.facebook.com/docs/graph-api/webhooks/)
- [Meta Permissions Reference](https://developers.facebook.com/docs/permissions/)
- [Meta App Review](https://developers.facebook.com/docs/app-review/)

Meta Graph API version болон permission availability хугацааны явцад өөрчлөгддөг. Implementation эхлэх өдөр Meta Dashboard дээр тухайн app-д харагдаж байгаа permission, access level болон review requirement-ийг дээрх албан ёсны баримттай тулгаж баталгаажуулна.
