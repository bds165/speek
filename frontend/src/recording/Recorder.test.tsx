import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Recorder } from './Recorder.tsx'

// jsdom has no microphone or MediaRecorder, so we stand in minimal fakes
// that behave like the browser APIs useRecorder relies on.
class FakeMediaRecorder {
  static isTypeSupported = () => true
  state: RecordingState = 'inactive'
  mimeType: string
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    this.mimeType = options?.mimeType ?? 'audio/webm'
  }
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) })
    this.onstop?.()
  }
}

let stopTrack: ReturnType<typeof vi.fn>
let getUserMedia: ReturnType<typeof vi.fn>

beforeEach(() => {
  stopTrack = vi.fn()
  getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] })
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
  URL.createObjectURL = vi.fn(() => 'blob:fake-recording')
  URL.revokeObjectURL = vi.fn()
})

describe('Recorder', () => {
  it('records, stops, plays back, and releases the mic', async () => {
    const user = userEvent.setup()
    const { container } = render(<Recorder />)

    await user.click(screen.getByRole('button', { name: 'Start recording' }))
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Stop' }))
    expect(container.querySelector('audio')).toHaveAttribute('src', 'blob:fake-recording')
    expect(stopTrack).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Start recording' })).not.toBeInTheDocument()
  })

  it('returns to the start state on "Record again"', async () => {
    const user = userEvent.setup()
    const { container } = render(<Recorder />)

    await user.click(screen.getByRole('button', { name: 'Start recording' }))
    await user.click(screen.getByRole('button', { name: 'Stop' }))
    await user.click(screen.getByRole('button', { name: 'Record again' }))

    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument()
    expect(container.querySelector('audio')).not.toBeInTheDocument()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-recording')
  })

  it('shows elapsed time while recording', async () => {
    vi.useFakeTimers()
    render(<Recorder />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    })
    expect(screen.getByText('0:00')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(65_000))
    expect(screen.getByText('1:05')).toBeInTheDocument()
  })

  it('shows the ~1:00 target while recording', async () => {
    vi.useFakeTimers()
    render(<Recorder />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    })
    expect(screen.getByText('/ ~1:00 target')).toBeInTheDocument()
  })

  it('marks the target as reached after 1:00 and keeps recording', async () => {
    vi.useFakeTimers()
    render(<Recorder />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    })
    act(() => vi.advanceTimersByTime(59_000))
    expect(screen.queryByText(/target reached/i)).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.getByText(/target reached/i)).toBeInTheDocument()
    expect(screen.queryByText('/ ~1:00 target')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()
    expect(stopTrack).not.toHaveBeenCalled()
  })

  it('stops automatically at 2:30 and explains why', async () => {
    vi.useFakeTimers()
    const { container } = render(<Recorder />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    })
    act(() => vi.advanceTimersByTime(149_000))
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(1_000))
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument()
    expect(container.querySelector('audio')).toHaveAttribute('src', 'blob:fake-recording')
    expect(stopTrack).toHaveBeenCalled()
    expect(screen.getByText('Recorded 2:30')).toBeInTheDocument()
    expect(screen.getByText(/stopped automatically at the 2:30 limit/)).toBeInTheDocument()
  })

  it('shows no limit message after a manual stop before 2:30', async () => {
    vi.useFakeTimers()
    render(<Recorder />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    })
    act(() => vi.advanceTimersByTime(149_000))
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))

    expect(screen.getByText('Recorded 2:29')).toBeInTheDocument()
    expect(screen.queryByText(/stopped automatically/)).not.toBeInTheDocument()
  })

  it('clears the limit message on "Record again"', async () => {
    vi.useFakeTimers()
    render(<Recorder />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    })
    act(() => vi.advanceTimersByTime(150_000))
    fireEvent.click(screen.getByRole('button', { name: 'Record again' }))

    expect(screen.queryByText(/stopped automatically/)).not.toBeInTheDocument()

    // And it stays gone for the next Attempt, not just until the next stop.
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    })
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }))
    expect(screen.queryByText(/stopped automatically/)).not.toBeInTheDocument()
  })

  it('explains when microphone access is denied', async () => {
    getUserMedia.mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    const user = userEvent.setup()
    render(<Recorder />)

    await user.click(screen.getByRole('button', { name: 'Start recording' }))
    expect(screen.getByText(/Microphone access was denied/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeEnabled()
  })
})
