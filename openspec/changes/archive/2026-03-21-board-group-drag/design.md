## Context

Boxel assemblies are rendered in the 3D viewport and can be clicked to select, but pointer move events are not handled — there is no drag-to-move capability. Board groups already use a `dragStateRef` pattern: `onPointerDown` captures a `DragState` with the start point and a snapshot of the document; a global `pointermove` listener computes a delta from the ground-plane intersection and applies it live via `onDocumentChange`; `onPointerUp` commits. The assembly's world position is stored as `origin: ControlPoint` (document 2D coordinates). Translating an assembly is a simple `origin.x + deltaX / origin.y + deltaY` update — no cell geometry needs to change.

## Goals / Non-Goals

**Goals:**
- Pointer-down on any assembly mesh starts a drag
- Pointer-move translates the assembly's `origin` live (same ground-plane delta approach as boards)
- Pointer-up commits the final position to the document
- Drag is suppressed when the camera-pan modifier is held (same guard as board drag)
- Grid snapping applied to the translated origin (same `CREATE_BOARD_GRID_SIZE` snap threshold)

**Non-Goals:**
- Assembly-to-assembly snapping or anchor connections (assemblies use cell adjacency, not anchor points)
- Multi-assembly drag (dragging multiple assemblies simultaneously)
- Drag on individual cells — the whole assembly moves as one unit

## Decisions

**Decision: Reuse the existing `dragStateRef` + global `pointermove` pattern**
Board drag already owns the global `pointermove`/`pointerup` handlers. A second `assemblyDragStateRef` of type `{ assembly: BoxelAssembly; startPoint: THREE.Vector3; document: PatternDocument }` is added alongside it. The existing global handler checks both refs and delegates accordingly. This avoids a second event listener and keeps the two drag paths co-located.

Alternative: Separate event listeners for assembly drag. Rejected — adds listener management complexity and risks double-firing.

**Decision: `moveAssemblyByDelta` lives in `pattern-studio.ts`**
The transform is a trivial field update — no algorithm needed in `packages/core`. Placing it next to `moveBoardsByDelta` keeps all document-mutation helpers in one file.

**Decision: No grid snap on assembly drag**
Assemblies use cell-based integer grids internally, but their `origin` is a free-floating document coordinate. Snapping `origin` to the board grid would misalign cells from visual expectations. Assembly drag is free (no snap), consistent with how assemblies were placed originally.

## Risks / Trade-offs

- [Risk] Pointer-down on an assembly currently only selects; extending it to also start a drag means a simple click (no move) still fires drag start/end. → Mitigation: reuse the existing `dragMovedRef` pattern — if no move occurred, treat pointer-up as a click-select only (same as board behavior).
- [Risk] If the user drags an assembly on top of boards, visual z-fighting may appear. → Mitigation: out of scope for this change; addressed separately if needed.
