# API Notes

Guardian currently uses two data paths:

1. direct client-side composables for the main app workflow
2. thin Nuxt server routes for health and backend-package examples

## Current server routes

### `GET /api/health`

Returns:

```json
{
  "ok": true,
  "service": "guardian-web",
  "time": "2026-06-17T08:42:37.412Z"
}
```

### `POST /api/bookings`

Accepts the shared `bookingRequestSchema` payload and runs it through the shared backend service.

Example:

```json
{
  "clientId": "11111111-1111-4111-8111-111111111111",
  "serviceTypeId": "event-security",
  "locationAddress": "45 Wale Street",
  "city": "Cape Town",
  "scheduledAt": "2026-06-24T15:00:00.000Z",
  "durationHours": 6,
  "guardsNeeded": 3,
  "specialInstructions": "Guest list check and backstage corridor coverage.",
  "urgencyLevel": "standard"
}
```

### `POST /api/providers/register`

Accepts the shared `providerProfileSchema` payload and runs it through the shared backend service.

Example:

```json
{
  "userId": "22222222-2222-4222-8222-222222222222",
  "companyName": "Thabo Secure Group",
  "licenseNumber": "PSIRA-123456",
  "yearsExperience": 11,
  "hourlyRateCents": 28500,
  "bio": "Rapid-response team for events, estates, and executive movement.",
  "coverageAreas": "Cape Town CBD, Atlantic Seaboard",
  "homeLatitude": -33.9249,
  "homeLongitude": 18.4241
}
```

## Main app data access

The real app behavior is centered in composables:

- [useBookings.ts](/Users/leecloete/Code/leedev/guardian/apps/web/composables/useBookings.ts)
- [useProviders.ts](/Users/leecloete/Code/leedev/guardian/apps/web/composables/useProviders.ts)
- [useAdmin.ts](/Users/leecloete/Code/leedev/guardian/apps/web/composables/useAdmin.ts)
- [useSession.ts](/Users/leecloete/Code/leedev/guardian/apps/web/composables/useSession.ts)

These composables:

- use demo/local persisted data when demo mode is enabled
- switch to Supabase when credentials are present
- keep the pages thin and role-focused

## Future direction

If Guardian grows beyond a single Nuxt deploy, the best next step is to move booking mutations and admin workflows behind dedicated server endpoints or a separate API service while keeping the shared schemas in `packages/domain`.
