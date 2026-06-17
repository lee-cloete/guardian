# Guardian Architecture

## Product

Guardian is an on-demand security marketplace.

It has three operating roles:

1. Client
2. Provider
3. Admin

The product goal is to let a client request security coverage with the same clarity and speed as an on-demand transport app, while keeping provider verification and admin oversight strong enough for a higher-trust service.

## Runtime strategy

The MVP runs in one Nuxt app, but the business model is split into reusable layers:

```text
apps/web
packages/domain
packages/backend
packages/supabase
supabase/migrations
```

That gives us:

- one deployable web surface today
- shared domain logic for future mobile/native apps
- a path to move heavy backend logic into a dedicated service later without rewriting the domain model

## Route structure

### Public

- `/`
- `/auth/sign-in`

### Protected

- `/dashboard`
- `/dashboard/client`
- `/dashboard/provider`
- `/dashboard/admin`

Protection is enforced in Nuxt route middleware using the session cookie, while the actual data boundaries are enforced in Supabase with RLS.

## Data model

### `profiles`

Core user identity and marketplace role.

### `service_types`

Platform-owned catalog of bookable security service categories.

### `provider_profiles`

Provider business details, verification status, pricing, and coverage metadata.

### `provider_availability`

Weekly operating windows for providers.

### `bookings`

The core marketplace transaction. Includes service type, location, timing, guard count, urgency, and quoted amount.

### `booking_status_history`

Audit trail of booking state changes.

### `payments`

Placeholder for payment capture and payout integration.

### `notifications`

Placeholder for operational messaging and in-app alerts.

## Booking lifecycle

```text
pending -> accepted -> en_route -> active -> completed
       \-> cancelled
accepted -> cancelled
en_route -> cancelled
active -> cancelled
```

This shape is intentionally simple for the MVP:

- clients create the request
- verified providers claim it
- providers progress the job
- admins can override the workflow when necessary

## Auth model

### Demo mode

If Supabase is not configured, the app runs with:

- demo credentials
- local persisted data
- the same screens and dashboard logic

This is for local product iteration only.

### Supabase mode

When Supabase is configured:

- email/password auth runs through Supabase Auth
- `profiles` rows are created via signup trigger plus an explicit client upsert fallback
- composables talk to Supabase directly for bookings, provider profiles, and admin data

## Security model

### UI-level protection

- Nuxt middleware blocks dashboard routes without a session cookie
- role middleware prevents users from entering the wrong dashboard

### Database-level protection

RLS is the real trust boundary:

- clients can read their own bookings and create bookings for themselves
- verified providers can claim open bookings and progress their assigned bookings
- admins can manage platform data
- users can only read their own notifications

## Known RLS risk areas

These are the places to keep especially tight as the product grows:

1. Provider claiming logic:
   the transition from unassigned `pending` to assigned `accepted` is the most sensitive booking mutation.

2. Admin overrides:
   admin powers are intentionally broad and should eventually be isolated behind stronger audit logging.

3. Notification and payment placeholders:
   these tables exist, but their workflows are still thin and should be expanded before a real production launch.

4. Demo mode:
   demo mode is convenient for local development, but it is not a substitute for real auth or RLS.

## Why the current implementation is shaped this way

The MVP optimizes for:

- a shippable surface now
- strict TypeScript boundaries in the domain layer
- clear Supabase integration points
- easy migration from local demo data to live Supabase data

That means some complexity lives in composables today instead of a dedicated API service, but the packages already create a clean path to split the backend later.
