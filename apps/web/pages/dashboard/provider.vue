<script setup lang="ts">
import { Clock3, MapPinned, Route, Shield, Sparkles } from '@lucide/vue'
import {
  allowedProviderTransitions,
  bookingStatusLabels,
  providerAvailabilitySchema,
  providerProfileSchema,
  urgencyLevelLabels,
  weekdayLabels
} from '@guardian/domain'
import type { Booking, ProviderAvailability, ProviderProfile, ServiceType } from '@guardian/domain'
import { formatCurrency, formatDateTime, formatHour } from '~/utils/formatting'
import { inferCoordinate } from '~/utils/geo'
import { formatDistance, formatDuration } from '~/utils/maps'
import type { MapMarker, MapRoute } from '~/utils/maps'

definePageMeta({
  middleware: ['auth', 'role'],
  roles: ['provider']
})

const sessionStore = useSessionStore()
const { currentUser } = storeToRefs(sessionStore)
const bookingService = useBookings()
const providerService = useProviders()
const serviceCatalog = useServiceTypes()
const { route, loading: routeLoading, error: routeError, planRoute, clearRoute } = useRoutePlanner()

const profile = ref<ProviderProfile | null>(null)
const availability = ref<ProviderAvailability[]>([])
const availableBookings = ref<Booking[]>([])
const assignedBookings = ref<Booking[]>([])
const serviceTypes = ref<ServiceType[]>([])

const loading = ref(true)
const savingProfile = ref(false)
const savingAvailability = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const selectedOpenBookingId = ref<string | null>(null)
const selectedAssignedBookingId = ref<string | null>(null)
const routeTargetType = ref<'open' | 'assigned'>('assigned')

const profileForm = reactive({
  companyName: '',
  licenseNumber: '',
  yearsExperience: 5,
  hourlyRateCents: 25000,
  bio: '',
  coverageAreas: 'Cape Town CBD',
  homeLatitude: -33.9249,
  homeLongitude: 18.4241
})

const availabilityForm = reactive({
  weekday: 1,
  startHour: 8,
  endHour: 18,
  isAvailable: true
})

