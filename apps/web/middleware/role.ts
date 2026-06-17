import type { AppSession } from '@guardian/domain'

export default defineNuxtRouteMiddleware((to) => {
  const requiredRoles = to.meta.roles

  if (!requiredRoles?.length) {
    return
  }

  const session = useCookie<AppSession | null>('guardian-session')

  if (!session.value) {
    return navigateTo('/auth/sign-in')
  }

  if (!requiredRoles.includes(session.value.role)) {
    const target =
      session.value.role === 'client'
        ? '/dashboard/client'
        : session.value.role === 'provider'
          ? '/dashboard/provider'
          : '/dashboard/admin'

    return navigateTo(target)
  }
})
