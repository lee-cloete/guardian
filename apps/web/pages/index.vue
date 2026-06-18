<script setup lang="ts">
import { serviceTypes } from '@guardian/domain'
import { formatCurrency } from '~/utils/formatting'
import { resolveCityCoordinate } from '~/utils/geo'

const trustSignals = [
  'Role-aware dashboards for clients, providers, and admins',
  'Supabase Auth, Postgres, and RLS aligned to the booking flow',
  'Provider onboarding, live dispatch states, and admin oversight'
]

const workflow = [
  {
    title: 'Request coverage',
    body: 'Clients place a booking from a live map workspace with service, timing, urgency, and team size.'
  },
  {
    title: 'Dispatch providers',
    body: 'Security teams publish availability, claim work, and move each job through en route and active states.'
  },
  {
    title: 'Control the network',
    body: 'Admins monitor supply, demand, and provider verification from one operations surface.'
  }
]

const city = resolveCityCoordinate('Cape Town')

const heroMarkers = [
  {
    id: 'hero-client-1',
    label: 'EV',
    detail: 'Event perimeter · Active',
    latitude: city.latitude + 0.012,
    longitude: city.longitude - 0.021,
    tone: 'active' as const
  },
  {
    id: 'hero-client-2',
    label: 'CP',
    detail: 'Close protection · Pending',
    latitude: city.latitude - 0.01,
    longitude: city.longitude + 0.024,
    tone: 'pending' as const
  },
  {
    id: 'hero-provider',
    label: 'HQ',
    detail: 'Provider base',
    latitude: city.latitude + 0.002,
    longitude: city.longitude + 0.002,
    tone: 'provider' as const
  }
]
</script>

<template>
  <main>
    <section class="relative overflow-hidden border-b border-stone-200 bg-[#f4f2ee]">
      <div class="absolute inset-0">
        <OperationsMap
          class-name="h-full w-full"
          :center="[city.longitude, city.latitude]"
          :markers="heroMarkers"
          selected-marker-id="hero-client-1"
          :zoom="11"
        />
        <div class="absolute inset-0 bg-[linear-gradient(180deg,rgba(244,242,238,0.28)_0%,rgba(244,242,238,0.55)_30%,rgba(244,242,238,0.92)_72%,#f4f2ee_100%)]" />
      </div>

      <div class="relative mx-auto flex min-h-[78vh] max-w-[1440px] flex-col justify-between px-4 pb-12 pt-16 lg:px-6 lg:pt-20">
        <div class="max-w-4xl">
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-600">
            Security booking platform
          </p>
          <h1 class="mt-4 text-5xl font-semibold leading-[0.95] text-stone-950 md:max-w-5xl md:text-7xl">
            Book trusted security teams with a real dispatch experience.
          </h1>
          <p class="mt-6 max-w-2xl text-base leading-7 text-stone-700 md:text-lg">
            Guardian is built like an operating product, not a brochure. Clients book from a live
            map, providers run availability and job movement, and admins keep the network healthy.
          </p>

          <div class="mt-8 flex flex-wrap gap-3">
            <NuxtLink
              to="/auth/sign-in"
              class="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
            >
              Open the product
            </NuxtLink>
            <NuxtLink
              to="/dashboard/client"
              class="rounded-full border border-stone-300 bg-white/80 px-6 py-3 text-sm font-semibold text-stone-800 backdrop-blur transition hover:border-stone-400 hover:bg-white"
            >
              Preview client flow
            </NuxtLink>
          </div>
        </div>

        <div class="mt-14 grid gap-4 md:grid-cols-3">
          <article
            v-for="signal in trustSignals"
            :key="signal"
            class="rounded-lg border border-white/70 bg-white/78 p-4 shadow-sm backdrop-blur"
          >
            <p class="text-sm leading-6 text-stone-700">{{ signal }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="border-b border-stone-200 bg-white">
      <div class="mx-auto max-w-[1440px] px-4 py-16 lg:px-6 lg:py-20">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div class="max-w-2xl">
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Service catalog</p>
            <h2 class="mt-2 text-3xl font-semibold text-stone-950 md:text-4xl">
              The product reads like an operations tool because the workflows are the product.
            </h2>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Booking states" value="6" detail="Pending through completed" />
            <MetricCard label="User roles" value="3" detail="Client, provider, admin" />
          </div>
        </div>

        <div class="mt-10 grid gap-4 md:grid-cols-3">
          <article
            v-for="service in serviceTypes.slice(0, 3)"
            :key="service.id"
            class="rounded-lg border border-stone-200 bg-stone-50 p-5"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm text-stone-500">{{ service.description }}</p>
                <h3 class="mt-2 text-lg font-semibold text-stone-950">{{ service.name }}</h3>
              </div>
              <p class="text-sm font-semibold text-stone-700">
                {{ formatCurrency(service.baseRateCents) }}/hr
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="border-b border-stone-200 bg-[#eeece7]">
      <div class="mx-auto max-w-[1440px] px-4 py-16 lg:px-6 lg:py-20">
        <div class="max-w-2xl">
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">How it runs</p>
          <h2 class="mt-2 text-3xl font-semibold text-stone-950 md:text-4xl">
            Three operating surfaces, one shared booking lifecycle.
          </h2>
        </div>

        <div class="mt-10 grid gap-4 md:grid-cols-3">
          <article
            v-for="item in workflow"
            :key="item.title"
            class="rounded-lg border border-stone-200 bg-white p-5"
          >
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
              {{ item.title }}
            </p>
            <p class="mt-4 text-base leading-7 text-stone-700">
              {{ item.body }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <section class="bg-[#f4f2ee]">
      <div class="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-16 lg:flex-row lg:items-end lg:justify-between lg:px-6 lg:py-20">
        <div class="max-w-2xl">
          <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">Included now</p>
          <h2 class="mt-2 text-3xl font-semibold text-stone-950 md:text-4xl">
            Auth, dashboards, booking flow, provider workflow, and admin oversight are already wired.
          </h2>
        </div>
        <div class="flex flex-wrap gap-3">
          <NuxtLink
            to="/auth/sign-in"
            class="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Sign in
          </NuxtLink>
          <NuxtLink
            to="/dashboard/provider"
            class="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-400 hover:bg-stone-100"
          >
            Preview provider flow
          </NuxtLink>
        </div>
      </div>
    </section>
  </main>
</template>
