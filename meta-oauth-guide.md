# Influence Hub — Meta OAuth хэрэгжүүлэх заавар

Энэ баримт нь Influence Hub төслийн одоогийн React frontend, Express backend, PostgreSQL/Prisma, JWT authentication бүтэцтэй Meta/Facebook Login-ийг хэрхэн холбохыг дарааллаар нь тайлбарлана.

> Энэ файл үүсгэхдээ application code-д өөрчлөлт оруулаагүй.

## 1. Эхлээд зорилгоо ялгах

Meta integration хоёр өөр зориулалттай байж болно:

1. **Facebook Login** — хэрэглэгч Facebook account-аараа Influence Hub-д бүртгүүлэх, нэвтрэх.
2. **Instagram/Facebook channel connection** — creator эсвэл business өөрийн social channel, follower, post болон engagement мэдээллээ холбох.

Эхний хэрэгжүүлэлтээр зөвхөн **Facebook Login** хийнэ. Instagram channel connection-ийг дараагийн тусдаа feature болгоно.

## 2. Хэрэгжүүлэх ерөнхий дараалал

- [ ] Meta Developer account бэлдэх
- [ ] Influence Hub Meta App үүсгэх
- [ ] Facebook Login use case нэмэх
- [ ] Development болон production redirect URI тохируулах
- [ ] Environment variables бэлдэх
- [ ] `OAuthAccount` database entity нэмэх
- [ ] Backend OAuth start endpoint хийх
- [ ] Backend callback endpoint хийх
- [ ] Meta profile-ийг Influence Hub user-тэй аюулгүй холбох
- [ ] Influence Hub JWT болон refresh cookie үүсгэх
- [ ] Frontend callback page хийх
- [ ] Login button-ийг backend OAuth endpoint-той холбох
- [ ] Error, cancel, duplicate account flow хийх
- [ ] Automated болон manual test хийх
- [ ] Privacy Policy, data deletion болон production тохиргоо хийх

## 3. Meta App үүсгэх

