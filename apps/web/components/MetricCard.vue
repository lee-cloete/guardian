<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  detail?: string
}>()
</script>

<template>
  <article class="rounded-[22px] border border-stone-200 bg-white p-5 shadow-sm">
    <p class="text-sm text-stone-500">{{ label }}</p>
    <p class="mt-3 text-3xl font-semibold text-stone-950">{{ value }}</p>
    <p v-if="detail" class="mt-2 text-sm text-stone-500">{{ detail }}</p>
  </article>
</template>
