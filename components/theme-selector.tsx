'use client'

import { useSyncExternalStore, useEffect } from 'react'

const THEME_STORAGE_KEY = 'color-theme'
const THEME_CHANGE_EVENT = 'color-theme-change'

type ColorTheme = 'amber' | 'custom'

function getColorTheme(): ColorTheme {
  if (typeof window === 'undefined') return 'amber'
  return (localStorage.getItem(THEME_STORAGE_KEY) as ColorTheme) || 'amber'
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback)
  window.addEventListener(THEME_CHANGE_EVENT, callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener(THEME_CHANGE_EVENT, callback)
  }
}

export function ThemeSelector() {
  const theme = useSyncExternalStore(subscribe, getColorTheme, () => 'amber')

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    const newTheme: ColorTheme = theme === 'amber' ? 'custom' : 'amber'
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)

    // Trigger custom event for same-tab updates
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
    // Also trigger storage event for other tabs/windows
    window.dispatchEvent(new Event('storage'))

    document.documentElement.setAttribute('data-theme', newTheme)
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md border border-border bg-background text-foreground hover:bg-accent transition-colors cursor-pointer"
      aria-label="Toggle theme style"
      title={theme === 'amber' ? 'Switch to Custom theme style' : 'Switch to Amber theme style'}
    >
      {theme === 'amber' ? (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {/* Palette/Swatch icon for Amber theme */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {/* Grid icon for Custom theme */}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
          />
        </svg>
      )}
    </button>
  )
}

