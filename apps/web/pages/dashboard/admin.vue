<script setup lang="ts">
import { bookingStatusLabels, roleLabels } from '@guardian/domain'
import type { AppProfile, Booking, ProviderProfile } from '@guardian/domain'
import { formatCurrency, formatDateTime } from '~/utils/formatting'
import { inferCoordinate, resolveCityCoordinate } from '~/utils/geo'

type DashboardMapMarker = {
  id: string
  label: string
  detail?: string
  latitude: number
  longitude: number
  tone?: 'client' | 'provider' | 'admin' | 'active' | 'pending'
}

definePageMeta({
  middleware: ['auth', 'role'],
  roles: ['admin']
})

const admin = useAdmin()

const profiles = ref<AppProfile[]>([])
const providers = ref<ProviderProfile[]>([])
const bookings = ref<Booking[]>([])
const loading = ref(true)
const errorMessage = ref<string | null>(null)
const selectedBookingId = ref<string | null>(null)

async function loadPage() {
  loading.value = true
  errorMessage.value = null

  try {
    const snapshot = await admin.loadSnapshot()
    profiles.value = snapshot.profiles
    providers.value = snapshot.providerProfiles
    bookings.value = snapshot.bookings
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not load the admin dashboard.'
  } finally {
    loading.value = false
  }
}

await loadPage()

const profileMap = computed(() => {
  return new Map(profiles.value.map((profile) => [profile.id, profile]))
})

const openBookings = computed(() => {
  return bookings.value.filter((item) => item.status !== 'completed' && item.status !== 'cancelled')
})

const activeBookings = computed(() => {
  return bookings.value.filter((item) => ['accepted', 'en_route', 'active'].includes(item.status))
})

const pendingProviders = computed(() => {
  return providers.value.filter((provider) => provider.verificationStatus === 'pending_review')
})

const verifiedProviders = computed(() => {
  return providers.value.filter((provider) => provider.verificationStatus === 'verified')
})

const selectedBooking = computed(() => {
  if (!selectedBookingId.value) {
    return openBookings.value[0] ?? bookings.value[0] ?? null
  }

  return bookings.value.find((item) => item.id === selectedBookingId.value) ?? null
})

watch(
  () => openBookings.value.map((item) => item.id),
  (ids) => {
    if (!ids.length) {
      selectedBookingId.value = bookings.value[0]?.id ?? null
      return
    }

    if (!selectedBookingId.value || !ids.includes(selectedBookingId.value)) {
      selectedBookingId.value = ids[0] ?? null
    }
  },
  { immediate: true }
)

const mapCenter = computed<[number, number]>(() => {
  const booking = selectedBooking.value

  if (booking) {
    const coordinate = inferCoordinate({
      city: booking.city,
      address: booking.locationAddress,
      latitude: booking.latitude,
      longitude: booking.longitude,
      seed: booking.id
    })

    return [coordinate.longitude, coordinate.latitude]
  }

  const fallback = resolveCityCoordinate('Cape Town')
  return [fallback.longitude, fallback.latitude]
})

const mapMarkers = computed<DashboardMapMarker[]>(() => {
  const markers: DashboardMapMarker[] = openBookings.value.map((booking) => {
    const coordinate = inferCoordinate({
      city: booking.city,
      address: booking.locationAddress,
      latitude: booking.latitude,
      longitude: booking.longitude,
      seed: booking.id
    })

    return {
      id: booking.id,
      label: booking.status === 'active' ? 'AC' : 'BK',
      detail: `${booking.city} · ${bookingStatusLabels[booking.status]}`,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      tone:
        booking.status === 'active' || booking.status === 'en_route'
          ? ('active' as const)
          : booking.status === 'pending'
            ? ('pending' as const)
            : ('admin' as const)
    }
  })

  providers.value.forEach((provider) => {
    markers.push({
      id: `provider-${provider.userId}`,
      label: 'PR',
      detail: provider.companyName,
      latitude: provider.homeLatitude ?? -33.9249,
      longitude: provider.homeLongitude ?? 18.4241,
      tone: 'provider' as const
    })
  })

  return markers
})

async function setStatus(userId: string, status: ProviderProfile['verificationStatus']) {
  try {
    await admin.setVerificationStatus(userId, status)
    await loadPage()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not update provider status.'
  }
}

function focusBooking(bookingId: string) {
  selectedBookingId.value = bookingId
}

function providerTone(status: ProviderProfile['verificationStatus']) {
  if (status === 'verified') return 'success'
  if (status === 'pending_review') return 'warning'
  if (status === 'suspended') return 'danger'
  return 'neutral'
}

function bookingTone(status: Booking['status']) {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'danger'
  if (status === 'pending') return 'warning'
  if (status === 'accepted' || status === 'en_route') return 'info'
  return 'neutral'
}

function profileName(userId: string) {
  return profileMap.value.get(userId)?.fullName ?? userId.slice(0, 8)
}
</script>

