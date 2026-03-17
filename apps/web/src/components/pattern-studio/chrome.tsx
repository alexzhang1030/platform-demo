import type { ReactNode } from 'react'
import type { RouteKey } from '@/lib/pattern-studio'
import { Button } from '@workspace/ui/components/button'

import { LaptopMinimal, Layers2, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'
import { navigateTo } from '@/lib/pattern-studio'

interface SectionHeaderProps {
  eyebrow: string
  title: string
  meta?: string
}

interface AppShellProps {
  route: RouteKey
  children: ReactNode
}

interface WorkspaceViewportProps {
  children: ReactNode
}

interface OverlayPanelProps {
  children: ReactNode
  className?: string
}

interface FloatingTrayProps {
  children: ReactNode
  className?: string
}

interface ThemeOption {
  label: string
  value: 'light' | 'dark' | 'system'
  icon: typeof Sun
}

const THEME_OPTIONS: ThemeOption[] = [
  { label: 'Light', value: 'light', icon: Sun },
  { label: 'Dark', value: 'dark', icon: Moon },
  { label: 'System', value: 'system', icon: LaptopMinimal },
]

export function SectionHeader({ eyebrow, title, meta }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-2 border-b border-border pb-1.5">
      <div>
        <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-foreground/45">
          {eyebrow}
        </p>
        <h2 className="mt-0.5 text-[13px] font-semibold tracking-[-0.04em] text-foreground">
          {title}
        </h2>
      </div>
      {meta ? <p className="text-[10px] text-foreground/55">{meta}</p> : null}
    </div>
  )
}

export function AppShell({ route, children }: AppShellProps) {
  const { theme, setTheme } = useTheme()

  return (
    <div className="h-svh overflow-hidden bg-[radial-gradient(circle_at_top,oklch(0.97_0.02_85),oklch(0.9_0.03_80)_38%,oklch(0.82_0.025_78))] text-foreground dark:bg-[radial-gradient(circle_at_top,oklch(0.28_0.025_255),oklch(0.16_0.015_255)_42%,oklch(0.1_0.01_255))]">
      <div className="relative mx-auto h-full max-w-[1920px] overflow-hidden px-3 py-3 sm:px-4 sm:py-4">
        <header className="absolute inset-x-3 top-3 z-40 flex items-center justify-between gap-2 border border-border/60 bg-background/82 px-2 py-1.5 shadow-[0_24px_60px_rgba(0,0,0,0.16)] backdrop-blur-md sm:inset-x-4 sm:top-4 sm:px-3 dark:shadow-[0_24px_72px_rgba(0,0,0,0.45)]">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="flex items-center gap-2 text-left"
              onClick={() => navigateTo('/editor')}
            >
              <div className="flex size-7 items-center justify-center border border-border bg-foreground text-background">
                <Layers2 className="size-3" />
              </div>
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-foreground/45">
                  Studio
                </p>
                <h1 className="text-[12px] font-semibold tracking-[-0.04em]">
                  Pattern
                </h1>
              </div>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center border border-border bg-background/88 p-0.5">
              {THEME_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  title={option.label}
                  className={`inline-flex size-7 items-center justify-center transition-colors ${theme === option.value
                    ? 'bg-foreground text-background'
                    : 'text-foreground/58 hover:bg-muted hover:text-foreground'
                  }`}
                  onClick={() => setTheme(option.value)}
                >
                  <option.icon className="size-3.5" />
                </button>
              ))}
            </div>
            <nav className="flex flex-wrap gap-1.5">
              <Button
                variant={route === 'editor' ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => navigateTo('/editor')}
              >
                Editor
              </Button>
              <Button
                variant={route === 'generator' ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                onClick={() => navigateTo('/generator')}
              >
                Generator
              </Button>
            </nav>
          </div>
        </header>
        <div className="h-full overflow-hidden pt-14 sm:pt-16">{children}</div>
      </div>
    </div>
  )
}

export function WorkspaceViewport({ children }: WorkspaceViewportProps) {
  return (
    <div className="relative h-full min-h-0 overflow-hidden border border-border/60 bg-background/24 shadow-[0_30px_90px_rgba(0,0,0,0.18)] backdrop-blur-[2px] dark:bg-background/10 dark:shadow-[0_30px_90px_rgba(0,0,0,0.4)]">
      {children}
    </div>
  )
}

export function OverlayPanel({ children, className }: OverlayPanelProps) {
  const panelClassName = className ? ` ${className}` : ''

  return (
    <div className={`border border-border/70 bg-background/86 p-2 shadow-[0_20px_56px_rgba(0,0,0,0.16)] backdrop-blur-md dark:shadow-[0_20px_56px_rgba(0,0,0,0.42)]${panelClassName}`}>
      {children}
    </div>
  )
}

export function FloatingTray({ children, className }: FloatingTrayProps) {
  const trayClassName = className ? ` ${className}` : ''

  return (
    <div className={`border border-border/70 bg-background/90 p-1 shadow-[0_18px_48px_rgba(0,0,0,0.16)] backdrop-blur-md dark:shadow-[0_20px_54px_rgba(0,0,0,0.42)]${trayClassName}`}>
      {children}
    </div>
  )
}
