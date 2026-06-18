<script setup lang="ts">
import { ArrowUpRight, Clock3, MapPin, Shield, Sparkles } from '@lucide/vue'
import {
  bookingRequestSchema,
  bookingStatusLabels,
  estimateBookingTotal,
  urgencyLevelLabels
} from '@guardian/domain'
import type { Booking, ServiceType, ServiceTypeId, UrgencyLevel } from '@guardian/domain'
import { formatCurrency, formatDateTime } from '~/utils/formatting'
import { inferCoordinate, resolveCityCoordinate } from '~/utils/geo'
import type { MapMarker, PlaceSuggestion } from '~/utils/maps'

definePageMeta({
  middleware: ['auth', 'role'],
  roles: ['client']
})

const sessionStore = useSessionStore()
const { currentUser } = storeToRefs(sessionStore)
const bookingService = useBookings()
const serviceCatalog = useServiceTypes()

const serviceTypes = ref<ServiceType[]>([])
const bookings = ref<Booking[]>([])
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const selectedBookingId = ref<string | null>(null)
const selectedPlace = ref<PlaceSuggestion | null>(null)

const form = reactive<{
  serviceTypeId: ServiceTypeId
  locationAddress: string
  city: string
  scheduledAt: string
  durationHours: number
  guardsNeeded: number
  specialInstructions: string
  urgencyLevel: UrgencyLevel
}>({
  serviceTypeId: 'event-security',
  locationAddress: '',
  city: 'Cape Town',
  scheduledAt: '',
  durationHours: 4,
  guardsNeeded: 2,
  specialInstructions: '',
  urgencyLevel: 'standard'
})

const urgencyOptions: UrgencyLevel[] = ['standard', 'priority', 'critical']

async function loadPage() {
  if (!currentUser.value) {
    return
  }

  loading.value = true
  errorMessage.value = null

  try {
    const [catalog, clientBookings] = await Promise.all([
      serviceCatalog.loadServiceTypes(),
      bookingService.loadClientBookings(currentUser.value.userId)
    ])

    serviceTypes.value = catalog
    bookings.value = clientBookings
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not load the workspace.'
  } finally {
    loading.value = false
  }
}

await loadPage()

const serviceMap = computed(() => {
  return new Map(serviceTypes.value.map((service) => [service.id, service]))
})

const liveBookings = computed(() => {
  return bookings.value.filter((item) => ['pending', 'accepted', 'en_route', 'active'].includes(item.status))
})

const completedBookings = computed(() => {
  return bookings.value.filter((item) => item.status === 'completed')
})

const selectedBooking = computed(() => {
  if (!selectedBookingId.value) {
    return liveBookings.value[0] ?? bookings.value[0] ?? null
  }

  return bookings.value.find((item) => item.id === selectedBookingId.value) ?? null
})

watch(
  () => liveBookings.value.map((item) => item.id),
  (openIds) => {
    if (!openIds.length) {
      selectedBookingId.value = bookings.value[0]?.id ?? null
      return
    }

    if (!selectedBookingId.value || !openIds.includes(selectedBookingId.value)) {
      selectedBookingId.value = openIds[0] ?? null
    }
  },
  { immediate: true }
)

watch(
  () => form.locationAddress,
  (address) => {
    if (selectedPlace.value && address !== selectedPlace.value.address) {
      selectedPlace.value = null
    }
  }
)

const cityCenter = computed<[number, number]>(() => {
  const city = selectedBooking.value?.city ?? selectedPlace.value?.city ?? form.city
  const coordinate = resolveCityCoordinate(city)

  return [coordinate.longitude, coordinate.latitude]
})

const requestPreview = computed<MapMarker | null>(() => {
  if (!form.locationAddress.trim()) {
    return null
  }

  const coordinate = selectedPlace.value
    ? {
        latitude: selectedPlace.value.latitude,
        longitude: selectedPlace.value.longitude
      }
    : inferCoordinate({
        city: form.city,
        address: form.locationAddress,
        seed: 'request-preview'
      })

  const service = serviceMap.value.get(form.serviceTypeId)

  return {
    id: 'request-preview',
    label: service?.icon ?? 'RQ',
    detail: `${service?.name ?? 'Draft request'} · ${urgencyLevelLabels[form.urgencyLevel]}`,
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    tone: 'pending'
  }
})

