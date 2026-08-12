Influence Hub — Software Requirements Specification (SRS)

Version: v2.1 DetailedStatus: DraftProduct Type: Influencer Marketplace + Freelancer Collaboration Platform + Public Showcase PlatformPrimary Language: MongolianArchitecture Style: Modular Monolith (Modulith)Backend Language: JavaScript ES ModulesDatabase: PostgreSQL + Prisma ORM

1. Introduction

1.1 Purpose

Influence Hub нь Business болон Creator-ийг нэг платформ дээр холбож, Creator хайх, ажлын санал илгээх, нөхцөл тохиролцох, гэрээ байгуулах, төлбөр хийх, контент хүлээлгэн өгөх, хянах, дууссан ажлыг Showcase хэлбэрээр олон нийтэд харуулах бүрэн циклтэй систем байна.

Платформ нь дараах гурван үндсэн бүтээгдэхүүний шинжийг нэгтгэнэ:

Influencer Marketplace

Creator болон Business хайх

Profile, portfolio, verified statistics харах

Compare, shortlist, follow, collection ашиглах

Freelancer Collaboration Platform

Work Offer

Counter Proposal

Collaboration Workspace

Negotiation

Contract

Deliverables

Payment

Review

Public Showcase Platform

Дууссан хамтын ажиллагааны контент

Creator portfolio

Business-ийн өмнөх ажлууд

Home feed

Public discovery

SEO acquisition

1.2 Product Vision

Business болон Creator хоёр Instagram DM, Facebook message, spreadsheet, email, банкны шилжүүлэг зэрэг олон салангид хэрэгсэл ашиглахгүйгээр нэг платформ дээр хамтын ажиллагаагаа бүрэн удирдана.

Influence Hub дараах асуултуудад нэг дор хариулдаг байна:

Ямар Creator тохирох вэ?

Creator-ийн статистик үнэн үү?

Creator хэдэн төгрөгөөр ажиллах вэ?

Business яг ямар ажил санал болгож байна вэ?

Хоёр тал ямар нөхцөл дээр тохирсон бэ?

Гэрээ баталгаажсан уу?

Төлбөр хийгдсэн үү?

Контент хугацаандаа ирсэн үү?

Засвар хэдэн удаа хийгдсэн бэ?

Нийтлэл үнэхээр нийтлэгдсэн үү?

Хамтын ажиллагааны үр дүн ямар байсан бэ?

Дууссан ажлыг нийтэд харуулах уу?

1.3 Goals

Business талд

Тохирох Creator олох

Verified statistics ашиглан шийдвэр гаргах

Creator-уудыг shortlist болон compare хийх

Хөнгөн Work Offer илгээх

Creator-ийн Counter Proposal хүлээн авах

Workspace дотор нөхцөл тохиролцох

Contract болон Payment-ийг удирдах

Deliverable хянах

Campaign/Collaboration үр дүн харах

Дууссан ажлыг Showcase болгох

Creator талд

Өөрийн Creator Profile үүсгэх

Portfolio болон social statistics харуулах

Work Offer хүлээн авах

Interested, Counter Proposal, Decline хийх

Нөхцөл тохиролцох

Гэрээ батлах

Deliverable upload хийх

Засвар хүлээн авах

Payment status харах

Review авах

Дууссан ажлаа verified portfolio болгох

Viewer талд

Home Showcase Feed үзэх

Creator болон Business хайх

Follow хийх

Save хийх

Collection үүсгэх

Recommendation feed авах

Recently viewed харах

Admin талд

User, Creator, Business удирдах

Verification шалгах

Report, dispute, moderation шийдвэрлэх

Payment, payout, commission хянах

Platform analytics харах

Audit log шалгах

2. Platform Layers

2.1 Layer 1 — Marketplace

Marketplace давхарга нь Business болон Creator-уудыг хооронд нь олж уулзуулах зориулалттай.

Үндсэн боломжууд:

Home Showcase Feed

Discover

Creator Search

Business Search

Public Creator Profile

Public Business Profile

Compare Creators

Shortlist

Follow

Save

Collection

Recommended Creators

Recommended Businesses

Trending Showcase

2.2 Layer 2 — Collaboration

Collaboration давхарга нь Business болон Creator хооронд ажлын харилцаа эхлүүлэх зориулалттай.

Үндсэн урсгал:

