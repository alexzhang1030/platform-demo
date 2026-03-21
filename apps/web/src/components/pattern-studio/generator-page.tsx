import type { PatternDocument } from '@xtool-demo/protocol'
import { Button } from '@workspace/ui/components/button'
import {
  generateSvgDocument,
  getDocumentBounds,
  transformBoardPoints,
} from '@xtool-demo/core'
import { Download, FileUp, MoveRight } from 'lucide-react'
import { useMemo } from 'react'

import { mapBoardColor } from '@/lib/pattern-studio'

import {
  AppShell,
  FloatingTray,
  OverlayPanel,
  SectionHeader,
  WorkspaceViewport,
} from './chrome'

interface GeneratorPageProps {
  document: PatternDocument
  lastImportedJson: string
  parseIssues: string[]
  onImportJson: (json: string) => void
  onUseEditorDocument: () => void
  onDownloadSvg: () => void
}

export function GeneratorPage({
  document,
  lastImportedJson,
  parseIssues,
  onImportJson,
  onUseEditorDocument,
  onDownloadSvg,
}: GeneratorPageProps) {
  const svgMarkup = useMemo(() => generateSvgDocument(document), [document])
  const bounds = useMemo(() => getDocumentBounds(document), [document])
  const canvasViewBox = [
    bounds.minX - 48,
    bounds.minY - 48,
    Math.max(400, bounds.width + 96),
    Math.max(260, bounds.height + 96),
  ].join(' ')

  return (
    <AppShell route="generator">
      <WorkspaceViewport>
        <section className="relative h-full min-h-0 overflow-hidden">
          <div className="h-full min-h-0 overflow-hidden bg-[oklch(0.985_0.005_85)] dark:bg-[oklch(0.18_0.01_85)]">
            <svg viewBox={canvasViewBox} className="h-full min-h-[320px] w-full">
              {document.boards.map((board, index) => {
                const points = transformBoardPoints(board)
                return (
                  <polygon
                    key={board.id}
                    points={points.map(point => `${point.x},${point.y}`).join(' ')}
                    fill="none"
                    stroke={mapBoardColor(index)}
                    strokeWidth={1.8}
                  />
                )
              })}
            </svg>
          </div>

          <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <OverlayPanel className="pointer-events-auto w-full max-w-[min(100%,320px)] lg:w-[320px]">
              <SectionHeader
                eyebrow="Generator"
                title="Import"
                meta={`${document.boards.length} boards · ${document.assemblies.length} assemblies`}
              />

              <div className="mt-2 space-y-2">
                <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-border bg-muted/60 px-2.5 py-3 text-[11px] font-medium text-foreground/75 transition-colors hover:bg-muted">
                  <FileUp className="size-4" />
                  Upload pattern.json
                  <input
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) {
                        return
                      }

                      void file.text().then(onImportJson)
                    }}
                  />
                </label>

                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-8 flex-1 px-2 text-[11px]" onClick={onUseEditorDocument}>
                    Use editor
                  </Button>
                  <Button size="sm" className="h-8 flex-1 px-2 text-[11px]" onClick={onDownloadSvg}>
                    Export SVG
                    <Download className="size-3" />
                  </Button>
                </div>

                <div className="border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border px-2.5 py-2">
                    <h3 className="text-[12px] font-semibold tracking-[-0.03em]">
                      Parse
                    </h3>
                    <span className="text-[10px] text-foreground/50">
                      v
                      {document.version}
                    </span>
                  </div>
                  <div className="p-2.5 text-[12px] text-foreground/72">
                    {parseIssues.length === 0
                      ? (
                          <div className="space-y-1.5">
                            <p>Valid pattern document.</p>
                            {document.assemblies.length > 0
                              ? (
                                  <p className="text-[11px] text-foreground/55">
                                    Boxel assemblies are preserved in JSON but are not included in SVG board output yet.
                                  </p>
                                )
                              : null}
                          </div>
                        )
                      : (
                          <ul className="space-y-1.5 text-[12px] text-destructive">
                            {parseIssues.map(issue => (
                              <li key={issue}>{issue}</li>
                            ))}
                          </ul>
                        )}
                  </div>
                </div>

                <div className="border border-border bg-card p-2.5">
                  <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold tracking-[-0.03em]">
                    <MoveRight className="size-4" />
                    JSON
                  </div>
                  <pre className="max-h-40 overflow-auto text-[11px] leading-5 text-foreground/62">
                    {lastImportedJson}
                  </pre>
                </div>
              </div>
            </OverlayPanel>

            <OverlayPanel className="pointer-events-auto w-full max-w-[min(100%,420px)] lg:w-[420px]">
              <SectionHeader
                eyebrow="Markup"
                title="SVG"
                meta="source"
              />
              <pre className="mt-1.5 max-h-[min(34vh,360px)] overflow-auto border border-border bg-muted/55 p-2 text-[10px] leading-4.5 text-foreground/62 whitespace-pre-wrap break-all lg:max-h-[min(54vh,620px)]">
                {svgMarkup}
              </pre>
            </OverlayPanel>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-3">
            <FloatingTray className="pointer-events-auto">
              <div className="flex items-center gap-2 px-1">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/45">
                  <MoveRight className="size-3.5" />
                  Preview
                </div>
                <div className="h-5 w-px bg-border" />
                <div className="text-[10px] text-foreground/55">
                  SVG layout surface
                </div>
              </div>
            </FloatingTray>
          </div>
        </section>
      </WorkspaceViewport>
    </AppShell>
  )
}
