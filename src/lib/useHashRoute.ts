import { useCallback, useEffect, useState } from 'react'

/* A tiny dependency-free hash router. Views are deep-linkable
   (#/certifications) and the browser back button works, while nav
   items stay real anchors — keyboard-first, no router dependency. */

/** Routes that appear in the sidebar nav. */
export const ROUTES = [
  'dashboard',
  'certifications',
  'materials',
  'schedule',
] as const

export type NavRoute = (typeof ROUTES)[number]
/** All views. `quiz` is a full-screen, distraction-free view (no sidebar) and
    carries the certification id as a path param: `#/quiz/<certId>`. */
export type Route = NavRoute | 'quiz'

interface Location {
  route: Route
  /** Path param after the route segment (used by `quiz`). */
  param?: string
}

function parse(hash: string): Location {
  const parts = hash.replace(/^#\/?/, '').split('/')
  const seg = parts[0]
  if (seg === 'quiz') {
    return { route: 'quiz', param: parts[1] ? decodeURIComponent(parts[1]) : undefined }
  }
  return {
    route: (ROUTES as readonly string[]).includes(seg) ? (seg as Route) : 'dashboard',
  }
}

/** The canonical href for a route, for use on real `<a>` elements. */
export function routeHref(route: Route, param?: string): string {
  return param ? `#/${route}/${encodeURIComponent(param)}` : `#/${route}`
}

export function useHashRoute() {
  const [loc, setLoc] = useState<Location>(() =>
    typeof window === 'undefined' ? { route: 'dashboard' } : parse(window.location.hash),
  )

  useEffect(() => {
    const onChange = () => setLoc(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((next: Route, param?: string) => {
    const href = routeHref(next, param)
    if (window.location.hash !== href) {
      window.location.hash = href
    }
    setLoc({ route: next, param })
  }, [])

  return { route: loc.route, param: loc.param, navigate }
}
