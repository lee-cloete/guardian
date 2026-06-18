<script setup lang="ts">
import { BriefcaseBusiness, ChevronRight, CircleUserRound, Shield, Sparkles } from '@lucide/vue'
import { signInSchema, signUpSchema } from '@guardian/domain'

const route = useRoute()
const sessionStore = useSessionStore()
const { demoMode } = usePlatformMode()

const signInForm = reactive({
  email: 'client@guardian.demo',
  password: 'demo1234'
})

const signUpForm = reactive({
  fullName: '',
  email: '',
  phone: '',
  password: 'demo1234',
  role: 'client' as 'client' | 'provider'
})

const activeTab = ref<'sign-in' | 'sign-up'>('sign-in')
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const demoLogins = [
  {
    role: 'Client',
    icon: CircleUserRound,
    email: 'client@guardian.demo',
    password: 'demo1234'
  },
  {
    role: 'Provider',
    icon: BriefcaseBusiness,
    email: 'provider@guardian.demo',
    password: 'demo1234'
  },
  {
    role: 'Admin',
    icon: Shield,
    email: 'admin@guardian.demo',
    password: 'demo1234'
  }
]

async function routeAfterAuth() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
  await navigateTo(redirect ?? '/dashboard')
}

async function submitSignIn() {
  errorMessage.value = null
  successMessage.value = null
  loading.value = true

  try {
    const parsed = signInSchema.parse(signInForm)

    if (demoMode.value) {
      await sessionStore.signInDemo(parsed.email, parsed.password)
    } else {
      await sessionStore.signInSupabase(parsed.email, parsed.password)
    }

    await routeAfterAuth()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not sign in.'
  } finally {
    loading.value = false
  }
}

async function submitSignUp() {
  errorMessage.value = null
  successMessage.value = null
  loading.value = true

  try {
    const parsed = signUpSchema.parse(signUpForm)

    if (demoMode.value) {
      await sessionStore.signUpDemo(parsed)
      await routeAfterAuth()
    } else {
      const result = await sessionStore.signUpSupabase(parsed)

      successMessage.value = result.requiresEmailConfirmation
        ? 'Account created. Check your email to confirm the signup before logging in.'
        : 'Account created. You can continue into the dashboard now.'

      if (!result.requiresEmailConfirmation) {
        await routeAfterAuth()
      }
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not create the account.'
  } finally {
    loading.value = false
  }
}

async function quickLogin(email: string, password: string) {
  signInForm.email = email
  signInForm.password = password
  activeTab.value = 'sign-in'
  await submitSignIn()
}
</script>

<template>
  <main class="mx-auto max-w-[1440px] px-4 py-8 lg:px-6 lg:py-10">
    <div class="grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
      <section class="rounded-lg border border-stone-200 bg-white p-6 shadow-sm lg:p-8">
        <p class="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500">
          {{ demoMode ? 'Demo mode' : 'Supabase mode' }}
        </p>
        <h1 class="mt-4 text-3xl font-semibold text-stone-950 lg:text-4xl">
          Enter the operating surface that matches your role.
        </h1>
        <p class="mt-4 max-w-xl text-base leading-7 text-stone-600">
          Use seeded accounts to explore the full client, provider, and admin flow immediately.
          When Supabase is configured, the same screens switch to real auth and data.
        </p>

        <div class="mt-6 flex items-center gap-2 rounded-[20px] bg-stone-50 px-4 py-3 text-sm text-stone-600">
          <Sparkles class="h-4 w-4 text-stone-500" />
          Pick a role card and jump straight into its operating surface.
        </div>

        <div class="mt-8 space-y-3">
          <button
            v-for="demo in demoLogins"
            :key="demo.role"
            type="button"
            class="flex w-full items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-4 py-4 text-left transition hover:border-stone-300 hover:bg-white"
            @click="quickLogin(demo.email, demo.password)"
          >
            <div class="flex items-center gap-3">
              <span class="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm">
                <component :is="demo.icon" class="h-5 w-5 text-stone-700" />
              </span>
              <div>
                <p class="text-sm font-semibold text-stone-950">{{ demo.role }} demo</p>
                <p class="text-sm text-stone-500">{{ demo.email }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-medium text-stone-600">Password: {{ demo.password }}</span>
              <ChevronRight class="h-4 w-4 text-stone-400" />
            </div>
          </button>
        </div>
      </section>

      <section class="rounded-lg border border-stone-200 bg-white p-6 shadow-sm lg:p-8">
        <div class="inline-flex rounded-full border border-stone-200 bg-stone-100 p-1">
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-medium transition"
            :class="activeTab === 'sign-in' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500'"
            @click="activeTab = 'sign-in'"
          >
            Sign in
          </button>
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-medium transition"
            :class="activeTab === 'sign-up' ? 'bg-white text-stone-950 shadow-sm' : 'text-stone-500'"
            @click="activeTab = 'sign-up'"
          >
            Create account
          </button>
        </div>

        <p v-if="errorMessage" class="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {{ errorMessage }}
        </p>
        <p
          v-if="successMessage"
          class="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          {{ successMessage }}
        </p>

        <form v-if="activeTab === 'sign-in'" class="mt-8 space-y-5" @submit.prevent="submitSignIn">
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-stone-600">Email</span>
            <input
              v-model="signInForm.email"
              type="email"
              class="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-stone-400 focus:bg-white"
            />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-stone-600">Password</span>
            <input
              v-model="signInForm.password"
              type="password"
              class="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-stone-400 focus:bg-white"
            />
          </label>
          <button
            type="submit"
            class="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
          >
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>

        <form v-else class="mt-8 space-y-5" @submit.prevent="submitSignUp">
          <div class="grid gap-5 md:grid-cols-2">
            <label class="block md:col-span-2">
              <span class="mb-2 block text-sm font-medium text-stone-600">Full name</span>
              <input
                v-model="signUpForm.fullName"
                type="text"
                class="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-stone-400 focus:bg-white"
              />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-600">Email</span>
              <input
                v-model="signUpForm.email"
                type="email"
                class="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-stone-400 focus:bg-white"
              />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-600">Phone</span>
              <input
                v-model="signUpForm.phone"
                type="text"
                class="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-stone-400 focus:bg-white"
              />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-600">Password</span>
              <input
                v-model="signUpForm.password"
                type="password"
                class="w-full rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-stone-950 outline-none transition focus:border-stone-400 focus:bg-white"
              />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-600">Role</span>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  class="flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition"
                  :class="signUpForm.role === 'client' ? 'bg-stone-950 text-white' : 'border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'"
                  @click="signUpForm.role = 'client'"
                >
                  <CircleUserRound class="h-4 w-4" />
                  Client
                </button>
                <button
                  type="button"
                  class="flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-medium transition"
                  :class="signUpForm.role === 'provider' ? 'bg-stone-950 text-white' : 'border border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300'"
                  @click="signUpForm.role = 'provider'"
                >
                  <BriefcaseBusiness class="h-4 w-4" />
                  Provider
                </button>
              </div>
            </label>
          </div>
          <button
            type="submit"
            class="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:border-stone-400 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
          >
            {{ loading ? 'Creating account...' : 'Create account' }}
          </button>
        </form>
      </section>
    </div>
  </main>
</template>
