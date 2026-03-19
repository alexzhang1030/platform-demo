## Why

The current create-board output is still aligned to the wrong mental model. The desired behavior is not a flat pair of puzzle-like boards. The tool should create one upright board, let it snap to existing upright boards, and write a dovetail-style connection into the board geometry at the snapped connection point.

## What Changes

- Replace the temporary interlocking pair output with a single upright standing board.
- Add create-time snapping against existing upright boards.
- When a snap occurs, generate a dovetail tab on the new board and a matching dovetail socket on the existing board.
- Move the render-agnostic upright-board and dovetail geometry logic into `packages/core`.

## Capabilities

### Modified Capabilities

- `pattern-studio-create-board`: create a single upright board instead of a flat rectangle or a flat interlocking pair

### New Capabilities

- `pattern-studio-create-board-snap`: snap a newly created upright board to an existing upright board
- `pattern-studio-dovetail-joint`: generate matching dovetail connection geometry for the snapped connection

## Impact

- Affected code:
  - `packages/protocol/src/index.ts`
  - `packages/core/src/upright-board.ts`
  - `apps/web/src/lib/pattern-studio.ts`
  - `apps/web/src/components/pattern-studio/board-preview-3d.tsx`
- Affected behavior:
  - 3D create-board preview
  - 3D create-board commit output
  - 3D rendering of upright boards and board holes
