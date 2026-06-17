import type {
  Booking,
  BookingRequestInput,
  BookingStatus,
  ProviderAvailability,
  ProviderAvailabilityInput,
  ProviderProfile,
  ProviderProfileInput
} from '@guardian/domain'
import { allowedProviderTransitions, estimateBookingTotal } from '@guardian/domain'

export type BookingRepository = {
  create(input: BookingRequestInput): Promise<Booking>
  updateStatus?(bookingId: string, status: BookingStatus, providerId?: string): Promise<Booking>
}

export type ProviderRepository = {
  upsert(input: ProviderProfileInput): Promise<ProviderProfile>
  saveAvailability?(input: ProviderAvailabilityInput): Promise<ProviderAvailability>
}

export function createBookingService(repository: BookingRepository) {
  return {
    async requestBooking(input: BookingRequestInput) {
      if (input.scheduledAt.getTime() < Date.now()) {
        throw new Error('Bookings must be scheduled for a future time.')
      }

      const quotedTotalCents = estimateBookingTotal(input)

      return repository.create({
        ...input,
        quotedTotalCents
      } as BookingRequestInput & { quotedTotalCents: number })
    },
    async progressBooking(bookingId: string, currentStatus: BookingStatus, nextStatus: BookingStatus, providerId?: string) {
      const allowed = allowedProviderTransitions[currentStatus]

      if (!allowed.includes(nextStatus)) {
        throw new Error(`Cannot move a booking from ${currentStatus} to ${nextStatus}.`)
      }

      if (!repository.updateStatus) {
        throw new Error('Booking status updates are not configured.')
      }

      return repository.updateStatus(bookingId, nextStatus, providerId)
    }
  }
}

export function createProviderService(repository: ProviderRepository) {
  return {
    async saveProfile(input: ProviderProfileInput) {
      return repository.upsert(input)
    },
    async saveAvailability(input: ProviderAvailabilityInput) {
      if (!repository.saveAvailability) {
        throw new Error('Provider availability is not configured.')
      }

      return repository.saveAvailability(input)
    }
  }
}

type InMemoryBookingInput = BookingRequestInput & { quotedTotalCents?: number }

export const inMemoryBookingRepository: BookingRepository = {
  async create(input) {
    const bookingInput = input as InMemoryBookingInput
    const now = new Date().toISOString()

    return {
      id: crypto.randomUUID(),
      clientId: bookingInput.clientId,
      providerId: null,
      serviceTypeId: bookingInput.serviceTypeId,
      locationAddress: bookingInput.locationAddress,
      city: bookingInput.city,
      latitude: bookingInput.latitude ?? null,
      longitude: bookingInput.longitude ?? null,
      scheduledAt: bookingInput.scheduledAt.toISOString(),
      durationHours: bookingInput.durationHours,
      guardsNeeded: bookingInput.guardsNeeded,
      ...(bookingInput.specialInstructions
        ? { specialInstructions: bookingInput.specialInstructions }
        : {}),
      urgencyLevel: bookingInput.urgencyLevel,
      status: 'pending',
      quotedTotalCents: bookingInput.quotedTotalCents ?? estimateBookingTotal(bookingInput),
      createdAt: now,
      updatedAt: now
    }
  }
}

export const inMemoryProviderRepository: ProviderRepository = {
  async upsert(input) {
    const now = new Date().toISOString()

    return {
      userId: input.userId,
      companyName: input.companyName,
      licenseNumber: input.licenseNumber,
      yearsExperience: input.yearsExperience,
      hourlyRateCents: input.hourlyRateCents,
      bio: input.bio,
      coverageAreas: input.coverageAreas,
      verificationStatus: 'pending_review',
      homeLatitude: input.homeLatitude ?? null,
      homeLongitude: input.homeLongitude ?? null,
      createdAt: now,
      updatedAt: now
    }
  },
  async saveAvailability(input) {
    return {
      id: crypto.randomUUID(),
      providerId: input.providerId,
      weekday: input.weekday,
      startHour: input.startHour,
      endHour: input.endHour,
      isAvailable: input.isAvailable
    }
  }
}
