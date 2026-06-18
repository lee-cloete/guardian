<script setup lang="ts">
import { roleLabels } from '@guardian/domain'
import { initials } from '~/utils/formatting'

const sessionStore = useSessionStore()
const { currentUser } = storeToRefs(sessionStore)
const { demoMode } = usePlatformMode()
const route = useRoute()

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

const primaryLinks = computed(() => {
  const dashboard = dashboardLink.value

  return [
    { label: 'Overview', to: '/' },
    { label: 'Workspace', to: dashboard }
  ]
})
</script>

<template>
  <header class="sticky top-0 z-30 border-b border-stone-200/90 bg-[#f4f2ee]/90 backdrop-blur">
    <div class="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-4 lg:px-6">
      <NuxtLink to="/" class="flex items-center gap-3">
        <div class="grid h-10 w-10 place-items-center rounded-2xl bg-stone-950 text-sm font-black text-white shadow-sm">
          GD
        </div>
        <div>
          <p class="text-base font-semibold text-stone-950">Guardian</p>
          <p class="text-xs text-stone-500">Security dispatch</p>
        </div>
      </NuxtLink>

      <nav class="hidden items-center gap-2 md:flex">
        <NuxtLink
          v-for="link in primaryLinks"
          :key="link.to"
          :to="link.to"
          class="rounded-full px-3 py-2 text-sm font-medium transition"
          :class="
            route.path === link.to
              ? 'bg-white text-stone-950 shadow-sm'
              : 'text-stone-500 hover:bg-white/70 hover:text-stone-950'
          "
        >
          {{ link.label }}
        </NuxtLink>
        <span
          class="ml-3 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600"
        >
          {{ demoMode ? 'Preview mode' : 'Supabase live' }}
        </span>
      </nav>

      <div class="flex items-center gap-3">
        <template v-if="currentUser">
          <div class="hidden items-center gap-3 rounded-full border border-stone-200 bg-white px-3 py-2 shadow-sm md:flex">
            <div class="grid h-8 w-8 place-items-center rounded-full bg-stone-950 text-xs font-bold text-white">
              {{ initials(currentUser.fullName) }}
            </div>
            <div class="text-left">
              <p class="text-sm font-medium text-stone-950">{{ currentUser.fullName }}</p>
              <p class="text-xs text-stone-500">{{ roleLabels[currentUser.role] }}</p>
            </div>
          </div>

          <button
            class="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 hover:bg-white"
            type="button"
            @click="handleSignOut"
          >
            Sign out
          </button>
        </template>

        <NuxtLink
          v-else
          to="/auth/sign-in"
          class="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
        >
          Sign in
        </NuxtLink>
      </div>
    </div>
  </header>
</template>
