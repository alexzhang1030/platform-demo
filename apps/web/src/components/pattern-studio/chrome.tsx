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
    <div className="h-svh overflow-hidden bg-[linear-gradient(180deg,oklch(0.98_0.01_85),oklch(0.95_0.02_84))] text-foreground dark:bg-[linear-gradient(180deg,oklch(0.18_0.01_85),oklch(0.14_0.01_82))]">
      <div className="mx-auto flex h-full max-w-[1800px] min-h-0 flex-col px-0 py-0">
        <header className="flex shrink-0 items-center justify-between gap-2 border-x border-t border-border bg-background/88 px-2 py-1 backdrop-blur-sm">
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
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
