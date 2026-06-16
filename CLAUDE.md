# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static front-end for **craftedbyk.com**: Next.js 15 (App Router) + React 19 + TypeScript (strict), exported to static HTML (`output: 'export'`) and served by Firebase Hosting from `out/`.

## Stack reality (README overstates this — trust the code)

The README lists Tailwind v4, shadcn/ui, Zustand, Zod, `openapi-fetch`, and a `gen:api` script. **None are installed.** Actual runtime deps are `next`, `react`, `react-dom`, `three`, and `firebase` (App Check + Auth, browser-only). Specifically:

- **Styling**: plain CSS with custom properties in `src/app/globals.css` — no Tailwind, no shadcn.
- **API client**: hand-written `fetch` in `src/lib/api.ts`; types are hand-maintained in `src/lib/types.ts` — no codegen, no Zod.
- **3D**: `three` directly (`src/components/Puzzle3D.tsx`).
- **State**: React only — no Zustand. Cart state lives in `src/components/CartContext.tsx`.

When adding a dependency, add it for real — don't assume the README's stack exists.

## Static-export constraints

`output: 'export'` means **no server runtime**. Route handlers, server actions, ISR, and the Image Optimization API are unavailable. Fetch data at build time or in the browser only. `images.unoptimized` and `trailingSlash: true` are required and set.

## API calls

`API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? ''`. Empty in production → **relative, same-origin** paths (Firebase rewrites `/api/**` to the Cloud Run backend). For local dev, `.env.development` sets `NEXT_PUBLIC_API_BASE=http://localhost:8080`. Keep prod requests same-origin; cross-origin calls hit backend CORS rejection.

All requests route through `apiFetch` in `src/lib/api.ts`: it attaches the App Check attestation header (`X-Firebase-AppCheck`) on every call and an `Authorization: Bearer <ID token>` only on mutating, user-owned calls (`createOrder`). When Firebase is unconfigured the helpers return `null` and no headers are added.

## Firebase App Check & Auth

`src/lib/firebase.ts` is **browser-only** Firebase wiring (App Check via reCAPTCHA **v3** — free, not Enterprise — plus Google sign-in). It initialises lazily client-side; nothing runs at build time (static-export safe). Everything **degrades gracefully** when the `NEXT_PUBLIC_FIREBASE_*` / `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` env vars are absent: token helpers return `null`, `isAuthConfigured()` is `false`, and the cart checkout login gate is skipped — this is the local-dev mode (run the backend with `APPCHECK_ENABLED=false AUTH_ENABLED=false` to match).

The vars are `NEXT_PUBLIC_*` so they're **baked into the client bundle at build time and are public by design** (Firebase web config + reCAPTCHA site key are not secrets). In CI they live as GitHub Actions **repository variables** (not secrets), injected into the `npm run build` step of both `deploy-preview` and `deploy-live`. To activate the protections in prod, set: `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`. Preview channels are gated too — their `*.web.app` domains must be added to the reCAPTCHA allowlist and backend App Check/CORS config or gated calls fail on previews.

## Commands

- `npm run lint` → `eslint .` (flat config; README's "next lint" is wrong)
- `npm run format` / `format:check` → Prettier
- `npm run typecheck` → `tsc --noEmit`
- `npm run test` → Vitest (unit, jsdom)
- `npm run test:e2e` → Playwright (builds + serves `out/`)

CI `verify` job gates on: typecheck, lint, format check, unit tests. Run them before pushing.

## Code style

Prettier enforced: single quotes, semicolons, trailing commas (`all`), `printWidth` 100, 2-space indent. TypeScript strict — fix type errors, don't suppress; `next.config.js` fails the build on type/lint errors.

## Environment

Node **>= 24** (`.nvmrc` pins 24, `engine-strict=true`). npm with `save-exact=true` — installs pin exact versions; keep version specifiers exact.

## Git etiquette

`main` is protected (push hooks reject direct pushes) — work on a branch, open a PR. Branch prefixes: `chore/`, `feat/`, `fix/`, `style/`. Push to `main` requires a merged PR; PRs run `verify` + `deploy-preview` (ephemeral Firebase channel), merge to `main` runs `deploy-live`.
