<script setup lang="ts">
import {
  bookingRequestSchema,
  bookingStatusLabels,
  estimateBookingTotal,
  urgencyLevelLabels
} from '@guardian/domain'
import type { Booking, ServiceType } from '@guardian/domain'
import { formatCurrency, formatDateTime } from '~/utils/formatting'

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

const form = reactive({
  serviceTypeId: 'event-security',
  locationAddress: '',
  city: 'Cape Town',
  scheduledAt: '',
  durationHours: 4,
  guardsNeeded: 2,
  specialInstructions: '',
  urgencyLevel: 'standard'
})

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
    errorMessage.value = error instanceof Error ? error.message : 'Could not load the dashboard.'
  } finally {
    loading.value = false
  }
}

await loadPage()

const estimatedTotal = computed(() => {
  if (!currentUser.value || !form.scheduledAt) {
    return null
  }

  const parsed = bookingRequestSchema.safeParse({
    clientId: currentUser.value.userId,
    ...form,
    scheduledAt: form.scheduledAt
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
    const parsed = bookingRequestSchema.parse({
      clientId: currentUser.value.userId,
      ...form,
      specialInstructions: form.specialInstructions || undefined,
      scheduledAt: form.scheduledAt
    })

    await bookingService.createBooking(parsed)
    successMessage.value = 'Booking requested. Your dashboard has been updated.'

    form.locationAddress = ''
    form.city = 'Cape Town'
    form.scheduledAt = ''
    form.durationHours = 4
    form.guardsNeeded = 2
    form.specialInstructions = ''
    form.urgencyLevel = 'standard'

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

function statusTone(status: Booking['status']) {
  if (status === 'completed') return 'success'
  if (status === 'cancelled') return 'danger'
  if (status === 'pending') return 'warning'
  if (status === 'accepted' || status === 'en_route') return 'info'
  return 'neutral'
}
</script>

<template>
  <main class="mx-auto max-w-7xl px-6 py-12 lg:px-8">
    <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p class="text-sm font-semibold uppercase tracking-wide text-emerald-300">Client dashboard</p>
        <h1 class="mt-3 text-4xl font-semibold text-white">
          Book security coverage with clear pricing and live status.
        </h1>
      </div>
      <StatusBadge label="Client access" tone="success" />
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Open requests"
        :value="bookings.filter((item) => ['pending', 'accepted', 'en_route', 'active'].includes(item.status)).length"
      />
      <MetricCard
        label="Completed"
        :value="bookings.filter((item) => item.status === 'completed').length"
      />
      <MetricCard
        label="Spend in pipeline"
        :value="formatCurrency(bookings.filter((item) => item.status !== 'cancelled').reduce((sum, item) => sum + item.quotedTotalCents, 0))"
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

    <section class="mt-8 grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
      <form class="rounded-[28px] border border-stone-800 bg-stone-900/60 p-7" @submit.prevent="submitBooking">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-wide text-amber-300">New booking</p>
            <h2 class="mt-2 text-2xl font-semibold text-white">Request security cover</h2>
          </div>
          <StatusBadge label="Validated with Zod" tone="info" />
        </div>

        <div class="mt-8 grid gap-5 md:grid-cols-2">
          <label class="block md:col-span-2">
            <span class="mb-2 block text-sm font-medium text-stone-300">Service type</span>
            <select
              v-model="form.serviceTypeId"
              class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
            >
              <option v-for="service in serviceTypes" :key="service.id" :value="service.id">
                {{ service.name }}
              </option>
            </select>
          </label>
          <label class="block md:col-span-2">
            <span class="mb-2 block text-sm font-medium text-stone-300">Location / address</span>
            <input
              v-model="form.locationAddress"
              type="text"
              class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
            />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-stone-300">City</span>
            <input
              v-model="form.city"
              type="text"
              class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
            />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-stone-300">Date and time</span>
            <input
              v-model="form.scheduledAt"
              type="datetime-local"
              class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
            />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-stone-300">Duration (hours)</span>
            <input
              v-model.number="form.durationHours"
              min="1"
              max="24"
              type="number"
              class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
            />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-stone-300">Guards needed</span>
            <input
              v-model.number="form.guardsNeeded"
              min="1"
              max="12"
              type="number"
              class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
            />
          </label>
          <label class="block md:col-span-2">
            <span class="mb-2 block text-sm font-medium text-stone-300">Urgency level</span>
            <select
              v-model="form.urgencyLevel"
              class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
            >
              <option value="standard">Standard</option>
              <option value="priority">Priority</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label class="block md:col-span-2">
            <span class="mb-2 block text-sm font-medium text-stone-300">Special instructions</span>
            <textarea
              v-model="form.specialInstructions"
              rows="4"
              class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
            />
          </label>
        </div>

        <div class="mt-8 rounded-2xl border border-stone-800 bg-stone-950/60 p-4">
          <p class="text-sm text-stone-400">Estimated total</p>
          <p class="mt-2 text-2xl font-semibold text-white">
            {{ estimatedTotal ? formatCurrency(estimatedTotal) : 'Complete the form to quote' }}
          </p>
        </div>

        <button
          type="submit"
          class="mt-6 rounded-full bg-emerald-300 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="submitting"
        >
          {{ submitting ? 'Submitting...' : 'Request booking' }}
        </button>
      </form>

      <section class="rounded-[28px] border border-stone-800 bg-stone-900/60 p-7">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-wide text-sky-300">Bookings</p>
            <h2 class="mt-2 text-2xl font-semibold text-white">Track every request</h2>
          </div>
        </div>

        <div v-if="loading" class="mt-8 text-sm text-stone-400">Loading bookings...</div>
        <div v-else class="mt-8 space-y-4">
          <article
            v-for="booking in bookings"
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
                  {{ booking.city }} · {{ formatDateTime(booking.scheduledAt) }} · {{ booking.guardsNeeded }} guard<span v-if="booking.guardsNeeded > 1">s</span>
                </p>
              </div>
              <div class="flex flex-col items-start gap-3 md:items-end">
                <StatusBadge
                  :label="bookingStatusLabels[booking.status]"
                  :tone="statusTone(booking.status)"
                />
                <p class="text-lg font-semibold text-white">{{ formatCurrency(booking.quotedTotalCents) }}</p>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-400">
              <span>Urgency: {{ urgencyLevelLabels[booking.urgencyLevel] }}</span>
              <span>Duration: {{ booking.durationHours }}h</span>
            </div>

            <p v-if="booking.specialInstructions" class="mt-4 text-sm leading-6 text-stone-300">
              {{ booking.specialInstructions }}
            </p>

            <button
              v-if="booking.status === 'pending'"
              type="button"
              class="mt-5 rounded-full border border-stone-700 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-rose-400/40 hover:text-white"
              @click="cancelBooking(booking.id)"
            >
              Cancel booking
            </button>
          </article>

          <div
            v-if="!bookings.length"
            class="rounded-3xl border border-dashed border-stone-800 bg-stone-950/50 p-8 text-sm text-stone-400"
          >
            No bookings yet. Create your first request on the left.
          </div>
        </div>
      </section>
    </section>
  </main>
</template>
