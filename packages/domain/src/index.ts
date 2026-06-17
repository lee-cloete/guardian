import { z } from 'zod'

export const userRoleSchema = z.enum(['client', 'provider', 'admin'])
export type UserRole = z.infer<typeof userRoleSchema>

export const providerStatusSchema = z.enum(['draft', 'pending_review', 'verified', 'suspended'])
export type ProviderStatus = z.infer<typeof providerStatusSchema>

export const bookingStatusSchema = z.enum([
  'pending',
  'accepted',
  'en_route',
  'active',
  'completed',
  'cancelled'
])
export type BookingStatus = z.infer<typeof bookingStatusSchema>

export const urgencyLevelSchema = z.enum(['standard', 'priority', 'critical'])
export type UrgencyLevel = z.infer<typeof urgencyLevelSchema>

export const serviceTypeIdSchema = z.enum([
  'event-security',
  'vip-protection',
  'residential-guarding',
  'retail-loss-prevention',
  'armed-response'
])
export type ServiceTypeId = z.infer<typeof serviceTypeIdSchema>

export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
})
export type GeoPoint = z.infer<typeof geoPointSchema>

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})
export type SignInInput = z.infer<typeof signInSchema>

export const signUpSchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email(),
  phone: z.string().min(8).max(24),
  password: z.string().min(8),
  role: userRoleSchema.exclude(['admin'])
})
export type SignUpInput = z.infer<typeof signUpSchema>

export const bookingRequestSchema = z.object({
  clientId: z.string().uuid(),
  serviceTypeId: serviceTypeIdSchema,
  locationAddress: z.string().min(6).max(180),
  city: z.string().min(2).max(80),
  latitude: geoPointSchema.shape.latitude.optional(),
  longitude: geoPointSchema.shape.longitude.optional(),
  scheduledAt: z.coerce.date(),
  durationHours: z.number().int().min(1).max(24),
  guardsNeeded: z.number().int().min(1).max(12),
  specialInstructions: z.string().max(1000).optional(),
  urgencyLevel: urgencyLevelSchema
})
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>

export const providerProfileSchema = z.object({
  userId: z.string().uuid(),
  companyName: z.string().min(2).max(120),
  licenseNumber: z.string().min(3).max(80),
  yearsExperience: z.number().int().min(0).max(50),
  hourlyRateCents: z.number().int().min(5000),
  bio: z.string().min(20).max(900),
  coverageAreas: z.string().min(3).max(180),
  homeLatitude: geoPointSchema.shape.latitude.optional(),
  homeLongitude: geoPointSchema.shape.longitude.optional()
})
export type ProviderProfileInput = z.infer<typeof providerProfileSchema>

export const providerAvailabilitySchema = z.object({
  providerId: z.string().uuid(),
  weekday: z.number().int().min(0).max(6),
  startHour: z.number().int().min(0).max(23),
  endHour: z.number().int().min(1).max(24),
  isAvailable: z.boolean()
}).refine((value) => value.endHour > value.startHour, {
  message: 'End hour must be after the start hour.',
  path: ['endHour']
})
export type ProviderAvailabilityInput = z.infer<typeof providerAvailabilitySchema>

export type AppSession = {
  userId: string
  fullName: string
  email: string
  role: UserRole
  authMode: 'demo' | 'supabase'
}

export type AppProfile = {
  id: string
  fullName: string
  email: string
  phone: string
  role: UserRole
  createdAt: string
}

export type ServiceType = {
  id: ServiceTypeId
  name: string
  description: string
  baseRateCents: number
  icon: string
}

export type Booking = {
  id: string
  clientId: string
  providerId: string | null
  serviceTypeId: ServiceTypeId
  locationAddress: string
  city: string
  latitude: number | null
  longitude: number | null
  scheduledAt: string
  durationHours: number
  guardsNeeded: number
  specialInstructions?: string
  urgencyLevel: UrgencyLevel
  status: BookingStatus
  quotedTotalCents: number
  createdAt: string
  updatedAt: string
}

export type BookingStatusHistory = {
  id: string
  bookingId: string
  status: BookingStatus
  actorId: string | null
  note: string | null
  createdAt: string
}

export type ProviderProfile = {
  userId: string
  companyName: string
  licenseNumber: string
  yearsExperience: number
  hourlyRateCents: number
  bio: string
  coverageAreas: string
  verificationStatus: ProviderStatus
  homeLatitude: number | null
  homeLongitude: number | null
  createdAt: string
  updatedAt: string
}

export type ProviderAvailability = {
  id: string
  providerId: string
  weekday: number
  startHour: number
  endHour: number
  isAvailable: boolean
}

export type PaymentPlaceholder = {
  id: string
  bookingId: string
  amountCents: number
  status: 'pending' | 'authorized' | 'captured' | 'failed'
  createdAt: string
}

export type NotificationPlaceholder = {
  id: string
  userId: string
  title: string
  body: string
  readAt: string | null
  createdAt: string
}

export const serviceTypes: ServiceType[] = [
  {
    id: 'event-security',
    name: 'Event Security',
    description: 'Crowd control, access points, and event floor presence.',
    baseRateCents: 26000,
    icon: 'EV'
  },
  {
    id: 'vip-protection',
    name: 'VIP Protection',
    description: 'Close protection for executives, talent, and private clients.',
    baseRateCents: 42000,
    icon: 'VP'
  },
  {
    id: 'residential-guarding',
    name: 'Residential Guarding',
    description: 'Estate, residence, and overnight residential coverage.',
    baseRateCents: 22000,
    icon: 'RG'
  },
  {
    id: 'retail-loss-prevention',
    name: 'Retail Loss Prevention',
    description: 'Retail floor presence and shrinkage reduction support.',
    baseRateCents: 24000,
    icon: 'RL'
  },
  {
    id: 'armed-response',
    name: 'Armed Response',
    description: 'High-urgency dispatch and high-risk visible deterrence.',
    baseRateCents: 48000,
    icon: 'AR'
  }
]

export const roleLabels: Record<UserRole, string> = {
  client: 'Client',
  provider: 'Provider',
  admin: 'Admin'
}

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  en_route: 'En Route',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled'
}

export const urgencyLevelLabels: Record<UrgencyLevel, string> = {
  standard: 'Standard',
  priority: 'Priority',
  critical: 'Critical'
}

export const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const allowedProviderTransitions: Record<BookingStatus, BookingStatus[]> = {
  pending: ['accepted'],
  accepted: ['en_route', 'cancelled'],
  en_route: ['active', 'cancelled'],
  active: ['completed', 'cancelled'],
  completed: [],
  cancelled: []
}

export function getServiceType(serviceTypeId: ServiceTypeId) {
  return serviceTypes.find((item) => item.id === serviceTypeId)
}

export function estimateBookingTotal(input: BookingRequestInput) {
  const serviceType = getServiceType(input.serviceTypeId)

  if (!serviceType) {
    throw new Error('Unknown service type.')
  }

  const urgencyMultiplier: Record<UrgencyLevel, number> = {
    standard: 1,
    priority: 1.15,
    critical: 1.4
  }

  return Math.round(
    serviceType.baseRateCents *
      input.durationHours *
      input.guardsNeeded *
      urgencyMultiplier[input.urgencyLevel]
  )
}
