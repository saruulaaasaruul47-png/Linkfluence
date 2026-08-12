# ADR 0001: Public marketplace route-уудыг үе шаттай SSR болгох

## Төлөв

**Accepted — Phase 1 implemented (2026-08-07).** Phase 2 SSR migration нь production crawl blocker хэвээр.

## Context

Одоогийн frontend нь Vite SPA. Runtime metadata нь browser болон social client JavaScript ажиллуулсан үед зөв боловч JS ажиллуулдаггүй crawler-д entity-specific HTML өгөхгүй. Dashboard-уудыг SSR болгох шаардлагагүй, харин `/creators/:slug`, `/businesses/:slug`, `/showcase/:id` нь search/share preview-д crawlable байх ёстой.

## Шийдвэр

- Authenticated creator/business/admin dashboard Vite SPA хэвээр үлдэнэ.
- Public creator, business, showcase route-уудыг үе шаттай SSR frontend рүү шилжүүлнэ.
- URL болон REST DTO өөрчлөгдөхгүй. Одоогийн canonical URL нь migration-ийн тогтвортой contract байна.
- Migration бүрэн болтол backend dynamic sitemap нь зөвхөн active/published entity-г индексжүүлнэ.

## Phase 1 — хэрэгжсэн groundwork

- Public entity бүр unique title, description, canonical, OpenGraph/Twitter metadata авдаг болсон.
- Creator=`Person`, Business=`Organization`, Showcase=`CreativeWork` JSON-LD contract хэрэгжсэн.
- Dynamic `/sitemap.xml` нь active creator/business болон published showcase-ийг PostgreSQL-оос гаргана.
- `/robots.txt`, private/dashboard route-ийн `noindex` policy нэмэгдсэн.
- Metadata, canonical, JSON-LD, robots/sitemap automated regression-тэй.
- Public feed media lazy-load/preload policy, route-level lazy chunks, bundle budget CI gate-тэй.

## Phase 2 — actual SSR acceptance criteria

1. Public route request-ийн эхний HTML дотор title, description, canonical, OpenGraph, JSON-LD бүгд байна.
2. `/creators/:slug`, `/businesses/:slug`, `/showcase/:id` REST DTO-г server-render layer шууд ашиглана.
3. `/showcase` эхний cursor page server-render, дараагийн page client infinite continuation байна.
4. 404/410 төлөв нь зөв HTTP status ба `noindex` өгнө.
5. Existing SPA URL redirect/canonical matrix болон browser visual regression ногоон байна.
6. Search Console URL inspection, social share debugger, Core Web Vitals батлагдсаны дараа route тус бүрийн traffic шилжинэ.

## Deployment routing

Reverse proxy нь frontend public domain-ийн `/sitemap.xml` болон `/robots.txt` хүсэлтийг backend root endpoint рүү чиглүүлнэ. Sitemap-ийн `<loc>` нь `CLIENT_URL`, robots-ийн sitemap endpoint нь `API_PUBLIC_URL` тохиргоог ашиглана. Production-д хоёулаа HTTPS байна.

## Үр дагавар

Phase 1 нь metadata contract болон index hygiene-ийг шууд хамгаална. Гэхдээ JS-гүй crawler limitation бүрэн арилаагүй; үүнийг зөвхөн Phase 2 rendered HTML хаана. Хоёр frontend runtime зэрэг ажиллах хугацаанд API DTO, auth cookie domain, design token version-ийг төвлөрүүлж удирдана.
