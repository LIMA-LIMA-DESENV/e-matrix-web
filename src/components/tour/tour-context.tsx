'use client'

import { usePathname, useRouter } from 'next/navigation'
import {
  createContext,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react'

import { useVisibleNavItems } from '@/components/shell/use-nav-items'
import { useAuth } from '@/contexts/AuthContext'

import { buildTourSteps, type TourStep } from './tour-steps'

interface ActiveTour {
  /** Fixed when the tour starts, so an index never changes its step. */
  steps: TourStep[]
  index: number
}

interface TourContextData {
  /** The step on the screen, or `null` with the tour inactive. */
  step: TourStep | null
  isFirstStep: boolean
  isLastStep: boolean
  /** Starts at the first step, from any screen. */
  start: () => void
  /** Goes one step on; on the last one, ends the tour. */
  next: () => void
  /** Goes one step back; nothing on the first one. */
  previous: () => void
  /** Ends the tour on the open screen and gives the focus back to Ajuda. */
  end: () => void
  /** The Ajuda button, which takes the focus when the tour ends. */
  helpButtonRef: RefObject<HTMLButtonElement | null>
}

const TourContext = createContext<TourContextData | null>(null)

/**
 * The guided tour of the authenticated area. Its state lives only here, in
 * memory: nothing is stored, so reloading the page ends it, and so does the
 * end of the session, when `(app)/layout.tsx` stops rendering this provider.
 */
export function TourProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { isAdmin } = useAuth()
  const navItems = useVisibleNavItems()
  const [tour, setTour] = useState<ActiveTour | null>(null)
  const helpButtonRef = useRef<HTMLButtonElement>(null)
  // The route the tour asked for and the router has not reached yet, so a
  // quick second click decides against where the page is going, not where
  // it still is.
  const pendingRouteRef = useRef<string | null>(null)
  // The navigations of the tour run in this transition, so the tour knows
  // while one of them is still on its way.
  const [isNavigating, startNavigation] = useTransition()
  // Whether the screen of the current step has been on the page. Leaving it
  // only ends the tour after that, never on the way there.
  const hasReachedRouteRef = useRef(false)
  // The routes the tour asked for since the person last moved through the
  // history. A superseded navigation may still land after the newest one
  // (the redirect of /projetos, for instance); that is not the person
  // leaving the step.
  const requestedRoutesRef = useRef(new Set<string>())

  useEffect(() => {
    const pendingRoute = pendingRouteRef.current

    if (pendingRoute !== null && pathname.startsWith(pendingRoute)) {
      pendingRouteRef.current = null
    }
  }, [pathname])

  const end = useCallback(() => {
    pendingRouteRef.current = null
    hasReachedRouteRef.current = false
    requestedRoutesRef.current.clear()
    setTour(null)
    helpButtonRef.current?.focus()
  }, [])

  const isActive = tour !== null
  const stepRoute = tour ? tour.steps[tour.index].route : null

  // Back and Forward are the person's: from there on, no screen is taken
  // for a late navigation of the tour.
  useEffect(() => {
    if (!isActive) return

    function handlePopState() {
      requestedRoutesRef.current.clear()
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isActive])

  // Keeps the screen and the step together once the tour's navigations have
  // settled.
  useEffect(() => {
    if (stepRoute === null || isNavigating) return

    if (pathname.startsWith(stepRoute)) {
      pendingRouteRef.current = null
      hasReachedRouteRef.current = true
      return
    }

    // Decided in the next task: the router shows the path of a Back press
    // before `popstate` gets here to say that it was the person.
    const timeoutId = window.setTimeout(() => {
      const landedRoutes = Array.from(requestedRoutesRef.current).filter(
        (route) => pathname.startsWith(route)
      )

      if (landedRoutes.length > 0) {
        // A late navigation of the tour landed: the newest step prevails.
        // Each one is answered once, so a step whose route redirects back
        // here cannot loop.
        for (const route of landedRoutes) {
          requestedRoutesRef.current.delete(route)
        }

        pendingRouteRef.current = stepRoute
        hasReachedRouteRef.current = false
        startNavigation(() => {
          router.replace(stepRoute)
        })
        return
      }

      // The screen is no longer the one of the step (the browser's Back
      // button, for instance): the tour ends where the person is, without
      // navigating. A step whose route was never reached (a redirect out
      // of it) stays open.
      if (hasReachedRouteRef.current) {
        end()
      }
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [end, isNavigating, pathname, router, stepRoute])

  const openStep = useCallback(
    (steps: TourStep[], index: number) => {
      const { route } = steps[index]
      const destination = pendingRouteRef.current ?? pathname

      // "The step's screen" is any path that starts with its route, which
      // covers the redirects of /projetos, /avaliacoes and /parametros.
      if (!destination.startsWith(route)) {
        pendingRouteRef.current = route
        hasReachedRouteRef.current = false
        requestedRoutesRef.current.add(route)
        startNavigation(() => {
          router.push(route)
        })
      }

      setTour({ steps, index })
    },
    [pathname, router]
  )

  const hasEvaluations = navItems.some((item) => item.key === 'evaluations')

  const start = useCallback(() => {
    openStep(buildTourSteps({ isAdmin, hasEvaluations }), 0)
  }, [hasEvaluations, isAdmin, openStep])

  const next = useCallback(() => {
    if (!tour) return

    if (tour.index === tour.steps.length - 1) {
      end()
      return
    }

    openStep(tour.steps, tour.index + 1)
  }, [end, openStep, tour])

  const previous = useCallback(() => {
    if (!tour || tour.index === 0) return

    openStep(tour.steps, tour.index - 1)
  }, [openStep, tour])

  const value = useMemo<TourContextData>(
    () => ({
      step: tour ? tour.steps[tour.index] : null,
      isFirstStep: tour?.index === 0,
      isLastStep: tour ? tour.index === tour.steps.length - 1 : false,
      start,
      next,
      previous,
      end,
      helpButtonRef,
    }),
    [end, next, previous, start, tour]
  )

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>
}

export function useTour() {
  const context = useContext(TourContext)

  if (!context) {
    throw new Error('useTour must be used within a TourProvider')
  }

  return context
}
