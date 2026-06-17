import type { Database } from '@guardian/supabase'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@guardian/supabase'

let browserClient: SupabaseClient<Database> | null = null

export function useSupabaseBrowser() {
  const config = useRuntimeConfig()

  if (!config.public.supabaseUrl || !config.public.supabaseAnonKey) {
    return null
  }

  if (!browserClient) {
    browserClient = createBrowserSupabaseClient(
      config.public.supabaseUrl,
      config.public.supabaseAnonKey
    )
  }

  return browserClient
}
