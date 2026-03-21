## 1. BoardPreview3D — Props and Local State

- [x] 1.1 Add `onActivateCreateBoardMode?: () => void` to `BoardPreview3DProps` interface
- [x] 1.2 Add `localCreateModeActive` boolean state (`useState(false)`) inside `BoardPreview3D`
- [x] 1.3 Pass `localCreateModeActive` down through `SceneProps` and into `Scene`'s destructured props
- [x] 1.4 In `Scene`, change `isCreateModeActive` derivation to OR `createBoardModeEnabled` with `localCreateModeActive`

## 2. Scene — Anchor Click Handler

- [x] 2.1 Add `handleAnchorPointerDown(pos: AnchorPoint3D)` function inside `Scene` that:
  - Returns early if `isCreateModeActive` is already true (another mode is active)
  - Constructs `anchorPoint = new THREE.Vector3(pos.x, pos.y, 0)` (ground-plane XY, Z=0)
  - Calls `onCreateBoardDraftChange({ start: anchorPoint, end: anchorPoint })`
  - Sets `localCreateModeActive(true)` via a new `onActivateLocalCreateMode` callback from `BoardPreview3D`
  - Calls `onActivateCreateBoardMode?.()` to notify parent
- [x] 2.2 Wire `onPointerDown` on each anchor `<mesh>` to call `handleAnchorPointerDown(pos)`, passing the current anchor's 3D position — use `e.stopPropagation()`

## 3. Draft Commit and Cancel — Clear Local Mode

- [x] 3.1 In `handleCreateBoardPointerDown`, after `onCreateBoardDraftChange(null)` on commit or cancel, also call the `clearLocalCreateMode` callback to set `localCreateModeActive` back to `false` in `BoardPreview3D`

## 4. editor-page.tsx — Toolbar Sync

- [x] 4.1 Pass `onActivateCreateBoardMode={() => setActiveTool('create-board')}` prop to `<BoardPreview3D>` in `editor-page.tsx`
