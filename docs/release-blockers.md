# Release gate ба blocker checklist

Шалгасан огноо: **2026-08-07**  
Local release readiness: **91%**. Production release нь доорх external blocker-ууд хаагдсаны дараа зөвшөөрөгдөнө.

## Local gate — PASS

- [x] Backend full integration: **171/171 pass**.
- [x] Backend built-in coverage: line **86.30%**, branch **72.41%**, function **78.70%**.
- [x] Frontend: Node validation **5/5**, Vitest/Testing Library **40/40**, нийт **45/45 pass**.
- [x] Frontend ESLint, production build, bundle budget бүгд pass.
- [x] Хамгийн том JS chunk **232,549 B / 430,080 B**, нийт JS/CSS asset **1,290,170 B / 2,097,152 B**.
- [x] Prisma validate, client generate, migrate deploy dry run pass; pending migration **0**.
- [x] Public feed local smoke: 50 request, p50 **11.34 ms**, p95 **23.45 ms**, max **134.01 ms**.
- [x] `/creators/:slug`, `/businesses/:slug`, `/showcase/:id` route бүр dynamic title, description, canonical, OpenGraph, Twitter card, JSON-LD-тэй.
- [x] Dynamic `/sitemap.xml`, `/robots.txt`, private/dashboard `noindex` policy test-тэй.
- [x] Modal/drawer focus trap, focus restore, Escape close; feed follow/like/save accessible name ба pressed state test-тэй.
- [x] IDOR, webhook replay/mismatch, signed URL expiry/permission, admin/participant role regression suite ногоон.
- [x] Critical domain flow **3/3** integration түвшинд ногоон:
  1. Register → OTP → creator profile/onboarding contract.
  2. Business offer → creator counter → business approve → workspace.
  3. Contract → funding → deliverable → proof → review → showcase.
- [x] Known critical security/money defect: **0**.

## Production blocker — OPEN

| Blocker | Owner | Баталгаажуулах огноо | Гарах нотолгоо |
|---|---|---:|---|
| Critical 3 flow-г жинхэнэ Chromium дээр Playwright-аар ажиллуулах | Frontend + QA | 2026-08-10 | Browser trace, screenshot, **3/3 pass** |
| Staging-тэй ижил хэмжээний anonymized dataset дээр p95 < 400 ms батлах | Backend + DevOps | 2026-08-10 | Feed/search/workspace endpoint тус бүрийн p50/p95/max report |
| Public route-ийн JS-гүй crawl limitation-ийг ADR 0001 Phase 2 SSR-аар хаах | Frontend platform | 2026-08-21 | Rendered HTML metadata, Search Console URL inspection |
| Managed Redis/RabbitMQ/object storage credential, readiness ба backlog alert | DevOps | 2026-08-12 | Reconnect drill, alert screenshot, ready endpoint PASS |
| Stripe production account, Connect/KYC, webhook replay drill | Finance engineering | 2026-08-14 | Signed provider event, reconciliation diff 0, payout evidence |
| Resend sender domain/DNS verification | DevOps | 2026-08-10 | Real-domain inbox acceptance, bounce log |
| Frontend dependency advisory-г breaking regression-тэй шийдэх | Frontend | 2026-08-12 | `npm audit` report, check suite PASS |

## Release rule

Local gate-ийн аль нэг шалгалт унах, critical security/money defect гарах, эсвэл production blocker эзэнгүй/хугацаагүй болох үед deploy хийхгүй. Local p95 нь production баталгаа биш; staging хэмжилтийг тусад нь заавал хийнэ.
