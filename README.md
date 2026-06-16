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

## Pinned actions

| Action                                 | Version | Commit SHA                                 |
| -------------------------------------- | ------- | ------------------------------------------ |
| actions/checkout                       | v5.0.1  | `93cb6efe18208431cddfb8368fd83d5badbf9bfd` |
| actions/setup-node                     | v5.0.0  | `a0853c24544627f65ddf259abe73b1d18a591444` |
| FirebaseExtended/action-hosting-deploy | v0.9.0  | `0cbcac4740c2bfb00d632f0b863b57713124eb5a` |

> To bump an action: change the SHA **and** the trailing `# vX.Y.Z` comment
> together. Never pin to a tag or branch.

## Required repository configuration

**Secrets** (Settings → Secrets and variables → Actions → Secrets):

| Secret                | Purpose                                                   |
| --------------------- | --------------------------------------------------------- |
| `FIREBASE_DEPLOY_SA`  | Firebase deploy service-account **JSON** (Hosting Admin). |
| `FIREBASE_PROJECT_ID` | Firebase project ID (e.g. `craftedbyk-prod`).             |

> Generate the service account via the Firebase console (Project settings →
> Service accounts) or `firebase init hosting:github`. Grant only the Hosting
> deploy role.

No build-time API URL is required: production is **same-origin** (Firebase
Hosting rewrites `/api/**` to Cloud Run), so the bundle ships with an empty
`API_BASE`.

**Variables** (Settings → Secrets and variables → Actions → Variables) — turn on
Firebase App Check (reCAPTCHA v3) + Auth. These are `NEXT_PUBLIC_*`, baked into
the client bundle at build time and **public by design** (Firebase web config +
reCAPTCHA site key are not secrets), so they are stored as **variables**, not
secrets. They are injected into the `npm run build` step of both the preview and
live deploys. Leave them unset to ship the app in its ungated mode.

| Variable                           | Purpose                                              |
| ---------------------------------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`     | Firebase web app API key.                            |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain, e.g. `craftedbyk-prod.firebaseapp.com`. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`  | Firebase project ID (e.g. `craftedbyk-prod`).        |
| `NEXT_PUBLIC_FIREBASE_APP_ID`      | Firebase web app ID (`1:NNN:web:…`).                 |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`   | reCAPTCHA **v3** site key backing App Check.         |

Set them with the `gh` CLI:

```bash
gh variable set NEXT_PUBLIC_FIREBASE_API_KEY --body "..."
gh variable set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN --body "craftedbyk-prod.firebaseapp.com"
gh variable set NEXT_PUBLIC_FIREBASE_PROJECT_ID --body "craftedbyk-prod"
gh variable set NEXT_PUBLIC_FIREBASE_APP_ID --body "..."
gh variable set NEXT_PUBLIC_RECAPTCHA_SITE_KEY --body "..."
```

> Preview channels are gated too: add each ephemeral `*.web.app` preview domain
> to the reCAPTCHA allowlist and the backend App Check/CORS config, or gated
> calls (e.g. order placement) will fail on previews.

**Environment**: create a `production` environment and (recommended) require a
reviewer and restrict it to the `main` branch.

## Project structure

```
src/
  app/                  # App Router pages (static export)
    page.tsx            # home
    shop/page.tsx       # product listing
    product/page.tsx    # product detail
    designer/page.tsx   # puzzle designer
    cart/page.tsx       # cart
    layout.tsx          # root layout
    globals.css         # global styles (plain CSS custom properties)
  components/
    SiteNav.tsx         # top navigation
    ProductCard.tsx     # product tile
    Puzzle3D.tsx        # Three.js 3D puzzle render
    PuzzlePreview.tsx   # puzzle preview
    CartContext.tsx     # React context cart state
  lib/
    api.ts              # hand-written fetch client (no codegen)
    firebase.ts         # browser-only App Check (reCAPTCHA v3) + Auth wiring
    types.ts            # hand-maintained shared TS types
    cart.ts             # cart helpers
    palette.ts          # color palette helpers
public/                 # static assets (robots.txt, fonts/, images/)
tests/
  unit/                 # Vitest + Testing Library
  e2e/                  # Playwright
```

> Styling is plain CSS (custom properties in `globals.css`) — no Tailwind/shadcn.
> The API client and types are hand-written; there is no `openapi-fetch`, Zod,
> Zustand, or codegen despite what the Stack table historically implied.
