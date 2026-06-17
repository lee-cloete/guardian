<script setup lang="ts">
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
    email: 'client@guardian.demo',
    password: 'demo1234'
  },
  {
    role: 'Provider',
    email: 'provider@guardian.demo',
    password: 'demo1234'
  },
  {
    role: 'Admin',
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
  <main class="mx-auto max-w-7xl px-6 py-16 lg:px-8">
    <div class="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
      <section class="rounded-[28px] border border-stone-800 bg-stone-900/60 p-8">
        <p class="text-sm font-semibold uppercase tracking-wide text-emerald-300">
          {{ demoMode ? 'Demo mode' : 'Supabase mode' }}
        </p>
        <h1 class="mt-4 text-4xl font-semibold text-white">
          Enter the operating surface that matches your role.
        </h1>
        <p class="mt-4 max-w-xl text-base leading-7 text-stone-300">
          Use seeded accounts to explore the full client, provider, and admin flow immediately.
          When Supabase is configured, the same screens switch to real auth and data.
        </p>

        <div class="mt-8 space-y-3">
          <button
            v-for="demo in demoLogins"
            :key="demo.role"
            type="button"
            class="flex w-full items-center justify-between rounded-2xl border border-stone-800 bg-stone-950/70 px-4 py-4 text-left transition hover:border-stone-600"
            @click="quickLogin(demo.email, demo.password)"
          >
            <div>
              <p class="text-sm font-semibold text-white">{{ demo.role }} demo</p>
              <p class="text-sm text-stone-400">{{ demo.email }}</p>
            </div>
            <span class="text-xs font-medium text-emerald-300">Password: {{ demo.password }}</span>
          </button>
        </div>
      </section>

      <section class="rounded-[28px] border border-stone-800 bg-stone-900/60 p-8">
        <div class="inline-flex rounded-full border border-stone-800 bg-stone-950 p-1">
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-medium transition"
            :class="activeTab === 'sign-in' ? 'bg-white text-stone-950' : 'text-stone-300'"
            @click="activeTab = 'sign-in'"
          >
            Sign in
          </button>
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-medium transition"
            :class="activeTab === 'sign-up' ? 'bg-white text-stone-950' : 'text-stone-300'"
            @click="activeTab = 'sign-up'"
          >
            Create account
          </button>
        </div>

        <p v-if="errorMessage" class="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
          {{ errorMessage }}
        </p>
        <p
          v-if="successMessage"
          class="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
        >
          {{ successMessage }}
        </p>

        <form v-if="activeTab === 'sign-in'" class="mt-8 space-y-5" @submit.prevent="submitSignIn">
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-stone-300">Email</span>
            <input
              v-model="signInForm.email"
              type="email"
              class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
            />
          </label>
          <label class="block">
            <span class="mb-2 block text-sm font-medium text-stone-300">Password</span>
            <input
              v-model="signInForm.password"
              type="password"
              class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
            />
          </label>
          <button
            type="submit"
            class="rounded-full bg-emerald-300 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
          >
            {{ loading ? 'Signing in...' : 'Sign in' }}
          </button>
        </form>

        <form v-else class="mt-8 space-y-5" @submit.prevent="submitSignUp">
          <div class="grid gap-5 md:grid-cols-2">
            <label class="block md:col-span-2">
              <span class="mb-2 block text-sm font-medium text-stone-300">Full name</span>
              <input
                v-model="signUpForm.fullName"
                type="text"
                class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-300">Email</span>
              <input
                v-model="signUpForm.email"
                type="email"
                class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-300">Phone</span>
              <input
                v-model="signUpForm.phone"
                type="text"
                class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-300">Password</span>
              <input
                v-model="signUpForm.password"
                type="password"
                class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-stone-300">Role</span>
              <select
                v-model="signUpForm.role"
                class="w-full rounded-2xl border border-stone-700 bg-stone-950 px-4 py-3 text-white outline-none transition focus:border-emerald-300"
              >
                <option value="client">Client</option>
                <option value="provider">Provider</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            class="rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
          >
            {{ loading ? 'Creating account...' : 'Create account' }}
          </button>
        </form>
      </section>
    </div>
  </main>
</template>
