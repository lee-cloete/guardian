import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export function createBrowserSupabaseClient(url: string, anonKey: string) {
  return createClient<Database>(url, anonKey)
}

export function createServiceSupabaseClient(url: string, serviceRoleKey: string) {
  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export type { Database } from './types'
