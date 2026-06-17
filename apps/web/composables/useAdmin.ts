export function useAdmin() {
  const bookings = useBookings()
  const providers = useProviders()

  async function loadSnapshot() {
    const [profiles, providerProfiles, allBookings] = await Promise.all([
      providers.loadProfiles(),
      providers.loadProviderProfiles(),
      bookings.loadAllBookings()
    ])

    return {
      profiles,
      providerProfiles,
      bookings: allBookings
    }
  }

  return {
    loadSnapshot,
    setVerificationStatus: providers.setVerificationStatus
  }
}
