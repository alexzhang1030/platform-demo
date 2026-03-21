## 1. App Layer — Move Helper

- [x] 1.1 Add `moveAssemblyByDelta(document: PatternDocument, assemblyId: string, delta: { x: number; y: number }): PatternDocument` to `apps/web/src/lib/pattern-studio.ts` — updates `assembly.origin.x/y` by the given delta

## 2. Viewport — Assembly Drag State

- [x] 2.1 Add `assemblyDragStateRef` alongside `dragStateRef` in `board-preview-3d.tsx` with type `{ assemblyId: string; startPoint: THREE.Vector3; document: PatternDocument } | null`
- [x] 2.2 In `handleAssemblyPointerDown`, when create mode is not active and pan modifier is not held, initialise `assemblyDragStateRef` with the ground-plane start point and document snapshot, and disable orbit controls

## 3. Viewport — Drag Move & Commit

- [x] 3.1 In the global `pointermove` handler, check `assemblyDragStateRef` and call `moveAssemblyByDelta` with the current ground-plane delta, then call `onDocumentChange` with the result
- [x] 3.2 Add `finishAssemblyDrag` function: reads final position from `assemblyDragStateRef`, commits it via `onDocumentChange`, clears the ref, and re-enables orbit controls
- [x] 3.3 Wire `finishAssemblyDrag` to the global `pointerup` handler (alongside `finishBoardDrag`)
- [x] 3.4 Guard the assembly drag move with `dragMovedRef` — only set positional change if pointer has actually moved (reuse existing `dragMovedRef`)
