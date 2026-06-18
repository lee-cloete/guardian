import type { PlaceSuggestion } from '~/utils/maps'

export function useLocationSearch() {
  const results = ref<PlaceSuggestion[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let requestId = 0

  async function search(query: string, city?: string) {
    const trimmed = query.trim()

    if (trimmed.length < 3) {
      results.value = []
      loading.value = false
      error.value = null
      return
    }

    const currentRequestId = ++requestId
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ results: PlaceSuggestion[] }>('/api/maps/search', {
        query: {
          q: trimmed,
          city: city?.trim() || undefined
        }
      })

      if (currentRequestId === requestId) {
        results.value = response.results
      }
    } catch (searchError) {
      if (currentRequestId === requestId) {
        results.value = []
        error.value =
          searchError instanceof Error ? searchError.message : 'Could not search locations.'
      }
    } finally {
      if (currentRequestId === requestId) {
        loading.value = false
      }
    }
  }

  function reset() {
    requestId += 1
    results.value = []
    loading.value = false
    error.value = null
  }

  return {
    results,
    loading,
    error,
    search,
    reset
  }
}
