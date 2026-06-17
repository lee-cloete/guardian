import type { Booking, BookingRequestInput, BookingStatus } from '@guardian/domain'
import type { Database } from '@guardian/supabase'
import { estimateBookingTotal } from '@guardian/domain'
import { mapBookingRow } from '~/utils/mappers'

export function useBookings() {
  const { demoMode } = usePlatformMode()

  async function loadClientBookings(clientId: string) {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()
      return [...demoStore.bookings]
        .filter((item) => item.clientId === clientId)
        .sort((left, right) => right.scheduledAt.localeCompare(left.scheduledAt))
    }

    const client = useSupabaseBrowser()

    if (!client) {
      return []
    }

    const { data, error } = await (client.from('bookings') as any)
      .select('*')
      .eq('client_id', clientId)
      .order('scheduled_at', { ascending: false })

    if (error || !data) {
      throw new Error(error?.message ?? 'Could not load client bookings.')
    }

    return (data as Database['public']['Tables']['bookings']['Row'][]).map(mapBookingRow)
  }

  async function loadAvailableBookings() {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()
      return [...demoStore.bookings]
        .filter((item) => item.status === 'pending' && !item.providerId)
        .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))
    }

    const client = useSupabaseBrowser()

    if (!client) {
      return []
    }

    const { data, error } = await (client.from('bookings') as any)
      .select('*')
      .eq('status', 'pending')
      .is('provider_id', null)
      .order('scheduled_at')

    if (error || !data) {
      throw new Error(error?.message ?? 'Could not load available bookings.')
    }

    return (data as Database['public']['Tables']['bookings']['Row'][]).map(mapBookingRow)
  }

  async function loadProviderBookings(providerId: string) {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()
      return [...demoStore.bookings]
        .filter((item) => item.providerId === providerId)
        .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))
    }

    const client = useSupabaseBrowser()

    if (!client) {
      return []
    }

    const { data, error } = await (client.from('bookings') as any)
      .select('*')
      .eq('provider_id', providerId)
      .order('scheduled_at')

    if (error || !data) {
      throw new Error(error?.message ?? 'Could not load provider bookings.')
    }

    return (data as Database['public']['Tables']['bookings']['Row'][]).map(mapBookingRow)
  }

  async function loadAllBookings() {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()
      return [...demoStore.bookings].sort((left, right) =>
        right.createdAt.localeCompare(left.createdAt)
      )
    }

    const client = useSupabaseBrowser()

    if (!client) {
      return []
    }

    const { data, error } = await (client.from('bookings') as any)
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data) {
      throw new Error(error?.message ?? 'Could not load bookings.')
    }

    return (data as Database['public']['Tables']['bookings']['Row'][]).map(mapBookingRow)
  }

  async function createBooking(input: BookingRequestInput): Promise<Booking> {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()

      const booking: Booking = {
        id: crypto.randomUUID(),
        clientId: input.clientId,
        providerId: null,
        serviceTypeId: input.serviceTypeId,
        locationAddress: input.locationAddress,
        city: input.city,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        scheduledAt: input.scheduledAt.toISOString(),
        durationHours: input.durationHours,
        guardsNeeded: input.guardsNeeded,
        ...(input.specialInstructions
          ? { specialInstructions: input.specialInstructions }
          : {}),
        urgencyLevel: input.urgencyLevel,
        status: 'pending',
        quotedTotalCents: estimateBookingTotal(input),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      demoStore.addBooking(booking, {
        id: crypto.randomUUID(),
        bookingId: booking.id,
        status: 'pending',
        actorId: input.clientId,
        note: 'Client created the booking request.',
        createdAt: new Date().toISOString()
      })

      return booking
    }

    const client = useSupabaseBrowser()

    if (!client) {
      throw new Error('Supabase is not configured.')
    }

    const bookingInsert: Database['public']['Tables']['bookings']['Insert'] = {
      client_id: input.clientId,
      provider_id: null,
      service_type_id: input.serviceTypeId,
      location_address: input.locationAddress,
      city: input.city,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      scheduled_at: input.scheduledAt.toISOString(),
      duration_hours: input.durationHours,
      guards_needed: input.guardsNeeded,
      special_instructions: input.specialInstructions ?? null,
      urgency_level: input.urgencyLevel,
      status: 'pending',
      quoted_total_cents: estimateBookingTotal(input)
    }

    const { data, error } = await (client.from('bookings') as any)
      .insert(bookingInsert)
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Could not create the booking.')
    }

    return mapBookingRow(data as Database['public']['Tables']['bookings']['Row'])
  }

  async function acceptBooking(bookingId: string, providerId: string) {
    return updateBookingStatus(bookingId, 'accepted', providerId)
  }

  async function updateBookingStatus(
    bookingId: string,
    status: BookingStatus,
    providerId?: string
  ): Promise<Booking> {
    if (demoMode.value) {
      const demoStore = useDemoStore()
      demoStore.hydrate()

      const existing = demoStore.bookings.find((item) => item.id === bookingId)

      if (!existing) {
        throw new Error('Booking not found.')
      }

      demoStore.updateBooking(
        bookingId,
        {
          status,
          ...(providerId ? { providerId } : {})
        },
        {
          id: crypto.randomUUID(),
          bookingId,
          status,
          actorId: providerId ?? existing.clientId,
          note: `Status changed to ${status.replace('_', ' ')}.`,
          createdAt: new Date().toISOString()
        }
      )

      const updated = demoStore.bookings.find((item) => item.id === bookingId)

      if (!updated) {
        throw new Error('Booking did not update.')
      }

      return updated
    }

    const client = useSupabaseBrowser()

    if (!client) {
      throw new Error('Supabase is not configured.')
    }

    const patch: Database['public']['Tables']['bookings']['Update'] = {
      status
    }

    if (providerId) {
      patch.provider_id = providerId
    }

    const { data, error } = await (client.from('bookings') as any)
      .update(patch)
      .eq('id', bookingId)
      .select('*')
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Could not update the booking.')
    }

    return mapBookingRow(data as Database['public']['Tables']['bookings']['Row'])
  }

  async function cancelBooking(bookingId: string) {
    return updateBookingStatus(bookingId, 'cancelled')
  }

  return {
    loadClientBookings,
    loadAvailableBookings,
    loadProviderBookings,
    loadAllBookings,
    createBooking,
    acceptBooking,
    updateBookingStatus,
    cancelBooking
  }
}
