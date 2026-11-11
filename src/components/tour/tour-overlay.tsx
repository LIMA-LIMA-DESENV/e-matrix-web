'use client'

import { useTranslations } from 'next-intl'
import {
  type ReactNode,
  type RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

import {
  Button,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  ModalTitle,
} from '@/components/ui'
import { cn } from '@/lib/utils'

import { useTour } from './tour-context'
import type { TourStep, TourTarget } from './tour-steps'
import { WIDE_SCREEN_QUERY } from './wide-screen'

const TITLE_ID = 'tour-card-title'
const TEXT_ID = 'tour-card-text'

/** How long a target may be missing before the step is shown centered. */
const TARGET_TIMEOUT_MS = 1000
/** Space between the card and the sidebar, and around the card. */
const CARD_GAP = 16
/** No transition where the person asked for reduced motion (NFR-006). */
const BUTTON_CLASS = 'px-4 motion-reduce:transition-none'
/** The card's `max-w-md`. */
const CARD_MAX_WIDTH = 448

const SIDEBAR_SELECTOR = '[data-tour-target="sidebar"]'

const bold = (chunks: ReactNode) => <b>{chunks}</b>

interface Box {
  top: number
  left: number
  right: number
  bottom: number
}

/** Where the highlight and the card go, in viewport pixels. */
interface Spotlight {
  hole: Box
  /** Placed from the left edge of the window or, with `right`, from the right one. */
  card: { top: number; left?: number; right?: number; maxWidth: number }
}

function intersect(a: Box, b: Box): Box | null {
  const box = {
    top: Math.max(a.top, b.top),
    left: Math.max(a.left, b.left),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  }

  return box.right > box.left && box.bottom > box.top ? box : null
}

function isSameSpotlight(a: Spotlight | null, b: Spotlight | null) {
  if (a === null || b === null) return a === b

  return (
    a.hole.top === b.hole.top &&
    a.hole.left === b.hole.left &&
    a.hole.right === b.hole.right &&
    a.hole.bottom === b.hole.bottom &&
    a.card.top === b.card.top &&
    a.card.left === b.card.left &&
    a.card.right === b.card.right &&
    a.card.maxWidth === b.card.maxWidth
  )
}

/**
 * Measures the target of the step (the element the shell marks with
 * `data-tour-target`) and places the card to the right of the sidebar, whole
 * inside the window. A target outside the sidebar (the item of the classic
 * Administração menu, at the right edge) has the card on its side with more
 * room. `null` is the centered card: a step without a target, a
 * screen below `lg` or a target that has been missing for a second.
 *
 * The target is measured on every frame while the step is open, which follows
 * it through a resize, a scroll of the menu, the width transition of the
 * classic sidebar and the icon font arriving, and brings a menu item hidden
 * by the scroll of the sidebar back into view.
 */
function useSpotlight(
  target: TourTarget,
  cardRef: RefObject<HTMLDivElement | null>
) {
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null)

  useLayoutEffect(() => {
    if (target === 'none') return

    const wideScreen = window.matchMedia(WIDE_SCREEN_QUERY)
    let shown: Spotlight | null = null
    let lastSeenAt = performance.now()
    let frameId = 0

    function measure(): Spotlight | null {
      if (!wideScreen.matches) return null

      const element = document.querySelector<HTMLElement>(
        `[data-tour-target="${target}"]`
      )
      const sidebar = element?.closest<HTMLElement>(SIDEBAR_SELECTOR) ?? null
      const viewport = {
        top: 0,
        left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
      }
      let hole: Box | null = null

      if (element && sidebar) {
        // What the sidebar shows: it scrolls, and the classic one starts
        // below the header.
        const visible = intersect(viewport, sidebar.getBoundingClientRect())

        if (visible && element !== sidebar) {
          const rect = element.getBoundingClientRect()

          if (rect.top < visible.top) {
            sidebar.scrollTop -= visible.top - rect.top
          } else if (rect.bottom > visible.bottom) {
            sidebar.scrollTop += rect.bottom - visible.bottom
          }
        }

        hole = visible && intersect(visible, element.getBoundingClientRect())
      } else if (element) {
        hole = intersect(viewport, element.getBoundingClientRect())
      }

      if (!element || !hole) {
        // Missing for a moment (a menu still mounting): what is on the
        // screen stays. Missing for longer: the centered card.
        return performance.now() - lastSeenAt < TARGET_TIMEOUT_MS ? shown : null
      }

      lastSeenAt = performance.now()

      const anchor = (sidebar ?? element).getBoundingClientRect()
      const windowWidth = document.documentElement.clientWidth
      const isOnTheLeft = !sidebar && anchor.left > windowWidth - anchor.right
      const left = Math.round(anchor.right) + CARD_GAP
      const cardHeight = cardRef.current?.offsetHeight ?? 0
      // Beside the middle of the target, as far as the window allows.
      const top = Math.max(
        CARD_GAP,
        Math.min(
          Math.round((hole.top + hole.bottom - cardHeight) / 2),
          window.innerHeight - cardHeight - CARD_GAP
        )
      )

      return {
        hole: {
          top: Math.round(hole.top),
          left: Math.round(hole.left),
          right: Math.round(hole.right),
          bottom: Math.round(hole.bottom),
        },
        card: isOnTheLeft
          ? {
              top,
              right: windowWidth - Math.round(anchor.left) + CARD_GAP,
              maxWidth: Math.min(
                CARD_MAX_WIDTH,
                Math.round(anchor.left) - 2 * CARD_GAP
              ),
            }
          : {
              top,
              left,
              maxWidth: Math.min(
                CARD_MAX_WIDTH,
                window.innerWidth - left - CARD_GAP
              ),
            },
      }
    }

    function update() {
      const next = measure()

      if (!isSameSpotlight(shown, next)) {
        shown = next
        setSpotlight(next)
      }

      frameId = window.requestAnimationFrame(update)
    }

    // The first measure comes before the paint, so a step with its target
    // on the screen never flashes the centered card.
    update()

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [target, cardRef])

  return spotlight
}

interface TourOverlayProps {
  /** The classic layout, whose sidebar collapses (`steps.navigation.collapseHint`). */
  isClassic: boolean
  /**
   * The session warning is on the screen: the tour gives it the place and
   * comes back on the same step.
   */
  isSuspended: boolean
}

/**
 * The layer of the guided tour: it darkens and blocks the page and shows the
 * card of the current step. On a wide screen, a step with a target leaves it
 * visible through a cutout and has the card beside it; otherwise the card is
 * centered. Nothing is rendered with the tour inactive or suspended.
 */
export function TourOverlay({ isClassic, isSuspended }: TourOverlayProps) {
  const { step, end } = useTour()
  const isActive = step !== null
  const shownLayoutRef = useRef(isClassic)

  // Another layout is another menu and another header: the tour ends on the
  // open screen. Its own layer keeps the switcher out of reach, so this only
  // guards a change that comes from elsewhere.
  useEffect(() => {
    if (shownLayoutRef.current === isClassic) return

    shownLayoutRef.current = isClassic

    if (isActive) {
      end()
    }
  }, [end, isActive, isClassic])

  if (!step || isSuspended) {
    return null
  }

  // Above the sidebar, the dropdowns and the modals (z-50), which this layer
  // keeps out of reach of the pointer, the highlighted target included.
  return createPortal(
    <div className="fixed inset-0 z-60 font-body text-on-surface">
      <TourCard key={step.key} step={step} isClassic={isClassic} />
    </div>,
    document.body
  )
}

interface TourCardProps {
  step: TourStep
  isClassic: boolean
}

/**
 * Mounted again for each step, and when the tour comes back from a
 * suspension, so each time it takes the focus and is announced.
 */
function TourCard({ step, isClassic }: TourCardProps) {
  const t = useTranslations('tour')
  const tn = useTranslations('nav')
  const { isFirstStep, next, previous, end } = useTour()
  const cardRef = useRef<HTMLDivElement>(null)
  const spotlight = useSpotlight(step.target, cardRef)

  useEffect(() => {
    cardRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        end()
        return
      }

      if (event.key !== 'Tab' || !cardRef.current) return

      // Tab and Shift+Tab go around the buttons of the card and never leave
      // it, wherever the focus is (a click on the dark layer drops it).
      const buttons = Array.from(cardRef.current.querySelectorAll('button'))
      const first = buttons[0]
      const last = buttons[buttons.length - 1]
      const current = document.activeElement
      const isOnButton = buttons.some((button) => button === current)

      if (event.shiftKey && (current === first || !isOnButton)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (current === last || !isOnButton)) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [end])

  const title =
    step.title.type === 'greeting'
      ? t('steps.welcome.title')
      : step.title.type === 'app'
        ? t('appTitle')
        : t('moduleTitle', { module: tn(step.title.nav) })

  // The target does not change layer nor style: the dark layer is clipped
  // around its rectangle (the outer ring, then the hole, even-odd).
  const hole = spotlight?.hole
  const cutout = hole
    ? `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${hole.left}px ${hole.top}px, ${hole.left}px ${hole.bottom}px, ${hole.right}px ${hole.bottom}px, ${hole.right}px ${hole.top}px, ${hole.left}px ${hole.top}px)`
    : undefined

  return (
    <>
      <ModalOverlay style={{ clipPath: cutout }} />
      <ModalContent
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        aria-describedby={TEXT_ID}
        tabIndex={-1}
        className={cn('max-w-md outline-none', spotlight && 'fixed')}
        style={spotlight?.card}
      >
        <ModalTitle id={TITLE_ID}>{title}</ModalTitle>
        <ModalBody id={TEXT_ID} className="space-y-3 text-sm text-on-surface">
          {step.paragraphs
            .filter((paragraph) => isClassic || !paragraph.classicOnly)
            .map((paragraph) => (
              <p key={paragraph.key}>{t.rich(paragraph.key, { b: bold })}</p>
            ))}
        </ModalBody>
        {/* Narrow enough for a 375px screen; Sair wraps if a language is wider. */}
        <ModalFooter className="flex-wrap justify-between gap-2">
          <div className="flex items-center gap-2">
            {!isFirstStep && (
              <Button
                type="button"
                variant="outline"
                color="primary"
                className={BUTTON_CLASS}
                onClick={previous}
              >
                {t('previous')}
              </Button>
            )}
            <Button type="button" className={BUTTON_CLASS} onClick={next}>
              {t('next')}
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            color="primary"
            className={cn(BUTTON_CLASS, 'ml-auto')}
            onClick={end}
          >
            {t('exit')}
          </Button>
        </ModalFooter>
      </ModalContent>
    </>
  )
}
