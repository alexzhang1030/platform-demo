## Why

Connecting boards is currently a two-step dance: the user must manually activate the draw-board tool from the toolbar and then start drawing near an existing anchor. Clicking an anchor directly should be the natural entry point — it makes the intention explicit (connect from this joint) and eliminates the toolbar round-trip.

## What Changes

- Anchor dots on selected boards become interactive: clicking an anchor dot immediately enters draw-board mode and pre-seeds the draft start point at that anchor's world position
- The toolbar button's active state is updated to reflect the new mode so the user has visual feedback
- Cancelling or completing the draft (second click) returns state to normal — no functional difference from the existing draw-board flow once the start point is set
- Anchor dots are always visible when a board is selected and `onPointerDown` is wired regardless of whether draw-board tool is currently active

## Capabilities

### New Capabilities

- `pattern-studio-anchor-draw`: Clicking a board anchor in the 3D viewport activates the draw-board tool and pre-seeds the board draft start point at that anchor's position

### Modified Capabilities

- `pattern-studio-create-board`: The create-board tool can now also be activated implicitly by clicking an anchor, not only via the toolbar button — the draft start point is the anchor's world XY rather than the ground-plane click point

## Impact

- `apps/web/src/components/pattern-studio/board-preview-3d.tsx` — add `onActivateCreateBoardMode?: () => void` to `BoardPreview3DProps`; add internal `localCreateModeActive` state in `BoardPreview3D` that is OR'd with the prop; anchor meshes gain `onPointerDown` that sets draft start + activates local mode; draft cancel/commit clears local mode
- `apps/web/src/components/pattern-studio/editor-page.tsx` — pass `onActivateCreateBoardMode` to `BoardPreview3D` which calls `setActiveTool('create-board')` so the toolbar stays in sync
