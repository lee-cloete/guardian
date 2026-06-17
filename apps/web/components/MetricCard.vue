<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  detail?: string
}>()
</script>

<template>
  <article class="rounded-2xl border border-stone-800 bg-stone-900/70 p-5">
    <p class="text-sm text-stone-400">{{ label }}</p>
    <p class="mt-3 text-3xl font-semibold text-white">{{ value }}</p>
    <p v-if="detail" class="mt-2 text-sm text-stone-500">{{ detail }}</p>
  </article>
</template>