1. [Meta for Developers](https://developers.facebook.com/apps/) рүү орно.
2. Өөрийн Facebook account-аар нэвтэрнэ.
3. **Create App** сонгоно.
4. Хүмүүс Facebook account-аараа login хийхтэй холбоотой use case сонгоно.
5. Дараах мэдээллийг оруулна:

   - App name: `Influence Hub`
   - Contact email: өөрийн ашигладаг email
   - Business portfolio: production-д шаардлагатай бол холбоно

6. App үүссэний дараа Facebook Login use case-ийг идэвхжүүлнэ.

Meta Dashboard-ийн цэсний нэр app type болон Meta-ийн шинэчлэлтээс шалтгаалан бага зэрэг өөр байж болно.

## 4. Meta Dashboard-ийн үндсэн тохиргоо

### 4.1 App settings

**App Settings → Basic** хэсэгт:

- App display name
- App contact email
- App domain
- Privacy Policy URL
- Terms of Service URL
- User Data Deletion URL эсвэл callback
- App icon

зэрэг мэдээллийг бөглөнө.

Development үед app domain-д protocol болон path оруулахгүй:

```text
localhost
```

Production жишээ:

```text
influencehub.mn
```

### 4.2 Website platform

Development site URL:

```text
http://localhost:5173
```

Production site URL:

```text
https://influencehub.mn
```

### 4.3 OAuth redirect URI

Facebook Login settings дотор **Client OAuth Login** болон **Web OAuth Login**-ийг идэвхжүүлнэ.

**Valid OAuth Redirect URIs** хэсэгт backend callback URL-аа бүрэн, яг ижил оруулна.

Development:

```text
http://localhost:3000/api/v1/auth/facebook/callback
```

Production:

```text
https://api.influencehub.mn/api/v1/auth/facebook/callback
```

Redirect URI дээр дараах зүйлс яг таарах ёстой:

- `http` эсвэл `https`
- domain
- port
- path
- trailing slash байгаа эсэх

## 5. Permission сонгох

Facebook Login-ийн эхний хувилбарт зөвхөн:

```text
public_profile
email
```

ашиглана.

Эдгээрээс илүү permission login үед хүсэхгүй. Instagram statistics, Facebook Pages зэрэг нэмэлт integration-ийг тусдаа authorization flow болгоно.

> Facebook profile бүр email буцаах баталгаа байхгүй. Backend `email` үргэлж ирнэ гэж тооцож болохгүй.

## 6. Environment variables

Backend environment-д дараах тохиргоог нэмэхээр төлөвлөнө:

```env
META_APP_ID=replace_with_meta_app_id
META_APP_SECRET=replace_with_meta_app_secret
META_GRAPH_VERSION=replace_with_current_graph_version
META_REDIRECT_URI=http://localhost:3000/api/v1/auth/facebook/callback
META_OAUTH_SUCCESS_URL=http://localhost:5173/auth/facebook/callback
META_OAUTH_ERROR_URL=http://localhost:5173/login
```

Production-д:

```env
META_REDIRECT_URI=https://api.influencehub.mn/api/v1/auth/facebook/callback
META_OAUTH_SUCCESS_URL=https://influencehub.mn/auth/facebook/callback
META_OAUTH_ERROR_URL=https://influencehub.mn/login
```

Security дүрэм:

- `META_APP_SECRET` frontend-д очих ёсгүй.
- `.env` файлыг Git-д commit хийхгүй.
- App secret болон provider token-ийг log-д бичихгүй.
- `VITE_` prefix-тэй frontend variable дотор app secret хийхгүй.

## 7. Database бүтэц

Facebook provider ID-г `User` дээр шууд хадгалахын оронд тусдаа `OAuthAccount` entity ашиглана.

Санал болгох бүтэц:

```text
OAuthAccount
- id
- userId
- provider
- providerAccountId
- createdAt
- updatedAt
```

Relation:

```text
User 1 ──── N OAuthAccount
```

Шаардлагатай constraint:

```text
unique(provider, providerAccountId)
```

`provider` утга:

```text
FACEBOOK
```

Ингэснээр нэг Influence Hub user цаашдаа Google, Facebook, Apple зэрэг олон provider холбож чадна.

Зөвхөн login хийхэд Facebook access token-ийг database-д удаан хадгалах шаардлагагүй. Social API ашиглах шаардлага үүсвэл token-ийг encrypted хэлбэрээр тусдаа integration credential entity-д хадгална.

## 8. Шаардлагатай API endpoint

### 8.1 OAuth эхлүүлэх

```http
GET /api/v1/auth/facebook
```

Үүрэг:

1. Cryptographically secure random `state` үүсгэнэ.
2. `state`-ийг богино хугацаатай HttpOnly cookie эсвэл server-side storage-д хадгална.
3. Meta authorization URL үүсгэнэ.
4. Browser-ийг Meta login page руу redirect хийнэ.

Authorization request-д:

```text
client_id
redirect_uri
state
scope=public_profile,email
response_type=code
```

орно.

### 8.2 OAuth callback

```http
GET /api/v1/auth/facebook/callback
```

Callback query:

```text
code
state
error
error_description
```

Үүрэг:

1. User login-оо cancel хийсэн эсэхийг шалгана.
2. Callback `state` хадгалсан `state`-тэй яг тохирч байгаа эсэхийг шалгана.
3. `state`-ийг нэг удаа хэрэглээд устгана.
4. Authorization `code`-ийг Meta access token-оор backend талаас солино.
5. Meta `/me` endpoint-оос `id`, `name`, `email`, `picture` авна.
6. `OAuthAccount` болон Influence Hub user-ийг олно эсвэл үүсгэнэ.
7. Influence Hub access token болон refresh session үүсгэнэ.
8. Refresh token-ийг HttpOnly cookie болгоно.
9. Frontend callback URL руу redirect хийнэ.

### 8.3 Callback амжилттай болсны дараа

Backend frontend рүү JWT-г query string-ээр дамжуулахгүй.

Зөв flow:

1. Backend refresh cookie тавина.
2. Backend дараах URL руу redirect хийнэ:

   ```text
   http://localhost:5173/auth/facebook/callback
   ```

3. Frontend callback page `/api/v1/auth/refresh` эсвэл `/api/v1/auth/me` дуудна.
4. Одоогийн `AuthProvider` user/session state-ээ шинэчилнэ.
5. User-ийн channel-аас шалтгаалан зөв home route руу шилжинэ.

## 9. User matching business rule

Meta profile ирсний дараа дараах дарааллаар шийднэ.

### Case 1: Provider account өмнө нь бүртгэгдсэн

```text
provider = FACEBOOK
providerAccountId = Meta user ID
```

таарсан `OAuthAccount` олдвол холбоотой Influence Hub user-ээр login хийнэ.

### Case 2: Provider account байхгүй, email бас шинэ

Шинэ user үүсгэнэ:

- үндсэн role: `VIEWER`
- OAuthAccount: `FACEBOOK`
- creator/business channel автоматаар үүсгэхгүй
- channel үүсгэлтийг onboarding flow-оор үргэлжлүүлнэ

### Case 3: Provider account байхгүй, email existing user-тэй давхцсан

Зөвхөн email таарснаар Facebook account-ийг existing user-тэй автоматаар холбохгүй.

Аюулгүй сонголт:

1. User-д “Энэ email-тэй account бүртгэлтэй байна” гэж мэдэгдэнэ.
2. Existing login method-оор нэвтрүүлнэ.
3. Нэвтэрсний дараа account settings дотроос Facebook account-ийг link хийлгэнэ.

Энэ нь account takeover эрсдэлийг бууруулна.

### Case 4: Meta email буцаагаагүй

Provider ID дээр тулгуурлан шинэ social account flow эхлүүлж, Influence Hub-д ашиглах email-ийг хэрэглэгчээс тусад нь асууж баталгаажуулна.

## 10. Backend module бүтэц

Одоогийн modulith architecture-тай нийцүүлэх санал:

```text
backend/src/modules/auth/
├── auth.routes.js
├── auth.controller.js
├── auth.service.js
├── auth.repository.js
├── auth.schema.js
├── auth.mapper.js
└── providers/
    └── facebook.provider.js
```

Хариуцлага:

- `route` — endpoint болон middleware холбоно.
- `controller` — HTTP request/response удирдана.
- `service` — OAuth болон account linking business logic хэрэгжүүлнэ.
- `repository` — Prisma query ажиллуулна.
- `schema` — query/request validation хийнэ.
- `facebook.provider` — Meta authorization URL, token exchange, profile request хариуцна.

Controller дотор Prisma query болон account matching business logic бичихгүй.

## 11. Frontend хэрэгжүүлэх дараалал

### 11.1 Login button

Login page дээр:

```text
Continue with Facebook
```

button нэмнэ.

Button нь frontend API-гаар JSON хүсэлт хийхийн оронд browser navigation ашиглан:

```text
http://localhost:3000/api/v1/auth/facebook
```

руу шилжинэ.

### 11.2 Callback page

Frontend route:

```text
/auth/facebook/callback
```

Page-ийн flow:

1. Loading state харуулна.
2. Existing refresh endpoint-ийг дуудна.
3. User state шинэчлэгдсэн бол зөв route руу шилжинэ.
4. Алдаа гарвал login page руу ойлгомжтой message-тэй буцна.

Loading text жишээ:

```text
Facebook account-ийг холбож байна…
```

Error жишээ:

```text
Facebook нэвтрэлт амжилтгүй боллоо. Дахин оролдоно уу.
```

## 12. Security checklist

- [ ] Random, таах боломжгүй `state` ашигласан
- [ ] `state` богино хугацаатай
- [ ] `state` нэг удаагийн хэрэглээтэй
- [ ] Callback дээр state mismatch-ийг reject хийдэг
- [ ] OAuth code replay-ийг reject хийдэг
- [ ] App secret зөвхөн backend-д байдаг
- [ ] Provider token log-д ордоггүй
- [ ] JWT URL query string-д ордоггүй
- [ ] Production redirect HTTPS ашигладаг
- [ ] Refresh token HttpOnly cookie-д байдаг
- [ ] Cookie production дээр `Secure` байдаг
- [ ] Callback rate limit-тэй
- [ ] Existing email-г автоматаар link хийдэггүй
- [ ] Sensitive provider response frontend рүү бүтнээрээ буцаадаггүй
- [ ] Account delete үед OAuthAccount холбоос устдаг

## 13. Development mode-д тестлэх

Meta App development mode-д байх үед ихэвчлэн зөвхөн app role-той хүмүүс login хийж чадна.

Meta Dashboard → App Roles хэсэгт:

- Administrator
- Developer
- Tester

account нэмнэ.

Дараах test case-уудыг шалгана:

- [ ] Шинэ Facebook user амжилттай бүртгүүлнэ
- [ ] Бүртгэгдсэн Facebook user дахин login хийнэ
- [ ] User login dialog дээр Cancel дарна
- [ ] Meta email буцаахгүй үед зөв flow гарна
- [ ] Existing email давхцсан үед account автоматаар link болохгүй
- [ ] Буруу `state` reject болно
- [ ] Callback code-г хоёр дахин ашиглахад reject болно
- [ ] Expired code зөв error буцаана
- [ ] Facebook permission revoke хийсний дараа login flow эвдрэхгүй
- [ ] Logout хийсний дараа refresh session ашиглагдахгүй
- [ ] User account delete хийхэд OAuthAccount устсан байна
- [ ] Creator/business role Meta login-оор автоматаар үүсэхгүй

## 14. Түгээмэл алдаа

### URL Blocked эсвэл Can't Load URL

Шалтгаан:

- Callback URL Meta Dashboard дээр бүртгэгдээгүй
- Port өөр
- `http`/`https` өөр
- Trailing slash зөрсөн
- App domain буруу

### App Not Setup эсвэл Login unavailable

Шалтгаан:

- App development mode-д байгаа
- Login хийж буй user app role/tester биш
- Facebook Login use case бүрэн тохируулагдаагүй

### Email `null` ирэх

Энэ нь боломжтой хэвийн нөхцөл. User email permission өгөөгүй эсвэл Facebook account дээр ашиглах боломжтой email байхгүй байж болно.

### Redirect loop

Шалгах зүйлс:

- Refresh cookie browser-д тавигдсан эсэх
- Frontend request `withCredentials` ашиглаж байгаа эсэх
- Backend CORS frontend origin-ийг зөвшөөрсөн эсэх
- Local болон production cookie тохиргоо ялгаатай эсэх
- Callback page auth guard-д буруу баригдаж байгаа эсэх

## 15. Production-д гаргахын өмнөх checklist

- [ ] Production frontend/backend HTTPS-тэй
- [ ] Production callback URI Meta Dashboard-д бүртгэгдсэн
- [ ] Privacy Policy нийтэд нээлттэй URL-тай
- [ ] Terms of Service нийтэд нээлттэй URL-тай
- [ ] User data deletion page/callback ажилладаг
- [ ] App icon, contact email болон domain бүрэн
- [ ] App secret production secret manager-д хадгалагдсан
- [ ] Development credentials production-д ашиглагдаагүй
- [ ] Required permissions л хүсэж байгаа
- [ ] Meta App Review шаардлагатай permission-үүд батлагдсан
- [ ] Business Verification шаардлагатай эсэхийг шалгасан
- [ ] OAuth error monitoring болон audit log ажилладаг
- [ ] Login, account linking, logout, account deletion test ногоон

## 16. Instagram channel connection-ийг дараа хийх

Creator-ийн Instagram follower, post, engagement мэдээллийг татах бол Facebook Login-оос тусдаа **Connect Instagram** flow хийнэ.

Хийх үед хэрэгцээнээс хамаарч дараах permission-үүд шаардагдаж болно:

```text
instagram_basic
pages_show_list
pages_read_engagement
```

Энэ integration-д:

- professional Instagram account
- Facebook Page холбоос
- token expiry/refresh
- permission revoke
- encrypted token storage
- Meta App Review

зэрэг нэмэлт logic шаардлагатай. Тиймээс login болон social channel connection-ийг нэг endpoint, нэг permission flow болгож хольж болохгүй.

## 17. Санал болгох хэрэгжүүлэлтийн дараалал

Хамгийн бага эрсдэлтэй дараалал:

1. Meta App болон redirect URI тохируулах.
2. `OAuthAccount` schema болон migration бэлдэх.
3. Facebook provider adapter хийх.
4. OAuth start endpoint хийх.
5. Callback, state validation болон token exchange хийх.
6. User matching болон safe account-linking rule хийх.
7. Influence Hub JWT/refresh session-тэй холбох.
8. Frontend callback page хийх.
9. Login button холбох.
10. Automated test нэмэх.
11. Development tester account-аар end-to-end шалгах.
12. Privacy/data deletion болон production requirements дуусгах.

Энэ дарааллыг дагавал одоо ажиллаж байгаа email/password, Google OAuth, JWT болон refresh token flow-ийг эвдэхгүйгээр Meta OAuth нэмэх боломжтой.
