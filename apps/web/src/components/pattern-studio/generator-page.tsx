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

import { AppShell, SectionHeader } from './chrome'

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
      <div className="grid h-full min-h-0 gap-0 xl:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col overflow-hidden border-y border-l border-border bg-background/80 p-2">
          <SectionHeader
            eyebrow="Generator"
            title="Import"
            meta={`${document.boards.length} boards`}
          />

          <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-auto pr-0.5">
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
                      <p>Valid pattern document.</p>
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
              <pre className="max-h-80 overflow-auto text-[11px] leading-5 text-foreground/62">
                {lastImportedJson}
              </pre>
            </div>
          </div>
        </aside>

        <section className="grid min-h-0 gap-0 xl:grid-rows-[minmax(0,1fr)_200px]">
          <div className="flex min-h-0 flex-col overflow-hidden border border-border bg-background/85 p-2">
            <SectionHeader
              eyebrow="Preview"
              title="Layout"
              meta="mm"
            />
            <div className="mt-1.5 min-h-0 overflow-hidden border border-border bg-[oklch(0.985_0.005_85)] dark:bg-[oklch(0.18_0.01_85)]">
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
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden border-x border-b border-border bg-background/85 p-2">
            <SectionHeader
              eyebrow="Markup"
              title="SVG"
            />
            <pre className="mt-1.5 min-h-0 flex-1 overflow-auto border border-border bg-muted/55 p-2 text-[10px] leading-4.5 text-foreground/62 whitespace-pre-wrap break-all">
              {svgMarkup}
            </pre>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
