# Influence Hub — Meta social channel connection-д таны хийх ажлын гарын авлага

Энэ баримт нь Influence Hub-ийн кодод аль хэдийн бэлэн болсон Instagram/Facebook social channel connection-ийг **бодит Meta app, бодит Facebook Page, бодит Instagram Professional account болон production орчинтой холбохын тулд таны өөрийн гараар хийх ажлуудыг** дарааллаар нь тайлбарлана.

> Энэ баримтад backend/frontend хөгжүүлэлтийн task оруулаагүй. Энд байгаа ажлууд нь Meta Developer Dashboard, Facebook/Instagram account, domain, environment secret, App Review болон production deployment дээр таны хийх тохиргоо юм.

---

## 1. Эцсийн үр дүн

Энэ зааврыг бүрэн дуусгасны дараа:

- Creator өөрийн Instagram Professional account-аа Influence Hub-д холбоно.
- Creator эсвэл Business өөрийн Facebook Page-ээ холбоно.
- Нэг Facebook account олон Page удирддаг бол зөв Page/account-аа сонгоно.
- Influence Hub нь зөвшөөрөгдсөн profile, follower, media/post болон engagement мэдээллийг sync хийнэ.
- Хэрэглэгч `Sync now`, `Reconnect`, `Disconnect` үйлдлүүдийг ашиглана.
- Production хэрэглэгчид Meta App-ийн admin/tester байх шаардлагагүй болно.
- Scheduled sync болон Meta webhook бодит орчинд ажиллана.

## 2. Кодын одоогийн урсгалыг зөв ойлгох

Одоогийн код Instagram-ийг дараах урсгалаар холбодог:

```text
Facebook user
  → өөрийн удирддаг Facebook Page
  → тухайн Page-тэй холбогдсон Instagram Professional account
  → Influence Hub Creator/Business channel
```

Иймээс Instagram account нь:

- `Professional` буюу `Business` эсвэл `Creator` төрөлтэй;
- Facebook Page-тэй холбогдсон;
- OAuth хийх Facebook user тухайн Page дээр шаардлагатай эрхтэй

байх ёстой.

Одоогийн код шууд Instagram Login-ийн `instagram_business_*` permission ашигладаггүй. Meta Dashboard дээр өөр login flow сонгож, permission-ийг дур мэдэн солихгүй.

## 3. Эхлэхээс өмнө бэлдэх зүйл

Дараах бүх зүйлийг эхлээд бэлдэнэ.

### 3.1 Account болон эрх

