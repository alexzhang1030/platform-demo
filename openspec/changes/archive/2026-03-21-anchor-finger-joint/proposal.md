## Why

Board connections created via anchor snapping are currently stored as metadata only — no physical joint geometry is applied to the board outlines. To produce laser-cuttable output, connected boards need interlocking finger joint (box joint) geometry cut into their edges at the connection points.

## What Changes

- Add `computeFingerJointOutlines` algorithm in `packages/core` that, given two connected boards and their anchor pair, returns modified outlines for both boards with interlocking finger tabs and slots
- Detect connection geometry type (L-joint vs straight/inline) from the angle between the two boards' baselines at the connecting anchors, and generate the appropriate finger pattern for each case
- Add `getBoardOutlineWithJoints` utility that returns a board's outline with all its joint connections applied (computed on-the-fly from `BoardGroup.connections`), leaving the stored `Board.outline` unchanged so ungrouping restores the original shape cleanly
- Wire `getBoardOutlineWithJoints` into the 3D preview (board mesh rendering) and 2D nesting output so joints are visible in both views

## Capabilities

### New Capabilities

- `board-finger-joint`: Finger joint geometry algorithm for board anchor connections — derives connection angle, generates alternating tab/slot patterns along the joint edge, handles both L-joint (boards at ~90°) and straight joint (boards at ~0°/180°) cases

### Modified Capabilities

- `board-group`: Connections in a `BoardGroup` now produce physical joint geometry when boards are rendered or exported — `getBoardOutlineWithJoints` derives the modified outline from the connection list
- `pattern-studio-create-board`: The 3D board mesh uses `getBoardOutlineWithJoints` instead of the raw stored outline when the board belongs to a group with connections

## Impact

- `packages/core/src/board-finger-joint.ts` — new file with angle detection and finger joint geometry
- `packages/core/src/index.ts` — export new module
- `apps/web/src/components/pattern-studio/board-preview-3d.tsx` — board mesh rendering passes connected outlines through `getBoardOutlineWithJoints`
- `apps/web/src/lib/pattern-studio.ts` — expose `getBoardOutlineWithJoints` for use by renderer and nesting
- No changes to `PatternDocument` schema — joint geometry is fully derived from existing connection data
