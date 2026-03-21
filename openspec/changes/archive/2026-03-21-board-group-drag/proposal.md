## Why

Boxel assemblies in the 3D viewport can only be selected — they cannot be moved. Board groups already support drag-to-move (all member boards translate together), and boxel assemblies should have the same capability with the added flexibility of snapping to the world grid.

## What Changes

- Add pointer drag handling to boxel assembly meshes in the 3D viewport, translating all cells together when any part of the assembly is dragged
- Assembly drag moves the assembly's world-space origin (column offset) rather than individual cells, preserving relative cell layout
- Drag snaps to the same workspace grid used during board creation
- Drag respects the same camera-pan modifier guard used by board dragging (drag is suppressed when pan modifier is held)

## Capabilities

### New Capabilities

- `pattern-studio-assembly-drag`: Drag-to-move for boxel assemblies in the 3D viewport — pointer down on any assembly mesh starts a drag, pointer move translates the assembly, pointer up commits the new position to the document

### Modified Capabilities

- `pattern-studio-boxel-mode`: Assembly selection now also initiates drag; pointer down behavior is extended to start a drag state in addition to selecting

## Impact

- `apps/web/src/components/pattern-studio/board-preview-3d.tsx` — add assembly drag state, pointer move and pointer up handlers for assemblies, wire drag translation to `onDocumentChange`
- `apps/web/src/lib/pattern-studio.ts` — add `moveAssemblyByDelta` helper to translate an assembly's column position
- `packages/core` — no changes needed (assembly geometry is re-derived from column + cells on every render)
