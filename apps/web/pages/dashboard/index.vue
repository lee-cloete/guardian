<script setup lang="ts">
import type { AppSession } from '@guardian/domain'

definePageMeta({
  middleware: ['auth']
})

const session = useCookie<AppSession | null>('guardian-session')

if (session.value?.role === 'client') {
  await navigateTo('/dashboard/client')
} else if (session.value?.role === 'provider') {
  await navigateTo('/dashboard/provider')
} else if (session.value?.role === 'admin') {
  await navigateTo('/dashboard/admin')
}
</script>

<template>
  <main class="mx-auto max-w-7xl px-6 py-20 lg:px-8">
    <p class="text-sm text-stone-400">Routing to your dashboard...</p>
  </main>
</template>
