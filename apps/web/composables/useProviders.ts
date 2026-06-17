import type {
  AppProfile,
  ProviderAvailability,
  ProviderAvailabilityInput,
  ProviderProfile,
  ProviderProfileInput
} from '@guardian/domain'
import type { Database } from '@guardian/supabase'
import { mapProviderAvailabilityRow, mapProviderProfileRow } from '~/utils/mappers'

export function useProviders() {
  const { demoMode } = usePlatformMode()

  async function loadProviderProfile(userId: string) {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()
      return demoStore.providerProfiles.find((item) => item.userId === userId) ?? null
    }

    const client = useSupabaseBrowser()

    if (!client) {
      return null
    }

    const { data, error } = await (client.from('provider_profiles') as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      throw new Error(error.message)
    }

    return data
      ? mapProviderProfileRow(data as Database['public']['Tables']['provider_profiles']['Row'])
      : null
  }

  async function saveProviderProfile(input: ProviderProfileInput): Promise<ProviderProfile> {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()
      const existing = demoStore.providerProfiles.find((item) => item.userId === input.userId)
      const now = new Date().toISOString()

      const profile: ProviderProfile = {
        userId: input.userId,
        companyName: input.companyName,
        licenseNumber: input.licenseNumber,
        yearsExperience: input.yearsExperience,
        hourlyRateCents: input.hourlyRateCents,
        bio: input.bio,
        coverageAreas: input.coverageAreas,
        verificationStatus: existing?.verificationStatus ?? 'pending_review',
        homeLatitude: input.homeLatitude ?? null,
        homeLongitude: input.homeLongitude ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now
      }

      demoStore.upsertProviderProfile(profile)
      return profile
    }

    const client = useSupabaseBrowser()

    if (!client) {
      throw new Error('Supabase is not configured.')
    }

    const providerInsert: Database['public']['Tables']['provider_profiles']['Insert'] = {
      user_id: input.userId,
      company_name: input.companyName,
      license_number: input.licenseNumber,
      years_experience: input.yearsExperience,
      hourly_rate_cents: input.hourlyRateCents,
      bio: input.bio,
      coverage_areas: input.coverageAreas,
      home_latitude: input.homeLatitude ?? null,
      home_longitude: input.homeLongitude ?? null
    }

    const { data, error } = await (client.from('provider_profiles') as any)
      .upsert(providerInsert, { onConflict: 'user_id' })
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Could not save the provider profile.')
    }

    return mapProviderProfileRow(data as Database['public']['Tables']['provider_profiles']['Row'])
  }

  async function loadAvailability(providerId: string): Promise<ProviderAvailability[]> {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()
      return demoStore.providerAvailability.filter((item) => item.providerId === providerId)
    }

    const client = useSupabaseBrowser()

    if (!client) {
      return []
    }

    const { data, error } = await (client.from('provider_availability') as any)
      .select('*')
      .eq('provider_id', providerId)
      .order('weekday')

    if (error || !data) {
      throw new Error(error?.message ?? 'Could not load availability.')
    }

    return (data as Database['public']['Tables']['provider_availability']['Row'][]).map(
      mapProviderAvailabilityRow
    )
  }

  async function saveAvailability(input: ProviderAvailabilityInput): Promise<ProviderAvailability> {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()

      const entry: ProviderAvailability = {
        id: crypto.randomUUID(),
        providerId: input.providerId,
        weekday: input.weekday,
        startHour: input.startHour,
        endHour: input.endHour,
        isAvailable: input.isAvailable
      }

      demoStore.saveAvailability(entry)
      return entry
    }

    const client = useSupabaseBrowser()

    if (!client) {
      throw new Error('Supabase is not configured.')
    }

    const availabilityInsert: Database['public']['Tables']['provider_availability']['Insert'] = {
      provider_id: input.providerId,
      weekday: input.weekday,
      start_hour: input.startHour,
      end_hour: input.endHour,
      is_available: input.isAvailable
    }

    const { data, error } = await (client.from('provider_availability') as any)
      .insert(availabilityInsert)
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Could not save availability.')
    }

    return mapProviderAvailabilityRow(
      data as Database['public']['Tables']['provider_availability']['Row']
    )
  }

  async function loadProfiles() {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()
      return demoStore.profiles
    }

    const client = useSupabaseBrowser()

    if (!client) {
      return []
    }

    const { data, error } = await (client.from('profiles') as any)
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) {
      throw new Error(error?.message ?? 'Could not load profiles.')
    }

    return (data as Database['public']['Tables']['profiles']['Row'][]).map((profileRow): AppProfile => ({
      id: profileRow.id,
      fullName: profileRow.full_name,
      email: profileRow.email ?? '',
      phone: profileRow.phone,
      role: profileRow.role,
      createdAt: profileRow.created_at
    }))
  }

  async function loadProviderProfiles() {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()
      return demoStore.providerProfiles
    }

    const client = useSupabaseBrowser()

    if (!client) {
      return []
    }

    const { data, error } = await (client.from('provider_profiles') as any)
      .select('*')
      .order('updated_at', { ascending: false })

    if (error || !data) {
      throw new Error(error?.message ?? 'Could not load provider profiles.')
    }

    return (data as Database['public']['Tables']['provider_profiles']['Row'][]).map(
      mapProviderProfileRow
    )
  }

  async function setVerificationStatus(userId: string, status: ProviderProfile['verificationStatus']) {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()
      demoStore.setProviderStatus(userId, status)
      return
    }

    const client = useSupabaseBrowser()

    if (!client) {
      throw new Error('Supabase is not configured.')
    }

    const providerUpdate: Database['public']['Tables']['provider_profiles']['Update'] = {
      verification_status: status
    }

    const { error } = await (client.from('provider_profiles') as any)
      .update(providerUpdate)
      .eq('user_id', userId)

    if (error) {
      throw new Error(error.message)
    }
  }

  return {
    loadProviderProfile,
    saveProviderProfile,
    loadAvailability,
    saveAvailability,
    loadProfiles,
    loadProviderProfiles,
    setVerificationStatus
  }
}
