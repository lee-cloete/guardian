export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Enums: {
      user_role: 'client' | 'provider' | 'admin'
      provider_status: 'draft' | 'pending_review' | 'verified' | 'suspended'
      booking_status: 'pending' | 'accepted' | 'en_route' | 'active' | 'completed' | 'cancelled'
      urgency_level: 'standard' | 'priority' | 'critical'
    }
    CompositeTypes: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string
          phone: string
          role: 'client' | 'provider' | 'admin'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string
          phone?: string
          role?: 'client' | 'provider' | 'admin'
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string | null
          full_name?: string
          phone?: string
          role?: 'client' | 'provider' | 'admin'
          updated_at?: string
        }
      }
      service_types: {
        Row: {
          id:
            | 'event-security'
            | 'vip-protection'
            | 'residential-guarding'
            | 'retail-loss-prevention'
            | 'armed-response'
          name: string
          description: string
          base_rate_cents: number
          icon: string
          sort_order: number
          is_active: boolean
        }
        Insert: {
          id:
            | 'event-security'
            | 'vip-protection'
            | 'residential-guarding'
            | 'retail-loss-prevention'
            | 'armed-response'
          name: string
          description: string
          base_rate_cents: number
          icon: string
          sort_order?: number
          is_active?: boolean
        }
        Update: {
          name?: string
          description?: string
          base_rate_cents?: number
          icon?: string
          sort_order?: number
          is_active?: boolean
        }
      }
      provider_profiles: {
        Row: {
          user_id: string
          company_name: string
          license_number: string
          years_experience: number
          hourly_rate_cents: number
          bio: string
          coverage_areas: string
          verification_status: 'draft' | 'pending_review' | 'verified' | 'suspended'
          home_latitude: number | null
          home_longitude: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          company_name?: string
          license_number?: string
          years_experience?: number
          hourly_rate_cents?: number
          bio?: string
          coverage_areas?: string
          verification_status?: 'draft' | 'pending_review' | 'verified' | 'suspended'
          home_latitude?: number | null
          home_longitude?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          license_number?: string
          years_experience?: number
          hourly_rate_cents?: number
          bio?: string
          coverage_areas?: string
          verification_status?: 'draft' | 'pending_review' | 'verified' | 'suspended'
          home_latitude?: number | null
          home_longitude?: number | null
          updated_at?: string
        }
      }
      provider_availability: {
        Row: {
          id: string
          provider_id: string
          weekday: number
          start_hour: number
          end_hour: number
          is_available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          provider_id: string
          weekday: number
          start_hour: number
          end_hour: number
          is_available?: boolean
          created_at?: string
        }
        Update: {
          weekday?: number
          start_hour?: number
          end_hour?: number
          is_available?: boolean
        }
      }
      bookings: {
        Row: {
          id: string
          client_id: string
          provider_id: string | null
          service_type_id:
            | 'event-security'
            | 'vip-protection'
            | 'residential-guarding'
            | 'retail-loss-prevention'
            | 'armed-response'
          location_address: string
          city: string
          latitude: number | null
          longitude: number | null
          scheduled_at: string
          duration_hours: number
          guards_needed: number
          special_instructions: string | null
          urgency_level: 'standard' | 'priority' | 'critical'
          status: 'pending' | 'accepted' | 'en_route' | 'active' | 'completed' | 'cancelled'
          quoted_total_cents: number
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          client_id: string
          provider_id?: string | null
          service_type_id:
            | 'event-security'
            | 'vip-protection'
            | 'residential-guarding'
            | 'retail-loss-prevention'
            | 'armed-response'
          location_address: string
          city: string
          latitude?: number | null
          longitude?: number | null
          scheduled_at: string
          duration_hours: number
          guards_needed: number
          special_instructions?: string | null
          urgency_level: 'standard' | 'priority' | 'critical'
          status?: 'pending' | 'accepted' | 'en_route' | 'active' | 'completed' | 'cancelled'
          quoted_total_cents: number
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          provider_id?: string | null
          location_address?: string
          city?: string
          latitude?: number | null
          longitude?: number | null
          scheduled_at?: string
          duration_hours?: number
          guards_needed?: number
          special_instructions?: string | null
          urgency_level?: 'standard' | 'priority' | 'critical'
          status?: 'pending' | 'accepted' | 'en_route' | 'active' | 'completed' | 'cancelled'
          quoted_total_cents?: number
          admin_notes?: string | null
          updated_at?: string
        }
      }
      booking_status_history: {
        Row: {
          id: string
          booking_id: string
          status: 'pending' | 'accepted' | 'en_route' | 'active' | 'completed' | 'cancelled'
          actor_id: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          status: 'pending' | 'accepted' | 'en_route' | 'active' | 'completed' | 'cancelled'
          actor_id?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          note?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          booking_id: string
          amount_cents: number
          status: 'pending' | 'authorized' | 'captured' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          booking_id: string
          amount_cents: number
          status?: 'pending' | 'authorized' | 'captured' | 'failed'
          created_at?: string
        }
        Update: {
          amount_cents?: number
          status?: 'pending' | 'authorized' | 'captured' | 'failed'
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          body: string
          read_at?: string | null
          created_at?: string
        }
        Update: {
          title?: string
          body?: string
          read_at?: string | null
        }
      }
    }
  }
}
