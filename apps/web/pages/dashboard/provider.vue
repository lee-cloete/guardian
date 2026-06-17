<script setup lang="ts">
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

definePageMeta({
  middleware: ['auth', 'role'],
  roles: ['provider']
})

const sessionStore = useSessionStore()
const { currentUser } = storeToRefs(sessionStore)
const bookingService = useBookings()
const providerService = useProviders()
const serviceCatalog = useServiceTypes()

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
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not update the booking.'
  }
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
  <main class="mx-auto max-w-7xl px-6 py-12 lg:px-8">
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-wide text-emerald-300">Provider dashboard</p>
        <h1 class="mt-3 text-4xl font-semibold text-white">
          Onboard, set availability, and accept nearby work.
        </h1>
      </div>
      <StatusBadge
        :label="profile?.verificationStatus?.replace('_', ' ') ?? 'draft'"
        :tone="providerTone(profile?.verificationStatus)"
      />
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-3">
      <MetricCard label="Available requests" :value="availableBookings.length" />
      <MetricCard label="Assigned bookings" :value="assignedBookings.length" />
      <MetricCard
        label="Your base rate"
        :value="formatCurrency(profile?.hourlyRateCents ?? profileForm.hourlyRateCents)"
      />
    </div>

    <p v-if="errorMessage" class="mt-8 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
      {{ errorMessage }}
    </p>
    <p
      v-if="successMessage"
      class="mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
    >
      {{ successMessage }}
    </p>

    <section class="mt-8 grid gap-8 xl:grid-cols-[0.88fr_1.12fr]">
      <div class="space-y-8">
        <form class="rounded-[28px] border border-stone-800 bg-stone-900/60 p-7" @submit.prevent="submitProfile">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm font-semibold uppercase tracking-wide text-amber-300">Provider profile</p>
              <h2 class="mt-2 text-2xl font-semibold text-white">Verification details</h2>
            </div>
          </div>

          <div class="mt-8 grid gap-5">
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-300">Company / trading name</span>
              <input v-model="profileForm.companyName" type="text" class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300" />
            </label>
            <div class="grid gap-5 md:grid-cols-2">
              <label class="block">
                <span class="mb-2 block text-sm font-medium text-stone-300">License number</span>
                <input v-model="profileForm.licenseNumber" type="text" class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300" />
              </label>
              <label class="block">
                <span class="mb-2 block text-sm font-medium text-stone-300">Years experience</span>
                <input v-model.number="profileForm.yearsExperience" type="number" min="0" max="50" class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300" />
              </label>
            </div>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-300">Hourly rate (cents)</span>
              <input v-model.number="profileForm.hourlyRateCents" type="number" min="5000" class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300" />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-300">Coverage areas</span>
              <input v-model="profileForm.coverageAreas" type="text" class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300" />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-300">Operational bio</span>
              <textarea v-model="profileForm.bio" rows="4" class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300" />
            </label>
          </div>

          <button
            type="submit"
            class="mt-6 rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingProfile"
          >
            {{ savingProfile ? 'Saving...' : 'Save profile' }}
          </button>
        </form>

        <form class="rounded-[28px] border border-stone-800 bg-stone-900/60 p-7" @submit.prevent="submitAvailability">
          <p class="text-sm font-semibold uppercase tracking-wide text-sky-300">Availability</p>
          <h2 class="mt-2 text-2xl font-semibold text-white">Set weekly operating windows</h2>

          <div class="mt-8 grid gap-5 md:grid-cols-3">
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-300">Day</span>
              <select v-model.number="availabilityForm.weekday" class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300">
                <option v-for="(label, index) in weekdayLabels" :key="label" :value="index">{{ label }}</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-300">Start hour</span>
              <input v-model.number="availabilityForm.startHour" type="number" min="0" max="23" class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300" />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-300">End hour</span>
              <input v-model.number="availabilityForm.endHour" type="number" min="1" max="24" class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300" />
            </label>
          </div>

          <button
            type="submit"
            class="mt-6 rounded-full border border-stone-700 px-5 py-3 text-sm font-semibold text-white transition hover:border-stone-500 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingAvailability"
          >
            {{ savingAvailability ? 'Saving...' : 'Add availability' }}
          </button>

          <div class="mt-8 space-y-3">
            <article
              v-for="slot in availability"
              :key="slot.id"
              class="rounded-2xl border border-stone-800 bg-stone-950/60 px-4 py-4 text-sm text-stone-300"
            >
              {{ weekdayLabels[slot.weekday] }} · {{ formatHour(slot.startHour) }} - {{ formatHour(slot.endHour) }}
            </article>
          </div>
        </form>
      </div>

      <div class="space-y-8">
        <section class="rounded-[28px] border border-stone-800 bg-stone-900/60 p-7">
          <p class="text-sm font-semibold uppercase tracking-wide text-emerald-300">Nearby demand</p>
          <h2 class="mt-2 text-2xl font-semibold text-white">Available bookings</h2>

          <div v-if="loading" class="mt-8 text-sm text-stone-400">Loading requests...</div>
          <div v-else class="mt-8 space-y-4">
            <article
              v-for="booking in availableBookings"
              :key="booking.id"
              class="rounded-3xl border border-stone-800 bg-stone-950/60 p-5"
            >
              <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p class="text-sm text-stone-400">
                    {{ serviceTypes.find((item) => item.id === booking.serviceTypeId)?.name ?? booking.serviceTypeId }}
                  </p>
                  <h3 class="mt-1 text-xl font-medium text-white">{{ booking.locationAddress }}</h3>
                  <p class="mt-2 text-sm text-stone-300">
                    {{ booking.city }} · {{ formatDateTime(booking.scheduledAt) }}
                  </p>
                </div>
                <div class="text-right">
                  <StatusBadge :label="urgencyLevelLabels[booking.urgencyLevel]" tone="warning" />
                  <p class="mt-3 text-lg font-semibold text-white">{{ formatCurrency(booking.quotedTotalCents) }}</p>
                </div>
              </div>

              <p class="mt-4 text-sm text-stone-400">
                {{ booking.guardsNeeded }} guard<span v-if="booking.guardsNeeded > 1">s</span> · {{ booking.durationHours }}h
              </p>

              <button
                type="button"
                class="mt-5 rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-emerald-200"
                @click="acceptBooking(booking.id)"
              >
                Accept booking
              </button>
            </article>

            <div
              v-if="!availableBookings.length"
              class="rounded-3xl border border-dashed border-stone-800 bg-stone-950/50 p-8 text-sm text-stone-400"
            >
              No open bookings right now.
            </div>
          </div>
        </section>

        <section class="rounded-[28px] border border-stone-800 bg-stone-900/60 p-7">
          <p class="text-sm font-semibold uppercase tracking-wide text-amber-300">Your jobs</p>
          <h2 class="mt-2 text-2xl font-semibold text-white">Advance current assignments</h2>

          <div class="mt-8 space-y-4">
            <article
              v-for="booking in assignedBookings"
              :key="booking.id"
              class="rounded-3xl border border-stone-800 bg-stone-950/60 p-5"
            >
              <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 class="text-xl font-medium text-white">{{ booking.locationAddress }}</h3>
                  <p class="mt-2 text-sm text-stone-300">{{ formatDateTime(booking.scheduledAt) }}</p>
                </div>
                <StatusBadge :label="bookingStatusLabels[booking.status]" :tone="statusTone(booking.status)" />
              </div>

              <div class="mt-5 flex flex-wrap gap-3">
                <button
                  v-for="nextStatus in allowedProviderTransitions[booking.status]"
                  :key="nextStatus"
                  type="button"
                  class="rounded-full border border-stone-700 px-4 py-2 text-sm font-medium text-white transition hover:border-stone-500"
                  @click="moveBooking(booking.id, nextStatus)"
                >
                  Mark {{ bookingStatusLabels[nextStatus] }}
                </button>
              </div>
            </article>

            <div
              v-if="!assignedBookings.length"
              class="rounded-3xl border border-dashed border-stone-800 bg-stone-950/50 p-8 text-sm text-stone-400"
            >
              No assigned bookings yet.
            </div>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>