Business
↓
Send Work Offer
↓
Creator reviews offer
↓
Interested / Counter Proposal / Decline
↓
Business reviews response
↓
Business approves collaboration
↓
Collaboration Workspace is created

2.3 Layer 3 — Freelancer Workspace

Workspace нь нэг Business, нэг Creator, нэг ажлын хамтын ажиллагааны төв орчин байна.

Workspace дотор:

Overview

Negotiation

Agreement

Messages

Files

Tasks

Timeline

Contract

Payment

Deliverables

Activity

2.4 Layer 4 — Showcase

Showcase нь зөвхөн амжилттай дууссан, хоёр тал нийтлэхийг зөвшөөрсөн Collaboration-аас үүснэ.

Үндсэн урсгал:

Completed Collaboration
↓
Business requests Showcase publish
↓
Creator approval
↓
Public Showcase Item
↓
Home Feed / Creator Profile / Business Profile

3. User Types and Permissions

3.1 Guest

Guest нь бүртгэлгүй хэрэглэгч.

Хийж болох зүйл:

Landing page үзэх

Home Showcase Feed үзэх

Discover ашиглах

Creator public profile үзэх

Business public profile үзэх

Showcase detail үзэх

Search болон basic filters ашиглах

Хийж болохгүй зүйл:

Follow

Save

Collection

Work Offer

Workspace

Contract

Payment

Message

3.2 Viewer

Viewer нь бүртгэлтэй боловч Creator эсвэл Business channel үүсгээгүй хэрэглэгч.

Хийж болох зүйл:

Home Showcase Feed

Discover

Follow Creator

Follow Business

Save Showcase

Save Creator

Save Business

Collection үүсгэх

Recommendation Feed

Recently Viewed

Notifications

Creator Channel үүсгэх

Business Channel үүсгэх

Хийж болохгүй зүйл:

Work Offer илгээх

Work Offer хүлээн авах

Workspace ашиглах

Contract байгуулах

Payment хийх

Deliverable upload хийх

3.3 Creator

Creator нь Creator Profile үүсгэсэн хэрэглэгч.

Хийж болох зүйл:

Creator Dashboard

Creator Profile update

Social account connect

Portfolio CRUD

Work Offer хүлээн авах

Interested

Counter Proposal

Decline

Workspace

Negotiation

Contract approve

Deliverable upload

Revision resubmit

Payment status харах

Review бичих

Showcase approval хийх

3.4 Business

Business нь Business Profile үүсгэсэн хэрэглэгч.

Хийж болох зүйл:

Business Dashboard

Business Profile update

Creator search

Compare

Shortlist

Work Offer илгээх

Creator response review

Approve Collaboration

Workspace

Negotiation

Contract approve

Payment хийх

Deliverable review

Request Revision

Approve Deliverable

Showcase publish request

Analytics харах

3.5 Admin

Admin нь platform-level role.

Хийж болох зүйл:

Admin Dashboard

User management

Profile verification

Social verification review

Content moderation

Dispute resolution

Payment monitoring

Payout approval

Refund review

Audit logs

Feature flags

System settings

4. Account and Role Model

4.1 Registration Rule

Хэрэглэгч бүртгүүлэх үед role сонгохгүй.

Default role:

VIEWER

Creator Profile үүсгэх үед:

VIEWER + CREATOR

Business Profile үүсгэх үед:

VIEWER + BUSINESS

Нэг хэрэглэгч зэрэг:

VIEWER + CREATOR + BUSINESS

байж болно.

ADMIN role-ийг хэрэглэгч өөрөө авах боломжгүй.

4.2 UserRole

enum UserRole {
  VIEWER
  CREATOR
  BUSINESS
  ADMIN
}

5. Navigation

5.1 Guest Navigation

Home

Discover

Creators

Businesses

Login

Register

5.2 Viewer Navigation

Home

Discover

Collections

Notifications

Profile

Create Channel

5.3 Creator Navigation

Home

Discover

Dashboard

Work Requests

Collaborations

Messages

Portfolio

Analytics

Wallet

Profile

5.4 Business Navigation

Home

Discover

Dashboard

Sent Offers

Collaborations

Shortlist

Compare

Messages

Analytics

Payments

Profile

5.5 Admin Navigation

Dashboard

Users

Channels

Creators

Businesses

Collaborations

Contracts

