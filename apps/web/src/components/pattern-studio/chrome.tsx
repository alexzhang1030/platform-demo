import type { ReactNode } from 'react'
import type { RouteKey } from '@/lib/pattern-studio'
import { Button } from '@workspace/ui/components/button'

import { ArrowRight, Layers2 } from 'lucide-react'
import { navigateTo } from '@/lib/pattern-studio'

interface FeatureCardProps {
  icon: ReactNode
  title: string
  text: string
}

interface StageCardProps {
  index: string
  title: string
  text: string
  cta: string
  onClick: () => void
}

interface SectionHeaderProps {
  eyebrow: string
  title: string
  meta?: string
}

interface AppShellProps {
  route: RouteKey
  children: ReactNode
}

export function FeatureCard({ icon, title, text }: FeatureCardProps) {
  return (
    <article className="border border-black/10 bg-white/70 p-4">
      <div className="mb-4 flex size-8 items-center justify-center border border-black/10 bg-black text-white">
        {icon}
      </div>
      <h3 className="text-sm font-semibold tracking-[-0.03em]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-black/65">{text}</p>
    </article>
  )
}

export function StageCard({
  index,
  title,
  text,
  cta,
  onClick,
}: StageCardProps) {
  return (
    <article className="border border-black/10 bg-[oklch(0.97_0.015_85)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-black/45">
        {index}
      </p>
      <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-black/70">{text}</p>
      <Button className="mt-6" onClick={onClick}>
        {cta}
        <ArrowRight />
      </Button>
    </article>
  )
}

export function SectionHeader({ eyebrow, title, meta }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-black/10 pb-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-black/45">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-black">
          {title}
        </h2>
      </div>
      {meta ? <p className="text-xs text-black/55">{meta}</p> : null}
    </div>
  )
}

export function AppShell({ route, children }: AppShellProps) {
  return (
    <div className="min-h-svh bg-[linear-gradient(180deg,oklch(0.98_0.01_85),oklch(0.95_0.02_84))] text-black">
      <div className="mx-auto flex min-h-svh max-w-[1700px] flex-col px-4 py-4 lg:px-6">
        <header className="flex flex-col gap-4 border border-black/10 bg-white/85 px-4 py-4 backdrop-blur-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex items-center gap-3 text-left"
              onClick={() => navigateTo('/')}
            >
              <div className="flex size-10 items-center justify-center border border-black/10 bg-black text-white">
                <Layers2 className="size-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-black/45">
                  Studio / pattern
                </p>
                <h1 className="text-lg font-semibold tracking-[-0.04em]">
                  Board Pattern Studio
                </h1>
              </div>
            </button>
          </div>

          <nav className="flex flex-wrap gap-2">
            <Button
              variant={route === 'editor' ? 'default' : 'outline'}
              onClick={() => navigateTo('/editor')}
            >
              Editor
            </Button>
            <Button
              variant={route === 'generator' ? 'default' : 'outline'}
              onClick={() => navigateTo('/generator')}
            >
              Generator
            </Button>
          </nav>
        </header>
        <div className="mt-4 flex-1">{children}</div>
      </div>
    </div>
  )
}
