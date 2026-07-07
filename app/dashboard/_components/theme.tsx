'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

// Manual light/dark theme for the employee in-app shell (NOT prefers-color-scheme).
// Default is LIGHT. The choice persists in localStorage and toggles a `.dark`
// class on <html>, which drives Tailwind's class-based `dark:` variant
// (globals.css: `@custom-variant dark (&:is(.dark *))`).

const STORAGE_KEY = 'atc-theme'
type Theme = 'light' | 'dark'

interface ThemeCtx {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

const Ctx = createContext<ThemeCtx | null>(null)

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  // Sync from storage on mount (the inline ThemeScript already set the class
  // before paint; this aligns React state to it).
  useEffect(() => {
    let stored: Theme = 'light'
    try {
      stored = (localStorage.getItem(STORAGE_KEY) as Theme) || 'light'
    } catch {
      /* ignore */
    }
    setThemeState(stored)
    applyTheme(stored)
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    applyTheme(t)
    try {
      localStorage.setItem(STORAGE_KEY, t)
    } catch {
      /* ignore */
    }
  }, [])

  const toggle = useCallback(() => {
    setThemeState(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return <Ctx.Provider value={{ theme, toggle, setTheme }}>{children}</Ctx.Provider>
}

/** Returns the theme context, or null if used outside a ThemeProvider (e.g. admin shell). */
export function useTheme(): ThemeCtx | null {
  return useContext(Ctx)
}

/** Inline, no-FOUC script — sets the `.dark` class from storage before first paint. */
export function ThemeScript() {
  const js = `(function(){try{if(localStorage.getItem('${STORAGE_KEY}')==='dark'){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}})()`
  return <script dangerouslySetInnerHTML={{ __html: js }} />
}
