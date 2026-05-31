/**
 * useVoice — ElevenLabs voice layer hook.
 *
 * Sends a scriptKey + variables to /api/tts, receives an audio blob,
 * and plays it via the Web Audio API. Silently degrades if TTS is not
 * configured or if the browser blocks autoplay.
 */
export function useVoice() {
  async function speak(scriptKey: string, variables: Record<string, string> = {}) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptKey, variables }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.play().catch(() => {}) // silently handle autoplay blocks
    } catch {
      // Non-fatal: TTS errors must never crash the UI
    }
  }

  return { speak }
}
