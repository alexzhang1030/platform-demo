import type { ReactNode } from 'react'
import type { RouteKey } from '@/lib/pattern-studio'
import { Button } from '@workspace/ui/components/button'

import { Layers2 } from 'lucide-react'
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

export function SectionHeader({ eyebrow, title, meta }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-2 border-b border-black/10 pb-1.5">
      <div>
        <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-black/45">
          {eyebrow}
        </p>
        <h2 className="mt-0.5 text-[13px] font-semibold tracking-[-0.04em] text-black">
          {title}
        </h2>
      </div>
      {meta ? <p className="text-[10px] text-black/55">{meta}</p> : null}
    </div>
  )
}

export function AppShell({ route, children }: AppShellProps) {
  return (
    <div className="h-svh overflow-hidden bg-[linear-gradient(180deg,oklch(0.98_0.01_85),oklch(0.95_0.02_84))] text-black">
      <div className="mx-auto flex h-full max-w-[1800px] min-h-0 flex-col px-0 py-0">
        <header className="flex shrink-0 items-center justify-between gap-2 border-x border-t border-black/10 bg-white/88 px-2 py-1 backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="flex items-center gap-2 text-left"
              onClick={() => navigateTo('/editor')}
            >
              <div className="flex size-7 items-center justify-center border border-black/10 bg-black text-white">
                <Layers2 className="size-3" />
              </div>
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-black/45">
                  Studio
                </p>
                <h1 className="text-[12px] font-semibold tracking-[-0.04em]">
                  Pattern
                </h1>
              </div>
            </button>
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
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}
