const PUBLIC_ROUTES = new Set([
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
])

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  const isPublic = PUBLIC_ROUTES.has(to.path)

  if (!loggedIn.value && !isPublic) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  if (loggedIn.value && isPublic) {
    return navigateTo('/')
  }
})
