import { Button } from '@workspace/ui/components/button'
import { Box, Download, PenLine } from 'lucide-react'

import { navigateTo } from '@/lib/pattern-studio'

import { FeatureCard, StageCard } from './chrome'

export function HomePage() {
  return (
    <main className="min-h-svh bg-[linear-gradient(180deg,oklch(0.98_0.01_85),oklch(0.94_0.02_85))] text-foreground">
      <div className="mx-auto flex min-h-svh max-w-7xl flex-col px-6 py-8">
        <div className="flex items-center justify-between border-b border-black/10 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-black/45">
              XTool Demo
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
              Board pattern studio
            </h1>
          </div>
          <nav className="flex gap-2">
            <Button variant="outline" onClick={() => navigateTo('/editor')}>
              Open editor
            </Button>
            <Button onClick={() => navigateTo('/generator')}>
              Open generator
            </Button>
          </nav>
        </div>

        <section className="grid flex-1 gap-10 py-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-8">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-black/45">
                Creative asset workflow
              </p>
              <h2 className="mt-3 text-[clamp(2.8rem,8vw,6rem)] leading-none font-semibold tracking-[-0.07em] text-black">
                Draw in 2D.
                <br />
                Review in volume.
                <br />
                Export for cutting.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-black/70">
                A lightweight pattern workflow for wood panel experiments.
                Start from simple boards, adjust their outline, preview their
                thickness, and move straight into SVG output.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <FeatureCard
                icon={<PenLine className="size-4" />}
                title="2D editing"
                text="Direct control-point editing on a single SVG plane keeps the first version predictable."
              />
              <FeatureCard
                icon={<Box className="size-4" />}
                title="3D preview"
                text="A depth preview mirrors the same pattern document, so geometry stays traceable."
              />
              <FeatureCard
                icon={<Download className="size-4" />}
                title="SVG output"
                text="Generator imports the exported JSON and emits a cut-ready SVG document in millimeters."
              />
            </div>
          </div>

          <div className="grid gap-4 self-end">
            <StageCard
              index="01"
              title="Editor"
              text="Create boards from presets, move points, adjust thickness, and export a versioned pattern file."
              cta="Go to editor"
              onClick={() => navigateTo('/editor')}
            />
            <StageCard
              index="02"
              title="Generator"
              text="Import pattern JSON, validate the schema, preview the resulting geometry, and download SVG."
              cta="Go to generator"
              onClick={() => navigateTo('/generator')}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