Payments

Disputes

Reports

Moderation

Verifications

Audit Logs

Settings

6. Overall User Flow

Guest
↓
Register
↓
Email OTP Verification
↓
Viewer
↓
Explore platform
↓
Create Creator or Business Profile
↓
Discover
↓
Business sends Work Offer
↓
Creator: Interested / Counter Proposal / Decline
↓
Business Approval
↓
Collaboration Workspace
↓
Negotiation
↓
Agreement
↓
Contract
↓
Payment
↓
Deliverables
↓
Review
↓
Completed
↓
Showcase

7. Functional Requirements

FR-1 Authentication

FR-1.1 Register

Register form:

Email

Username

Display Name

Password

Confirm Password

Rules:

Role сонгохгүй

Default role VIEWER

Email lowercase

Username unique

Password bcrypt hash

Register хийсний дараа шууд login болохгүй

6 оронтой OTP email рүү илгээнэ

FR-1.2 Email OTP Verification

OTP 6 digit string

10 минутын expiry

5 attempts

SHA-256 hash database-д хадгална

Verify success:

emailVerifiedAt = now

status = ACTIVE

access token

refresh token cookie

FR-1.3 Login

Email

Password

bcrypt compare

Verified account only

ACTIVE account only

Wrong email/password generic error

FR-1.4 Refresh Token

HTTP-only cookie

7 days

rotation

old token revoke

new access token

new refresh token

FR-1.5 Logout

Refresh token revoke

Cookie clear

Frontend auth state clear

FR-1.6 Get Current User

Endpoint:

GET /api/v1/auth/me

Returns:

Safe user

Roles

Creator profile exists

Business profile exists

FR-2 User Account

FR-2.1 View Account

User дараах мэдээллийг харна:

Display Name

Username

Email

Avatar

Roles

Verification state

Created date

FR-2.2 Edit Account

User өөрчлөх боломжтой:

Display Name

Username

Avatar

User өөрөө өөрчлөхгүй:

Roles

Status

emailVerifiedAt

Admin fields

FR-2.3 Change Password

Current password

New password

Confirm password

bcrypt compare

bcrypt hash

All refresh tokens revoke

FR-2.4 Soft Delete Account

deletedAt = now

status = DELETED

refresh tokens revoke

protected API access deny

FR-3 Creator Profile

FR-3.1 Create Creator Profile

Fields:

Bio

Location

Categories

Skills

Languages

Starting Rate

Currency

Cover Image

Available For Work

Create success:

CREATOR role нэмэгдэнэ

Creator Dashboard идэвхжинэ

FR-3.2 Social Accounts

Supported MVP:

Instagram

Facebook

YouTube optional manual link

Fields:

Platform

Handle

Profile URL

Follower Count

Engagement Rate

Verification Status

Last Sync At

FR-3.3 Verified Statistics

OAuth/API-аар татсан statistics:

Verified badge

Last synced date

API source

Manual statistics:

Unverified badge

User entered

Platform verified биш

FR-3.4 Portfolio

Portfolio item:

Title

Description

Category

Media Type

Media URL

Thumbnail

Statistics

Published Date

FR-3.5 Creator Availability

Available

Busy

Not accepting offers

FR-4 Business Profile

FR-4.1 Create Business Profile

Fields:

Company Name

Slug

Description

Industry

Location

Website

Logo

Cover

Create success:

BUSINESS role нэмэгдэнэ

Business Dashboard идэвхжинэ

FR-4.2 Business Verification

Statuses:

UNVERIFIED

PENDING

VERIFIED

REJECTED

FR-4.3 Verified Payer Badge

Business төлбөрийн амжилттай түүхтэй бол verified payer badge харуулж болно.

FR-5 Home Showcase Feed

FR-5.1 Home Purpose

Home нь контент үзэх үндсэн нүүр байна.

Home нь Discover биш.

Home:

Content Feed

Discover:

Search Engine

FR-5.2 Home Sections

Featured Showcase

Trending Showcase

Latest Showcase

Recommended Showcase

Following Showcase

Popular Creators

Popular Businesses

Recently Viewed

FR-5.3 Showcase Card

Thumbnail / Video Preview

Creator

Business

Caption

Platform

Published Date

Views

Likes

Saves

Shares

View Creator

View Business

Нийтэд харагдахгүй:

Contract

