// Pause lengths to a tenth of a second: "2.1". Finer than that is noise to a speaker.
export function formatSeconds(seconds: number) {
  return seconds.toFixed(1)
}
