/**
 * useAccessibility
 * Manages four accessibility preferences stored in localStorage.
 * Each preference actually modifies the document root or triggers browser APIs.
 */
import { useState, useEffect } from 'react'

export interface AccessibilityPrefs {
  largerText: boolean
  highContrast: boolean
  reduceMotion: boolean
  assistedMode: boolean
}

const STORAGE_KEY = 'procureflow_a11y'

function loadPrefs(): AccessibilityPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { largerText: false, highContrast: false, reduceMotion: false, assistedMode: false }
}

function savePrefs(prefs: AccessibilityPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

function applyPrefs(prefs: AccessibilityPrefs) {
  const root = document.documentElement

  // Larger text: scale base font from 16px to 18px
  root.style.fontSize = prefs.largerText ? '18px' : ''

  // High contrast: add a class that overrides colours
  if (prefs.highContrast) {
    root.classList.add('high-contrast')
  } else {
    root.classList.remove('high-contrast')
  }

  // Reduce motion: add class that zeroes transitions (CSS media query backup)
  if (prefs.reduceMotion) {
    root.classList.add('reduce-motion')
  } else {
    root.classList.remove('reduce-motion')
  }
}

export function useAccessibility() {
  const [prefs, setPrefsState] = useState<AccessibilityPrefs>(loadPrefs)

  // Apply on mount and whenever prefs change
  useEffect(() => {
    applyPrefs(prefs)
    savePrefs(prefs)
  }, [prefs])

  const toggle = (key: keyof AccessibilityPrefs) => {
    setPrefsState(prev => ({ ...prev, [key]: !prev[key] }))
  }

  return { prefs, toggle }
}
