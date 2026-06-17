import type {
  Booking,
  ProviderAvailability,
  ProviderProfile,
  ServiceType
} from '@guardian/domain'
import type { Database } from '@guardian/supabase'

type BookingRow = Database['public']['Tables']['bookings']['Row']
type ProviderProfileRow = Database['public']['Tables']['provider_profiles']['Row']
type ProviderAvailabilityRow = Database['public']['Tables']['provider_availability']['Row']
type ServiceTypeRow = Database['public']['Tables']['service_types']['Row']

export function mapBookingRow(row: BookingRow): Booking {
  return {
    id: row.id,
    clientId: row.client_id,
    providerId: row.provider_id,
    serviceTypeId: row.service_type_id,
    locationAddress: row.location_address,
    city: row.city,
    latitude: row.latitude,
    longitude: row.longitude,
    scheduledAt: row.scheduled_at,
    durationHours: row.duration_hours,
    guardsNeeded: row.guards_needed,
    ...(row.special_instructions
      ? { specialInstructions: row.special_instructions }
      : {}),
    urgencyLevel: row.urgency_level,
    status: row.status,
    quotedTotalCents: row.quoted_total_cents,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapProviderProfileRow(row: ProviderProfileRow): ProviderProfile {
  return {
    userId: row.user_id,
    companyName: row.company_name,
    licenseNumber: row.license_number,
    yearsExperience: row.years_experience,
    hourlyRateCents: row.hourly_rate_cents,
    bio: row.bio,
    coverageAreas: row.coverage_areas,
    verificationStatus: row.verification_status,
    homeLatitude: row.home_latitude,
    homeLongitude: row.home_longitude,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapProviderAvailabilityRow(row: ProviderAvailabilityRow): ProviderAvailability {
  return {
    id: row.id,
    providerId: row.provider_id,
    weekday: row.weekday,
    startHour: row.start_hour,
    endHour: row.end_hour,
    isAvailable: row.is_available
  }
}

export function mapServiceTypeRow(row: ServiceTypeRow): ServiceType {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    baseRateCents: row.base_rate_cents,
    icon: row.icon
  }
}
