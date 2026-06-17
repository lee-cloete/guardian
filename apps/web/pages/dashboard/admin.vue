<script setup lang="ts">
import { bookingStatusLabels, roleLabels } from '@guardian/domain'
import type { AppProfile, Booking, ProviderProfile } from '@guardian/domain'
import { formatCurrency, formatDateTime } from '~/utils/formatting'

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

async function setStatus(userId: string, status: ProviderProfile['verificationStatus']) {
  try {
    await admin.setVerificationStatus(userId, status)
    await loadPage()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not update provider status.'
  }
}

function providerTone(status: ProviderProfile['verificationStatus']) {
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
        <p class="text-sm font-semibold uppercase tracking-wide text-emerald-300">Admin dashboard</p>
        <h1 class="mt-3 text-4xl font-semibold text-white">
          Monitor supply, demand, and marketplace health.
        </h1>
      </div>
      <StatusBadge label="Admin access" tone="danger" />
    </div>

    <div class="mt-8 grid gap-4 md:grid-cols-4">
      <MetricCard label="Users" :value="profiles.length" />
      <MetricCard label="Providers" :value="providers.length" />
      <MetricCard label="Open bookings" :value="bookings.filter((item) => item.status !== 'completed' && item.status !== 'cancelled').length" />
      <MetricCard label="Pipeline value" :value="formatCurrency(bookings.reduce((sum, item) => sum + item.quotedTotalCents, 0))" />
    </div>

    <p v-if="errorMessage" class="mt-8 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
      {{ errorMessage }}
    </p>

    <div v-if="loading" class="mt-8 text-sm text-stone-400">Loading admin data...</div>

    <section v-else class="mt-8 grid gap-8 xl:grid-cols-[0.85fr_1.15fr]">
      <div class="space-y-8">
        <section class="rounded-[28px] border border-stone-800 bg-stone-900/60 p-7">
          <p class="text-sm font-semibold uppercase tracking-wide text-amber-300">Users</p>
          <h2 class="mt-2 text-2xl font-semibold text-white">Profiles</h2>
          <div class="mt-8 space-y-3">
            <article
              v-for="profile in profiles"
              :key="profile.id"
              class="rounded-2xl border border-stone-800 bg-stone-950/60 p-4"
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="font-medium text-white">{{ profile.fullName }}</p>
                  <p class="text-sm text-stone-400">{{ profile.email }}</p>
                </div>
                <StatusBadge :label="roleLabels[profile.role]" tone="info" />
              </div>
            </article>
          </div>
        </section>

        <section class="rounded-[28px] border border-stone-800 bg-stone-900/60 p-7">
          <p class="text-sm font-semibold uppercase tracking-wide text-sky-300">Provider review</p>
          <h2 class="mt-2 text-2xl font-semibold text-white">Verification queue</h2>
          <div class="mt-8 space-y-4">
            <article
              v-for="provider in providers"
              :key="provider.userId"
              class="rounded-3xl border border-stone-800 bg-stone-950/60 p-5"
            >
              <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p class="text-lg font-medium text-white">{{ provider.companyName }}</p>
                  <p class="mt-2 text-sm text-stone-400">{{ provider.coverageAreas }}</p>
                  <p class="mt-2 text-sm text-stone-500">License {{ provider.licenseNumber }}</p>
                </div>
                <StatusBadge
                  :label="provider.verificationStatus.replace('_', ' ')"
                  :tone="providerTone(provider.verificationStatus)"
                />
              </div>

              <div class="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  class="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-emerald-200"
                  @click="setStatus(provider.userId, 'verified')"
                >
                  Verify
                </button>
                <button
                  type="button"
                  class="rounded-full border border-stone-700 px-4 py-2 text-sm font-medium text-white transition hover:border-stone-500"
                  @click="setStatus(provider.userId, 'pending_review')"
                >
                  Return to review
                </button>
                <button
                  type="button"
                  class="rounded-full border border-rose-400/25 px-4 py-2 text-sm font-medium text-rose-200 transition hover:border-rose-400/50"
                  @click="setStatus(provider.userId, 'suspended')"
                >
                  Suspend
                </button>
              </div>
            </article>
          </div>
        </section>
      </div>

      <section class="rounded-[28px] border border-stone-800 bg-stone-900/60 p-7">
        <p class="text-sm font-semibold uppercase tracking-wide text-emerald-300">Bookings</p>
        <h2 class="mt-2 text-2xl font-semibold text-white">Marketplace activity</h2>

        <div class="mt-8 space-y-4">
          <article
            v-for="booking in bookings"
            :key="booking.id"
            class="rounded-3xl border border-stone-800 bg-stone-950/60 p-5"
          >
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p class="text-lg font-medium text-white">{{ booking.locationAddress }}</p>
                <p class="mt-2 text-sm text-stone-400">
                  {{ booking.city }} · {{ formatDateTime(booking.scheduledAt) }}
                </p>
                <p class="mt-2 text-sm text-stone-500">
                  Client {{ booking.clientId.slice(0, 8) }} · Provider {{ booking.providerId ? booking.providerId.slice(0, 8) : 'Unassigned' }}
                </p>
              </div>
              <div class="text-right">
                <StatusBadge :label="bookingStatusLabels[booking.status]" tone="info" />
                <p class="mt-3 text-lg font-semibold text-white">{{ formatCurrency(booking.quotedTotalCents) }}</p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </section>
  </main>
</template>
