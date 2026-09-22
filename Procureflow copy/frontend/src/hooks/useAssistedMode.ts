/**
 * useAssistedMode
 * Provides speech synthesis helpers that respect the assistedMode preference.
 */
import { useCallback } from 'react'

export function useAssistedMode(enabled: boolean) {
  const speak = useCallback((text: string) => {
    if (!enabled) return
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.9
    utt.pitch = 1
    window.speechSynthesis.speak(utt)
  }, [enabled])

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  return { speak, stop }
}