async function loadPage() {
  if (!currentUser.value) {
    return
  }

  loading.value = true
  errorMessage.value = null

  try {
    const [catalog, foundProfile, slots, openBookings, providerBookings] = await Promise.all([
      serviceCatalog.loadServiceTypes(),
      providerService.loadProviderProfile(currentUser.value.userId),
      providerService.loadAvailability(currentUser.value.userId),
      bookingService.loadAvailableBookings(),
      bookingService.loadProviderBookings(currentUser.value.userId)
    ])

    serviceTypes.value = catalog
    profile.value = foundProfile
    availability.value = slots
    availableBookings.value = openBookings
    assignedBookings.value = providerBookings.filter((item) =>
      ['accepted', 'en_route', 'active'].includes(item.status)
    )

    if (foundProfile) {
      profileForm.companyName = foundProfile.companyName
      profileForm.licenseNumber = foundProfile.licenseNumber
      profileForm.yearsExperience = foundProfile.yearsExperience
      profileForm.hourlyRateCents = foundProfile.hourlyRateCents
      profileForm.bio = foundProfile.bio
      profileForm.coverageAreas = foundProfile.coverageAreas
      profileForm.homeLatitude = foundProfile.homeLatitude ?? -33.9249
      profileForm.homeLongitude = foundProfile.homeLongitude ?? 18.4241
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not load the provider workspace.'
  } finally {
    loading.value = false
  }
}

await loadPage()

const serviceMap = computed(() => {
  return new Map(serviceTypes.value.map((service) => [service.id, service]))
})

const sortedAvailability = computed(() => {
  return [...availability.value].sort((a, b) => {
    if (a.weekday !== b.weekday) {
      return a.weekday - b.weekday
    }

    return a.startHour - b.startHour
  })
})

const selectedOpenBooking = computed(() => {
  if (!selectedOpenBookingId.value) {
    return availableBookings.value[0] ?? null
  }

  return availableBookings.value.find((item) => item.id === selectedOpenBookingId.value) ?? null
})

const selectedAssignedBooking = computed(() => {
  if (!selectedAssignedBookingId.value) {
    return assignedBookings.value[0] ?? null
  }

  return assignedBookings.value.find((item) => item.id === selectedAssignedBookingId.value) ?? null
})

watch(
  () => availableBookings.value.map((item) => item.id),
  (ids) => {
    if (!ids.length) {
      selectedOpenBookingId.value = null
      if (!assignedBookings.value.length) {
        routeTargetType.value = 'open'
      }
      return
    }

    if (!selectedOpenBookingId.value || !ids.includes(selectedOpenBookingId.value)) {
      selectedOpenBookingId.value = ids[0] ?? null
    }

    if (!assignedBookings.value.length) {
      routeTargetType.value = 'open'
    }
  },
  { immediate: true }
)

watch(
  () => assignedBookings.value.map((item) => item.id),
  (ids) => {
    if (!ids.length) {
      selectedAssignedBookingId.value = null
      if (availableBookings.value.length) {
        routeTargetType.value = 'open'
      }
      return
    }

    if (!selectedAssignedBookingId.value || !ids.includes(selectedAssignedBookingId.value)) {
      selectedAssignedBookingId.value = ids[0] ?? null
    }

    routeTargetType.value = 'assigned'
  },
  { immediate: true }
)

const routeTargetBooking = computed(() => {
  return routeTargetType.value === 'assigned'
    ? selectedAssignedBooking.value
    : selectedOpenBooking.value
})

const mapCenter = computed<[number, number]>(() => {
  const target = routeTargetBooking.value

  if (target) {
    const coordinate = inferCoordinate({
      city: target.city,
      address: target.locationAddress,
      latitude: target.latitude,
      longitude: target.longitude,
      seed: target.id
    })

    return [coordinate.longitude, coordinate.latitude]
  }

  return [profileForm.homeLongitude, profileForm.homeLatitude]
})

const mapMarkers = computed<MapMarker[]>(() => {
  const markers: MapMarker[] = availableBookings.value.map((booking) => {
    const coordinate = inferCoordinate({
      city: booking.city,
      address: booking.locationAddress,
      latitude: booking.latitude,
      longitude: booking.longitude,
      seed: booking.id
    })
    const service = serviceMap.value.get(booking.serviceTypeId)

    return {
      id: booking.id,
      label: service?.icon ?? 'OP',
      detail: `${booking.locationAddress} · ${urgencyLevelLabels[booking.urgencyLevel]}`,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      tone: 'pending'
    }
  })

  assignedBookings.value.forEach((booking) => {
    const coordinate = inferCoordinate({
      city: booking.city,
      address: booking.locationAddress,
      latitude: booking.latitude,
      longitude: booking.longitude,
      seed: booking.id
    })
    const service = serviceMap.value.get(booking.serviceTypeId)

    markers.push({
      id: booking.id,
      label: service?.icon ?? 'AS',
      detail: `${booking.locationAddress} · ${bookingStatusLabels[booking.status]}`,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      tone: booking.status === 'active' || booking.status === 'en_route' ? 'active' : 'provider'
    })
  })

  markers.push({
    id: 'home-base',
    label: 'HQ',
    detail: profileForm.companyName || 'Home base',
    latitude: profileForm.homeLatitude,
    longitude: profileForm.homeLongitude,
    tone: 'provider'
  })

  return markers
})

const mapRoutes = computed<MapRoute[]>(() => {
  if (!route.value) {
    return []
  }

  return [
    {
      id: `${routeTargetType.value}-${routeTargetBooking.value?.id ?? 'route'}`,
      coordinates: route.value.geometry.coordinates,
      tone: routeTargetType.value === 'assigned' ? 'primary' : 'muted'
    }
  ]
})

const coveredDays = computed(() => new Set(availability.value.map((slot) => slot.weekday)).size)

watch(
  () => [
    routeTargetType.value,
    routeTargetBooking.value?.id,
    profileForm.homeLatitude,
    profileForm.homeLongitude
  ],
  async () => {
    const target = routeTargetBooking.value

    if (!target) {
      clearRoute()
      return
    }

    const destination = inferCoordinate({
      city: target.city,
      address: target.locationAddress,
      latitude: target.latitude,
      longitude: target.longitude,
      seed: target.id
    })

    await planRoute({
      startLatitude: profileForm.homeLatitude,
      startLongitude: profileForm.homeLongitude,
      endLatitude: destination.latitude,
      endLongitude: destination.longitude
    })
  },
  { immediate: true }
)

async function submitProfile() {
  if (!currentUser.value) {
    return
  }

  errorMessage.value = null
  successMessage.value = null
  savingProfile.value = true

  try {
    profile.value = await providerService.saveProviderProfile(
      providerProfileSchema.parse({
        userId: currentUser.value.userId,
        ...profileForm
      })
    )

    successMessage.value = 'Provider profile saved.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not save the provider profile.'
  } finally {
    savingProfile.value = false
  }
}

async function submitAvailability() {
  if (!currentUser.value) {
    return
  }

  errorMessage.value = null
  successMessage.value = null
  savingAvailability.value = true

  try {
    await providerService.saveAvailability(
      providerAvailabilitySchema.parse({
        providerId: currentUser.value.userId,
        ...availabilityForm
      })
    )

    availability.value = await providerService.loadAvailability(currentUser.value.userId)
    successMessage.value = 'Availability saved.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not save availability.'
  } finally {
    savingAvailability.value = false
  }
}

async function acceptBooking(bookingId: string) {
  if (!currentUser.value) {
    return
  }

  try {
    await bookingService.acceptBooking(bookingId, currentUser.value.userId)
    await loadPage()
    successMessage.value = 'Booking accepted. Dispatch updated.'
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not accept the booking.'
  }
}

async function moveBooking(bookingId: string, nextStatus: Booking['status']) {
  if (!currentUser.value) {
    return
  }

  try {
    await bookingService.updateBookingStatus(bookingId, nextStatus, currentUser.value.userId)
    await loadPage()
    successMessage.value = `Booking marked ${bookingStatusLabels[nextStatus].toLowerCase()}.`
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not update the booking.'
  }
}

function focusOpenBooking(bookingId: string) {
  selectedOpenBookingId.value = bookingId
  routeTargetType.value = 'open'
}

function focusAssignedBooking(bookingId: string) {
  selectedAssignedBookingId.value = bookingId
  routeTargetType.value = 'assigned'
}

function statusTone(status: Booking['status']) {
  if (status === 'active' || status === 'completed') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'accepted' || status === 'en_route') return 'info'
  if (status === 'cancelled') return 'danger'
  return 'neutral'
}

