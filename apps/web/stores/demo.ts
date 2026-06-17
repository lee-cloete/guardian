import type {
  AppProfile,
  Booking,
  BookingStatus,
  BookingStatusHistory,
  NotificationPlaceholder,
  PaymentPlaceholder,
  ProviderAvailability,
  ProviderProfile,
  ServiceType
} from '@guardian/domain'
import { createDemoDatabaseState, type DemoCredential } from '~/utils/demo-seed'

const storageKey = 'guardian-demo-db'

type DemoState = {
  hydrated: boolean
  serviceTypes: ServiceType[]
  profiles: AppProfile[]
  credentials: DemoCredential[]
  providerProfiles: ProviderProfile[]
  providerAvailability: ProviderAvailability[]
  bookings: Booking[]
  bookingStatusHistory: BookingStatusHistory[]
  payments: PaymentPlaceholder[]
  notifications: NotificationPlaceholder[]
}

function stateFromSeed(): DemoState {
  const seed = createDemoDatabaseState()

  return {
    hydrated: false,
    ...seed
  }
}

export const useDemoStore = defineStore('demo', {
  state: (): DemoState => stateFromSeed(),
  actions: {
    hydrate() {
      if (!process.client || this.hydrated) {
        return
      }

      const raw = window.localStorage.getItem(storageKey)

      if (raw) {
        const parsed = JSON.parse(raw) as Omit<DemoState, 'hydrated'>
        this.$patch({
          hydrated: true,
          ...parsed
        })
        return
      }

      this.hydrated = true
      this.persist()
    },
    persist() {
      if (!process.client) {
        return
      }

      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          serviceTypes: this.serviceTypes,
          profiles: this.profiles,
          credentials: this.credentials,
          providerProfiles: this.providerProfiles,
          providerAvailability: this.providerAvailability,
          bookings: this.bookings,
          bookingStatusHistory: this.bookingStatusHistory,
          payments: this.payments,
          notifications: this.notifications
        })
      )
    },
    addProfile(profile: AppProfile, credential: DemoCredential) {
      this.profiles.unshift(profile)
      this.credentials.unshift(credential)
      this.persist()
    },
    upsertProviderProfile(profile: ProviderProfile) {
      const index = this.providerProfiles.findIndex((item) => item.userId === profile.userId)

      if (index >= 0) {
        this.providerProfiles[index] = profile
      } else {
        this.providerProfiles.unshift(profile)
      }

      this.persist()
    },
    saveAvailability(entry: ProviderAvailability) {
      const index = this.providerAvailability.findIndex((item) => item.id === entry.id)

      if (index >= 0) {
        this.providerAvailability[index] = entry
      } else {
        this.providerAvailability.unshift(entry)
      }

      this.persist()
    },
    addBooking(booking: Booking, history?: BookingStatusHistory) {
      this.bookings.unshift(booking)

      if (history) {
        this.bookingStatusHistory.unshift(history)
      }

      this.persist()
    },
    updateBooking(bookingId: string, patch: Partial<Booking>, history?: BookingStatusHistory) {
      const index = this.bookings.findIndex((item) => item.id === bookingId)

      if (index < 0) {
        return
      }

      const current = this.bookings[index]

      if (!current) {
        return
      }

      const next: Booking = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString()
      }

      this.bookings[index] = next

      if (history) {
        this.bookingStatusHistory.unshift(history)
      }

      this.persist()
    },
    setProviderStatus(userId: string, status: ProviderProfile['verificationStatus']) {
      const profile = this.providerProfiles.find((item) => item.userId === userId)

      if (!profile) {
        return
      }

      profile.verificationStatus = status
      profile.updatedAt = new Date().toISOString()
      this.persist()
    },
    addNotification(notification: NotificationPlaceholder) {
      this.notifications.unshift(notification)
      this.persist()
    },
    reset() {
      this.$reset()
      this.hydrated = true
      this.persist()
    },
    addHistory(bookingId: string, status: BookingStatus, actorId: string | null, note: string | null) {
      this.bookingStatusHistory.unshift({
        id: crypto.randomUUID(),
        bookingId,
        status,
        actorId,
        note,
        createdAt: new Date().toISOString()
      })
      this.persist()
    }
  }
})
