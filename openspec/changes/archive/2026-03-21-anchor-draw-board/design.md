## Context

`BoardPreview3D` is a React component that wraps a Three.js `Canvas` + `Scene`. The `createBoardModeEnabled` prop comes from the parent (`editor-page.tsx`) and reflects `activeTool === 'create-board'`. The `createBoardDraft` state lives inside `BoardPreview3D` as local `useState`. Anchor dots are rendered inside `Scene` as plain `<mesh>` spheres with no pointer handlers today.

The draw-board two-click flow: first click → sets `createBoardDraft.start`; second click → commits the board. The draft start has type `THREE.Vector3` (ThreeJS space, Y-flipped, Z=0 for ground plane).

Anchor 3D positions come from `getBoardAnchorPositions3D(board)` which returns `{ x, y, z }` in ThreeJS world space with Y already flipped. The relevant XY for the ground-plane draft start is `new THREE.Vector3(pos.x, pos.y, 0)`.

## Goals / Non-Goals

**Goals:**
- Clicking an anchor activates the draw-board draft with the anchor as start point, in the same render frame (no one-render delay)
- Toolbar `activeTool` stays in sync via `onActivateCreateBoardMode` callback
- Cancelling or completing the draft clears the locally-activated mode so toolbar returns to `select`

**Non-Goals:**
- Enabling anchor click in boxel or remove modes
- Snapping the drawn board's END to another anchor on commit (that is handled by the existing `evaluateBoardGroupsAfterAdd`)
- Any UI change to the anchor dot appearance when hovered (deferred)

## Decisions

### Decision: `localCreateModeActive` state inside `BoardPreview3D`

Rather than waiting for the parent to update `createBoardModeEnabled` (which takes one React render cycle), `BoardPreview3D` maintains its own `localCreateModeActive` flag. The effective mode is `createBoardModeEnabled || localCreateModeActive`.

When the anchor is clicked:
1. `setLocalCreateModeActive(true)` — enables mode immediately
2. `setCreateBoardDraft({ start: anchorPoint, end: anchorPoint })` — pre-seeds the start
3. `onActivateCreateBoardMode?.()` — notifies parent to update toolbar

When draft is committed or cancelled:
- `setLocalCreateModeActive(false)` alongside `setCreateBoardDraft(null)`

This keeps all coordination in `BoardPreview3D` without exposing new state upward.

### Decision: Anchor click is blocked when create/boxel mode is already active

If `isCreateModeActive` is already true (user clicked toolbar first), clicking an anchor should be treated as the first draw click via the normal ground-plane handler, not re-seed the start. The anchor `onPointerDown` guard checks `isCreateModeActive` and returns early if true.

### Decision: `onActivateCreateBoardMode` is optional

Makes the prop backwards-compatible. When omitted (e.g., in tests or Storybook), anchor clicking still works for the draft — the toolbar just won't update.

## Risks / Trade-offs

- [Risk] `isEffectiveCreateModeActive` is used in `Scene` but `localCreateModeActive` lives in `BoardPreview3D` — need to pass it through `SceneProps`. → Mitigation: add `localCreateModeActive` to `SceneProps` and OR it with `createBoardModeEnabled` inside `Scene`.
- [Risk] User clicks anchor without intending to draw (accidental click on the dot). → Mitigation: clicking a second time on the same point without moving is already caught by `MIN_CREATE_BOARD_SPAN` and cancels the draft cleanly.
