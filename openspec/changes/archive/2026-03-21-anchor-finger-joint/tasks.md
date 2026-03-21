## 1. Core Algorithm — Finger Joint Geometry

- [x] 1.1 Create `packages/core/src/board-finger-joint.ts` with `classifyConnectionAngle(boardA, boardB, connection): 'L-joint' | 'straight' | 'unsupported'` — computes outward direction vectors from each board's baseline at the connecting anchor and uses cross/dot product to classify the angle
- [x] 1.2 Add `computeFingerPattern(height, thickness): { fingerCount: number; fingerWidth: number }` — returns odd fingerCount clamped to [3, 15] using `round(height / (2 × thickness))`; rounds up to nearest odd if even result
- [x] 1.3 Add `applyFingerTabsToEdge(points: ControlPoint[], edgeSide: 'left' | 'right', fingerWidth: number, fingerCount: number, depth: number, startWithTab: boolean): ControlPoint[]` — given the board's local-space bounding points, returns a new point array with alternating tab/slot teeth at the specified end edge
- [x] 1.4 Add `getBoardOutlineWithJoints(board: Board, groups: BoardGroup[], allBoards: Board[]): Path2DShape` — finds all connections involving this board, classifies each, and applies the appropriate finger pattern at each connected anchor edge; returns original outline if no connections or angle is unsupported

## 2. Core — Export

- [x] 2.1 Export `getBoardOutlineWithJoints`, `classifyConnectionAngle`, `computeFingerPattern` from `packages/core/src/index.ts`

## 3. App Layer — 3D Preview Integration

- [x] 3.1 Import `getBoardOutlineWithJoints` in `board-preview-3d.tsx`
- [x] 3.2 In the board mesh rendering section, pass each upright board's outline through `getBoardOutlineWithJoints(board, document.boardGroups, document.boards)` instead of using `board.outline` directly when rendering the board face geometry

## 4. Verification

- [x] 4.1 Add unit tests in `packages/core/src/board-finger-joint.test.ts` covering: L-joint classification, straight joint classification, unsupported angle fallback, finger count formula (odd enforcement, clamp), and that `getBoardOutlineWithJoints` returns the unmodified outline when no connections exist
- [x] 4.2 Run `bun test` and confirm all tests pass
