// Public routes accessible without login.
const PUBLIC_ROUTES = new Set([
  '/',
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/explore',
])
const PUBLIC_PREFIXES = ['/p/'] // public shared search views

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  const isPublic =
    PUBLIC_ROUTES.has(to.path) || PUBLIC_PREFIXES.some((p) => to.path.startsWith(p))

  if (!loggedIn.value && !isPublic) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  // Logged-in users skip the landing/auth pages and go straight to the dashboard.
  if (loggedIn.value && (to.path === '/' || to.path === '/login' || to.path === '/register')) {
    return navigateTo('/dashboard')
  }
})
