import type { AppProfile, AppSession, SignUpInput } from '@guardian/domain'
import type { Database } from '@guardian/supabase'
import { signUpSchema } from '@guardian/domain'

export const useSessionStore = defineStore('session', () => {
  const currentUser = ref<AppSession | null>(null)
  const hydrated = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const sessionCookie = useCookie<AppSession | null>('guardian-session', {
    sameSite: 'lax'
  })

  function setSession(session: AppSession | null) {
    currentUser.value = session
    sessionCookie.value = session
  }

  async function hydrate() {
    if (hydrated.value) {
      return
    }

    currentUser.value = sessionCookie.value ?? null

    const { hasSupabase } = usePlatformMode()

    if (process.client && hasSupabase.value) {
      const client = useSupabaseBrowser()

      if (client) {
        const { data } = await client.auth.getSession()

        if (!data.session) {
          if (currentUser.value?.authMode === 'supabase') {
            setSession(null)
          }
        } else if (!currentUser.value) {
          await refreshSupabaseProfile(data.session.user.id, data.session.user.email ?? '')
        }
      }
    }

    hydrated.value = true
  }

  async function refreshSupabaseProfile(userId: string, email: string) {
    const client = useSupabaseBrowser()

    if (!client) {
      return null
    }

    const { data, error: profileError } = await (client.from('profiles') as any)
      .select('id, full_name, email, role')
      .eq('id', userId)
      .single()

    if (profileError || !data) {
      throw new Error(profileError?.message ?? 'Could not load your profile.')
    }

    const profileRow = data as Pick<
      Database['public']['Tables']['profiles']['Row'],
      'id' | 'full_name' | 'email' | 'role'
    >

    setSession({
      userId: profileRow.id,
      fullName: profileRow.full_name,
      email: profileRow.email ?? email,
      role: profileRow.role,
      authMode: 'supabase'
    })

    return currentUser.value
  }

  async function signInDemo(email: string, password: string) {
    const demoStore = useDemoStore()
    demoStore.hydrate()

    const credential = demoStore.credentials.find(
      (item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password
    )

    if (!credential) {
      throw new Error('Those demo credentials do not match any account.')
    }

    const profile = demoStore.profiles.find((item) => item.id === credential.userId)

    if (!profile) {
      throw new Error('The demo account profile is missing.')
    }

    setSession({
      userId: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      role: profile.role,
      authMode: 'demo'
    })
  }

  async function signUpDemo(input: SignUpInput) {
    const parsed = signUpSchema.parse(input)
    const demoStore = useDemoStore()
    demoStore.hydrate()

    const emailExists = demoStore.credentials.some(
      (item) => item.email.toLowerCase() === parsed.email.toLowerCase()
    )

    if (emailExists) {
      throw new Error('A demo account with that email already exists.')
    }

    const profile: AppProfile = {
      id: crypto.randomUUID(),
      fullName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone,
      role: parsed.role,
      createdAt: new Date().toISOString()
    }

    demoStore.addProfile(profile, {
      userId: profile.id,
      email: parsed.email,
      password: parsed.password
    })

    setSession({
      userId: profile.id,
      fullName: profile.fullName,
      email: profile.email,
      role: profile.role,
      authMode: 'demo'
    })
  }

  async function signInSupabase(email: string, password: string) {
    const client = useSupabaseBrowser()

    if (!client) {
      throw new Error('Supabase is not configured.')
    }

    const { data, error: authError } = await client.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !data.user) {
      throw new Error(authError?.message ?? 'Could not sign in.')
    }

    await refreshSupabaseProfile(data.user.id, data.user.email ?? email)
  }

  async function signUpSupabase(input: SignUpInput) {
    const parsed = signUpSchema.parse(input)
    const client = useSupabaseBrowser()

    if (!client) {
      throw new Error('Supabase is not configured.')
    }

    const { data, error: authError } = await client.auth.signUp({
      email: parsed.email,
      password: parsed.password,
      options: {
        data: {
          full_name: parsed.fullName,
          phone: parsed.phone,
          role: parsed.role
        }
      }
    })

    if (authError || !data.user) {
      throw new Error(authError?.message ?? 'Could not create the account.')
    }

    const profileInsert: Database['public']['Tables']['profiles']['Insert'] = {
      id: data.user.id,
      full_name: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone,
      role: parsed.role
    }

    await (client.from('profiles') as any).upsert(profileInsert)

    if (data.session) {
      await refreshSupabaseProfile(data.user.id, parsed.email)
    }

    return {
      requiresEmailConfirmation: !data.session
    }
  }

  async function signOut() {
    const client = useSupabaseBrowser()

    if (currentUser.value?.authMode === 'supabase' && client) {
      await client.auth.signOut()
    }

    setSession(null)
  }

  return {
    currentUser,
    hydrated,
    loading,
    error,
    hydrate,
    signInDemo,
    signUpDemo,
    signInSupabase,
    signUpSupabase,
    signOut,
    setSession
  }
})
