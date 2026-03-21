## 1. Geometry Utilities & Classification

- [x] 1.1 Implement path area calculation in `packages/core/src/geometry.ts`.
- [x] 1.2 Implement path perimeter calculation in `packages/core/src/geometry.ts`.
- [x] 1.3 Add `classifySketchPath` function to `apps/web/src/lib/pattern-studio.ts` using rectangularity/circularity heuristics.

## 2. Board Generation Logic

- [x] 2.1 Implement `createBoardEnclosureFromBounds` helper in `apps/web/src/lib/pattern-studio.ts` (generates 4 boards + group).
- [x] 2.2 Implement `createCircularBoardFromBounds` helper in `apps/web/src/lib/pattern-studio.ts`.
- [x] 2.3 Implement `commitSketch` function that orchestrates classification and board creation.

## 3. UI & Interaction

- [x] 3.1 Update `EditorTool` type and toolbar in `apps/web/src/components/pattern-studio/editor-page.tsx` to include `pen-sketch`.
- [x] 3.2 Implement `onPointerDown`/`Move`/`Up` handlers for the `pen-sketch` tool in `EditorPage`.
- [x] 3.3 Add an SVG overlay layer in `EditorPage` to render the live freehand sketch line.
- [x] 3.4 Verify the end-to-end flow: sketch a rectangle -> 4 walls appear; sketch a circle -> circular board appears.
