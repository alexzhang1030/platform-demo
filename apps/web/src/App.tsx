import type { PatternDocument } from '@xtool-demo/protocol'
import type {
  EditorSelectionState,
  RouteKey,
} from '@/lib/pattern-studio'
import { generateSvgDocument } from '@xtool-demo/core'
import { createDefaultPatternDocument, parsePatternJson, stringifyPatternDocument } from '@xtool-demo/protocol'

import { useEffect, useState, useTransition } from 'react'
import { EditorPage } from '@/components/pattern-studio/editor-page'
import { GeneratorPage } from '@/components/pattern-studio/generator-page'
import {
  createEditorSelection,
  getRouteFromPath,
  normalizeEditorSelection,
} from '@/lib/pattern-studio'
import { downloadTextFile } from '@/lib/utils'

export function App() {
  const [route, setRoute] = useState<RouteKey>(() =>
    getRouteFromPath(window.location.pathname),
  )
  const [editorDocument, setEditorDocument] = useState<PatternDocument>(
    createDefaultPatternDocument,
  )
  const [generatorDocument, setGeneratorDocument] = useState<PatternDocument>(
    createDefaultPatternDocument,
  )
  const [selection, setSelection] = useState<EditorSelectionState>(() =>
    createEditorSelection(editorDocument.boards[0]?.id ?? ''),
  )
  const [lastImportedJson, setLastImportedJson] = useState(() =>
    stringifyPatternDocument(generatorDocument),
  )
  const [parseIssues, setParseIssues] = useState<string[]>([])
  const [, startTransition] = useTransition()

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteFromPath(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  function handleEditorDocumentChange(nextDocument: PatternDocument) {
    startTransition(() => {
      setEditorDocument(nextDocument)
      setSelection(current => normalizeEditorSelection(nextDocument, current))
    })
  }

  function handleExportJson() {
    const json = stringifyPatternDocument(editorDocument)
    setLastImportedJson(json)
    setGeneratorDocument(editorDocument)
    setParseIssues([])
    downloadTextFile(json, 'pattern.json', 'application/json')
  }

  function handleImportJson(json: string) {
    setLastImportedJson(json)
    const parsed = parsePatternJson(json)
    if (!parsed.ok) {
      setParseIssues(parsed.issues)
      return
    }

    setGeneratorDocument(parsed.value)
    setParseIssues([])
  }

  function handleUseEditorDocument() {
    const json = stringifyPatternDocument(editorDocument)
    setLastImportedJson(json)
    setGeneratorDocument(editorDocument)
    setParseIssues([])
  }

  function handleDownloadSvg() {
    downloadTextFile(
      generateSvgDocument(generatorDocument),
      'pattern.svg',
      'image/svg+xml',
    )
  }

  if (route === 'editor') {
    return (
      <EditorPage
        document={editorDocument}
        selection={selection}
        onSelectionChange={setSelection}
        onDocumentChange={handleEditorDocumentChange}
        onExportJson={handleExportJson}
      />
    )
  }

  if (route === 'generator') {
    return (
      <GeneratorPage
        document={generatorDocument}
        lastImportedJson={lastImportedJson}
        parseIssues={parseIssues}
        onImportJson={handleImportJson}
        onUseEditorDocument={handleUseEditorDocument}
        onDownloadSvg={handleDownloadSvg}
      />
    )
  }

  return (
    <EditorPage
      document={editorDocument}
      selection={selection}
      onSelectionChange={setSelection}
      onDocumentChange={handleEditorDocumentChange}
      onExportJson={handleExportJson}
    />
  )
}
