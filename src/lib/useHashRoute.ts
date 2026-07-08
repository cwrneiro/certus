import { useCallback, useEffect, useState } from 'react'

/* A tiny dependency-free hash router. Views are deep-linkable
   (#/certifications) and the browser back button works, while nav
   items stay real anchors — keyboard-first, no router dependency. */

export const ROUTES = [
  'dashboard',
  'certifications',
  'materials',
  'schedule',
] as const

export type Route = (typeof ROUTES)[number]

function parse(hash: string): Route {
  const seg = hash.replace(/^#\/?/, '').split('/')[0]
  return (ROUTES as readonly string[]).includes(seg) ? (seg as Route) : 'dashboard'
}

/** The canonical href for a route, for use on real `<a>` elements. */
export function routeHref(route: Route): string {
  return `#/${route}`
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === 'undefined' ? 'dashboard' : parse(window.location.hash),
  )

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((next: Route) => {
    if (parse(window.location.hash) !== next) {
      window.location.hash = routeHref(next)
    }
    setRoute(next)
  }, [])

  return { route, navigate }
}
