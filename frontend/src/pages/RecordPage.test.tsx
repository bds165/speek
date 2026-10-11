import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { stubMedia } from '../test/fakeMedia.ts'
import { RecordPage } from './RecordPage.tsx'

type Word = { text: string; start: number; end: number; is_filler: boolean }

function word(text: string, is_filler = false): Word {
  return { text, start: 0, end: 0.3, is_filler }
}

const TRANSCRIPT = [word('So,'), word('um,', true), word('I'), word('think'), word('uh', true), word('yes.')]

const NO_PAUSES = { pause_count: 0, pauses: [] }

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  stubMedia()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

async function recordAttempt() {
  const user = userEvent.setup()
  render(<RecordPage />)
  await user.click(screen.getByRole('button', { name: 'Start recording' }))
  await user.click(screen.getByRole('button', { name: 'Stop' }))
  return user
}

describe('The Topic card', () => {
  it('shows what to talk about, before you start recording', () => {
    render(<RecordPage />)

    const topic = screen.getByRole('region', { name: 'Topic' })
    expect(
      within(topic).getByRole('heading', {
        name: 'Pick something you know well and talk about it for a minute.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument()
  })
})

describe('Getting feedback on the Record page', () => {
  it('uploads the Attempt and shows the transcript with Fillers highlighted', async () => {
    let respond: (r: Response) => void = () => {}
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (respond = resolve)))
    const user = await recordAttempt()

    await user.click(screen.getByRole('button', { name: 'Get feedback' }))

    expect(screen.getByText('Analysing…')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Analysing/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Record again' })).toBeDisabled()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/feedback')
    expect(init.method).toBe('POST')
    expect((init.body as FormData).get('audio')).toBeInstanceOf(Blob)

    respond(jsonResponse(200, { transcript: TRANSCRIPT, enough_speech: true }))

    const transcript = await screen.findByRole('region', { name: 'Transcript' })
    expect(transcript).toHaveTextContent('So, um, I think uh yes.')
    const fillers = within(transcript).getAllByRole('mark')
    expect(fillers.map((m) => m.textContent)).toEqual(['um,', 'uh'])
    expect(screen.getByRole('button', { name: 'Record again' })).toBeEnabled()
  })

  it('shows the Metrics below the transcript, with the typical WPM band', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        transcript: TRANSCRIPT,
        enough_speech: true,
        metrics: { ...NO_PAUSES, wpm: 138, typical_wpm: { low: 120, high: 160 }, filler_count: 6 },
      }),
    )
    const user = await recordAttempt()

    await user.click(screen.getByRole('button', { name: 'Get feedback' }))

    const metrics = await screen.findByRole('region', { name: 'Metrics' })
    expect(metrics).toHaveTextContent(
      '138 words a minute (typical ~120–160) · 6 fillers · 0 pauses',
    )
  })

  it('says "1 filler" for a single Filler', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        transcript: TRANSCRIPT,
        enough_speech: true,
        metrics: { ...NO_PAUSES, wpm: 120, typical_wpm: { low: 120, high: 160 }, filler_count: 1 },
      }),
    )
    const user = await recordAttempt()

    await user.click(screen.getByRole('button', { name: 'Get feedback' }))

    expect(await screen.findByRole('region', { name: 'Metrics' })).toHaveTextContent(/· 1 filler ·/)
  })

  it('marks each Pause in the transcript and counts them in the Metrics', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        transcript: TRANSCRIPT,
        enough_speech: true,
        metrics: {
          wpm: 120,
          typical_wpm: { low: 120, high: 160 },
          filler_count: 2,
          pause_count: 2,
          longest_pause: 2.14,
          pauses: [
            { after: 0, duration: 1.6 },
            { after: 3, duration: 2.14 },
          ],
        },
      }),
    )
    const user = await recordAttempt()

    await user.click(screen.getByRole('button', { name: 'Get feedback' }))

    const transcript = await screen.findByRole('region', { name: 'Transcript' })
    // Each mark sits after the word the Pause follows, before any Fillers in the silence.
    expect(transcript).toHaveTextContent('So, //1.6s um, I think //2.1s uh yes.')
    // Screen readers hear the length in words, not the symbol.
    const marks = within(transcript).getAllByRole('img')
    expect(marks.map((m) => m.getAttribute('aria-label'))).toEqual([
      'pause, 1.6 seconds',
      'pause, 2.1 seconds',
    ])
    expect(screen.getByRole('region', { name: 'Metrics' })).toHaveTextContent(
      /· 2 pauses, longest 2\.1s$/,
    )
  })

  it('says "1 pause" for a single Pause', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        transcript: TRANSCRIPT,
        enough_speech: true,
        metrics: {
          wpm: 120,
          typical_wpm: { low: 120, high: 160 },
          filler_count: 2,
          pause_count: 1,
          longest_pause: 1.5,
          pauses: [{ after: 2, duration: 1.5 }],
        },
      }),
    )
    const user = await recordAttempt()

    await user.click(screen.getByRole('button', { name: 'Get feedback' }))

    expect(await screen.findByRole('region', { name: 'Metrics' })).toHaveTextContent(
      /· 1 pause, longest 1\.5s$/,
    )
  })

  it('says when there was not enough speech, and shows the words caught', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { transcript: [word('Hello'), word('um', true)], enough_speech: false }),
    )
    const user = await recordAttempt()

    await user.click(screen.getByRole('button', { name: 'Get feedback' }))

    expect(
      await screen.findByText(
        "We didn't catch enough speech to give feedback. Try recording again.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Transcript' })).toHaveTextContent('Hello um')
    expect(screen.queryByRole('region', { name: 'Metrics' })).not.toBeInTheDocument()
  })

  it('shows the error message and lets you retry on the same Attempt', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(502, { detail: "We couldn't transcribe your recording. Please try again." }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { transcript: TRANSCRIPT, enough_speech: true }))
    const user = await recordAttempt()

    await user.click(screen.getByRole('button', { name: 'Get feedback' }))
    expect(
      await screen.findByText("We couldn't transcribe your recording. Please try again."),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Get feedback' }))
    expect(await screen.findByRole('region', { name: 'Transcript' })).toBeInTheDocument()
    expect(screen.queryByText(/couldn't transcribe/)).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shows a generic message when the server is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const user = await recordAttempt()

    await user.click(screen.getByRole('button', { name: 'Get feedback' }))

    expect(await screen.findByText(/Couldn't reach the server/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Get feedback' })).toBeEnabled()
  })

  it('clears the Feedback on "Record again"', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { transcript: TRANSCRIPT, enough_speech: true }))
    const user = await recordAttempt()
    await user.click(screen.getByRole('button', { name: 'Get feedback' }))
    await screen.findByRole('region', { name: 'Transcript' })

    await user.click(screen.getByRole('button', { name: 'Record again' }))

    expect(screen.queryByRole('region', { name: 'Transcript' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Get feedback' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument()
  })
})
