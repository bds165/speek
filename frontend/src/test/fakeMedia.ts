import { vi } from 'vitest'

// jsdom has no microphone or MediaRecorder, so we stand in minimal fakes
// that behave like the browser APIs useRecorder relies on.
export class FakeMediaRecorder {
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

// Installs the fakes; returns the spies tests assert on.
export function stubMedia() {
  const stopTrack = vi.fn()
  const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] })
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
  URL.createObjectURL = vi.fn(() => 'blob:fake-recording')
  URL.revokeObjectURL = vi.fn()
  return { stopTrack, getUserMedia }
}
