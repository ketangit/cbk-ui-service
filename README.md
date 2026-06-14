# cbk-ui-service

Static front-end for **craftedbyk.com** — Next.js 15 (App Router) + React 19 +
TypeScript (strict), Tailwind CSS v4, shadcn/ui, exported to static HTML and
served by **Firebase Hosting**.

## Stack

| Concern   | Choice                                                     |
| --------- | ---------------------------------------------------------- |
| Framework | Next.js 15 (App Router), `output: 'export'` (static HTML)  |
| UI        | React 19, Tailwind CSS v4, shadcn/ui (Radix primitives)    |
| Data/API  | `openapi-fetch` (typed) + Zod (runtime validation)         |
| State     | Zustand                                                    |
| Tooling   | Node 24+, npm, ESLint + Prettier, Vitest + Testing Library |
| E2E       | Playwright                                                 |
| Hosting   | Firebase Hosting (serves `out/`)                           |

## Requirements

- Node **>= 24** (`.nvmrc` pins 24; `engine-strict` is on)
- npm >= 10

## Scripts

```bash
npm run dev            # local dev server
npm run build          # static export -> ./out
npm run typecheck      # tsc --noEmit
npm run lint           # next lint (ESLint 9 flat config)
npm run format:check   # prettier --check
npm run test           # Vitest unit tests
npm run test:e2e       # Playwright (builds + serves ./out)
npm run gen:api        # regenerate src/types/api.d.ts from the backend OpenAPI schema
```

## Static-export constraints

`next.config.js` sets `output: 'export'` and `images.unoptimized`. There is **no
server runtime**, so route handlers, server actions, ISR, and the Image
Optimization API are unavailable. Fetch data at build time or in the browser.

## Firebase Hosting

- `firebase.json` serves `public: "out"` with `cleanUrls`, long-lived caching for
  hashed assets, and security headers (HSTS, `X-Content-Type-Options`,
  `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`).
- `.firebaserc` default project: `craftedbyk-prod`.

## CI/CD — `.github/workflows/deploy.yml`

Three jobs, default-deny token permissions, all actions pinned to commit SHAs:

- **verify** (push + PR): typecheck, lint, format check, unit tests.
- **deploy-preview** (PRs from this repo only): builds and deploys to an
  ephemeral Firebase **preview** channel, posts the URL on the PR.
- **deploy-live** (push to `main`): builds and deploys to the **live** channel
  behind the `production` GitHub Environment.

### Pinned actions

| Action                                 | Version | Commit SHA                                 |
| -------------------------------------- | ------- | ------------------------------------------ |
| actions/checkout                       | v4.2.2  | `11bd71901bbe5b1630ceea73d27597364c9af683` |
| actions/setup-node                     | v4.4.0  | `49933ea5288caeca8642d1e84afbd3f7d6820020` |
| FirebaseExtended/action-hosting-deploy | v0.9.0  | `0cbcac4740c2bfb00d632f0b863b57713124eb5a` |

> To bump an action: change the SHA **and** the trailing `# vX.Y.Z` comment
> together. Never pin to a tag or branch.

### Required repository configuration

**Secrets** (Settings → Secrets and variables → Actions → Secrets):

| Secret                                     | Purpose                                                   |
| ------------------------------------------ | --------------------------------------------------------- |
| `FIREBASE_SERVICE_ACCOUNT_CRAFTEDBYK_PROD` | Firebase deploy service-account **JSON** (Hosting Admin). |

> Generate via the Firebase console (Project settings → Service accounts) or
> `firebase init hosting:github`. Grant only the Hosting deploy role.

**Variables** (Settings → Secrets and variables → Actions → Variables):

| Variable                   | Example                      |
| -------------------------- | ---------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.craftedbyk.com` |

**Environment**: create a `production` environment and (recommended) require a
reviewer and restrict it to the `main` branch.

## Project structure

```
src/
  app/
    (marketing)/        # public site (/, /shop, /about ...)
    (app)/dashboard/    # authenticated app shell
    layout.tsx          # root layout
  components/
    ui/                 # shadcn primitives (button, ...)
    layout/             # header, footer, shell
    features/           # composed, domain-specific components
  lib/
    api/                # openapi-fetch client + zod schemas
    utils.ts, constants.ts
  hooks/                # custom React hooks
  stores/               # Zustand stores
  types/                # shared TS types + generated api.d.ts
  styles/               # globals.css (Tailwind v4)
config/                 # site config, nav, zod env parsing
public/                 # static assets, fonts, images
tests/
  unit/                 # Vitest + Testing Library
  e2e/                  # Playwright
```