Payment

Negotiation

Internal Files

Draft Content

Private Messages

FR-6 Discover

FR-6.1 Search

Search entities:

Creator

Business

Username

Company Name

Category

Industry

Location

Platform

FR-6.2 Creator Filters

Category

Niche

Platform

Follower Range

Engagement Rate

Rating

Starting Rate

Currency

Verified Only

Available Only

Location

Language

FR-6.3 Business Filters

Industry

Location

Verified

Rating

Completed Collaborations

FR-6.4 Sort

Trending

Most Followed

Highest Rated

Newest

Price Low to High

Price High to Low

Alphabetical

FR-6.5 Pagination

Cursor pagination ашиглана.

FR-6.6 Search Debounce

Frontend search request:

300ms debounce

FR-7 Follow, Save, Collections

FR-7.1 Follow

Viewer, Creator, Business нь:

Creator follow

Business follow

Unfollow

FR-7.2 Collections

Collection fields:

Name

Description

Visibility

Share Token

Default Collection

FR-7.3 Collection Items

Save targets:

Creator

Business

Portfolio

Showcase

Collaboration public result

FR-8 Compare and Shortlist

FR-8.1 Shortlist

Business Creator-ийг shortlist-д хадгална.

Fields:

Creator

Notes

Tags

Added Date

FR-8.2 Compare

Business 2–4 Creator зэрэг харьцуулна.

Metrics:

Followers

Engagement

Average Views

Rating

Starting Rate

Completed Collaborations

Verification

Categories

Platforms

FR-9 Work Offer

FR-9.1 Send Work Offer

Initial Work Offer form хөнгөн байна.

Fields:

Optional Campaign/Project

Title

General Content Type

Proposed Budget

Currency

Approximate Timeline

Personal Message

Эхний санал дээр дараах нарийн мэдээлэл заавал шаардахгүй:

Draft deadline

Final deadline

Publish date

Revision limit

Usage rights

Detailed payment terms

Full deliverable specification

Эдгээрийг Workspace дотор тохиролцоно.

FR-9.2 Creator Response

Creator:

Interested

Counter Proposal

Decline

FR-9.3 Counter Proposal

Fields:

Requested Budget

Available Timeline

Content Idea

Additional Message

FR-9.4 Business Approval

Creator response-ийн дараа Business:

Approve Collaboration

Request Changes

Decline

Workspace зөвхөн Business Approve хийсний дараа үүснэ.

FR-9.5 Offer Status

PENDING_CREATOR_RESPONSE
INTERESTED
COUNTER_PROPOSAL_SENT
CHANGES_REQUESTED
APPROVED
DECLINED
CANCELLED

FR-10 Collaboration Workspace

FR-10.1 Workspace Creation Rule

Workspace зөвхөн:

Business offer илгээсэн

Creator response өгсөн

Business final approval хийсэн

үед үүснэ.

FR-10.2 Workspace Navigation

Overview

Negotiation

Agreement

Messages

Files

Tasks

Timeline

Contract

Payment

Deliverables

Activity

FR-10.3 Workspace Status

NEGOTIATION
AGREEMENT_REVIEW
CONTRACT_REVIEW
PAYMENT_PENDING
IN_PROGRESS
IN_REVIEW
COMPLETED
CANCELLED
DISPUTED

FR-11 Negotiation and Agreement

FR-11.1 Negotiation Fields

Workspace дотор дараах нөхцөлийг тохиролцоно:

Final Budget

Content Type

Content Count

Platform

Draft Deadline

Final Deadline

Publish Date

Revision Limit

Usage Rights

Payment Terms

Additional Requirements

FR-11.2 Agreement

Agreement нь Negotiation-ийн эцсийн тохиролцсон мэдээллийг нэгтгэнэ.

Agreement-ийг Business болон Creator тус бүр approve хийнэ.

FR-12 Messages and Files

FR-12.1 Messages

Text

File

System message

Read status

Edited status

Deleted status

FR-12.2 Realtime

Socket.IO ашиглана.

Events:

message

message

message

typing

typing

workspace

notification

FR-12.3 Files

Supported:

Image

Video

PDF

Document

ZIP

Brand assets

Brief

Draft content

Storage:

Cloudflare R2

Signed URL

FR-13 Tasks and Timeline

FR-13.1 Task Board

Columns:

To Do

