import { useCallback, useEffect, useState } from 'react'

export type AppRoute = 'home' | 'login' | 'games' | 'draft' | 'team' | 'standings' | 'cap-space' | 'settings'

function pathToRoute(hash: string): AppRoute {
  const path = (hash.startsWith('#') ? hash.slice(1) : hash) || '/'
  const seg = path.split('/').filter(Boolean)[0]
  if (seg === 'draft') return 'draft'
  if (seg === 'team') return 'team'
  if (seg === 'standings') return 'standings'
  if (seg === 'cap-space') return 'cap-space'
  if (seg === 'login') return 'login'
  if (seg === 'games') return 'games'
  if (seg === 'settings') return 'settings'
  return 'home'
}

function routeToHash(route: AppRoute): string {
  if (route === 'home') return '#/'
  return `#/${route}`
}

export function useHashRoute(): [AppRoute, (route: AppRoute) => void] {
  const [route, setRoute] = useState<AppRoute>(() =>
    pathToRoute(typeof window !== 'undefined' ? window.location.hash : '#/'),
  )

  useEffect(() => {
    const sync = () => setRoute(pathToRoute(window.location.hash))
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const navigate = useCallback((next: AppRoute) => {
    const nextHash = routeToHash(next)
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash
    } else {
      setRoute(next)
    }
  }, [])

  return [route, navigate]
}
