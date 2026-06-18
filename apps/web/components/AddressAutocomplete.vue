<script setup lang="ts">
import { LoaderCircle, MapPin, Search } from '@lucide/vue'
import type { PlaceSuggestion } from '~/utils/maps'

const props = withDefaults(
  defineProps<{
    modelValue: string
    city?: string
    placeholder?: string
  }>(),
  {
    city: '',
    placeholder: 'Search address or venue'
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [place: PlaceSuggestion]
}>()

const { results, loading, error, search, reset } = useLocationSearch()

const root = ref<HTMLElement | null>(null)
const isOpen = ref(false)
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let onPointerDown: ((event: PointerEvent) => void) | null = null

watch(
  () => props.modelValue,
  (value) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    if (value.trim().length < 3) {
      reset()
      isOpen.value = false
      return
    }

    debounceTimer = setTimeout(async () => {
      await search(value, props.city)
      isOpen.value = true
    }, 220)
  }
)

function selectPlace(place: PlaceSuggestion) {
  emit('update:modelValue', place.address)
  emit('select', place)
  isOpen.value = false
}

function onBlur() {
  window.setTimeout(() => {
    isOpen.value = false
  }, 120)
}

onMounted(() => {
  onPointerDown = (event: PointerEvent) => {
    if (!root.value?.contains(event.target as Node)) {
      isOpen.value = false
    }
  }

  window.addEventListener('pointerdown', onPointerDown)
})

onBeforeUnmount(() => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  if (onPointerDown) {
    window.removeEventListener('pointerdown', onPointerDown)
  }
})
</script>

<template>
  <div ref="root" class="relative">
    <label class="block">
      <span class="mb-2 block text-sm font-medium text-stone-600">Site address</span>
      <div class="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 transition focus-within:border-stone-400 focus-within:bg-white">
        <Search class="h-4 w-4 text-stone-500" />
        <input
          :value="modelValue"
          type="text"
          :placeholder="placeholder"
          class="w-full bg-transparent text-stone-950 outline-none"
          @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          @focus="isOpen = results.length > 0"
          @blur="onBlur"
        />
        <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin text-stone-500" />
      </div>
    </label>

    <div
      v-if="isOpen && (results.length || error)"
      class="absolute inset-x-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl"
    >
      <button
        v-for="place in results"
        :key="place.id"
        type="button"
        class="flex w-full items-start gap-3 border-b border-stone-100 px-4 py-3 text-left transition hover:bg-stone-50 last:border-b-0"
        @mousedown.prevent
        @click="selectPlace(place)"
      >
        <span class="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-stone-100">
          <MapPin class="h-4 w-4 text-stone-600" />
        </span>
        <span class="min-w-0">
          <span class="block truncate text-sm font-medium text-stone-950">{{ place.title }}</span>
          <span class="mt-1 block text-sm text-stone-500">{{ place.subtitle }}</span>
        </span>
      </button>

      <p v-if="error" class="px-4 py-3 text-sm text-rose-700">
        {{ error }}
      </p>
    </div>
  </div>
</template>
