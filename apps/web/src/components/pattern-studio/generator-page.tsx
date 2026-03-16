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
      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="border border-black/10 bg-white/80 p-4">
          <SectionHeader
            eyebrow="Generator"
            title="Pattern import"
            meta={`${document.boards.length} boards ready`}
          />

          <div className="mt-5 space-y-4">
            <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-black/25 bg-[oklch(0.97_0.015_85)] px-4 py-6 text-sm font-medium text-black/75 transition-colors hover:bg-[oklch(0.95_0.02_84)]">
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

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onUseEditorDocument}>
                Use editor output
              </Button>
              <Button className="flex-1" onClick={onDownloadSvg}>
                Download SVG
                <Download />
              </Button>
            </div>

            <div className="border border-black/10 bg-white">
              <div className="flex items-center justify-between border-b border-black/10 px-3 py-2">
                <h3 className="text-sm font-semibold tracking-[-0.03em]">
                  Validation
                </h3>
                <span className="text-xs text-black/50">
                  v
                  {document.version}
                </span>
              </div>
              <div className="p-3 text-sm text-black/70">
                {parseIssues.length === 0
                  ? (
                      <p>Document is valid. Ready to generate SVG output.</p>
                    )
                  : (
                      <ul className="space-y-2 text-[13px] text-[oklch(0.52_0.18_28)]">
                        {parseIssues.map(issue => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    )}
              </div>
            </div>

            <div className="border border-black/10 bg-white p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-[-0.03em]">
                <MoveRight className="size-4" />
                Imported JSON
              </div>
              <pre className="max-h-90 overflow-auto text-xs leading-6 text-black/60">
                {lastImportedJson}
              </pre>
            </div>
          </div>
        </aside>

        <section className="flex flex-col gap-4">
          <div className="border border-black/10 bg-white/85 p-4">
            <SectionHeader
              eyebrow="Preview"
              title="Generated cut layout"
              meta="All boards are exported in millimeters."
            />
            <div className="mt-4 overflow-hidden border border-black/10 bg-[oklch(0.985_0.005_85)]">
              <svg viewBox={canvasViewBox} className="h-105 w-full">
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

          <div className="border border-black/10 bg-white/85 p-4">
            <SectionHeader
              eyebrow="Markup"
              title="SVG payload"
              meta="This is the exact exported document."
            />
            <pre className="mt-4 max-h-80 overflow-auto border border-black/10 bg-[oklch(0.97_0.015_85)] p-4 text-xs leading-6 text-black/60 whitespace-pre-wrap break-all">
              {svgMarkup}
            </pre>
          </div>
        </section>
      </div>
    </AppShell>
  )
}
