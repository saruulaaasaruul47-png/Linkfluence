# VYRA frontend

Business–Creator marketplace frontend built with React, Vite, Tailwind CSS and React Router.

## Requirements

- Node.js 20+
- npm
- Influence Hub backend running on port 3000

## Local setup

```bash
npm install
copy .env.example .env
npm run dev
```

The Vite development server prints the local URL. Public marketplace pages still use fixture data, while register, email verification, login, session restore, and logout use the backend API.

## Environment

```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

Authentication requests use Axios with credentials enabled. Access tokens live only in memory; the rotating refresh token is an HTTP-only cookie and is never read by frontend JavaScript.

## Authentication flow

1. Register with email, optional username, display name, and a strong password.
2. Enter the six-digit code delivered by email.
3. Verification signs the user in and opens channel onboarding.
4. Existing verified users sign in directly and do not visit the welcome page.
5. A page refresh restores the session through `/auth/refresh` and `/auth/me`.
6. Logout revokes the active refresh token and clears local auth state.

## Commands

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run check
npm run preview
```

## Project structure

- `src/api` — Axios client, auth endpoints, token store, and error parsing
- `src/pages` — route-level screens
- `src/components` — reusable UI and layouts
- `src/context` — authentication and prototype feature state
- `src/lib/api-client.js` — shared API compatibility layer backed by Axios
- `src/lib/validation.js` — shared form validation helpers
- `test` — unit tests
- `things-to-do.md` — implementation checklist and backend handoff