const mapMarkers = computed<MapMarker[]>(() => {
  const markers: MapMarker[] = liveBookings.value.map((booking) => {
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
      label: service?.icon ?? 'GD',
      detail: `${booking.locationAddress} · ${bookingStatusLabels[booking.status]}`,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      tone: booking.status === 'active' || booking.status === 'en_route' ? 'active' : 'client'
    }
  })

  if (requestPreview.value) {
    markers.push(requestPreview.value)
  }

  return markers
})

const estimatedTotal = computed(() => {
  if (!currentUser.value || !form.scheduledAt) {
    return null
  }

  const parsed = bookingRequestSchema.safeParse({
    clientId: currentUser.value.userId,
    serviceTypeId: form.serviceTypeId,
    locationAddress: form.locationAddress,
    city: selectedPlace.value?.city ?? form.city,
    latitude: selectedPlace.value?.latitude,
    longitude: selectedPlace.value?.longitude,
    scheduledAt: form.scheduledAt,
    durationHours: form.durationHours,
    guardsNeeded: form.guardsNeeded,
    specialInstructions: form.specialInstructions || undefined,
    urgencyLevel: form.urgencyLevel
  })

  if (!parsed.success) {
    return null
  }

  return estimateBookingTotal(parsed.data)
})

async function submitBooking() {
  if (!currentUser.value) {
    return
  }

  errorMessage.value = null
  successMessage.value = null
  submitting.value = true

  try {
    const coordinate = selectedPlace.value
      ? {
          latitude: selectedPlace.value.latitude,
          longitude: selectedPlace.value.longitude
        }
      : inferCoordinate({
          city: form.city,
          address: form.locationAddress,
          seed: `${currentUser.value.userId}:${form.scheduledAt}`
        })

    const parsed = bookingRequestSchema.parse({
      clientId: currentUser.value.userId,
      serviceTypeId: form.serviceTypeId,
      locationAddress: form.locationAddress,
      city: selectedPlace.value?.city ?? form.city,
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
      specialInstructions: form.specialInstructions || undefined,
      scheduledAt: form.scheduledAt,
      durationHours: form.durationHours,
      guardsNeeded: form.guardsNeeded,
      urgencyLevel: form.urgencyLevel
    })

    await bookingService.createBooking(parsed)
    successMessage.value = 'Coverage requested. Dispatch is tracking it now.'

    form.locationAddress = ''
    form.city = 'Cape Town'
    form.scheduledAt = ''
    form.durationHours = 4
    form.guardsNeeded = 2
    form.specialInstructions = ''
    form.urgencyLevel = 'standard'
    selectedPlace.value = null

    bookings.value = await bookingService.loadClientBookings(currentUser.value.userId)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not create the booking.'
  } finally {
    submitting.value = false
  }
}

