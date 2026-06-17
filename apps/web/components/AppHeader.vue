<script setup lang="ts">
import { roleLabels } from '@guardian/domain'
import { initials } from '~/utils/formatting'

const sessionStore = useSessionStore()
const { currentUser } = storeToRefs(sessionStore)
const { demoMode } = usePlatformMode()

async function handleSignOut() {
  await sessionStore.signOut()
  await navigateTo('/')
}

const dashboardLink = computed(() => {
  if (!currentUser.value) {
    return '/auth/sign-in'
  }

  return currentUser.value.role === 'client'
    ? '/dashboard/client'
    : currentUser.value.role === 'provider'
      ? '/dashboard/provider'
      : '/dashboard/admin'
})
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-stone-900/80 bg-stone-950/85 backdrop-blur">
    <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-8">
      <NuxtLink to="/" class="flex items-center gap-3">
        <div class="grid h-10 w-10 place-items-center rounded-lg bg-emerald-300 text-sm font-black text-stone-950">
          GD
        </div>
        <div>
          <p class="text-base font-semibold text-white">Guardian</p>
          <p class="text-xs text-stone-400">
            Security booking platform
          </p>
        </div>
      </NuxtLink>

      <nav class="hidden items-center gap-8 text-sm text-stone-300 md:flex">
        <NuxtLink to="/" class="transition hover:text-white">Home</NuxtLink>
        <NuxtLink v-if="currentUser" :to="dashboardLink" class="transition hover:text-white">
          Dashboard
        </NuxtLink>
        <span
          class="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200"
        >
          {{ demoMode ? 'Demo-ready mode' : 'Supabase live mode' }}
        </span>
      </nav>

      <div class="flex items-center gap-3">
        <template v-if="currentUser">
          <div class="hidden items-center gap-3 rounded-full border border-stone-800 bg-stone-900 px-3 py-2 md:flex">
            <div class="grid h-8 w-8 place-items-center rounded-full bg-stone-800 text-xs font-bold text-stone-100">
              {{ initials(currentUser.fullName) }}
            </div>
            <div class="text-left">
              <p class="text-sm font-medium text-white">{{ currentUser.fullName }}</p>
              <p class="text-xs text-stone-400">{{ roleLabels[currentUser.role] }}</p>
            </div>
          </div>

          <button
            class="rounded-full border border-stone-700 px-4 py-2 text-sm font-medium text-stone-200 transition hover:border-stone-500 hover:text-white"
            type="button"
            @click="handleSignOut"
          >
            Sign out
          </button>
        </template>

        <NuxtLink
          v-else
          to="/auth/sign-in"
          class="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-stone-950 transition hover:bg-emerald-200"
        >
          Sign in
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
