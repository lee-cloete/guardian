import type {
  AppProfile,
  Booking,
  BookingStatusHistory,
  NotificationPlaceholder,
  PaymentPlaceholder,
  ProviderAvailability,
  ProviderProfile,
  ServiceType
} from '@guardian/domain'
import { serviceTypes } from '@guardian/domain'

export type DemoCredential = {
  userId: string
  email: string
  password: string
}

export type DemoDatabaseState = {
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

const now = new Date('2026-06-17T09:00:00.000Z').toISOString()

const clientProfile: AppProfile = {
  id: 'ba8b4f1d-95a8-49ce-9bc9-30c1c3d8a001',
  fullName: 'Nadia Mokoena',
  email: 'client@guardian.demo',
  phone: '+27 82 555 0134',
  role: 'client',
  createdAt: now
}

const providerAccount: AppProfile = {
  id: 'ba8b4f1d-95a8-49ce-9bc9-30c1c3d8a002',
  fullName: 'Thabo Secure Group',
  email: 'provider@guardian.demo',
  phone: '+27 82 555 0199',
  role: 'provider',
  createdAt: now
}

const adminProfile: AppProfile = {
  id: 'ba8b4f1d-95a8-49ce-9bc9-30c1c3d8a003',
  fullName: 'Ops Control',
  email: 'admin@guardian.demo',
  phone: '+27 82 555 0111',
  role: 'admin',
  createdAt: now
}

const demoProfiles: AppProfile[] = [clientProfile, providerAccount, adminProfile]

const demoCredentials: DemoCredential[] = [
  {
    userId: clientProfile.id,
    email: clientProfile.email,
    password: 'demo1234'
  },
  {
    userId: providerAccount.id,
    email: providerAccount.email,
    password: 'demo1234'
  },
  {
    userId: adminProfile.id,
    email: adminProfile.email,
    password: 'demo1234'
  }
]

const demoProviderProfile: ProviderProfile = {
  userId: providerAccount.id,
  companyName: 'Thabo Secure Group',
  licenseNumber: 'PSIRA-447201',
  yearsExperience: 11,
  hourlyRateCents: 28500,
  bio: 'Rapid-response team for events, estates, and executive movement across Cape Town.',
  coverageAreas: 'Cape Town CBD, Atlantic Seaboard, Northern Suburbs',
  verificationStatus: 'verified',
  homeLatitude: -33.9249,
  homeLongitude: 18.4241,
  createdAt: now,
  updatedAt: now
}

const demoAvailability: ProviderAvailability[] = [
  {
    id: '7c72aa36-c713-4323-a1af-f6bc2d651001',
    providerId: providerAccount.id,
    weekday: 1,
    startHour: 6,
    endHour: 18,
    isAvailable: true
  },
  {
    id: '7c72aa36-c713-4323-a1af-f6bc2d651002',
    providerId: providerAccount.id,
    weekday: 5,
    startHour: 18,
    endHour: 24,
    isAvailable: true
  }
]

const acceptedBooking: Booking = {
  id: 'a66fbf86-95e9-4e52-b051-0f3557332001',
  clientId: clientProfile.id,
  providerId: providerAccount.id,
  serviceTypeId: 'vip-protection',
  locationAddress: '45 Wale Street',
  city: 'Cape Town',
  latitude: -33.9221,
  longitude: 18.4186,
  scheduledAt: '2026-06-19T17:00:00.000Z',
  durationHours: 4,
  guardsNeeded: 2,
  specialInstructions: 'Secure private dinner arrival and departure.',
  urgencyLevel: 'priority',
  status: 'accepted',
  quotedTotalCents: 386400,
  createdAt: now,
  updatedAt: now
}

const pendingBooking: Booking = {
  id: 'a66fbf86-95e9-4e52-b051-0f3557332002',
  clientId: clientProfile.id,
  providerId: null,
  serviceTypeId: 'event-security',
  locationAddress: 'Dock Road, V&A Waterfront',
  city: 'Cape Town',
  latitude: -33.9038,
  longitude: 18.4219,
  scheduledAt: '2026-06-24T15:00:00.000Z',
  durationHours: 6,
  guardsNeeded: 3,
  specialInstructions: 'Guest list check and backstage corridor coverage.',
  urgencyLevel: 'standard',
  status: 'pending',
  quotedTotalCents: 468000,
  createdAt: now,
  updatedAt: now
}

const completedBooking: Booking = {
  id: 'a66fbf86-95e9-4e52-b051-0f3557332003',
  clientId: clientProfile.id,
  providerId: providerAccount.id,
  serviceTypeId: 'residential-guarding',
  locationAddress: '2 Chestnut Ridge',
  city: 'Cape Town',
  latitude: -33.9158,
  longitude: 18.4361,
  scheduledAt: '2026-06-10T18:00:00.000Z',
  durationHours: 12,
  guardsNeeded: 1,
  specialInstructions: 'Night perimeter walk and guest entry log.',
  urgencyLevel: 'standard',
  status: 'completed',
  quotedTotalCents: 264000,
  createdAt: '2026-06-08T08:00:00.000Z',
  updatedAt: '2026-06-11T06:00:00.000Z'
}

const demoHistory: BookingStatusHistory[] = [
  {
    id: 'd4498d87-7ca8-4f54-b3ef-0a6ce3aa1001',
    bookingId: acceptedBooking.id,
    status: 'accepted',
    actorId: providerAccount.id,
    note: 'Provider accepted and will share arrival ETA closer to the shift.',
    createdAt: now
  },
  {
    id: 'd4498d87-7ca8-4f54-b3ef-0a6ce3aa1002',
    bookingId: pendingBooking.id,
    status: 'pending',
    actorId: clientProfile.id,
    note: 'Awaiting provider assignment.',
    createdAt: now
  },
  {
    id: 'd4498d87-7ca8-4f54-b3ef-0a6ce3aa1003',
    bookingId: completedBooking.id,
    status: 'completed',
    actorId: adminProfile.id,
    note: 'Shift closed successfully with no incidents.',
    createdAt: '2026-06-11T06:00:00.000Z'
  }
]

const demoPayments: PaymentPlaceholder[] = [
  {
    id: 'b28ea81a-ef06-4db8-9ca7-5ea3a43b1001',
    bookingId: acceptedBooking.id,
    amountCents: 386400,
    status: 'authorized',
    createdAt: now
  }
]

const demoNotifications: NotificationPlaceholder[] = [
  {
    id: 'ca4e6a0f-d95c-41d0-b7e3-a219340f1001',
    userId: clientProfile.id,
    title: 'Provider confirmed',
    body: 'Your VIP booking now has a verified team attached.',
    readAt: null,
    createdAt: now
  },
  {
    id: 'ca4e6a0f-d95c-41d0-b7e3-a219340f1002',
    userId: providerAccount.id,
    title: 'New request nearby',
    body: 'An event-security booking is open within your coverage area.',
    readAt: null,
    createdAt: now
  }
]

export function createDemoDatabaseState(): DemoDatabaseState {
  return {
    serviceTypes,
    profiles: demoProfiles,
    credentials: demoCredentials,
    providerProfiles: [demoProviderProfile],
    providerAvailability: demoAvailability,
    bookings: [acceptedBooking, pendingBooking, completedBooking],
    bookingStatusHistory: demoHistory,
    payments: demoPayments,
    notifications: demoNotifications
  }
}
