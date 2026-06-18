import type { RouteSummary } from '~/utils/maps'

export function useRoutePlanner() {
  const route = ref<RouteSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let requestId = 0

  async function planRoute(input: {
    startLatitude: number
    startLongitude: number
    endLatitude: number
    endLongitude: number
  }) {
    const currentRequestId = ++requestId
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ route: RouteSummary | null }>('/api/maps/route', {
        query: input
      })

      if (currentRequestId === requestId) {
        route.value = response.route
      }
    } catch (routeError) {
      if (currentRequestId === requestId) {
        route.value = null
        error.value = routeError instanceof Error ? routeError.message : 'Could not load route.'
      }
    } finally {
      if (currentRequestId === requestId) {
        loading.value = false
      }
    }
  }

  function clearRoute() {
    requestId += 1
    route.value = null
    loading.value = false
    error.value = null
  }

  return {
    route,
    loading,
    error,
    planRoute,
    clearRoute
  }
}
