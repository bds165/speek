import { describe, expect, it } from 'vitest'

import { TOPICS, pickTopic } from './topics.ts'

// A fake Math.random that walks through the given values.
function sequence(...values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

describe('pickTopic', () => {
  it('picks a Topic from the list', () => {
    expect(TOPICS).toContain(pickTopic([]))
  })

  it('never picks a recently seen Topic', () => {
    const recent = TOPICS.slice(0, 10)
    // Try the whole range of random values, including the edges.
    for (let r = 0; r < 1; r += 0.01) {
      expect(recent).not.toContain(pickTopic(recent, () => r))
    }
  })

  it('still avoids the current Topic when every Topic has been seen', () => {
    const recent = [...TOPICS]
    const current = recent.at(-1)
    for (let r = 0; r < 1; r += 0.01) {
      expect(pickTopic(recent, () => r)).not.toBe(current)
    }
  })

  it('uses the random value to choose', () => {
    const first = pickTopic([], sequence(0))
    const last = pickTopic([], sequence(0.999))
    expect(first).toBe(TOPICS[0])
    expect(last).toBe(TOPICS.at(-1))
  })
})

describe('TOPICS', () => {
  it('has no duplicates', () => {
    expect(new Set(TOPICS).size).toBe(TOPICS.length)
  })
})
