import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { initializeTheme, ThemeProvider } from '@/components/theme-provider.tsx'
import { App } from './App.tsx'

import '@workspace/ui/globals.css'

initializeTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