In Progress

Review

Done

Task fields:

Title

Description

Assignee

Due Date

Priority

Status

FR-13.2 Timeline

Events:

Offer Sent

Creator Responded

Business Approved

Workspace Created

Agreement Approved

Contract Created

Contract Signed

Payment Funded

Deliverable Submitted

Revision Requested

Deliverable Approved

Collaboration Completed

Showcase Published

FR-14 Contract

FR-14.1 Contract Creation

Contract нь approved Agreement-аас үүснэ.

FR-14.2 Contract Fields

Collaboration

Business

Creator

Amount

Currency

Deliverables

Revision Limit

Publish Date

Retention Days

Terms

Usage Rights

Cancellation Policy

FR-14.3 Contract Status

DRAFT
PENDING_APPROVAL
CHANGES_REQUESTED
ACTIVE
TERMINATED
COMPLETED

FR-14.4 Contract Versioning

ContractVersion хадгална.

Version

Terms JSON

Document URL

Change Note

Created By

Created At

FR-15 Payment and Escrow

FR-15.1 Payment Provider

MVP:

QPay

FR-15.2 Payment Types

FUNDING
MILESTONE_RELEASE
PAYOUT
REFUND
COMMISSION

FR-15.3 Payment Status

PENDING
PROCESSING
FUNDED
RELEASED
PAID
FAILED
REFUNDED
CANCELLED

FR-15.4 Platform Commission

Default:

10%

FR-15.5 Ledger

Ledger events:

Escrow In

Creator Earning

Platform Commission

Refund

Payout

FR-15.6 Idempotency

QPay webhook callback idempotent байна.

FR-16 Deliverables

FR-16.1 Creator Submission

Creator:

Draft upload

Caption

Note

Version

Published URL

FR-16.2 Business Review

Business:

Approve

Request Revision

Reject

FR-16.3 Deliverable Status

SUBMITTED
IN_REVIEW
REVISION_REQUESTED
APPROVED
PUBLISHED

FR-16.4 Revision History

Version бүр хадгалагдана.

FR-17 Publish Proof

FR-17.1 Proof

Post URL

Screenshot

API Verification

Metrics

Last Checked At

Still Live

FR-17.2 Retention Check

Нийтлэл тохирсон хугацаанд устгагдаагүй эсэхийг background job шалгана.

FR-18 Reviews

FR-18.1 Review Rule

Review зөвхөн Completed Collaboration дээр үүснэ.

FR-18.2 Two-sided Review

Creator reviews Business

Business reviews Creator

Fields:

Rating

Comment

Published At

FR-19 Showcase

FR-19.1 Publish Rule

Showcase зөвхөн:

Collaboration COMPLETED

Business approval

Creator approval

үед public болно.

FR-19.2 Showcase Fields

Title

Description

Thumbnail

Media

Creator

Business

Platform

Published Date

Views

Likes

Saves

Shares

Featured

FR-20 Notifications

Notification types:

Work Offer

Counter Proposal

Business Approval

Workspace Created

Message

Agreement

Contract

Payment

Deliverable

Revision

Completion

Review

Showcase

Channels:

In-app

Email

Realtime Socket

Queue:

RabbitMQ

FR-21 Analytics

FR-21.1 Creator Analytics

Profile Views

Followers

Portfolio Views

Offer Count

Acceptance Rate

Earnings

Completed Collaborations

FR-21.2 Business Analytics

Offers Sent

Acceptance Rate

Active Collaborations

Total Spend

Creator Performance

Deliverable Approval Rate

FR-21.3 Platform Analytics

Users

Creators

Businesses

GMV

Commission

Active Collaborations

Completed Collaborations

Disputes

Conversion Funnel

FR-22 Admin

Admin modules:

Users

Creators

Businesses

Work Offers

Collaborations

Contracts

Payments

Refunds

Payouts

Reports

Disputes

Verification

Moderation

Audit Logs

Settings

8. Modulith Architecture

8.1 Backend Module Structure

src/
├── app.js
├── server.js
├── config/
├── shared/
│   ├── errors/
│   ├── middleware/
│   ├── utils/
│   ├── constants/
│   └── events/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── creators/
│   ├── businesses/
│   ├── discovery/
│   ├── follows/
│   ├── collections/
│   ├── work-offers/
│   ├── collaborations/
│   ├── messaging/
│   ├── contracts/
│   ├── payments/
│   ├── deliverables/
│   ├── showcase/
│   ├── reviews/
│   ├── notifications/
│   ├── analytics/
│   ├── trust-safety/
│   └── admin/
└── routes/

