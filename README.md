# Guardian

Guardian is a security booking platform built like an Uber-style marketplace:

- clients request private security services
- providers onboard, verify, and accept work
- admins oversee users, bookings, and provider verification

The current MVP is built in Nuxt 3 with TypeScript, Tailwind, Pinia, and a Supabase-ready data model. It also ships with a working demo mode so the full product can run locally before Supabase credentials are wired in.

## Stack

- `apps/web`: Nuxt 3 app with landing page, auth flow, role dashboards, and booking workflow
- `packages/domain`: shared types, enums, validation schemas, and booking pricing logic
- `packages/backend`: reusable backend services for booking and provider flows
- `packages/supabase`: typed Supabase client helpers
- `supabase/migrations`: schema and RLS policies
- `supabase/seed.sql`: seed data for service types

## What the MVP includes

- Landing page
- Sign in / sign up flow
- Demo accounts for client, provider, and admin
- Client dashboard with validated booking form
- Booking status lifecycle:
  - `pending`
  - `accepted`
  - `en_route`
  - `active`
  - `completed`
  - `cancelled`
- Provider dashboard with:
  - onboarding form
  - availability management
  - open booking list
  - status progression for accepted jobs
- Admin dashboard with:
  - user list
  - provider review queue
  - booking overview
- Supabase schema for:
  - `profiles`
  - `service_types`
  - `provider_profiles`
  - `provider_availability`
  - `bookings`
  - `booking_status_history`
  - `payments`
  - `notifications`
- Row Level Security policies for client, provider, and admin access

## Local setup

Use Node 22 or newer.

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env.local
```

3. Choose one of the two modes:

### Demo mode

Keep:

```env
NUXT_PUBLIC_DEMO_MODE=true
```

You do not need Supabase credentials for this mode.

### Supabase mode

Set:

```env
NUXT_PUBLIC_DEMO_MODE=false
NUXT_PUBLIC_SUPABASE_URL=...
NUXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

4. Apply the SQL:

- run [supabase/migrations/0001_initial_marketplace.sql](/Users/leecloete/Code/leedev/guardian/supabase/migrations/0001_initial_marketplace.sql)
- run [supabase/seed.sql](/Users/leecloete/Code/leedev/guardian/supabase/seed.sql)

5. Start the app:

```bash
npm run dev --workspace @guardian/web
```

## Demo accounts

When demo mode is enabled, use:

- Client: `client@guardian.demo` / `demo1234`
- Provider: `provider@guardian.demo` / `demo1234`
- Admin: `admin@guardian.demo` / `demo1234`

## Commands

```bash
npm run dev
npm run typecheck
npm run build
```

## Project structure

```text
apps/web/
  components/
  composables/
  middleware/
  pages/
  plugins/
  stores/
packages/
  backend/
  domain/
  supabase/
supabase/
  migrations/
  seed.sql
```

## Notes

- The UI uses a demo/local data layer automatically when Supabase credentials are missing.
- Supabase queries are isolated in composables so the data layer can be hardened further without redesigning pages.
- The current deployment config targets a single Nuxt app on Vercel. The shared backend/domain packages keep the door open for a future separate API or mobile app.
- For Vercel, set the project Root Directory to `apps/web` and keep source files outside the root directory enabled so the shared workspace packages resolve during builds.

## Docs

- [Architecture](/Users/leecloete/Code/leedev/guardian/docs/ARCHITECTURE.md)
- [API Notes](/Users/leecloete/Code/leedev/guardian/docs/API.md)