<template>
  <main class="mx-auto max-w-[1440px] px-4 py-6 lg:px-6 lg:py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Admin workspace</p>
        <h1 class="mt-2 text-3xl font-semibold text-stone-950 md:text-5xl">
          Watch marketplace health like an operations desk, not a back-office form.
        </h1>
        <p class="mt-3 max-w-3xl text-sm leading-6 text-stone-600 md:text-base">
          Track live bookings on the map, review provider readiness, and keep a clean view of
          supply, demand, and verification pressure across the network.
        </p>
      </div>

      <StatusBadge label="Admin access" tone="danger" />
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Users" :value="profiles.length" detail="Authenticated accounts in the system" />
      <MetricCard label="Providers" :value="providers.length" detail="Draft, verified, and suspended" />
      <MetricCard label="Open bookings" :value="openBookings.length" detail="Everything not completed or cancelled" />
      <MetricCard
        label="Pipeline value"
        :value="formatCurrency(bookings.reduce((sum, item) => sum + item.quotedTotalCents, 0))"
        detail="Gross quoted value across the marketplace"
      />
    </div>

    <p
      v-if="errorMessage"
      class="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
    >
      {{ errorMessage }}
    </p>

    <div v-if="loading" class="mt-12 text-sm text-stone-500">Loading admin data...</div>

    <template v-else>
      <section class="mt-8 grid gap-6 xl:grid-cols-[1.28fr_0.92fr]">
        <div class="space-y-6">
          <section class="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
            <div class="flex flex-col gap-3 border-b border-stone-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Market map</p>
                <h2 class="mt-1 text-xl font-semibold text-stone-950">Live supply and demand</h2>
              </div>
              <div class="flex flex-wrap gap-2 text-xs text-stone-500">
                <span class="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Pending</span>
                <span class="rounded-full bg-sky-50 px-3 py-1 text-sky-700">Assigned</span>
                <span class="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">Active</span>
                <span class="rounded-full bg-stone-100 px-3 py-1">Providers</span>
              </div>
            </div>

            <div class="h-[420px]">
              <OperationsMap
                class-name="h-full w-full"
                :center="mapCenter"
                :markers="mapMarkers"
                :selected-marker-id="selectedBooking?.id ?? null"
              />
            </div>
          </section>

          <section class="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Booking queue</p>
                <h2 class="mt-1 text-xl font-semibold text-stone-950">Marketplace activity</h2>
              </div>
              <div class="flex flex-wrap gap-2">
                <StatusBadge :label="`${activeBookings.length} active`" tone="success" />
                <StatusBadge :label="`${pendingProviders.length} in review`" tone="warning" />
              </div>
            </div>

            <div class="mt-5 space-y-3">
              <button
                v-for="booking in openBookings"
                :key="booking.id"
                type="button"
                class="block w-full rounded-lg border px-4 py-4 text-left transition"
                :class="selectedBooking?.id === booking.id ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/70'"
                @click="focusBooking(booking.id)"
              >
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h3 class="text-base font-semibold text-stone-950">{{ booking.locationAddress }}</h3>
                    <p class="mt-2 text-sm text-stone-600">{{ booking.city }} · {{ formatDateTime(booking.scheduledAt) }}</p>
                    <p class="mt-2 text-sm text-stone-500">
                      Client {{ profileName(booking.clientId) }} ·
                      Provider {{ booking.providerId ? profileName(booking.providerId) : 'Unassigned' }}
                    </p>
                  </div>
                  <div class="text-right">
                    <StatusBadge :label="bookingStatusLabels[booking.status]" :tone="bookingTone(booking.status)" />
                    <p class="mt-3 text-base font-semibold text-stone-950">{{ formatCurrency(booking.quotedTotalCents) }}</p>
                  </div>
                </div>
              </button>

              <div
                v-if="!openBookings.length"
                class="rounded-lg border border-dashed border-stone-200 px-4 py-6 text-sm text-stone-500"
              >
                No open marketplace activity right now.
              </div>
            </div>
          </section>
        </div>

        <div class="space-y-6">
          <section class="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Provider review</p>
                <h2 class="mt-1 text-xl font-semibold text-stone-950">Verification queue</h2>
              </div>
              <StatusBadge :label="`${verifiedProviders.length} verified`" tone="success" />
            </div>

            <div class="mt-5 space-y-3">
              <article
                v-for="provider in providers"
                :key="provider.userId"
                class="rounded-lg border border-stone-200 p-4"
              >
                <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p class="font-semibold text-stone-950">{{ provider.companyName }}</p>
                    <p class="mt-2 text-sm text-stone-600">{{ provider.coverageAreas }}</p>
                    <p class="mt-2 text-sm text-stone-500">License {{ provider.licenseNumber }}</p>
                  </div>
                  <StatusBadge
                    :label="provider.verificationStatus.replace('_', ' ')"
                    :tone="providerTone(provider.verificationStatus)"
                  />
                </div>

                <div class="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
                    @click="setStatus(provider.userId, 'verified')"
                  >
                    Verify
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-100"
                    @click="setStatus(provider.userId, 'pending_review')"
                  >
                    Return to review
                  </button>
                  <button
                    type="button"
                    class="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:border-rose-300"
                    @click="setStatus(provider.userId, 'suspended')"
                  >
                    Suspend
                  </button>
                </div>
              </article>
            </div>
          </section>

          <section class="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Directory</p>
                <h2 class="mt-1 text-xl font-semibold text-stone-950">Profiles and roles</h2>
              </div>
              <StatusBadge :label="`${profiles.length} total`" tone="neutral" />
            </div>

            <div class="mt-5 space-y-3">
              <article
                v-for="profile in profiles"
                :key="profile.id"
                class="rounded-lg border border-stone-200 px-4 py-3"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="font-medium text-stone-950">{{ profile.fullName }}</p>
                    <p class="text-sm text-stone-500">{{ profile.email }}</p>
                  </div>
                  <StatusBadge :label="roleLabels[profile.role]" tone="info" />
                </div>
              </article>
            </div>
          </section>
        </div>
      </section>
    </template>
  </main>
</template>
