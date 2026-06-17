import type { ServiceType } from '@guardian/domain'
import { serviceTypes as fallbackServiceTypes } from '@guardian/domain'
import { mapServiceTypeRow } from '~/utils/mappers'

export function useServiceTypes() {
  const { demoMode } = usePlatformMode()

  async function loadServiceTypes(): Promise<ServiceType[]> {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()
      return demoStore.serviceTypes
    }

    const client = useSupabaseBrowser()

    if (!client) {
      return fallbackServiceTypes
    }

    const { data, error } = await client
      .from('service_types')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error || !data) {
      return fallbackServiceTypes
    }

    return data.map(mapServiceTypeRow)
  }

  return {
    loadServiceTypes
  }
}