async function cancelBooking(bookingId: string) {
  try {
    await bookingService.cancelBooking(bookingId)

    if (currentUser.value) {
      bookings.value = await bookingService.loadClientBookings(currentUser.value.userId)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not cancel the booking.'
  }
}

function adjustCount(field: 'durationHours' | 'guardsNeeded', delta: number, min: number, max: number) {
  form[field] = Math.min(max, Math.max(min, form[field] + delta))
}

function focusBooking(bookingId: string) {
  selectedBookingId.value = bookingId
}

function applySuggestion(place: PlaceSuggestion) {
  selectedPlace.value = place
  form.locationAddress = place.address
  form.city = place.city
}

function statusTone(status: Booking['status']) {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'danger'
  if (status === 'pending') return 'warning'
  if (status === 'accepted' || status === 'en_route') return 'info'
  return 'neutral'
}

function scrollToComposer() {
  document.getElementById('coverage-composer')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}
</script>

<template>
  <main class="mx-auto max-w-[1440px] px-4 py-6 lg:px-6 lg:py-8">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Client workspace</p>
        <h1 class="mt-2 text-3xl font-semibold text-stone-950 md:text-5xl">
          Request protection from a live dispatch surface.
        </h1>
        <p class="mt-3 max-w-3xl text-sm leading-6 text-stone-600 md:text-base">
          Search the exact venue, tune the coverage plan, and keep every active request visible on the map.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <StatusBadge :label="`${liveBookings.length} live`" tone="info" />
        <StatusBadge :label="`${completedBookings.length} completed`" tone="success" />
      </div>
    </div>

    <div class="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
      <MetricCard
        label="Active coverage"
        :value="liveBookings.filter((item) => ['accepted', 'en_route', 'active'].includes(item.status)).length"
        detail="Accepted, moving, or on site"
      />
      <MetricCard label="Pending requests" :value="liveBookings.filter((item) => item.status === 'pending').length" />
      <MetricCard
        label="Live spend"
        :value="formatCurrency(liveBookings.reduce((sum, item) => sum + item.quotedTotalCents, 0))"
      />
      <MetricCard
        label="Average team size"
        :value="bookings.length ? (bookings.reduce((sum, item) => sum + item.guardsNeeded, 0) / bookings.length).toFixed(1) : '0.0'"
      />
    </div>

    <p
      v-if="errorMessage"
      class="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="successMessage"
      class="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
    >
      {{ successMessage }}
    </p>

    <div v-if="loading" class="mt-12 text-sm text-stone-500">Loading your dispatch workspace...</div>

    <template v-else>
      <section class="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
        <div class="space-y-5">
          <section class="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
            <div class="flex flex-col gap-4 border-b border-stone-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">Dispatch map</p>
                <h2 class="mt-1 text-xl font-semibold text-stone-950">Live jobs and request preview</h2>
              </div>
              <div class="flex flex-wrap gap-2">
                <span class="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">Search first</span>
                <span class="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Draft request</span>
                <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Active team</span>
              </div>
            </div>

            <div class="px-5 py-4">
              <div class="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-stone-50 px-4 py-3">
                <div class="flex items-center gap-3">
                  <MapPin class="h-4 w-4 text-stone-500" />
                  <div>
                    <p class="text-sm font-medium text-stone-950">
                      {{ selectedPlace ? selectedPlace.title : selectedBooking?.locationAddress ?? 'Search a location to preview it on the map' }}
                    </p>
                    <p class="text-sm text-stone-500">
                      {{ selectedPlace ? selectedPlace.subtitle : selectedBooking ? bookingStatusLabels[selectedBooking.status] : 'Address autocomplete is active' }}
                    </p>
                  </div>
                </div>
                <div class="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm">
                  <Sparkles class="h-3.5 w-3.5" />
                  Exact-place lookup
                </div>
              </div>
            </div>

            <OperationsMap
              :center="cityCenter"
              :markers="mapMarkers"
              :selected-marker-id="requestPreview ? requestPreview.id : selectedBooking?.id ?? null"
              class-name="h-[500px] lg:h-[640px]"
            />
          </section>

          <section class="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">Activity</p>
                <h2 class="mt-1 text-xl font-semibold text-stone-950">Jobs in motion</h2>
              </div>
              <p class="text-sm text-stone-500">{{ bookings.length }} total bookings</p>
            </div>

            <div v-if="bookings.length" class="mt-5 space-y-3">
              <button
                v-for="booking in bookings"
                :key="booking.id"
                type="button"
                class="flex w-full flex-col gap-4 rounded-[22px] border px-4 py-4 text-left transition md:flex-row md:items-center md:justify-between"
                :class="
                  selectedBooking?.id === booking.id
                    ? 'border-stone-950 bg-stone-950 text-white'
                    : 'border-stone-200 bg-stone-50 hover:border-stone-300'
                "
                @click="focusBooking(booking.id)"
              >
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-semibold" :class="selectedBooking?.id === booking.id ? 'text-white' : 'text-stone-950'">
                      {{ serviceMap.get(booking.serviceTypeId)?.name }}
                    </p>
                    <StatusBadge :label="bookingStatusLabels[booking.status]" :tone="statusTone(booking.status)" />
                  </div>
                  <p class="mt-1 text-sm" :class="selectedBooking?.id === booking.id ? 'text-stone-300' : 'text-stone-600'">
                    {{ booking.locationAddress }} · {{ booking.city }}
                  </p>
                  <p class="mt-1 text-sm" :class="selectedBooking?.id === booking.id ? 'text-stone-400' : 'text-stone-500'">
                    {{ formatDateTime(booking.scheduledAt) }} · {{ booking.guardsNeeded }} guards
                  </p>
                </div>

                <div class="flex items-center gap-3 md:text-right">
                  <div>
                    <p class="font-semibold" :class="selectedBooking?.id === booking.id ? 'text-white' : 'text-stone-950'">
                      {{ formatCurrency(booking.quotedTotalCents) }}
                    </p>
                    <p class="text-sm" :class="selectedBooking?.id === booking.id ? 'text-stone-400' : 'text-stone-500'">
                      {{ urgencyLevelLabels[booking.urgencyLevel] }}
                    </p>
                  </div>
                  <button
                    v-if="booking.status === 'pending'"
                    type="button"
                    class="rounded-full border px-3 py-1.5 text-xs font-medium"
                    :class="
                      selectedBooking?.id === booking.id
                        ? 'border-white/20 text-white hover:bg-white/10'
                        : 'border-stone-300 text-stone-700 hover:bg-white'
                    "
                    @click.stop="cancelBooking(booking.id)"
                  >
                    Cancel
                  </button>
                </div>
              </button>
            </div>

            <div v-else class="mt-5 rounded-[24px] border border-dashed border-stone-200 bg-stone-50 p-8">
              <div class="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
                <div class="flex items-start gap-4">
                  <span class="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-sm">
                    <Shield class="h-5 w-5 text-stone-700" />
                  </span>
                  <div>
                    <p class="text-lg font-semibold text-stone-950">No coverage requests yet</p>
                    <p class="mt-2 max-w-xl text-sm leading-6 text-stone-600">
                      Uber gets you moving quickly by putting the next action first. Same idea here:
                      start with the address, then build the request around it.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
                  @click="scrollToComposer"
                >
                  Start first request
                  <ArrowUpRight class="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside class="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section id="coverage-composer" class="rounded-[30px] border border-stone-200 bg-white p-6 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">New request</p>
                <h2 class="mt-1 text-2xl font-semibold text-stone-950">Coverage composer</h2>
              </div>
              <StatusBadge label="Live estimate" tone="success" />
            </div>

            <div class="mt-4 flex items-center gap-2 rounded-[20px] bg-stone-50 px-4 py-3 text-sm text-stone-600">
              <Clock3 class="h-4 w-4 text-stone-500" />
              Search the address first, then set timing and team size.
            </div>

            <div class="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                v-for="service in serviceTypes"
                :key="service.id"
                type="button"
                class="rounded-[22px] border p-4 text-left transition"
                :class="
                  form.serviceTypeId === service.id
                    ? 'border-stone-950 bg-stone-950 text-white'
                    : 'border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'
                "
                @click="form.serviceTypeId = service.id"
              >
                <div class="flex items-center justify-between gap-3">
                  <span class="grid h-9 w-9 place-items-center rounded-2xl text-xs font-bold"
                    :class="form.serviceTypeId === service.id ? 'bg-white/10 text-white' : 'bg-white text-stone-900'">
                    {{ service.icon }}
                  </span>
                  <span class="text-xs font-semibold" :class="form.serviceTypeId === service.id ? 'text-stone-300' : 'text-stone-500'">
                    {{ formatCurrency(service.baseRateCents) }}/hr
                  </span>
                </div>
                <p class="mt-3 font-medium">{{ service.name }}</p>
                <p class="mt-1 text-sm leading-5" :class="form.serviceTypeId === service.id ? 'text-stone-300' : 'text-stone-500'">
                  {{ service.description }}
                </p>
              </button>
            </div>

            <form class="mt-6 space-y-4" @submit.prevent="submitBooking">
              <AddressAutocomplete
                v-model="form.locationAddress"
                :city="form.city"
                placeholder="Search address, venue, estate, or hotel"
                @select="applySuggestion"
              />

              <div v-if="selectedPlace" class="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <div class="flex items-center gap-2 font-medium">
                  <Navigation class="h-4 w-4" />
                  {{ selectedPlace.title }}
                </div>
                <p class="mt-1 text-emerald-700">{{ selectedPlace.subtitle }}</p>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-stone-600">City</span>
                  <input
                    v-model="form.city"
                    type="text"
                    class="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-stone-400 focus:bg-white"
                  />
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-stone-600">Start time</span>
                  <input
                    v-model="form.scheduledAt"
                    type="datetime-local"
                    class="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-stone-400 focus:bg-white"
                  />
                </label>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="rounded-[22px] border border-stone-200 bg-stone-50 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-medium text-stone-600">Duration</p>
                      <p class="mt-1 text-2xl font-semibold text-stone-950">{{ form.durationHours }}h</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-white text-stone-700"
                        @click="adjustCount('durationHours', -1, 1, 24)"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        class="grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-white text-stone-700"
                        @click="adjustCount('durationHours', 1, 1, 24)"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div class="rounded-[22px] border border-stone-200 bg-stone-50 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-medium text-stone-600">Guards</p>
                      <p class="mt-1 text-2xl font-semibold text-stone-950">{{ form.guardsNeeded }}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-white text-stone-700"
                        @click="adjustCount('guardsNeeded', -1, 1, 12)"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        class="grid h-9 w-9 place-items-center rounded-full border border-stone-200 bg-white text-stone-700"
                        @click="adjustCount('guardsNeeded', 1, 1, 12)"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <span class="mb-2 block text-sm font-medium text-stone-600">Urgency</span>
                <div class="grid gap-2 sm:grid-cols-3">
                  <button
                    v-for="option in urgencyOptions"
                    :key="option"
                    type="button"
                    class="rounded-full px-4 py-2 text-sm font-medium transition"
                    :class="
                      form.urgencyLevel === option
                        ? 'bg-stone-950 text-white'
                        : 'border border-stone-200 bg-stone-50 text-stone-600 hover:border-stone-300'
                    "
                    @click="form.urgencyLevel = option"
                  >
                    {{ urgencyLevelLabels[option] }}
                  </button>
                </div>
              </div>

              <label class="block">
                <span class="mb-2 block text-sm font-medium text-stone-600">Special instructions</span>
                <textarea
                  v-model="form.specialInstructions"
                  rows="4"
                  placeholder="Access gates, dress code, known risks..."
                  class="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-stone-400 focus:bg-white"
                />
              </label>

              <div class="rounded-[24px] bg-stone-950 p-5 text-white">
                <div class="flex items-center justify-between gap-4">
                  <div>
                    <p class="text-sm text-stone-400">Estimated total</p>
                    <p class="mt-2 text-3xl font-semibold">
                      {{ estimatedTotal ? formatCurrency(estimatedTotal) : 'Add time to quote' }}
                    </p>
                  </div>
                  <div class="text-right text-sm text-stone-400">
                    <p>{{ form.guardsNeeded }} guards</p>
                    <p>{{ form.durationHours }} hours</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                class="w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="submitting"
              >
                {{ submitting ? 'Sending request...' : 'Request coverage' }}
              </button>
            </form>
          </section>

          <section class="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
            <p class="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">Selected job</p>
            <template v-if="selectedBooking">
              <div class="mt-3">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="text-xl font-semibold text-stone-950">
                    {{ serviceMap.get(selectedBooking.serviceTypeId)?.name }}
                  </h3>
                  <StatusBadge :label="bookingStatusLabels[selectedBooking.status]" :tone="statusTone(selectedBooking.status)" />
                </div>
                <p class="mt-2 text-sm text-stone-600">{{ selectedBooking.locationAddress }}</p>
                <p class="mt-1 text-sm text-stone-500">{{ formatDateTime(selectedBooking.scheduledAt) }}</p>
              </div>
            </template>
            <div v-else class="mt-3 rounded-[22px] bg-stone-50 p-4 text-sm text-stone-600">
              Search a location and submit your first request to start the dispatch flow.
            </div>
          </section>
        </aside>
      </section>
    </template>
  </main>
</template>