8.2 Module Internal Structure

module/
├── module.routes.js
├── module.controller.js
├── module.service.js
├── module.repository.js
├── module.schema.js
├── module.mapper.js
├── module.constants.js
└── index.js

Rules:

Controller HTTP only

Service business logic

Repository Prisma only

Schema Zod validation

Mapper safe response

Module repository-г өөр module шууд импортлохгүй

Module public service/API ашиглана

9. Technology Stack

9.1 Frontend

React

Vite

JavaScript

React Router DOM

Tailwind CSS

Axios

Zustand эсвэл Context API

React Hook Form

Zod

Framer Motion

Lucide React

Socket.IO Client

TanStack Query optional

9.2 Backend

Node.js

Express.js

JavaScript ES Modules

Prisma ORM

PostgreSQL

jsonwebtoken

bcrypt

zod

express-async-handler

cookie-parser

cors

helmet

express-rate-limit

multer

resend

socket.io

amqplib

winston

morgan

9.3 Infrastructure

PostgreSQL

Redis

RabbitMQ

Cloudflare R2

QPay

Resend

Vercel

Render

10. Frontend–Backend Integration

10.1 API Client

Frontend Axios instance:

src/api/axiosClient.js

Requirements:

VITE_API_BASE_URL

withCredentials: true

Authorization Bearer token

Automatic refresh interceptor

Single refresh promise

Infinite loop protection

10.2 Auth State

Access token memory state

Refresh token HTTP-only cookie

Current user context

Session restore

ProtectedRoute

RoleRoute

10.3 API Files

src/api/
├── auth.api.js
├── user.api.js
├── creator.api.js
├── business.api.js
├── discover.api.js
├── follow.api.js
├── collection.api.js
├── workOffer.api.js
├── collaboration.api.js
├── contract.api.js
├── payment.api.js
├── deliverable.api.js
├── showcase.api.js
└── notification.api.js

11. API Specification Summary

Auth

POST /api/v1/auth/register
POST /api/v1/auth/verify-email
POST /api/v1/auth/resend-otp
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me

Users

GET    /api/v1/users/me
PATCH  /api/v1/users/me
PATCH  /api/v1/users/me/password
DELETE /api/v1/users/me

Creators

POST  /api/v1/creators/profile
GET   /api/v1/creators/profile
PATCH /api/v1/creators/profile
GET   /api/v1/creators
GET   /api/v1/creators/:id

Businesses

POST  /api/v1/businesses/profile
GET   /api/v1/businesses/profile
PATCH /api/v1/businesses/profile
GET   /api/v1/businesses
GET   /api/v1/businesses/:id

Work Offers

POST /api/v1/work-offers
GET  /api/v1/work-offers/sent
GET  /api/v1/work-offers/received
GET  /api/v1/work-offers/:id
POST /api/v1/work-offers/:id/interested
POST /api/v1/work-offers/:id/counter
POST /api/v1/work-offers/:id/decline
POST /api/v1/work-offers/:id/approve

Collaborations

GET /api/v1/collaborations
GET /api/v1/collaborations/:id
PATCH /api/v1/collaborations/:id/agreement

Contracts

POST /api/v1/contracts
GET  /api/v1/contracts/:id
POST /api/v1/contracts/:id/approve
POST /api/v1/contracts/:id/request-changes

Deliverables

POST /api/v1/collaborations/:id/deliverables
GET  /api/v1/collaborations/:id/deliverables
POST /api/v1/deliverables/:id/approve
POST /api/v1/deliverables/:id/request-revision

Payments

POST /api/v1/collaborations/:id/payments
GET  /api/v1/collaborations/:id/payments
POST /api/v1/payments/webhooks/qpay

Showcase

GET  /api/v1/showcase
GET  /api/v1/showcase/:id
POST /api/v1/collaborations/:id/showcase
POST /api/v1/showcase/:id/approve

12. Database Entities

Core entities:

User

AuthToken

VerificationCode

CreatorProfile

BusinessProfile

SocialAccount

SocialStat

PortfolioItem

WorkOffer

Collaboration

Conversation

