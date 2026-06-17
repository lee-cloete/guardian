<script setup lang="ts">
import { serviceTypes } from '@guardian/domain'
import { formatCurrency } from '~/utils/formatting'

const trustSignals = [
  'Role-aware dashboards for clients, providers, and admins',
  'Supabase Auth + Postgres + RLS ready data model',
  'Provider onboarding, booking status flow, and admin oversight'
]

const workflow = [
  {
    title: 'Request coverage',
    body: 'Choose a service type, location, time, urgency, and guard count from the client dashboard.'
  },
  {
    title: 'Verify providers',
    body: 'Providers complete onboarding, share coverage radius and rates, and wait for admin verification.'
  },
  {
    title: 'Run operations',
    body: 'Bookings move from pending to accepted, en route, active, and completed with shared visibility.'
  }
]
</script>

<template>
  <main>
    <section class="border-b border-stone-900 bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.12),transparent_28%),radial-gradient(circle_at_top_right,_rgba(251,191,36,0.10),transparent_22%),linear-gradient(180deg,_#111111_0%,_#0c0a09_100%)]">
      <div class="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-28">
        <div>
          <p class="text-sm font-semibold uppercase tracking-wide text-emerald-300">
            Security booking platform
          </p>
          <h1 class="mt-6 max-w-4xl text-5xl font-semibold leading-[0.95] text-white md:text-7xl">
            Book trusted security teams with the speed of a ride-hailing app.
          </h1>
          <p class="mt-8 max-w-2xl text-lg leading-8 text-stone-300">
            Guardian gives clients a premium booking experience, providers a working dispatch dashboard,
            and admins a clean operating surface built for real-world trust and control.
          </p>

          <div class="mt-10 flex flex-wrap gap-4">
            <NuxtLink
              to="/auth/sign-in"
              class="rounded-full bg-emerald-300 px-6 py-3 text-sm font-semibold text-stone-950 transition hover:bg-emerald-200"
            >
              Launch the MVP
            </NuxtLink>
            <NuxtLink
              to="/dashboard/client"
              class="rounded-full border border-stone-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-stone-500"
            >
              Open dashboard
            </NuxtLink>
          </div>

          <ul class="mt-12 grid gap-4 text-sm text-stone-300 md:grid-cols-3">
            <li
              v-for="signal in trustSignals"
              :key="signal"
              class="rounded-2xl border border-stone-800 bg-stone-900/60 p-4"
            >
              {{ signal }}
            </li>
          </ul>
        </div>

        <div class="space-y-6">
          <div class="rounded-3xl border border-stone-800 bg-stone-900/75 p-6 shadow-2xl shadow-black/30">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-sm text-stone-400">Live booking model</p>
                <p class="mt-2 text-2xl font-semibold text-white">Premium security, operationally simple.</p>
              </div>
              <StatusBadge label="MVP Ready" tone="success" />
            </div>

            <div class="mt-6 space-y-4">
              <article
                v-for="service in serviceTypes.slice(0, 3)"
                :key="service.id"
                class="rounded-2xl border border-stone-800 bg-stone-950/80 p-4"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm text-stone-400">{{ service.description }}</p>
                    <p class="mt-1 text-lg font-medium text-white">{{ service.name }}</p>
                  </div>
                  <p class="text-sm font-semibold text-emerald-300">
                    {{ formatCurrency(service.baseRateCents) }}/hr
                  </p>
                </div>
              </article>
            </div>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <MetricCard label="Booking states" value="6" detail="Pending through completed" />
            <MetricCard label="User roles" value="3" detail="Client, provider, admin" />
          </div>
        </div>
      </div>
    </section>

    <section class="border-b border-stone-900 bg-stone-950">
      <div class="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div class="max-w-2xl">
          <p class="text-sm font-semibold uppercase tracking-wide text-amber-300">How it works</p>
          <h2 class="mt-4 text-3xl font-semibold text-white md:text-4xl">
            One product, three distinct operating surfaces.
          </h2>
        </div>

        <div class="mt-12 grid gap-6 md:grid-cols-3">
          <article
            v-for="item in workflow"
            :key="item.title"
            class="rounded-3xl border border-stone-800 bg-stone-900/60 p-6"
          >
            <p class="text-sm font-semibold uppercase tracking-wide text-emerald-300">
              {{ item.title }}
            </p>
            <p class="mt-4 text-base leading-7 text-stone-300">
              {{ item.body }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <section class="bg-stone-950">
      <div class="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div class="max-w-2xl">
            <p class="text-sm font-semibold uppercase tracking-wide text-sky-300">Included now</p>
            <h2 class="mt-4 text-3xl font-semibold text-white md:text-4xl">
              Auth, dashboards, booking flow, provider workflow, and admin oversight.
            </h2>
          </div>
          <NuxtLink
            to="/auth/sign-in"
            class="inline-flex w-fit rounded-full border border-stone-700 px-6 py-3 text-sm font-semibold text-white transition hover:border-stone-500"
          >
            Use the demo accounts
          </NuxtLink>
        </div>
      </div>
    </section>
  </main>
</template>
