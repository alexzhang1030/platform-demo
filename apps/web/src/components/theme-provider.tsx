/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'

export type Theme = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  disableTransitionOnChange?: boolean
}

interface ThemeProviderState {
  theme: Theme
  resolvedTheme: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)'
const ThemeProviderContext = React.createContext<
  ThemeProviderState | undefined
>(undefined)

function isTheme(value: string | null): value is Theme {
  return value === 'dark' || value === 'light' || value === 'system'
}

export function getSystemTheme(): ResolvedTheme {
  if (window.matchMedia(COLOR_SCHEME_QUERY).matches) {
    return 'dark'
  }

  return 'light'
}

export function resolveTheme(theme: Theme, systemTheme: ResolvedTheme): ResolvedTheme {
  if (theme === 'system') {
    return systemTheme
  }

  return theme
}

export function getStoredTheme(storageKey: string, defaultTheme: Theme): Theme {
  const storedTheme = localStorage.getItem(storageKey)
  if (isTheme(storedTheme)) {
    return storedTheme
  }

  return defaultTheme
}

function applyResolvedTheme(
  resolvedTheme: ResolvedTheme,
  disableTransitionOnChange: boolean,
) {
  const root = document.documentElement
  const restoreTransitions = disableTransitionOnChange
    ? disableTransitionsTemporarily()
    : null

  root.classList.remove('light', 'dark')
  root.classList.add(resolvedTheme)
  root.style.colorScheme = resolvedTheme

  if (restoreTransitions) {
    restoreTransitions()
  }
}

export function initializeTheme(
  storageKey = 'theme',
  defaultTheme: Theme = 'system',
) {
  const storedTheme = getStoredTheme(storageKey, defaultTheme)
  const resolvedTheme = resolveTheme(storedTheme, getSystemTheme())
  applyResolvedTheme(resolvedTheme, false)
  return storedTheme
}

function disableTransitionsTemporarily() {
  const style = document.createElement('style')
  style.appendChild(
    document.createTextNode(
      '*,*::before,*::after{-webkit-transition:none!important;transition:none!important}',
    ),
  )
  document.head.appendChild(style)

  return () => {
    window.getComputedStyle(document.body)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        style.remove()
      })
    })
  }
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const editableParent = target.closest(
    'input, textarea, select, [contenteditable=\'true\']',
  )
  if (editableParent) {
    return true
  }

  return false
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
  disableTransitionOnChange = true,
  ...props
}: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = React.useState<Theme>(() =>
    getStoredTheme(storageKey, defaultTheme),
  )
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>(() =>
    getSystemTheme(),
  )
  const resolvedTheme = React.useMemo(
    () => resolveTheme(currentTheme, systemTheme),
    [currentTheme, systemTheme],
  )

  const setTheme = React.useCallback(
    (nextTheme: Theme) => {
      localStorage.setItem(storageKey, nextTheme)
      setCurrentTheme(nextTheme)
    },
    [storageKey],
  )

  const applyTheme = React.useCallback(
    (nextResolvedTheme: ResolvedTheme) => {
      applyResolvedTheme(nextResolvedTheme, disableTransitionOnChange)
    },
    [disableTransitionOnChange],
  )

  React.useEffect(() => {
    applyTheme(resolvedTheme)
  }, [applyTheme, resolvedTheme])

  React.useEffect(() => {
    if (currentTheme !== 'system') {
      return undefined
    }

    const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY)
    const handleChange = () => {
      setSystemTheme(getSystemTheme())
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [currentTheme])

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      if (event.key.toLowerCase() !== 'd') {
        return
      }

      setCurrentTheme((activeTheme) => {
        const nextTheme
          = activeTheme === 'dark'
            ? 'light'
            : activeTheme === 'light'
              ? 'dark'
              : getSystemTheme() === 'dark'
                ? 'light'
                : 'dark'

        localStorage.setItem(storageKey, nextTheme)
        return nextTheme
      })
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [storageKey])

  React.useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) {
        return
      }

      if (event.key !== storageKey) {
        return
      }

      if (isTheme(event.newValue)) {
        setCurrentTheme(event.newValue)
        return
      }

      setCurrentTheme(defaultTheme)
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [defaultTheme, storageKey])

  const value = React.useMemo(
    () => ({
      theme: currentTheme,
      resolvedTheme,
      setTheme,
    }),
    [currentTheme, resolvedTheme, setTheme],
  )

  return (
    <ThemeProviderContext {...props} value={value}>
      {children}
    </ThemeProviderContext>
  )
}

export function useTheme() {
  const context = React.use(ThemeProviderContext)

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }

  return context
}