ConversationMember

Message

Contract

ContractVersion

Deliverable

Payment

LedgerEntry

Review

ShowcaseItem

Follow

Collection

CollectionItem

Notification

TrustCase

AnalyticsEvent

AdminAction

13. Security Requirements

OWASP Top 10

JWT access token

Refresh token rotation

HTTP-only secure cookie

OTP verification

bcrypt password hashing

SHA-256 token hashing

Rate limiting

Zod validation

IDOR protection

Ownership checks

Role checks

Soft delete

Signed file URLs

OAuth token encryption

Audit logs

Webhook signature verification

Idempotency

Sensitive log redaction

14. Non-Functional Requirements

Performance

API p95 < 400ms

Cursor pagination

Prisma select

Database indexes

Redis cache

Background jobs

Availability

Graceful shutdown

Retry policy

DLQ

Health checks

Database reconnect strategy

Scalability

Stateless API

Redis Socket.IO adapter

RabbitMQ workers

Object storage

Horizontal scaling ready

SEO

Public Showcase

Creator Profile

Business Profile

Metadata

Sitemap

Structured data

Accessibility

Keyboard navigation

Visible focus

Form labels

Error announcements

Contrast compliance

Testing

Unit tests

Integration tests

API tests

State machine tests

Payment webhook tests

Authorization tests

IDOR tests

15. Background Jobs

RabbitMQ jobs:

Email send

Notification send

Social statistics sync

Publish proof check

Retention check

Auto approval timer

Payment webhook retry

Expired token cleanup

Expired OTP cleanup

Analytics aggregation

DLQ ашиглана.

16. Sprint Roadmap

Sprint 1 — Authentication

Register

OTP

Login

Refresh

Logout

Me

Error handling

Security

Frontend integration

Sprint 2 — Profiles

User Account

Creator Profile

Business Profile

Avatar

Portfolio

Frontend integration

Sprint 3 — Marketplace and Discovery

Home Showcase Feed

Discover

Search

Filters

Public Profiles

Follow

Collections

Compare

Shortlist

Sprint 4 — Work Offer

Send Offer

Interested

Counter Proposal

Decline

Business Approval

Workspace Creation

Sprint 5 — Workspace

Overview

Negotiation

Agreement

Messages

Files

Tasks

Timeline

Activity

Sprint 6 — Contract and Payment

Contract

Contract Version

QPay

Escrow

Commission

Ledger

Refund

Sprint 7 — Deliverables and Proof

Upload

Review

Revision

Approval

Publish Proof

Retention Check

Sprint 8 — Reviews and Showcase

Two-sided Review

Showcase Approval

Home Feed

Creator Portfolio

Business Showcase

Sprint 9 — Notifications and Analytics

Socket.IO

RabbitMQ

In-app notifications

Email notifications

Creator Analytics

Business Analytics

Sprint 10 — Admin

Users

Verification

Moderation

Reports

Disputes

Payments

Audit Logs

Platform Analytics

17. Definition of Done

MVP completed when:

Register → OTP → Login works

Creator and Business profile works

Discover and public profiles work

Business sends Work Offer

Creator responds

Business approves

Workspace created

Agreement completed

Contract approved

Payment funded

Deliverable submitted

Revision and approval work

Collaboration completed

Review works

Showcase published

Notifications work

Admin can manage disputes and reports

Frontend connected to backend

Core flows have integration tests

Security and ownership checks pass

Production build succeeds

18. Future Scope

TikTok API

Agency Account

UGC Marketplace

AI Matching

AI Recommendation

AI Content Performance Prediction

AI Contract Summary

Subscription Plans

Mobile App

Automated Payout

Advanced Fake Follower Detection

Calendar Integration

19. Open Questions

Instagram Graph API-аас яг ямар metrics авах боломжтой вэ?

Meta app review хугацаа хэд вэ?

Escrow-ийн хууль эрх зүйн зохицуулалт ямар байх вэ?

QPay merchant agreement ямар шаардлагатай вэ?

Комисс Business-ээс авах уу, Creator-оос авах уу?

Showcase publish хийхэд хоёр талын зөвшөөрөл заавал байх уу?

Public price харуулах эсэх

Review-г simultaneous reveal хийх эсэх

Auto approval хугацаа хэд байх вэ?

Retention check хэд хоног үргэлжлэх вэ?