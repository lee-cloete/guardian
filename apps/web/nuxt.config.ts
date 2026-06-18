import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
  compatibilityDate: '2026-06-17',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss', '@pinia/nuxt'],
  css: ['~/assets/css/tailwind.css'],
  future: {
    compatibilityVersion: 4
  },
  runtimeConfig: {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      demoMode: process.env.NUXT_PUBLIC_DEMO_MODE ?? 'true',
      mapCountryCodes: process.env.NUXT_PUBLIC_MAP_COUNTRY_CODES ?? 'za'
    }
  },
  app: {
    head: {
      title: 'Guardian',
      meta: [
        {
          name: 'description',
          content:
            'Guardian is a security booking platform for clients, providers, and operators.'
        }
      ]
    }
  },
  tailwindcss: {
    cssPath: '~/assets/css/tailwind.css',
    viewer: false
  },
  typescript: {
    strict: true,
    typeCheck: true
  }
})
