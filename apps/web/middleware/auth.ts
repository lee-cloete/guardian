import type { AppSession } from '@guardian/domain'

export default defineNuxtRouteMiddleware((to) => {
  const session = useCookie<AppSession | null>('guardian-session')

  if (!session.value) {
    return navigateTo({
      path: '/auth/sign-in',
      query: {
        redirect: to.fullPath
      }
    })
  }
})
