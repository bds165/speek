import { useCallback, useEffect, useRef, useState } from 'react'

import { pickTopic } from './topics.ts'

// How many past Topics Shuffle avoids dealing again (out of the whole list).
const RECENT_LIMIT = 10

// How long each flicked Topic stays up, slowing down like a deck coming to rest.
// The last one is the dealt Topic landing. The total stays well under a second.
const FLICK_MS = [60, 80, 110, 150, 200]

function prefersReducedMotion() {
  // jsdom (tests) and very old browsers have no matchMedia: treat that as "motion is fine".
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// `topic` is the dealt Topic: the one recorded against and read to screen readers.
// `flickingTopic` is a Topic riffling past on screen (null when the card has settled).
export function useTopic() {
  const [recent, setRecent] = useState<string[]>(() => [pickTopic([])])
  const [flickingTopic, setFlickingTopic] = useState<string | null>(null)
  const timersRef = useRef<number[]>([])
  const topic = recent[recent.length - 1]

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  const shuffle = useCallback(() => {
    clearTimers()
    const next = pickTopic(recent)
    // Deal straight away, so whatever happens mid-riffle uses the new Topic.
    setRecent([...recent, next].slice(-RECENT_LIMIT))
    if (prefersReducedMotion()) {
      setFlickingTopic(null)
      return
    }

    // Flick a few other Topics past, land the dealt one, then go back to plain text.
    // The first flick is set right away, so the dealt Topic never shows before the riffle.
    const flicks: string[] = []
    for (let i = 0; i < FLICK_MS.length - 1; i++) {
      // Every flick is new: not the old Topic, an earlier flick, or the dealt one.
      flicks.push(pickTopic([topic, next, ...flicks]))
    }
    flicks.push(next)
    setFlickingTopic(flicks[0])
    let at = 0
    FLICK_MS.forEach((ms, i) => {
      at += ms
      const shown = flicks[i + 1] ?? null
      timersRef.current.push(window.setTimeout(() => setFlickingTopic(shown), at))
    })
  }, [recent, topic, clearTimers])

  useEffect(() => clearTimers, [clearTimers])

  return { topic, flickingTopic, shuffle }
}
