<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  }>(),
  {
    tone: 'neutral'
  }
)

const toneClasses: Record<NonNullable<typeof props.tone>, string> = {
  neutral: 'border-stone-200 bg-stone-100 text-stone-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
  danger: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-sky-200 bg-sky-50 text-sky-700'
}

const resolvedTone = computed(() => props.tone ?? 'neutral')
</script>

<template>
  <span
    class="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
    :class="toneClasses[resolvedTone]"
  >
    {{ label }}
  </span>
</template>