function providerTone(status: ProviderProfile['verificationStatus'] | undefined) {
  if (status === 'verified') return 'success'
  if (status === 'pending_review') return 'warning'
  if (status === 'suspended') return 'danger'
  return 'neutral'
}
</script>

<template>
  <main class="mx-auto max-w-[1440px] px-4 py-6 lg:px-6 lg:py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Provider workspace</p>
        <h1 class="mt-2 text-3xl font-semibold text-stone-950 md:text-5xl">
          Run patrol, availability, and route previews from one board.
        </h1>
        <p class="mt-3 max-w-3xl text-sm leading-6 text-stone-600 md:text-base">
          The best part of Uber’s operator flows is that the next move is always obvious. Same idea here:
          see open work, preview the approach, and move active jobs through dispatch cleanly.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <StatusBadge
          :label="profile?.verificationStatus?.replace('_', ' ') ?? 'draft'"
          :tone="providerTone(profile?.verificationStatus)"
        />
        <StatusBadge :label="`${assignedBookings.length} active jobs`" tone="info" />
      </div>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Open requests" :value="availableBookings.length" detail="Ready to claim nearby" />
      <MetricCard label="Assigned jobs" :value="assignedBookings.length" detail="Accepted, en route, or active" />
      <MetricCard label="Coverage days" :value="coveredDays" detail="Unique weekdays with operating windows" />
      <MetricCard
        label="Base rate"
        :value="formatCurrency(profile?.hourlyRateCents ?? profileForm.hourlyRateCents)"
        detail="Hourly pricing before add-ons"
      />
    </div>

    <p
      v-if="errorMessage"
      class="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="successMessage"
      class="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
    >
      {{ successMessage }}
    </p>

    <div v-if="loading" class="mt-12 text-sm text-stone-500">Loading provider operations...</div>

    <template v-else>
      <section class="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.92fr]">
        <div class="space-y-6">
          <section class="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
            <div class="flex flex-col gap-3 border-b border-stone-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Coverage map</p>
                <h2 class="mt-1 text-xl font-semibold text-stone-950">Nearby demand and active jobs</h2>
              </div>
              <div class="flex flex-wrap gap-2 text-xs text-stone-500">
                <span class="rounded-full bg-stone-100 px-3 py-1">Home base</span>
                <span class="rounded-full bg-amber-50 px-3 py-1 text-amber-700">Open requests</span>
                <span class="rounded-full bg-sky-50 px-3 py-1 text-sky-700">Assigned jobs</span>
              </div>
            </div>

            <div class="px-5 py-4">
              <div class="grid gap-3 rounded-[22px] bg-stone-50 px-4 py-4 md:grid-cols-[1.1fr_auto] md:items-center">
                <div>
                  <p class="text-sm font-medium text-stone-500">
                    {{ routeTargetType === 'assigned' ? 'Current route' : 'Preview approach' }}
                  </p>
                  <p class="mt-1 text-lg font-semibold text-stone-950">
                    {{ routeTargetBooking?.locationAddress ?? 'Select a booking to preview the route' }}
                  </p>
                  <p class="mt-1 text-sm text-stone-500">
                    {{ routeTargetBooking ? `${routeTargetBooking.city} · ${bookingStatusLabels[routeTargetBooking.status]}` : 'Distance and ETA appear here once a booking is selected.' }}
                  </p>
                </div>

                <div class="flex flex-wrap gap-2 md:justify-end">
                  <div class="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-stone-700 shadow-sm">
                    <Clock3 class="h-4 w-4 text-stone-500" />
                    <span v-if="route">{{ formatDuration(route.durationSeconds) }}</span>
                    <span v-else-if="routeLoading">Calculating ETA...</span>
                    <span v-else>No ETA yet</span>
                  </div>
                  <div class="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-stone-700 shadow-sm">
                    <Route class="h-4 w-4 text-stone-500" />
                    <span v-if="route">{{ formatDistance(route.distanceMeters) }}</span>
                    <span v-else>Distance pending</span>
                  </div>
                </div>
              </div>

              <p v-if="routeError" class="mt-3 text-sm text-rose-700">{{ routeError }}</p>
            </div>

            <div class="h-[420px]">
              <OperationsMap
                class-name="h-full w-full"
                :center="mapCenter"
                :markers="mapMarkers"
                :routes="mapRoutes"
                :selected-marker-id="routeTargetBooking?.id ?? 'home-base'"
              />
            </div>
          </section>

          <section class="grid gap-6 lg:grid-cols-2">
            <section class="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Open queue</p>
                  <h2 class="mt-1 text-xl font-semibold text-stone-950">Requests near you</h2>
                </div>
                <StatusBadge :label="`${availableBookings.length} open`" tone="warning" />
              </div>

              <div v-if="availableBookings.length" class="mt-5 space-y-3">
                <button
                  v-for="booking in availableBookings"
                  :key="booking.id"
                  type="button"
                  class="block w-full rounded-lg border px-4 py-4 text-left transition"
                  :class="selectedOpenBooking?.id === booking.id ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/70'"
                  @click="focusOpenBooking(booking.id)"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p class="text-sm text-stone-500">
                        {{ serviceMap.get(booking.serviceTypeId)?.name ?? booking.serviceTypeId }}
                      </p>
                      <h3 class="mt-1 text-base font-semibold text-stone-950">{{ booking.locationAddress }}</h3>
                      <p class="mt-2 text-sm text-stone-600">{{ booking.city }} · {{ formatDateTime(booking.scheduledAt) }}</p>
                      <p class="mt-2 text-sm text-stone-500">
                        {{ booking.guardsNeeded }} guard<span v-if="booking.guardsNeeded > 1">s</span>
                        · {{ booking.durationHours }}h
                      </p>
                    </div>

                    <div class="text-right">
                      <StatusBadge :label="urgencyLevelLabels[booking.urgencyLevel]" tone="warning" />
                      <p class="mt-3 text-base font-semibold text-stone-950">
                        {{ formatCurrency(booking.quotedTotalCents) }}
                      </p>
                    </div>
                  </div>
                </button>

                <div v-if="selectedOpenBooking" class="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-medium text-stone-500">Selected request</p>
                      <p class="mt-1 font-semibold text-stone-950">{{ selectedOpenBooking.locationAddress }}</p>
                      <p class="mt-2 text-sm text-stone-600">
                        {{ routeTargetType === 'open' && route ? `${formatDuration(route.durationSeconds)} away · ${formatDistance(route.distanceMeters)}` : 'Tap to preview the approach on the map.' }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="rounded-full bg-stone-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-800"
                      @click="acceptBooking(selectedOpenBooking.id)"
                    >
                      Accept booking
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="mt-5 rounded-[24px] border border-dashed border-stone-200 bg-stone-50 p-6">
                <div class="flex items-start gap-4">
                  <span class="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm">
                    <Sparkles class="h-5 w-5 text-stone-700" />
                  </span>
                  <div>
                    <p class="text-lg font-semibold text-stone-950">No open requests right now</p>
                    <p class="mt-2 text-sm leading-6 text-stone-600">
                      Keep availability fresh so you stay ready when new demand hits this zone.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section class="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Live assignments</p>
                  <h2 class="mt-1 text-xl font-semibold text-stone-950">Advance active work</h2>
                </div>
                <StatusBadge :label="`${assignedBookings.length} in motion`" tone="info" />
              </div>

              <div v-if="assignedBookings.length" class="mt-5 space-y-3">
                <button
                  v-for="booking in assignedBookings"
                  :key="booking.id"
                  type="button"
                  class="block w-full rounded-lg border px-4 py-4 text-left transition"
                  :class="selectedAssignedBooking?.id === booking.id ? 'border-stone-900 bg-stone-50' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50/70'"
                  @click="focusAssignedBooking(booking.id)"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h3 class="text-base font-semibold text-stone-950">{{ booking.locationAddress }}</h3>
                      <p class="mt-2 text-sm text-stone-600">{{ formatDateTime(booking.scheduledAt) }}</p>
                    </div>
                    <StatusBadge :label="bookingStatusLabels[booking.status]" :tone="statusTone(booking.status)" />
                  </div>
                </button>

                <div v-if="selectedAssignedBooking" class="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-medium text-stone-500">Dispatch actions</p>
                      <p class="mt-1 font-semibold text-stone-950">{{ selectedAssignedBooking.locationAddress }}</p>
                    </div>
                    <div class="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-stone-600">
                      <MapPinned class="h-3.5 w-3.5" />
                      {{ route ? formatDuration(route.durationSeconds) : 'Route ready' }}
                    </div>
                  </div>

                  <div class="mt-3 flex flex-wrap gap-2">
                    <button
                      v-for="nextStatus in allowedProviderTransitions[selectedAssignedBooking.status]"
                      :key="nextStatus"
                      type="button"
                      class="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-100"
                      @click="moveBooking(selectedAssignedBooking.id, nextStatus)"
                    >
                      Mark {{ bookingStatusLabels[nextStatus] }}
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="mt-5 rounded-[24px] border border-dashed border-stone-200 bg-stone-50 p-6">
                <div class="flex items-start gap-4">
                  <span class="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm">
                    <Shield class="h-5 w-5 text-stone-700" />
                  </span>
                  <div>
                    <p class="text-lg font-semibold text-stone-950">No assigned work yet</p>
                    <p class="mt-2 text-sm leading-6 text-stone-600">
                      Claim a nearby request to light up route guidance, ETA tracking, and dispatch transitions.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </div>

        <div class="space-y-6">
          <form class="rounded-lg border border-stone-200 bg-white p-5 shadow-sm" @submit.prevent="submitProfile">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Verification profile</p>
                <h2 class="mt-1 text-xl font-semibold text-stone-950">Provider setup</h2>
              </div>
              <StatusBadge
                :label="profile?.verificationStatus?.replace('_', ' ') ?? 'draft'"
                :tone="providerTone(profile?.verificationStatus)"
              />
            </div>

            <div class="mt-5 grid gap-4">
              <label class="block">
                <span class="mb-2 block text-sm font-medium text-stone-600">Company / trading name</span>
                <input
                  v-model="profileForm.companyName"
                  type="text"
                  class="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-400"
                />
              </label>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-stone-600">License number</span>
                  <input
                    v-model="profileForm.licenseNumber"
                    type="text"
                    class="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-400"
                  />
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-stone-600">Years experience</span>
                  <input
                    v-model.number="profileForm.yearsExperience"
                    type="number"
                    min="0"
                    max="50"
                    class="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-400"
                  />
                </label>
              </div>

              <label class="block">
                <span class="mb-2 block text-sm font-medium text-stone-600">Hourly rate (cents)</span>
                <input
                  v-model.number="profileForm.hourlyRateCents"
                  type="number"
                  min="5000"
                  class="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-400"
                />
              </label>

              <label class="block">
                <span class="mb-2 block text-sm font-medium text-stone-600">Coverage areas</span>
                <input
                  v-model="profileForm.coverageAreas"
                  type="text"
                  class="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-400"
                />
              </label>

              <div class="grid gap-4 md:grid-cols-2">
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-stone-600">Base latitude</span>
                  <input
                    v-model.number="profileForm.homeLatitude"
                    type="number"
                    step="0.0001"
                    class="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-400"
                  />
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-stone-600">Base longitude</span>
                  <input
                    v-model.number="profileForm.homeLongitude"
                    type="number"
                    step="0.0001"
                    class="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-400"
                  />
                </label>
              </div>

              <label class="block">
                <span class="mb-2 block text-sm font-medium text-stone-600">Operational bio</span>
                <textarea
                  v-model="profileForm.bio"
                  rows="4"
                  class="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-400"
                />
              </label>
            </div>

            <button
              type="submit"
              class="mt-5 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="savingProfile"
            >
              {{ savingProfile ? 'Saving...' : 'Save profile' }}
            </button>
          </form>

          <form class="rounded-lg border border-stone-200 bg-white p-5 shadow-sm" @submit.prevent="submitAvailability">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Availability</p>
                <h2 class="mt-1 text-xl font-semibold text-stone-950">Weekly operating windows</h2>
              </div>
              <StatusBadge :label="`${availability.length} slots`" tone="neutral" />
            </div>

            <div class="mt-5 grid gap-4 md:grid-cols-3">
              <label class="block">
                <span class="mb-2 block text-sm font-medium text-stone-600">Day</span>
                <select
                  v-model.number="availabilityForm.weekday"
                  class="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-400"
                >
                  <option v-for="(label, index) in weekdayLabels" :key="label" :value="index">{{ label }}</option>
                </select>
              </label>
              <label class="block">
                <span class="mb-2 block text-sm font-medium text-stone-600">Start hour</span>
                <input
                  v-model.number="availabilityForm.startHour"
                  type="number"
                  min="0"
                  max="23"
                  class="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-400"
                />
              </label>
              <label class="block">
                <span class="mb-2 block text-sm font-medium text-stone-600">End hour</span>
                <input
                  v-model.number="availabilityForm.endHour"
                  type="number"
                  min="1"
                  max="24"
                  class="w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:border-stone-400"
                />
              </label>
            </div>

            <button
              type="submit"
              class="mt-5 rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-400 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="savingAvailability"
            >
              {{ savingAvailability ? 'Saving...' : 'Add availability' }}
            </button>

            <div class="mt-5 space-y-2">
              <article
                v-for="slot in sortedAvailability"
                :key="slot.id"
                class="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700"
              >
                {{ weekdayLabels[slot.weekday] }} · {{ formatHour(slot.startHour) }} - {{ formatHour(slot.endHour) }}
              </article>

              <div
                v-if="!sortedAvailability.length"
                class="rounded-lg border border-dashed border-stone-200 px-4 py-6 text-sm text-stone-500"
              >
                No weekly operating windows yet.
              </div>
            </div>
          </form>
        </div>
      </section>
    </template>
  </main>
</template>
