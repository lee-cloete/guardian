export function usePlatformMode() {
  const config = useRuntimeConfig()

  const demoMode = computed(
    () =>
      config.public.demoMode === 'true' ||
      !config.public.supabaseUrl ||
      !config.public.supabaseAnonKey
  )

  const hasSupabase = computed(() => !demoMode.value)

  return {
    demoMode,
    hasSupabase
  }
}