- [ ] Өөрийн бодит Facebook account-тай болсон.
- [ ] [Meta for Developers](https://developers.facebook.com/) account-аа идэвхжүүлсэн.
- [ ] Meta account дээр two-factor authentication шаардвал асаасан.
- [ ] Influence Hub-д ашиглах Facebook Page үүсгэсэн эсвэл зөв Page-ээ сонгосон.
- [ ] Тухайн Page дээр өөрийн account `Full control` эсвэл шаардлагатай admin access-тай.
- [ ] Instagram account-аа `Professional account` болгосон.
- [ ] Instagram Professional account-аа зөв Facebook Page-тэй холбосон.
- [ ] Meta Business Portfolio шаардлагатай бол үүсгэсэн эсвэл өөрийн байгууллагын зөв Portfolio-д access авсан.

### 3.2 Domain болон public URL

Production App Review болон webhook-д `localhost` хангалтгүй. Дараах public HTTPS URL-ууд хэрэгтэй:

- [ ] Frontend production URL, жишээ: `https://influencehub.mn`
- [ ] Backend API production URL, жишээ: `https://api.influencehub.mn`
- [ ] Privacy Policy public URL
- [ ] Terms of Service public URL
- [ ] Data Deletion Instructions эсвэл Data Deletion Callback public URL

### 3.3 Өөрийн утгыг бөглөх worksheet

Доорх хүснэгтийг эхлээд бөглө. Дараагийн бүх тохиргоонд яг ижил утга ашиглана.

| Талбар | Таны утга |
|---|---|
| Meta App name | `________________________` |
| Meta App ID | `________________________` |
| Meta Business Portfolio | `________________________` |
| Frontend production URL | `https://________________` |
| Backend API production URL | `https://________________` |
| Privacy Policy URL | `https://________________` |
| Terms URL | `https://________________` |
| Data Deletion URL | `https://________________` |
| Test Facebook account | `________________________` |
| Test Facebook Page | `________________________` |
| Test Instagram Professional account | `@_______________________` |

## 4. Facebook Page болон Instagram account бэлдэх

### Алхам 4.1 — Facebook Page дээрх эрхээ шалгах

1. Facebook руу нэвтэр.
2. Ашиглах Page руугаа switch хий.
3. `Settings` → `Page access` хэсгийг нээ.
4. Өөрийн Facebook account Page дээр харагдаж байгаа эсэхийг шалга.
5. Page болон linked account-уудыг харахад хангалттай эрхтэй эсэхийг шалга.

Шалгах үр дүн:

- [ ] Page таны account-ын удирддаг Page жагсаалтад орж байна.
- [ ] Page-ийн settings-ийг нээж чадна.
- [ ] Business Portfolio ашигладаг бол Page зөв Portfolio-д байна.

### Алхам 4.2 — Instagram account-аа Professional болгох

Instagram app-ийн menu нэр version-оос хамаарч бага зэрэг өөр байж болно.

1. Instagram app руу нэвтэр.
2. `Profile` → menu → `Settings and activity` хэсгийг нээ.
3. `For professionals`, `Account type and tools` эсвэл түүнтэй ижил хэсгийг нээ.
4. Personal account бол `Switch to professional account` сонго.
5. `Creator` эсвэл `Business` төрлөөс бодит хэрэглээндээ тохирохыг сонго.
6. Category болон public profile мэдээллээ бөглө.

Шалгах үр дүн:

- [ ] Instagram account `Creator` эсвэл `Business` төрөлтэй болсон.
- [ ] Username, profile зураг, bio зөв байна.
- [ ] Account restriction эсвэл security warning байхгүй.

### Алхам 4.3 — Instagram account-аа Facebook Page-тэй холбох

1. Facebook Page-ийн `Settings`-ийг нээ.
2. `Linked accounts`, `Instagram` эсвэл Accounts Center-ийн холболтын хэсгийг нээ.
3. `Connect account` сонго.
4. Зөв Instagram Professional account-аар нэвтэр.
5. Permission хүсэлтүүдийг уншаад зөвшөөр.
6. Холболт амжилттай болсныг Facebook Page болон Instagram хоёр талаас шалга.

Шалгах үр дүн:

- [ ] Page settings дээр Instagram account харагдаж байна.
- [ ] Instagram талаас зөв Facebook Page холбогдсон байна.
- [ ] Өөр буруу Page эсвэл хуучин Business Portfolio-тэй холбоогүй байна.

## 5. Meta App үүсгэх

Meta Dashboard-ийн menu нэр шинэчлэлтээс шалтгаалан өөр байж болно. Гэхдээ сонгох capability болон утга нь доорхтой ижил байна.

### Алхам 5.1 — App үүсгэх

1. [Meta Apps](https://developers.facebook.com/apps/) руу ор.
2. `Create App` дар.
3. Business/Page/Instagram management-д тохирох use case-ийг сонго.
4. App name-д төслийн ойлгомжтой нэр өг. Жишээ: `Influence Hub Social Connection`.
5. Contact email-ээ зөв оруул.
6. Шаардлагатай бол Meta Business Portfolio-оо холбо.
7. App-аа үүсгээд App Dashboard руу ор.
8. `App ID`-г worksheet болон password manager-д тэмдэглэ.
9. `App Secret`-ийг зөвхөн backend secret болгон хадгал.

Аюулгүй байдлын дүрэм:

- App Secret-ийг screenshot, chat, Git commit, frontend `.env` дотор бүү хий.
- App Secret-ийг зөвхөн backend `.env` эсвэл production secret manager-д хадгал.
- Энэ repository-ийн public issue/README-д бодит утгыг бүү бич.

### Алхам 5.2 — Шаардлагатай product/use case нэмэх

App Dashboard дотроос дараах capability/product-уудыг идэвхжүүл:

- [ ] Facebook Login эсвэл Facebook Login for Business
- [ ] Facebook Pages API-тэй холбоотой use case
- [ ] Instagram API / Instagram Graph API
- [ ] Webhooks

Энэ feature нь Influence Hub-д login хийх Facebook auth биш. Хэрэглэгч Influence Hub-д аль хэдийн нэвтэрсний дараа channel settings дотроос social account-аа холбоно.

## 6. OAuth redirect URI тохируулах

Redirect URI нь үсэг, protocol, port, path, trailing slash хүртэл **яг адилхан** байх ёстой.

### Алхам 6.1 — Development callback URI

Meta Dashboard-ийн `Valid OAuth Redirect URIs` хэсэгт:

```text
http://localhost:3000/api/v1/social-connections/instagram/callback
http://localhost:3000/api/v1/social-connections/facebook/callback
```

утгуудыг нэм.

### Алхам 6.2 — Production callback URI

`<API_DOMAIN>`-ийг worksheet дахь бодит backend domain-оор солино:

```text
https://<API_DOMAIN>/api/v1/social-connections/instagram/callback
https://<API_DOMAIN>/api/v1/social-connections/facebook/callback
```

Жишээ:

```text
https://api.influencehub.mn/api/v1/social-connections/instagram/callback
https://api.influencehub.mn/api/v1/social-connections/facebook/callback
```

Шалгах зүйл:

- [ ] Development хоёр callback нэмэгдсэн.
- [ ] Production хоёр callback нэмэгдсэн.
- [ ] `http` ба `https` андуураагүй.
- [ ] `3000` ба `5173` port-ыг андуураагүй. Callback нь backend-ийн `3000` port руу орно.
- [ ] Callback-ийн төгсгөлд илүү `/` нэмээгүй.
- [ ] `www`-тэй болон `www`-гүй domain-ийг андуураагүй.
- [ ] Production API HTTPS certificate хүчинтэй.

## 7. Permission тохируулах

Код одоогоор яг дараах permission-үүдийг хүсдэг.

### 7.1 Instagram connection

```text
instagram_basic
instagram_manage_insights
pages_show_list
pages_read_engagement
```

| Permission | Influence Hub-д ашиглах зорилго |
|---|---|
| `instagram_basic` | Linked Instagram Professional profile болон media мэдээлэл унших |
| `instagram_manage_insights` | Зөвшөөрөгдсөн account/media insight, engagement metric унших |
| `pages_show_list` | Facebook user-ийн удирддаг Page-уудыг жагсааж зөв linked Instagram account олох |
| `pages_read_engagement` | Page болон linked professional account-д шаардлагатай engagement data унших |

### 7.2 Facebook Page connection

```text
pages_show_list
pages_read_engagement
pages_read_user_content
public_profile
```

| Permission | Influence Hub-д ашиглах зорилго |
|---|---|
| `pages_show_list` | User-ийн удирддаг Page-уудыг жагсаах |
| `pages_read_engagement` | Page profile болон engagement мэдээлэл унших |
| `pages_read_user_content` | Зөвшөөрөгдсөн Page content/post мэдээллийг sync хийх |
| `public_profile` | OAuth хийж буй Meta user-ийн үндсэн identity context авах |

### Алхам 7.3 — Access level шалгах

1. App Dashboard → `App Review` → `Permissions and Features` хэсгийг нээ.
2. Дээрх permission бүрийг хай.
3. Development test-д Standard Access хангалттай эсэхийг шалга.
4. Public хэрэглэгчид хэрэглэх permission бүрд шаардлагатай бол Advanced Access хүс.
5. Ашиглахгүй publish, ads, message, comment moderation permission бүү хүс.

Анхаарах зүйл:

- `instagram_business_*` нэртэй шинэ permission-үүдийг одоогийн кодод тохирно гэж таамгаар сонгохгүй.
- Instagram API with Instagram Login руу шилжүүлэх бол OAuth болон provider logic өөрчлөгдөх тул тусдаа хөгжүүлэлтийн ажил болно.
- App Review хүсэх permission нь кодын дээрх жагсаалттай тохирч байх ёстой.

## 8. Development tester тохируулах

App Development mode-д дурын Facebook хэрэглэгч OAuth хийж чадахгүй байж болно.

### Алхам 8.1 — Role нэмэх

1. Meta App Dashboard → `App roles` эсвэл `Roles` хэсгийг нээ.
2. Турших Facebook account-аа `Administrator`, `Developer` эсвэл `Tester` байдлаар нэм.
3. Нөгөө Facebook account-аар invitation-аа accept хий.
4. Invitation pending хэвээр үлдээгүйг шалга.

### Алхам 8.2 — Test account-ын өгөгдөл шалгах

Test хийх Facebook account:

- [ ] Meta App-ийн role invitation-аа зөвшөөрсөн.
- [ ] Test Facebook Page дээр access-тай.
- [ ] Test Instagram Professional account Page-тэй холбогдсон.
- [ ] Influence Hub-д бодит user account-аар нэвтэрч чаддаг.
- [ ] Creator эсвэл Business channel үүсгэсэн.

## 9. Backend environment тохируулах

### Алхам 9.1 — Local `.env` файл

`backend/.env.example`-ийг загвар болгон `backend/.env` дотор дараах утгыг тохируул.

```env
API_PUBLIC_URL=http://localhost:3000
CLIENT_URL=http://localhost:5173

SOCIAL_PROVIDER_MODE=meta
SOCIAL_TOKEN_ENCRYPTION_KEY=<32-byte-base64-or-64-character-hex-secret>
SOCIAL_SYNC_STALE_HOURS=24

META_APP_ID=<your-meta-app-id>
META_APP_SECRET=<your-meta-app-secret>
META_GRAPH_VERSION=v23.0

META_INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/v1/social-connections/instagram/callback
META_FACEBOOK_REDIRECT_URI=http://localhost:3000/api/v1/social-connections/facebook/callback
META_WEBHOOK_VERIFY_TOKEN=<at-least-32-random-characters>
```

`META_REDIRECT_URI` legacy fallback байгаа боловч provider бүрийн URI-г тусад нь тохируулах нь ойлгомжтой, аюулгүй.

### Алхам 9.2 — Encryption key үүсгэх

PowerShell дээр:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Гарсан утгыг `SOCIAL_TOKEN_ENCRYPTION_KEY` болгоно.

Энэ key-г алдвал database-д хадгалсан provider token-уудыг decrypt хийж чадахгүй. Key солихдоо өмнөх connection-уудыг reconnect хийх эсвэл тусдаа key rotation хийх шаардлагатай.

### Алхам 9.3 — Webhook verify token үүсгэх

PowerShell дээр:

```powershell
[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLower()
```

Гарсан 64 тэмдэгт утгыг `META_WEBHOOK_VERIFY_TOKEN` болгоно. Энэ нь Meta Dashboard-д оруулах verify token-той яг ижил байна.

### Алхам 9.4 — Production environment

Production hosting-ийн secret manager/environment settings дотор:

```env
API_PUBLIC_URL=https://<API_DOMAIN>
CLIENT_URL=https://<FRONTEND_DOMAIN>
SOCIAL_PROVIDER_MODE=meta
SOCIAL_TOKEN_ENCRYPTION_KEY=<production-only-secret>
SOCIAL_SYNC_STALE_HOURS=24
META_APP_ID=<production-meta-app-id>
META_APP_SECRET=<production-meta-app-secret>
META_GRAPH_VERSION=v23.0
META_INSTAGRAM_REDIRECT_URI=https://<API_DOMAIN>/api/v1/social-connections/instagram/callback
META_FACEBOOK_REDIRECT_URI=https://<API_DOMAIN>/api/v1/social-connections/facebook/callback
META_WEBHOOK_VERIFY_TOKEN=<production-verify-token>
```

Production checklist:

- [ ] Local болон production encryption key тусдаа.
- [ ] `.env` Git-д commit хийгдээгүй.
- [ ] Frontend environment-д `META_APP_SECRET` байхгүй.
- [ ] Secret утгууд deployment log-д хэвлэгдээгүй.
- [ ] Environment өөрчилсний дараа backend restart/redeploy хийсэн.

## 10. Local development test ажиллуулах

### Алхам 10.1 — Database migration

Production болон шинэ database бүр дээр migration deploy хийнэ:

```powershell
cd backend
npm run migrate:deploy
```

### Алхам 10.2 — Backend асаах

```powershell
cd backend
npm run dev
```

Backend startup error гарвал эхлээд:

- `SOCIAL_TOKEN_ENCRYPTION_KEY` зөв урттай эсэх;
- `SOCIAL_PROVIDER_MODE=meta` үед App ID/Secret хоосон биш эсэх;
- Instagram/Facebook redirect URI хоёулаа байгаа эсэх;
- webhook verify token 32-оос доошгүй тэмдэгтэй эсэх;
- port `3000` дээр өөр process ажиллаж байгаа эсэх

шалгана.

### Алхам 10.3 — Frontend асаах

Шинэ terminal дээр:

```powershell
cd frontend
npm run dev
```

### Алхам 10.4 — UI руу орох

Creator:

```text
Login
  → Creator channel
  → Dashboard Settings эсвэл Account Settings
  → Social channels
```

Business:

```text
Login
  → Business channel
  → Dashboard Settings эсвэл Account Settings
  → Social channels
```

## 11. Instagram end-to-end test

Дараахыг нэг нэгээр нь хийж, үр дүнг screenshot эсвэл test note болгон хадгал.

1. Influence Hub-д test user-ээр нэвтэр.
2. Creator channel сонго.
3. `Settings` → `Social channels` нээ.
4. Instagram-ийн `Connect` товч дар.
5. Meta consent screen гарч ирснийг шалга.
6. Зөв Facebook account-аар нэвтэр.
7. Хүссэн permission-үүдийг зөвшөөр.
8. Олон Page/account гарвал зөв linked Instagram account-аа сонго.
9. Influence Hub руу буцаж ирснийг шалга.
10. Connected Instagram username, profile зураг, follower/media summary харагдаж байгаа эсэхийг шалга.
11. `Sync now` дарж last sync time шинэчлэгдэж байгаа эсэхийг шалга.
12. Page дээрх шинэ media/post sync-д орж байгаа эсэхийг шалга.
13. `Disconnect` хийж connection алга болсон эсэхийг шалга.
14. Дахин `Connect` хийж reconnect flow ажиллаж байгаа эсэхийг шалга.

Амжилтын шалгуур:

- [ ] OAuth callback errorгүй.
- [ ] Зөв Instagram account сонгогдсон.
- [ ] Token browser storage эсвэл UI-д харагдахгүй.
- [ ] Profile болон боломжтой metric sync болсон.
- [ ] Disconnect хийсний дараа scheduled/manual sync зогссон.

## 12. Facebook Page end-to-end test

1. Influence Hub-д Business channel сонго.
2. `Settings` → `Social channels` нээ.
3. Facebook-ийн `Connect` товч дар.
4. Зөв Facebook account-аар OAuth хий.
5. Page жагсаалтаас зөв Page сонго.
6. Influence Hub руу буцаж ир.
7. Page name, profile зураг, follower/media summary шалга.
8. `Sync now` ажиллуул.
9. `Disconnect` болон reconnect flow шалга.

Амжилтын шалгуур:

- [ ] Personal Facebook profile биш, зөв Facebook Page холбогдсон.
- [ ] Өөр user-ийн Business/Creator channel руу connection ороогүй.
- [ ] Олон Page-тэй үед сонголт зөв ажилласан.
- [ ] Permission цуцалсан үед UI reconnect шаардаж байна.

## 13. Заавал турших алдааны нөхцөлүүд

Зөвхөн success flow тестлэхгүй.

| Туршилт | Хүлээгдэх үр дүн |
|---|---|
| Meta consent дээр Cancel дарах | Influence Hub ойлгомжтой cancel/error state харуулна |
| Page удирддаггүй account ашиглах | Facebook Page available биш гэсэн мэдээлэл гарна |
| Personal Instagram ашиглах | Instagram Professional account шаардсан алдаа гарна |
| Page-тэй холбоогүй Professional Instagram ашиглах | Linked account олдохгүй гэсэн алдаа гарна |
| App role invitation accept хийгээгүй user | Development mode access/login алдаа гарна |
| Permission-ийн заримыг цуцлах | Sync хийхэд reconnect/permission error гарна |
| Meta access-ийг Facebook settings-ээс revoke хийх | Дараагийн sync дээр connection expired/revoked болно |
| `Sync now`-г хурдан олон дарах | Duplicate sync/data үүсэхгүй, rate-limit/lock ажиллана |
| Өөр Influence Hub user connection ID ашиглах | Access denied/not found байна |

## 14. Meta Webhook тохируулах

Webhook-ийн production callback:

```text
https://<API_DOMAIN>/api/v1/social-connections/webhooks/meta
```

### Алхам 14.1 — Public endpoint бэлдэх

- [ ] Backend public HTTPS дээр deploy болсон.
- [ ] Callback URL browser/internet-ээс хүрэх боломжтой.
- [ ] Reverse proxy raw request body-г эвдэхгүй дамжуулдаг.
- [ ] `META_APP_SECRET` production орчинд зөв байна.
- [ ] `META_WEBHOOK_VERIFY_TOKEN` production орчинд зөв байна.

`localhost` webhook callback Meta-аас хүрэхгүй. Түр tunnel ашиглаж болно, гэхдээ tunnel URL өөрчлөгдөх бүрд Meta Dashboard callback-аа шинэчлэх шаардлагатай.

### Алхам 14.2 — Meta Dashboard-д webhook нэмэх

1. App Dashboard → `Webhooks` нээ.
2. App-д харагдаж буй тохирох `Page`/`Instagram` object-ийг сонго.
3. `Callback URL` дээр production webhook URL оруул.
4. `Verify Token` дээр `.env` дэх `META_WEBHOOK_VERIFY_TOKEN`-той яг ижил утга оруул.
5. `Verify and Save` дар.
6. Feature-д шаардлагатай хамгийн бага event field-үүдийг subscribe хий.
7. Test event илгээж backend success response өгч байгаа эсэхийг шалга.

Webhook verification failed бол:

- verify token хоёр талд яг адил эсэх;
- callback URL HTTPS эсэх;
- production backend зөв `.env` уншсан эсэх;
- URL нь `/api/v1/social-connections/webhooks/meta` мөн эсэх;
- proxy GET verification query-г дамжуулж байгаа эсэх

шалгана.

## 15. Scheduled sync ажиллуулах

Кодын scheduled command:

```powershell
cd backend
npm run job:social-sync
```

Production scheduler/cron дээр энэ command-ийг тогтмол ажиллуулна. Эхний тохиргоонд **цаг тутам** ажиллуулахад болно; service нь `SOCIAL_SYNC_STALE_HOURS=24`-өөс хуучирсан connection-уудыг ялгаж sync хийнэ.

Scheduler checklist:

- [ ] Command production backend directory дотор ажиллана.
- [ ] Production environment variables scheduler process-д дамжина.
- [ ] Job success/failure log хадгалагдана.
- [ ] Нэг connection-ийн алдаа бусад connection-ийг бүхэлд нь зогсоохгүй.
- [ ] Job-ийг хэд хэдэн server дээр зэрэг schedule хийгээгүй.
- [ ] Meta rate limit алдаа monitoring-д харагдана.

## 16. Privacy, Terms болон Data Deletion бэлдэх

### 16.1 Privacy Policy-д заавал тайлбарлах

- Ямар social data авдаг: profile, Page/Instagram identity, follower/media/engagement data.
- Яагаад авдаг: channel verification, creator/business profile, performance analytics.
- Provider access token encrypted байдлаар хадгалдаг.
- Data-г хэн харж болох.
- Хэрэглэгч connection-оо хэрхэн disconnect хийх.
- Хэрэглэгч account/data deletion хэрхэн хүсэх.
- Data retention хугацаа.
- Холбоо барих email.

### 16.2 Data Deletion

Public зааварт дараах алхмыг оруул:

```text
Influence Hub → My account → Settings → Social channels → Disconnect
```

Бүрэн account устгах бол:

```text
Influence Hub → My account → Settings → Delete account
```

Meta App Dashboard шаардаж байвал Data Deletion Instructions URL эсвэл callback URL-аа оруул.

### 16.3 App settings checklist

- [ ] Privacy Policy URL
- [ ] Terms of Service URL
- [ ] Data Deletion URL
- [ ] App icon
- [ ] App category
- [ ] Contact email
- [ ] Production domain
- [ ] Business information

## 17. App Review материал бэлдэх

### Алхам 17.1 — Permission бүрийн тайлбар

Permission бүрд дараах 4 асуултад хариулсан тайлбар бич:

1. Яагаад энэ permission хэрэгтэй вэ?
2. User UI-ийн хаанаас тухайн action-ийг эхлүүлэх вэ?
3. Авсан data UI-ийн хаана харагдах вэ?
4. Data-г өөр зорилгоор ашиглахгүй гэдгийг хэрхэн хангаж байгаа вэ?

### Алхам 17.2 — Reviewer instructions загвар

```text
1. Open <FRONTEND_PRODUCTION_URL>.
2. Sign in with the provided Influence Hub reviewer account.
3. Open My account and select the Creator channel.
4. Open Settings → Social channels.
5. Click Connect Instagram.
6. Continue with the provided Facebook test account.
7. Grant the requested permissions.
8. Select the linked Instagram Professional account when prompted.
9. Return to Influence Hub and verify that the connected profile,
   follower/media summary and last sync status are displayed.
10. Click Sync now to refresh the data.
11. Use Disconnect to remove the connection.
```

Facebook Page review хийхдээ 3–8-р алхмыг Business channel болон `Connect Facebook` байдлаар солино.

### Алхам 17.3 — Screen recording

Нэг тасралтгүй video дотор:

1. Influence Hub login.
2. Creator/Business channel сонголт.
3. Settings → Social channels.
4. Connect товч.
5. Meta consent screen болон permission.
6. Олон account байвал account selection.
7. Influence Hub руу callback.
8. Synced profile/media/metric.
9. Manual sync.
10. Disconnect.

Sensitive password, App Secret, access token-ийг video-д бүү харуул.

### Алхам 17.4 — Review submit

- [ ] Business Verification шаардлагатай бол дуусгасан.
- [ ] Permission бүрд Advanced Access хүссэн.
- [ ] Reviewer account credentials ажиллаж байгаа.
- [ ] Reviewer Facebook account test Page/Instagram-д access-тай.
- [ ] Reviewer instructions copy/paste хийхэд ойлгомжтой.
- [ ] Screen recording public/reviewer-accessible link-тэй.
- [ ] Privacy, Terms, Data Deletion URL нээгдэж байгаа.
- [ ] Review submit хийсэн.
- [ ] Meta-ийн нэмэлт асуулт ирвэл хугацаанд нь хариулсан.

## 18. Live mode руу шилжүүлэх

App Review болон шаардлагатай verification амжилттай болсны дараа:

1. Production backend migration deploy хий.
2. Production environment secret-үүдийг дахин шалга.
3. Production callback URI-ууд Meta Dashboard-д бүртгэлтэйг шалга.
4. Production webhook verify хий.
5. App-аа шаардлагатай бол `Live` mode болго.
6. App role-гүй бодит Facebook account ашиглан Instagram connection test хий.
7. App role-гүй өөр бодит account ашиглан Facebook Page connection test хий.
8. Sync job ажиллаж байгаа эсэхийг 24 цагийн дотор шалга.
9. Token, code, App Secret log-д ороогүйг шалга.

Live checklist:

- [ ] Development tester account-аар биш, энгийн public user-ээр тестэлсэн.
- [ ] Instagram connect амжилттай.
- [ ] Facebook Page connect амжилттай.
- [ ] Multiple-account selection амжилттай.
- [ ] Manual sync амжилттай.
- [ ] Scheduled sync амжилттай.
- [ ] Disconnect/reconnect амжилттай.
- [ ] Webhook verification болон event delivery амжилттай.

## 19. Monitoring болон тогтмол арчилгаа

Долоо хоног бүр:

- [ ] `SOCIAL_PROVIDER_REAUTH_REQUIRED` алдааны тоо шалгах.
- [ ] `SOCIAL_PROVIDER_RATE_LIMITED` алдаа шалгах.
- [ ] Scheduled sync job алдааг шалгах.
- [ ] Webhook delivery failure шалгах.
- [ ] Meta App Dashboard alert шалгах.

Сар бүр:

- [ ] Expired/revoked connection-ийн хувь шалгах.
- [ ] Privacy/Data Deletion URL ажиллаж байгаа эсэхийг шалгах.
- [ ] Meta permission эсвэл API version deprecation notice шалгах.
- [ ] App role болон Business Portfolio access-ийг цэвэрлэх.
- [ ] Secret access audit хийх.

Secret алдагдсан гэж сэжиглэвэл:

1. Meta App Secret-ийг rotate хий.
2. Production secret manager дахь утгыг шинэчил.
3. Backend redeploy/restart хий.
4. Webhook signature delivery шалга.
5. Шаардлагатай connection-уудад reconnect шаард.
6. Incident log үлдээ.

## 20. Түгээмэл алдаа ба шийдэл

| Алдаа/шинж тэмдэг | Шалгах зүйл | Шийдэл |
|---|---|---|
| `URL blocked` эсвэл redirect mismatch | Meta Dashboard URI ба backend `.env` | Protocol, domain, port, path, trailing slash-ийг яг тааруул |
| `No Facebook Page is available` | Facebook account Page access-тай эсэх | Зөв account ашиглаж, Page access/Business Portfolio эрхээ зас |
| `Instagram Professional account required` | Account type ба Page link | Instagram-аа Professional болгож зөв Facebook Page-тэй холбо |
| App development mode access denied | User App role-той эсэх | Tester/Developer нэмээд invitation accept хий |
| Permission error | Permission access level/review | Permission-ээ Dashboard-д идэвхжүүлж Advanced Access/App Review хий |
| `SOCIAL_PROVIDER_UNAVAILABLE` | Internet, DNS, Meta status | Backend outbound HTTPS access болон Meta service-ийг шалга |
| `SOCIAL_PROVIDER_REAUTH_REQUIRED` | Token expired/revoked | UI дээр `Reconnect` хий |
| `SOCIAL_PROVIDER_RATE_LIMITED` | Олон manual/scheduled request | Түр хүлээ, job давтамж ба давхар scheduler-ийг шалга |
| Webhook verification failed | Verify token | Dashboard ба `.env` утгыг яг ижил болго |
| Webhook POST invalid signature | App Secret/proxy raw body | Production App Secret болон reverse proxy/body handling шалга |
| Backend startup failure | Missing/short env | App ID, secret, 2 redirect URI, 32+ webhook token, encryption key шалга |
| Connected боловч metric дутуу | Account type/permission/provider availability | Professional account, permission болон тухайн metric Meta-аас өгөгдөж буй эсэхийг шалга |
| Буруу Page холбогдсон | OAuth user олон Page-тэй | Disconnect → reconnect → зөв account сонго |

## 21. Ямар үед кодын нэмэлт өөрчлөлт шаардлагатай вэ?

Дараах зүйлс энэ user setup-ийн хүрээнд биш:

- Instagram API with Instagram Login руу бүрэн шилжих;
- TikTok, YouTube, X зэрэг шинэ provider нэмэх;
- Influence Hub-ээс Instagram/Facebook руу post publish хийх;
- DM, comment moderation хийх;
- Ads account болон campaign advertising data удирдах;
- Meta access token-ийн тусгай migration/key rotation tool хийх.

Эдгээрийг хүсвэл permission, provider adapter, App Review scope болон UI/backend logic-д тусдаа хөгжүүлэлт хийнэ.

## 22. Таны эцсийн master checklist

### Account preparation

- [ ] Meta Developer account бэлэн.
- [ ] Facebook Page бэлэн.
- [ ] Page access зөв.
- [ ] Instagram Professional account бэлэн.
- [ ] Instagram зөв Page-тэй холбогдсон.
- [ ] Business Portfolio access зөв.

### Meta App

- [ ] Meta App үүссэн.
- [ ] App ID болон App Secret аюулгүй хадгалагдсан.
- [ ] Facebook Login capability идэвхтэй.
- [ ] Pages capability идэвхтэй.
- [ ] Instagram API capability идэвхтэй.
- [ ] Webhooks capability идэвхтэй.
- [ ] Development callback URI 2 ширхэг бүртгэлтэй.
- [ ] Production callback URI 2 ширхэг бүртгэлтэй.

### Permission ба review

- [ ] Кодын хүсэж буй permission бүр Dashboard-д байна.
- [ ] Ашиглахгүй permission хүсээгүй.
- [ ] Tester roles тохируулсан.
- [ ] Business Verification шаардлагатай бол дууссан.
- [ ] Permission justification бэлэн.
- [ ] Reviewer instructions бэлэн.
- [ ] Screen recording бэлэн.
- [ ] App Review амжилттай.

### Privacy ба production

- [ ] Privacy Policy URL public.
- [ ] Terms URL public.
- [ ] Data Deletion URL public.
- [ ] Production API HTTPS.
- [ ] Production `.env`/secret manager тохирсон.
- [ ] Database migration deploy хийсэн.
- [ ] Webhook verify хийсэн.
- [ ] Scheduled sync тохируулсан.
- [ ] App Live mode-д орсон.
- [ ] App role-гүй public user-ээр E2E test хийсэн.

### Release acceptance

- [ ] Creator Instagram-аа connect/sync/disconnect хийж чаддаг.
- [ ] Business Facebook Page-ээ connect/sync/disconnect хийж чаддаг.
- [ ] Олон account-аас зөв account сонгож чаддаг.
- [ ] Profile, follower, media болон боломжтой insight sync болдог.
- [ ] Reconnect state ойлгомжтой ажилладаг.
- [ ] Token болон secret frontend/log-д харагддаггүй.
- [ ] Scheduled sync болон webhook monitoring-той.

## 23. Албан ёсны эх сурвалж

Meta Dashboard болон permission нэршил өөрчлөгдөж болдог тул submission хийх өдөр дараах албан ёсны баримтыг дахин шалга:

- [Meta for Developers — Apps](https://developers.facebook.com/apps/)
- [Meta Instagram Platform](https://developers.facebook.com/docs/instagram-platform/)
- [Instagram API with Facebook Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/)
- [Meta Graph API](https://developers.facebook.com/docs/graph-api/)
- [Meta Webhooks](https://developers.facebook.com/docs/graph-api/webhooks/)
- [Meta Permissions Reference](https://developers.facebook.com/docs/permissions/)
- [Meta App Review](https://developers.facebook.com/docs/app-review/)

---

## 24. Хамгийн богино зөв дараалал

Хэрэв дээрх урт зааврыг ажлын дараалал болгон товчлох бол:

```text
1. Facebook Page + Instagram Professional account бэлдэх
2. Instagram-аа Facebook Page-тэй холбох
3. Meta App үүсгэх
4. Facebook Login + Pages + Instagram API + Webhooks идэвхжүүлэх
5. Development/production callback URI бүртгэх
6. Шаардлагатай permission access тохируулах
7. Tester account болон Page access тохируулах
8. Backend local/production secret тохируулах
9. Instagram ба Facebook E2E test хийх
10. Privacy/Terms/Data Deletion URL бэлдэх
11. App Review material + video бэлдэх
12. App Review submit хийх
13. Production webhook + scheduler тохируулах
14. Live mode болгох
15. App role-гүй бодит хэрэглэгчээр final test хийх
```
