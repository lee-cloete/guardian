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
  neutral: 'border-stone-700 bg-stone-900 text-stone-200',
  success: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-200',
  warning: 'border-amber-400/25 bg-amber-400/10 text-amber-200',
  danger: 'border-rose-400/25 bg-rose-400/10 text-rose-200',
  info: 'border-sky-400/25 bg-sky-400/10 text-sky-200'
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
